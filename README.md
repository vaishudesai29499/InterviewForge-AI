# InterviewForge AI

Resume ↔ Job Description Score & Gap Analysis. Upload a resume and a job
description, get an explainable match score and a skills gap analysis —
no signup, no password, no account.

## Project Description

InterviewForge AI is a **Resume ↔ Job Description matcher and gap-analysis
tool**. A user uploads (or pastes) a resume and a job description, and the
app returns an explainable match score along with a breakdown of matching,
partial, and missing skills — with no signup, login, or account required.
Everything is scoped to an anonymous, auto-expiring session.

## Problem It Solves

Job seekers and recruiters often struggle to quickly judge how well a
resume fits a job description, and generic "AI resume checkers" are
usually black boxes (a single vague score with no reasoning) or overly
expensive because every check triggers a fresh, costly AI call.
InterviewForge AI solves this by:

- Giving an **explainable** score (not just a number) broken down by
  skills, experience, responsibilities, projects, and education.
- Minimizing AI cost/latency by doing as much matching as possible with
  plain code, only calling AI where genuinely necessary.
- Keeping the process anonymous and privacy-respecting (auto-expiring
  data, manual delete).

## How It's Resolved (Approach)

A **hybrid deterministic + AI pipeline**, designed specifically to cut
down LLM calls:

1. **Extraction (1 AI call, cached)** — resume & JD text is parsed into
   structured JSON once, cached by a content hash so re-analysis never
   resends raw text to the model.
2. **Rule-based skill matching (0 AI calls in most cases)** — a skill
   alias/normalization table resolves obvious equivalents (e.g., `React`
   ≈ `React.js`, `AWS` ≈ `Amazon Web Services`). Only ambiguous skills get
   escalated into a **single batched** semantic-matching AI call (combined
   with experience/responsibility/project/education scoring).
3. **Deterministic scoring** — the final weighted score (skills 40%,
   experience 20%, responsibilities 20%, projects 10%, education 10%) is
   computed in plain JavaScript — the AI never invents the final number,
   only supplies sub-scores.
4. Results are rendered on a **Gap Analysis Dashboard**.

## Features

- **Upload & parse**: upload resume/JD files (or paste text) and extract
  structured data from them.
- **Resume ↔ JD analysis**: overall match score with an explainable
  breakdown, matching/partial/missing skills, experience & responsibility
  relevance, education fit.
- **Gap Analysis Dashboard**: match score, experience relevancy score,
  matching skills, and skill gaps rendered as a single visual dashboard.
- **No login, ever**: an anonymous, random session ID (not a predictable
  counter) scopes your data. Analyses auto-expire and can be deleted
  manually at any time.

## Technology Used

| Layer | Stack |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS, Lucide icons |
| Backend | Node.js (ESM), Express 4, Multer (uploads), `pdf-parse` + `mammoth` (doc parsing), Zod (schema validation) |
| AI Provider | Google Gemini via `@google/generative-ai` (default), optional disabled-by-default fallback (Groq) |
| Storage | JSON-file-backed repositories with atomic (write-tmp + rename) persistence — no database, no Redis, no Docker |
| Dev tooling | `concurrently` to run both servers with one command |

## Project Architecture

```
Resume + Job Description
        │
        ▼
Document parsing → structured JSON (1 AI call, cached by content hash)
        │
        ▼
Rule-based skill matching (no AI) → only ambiguous skills escalate to AI
        │
        ▼
Deterministic weighted score (skills 40% · experience 20% ·
responsibilities 20% · projects 10% · education 10%)
        │
        ▼
Gap Analysis Dashboard
```

### Folder Structure

```
interviewforge-ai/
├── package.json              # root: npm run dev starts both servers
├── backend/
│   ├── src/
│   │   ├── controllers/      # upload, analysis
│   │   ├── services/         # skill matching, scoring, AI provider, cache
│   │   ├── repositories/     # JSON-file session/analysis storage
│   │   ├── middleware/       # anonymous session, rate limiting
│   │   ├── utils/            # prompts, Zod schemas, hashing
│   │   └── server.js
│   └── data/                 # generated at runtime, gitignored
└── frontend/
    └── src/
        ├── components/       # Navbar, FileUploadSection, AnalysisDashboard, Toast
        ├── hooks/             # useInterviewState
        ├── services/api.js    # backend client (session header, endpoints)
        └── utils/session.js   # anonymous session id (localStorage)
```

