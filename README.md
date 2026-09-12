# InterviewForge AI

Resume ↔ Job Description Score & Gap Analysis. Upload a resume and a job
description, get an explainable match score and a skills gap analysis —
no signup, no password, no account.

## Product Overview

```
Resume + Job Description
        │
        ▼
Document parsing → structured JSON (one AI call, cached)
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

## Architecture

**Hybrid deterministic + AI**, designed to minimize LLM calls and cost:

1. **Extraction** (1 AI call, cached by document content hash) — resume and
   JD are parsed into structured JSON *once*. Nothing downstream re-sends
   raw document text to the model.
2. **Skill matching** — a normalization/alias table
   (`skillNormalizationService.js`) resolves obvious equivalences
   (`React` ≈ `React.js`, `AWS` ≈ `Amazon Web Services`) with zero AI calls.
   Only genuinely ambiguous skills are batched into one semantic-matching AI
   call, alongside experience/responsibility/project/education relevance
   scoring.
3. **Scoring** — the weighted overall score is computed in plain JavaScript
   (`scoringService.js`); the AI only ever supplies the four sub-scores it's
   asked for, never the final number.

## Tech Stack

**Frontend**: React 18, Vite, Tailwind CSS, Lucide icons.

**Backend**: Node.js, Express, Multer, `pdf-parse` / `mammoth`, Zod,
`@google/generative-ai`.

**Storage**: JSON-file-backed repositories with atomic (write-tmp +
rename) persistence — no database, no Redis, no Docker required. A
repository abstraction (`repositories/`) means swapping in Postgres/Mongo
later wouldn't touch business logic.

**AI**: Gemini by default (`AI_PROVIDER=gemini`, model set via
`GEMINI_MODEL`), with an optional, disabled-by-default fallback provider.

## Folder Structure

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

## One-Command Development

```bash
npm install
npm run dev
```

Starts both servers concurrently from the project root — no separate
terminals needed:

- Frontend → http://localhost:5173
- Backend → http://localhost:3001

The Vite dev server proxies `/api/*` to the backend, so the frontend never
needs a hardcoded backend URL in development.

## Production Build

```bash
npm run build   # builds frontend/dist
npm start       # backend serves the built frontend + API from one process
```

Set `NODE_ENV=production` and `CORS_ORIGIN` to your deployed origin.

## API Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Liveness + whether an AI provider is configured |
| POST | `/api/upload` | Parses resume/JD file(s) or pasted text |
| POST | `/api/analysis` | Runs extraction + hybrid matching + scoring (rate-limited) |
| GET | `/api/analysis/:id` | Fetch a stored analysis (session-scoped) |
| DELETE | `/api/analysis/:id` | Permanently deletes the analysis |

All responses use `{ success, data }` or `{ success: false, error: { code, message } }`.

## LLM Cost Optimization

- Structured extraction happens **once** per document pair (hash-cached).
- Rule-based skill matching handles the majority of skills with **zero**
  AI calls; only ambiguous cases are batched into a single semantic call.
- The final score is arithmetic in code, not an AI guess.

## Security

- API keys are backend-only; the frontend never sees them.
- File uploads are validated by size, MIME type, *and* extension (a
  mismatch between extension and content type is rejected).
- Per-session rate limiting on the AI-calling analysis endpoint.
- Resume/JD content is explicitly framed as untrusted data in every prompt;
  the model is told never to follow instructions embedded in uploaded
  documents.
- AI responses are Zod-validated; on failure, exactly one retry with a
  correction prompt, then a clean user-facing error (never silently
  accepted malformed output).
- No stack traces or provider secrets are ever sent to the client.

## Privacy

Analyses (and the resume/JD data they contain) are deleted automatically
after `SESSION_TTL_HOURS` (default 24h), and can be deleted manually at any
time via **Delete Analysis**.

## Testing

```bash
cd backend
npm test
```

Covers: file validation (accepted/rejected types, size limits, MIME/extension
mismatch), skill normalization (aliases), deterministic score calculation,
AI response schema validation (valid/invalid), the hash-based cache
(MISS → HIT), and the session/analysis repository lifecycle (create → get →
update → delete, and session-scoped delete).

## Limitations

- JSON-file storage is fine for a portfolio/demo deployment on a single
  process; it is not meant to survive multi-instance horizontal scaling
  (the repository abstraction makes swapping in Postgres/Mongo later
  straightforward without touching business logic).
- The in-memory rate limiter resets on server restart and does not share
  state across multiple processes.

## Future Improvements

- A redesigned frontend dashboard surfacing the richer fields the backend
  already returns (`breakdown`, `partialSkills`, `missingSkillDetails`,
  `strengths`, `topActions`).
- PDF report export (the backend/service layer already has everything
  needed for the analysis — the remaining work is a PDF rendering step).
