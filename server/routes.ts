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
    const candidates = await storage.getCandidates(req.user.claims.sub);
    res.json(candidates);
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

  return httpServer;
}
