# Trade Finance LC Document Validator

An AI-powered platform for **UCP 600 compliance checking** of Trade Finance Letter of Credit (LC) documents. Built with Node.js, Express, React, and Anthropic's **Claude claude-opus-4-5** model.

---

## Overview

Banks and trade finance teams receive large volumes of LC document sets daily. Manual checking against UCP 600 rules is time-consuming and error-prone. This platform automates the extraction and cross-validation of LC documents — surfacing discrepancies, severity levels, and a structured compliance report in seconds.

---

## Features

| Category | Capability |
|---|---|
| **AI Validation** | Extracts fields from LC, Invoice, Bill of Lading, and Insurance documents |
| **UCP 600 Coverage** | Articles 14a/b/e, 17, 18, 20, 27, 28, 29, 31 — 10 rules checked |
| **Discrepancy Grading** | FATAL / MINOR / ADVISORY severity levels |
| **Streaming** | Real-time SSE token streaming via `/api/validate/stream` |
| **Human-in-the-Loop** | Manual field editing + re-validation without re-uploading documents |
| **Feedback Loop** | Per-discrepancy CORRECT / INCORRECT / PARTIAL feedback |
| **Checker Decisions** | Official ACCEPT / REFER / REJECT decision records with audit trail |
| **Confidence Scores** | HIGH / MEDIUM / LOW per extracted field |
| **Hallucination Guard** | Post-processing verifies AI `found_value` against extracted data |
| **PDF Export** | Print-ready compliance report via browser print dialog |
| **CLI Tool** | Run validations from the command line with `--demo`, `--mock`, `--eval` |
| **Prompt Caching** | Anthropic cache control on system prompts — reduces latency and cost |
| **Retry Logic** | Exponential backoff on Anthropic API 429/5xx errors |

---

## Architecture

```
trade-lc-validator/
├── backend/
│   ├── src/
│   │   ├── agents/
│   │   │   ├── extraction-agent.js     # Parallel field extraction per document
│   │   │   ├── validation-agent.js     # UCP 600 compliance + streaming
│   │   │   └── orchestrator.js         # Pipeline: extract → validate → audit
│   │   ├── api/
│   │   │   └── server.js               # Express app, all routes wired
│   │   ├── middleware/
│   │   │   ├── auth.js                 # JWT requireAuth + generateToken
│   │   │   ├── rateLimiter.js          # 20 req/min validate, 10/15min auth
│   │   │   └── validateInput.js        # Doc count, MIME, content length guards
│   │   ├── routes/
│   │   │   ├── auth.js                 # Login, /me
│   │   │   ├── feedback.js             # Per-discrepancy feedback
│   │   │   └── decisions.js            # Checker final decision
│   │   ├── prompts/
│   │   │   └── ucp600.js               # UCP 600 rules + system prompt
│   │   ├── utils/
│   │   │   ├── logger.js               # Hash-chained audit log (SHA-256)
│   │   │   ├── retry.js                # Exponential backoff utility
│   │   │   └── report.js               # CLI report formatter
│   │   ├── cli.js                      # Command-line interface
│   │   └── index.js                    # Server entry point
│   ├── test-e2e.mjs                    # End-to-end test suite (25 tests)
│   ├── .env.example                    # Environment variable template
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── LoginPage.jsx           # JWT login form
    │   │   ├── UploadZone.jsx          # Drag-and-drop file upload
    │   │   ├── DiscrepancyTable.jsx    # Expandable rows + feedback buttons
    │   │   ├── ExtractedFields.jsx     # Tabbed fields + confidence + edit mode
    │   │   └── ValidationReport.jsx    # Summary, decision panel, PDF export
    │   ├── api.js                      # Axios client with JWT interceptors
    │   ├── App.jsx                     # Top-level state machine
    │   └── main.jsx
    └── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Clone the repository

```bash
git clone https://github.com/sreekanth477/trade-lc-validator.git
cd trade-lc-validator
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
ANTHROPIC_API_KEY=your_api_key_here
CLAUDE_MODEL=claude-opus-4-5
PORT=3001
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
JWT_EXPIRES_IN=8h
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=20
CORS_ORIGIN=http://localhost:5173
AUDIT_RETENTION_DAYS=90
```

### 3. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 4. Start the servers

```bash
# Terminal 1 — backend (port 3001)
cd backend && npm start

