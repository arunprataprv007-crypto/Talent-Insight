import { pgTable, text, serial, varchar, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users } from "./models/auth";

export * from "./models/auth";

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  company: text("company").notNull(),
  description: text("description").notNull(),
  parsedRequirements: jsonb("parsed_requirements"),
  booleanStrings: jsonb("boolean_strings"),
  hiringManager: text("hiring_manager"),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  linkedinUrl: text("linkedin_url"),
  name: text("name").notNull(),
  headline: text("headline"),
  summary: text("summary"),
  skills: jsonb("skills"), 
  experience: jsonb("experience"),
  education: jsonb("education"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id, { onDelete: 'cascade' }),
  score: integer("score"),
  analysis: text("analysis"),
  inMailDraft: text("inmail_draft"),
  status: text("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobsRelations = relations(jobs, ({ many }) => ({
  matches: many(matches),
}));

export const candidatesRelations = relations(candidates, ({ many }) => ({
  matches: many(matches),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  job: one(jobs, {
    fields: [matches.jobId],
    references: [jobs.id],
  }),
  candidate: one(candidates, {
    fields: [matches.candidateId],
    references: [candidates.id],
  }),
}));

export const insertJobSchema = createInsertSchema(jobs).omit({ 
  id: true, userId: true, parsedRequirements: true, booleanStrings: true, hiringManager: true, createdAt: true 
});
export const insertCandidateSchema = createInsertSchema(candidates).omit({ 
  id: true, userId: true, createdAt: true, skills: true, experience: true, education: true
});
export const insertMatchSchema = createInsertSchema(matches).omit({ 
  id: true, score: true, analysis: true, inMailDraft: true, status: true, createdAt: true 
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
