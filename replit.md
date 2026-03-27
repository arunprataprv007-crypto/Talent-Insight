# TalentIntel — AI-Powered Recruiting Copilot

## Overview
TalentIntel is a full-stack recruiting platform that helps technical recruiters manage jobs, source candidates from multiple job boards, and run AI-powered fit analysis, communicate with candidates, and track pipeline progress.

## Architecture
- **Frontend**: React + TypeScript, Tailwind CSS, Shadcn UI, Wouter (routing), TanStack Query v5
- **Backend**: Express.js + Node.js (TypeScript via tsx)
- **Database**: PostgreSQL via Drizzle ORM
- **AI**: OpenAI (via Replit AI Integration) — gpt-5.2 model
- **Auth**: Replit Auth (Log in with Replit)
- **Email**: SendGrid (`@sendgrid/mail`)
- **SMS + VoIP**: Twilio (`twilio`)
- **File parsing**: `pdf-parse` (PDF), `mammoth` (DOCX), `multer` (upload handler)

## Key Features
1. **Jobs** — Create, manage and toggle open/closed/on-hold status; AI parses requirements and generates boolean strings
2. **Candidates** — CV upload (PDF/DOCX/TXT) or paste text with AI extraction; full profile with skills, experience, education, email, phone
3. **Candidate Pipeline** — Per-candidate stage tracker (New → Shortlisted → Screening → Interviewing → Offered → Rejected)
4. **Matches** — AI fit scoring (0–100), analysis, and InMail draft generation
5. **Sourcing** — Source candidates from 7 job platforms with live API search and manual lead import
6. **Communications** — Send email (SendGrid), SMS (Twilio), and initiate VoIP calls (Twilio) directly from candidate profiles. Full history log with a dedicated Communications page.
7. **Training** — Interactive 12-section recruiter onboarding manual with progress tracking
8. **Boolean Builder** — AI-powered LinkedIn boolean search string generator

## Data Models (`shared/schema.ts`)
- `jobs` — Job openings with AI-parsed requirements, boolean strings, and status (active/closed/on_hold)
- `candidates` — Candidate profiles with email, phone, skills, experience, education, source tracking, pipelineStage
- `matches` — Job↔Candidate pairings with AI score, analysis, InMail draft, screening status
- `sourced_leads` — Staging table for candidates found on job platforms before import
- `communications` — All outbound/inbound communications (email, SMS, call) per candidate

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection (auto-set by Replit DB integration)
- `AI_INTEGRATIONS_OPENAI_API_KEY` + `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI (Replit AI integration)
- `REPLIT_DOMAINS`, `ISSUER_URL`, `SESSION_SECRET` — Replit Auth
- `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` — Optional: Adzuna live search
- `REED_API_KEY` — Optional: Reed.co.uk live search
- `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL` — Email via SendGrid
- `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_PHONE_NUMBER` — SMS + VoIP via Twilio

## File Structure
```
shared/
  schema.ts        — Drizzle schema + Zod types for all models
  routes.ts        — Typed API route definitions
server/
  routes.ts        — Express route handlers (jobs, candidates, matches, sourcing, communications)
  storage.ts       — DatabaseStorage class (all DB operations)
  db.ts            — Drizzle DB connection
client/src/
  pages/           — dashboard, jobs, candidates, candidate-detail, matches, sourcing, screening,
                     boolean-generator, training, communications
  components/      — layout.tsx + shadcn ui components
  hooks/           — use-jobs, use-candidates, use-matches, use-auth
```

## Running
The `Start application` workflow runs `npm run dev` which starts the Express + Vite dev server on port 5000.
