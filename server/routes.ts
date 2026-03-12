import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { isAuthenticated } from "./replit_integrations/auth";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.post(api.jobs.parse.path, isAuthenticated, async (req: any, res) => {
    const job = await storage.getJob(Number(req.params.id), req.user.claims.sub);
    if (!job) return res.status(404).json({ message: "Job not found" });

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: "You are an expert technical recruiter. Parse this job description and extract key requirements as a JSON array of strings under 'requirements'. Then generate 3 different LinkedIn Recruiter boolean search strings in a JSON array under 'booleanStrings'. The output MUST be a valid JSON object." },
          { role: "user", content: `Job Title: ${job.title}\nCompany: ${job.company}\nDescription: ${job.description}` }
        ],
        response_format: { type: "json_object" },
      });
      
      const aiResult = JSON.parse(response.choices[0].message.content || "{}");
      
      const updated = await storage.updateJob(job.id, req.user.claims.sub, {
        parsedRequirements: aiResult.requirements || [],
        booleanStrings: aiResult.booleanStrings || []
      });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "AI Parsing failed" });
    }
  });

  app.get(api.candidates.list.path, isAuthenticated, async (req: any, res) => {
    const { search } = req.query;
    let candidateList = await storage.getCandidates(req.user.claims.sub);
    
    if (search && candidateList.length > 0) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-5.2",
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
          c.name.toLowerCase().includes(search.toLowerCase()) || 
          (c.headline?.toLowerCase().includes(search.toLowerCase())) ||
          (c.summary?.toLowerCase().includes(search.toLowerCase()))
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
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

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
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.matches.get.path, isAuthenticated, async (req: any, res) => {
    const match = await storage.getMatch(Number(req.params.id), req.user.claims.sub);
    if (!match) return res.status(404).json({ message: "Match not found" });
    res.json(match);
  });

  app.post(api.matches.generateAnalysis.path, isAuthenticated, async (req: any, res) => {
    const match = await storage.getMatch(Number(req.params.id), req.user.claims.sub);
    if (!match) return res.status(404).json({ message: "Match not found" });

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: "You are an expert technical recruiter. Analyze the fit between the candidate and the job. Produce JSON with: 'score' (0 to 100), 'analysis' (string explaining the score), 'inMail' (string containing a personalized LinkedIn InMail to pitch the job to the candidate). Ensure the response is valid JSON." },
          { role: "user", content: `Job:\n${JSON.stringify(match.job)}\n\nCandidate:\n${JSON.stringify(match.candidate)}` }
        ],
        response_format: { type: "json_object" },
      });
      
      const aiResult = JSON.parse(response.choices[0].message.content || "{}");
      
      const updated = await storage.updateMatch(match.id, {
        score: aiResult.score || 0,
        analysis: aiResult.analysis || "No analysis generated",
        inMailDraft: aiResult.inMail || "No InMail generated",
        status: "analyzed"
      });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "AI Analysis failed" });
    }
  });

  app.patch(api.matches.updateStatus.path, isAuthenticated, async (req: any, res) => {
    const match = await storage.getMatch(Number(req.params.id), req.user.claims.sub);
    if (!match) return res.status(404).json({ message: "Match not found" });

    try {
      const { status } = req.body;
      const updated = await storage.updateMatch(match.id, { status });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // ── Sourcing Routes ─────────────────────────────────────────────────────────

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
        if (!appId || !appKey) {
          return res.status(400).json({ message: "Adzuna API credentials not configured. Add ADZUNA_APP_ID and ADZUNA_APP_KEY to your environment secrets." });
        }
        const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(query)}&results_per_page=20&content-type=application/json`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Adzuna API error: ${response.status}`);
        const data = await response.json() as any;
        const results = (data.results || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          company: r.company?.display_name,
          location: r.location?.display_name,
          description: r.description,
          url: r.redirect_url,
          salary: r.salary_min ? `£${Math.round(r.salary_min / 1000)}k – £${Math.round((r.salary_max || r.salary_min) / 1000)}k` : null,
          created: r.created,
        }));
        return res.json({ platform: "adzuna", count: data.count || 0, results });
      }

      if (platform === "reed") {
        const apiKey = process.env.REED_API_KEY;
        if (!apiKey) {
          return res.status(400).json({ message: "Reed API key not configured. Add REED_API_KEY to your environment secrets." });
        }
        const url = `https://www.reed.co.uk/api/1.0/search?keywords=${encodeURIComponent(query)}&resultsToTake=20`;
        const credentials = Buffer.from(`${apiKey}:`).toString("base64");
        const response = await fetch(url, {
          headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`Reed API error: ${response.status}`);
        const data = await response.json() as any;
        const results = (data.results || []).map((r: any) => ({
          id: r.jobId,
          title: r.jobTitle,
          company: r.employerName,
          location: r.locationName,
          description: r.jobDescription,
          url: r.jobUrl,
          salary: r.minimumSalary ? `£${Math.round(r.minimumSalary / 1000)}k – £${Math.round((r.maximumSalary || r.minimumSalary) / 1000)}k` : null,
          created: r.date,
        }));
        return res.json({ platform: "reed", count: results.length, results });
      }

      return res.status(400).json({ message: `Platform '${platform}' does not support live API search.` });

    } catch (e: any) {
      console.error("Sourcing search error:", e);
      res.status(500).json({ message: e.message || "Search failed" });
    }
  });

  app.get(api.sourcing.leads.list.path, isAuthenticated, async (req: any, res) => {
    const leads = await storage.getSourcedLeads(req.user.claims.sub);
    res.json(leads);
  });

  app.post(api.sourcing.leads.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.sourcing.leads.create.input.parse(req.body);
      const lead = await storage.createSourcedLead(req.user.claims.sub, input);
      res.status(201).json(lead);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
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

    await storage.updateSourcedLead(lead.id, req.user.claims.sub, {
      status: "imported",
      importedCandidateId: candidate.id,
    });

    res.json({ candidate, lead });
  });

  app.patch(api.sourcing.leads.dismiss.path, isAuthenticated, async (req: any, res) => {
    const lead = await storage.getSourcedLead(Number(req.params.id), req.user.claims.sub);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    const updated = await storage.updateSourcedLead(lead.id, req.user.claims.sub, { status: "dismissed" });
    res.json(updated);
  });

  return httpServer;
}