# Terminal 2 — frontend (port 5173)
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

**Demo credentials:** `checker1` / `demo1234`

---

## API Reference

All endpoints under `/api/validate`, `/api/feedback`, and `/api/decisions` require a JWT Bearer token.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check + active model name |
| `POST` | `/api/auth/login` | Authenticate, receive JWT |
| `GET` | `/api/auth/me` | Current user info |
| `POST` | `/api/validate` | Multipart file upload validation |
| `POST` | `/api/validate/text` | JSON text document validation |
| `POST` | `/api/validate/stream` | SSE streaming validation |
| `POST` | `/api/validate/manual-fields` | Re-validate manually corrected fields |
| `POST` | `/api/feedback` | Submit per-discrepancy feedback |
| `GET` | `/api/feedback/:submissionId` | Retrieve feedback for a submission |
| `POST` | `/api/decisions` | Record checker's final decision |
| `GET` | `/api/decisions/:submissionId` | Retrieve decision for a submission |

---

## CLI Usage

```bash
cd backend

# Run with real documents (requires ANTHROPIC_API_KEY)
node src/cli.js --lc lc.pdf --invoice invoice.pdf --date 2025-01-15

# Demo mode with mock data (no API key needed)
node src/cli.js --demo --mock

# Run evaluation suite against known scenarios
node src/cli.js --eval
```

---

## Security

| Control | Implementation |
|---|---|
| **Authentication** | JWT (HS256), 8h expiry, secret validated at startup |
| **Secret strength** | Server refuses to start if `JWT_SECRET` < 32 chars |
| **Rate limiting** | 20 req/min on validate endpoints; 10 attempts/15min on login |
| **CORS** | Restricted to explicit allowlist via `CORS_ORIGIN` env var |
| **Body size** | 1 MB JSON limit; multipart controlled by Multer |
| **Input validation** | Max 4 documents, MIME allowlist, 200K char content cap |
| **Error messages** | Raw `err.message` never sent to clients |
| **Audit log** | SHA-256 hash-chained entries; tamper-evident |
| **Secrets in git** | `.env` excluded by `.gitignore`; `.env.example` provided |
| **Proxy trust** | `trust proxy 1` ensures correct IP for rate limiting |

---

## Running the Test Suite

```bash
cd backend
node test-e2e.mjs
```

The suite covers 25 assertions across 11 sections — no API key required:

- Health check
- Auth login (validation + success)
- `/api/auth/me` with and without token
- Unauthenticated route access
- Input validation (doc count, MIME type, empty content)
- Manual-fields schema guard
- Rate limiting (429 within 25 requests)
- Feedback CRUD
- Decisions CRUD (including 404 for missing)
- JSON body size limit (1 MB)

---

## UCP 600 Rules Covered

| Article | Rule |
|---|---|
| Art. 14a | Documents must appear consistent on their face |
| Art. 14b | Presentation period — within 21 calendar days of shipment |
| Art. 14e | Description of goods matches LC exactly |
| Art. 17 | Original documents required |
| Art. 18 | Commercial invoice — issued by beneficiary, matches LC currency & amount |
| Art. 20 | Bill of Lading — on-board notation, consignee, notify party |
| Art. 27 | Clean transport document — no adverse clauses |
| Art. 28 | Insurance document — correct coverage type and amount |
| Art. 29 | Expiry date — presentation within LC validity |
| Art. 31 | Partial shipments — allowed/prohibited per LC terms |

---

## Tech Stack

**Backend**
- Node.js 18+ / Express 4
- Anthropic SDK (`@anthropic-ai/sdk`)
- `jsonwebtoken` + `bcryptjs`
- `express-rate-limit`, `helmet`, `cors`
- `multer`, `uuid`, `winston`

**Frontend**
- React 18 + Vite
- Axios
- Native HTML5 drag-and-drop
- CSS `@media print` for PDF export

---

## License

MIT
