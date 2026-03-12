# TalentIntel — AI-Powered Recruiting Copilot

## Overview
TalentIntel is a full-stack recruiting platform that helps technical recruiters manage jobs, source candidates from multiple job boards, and run AI-powered fit analysis.

## Architecture
- **Frontend**: React + TypeScript, Tailwind CSS, Shadcn UI, Wouter (routing), TanStack Query v5
- **Backend**: Express.js + Node.js (TypeScript via tsx)
- **Database**: PostgreSQL via Drizzle ORM
- **AI**: OpenAI (via Replit AI Integration) — gpt-5.2 model
- **Auth**: Replit Auth (Log in with Replit)

## Key Features
1. **Jobs** — Create and manage job openings; AI parses requirements and generates LinkedIn boolean strings
2. **Candidates** — Candidate profiles with AI-powered semantic search
3. **Matches** — AI fit scoring (0–100), analysis, and InMail draft generation
4. **Sourcing Plugin** — Source candidates from 7 job platforms with live API search and manual lead import

## Data Models (`shared/schema.ts`)
- `jobs` — Job openings with AI-parsed requirements and boolean strings
- `candidates` — Candidate profiles with optional `sourcePlatform` / `sourceProfileUrl` tracking
- `matches` — Job↔Candidate pairings with AI score, analysis, and InMail draft
- `sourced_leads` — Staging table for candidates found on job platforms before import

## Sourcing Plugin
Accessible at `/sourcing`. Supports 7 platforms:
- **LinkedIn** — deep-link search (opens browser)
- **Indeed** — deep-link search (opens browser)
- **Adzuna** — live API search (requires `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` env secrets)
- **Jobsite** — deep-link search (opens browser)
- **Totaljobs** — deep-link search (opens browser)
- **CV-Library** — deep-link search (opens browser)
- **Reed.co.uk** — live API search (requires `REED_API_KEY` env secret)

Leads are staged in `sourced_leads` and can be promoted to full candidates via the Pipeline tab.

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection (auto-set by Replit DB integration)
- `AI_INTEGRATIONS_OPENAI_API_KEY` + `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI (Replit AI integration)
- `REPLIT_DOMAINS`, `ISSUER_URL`, `SESSION_SECRET` — Replit Auth
- `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` — Optional: Adzuna live search
- `REED_API_KEY` — Optional: Reed.co.uk live search

## File Structure
```
shared/
  schema.ts        — Drizzle schema + Zod types for all models
  routes.ts        — Typed API route definitions
server/
  routes.ts        — Express route handlers (jobs, candidates, matches, sourcing)
  storage.ts       — DatabaseStorage class (all DB operations)
  db.ts            — Drizzle DB connection
client/src/
  pages/           — One file per page (dashboard, jobs, candidates, matches, sourcing, ...)
  components/      — layout.tsx + shadcn ui components
  hooks/           — use-jobs, use-candidates, use-matches, use-auth
```

## Running
The `Start application` workflow runs `npm run dev` which starts the Express + Vite dev server on port 5000.
