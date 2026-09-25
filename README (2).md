# TalentInsight — AI Recruitment CRM

Next.js (frontend) + FastAPI (backend) + PostgreSQL (database).

## Folder map

```
Talent-Insight/
├── backend/                 FastAPI app (Python) – the "kitchen"
│   ├── app/
│   │   ├── main.py          Starts the API, logging, CORS, error safety net
│   │   ├── core/config.py   Reads settings/secrets from .env
│   │   ├── core/logging.py  Log format with request IDs
│   │   ├── db/session.py    Database connection
│   │   └── api/routes/      One file per feature (health.py for now)
│   ├── tests/               Automated tests (run: pytest)
│   ├── requirements.txt     Python packages to install
│   └── .env.example         Template for your secrets file
├── frontend/                Next.js app – the "dining room" (created in step 6)
├── docker-compose.yml       Runs PostgreSQL in Docker
└── .gitignore               Stops secrets and CVs going into Git
```

## Milestone 1 setup — do these in order

### 1. Get the repo and back up the old Replit code
```
git clone https://github.com/arunprataprv007-crypto/Talent-Insight.git
cd Talent-Insight
git checkout -b legacy-replit
git push -u origin legacy-replit
git checkout main
git rm -r -q .
git commit -m "Clear main for rebuild (old prototype kept on legacy-replit branch)"
```

### 2. Add the new files
Unzip `milestone-1.zip` and copy everything inside it into the `Talent-Insight` folder.
(On Mac, press Cmd+Shift+. in Finder to see hidden files like `.gitignore`.)

### 3. Start the database
```
docker compose up -d
docker compose ps
```
✅ The STATUS column should say **healthy** (wait ~10 seconds and re-run if it says "starting").

### 4. Set up the backend
```
cd backend
python -m venv .venv
```
Activate it (you'll see `(.venv)` at the start of the line):
- Windows: `.venv\Scripts\activate`
  - If you get a "running scripts is disabled" error, run once:
    `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` then try again.
- Mac: `source .venv/bin/activate`

```
pip install -r requirements.txt
```
Create your secrets file:
- Windows: `copy .env.example .env`
- Mac: `cp .env.example .env`

### 5. Test and run the backend
```
pytest
```
✅ Expect: **3 passed**

```
uvicorn app.main:app --reload --port 8000
```
✅ Open http://localhost:8000/api/health — you should see `"database": "ok"`
✅ Open http://localhost:8000/docs — interactive list of API endpoints

Leave this terminal running.

### 6. Create and run the frontend (open a NEW terminal, in the Talent-Insight folder)
```
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
```
If it asks any extra questions, press Enter to accept the default.

Then copy our two files in:
- `frontend-files/app/page.tsx` → replace `frontend/app/page.tsx`
- `frontend-files/.env.local.example` → copy to `frontend/.env.local`

Delete the `frontend-files` folder, then:
```
cd frontend
npm run dev
```
✅ Open http://localhost:3000 — you should see **Backend: ok** and **Database: ok** in green.

### 7. Save your progress to GitHub
```
cd ..
git add .
git status
```
⚠️ Check the list: you must NOT see `.env` or `.env.local`. If you do, stop and ask.
```
git commit -m "Milestone 1: foundation (FastAPI, Next.js, PostgreSQL)"
git push
```

## Everyday commands
| Task | Command |
|---|---|
| Start database | `docker compose up -d` |
| Start backend | `cd backend` → activate venv → `uvicorn app.main:app --reload --port 8000` |
| Start frontend | `cd frontend` → `npm run dev` |
| Run tests | `cd backend` → `pytest` |
| Stop database | `docker compose down` |
