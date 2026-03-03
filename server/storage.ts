import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { 
  jobs, candidates, matches, 
  type Job, type InsertJob, 
  type Candidate, type InsertCandidate, 
  type Match, type InsertMatch 
} from "@shared/schema";

export interface IStorage {
  // Jobs
  getJobs(userId: string): Promise<Job[]>;
  getJob(id: number, userId: string): Promise<Job | undefined>;
  createJob(userId: string, job: InsertJob): Promise<Job>;
  updateJob(id: number, userId: string, updates: Partial<Job>): Promise<Job | undefined>;
  
  // Candidates
  getCandidates(userId: string): Promise<Candidate[]>;
  getCandidate(id: number, userId: string): Promise<Candidate | undefined>;
  createCandidate(userId: string, candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: number, userId: string, updates: Partial<Candidate>): Promise<Candidate | undefined>;
  
  // Matches
  getMatches(userId: string, jobId?: number, candidateId?: number): Promise<(Match & { job: Job, candidate: Candidate })[]>;
  getMatch(id: number, userId: string): Promise<(Match & { job: Job, candidate: Candidate }) | undefined>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: number, updates: Partial<Match>): Promise<Match | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getJobs(userId: string): Promise<Job[]> {
    return await db.select().from(jobs).where(eq(jobs.userId, userId));
  }

  async getJob(id: number, userId: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.userId, userId)));
    return job;
  }

  async createJob(userId: string, job: InsertJob): Promise<Job> {
    const [newJob] = await db.insert(jobs).values({ ...job, userId }).returning();
    return newJob;
  }

  async updateJob(id: number, userId: string, updates: Partial<Job>): Promise<Job | undefined> {
    const [updated] = await db.update(jobs)
      .set(updates)
      .where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
      .returning();
    return updated;
  }

  async getCandidates(userId: string): Promise<Candidate[]> {
    return await db.select().from(candidates).where(eq(candidates.userId, userId));
  }

  async getCandidate(id: number, userId: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(and(eq(candidates.id, id), eq(candidates.userId, userId)));
    return candidate;
  }

  async createCandidate(userId: string, candidate: InsertCandidate): Promise<Candidate> {
    const [newCandidate] = await db.insert(candidates).values({ ...candidate, userId }).returning();
    return newCandidate;
  }

  async updateCandidate(id: number, userId: string, updates: Partial<Candidate>): Promise<Candidate | undefined> {
    const [updated] = await db.update(candidates)
      .set(updates)
      .where(and(eq(candidates.id, id), eq(candidates.userId, userId)))
      .returning();
    return updated;
  }

  async getMatches(userId: string, jobId?: number, candidateId?: number) {
    let query = db.select({
      match: matches,
      job: jobs,
      candidate: candidates
    })
    .from(matches)
    .innerJoin(jobs, eq(matches.jobId, jobs.id))
    .innerJoin(candidates, eq(matches.candidateId, candidates.id))
    .where(eq(jobs.userId, userId));

    const results = await query;
    let filtered = results;
    if (jobId) filtered = filtered.filter(r => r.match.jobId === jobId);
    if (candidateId) filtered = filtered.filter(r => r.match.candidateId === candidateId);

    return filtered.map(r => ({
      ...r.match,
      job: r.job,
      candidate: r.candidate
    }));
  }

  async getMatch(id: number, userId: string) {
    const results = await db.select({
      match: matches,
      job: jobs,
      candidate: candidates
    })
    .from(matches)
    .innerJoin(jobs, eq(matches.jobId, jobs.id))
    .innerJoin(candidates, eq(matches.candidateId, candidates.id))
    .where(and(eq(matches.id, id), eq(jobs.userId, userId)));

    if (!results.length) return undefined;
    
    return {
      ...results[0].match,
      job: results[0].job,
      candidate: results[0].candidate
    };
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const [newMatch] = await db.insert(matches).values(match).returning();
    return newMatch;
  }

  async updateMatch(id: number, updates: Partial<Match>): Promise<Match | undefined> {
    const [updated] = await db.update(matches)
      .set(updates)
      .where(eq(matches.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
