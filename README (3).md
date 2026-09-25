# TalentInsight — AI Recruitment CRM

One web app for the whole hiring flow:

- **Candidate CRM:** profiles, search, tags, notes, consent status, CV storage.
- **CV upload & parsing:** PDF, DOCX and TXT, up to 25 files at once. Duplicates are merged by email.
- **Jobs & pipelines:** a kanban board with 7 stages and full stage history.
- **JD matching:** a score with strengths, gaps, evidence and interview focus. It is always labelled *for recruiter review*.
- **AI tools:**
  - JD generator (one click to turn a JD into a job)
  - Boolean search builder
  - Email writer
  - Interview kit & scorecards
  - Recruiting assistant chat
- **Analytics:** funnel, stage counts, weekly volume, source effectiveness, time to hire, AI usage.
- **Security & admin:**
  - Sign-in with roles (Admin, Recruiter, Hiring manager)
  - Audit log and login rate limiting
  - Dark/light mode and a mobile layout

**Works without an AI key.** Every AI feature has a rule-based fallback, and results are labelled either "AI draft" or "Rule-based draft". When you add a key, the same buttons simply get smarter.

---

## 1. What's in the box

```
Dockerfile              → packages the whole app into one container
docker-compose.yml      → runs app + database on your laptop
render.yaml             → one-click cloud deployment on Render
.github/workflows/      → runs the tests automatically on every GitHub push
backend/                → Python API (FastAPI)
  app/main.py           → entry point, security headers, serves the web interface
  app/api/routes/       → one file per feature area (candidates, jobs, ai_tools…)
  app/services/         → the "brains": CV parsing, AI adapter, rule-based fallbacks
  app/db/models.py      → database tables
  tests/                → automated tests for every feature
frontend/               → the web interface (plain HTML, CSS, JavaScript; no build step)
```

## 2. Run it on your laptop (3 commands)

You need **Git** and **Docker Desktop** installed and running.

```bash
git clone https://github.com/arunprataprv007-crypto/Talent-Insight.git
cd Talent-Insight
docker compose up --build
```

Open **http://localhost:8000** and sign in with:

- Email `admin@example.com`
- Password `LocalAdmin-2026`

Fictional sample jobs and candidates (marked "(Sample)") are loaded so you can try everything straight away.

To stop, press `Ctrl + C`. Your data is kept for next time. To wipe it and start fresh, run `docker compose down -v`.

**To switch AI on locally:**

1. Copy `.env.example` to `.env`.
2. Paste your key after `OPENAI_API_KEY=`.
3. Run `docker compose up --build` again.

## 3. Run the automated tests

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
pytest -v
```

The tests cover:

- sign-in, the rate limit and all three roles
- the CSRF check and security headers
- candidates (create/search/edit/delete) and notes
- CV upload, parsing, rejection of bad files, de-duplication and download
- jobs, pipeline moves, matching, interviews and scorecards
- every AI tool in fallback mode
- analytics and the audit log

Every test should say `PASSED`.

## 4. Deploy to the cloud (Render)

1. Push this code to GitHub (see section 7).
2. On render.com go to **New + → Blueprint**, choose the repo and click **Apply**. The file `render.yaml` creates the database and the app together.
3. When Render asks for values, enter:
   - **ADMIN_EMAIL:** your work email
   - **ADMIN_PASSWORD:** a strong password (10+ characters, mixed case, a number)
   - **OPENAI_API_KEY:** your key, or leave it blank for rules mode
4. Wait for the deploy to show **Live**, then open the URL Render gives you and sign in.

`SECRET_KEY` is generated automatically. HTTPS is provided by Render. Choose paid plans for real use, because free databases are deleted after a trial period.

## 5. Production checklist

- [ ] Signed in and changed the admin password under **Your account**.
- [ ] `SEED_DEMO_DATA` is `false` (this is the default in `render.yaml`).
- [ ] Added team members under **Team & roles** with the least access they need.
- [ ] Set a monthly **spending limit** in your OpenAI billing settings, and `AI_MONTHLY_TOKEN_BUDGET` in the app.
- [ ] Database on a paid plan with **automatic backups** switched on.
- [ ] Confirmed which data may be sent to the AI provider before switching AI on for real candidates.
  - Contact details are stripped before matching.
  - The chat only sees anonymised totals.

## 6. Roles

| | Admin | Recruiter | Hiring manager |
|---|---|---|---|
| View candidates, jobs, analytics | ✓ | ✓ | ✓ |
| Add notes, submit interview scorecards, chat, interview kits | ✓ | ✓ | ✓ |
| Upload CVs, edit candidates & jobs, move stages, run matches, AI writing tools | ✓ | ✓ | |
| Delete candidates or jobs, manage users, view audit log | ✓ | | |

## 7. Replace the old code in your GitHub repo

The old Replit prototype is saved on a branch called `legacy-replit`, so nothing is lost.

```bash
cd Talent-Insight
git checkout -b legacy-replit && git push -u origin legacy-replit
git checkout main
git rm -r -q .
# copy everything from this download into the folder, then:
git add .
git commit -m "TalentInsight v1: full rebuild"
git push
```

## 8. How it works (plain English)

- **One service.** The Python backend serves both the data (`/api/...`) and the web pages. That means one thing to deploy, one address, and no cross-site cookie problems.
- **Sign-in.** Passwords are stored only as salted hashes (PBKDF2, 600,000 rounds). After sign-in, the browser holds a signed token in a cookie that JavaScript can't read. Five wrong passwords lock that email for 15 minutes.
- **CVs** are stored inside the database, not on disk, so backups include them. Only PDF, DOCX and TXT up to 5 MB are accepted, and file contents are checked rather than trusting the name.
- **AI adapter** (`app/services/ai_client.py`) is the only file that talks to OpenAI. It:
  - checks the monthly token budget
  - records usage for every call
  - falls back to rules on any failure

  To switch provider, only this file changes. `OPENAI_BASE_URL` also allows OpenAI-compatible endpoints.
- **Fairness guardrails.** Matching prompts tell the model to ignore protected characteristics and to cite evidence. The UI labels every score as a suggestion for review, and stage moves are always made by a person.
- **Audit trail.** Sign-ins, failed sign-ins, uploads, CV downloads, stage changes, matches and deletions are all logged with user, time and IP.

## 9. Known limits & next upgrades

- **Database changes.** Tables are created automatically on first start. For future schema changes, add Alembic migrations so existing data is upgraded safely.
- **Scaling.** The app runs as one process by default. That is plenty for a recruitment team. Scaling out needs a shared rate-limit store such as Redis and a migration step at deploy time.
- **Scanned PDFs.** Image-only CVs can't be read (no OCR).
- **Possible next features:**
  - email sending via Outlook or SendGrid
  - calendar invites
  - SSO sign-in (Microsoft Entra ID)
  - CSV export
  - automatic data-retention deletion
  - a Next.js/React frontend if the team later wants it