### API Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Liveness + whether an AI provider is configured |
| POST | `/api/upload` | Parses resume/JD file(s) or pasted text |
| POST | `/api/analysis` | Runs extraction + hybrid matching + scoring (rate-limited) |
| GET | `/api/analysis/:id` | Fetch a stored analysis (session-scoped) |
| DELETE | `/api/analysis/:id` | Permanently deletes the analysis |

All responses use `{ success, data }` or
`{ success: false, error: { code, message } }`.

### Security

- API keys are backend-only; the frontend never sees them.
- File uploads are validated by size, MIME type, *and* extension (a
  mismatch between extension and content type is rejected).
- Per-session rate limiting on the AI-calling analysis endpoint.
- Resume/JD content is explicitly framed as untrusted data in every
  prompt; the model is told never to follow instructions embedded in
  uploaded documents.
- AI responses are Zod-validated; on failure, exactly one retry with a
  correction prompt, then a clean user-facing error (never silently
  accepted malformed output).
- No stack traces or provider secrets are ever sent to the client.

### Privacy

Analyses (and the resume/JD data they contain) are deleted automatically
after `SESSION_TTL_HOURS` (default 24h), and can be deleted manually at
any time via **Delete Analysis**.

## Environment Setup

```bash
cp backend/.env.example backend/.env
# then set GEMINI_API_KEY in backend/.env (get a free key from Google AI Studio)

cp frontend/.env.example frontend/.env   # optional — defaults to the Vite proxy
```

Key backend variables (`backend/.env`):

| Variable | Default | Purpose |
|---|---|---|
| `AI_PROVIDER` | `gemini` | `gemini` or `groq` |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Verify current availability in your Google AI Studio project |
| `SESSION_TTL_HOURS` | `24` | Anonymous session + analysis auto-expiry |
| `ANALYSIS_CACHE_TTL_HOURS` | `24` | AI response cache TTL |
| `MAX_FILE_SIZE_MB` | `5` | Upload limit |
| `RATE_LIMIT_ANALYZE_PER_HOUR` | `5` | Per-session |

## Run Locally

```bash
git clone <your-repo-url>
cd interviewforge-ai

npm install
npm run dev
```

Starts both servers concurrently from the project root — no separate
terminals needed:

- Frontend → http://localhost:5173
- Backend → http://localhost:3001

The Vite dev server proxies `/api/*` to the backend, so the frontend never
needs a hardcoded backend URL in development.

## Run Live (Production / Deployment)

```bash
npm run build   # builds frontend/dist
npm start       # backend serves the built frontend + API from one process
```

Set `NODE_ENV=production` and `CORS_ORIGIN` to your deployed origin.

Since it's a single Node process with JSON-file storage and no Docker/DB
requirement, it deploys easily to any Node host (e.g., Render, Railway, a
VPS, Fly.io) — just set the env vars above (especially `GEMINI_API_KEY`)
on the host.

## LLM Cost Optimization

- Structured extraction happens **once** per document pair (hash-cached).
- Rule-based skill matching handles the majority of skills with **zero**
  AI calls; only ambiguous cases are batched into a single semantic call.
- The final score is arithmetic in code, not an AI guess.

## Testing

```bash
cd backend
npm test
```

Covers: file validation (accepted/rejected types, size limits,
MIME/extension mismatch), skill normalization (aliases), deterministic
score calculation, AI response schema validation (valid/invalid), the
hash-based cache (MISS → HIT), and the session/analysis repository
lifecycle (create → get → update → delete, and session-scoped delete).

## Limitations

- **JSON-file storage** is fine for a portfolio/demo deployment on a
  single process; it is not meant to survive multi-instance horizontal
  scaling (the repository abstraction makes swapping in Postgres/Mongo
  later straightforward without touching business logic).
- The **in-memory rate limiter** resets on server restart and does not
  share state across multiple processes.
- No user accounts — data is only session/anonymous-scoped, so there's no
  cross-device history.
- Dashboard is currently basic; richer backend fields (`breakdown`,
  `partialSkills`, `missingSkillDetails`, `strengths`, `topActions`)
  aren't all surfaced in the UI yet.
- No PDF export of the analysis report yet (service layer supports it,
  rendering step is pending).

## Future Improvements

- A redesigned frontend dashboard surfacing the richer fields the backend
  already returns (`breakdown`, `partialSkills`, `missingSkillDetails`,
  `strengths`, `topActions`).
- PDF report export (the backend/service layer already has everything
  needed for the analysis — the remaining work is a PDF rendering step).
