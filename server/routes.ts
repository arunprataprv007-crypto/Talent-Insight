import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { isAuthenticated } from "./replit_integrations/auth";
import OpenAI from "openai";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getAiProviderStatus, parseCvWithOrchestrator } from "./ai-orchestrator";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Use memory storage to avoid directory issues in any environment
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  const twilio = require("twilio");
  return twilio(accountSid, authToken);
}

async function getSendgridMail() {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return null;
  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(apiKey);
  return sgMail;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  app.get("/api/ai/status", isAuthenticated, async (_req, res) => {
    res.json(getAiProviderStatus());
  });

  // ── Jobs ─────────────────────────────────────────────────────────────────────

  app.get(api.jobs.list.path, isAuthenticated, async (req: any, res) => {
    const jobs = await storage.getJobs(req.user.claims.sub);
    res.json(jobs);
  });

  app.get(api.jobs.get.path, isAuthenticated, async (req: any, res) => {
    const job = await storage.getJob(Number(req.params.id), req.user.claims.sub);
    if (!job) return res.status(404).json({ message: "Job not found" });
    const jobMatches = await storage.getMatches(req.user.claims.sub, job.id);
    res.json({ ...job, matches: jobMatches });
  });

  app.post(api.jobs.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.jobs.create.input.parse(req.body);
      const job = await storage.createJob(req.user.claims.sub, input);
      res.status(201).json(job);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // Job status toggle (open/close)
  app.patch(api.jobs.updateStatus.path, isAuthenticated, async (req: any, res) => {
    const job = await storage.getJob(Number(req.params.id), req.user.claims.sub);
    if (!job) return res.status(404).json({ message: "Job not found" });
    const { status } = req.body;
    if (!["active", "closed", "on_hold"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const updated = await storage.updateJob(job.id, req.user.claims.sub, { status });
    res.json(updated);
  });

  // JD Parsing — Feature #2
  app.post(api.jobs.parse.path, isAuthenticated, async (req: any, res) => {
    const job = await storage.getJob(Number(req.params.id), req.user.claims.sub);
    if (!job) return res.status(404).json({ message: "Job not found" });
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert technical recruiter. Parse this job description and return a JSON object with:
- "requirements": array of strings (key technical & soft skills/experience needed)
- "booleanStrings": array of 3 different LinkedIn Recruiter boolean search strings
- "mustHave": array of strings (non-negotiable requirements)
- "niceToHave": array of strings (preferred but not required)
- "experienceLevel": string (Junior/Mid/Senior/Lead/Principal)
- "summary": string (2-sentence role summary for recruiters)
Output MUST be valid JSON.`
          },
          { role: "user", content: `Job Title: ${job.title}\nCompany: ${job.company}\nDescription: ${job.description}` }
        ],
        response_format: { type: "json_object" },
      });
      const aiResult = JSON.parse(response.choices[0].message.content || "{}");
      const updated = await storage.updateJob(job.id, req.user.claims.sub, {
        parsedRequirements: {
          requirements: aiResult.requirements || [],
          mustHave: aiResult.mustHave || [],
          niceToHave: aiResult.niceToHave || [],
          experienceLevel: aiResult.experienceLevel || "",
          summary: aiResult.summary || "",
        },
        booleanStrings: aiResult.booleanStrings || [],
      });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "AI Parsing failed" });
    }
  });

  // Semantic Ranking — Feature #7
  app.post(api.jobs.rankCandidates.path, isAuthenticated, async (req: any, res) => {
    const job = await storage.getJob(Number(req.params.id), req.user.claims.sub);
    if (!job) return res.status(404).json({ message: "Job not found" });
    const allCandidates = await storage.getCandidates(req.user.claims.sub);
    if (!allCandidates.length) return res.json({ rankings: [] });
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior technical recruiter. Rank the provided candidates by their fit for the job. Return JSON with "rankings": array of objects {candidateId, score (0-100), reason (1 sentence)}, sorted best-first.`
          },
          {
            role: "user",
            content: `Job: ${JSON.stringify({ title: job.title, company: job.company, requirements: job.parsedRequirements })}\n\nCandidates: ${JSON.stringify(allCandidates.map(c => ({ id: c.id, name: c.name, headline: c.headline, summary: c.summary, skills: c.skills })))}`
          }
        ],
        response_format: { type: "json_object" },
      });
      const aiResult = JSON.parse(response.choices[0].message.content || "{}");
      const candidateMap = Object.fromEntries(allCandidates.map(c => [c.id, c]));
      const rankings = (aiResult.rankings || []).map((r: any) => ({
        ...r,
        candidate: candidateMap[r.candidateId],
      }));
      res.json({ rankings });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Ranking failed" });
    }
  });

  // ── Candidates ───────────────────────────────────────────────────────────────

  app.get(api.candidates.list.path, isAuthenticated, async (req: any, res) => {
    const { search } = req.query;
    let candidateList = await storage.getCandidates(req.user.claims.sub);
    if (search && candidateList.length > 0) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are an AI search assistant. Given a search query and a list of candidates, return only the IDs of candidates that match the query semantically. Return a JSON object with a single key 'matchedIds' containing an array of numbers. Candidates: " + JSON.stringify(candidateList.map(c => ({ id: c.id, name: c.name, headline: c.headline, summary: c.summary }))) },
            { role: "user", content: `Search Query: ${search}` }
          ],
          response_format: { type: "json_object" },
        });
        const aiResult = JSON.parse(response.choices[0].message.content || "{}");
        const matchedIds = aiResult.matchedIds || [];
        candidateList = candidateList.filter(c => matchedIds.includes(c.id));
      } catch (e) {
        console.error("AI Search failed:", e);
        candidateList = candidateList.filter(c =>
          c.name.toLowerCase().includes((search as string).toLowerCase()) ||
          (c.headline?.toLowerCase().includes((search as string).toLowerCase())) ||
          (c.summary?.toLowerCase().includes((search as string).toLowerCase()))
        );
      }
    }
    res.json(candidateList);
  });

  app.get(api.candidates.get.path, isAuthenticated, async (req: any, res) => {
    const candidate = await storage.getCandidate(Number(req.params.id), req.user.claims.sub);
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });
    res.json(candidate);
  });

  app.post(api.candidates.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.candidates.create.input.parse(req.body);
      const candidate = await storage.createCandidate(req.user.claims.sub, input);
      res.status(201).json(candidate);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.patch(api.candidates.update.path, isAuthenticated, async (req: any, res) => {
    const candidate = await storage.getCandidate(Number(req.params.id), req.user.claims.sub);
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });
    const updated = await storage.updateCandidate(candidate.id, req.user.claims.sub, req.body);
    res.json(updated);
  });

  // CV Parsing — from pasted text
  app.post(api.candidates.parseCv.path, isAuthenticated, async (req: any, res) => {
    const { cvText } = req.body;
    if (!cvText) return res.status(400).json({ message: "cvText is required" });
    try {
      const parsed = await parseCvWithOrchestrator(cvText);
      res.json({ ...parsed.result, _providers: parsed.providers.map(({ provider, ok }) => ({ provider, ok })) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "CV parsing failed" });
    }
  });

  // CV Parsing — from uploaded file (PDF or DOCX)
  app.post(api.candidates.parseCvFile.path, isAuthenticated, upload.single("file"), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    let extractedText = "";
    try {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const buffer: Buffer = req.file.buffer;

      if (ext === ".pdf") {
        const pdfParse = require("pdf-parse");
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text;
      } else if (ext === ".docx" || ext === ".doc") {
        const mammoth = require("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } else if (ext === ".txt") {
        extractedText = buffer.toString("utf-8");
      } else {
        return res.status(400).json({ message: "Unsupported file type. Please upload PDF, DOCX, or TXT." });
      }

      if (!extractedText.trim()) {
        return res.status(400).json({ message: "Could not extract text from file. The file may be scanned/image-only." });
      }

      const parsed = await parseCvWithOrchestrator(extractedText);
      res.json({ ...parsed.result, _providers: parsed.providers.map(({ provider, ok }) => ({ provider, ok })) });
    } catch (e: any) {
      console.error("CV file parse error:", e);
      res.status(500).json({ message: "CV parsing failed: " + (e.message || "unknown error") });
    }
  });

  // ── Matches ───────────────────────────────────────────────────────────────────

  app.get(api.matches.list.path, isAuthenticated, async (req: any, res) => {
    const { jobId, candidateId } = req.query;
    const matches = await storage.getMatches(
      req.user.claims.sub,
      jobId ? Number(jobId) : undefined,
      candidateId ? Number(candidateId) : undefined
    );
    res.json(matches);
  });

  app.post(api.matches.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.matches.create.input.parse(req.body);
      const match = await storage.createMatch(input);
      res.status(201).json(match);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.get(api.matches.get.path, isAuthenticated, async (req: any, res) => {
    const match = await storage.getMatch(Number(req.params.id), req.user.claims.sub);
    if (!match) return res.status(404).json({ message: "Match not found" });
    res.json(match);
  });

  // AI Scoring + Analysis — Feature #3
  app.post(api.matches.generateAnalysis.path, isAuthenticated, async (req: any, res) => {
    const match = await storage.getMatch(Number(req.params.id), req.user.claims.sub);
    if (!match) return res.status(404).json({ message: "Match not found" });
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert technical recruiter. Analyze the fit between the candidate and the job. Return JSON with:
- "score": overall fit score 0-100
- "criteriaScores": object with scores for {technical (0-100), experience (0-100), domain (0-100), culture (0-100)}
- "analysis": detailed paragraph explaining the overall fit, strengths, and gaps
- "inMail": personalized LinkedIn InMail draft to pitch the role to the candidate
Output MUST be valid JSON.`
          },
          { role: "user", content: `Job:\n${JSON.stringify(match.job)}\n\nCandidate:\n${JSON.stringify(match.candidate)}` }
        ],
        response_format: { type: "json_object" },
      });
      const aiResult = JSON.parse(response.choices[0].message.content || "{}");
      const updated = await storage.updateMatch(match.id, {
        score: aiResult.score || 0,
        criteriaScores: aiResult.criteriaScores || {},
        analysis: aiResult.analysis || "No analysis generated",
        inMailDraft: aiResult.inMail || "No InMail generated",
        status: "analyzed",
      });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "AI Analysis failed" });
    }
  });

  // AI Interview Questions — Feature #4
  app.post(api.matches.generateQuestions.path, isAuthenticated, async (req: any, res) => {
    const match = await storage.getMatch(Number(req.params.id), req.user.claims.sub);
    if (!match) return res.status(404).json({ message: "Match not found" });
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior technical recruiter and interviewer. Generate tailored screening interview questions for this candidate-job pairing. Return JSON with "questions": array of objects, each with:
- "question": the question text
- "category": one of "Technical", "Behavioral", "Role-Specific", "Culture Fit"
- "difficulty": one of "Screening", "Intermediate", "Deep Dive"
- "rationale": why this question is relevant for this candidate+role (1 sentence)
Generate 10-12 questions total, covering all categories.`
          },
          {
            role: "user",
            content: `Job: ${JSON.stringify({ title: match.job.title, company: match.job.company, requirements: match.job.parsedRequirements })}\n\nCandidate: ${JSON.stringify({ name: match.candidate.name, headline: match.candidate.headline, summary: match.candidate.summary, skills: match.candidate.skills, experience: match.candidate.experience })}`
          }
        ],
        response_format: { type: "json_object" },
      });
      const aiResult = JSON.parse(response.choices[0].message.content || "{}");
      const updated = await storage.updateMatch(match.id, {
        screeningQuestions: aiResult.questions || [],
      });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Question generation failed" });
    }
  });

  app.patch(api.matches.updateStatus.path, isAuthenticated, async (req: any, res) => {
    const match = await storage.getMatch(Number(req.params.id), req.user.claims.sub);
    if (!match) return res.status(404).json({ message: "Match not found" });
    try {
      const { status } = req.body;
      const updated = await storage.updateMatch(match.id, { status });
      res.json(updated);
    } catch {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.patch(api.matches.updateScreeningStatus.path, isAuthenticated, async (req: any, res) => {
    const match = await storage.getMatch(Number(req.params.id), req.user.claims.sub);
    if (!match) return res.status(404).json({ message: "Match not found" });
    const { screeningStatus } = req.body;
    const updated = await storage.updateMatch(match.id, { screeningStatus });
    res.json(updated);
  });

  // ── Screening Stats — Feature #5 ─────────────────────────────────────────────

  app.get(api.screening.stats.path, isAuthenticated, async (req: any, res) => {
    const matches = await storage.getMatches(req.user.claims.sub);
    const candidates = await storage.getCandidates(req.user.claims.sub);
    const jobs = await storage.getJobs(req.user.claims.sub);

    const analyzed = matches.filter(m => m.score !== null && m.score !== undefined);
    const stages = {
      new: matches.filter(m => m.screeningStatus === "new").length,
      shortlisted: matches.filter(m => m.screeningStatus === "shortlisted").length,
      screening: matches.filter(m => m.screeningStatus === "screening").length,
      interviewing: matches.filter(m => m.screeningStatus === "interviewing").length,
      offered: matches.filter(m => m.screeningStatus === "offered").length,
      rejected: matches.filter(m => m.screeningStatus === "rejected").length,
    };

    const scoreDistribution = [
      { range: "90-100", count: analyzed.filter(m => (m.score || 0) >= 90).length },
      { range: "75-89", count: analyzed.filter(m => (m.score || 0) >= 75 && (m.score || 0) < 90).length },
      { range: "60-74", count: analyzed.filter(m => (m.score || 0) >= 60 && (m.score || 0) < 75).length },
      { range: "45-59", count: analyzed.filter(m => (m.score || 0) >= 45 && (m.score || 0) < 60).length },
      { range: "<45", count: analyzed.filter(m => (m.score || 0) < 45).length },
    ];

    const topMatches = analyzed
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 8);

    res.json({
      totals: {
        jobs: jobs.length,
        candidates: candidates.length,
        matches: matches.length,
        analyzed: analyzed.length,
        avgScore: analyzed.length ? Math.round(analyzed.reduce((s, m) => s + (m.score || 0), 0) / analyzed.length) : 0,
        highScorers: analyzed.filter(m => (m.score || 0) >= 80).length,
      },
      stages,
      scoreDistribution,
      topMatches,
    });
  });

  // ── Sourcing ──────────────────────────────────────────────────────────────────

  app.get(api.sourcing.config.path, isAuthenticated, async (_req, res) => {
    res.json({
      adzunaConfigured: !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
      reedConfigured: !!process.env.REED_API_KEY,
    });
  });

  app.get(api.sourcing.search.path, isAuthenticated, async (req: any, res) => {
    const { platform, query, country = "gb" } = req.query as Record<string, string>;
    if (!query) return res.status(400).json({ message: "query is required" });
    try {
      if (platform === "adzuna") {
        const appId = process.env.ADZUNA_APP_ID;
        const appKey = process.env.ADZUNA_APP_KEY;
        if (!appId || !appKey) return res.status(400).json({ message: "Adzuna API credentials not configured. Add ADZUNA_APP_ID and ADZUNA_APP_KEY to your environment secrets." });
        const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(query)}&results_per_page=20&content-type=application/json`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Adzuna API error: ${response.status}`);
        const data = await response.json() as any;
        return res.json({
          platform: "adzuna", count: data.count || 0,
          results: (data.results || []).map((r: any) => ({
            id: r.id, title: r.title, company: r.company?.display_name,
            location: r.location?.display_name, description: r.description,
            url: r.redirect_url, salary: r.salary_min ? `£${Math.round(r.salary_min / 1000)}k – £${Math.round((r.salary_max || r.salary_min) / 1000)}k` : null,
          })),
        });
      }
      if (platform === "reed") {
        const apiKey = process.env.REED_API_KEY;
        if (!apiKey) return res.status(400).json({ message: "Reed API key not configured. Add REED_API_KEY to your environment secrets." });
        const url = `https://www.reed.co.uk/api/1.0/search?keywords=${encodeURIComponent(query)}&resultsToTake=20`;
        const credentials = Buffer.from(`${apiKey}:`).toString("base64");
        const response = await fetch(url, { headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" } });
        if (!response.ok) throw new Error(`Reed API error: ${response.status}`);
        const data = await response.json() as any;
        return res.json({
          platform: "reed", count: (data.results || []).length,
          results: (data.results || []).map((r: any) => ({
            id: r.jobId, title: r.jobTitle, company: r.employerName,
            location: r.locationName, description: r.jobDescription,
            url: r.jobUrl, salary: r.minimumSalary ? `£${Math.round(r.minimumSalary / 1000)}k – £${Math.round((r.maximumSalary || r.minimumSalary) / 1000)}k` : null,
          })),
        });
      }
      return res.status(400).json({ message: `Platform '${platform}' does not support live API search.` });
    } catch (e: any) {
      console.error("Sourcing search error:", e);
      res.status(500).json({ message: e.message || "Search failed" });
    }
  });

  app.get(api.sourcing.leads.list.path, isAuthenticated, async (req: any, res) => {
    res.json(await storage.getSourcedLeads(req.user.claims.sub));
  });

  app.post(api.sourcing.leads.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.sourcing.leads.create.input.parse(req.body);
      res.status(201).json(await storage.createSourcedLead(req.user.claims.sub, input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.post(api.sourcing.leads.import.path, isAuthenticated, async (req: any, res) => {
    const lead = await storage.getSourcedLead(Number(req.params.id), req.user.claims.sub);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    const candidate = await storage.createCandidate(req.user.claims.sub, {
      name: lead.name,
      headline: lead.headline ?? undefined,
      summary: lead.summary ?? undefined,
      linkedinUrl: lead.profileUrl ?? undefined,
      sourcePlatform: lead.platform,
      sourceProfileUrl: lead.profileUrl ?? undefined,
    } as any);
    await storage.updateSourcedLead(lead.id, req.user.claims.sub, { status: "imported", importedCandidateId: candidate.id });
    res.json({ candidate, lead });
  });

  // ── Boolean Generator — AI extraction from raw JD ────────────────────────────
  app.post(api.boolean.generate.path, isAuthenticated, async (req: any, res) => {
    const { jdText, jobTitles, requiredSkills, optionalSkills, excludedTerms } = req.body;
    try {
      let extractedTerms: any = { jobTitles: jobTitles || [], requiredSkills: requiredSkills || [], optionalSkills: optionalSkills || [], excludedTerms: excludedTerms || [] };

      if (jdText && jdText.trim()) {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert technical recruiter specializing in Boolean search strings. 
Extract structured search terms from the job description and return JSON with:
- "jobTitles": array of relevant job title variations (include plurals, abbreviations, e.g. "Software Engineer", "SWE", "Developer")
- "requiredSkills": array of must-have technical skills, tools, languages
- "optionalSkills": array of nice-to-have skills, certifications, frameworks
- "excludedTerms": array of terms to exclude (e.g. "intern", "junior" if senior role, "manager" if IC role)
- "seniority": string (e.g. "Senior", "Lead", "Junior") or null
- "industry": string (e.g. "fintech", "SaaS") or null
Output MUST be valid JSON only.`
            },
            { role: "user", content: jdText }
          ],
          response_format: { type: "json_object" },
        });
        const aiResult = JSON.parse(response.choices[0].message.content || "{}");
        extractedTerms = {
          jobTitles: [...(jobTitles || []), ...(aiResult.jobTitles || [])].filter((v, i, a) => a.indexOf(v) === i),
          requiredSkills: [...(requiredSkills || []), ...(aiResult.requiredSkills || [])].filter((v, i, a) => a.indexOf(v) === i),
          optionalSkills: [...(optionalSkills || []), ...(aiResult.optionalSkills || [])].filter((v, i, a) => a.indexOf(v) === i),
          excludedTerms: [...(excludedTerms || []), ...(aiResult.excludedTerms || [])].filter((v, i, a) => a.indexOf(v) === i),
          seniority: aiResult.seniority || null,
          industry: aiResult.industry || null,
        };
      }

      const { jobTitles: jt, requiredSkills: rs, optionalSkills: os, excludedTerms: et } = extractedTerms;

      const titlePart = jt.length ? `(${jt.map((t: string) => `"${t}"`).join(" OR ")})` : "";
      const reqPart = rs.length ? rs.map((s: string) => `"${s}"`).join(" AND ") : "";
      const optPart = os.length ? `(${os.map((s: string) => `"${s}"`).join(" OR ")})` : "";
      const exPart = et.length ? et.map((e: string) => `NOT "${e}"`).join(" ") : "";

      const buildLinkedIn = () => [titlePart, reqPart, optPart, exPart].filter(Boolean).join(" AND ");
      const buildXRayLinkedIn = () => `site:linkedin.com/in ${[titlePart, reqPart].filter(Boolean).join(" ")}`.trim();
      const buildXRayGitHub = () => `site:github.com ${[rs.slice(0, 5).map((s: string) => `"${s}"`).join(" "), titlePart].filter(Boolean).join(" ")}`.trim();
      const buildIndeed = () => [titlePart, rs.map((s: string) => `"${s}"`).join(" "), optPart, exPart].filter(Boolean).join(" ");
      const buildStackOverflow = () => `site:stackoverflow.com/users ${[rs.slice(0, 4).map((s: string) => `"${s}"`).join(" OR ")].filter(Boolean).join("")}`;

      res.json({
        terms: extractedTerms,
        strings: {
          linkedin: buildLinkedIn(),
          xrayLinkedIn: buildXRayLinkedIn(),
          xrayGitHub: buildXRayGitHub(),
          indeed: buildIndeed(),
          stackOverflow: buildStackOverflow(),
        },
      });
    } catch (e: any) {
      console.error("Boolean generate error:", e);
      res.status(500).json({ message: e.message || "Generation failed" });
    }
  });

  app.patch(api.sourcing.leads.dismiss.path, isAuthenticated, async (req: any, res) => {
    const lead = await storage.getSourcedLead(Number(req.params.id), req.user.claims.sub);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json(await storage.updateSourcedLead(lead.id, req.user.claims.sub, { status: "dismissed" }));
  });

  // ── Communications (Email / SMS / VoIP) ──────────────────────────────────────

  app.get(api.communications.config.path, isAuthenticated, async (_req, res) => {
    res.json({
      twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
      sendgridConfigured: !!(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL),
    });
  });

  app.get(api.communications.list.path, isAuthenticated, async (req: any, res) => {
    const { candidateId } = req.query;
    const comms = await storage.getCommunications(
      req.user.claims.sub,
      candidateId ? Number(candidateId) : undefined
    );
    res.json(comms);
  });

  app.post(api.communications.sendEmail.path, isAuthenticated, async (req: any, res) => {
    const { candidateId, to, subject, body } = req.body;
    if (!candidateId || !to || !subject || !body) {
      return res.status(400).json({ message: "candidateId, to, subject, and body are required" });
    }
    const sgMail = await getSendgridMail();
    if (!sgMail) {
      return res.status(400).json({ message: "SendGrid not configured. Please add SENDGRID_API_KEY and SENDGRID_FROM_EMAIL to your environment secrets." });
    }
    try {
      await sgMail.send({
        to,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject,
        text: body,
        html: body.replace(/\n/g, "<br>"),
      });
      const comm = await storage.createCommunication(req.user.claims.sub, {
        candidateId: Number(candidateId),
        type: "email",
        direction: "outbound",
        subject,
        body,
        status: "sent",
      });
      res.json(comm);
    } catch (e: any) {
      console.error("SendGrid error:", e);
      res.status(500).json({ message: "Failed to send email: " + (e.message || "unknown error") });
    }
  });

  app.post(api.communications.sendSms.path, isAuthenticated, async (req: any, res) => {
    const { candidateId, to, body } = req.body;
    if (!candidateId || !to || !body) {
      return res.status(400).json({ message: "candidateId, to, and body are required" });
    }
    const client = getTwilioClient();
    if (!client) {
      return res.status(400).json({ message: "Twilio not configured. Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to your environment secrets." });
    }
    try {
      const message = await client.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });
      const comm = await storage.createCommunication(req.user.claims.sub, {
        candidateId: Number(candidateId),
        type: "sms",
        direction: "outbound",
        body,
        status: "sent",
        externalId: message.sid,
      } as any);
      res.json(comm);
    } catch (e: any) {
      console.error("Twilio SMS error:", e);
      res.status(500).json({ message: "Failed to send SMS: " + (e.message || "unknown error") });
    }
  });

  app.post(api.communications.initiateCall.path, isAuthenticated, async (req: any, res) => {
    const { candidateId, to } = req.body;
    if (!candidateId || !to) {
      return res.status(400).json({ message: "candidateId and to are required" });
    }
    const client = getTwilioClient();
    if (!client) {
      return res.status(400).json({ message: "Twilio not configured. Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to your environment secrets." });
    }
    try {
      const call = await client.calls.create({
        url: "http://demo.twilio.com/docs/voice.xml",
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });
      const comm = await storage.createCommunication(req.user.claims.sub, {
        candidateId: Number(candidateId),
        type: "call",
        direction: "outbound",
        body: `Call initiated to ${to}`,
        status: "sent",
        externalId: call.sid,
      } as any);
      res.json({ ...comm, callSid: call.sid, status: call.status });
    } catch (e: any) {
      console.error("Twilio call error:", e);
      res.status(500).json({ message: "Failed to initiate call: " + (e.message || "unknown error") });
    }
  });

  return httpServer;
}
