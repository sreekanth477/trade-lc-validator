# PRD — Trade LC Validator: UCP 600 AI Compliance Engine

**Document version:** 1.0
**Last updated:** 2026-04-22
**Status:** Draft — Awaiting stakeholder review

---

## 1. Summary

Trade LC Validator is an AI-powered web platform that checks trade finance documents — Letters of Credit, Commercial Invoices, Bills of Lading, and Insurance Certificates — against the internationally recognised UCP 600 ruleset. It replaces slow, error-prone manual checking by bank operations staff with a fast, consistent, and auditable AI review that flags every discrepancy, grades its severity, and recommends ACCEPT or REJECT in under 60 seconds.

---

## 2. Contacts

| Name | Role | Responsibility |
|------|------|---------------|
| Sreekanth Yelam | Product Owner | Vision, prioritisation, stakeholder sign-off |
| Trade Finance Ops Lead | Subject Matter Expert | UCP 600 rule validation, user acceptance testing |
| Backend Engineer | Tech Lead — Backend | Node.js API, Anthropic SDK integration, orchestration pipeline |
| Frontend Engineer | Tech Lead — Frontend | React UI, upload experience, report rendering |
| Compliance Officer | Reviewer | Regulatory alignment, audit trail requirements |
| IT Security | Reviewer | Auth, data-at-rest, API key management |

---

## 3. Background

### What is this?

When a company imports or exports goods, a Letter of Credit (LC) is used as a payment guarantee from the buyer's bank. Before the bank pays, a team of document checkers must compare every document in the set — LC, Invoice, Bill of Lading, Insurance Certificate — against a strict international rulebook called **UCP 600** (Uniform Customs and Practice for Documentary Credits, ICC Publication 600).

A single discrepancy — a wrong date, a missing original, a prohibited transshipment — can cause the bank to reject the documents and delay payment by days or weeks, costing importers and exporters money.

### Why now?

Three forces are converging:

1. **AI reasoning has matured.** Large language models like Claude can now read structured and unstructured documents, extract fields accurately, and reason across multiple documents to spot conflicts — tasks that were impractical to automate two years ago.

2. **Trade finance ops teams are under pressure.** Banks face growing document volumes, staff shortages, and regulatory demands for consistent decision records. Manual checking averages 2–4 hours per document set; AI-assisted checking can bring this to under 5 minutes.

3. **UCP 600 is well-defined.** Unlike many compliance domains, UCP 600 articles are precise and finite. This makes them ideal for AI rule application — there is little ambiguity about what constitutes a violation.

### Current state

An MVP has been built and validated:
- Backend: Node.js (ESM), Express, Anthropic SDK (`claude-opus-4-5`)
- Frontend: React + Vite single-page app
- Covers UCP 600 Articles 14a, 14b, 14e, 17, 18, 20, 27, 28, 29, 31
- Parallel AI extraction of fields from PDF, image, and plain text documents
- Structured JSON output with FATAL / MINOR / ADVISORY discrepancy grading
- CLI tool for batch / integration use
- REST API (`/validate`, `/validate/text`, `/health`)
- Audit log (append-only JSON lines)

**Current gaps identified**: no user authentication, no database persistence, no report export, no drag-and-drop, not mobile-responsive, no dark mode, no real-time multi-user collaboration, no support for ISBP 745 (ICC's banking practice supplement).

---

## 4. Objective

### Why it matters

Banks that adopt this tool will:
- Reduce document checking time from 2–4 hours to under 5 minutes per set
- Eliminate human error in rule application across all 10 UCP 600 articles covered
- Produce a consistent, auditable record of every compliance decision
- Free senior checkers to focus on edge cases and client relationships

### Strategic alignment

This product sits at the intersection of two institutional priorities:
- **Operational efficiency** — reduce headcount cost per LC transaction
- **Risk reduction** — fewer missed discrepancies means fewer fraud exposures and regulatory penalties

### Key Results (OKRs)

| Objective | Key Result | Target | Timeframe |
|-----------|------------|--------|-----------|
| Reduce checking time | Average time from document upload to decision | < 5 minutes | 3 months post-launch |
| High accuracy | AI discrepancy detection rate vs expert checker | ≥ 95% precision | 6 months post-launch |
| User adoption | Active document checkers using the tool weekly | 20 checkers at pilot bank | 3 months post-launch |
| Audit compliance | All validations captured in immutable audit log | 100% coverage | Day 1 |
| Reliability | System uptime during business hours | ≥ 99.5% | 3 months post-launch |
| User satisfaction | Checker NPS (net promoter score) | ≥ 40 | 6 months post-launch |

---

## 5. Market Segments

### Primary — Bank Trade Finance Operations Teams

**Who they are:** Document checkers, trade finance officers, and operations managers at commercial banks and trade finance boutiques. Teams range from 5 to 50 people depending on transaction volume.

**Their job:** Examine every document presented under an LC for UCP 600 compliance. Approve compliant sets for payment. Issue formal Notices of Refusal for non-compliant sets within 5 banking days (Art 14a).

**Their pain:**
- Manual checking is slow and inconsistent — different checkers interpret rules differently
- High-volume periods create backlogs, increasing the risk of missing the 5-day deadline
- Junior checkers miss subtle cross-document discrepancies (Art 14b conflicts)
- No easy way to show regulators a clear audit trail for each decision
- Training new checkers takes 6–12 months to reach acceptable accuracy

**Constraints:**
- Must operate within bank IT security policies (on-premise or approved cloud)
- Decisions must remain with a human — AI is a tool, not the final decision-maker
- Data privacy: LC and invoice content is commercially sensitive

### Secondary — Corporate Treasury and Trade Finance Managers

**Who they are:** Treasury teams at large importers/exporters who want to self-check documents before presenting them to the bank, reducing rejection risk.

**Their pain:**
- A rejected document set can delay payment by 5–10 banking days
- Rejections damage supplier relationships
- Legal cost of disputes over discrepancy refusals

### Tertiary — Trade Finance Fintechs and Platforms

**Who they are:** Platforms (e.g., digital LC platforms, supply chain finance providers) that want to embed compliance checking via API into their own workflows.

**Their need:** Clean REST API with predictable JSON responses and SLA guarantees.

---

## 6. Value Propositions

### Jobs we address

| Customer Job | How we solve it |
|-------------|-----------------|
| Check documents against UCP 600 before the 5-day deadline | AI checks in < 5 minutes vs 2–4 hours manually |
| Spot cross-document conflicts (Art 14b) | AI compares all documents simultaneously, not sequentially |
| Produce an audit record for every decision | Append-only JSON audit log per submission |
| Train junior checkers | Report explains every discrepancy with the UCP article and remediation steps |
| Reduce re-work from missed discrepancies | FATAL / MINOR / ADVISORY grading prioritises what matters |

### Gains delivered

- **Speed:** A document set checked in under 5 minutes, any time of day
- **Consistency:** Same rules applied identically to every submission — no checker variation
- **Explainability:** Every finding links to a specific UCP 600 article and quotes both the LC requirement and the found value
- **Remediation guidance:** Each discrepancy includes a plain-English fix — reducing back-and-forth with beneficiaries
- **Scalability:** Handle 100× the volume with the same team size

### Pains avoided

- Missing the 5-day Art 14a examination window
- Paying out on fraudulent or non-compliant document sets
- Regulatory penalties for inconsistent compliance decisions
- Staff burnout from repetitive checking during high-volume periods
- Reputational damage from wrong rejections or approvals

### Why better than alternatives

| Alternative | Weakness vs Trade LC Validator |
|-------------|-------------------------------|
| Manual checking | Slow, inconsistent, no audit trail |
| Generic AI chatbot | No UCP 600 rules encoded, hallucination risk, no structured output |
| Legacy LC software (e.g., STP solutions) | Rules-based only — rigid, can't read varied document formats |
| Outsourced checking | Expensive, slow turnaround, data leaves the bank |

---

## 7. Solution

### 7.1 User Flows

#### Flow A — Web Upload (Primary)

```
Checker opens app
  → Sees 4 upload cards (LC required, others recommended)
  → Drags or clicks to upload PDF/image files
  → Clicks "Validate Documents"
  → Spinner: "Extracting fields and validating against UCP 600..."
  → Results page appears:
      Summary banner (ACCEPT / REJECT / CONDITIONAL)
      Compliance checks grid (6 checks)
      Discrepancy table (sorted FATAL → MINOR → ADVISORY)
      Extracted fields panel (tabbed: LC / INV / BL / INS)
      Summary notes + Checker recommendation
  → Checker reviews, adds notes, exports PDF report
  → Checker marks decision (Accept / Refer / Reject)
  → Audit log entry created
```

#### Flow B — CLI / Batch (Secondary)

```
Ops team runs: node src/cli.js --lc lc.pdf --invoice inv.pdf --bl bl.pdf --insurance ins.pdf
  → Formatted terminal report with discrepancies and UCP references
  → Exit code 0 (ACCEPT) or 1 (REJECT) for pipeline integration
```

#### Flow C — API Integration (Tertiary)

```
Fintech platform POSTs to /api/validate/text with document JSON
  → Receives structured JSON response
  → Renders results in their own UI
```

---

### 7.2 Key Features

#### MVP (Built — v1.0)

| # | Feature | Description |
|---|---------|-------------|
| F01 | Document Upload | 4-card upload zone accepting PDF, PNG, JPG, TXT; up to 20 MB per file |
| F02 | AI Field Extraction | Claude extracts 10–17 structured fields per document type in parallel |
| F03 | UCP 600 Validation | 10 articles checked; returns COMPLIANT / NON_COMPLIANT / CONDITIONAL |
| F04 | Discrepancy Report | Each finding: severity, document, field, LC requirement, found value, UCP article, remediation |
| F05 | Compliance Check Grid | 6 pairwise checks: Invoice↔LC, BL↔LC, Insurance↔LC, Cross-doc, Completeness, Dates |
| F06 | ACCEPT / REJECT Badge | Prominent recommendation with counts by severity |
| F07 | Extracted Fields Panel | Tabbed view of all AI-extracted fields per document |
| F08 | Audit Log | Append-only JSON audit trail per submission (submissionId, timestamp, recommendation) |
| F09 | CLI Tool | Terminal report with formatted output and exit codes |
| F10 | REST API | `GET /health`, `POST /validate` (multipart), `POST /validate/text` (JSON) |
| F11 | Demo Mode | Pre-loaded 4-discrepancy scenario for training and testing |

#### Near-term Improvements (v1.1 — 6 weeks)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| F12 | Authentication | JWT login / SSO (SAML/OIDC) for bank Active Directory integration | P0 — Critical |
| F13 | Drag-and-drop upload | Drop files directly onto upload cards | P1 |
| F14 | Report export | Download validation report as PDF or CSV | P1 |
| F15 | Remove file button | × icon to clear a selected file before submission | P1 |
| F16 | Mobile responsiveness | Stacked layout for tablets; read-only results on mobile | P1 |
| F17 | Expandable discrepancy rows | Click to expand full description and remediation in-table | P2 |
| F18 | Discrepancy filter/sort | Filter by document type; sort by severity | P2 |
| F19 | Mismatched field highlight | Red border on extracted fields flagged in discrepancies | P2 |
| F20 | File size indicator | Show KB/MB alongside filename after upload | P3 |
| F21 | Submission metadata collapse | Toggle to hide/show submission ID, timestamp, duration | P3 |

#### Medium-term (v1.2 — 3 months)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| F22 | Database persistence | PostgreSQL store for submissions, results, and audit log | P0 |
| F23 | Submission history | List of past validations per user with search and filter | P1 |
| F24 | Checker notes | Free-text annotation field on each validation result | P1 |
| F25 | Decision workflow | Checker marks Accept / Refer to Senior / Reject with reason | P1 |
| F26 | Notice of Refusal generator | Auto-draft Art 16 refusal notice from discrepancy list | P1 |
| F27 | Skeleton loading screens | Animated placeholders during AI extraction phase | P2 |
| F28 | Toast notification system | Success/error toasts replacing full-page error states | P2 |
| F29 | Dark mode | `prefers-color-scheme: dark` support | P3 |
| F30 | PDF inline preview | Render PDF pages alongside extracted fields | P3 |

#### Long-term (v2.0 — 6+ months)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| F31 | ISBP 745 coverage | Add ICC Banking Commission practice guidelines on top of UCP 600 | P1 |
| F32 | eUCP support | Electronic presentation rules for digital documents | P1 |
| F33 | Side-by-side document view | LC requirements on left, flagged document field on right | P1 |
| F34 | Compliance score ring | Donut chart showing overall compliance percentage | P2 |
| F35 | Multi-user collaboration | Multiple checkers on same submission; comments thread | P2 |
| F36 | Analytics dashboard | Volume, approval rate, top discrepancy types, avg processing time | P2 |
| F37 | LC amendment tracker | Track amendments against original LC terms | P2 |
| F38 | Batch processing | Upload a ZIP of document sets; process in queue | P2 |
| F39 | Webhook callbacks | Notify external systems when validation completes | P3 |
| F40 | Multi-language support | Arabic, Chinese, French — common LC issuing languages | P3 |

---

### 7.3 Technology

| Layer | Current Stack | Notes |
|-------|--------------|-------|
| AI Model | `claude-opus-4-5` via Anthropic SDK | Parallel extraction + sequential validation |
| Backend | Node.js 18+ (ESM), Express 4 | REST API, Multer for file upload |
| Frontend | React 18, Vite 5, Axios | SPA, no UI library (plain CSS-in-JS) |
| Audit log | Append-only JSON file (`logs/audit.log`) | Must move to DB for production |
| Auth | None (MVP) | Needs JWT + SAML/OIDC before production |
| Database | None (MVP) | PostgreSQL recommended for v1.2 |
| Deployment | Local / any Node host (MVP) | Docker + cloud (AWS/Azure) for production |

#### Recommended architecture changes for production

```
Browser (React)
    │
    ▼
API Gateway (rate limiting, auth)
    │
    ▼
Backend Service (Express)          ← horizontal scaling
    │         │
    ▼         ▼
Anthropic   PostgreSQL
  API       (submissions + audit)
```

---

### 7.4 Assumptions

| # | Assumption | Risk if wrong |
|---|-----------|---------------|
| A01 | Claude correctly extracts fields from varied real-world document formats | Extraction errors → false discrepancies; need human review fallback |
| A02 | UCP 600 articles 14–31 cover ≥ 90% of real discrepancy types | Missing rules → false negatives; need ISBP 745 integration |
| A03 | Bank IT will allow outbound HTTPS to Anthropic API | May require on-premise model or Anthropic Private Cloud |
| A04 | Document checkers will accept AI recommendations as a starting point | Resistance to AI; change management and training needed |
| A05 | PDF and image quality from document scanners is sufficient for AI extraction | Low-quality scans will degrade extraction accuracy |
| A06 | 5-minute processing time is acceptable to ops teams | If SLA is tighter, need caching or pre-processing |

---

## 8. Release Plan

### v1.0 — MVP ✅ (Complete)
**What's in it:** Full AI extraction + UCP 600 validation pipeline, web UI, CLI, REST API, audit log, demo mode.
**Who can use it:** Internal testing, demos to stakeholders, pilot with 1–2 checkers with API key.
**What's missing:** Auth, persistence, export, drag-drop, mobile.

---

### v1.1 — Production-Ready Core (~ 6 weeks from now)
**Theme:** Make it safe and polished enough for real bank operations.

- ✅ Authentication (JWT + SSO)
- ✅ Report export (PDF / CSV)
- ✅ Drag-and-drop upload
- ✅ Mobile-responsive layout
- ✅ Remove file button + file size display
- ✅ Expandable discrepancy rows
- ✅ Accessibility fixes (ARIA, keyboard nav, focus rings)

**Launch gate:** Pilot with 5 checkers at one business unit for 4 weeks. Target: ≥ 90% checker satisfaction, zero security findings.

---

### v1.2 — Operational Depth (~ 3 months from now)
**Theme:** Make it a real operations tool, not just a validator.

- ✅ PostgreSQL persistence (submission history, search)
- ✅ Checker notes + decision workflow (Accept / Refer / Reject)
- ✅ Notice of Refusal auto-draft
- ✅ Analytics dashboard (volume, top discrepancies)
- ✅ Toast notifications + skeleton loading

**Launch gate:** Full rollout to trade finance ops team. Target: 20+ active weekly users.

---

### v2.0 — Enterprise & Ecosystem (~ 6 months from now)
**Theme:** Become the platform, not just the tool.

- ✅ ISBP 745 rule coverage
- ✅ eUCP support for digital presentations
- ✅ Side-by-side document viewer
- ✅ Batch processing via ZIP upload
- ✅ Multi-user collaboration + comments
- ✅ Webhook API for fintech integrations
- ✅ LC amendment tracker
- ✅ Multi-language document support

---

## Appendix A — UCP 600 Articles Covered

| Article | Title | Key Validation |
|---------|-------|---------------|
| Art 14a | Examination — Time limit | Presentation ≤ 5 banking days; no post-expiry docs |
| Art 14b | Data consistency | No conflicting data across documents |
| Art 14e | Non-invoice goods description | General terms OK if not conflicting |
| Art 17 | Original documents | Exact originals count as required by LC |
| Art 18 | Commercial Invoice | Issuer, addressee, currency, amount ceiling, goods description |
| Art 20 | Bill of Lading | On-board date, ports, transshipment prohibition |
| Art 27 | Clean transport document | No defective-goods clauses on BL |
| Art 28 | Insurance document | 110% CIF min, currency, issue date ≤ BL date, risks |
| Art 29 | Expiry and presentation | All docs within expiry date |
| Art 31 | Partial shipments | Full qty shipped if partials prohibited |

**Not yet covered (roadmap):**
- Art 16 — Discrepant documents, waiver, and notice (drives Notice of Refusal generator)
- Art 19 — Transport document covering multiple modes
- Art 21 — Non-negotiable sea waybill
- Art 22 — Charter party BL
- Art 23 — Air transport document
- ISBP 745 — ICC banking practice guidelines

---

## Appendix B — Suggested Improvements Summary

### Immediate (before any production use)
1. **Add authentication** — JWT or SSO; no document should be accessible without login
2. **Rotate API key management** — Move to secrets manager (AWS Secrets Manager / Azure Key Vault), not `.env` file
3. **Add rate limiting** — Prevent abuse of the Anthropic API via the `/validate` endpoints
4. **Add input validation** — Reject files above size limit and unsupported MIME types before hitting AI

### Short-term UX wins (high impact, low effort)
5. **Drag-and-drop** on upload cards — industry standard expected by ops users
6. **Export to PDF** — checkers need to attach the report to their workflow system
7. **Expandable discrepancy rows** — table is dense; click-to-expand improves readability
8. **Highlight mismatched fields** in extracted fields panel — direct visual link from discrepancy → field
9. **Sort discrepancies FATAL → MINOR → ADVISORY** by default — most critical first

### Quality and reliability
10. **Streaming responses** — Stream AI output tokens to reduce perceived latency (30–60s → progressive feedback)
11. **Prompt caching** — Cache the UCP 600 system prompt to reduce Anthropic API cost and latency
12. **Retry logic** — Auto-retry failed AI calls with exponential backoff
13. **Extraction confidence score** — Ask Claude to return a confidence rating per extracted field; flag low-confidence fields for human review
14. **Human-in-the-loop fallback** — If extraction fails for a document, allow checker to manually enter key fields

### Compliance and audit
15. **Immutable audit log** — Move from file-based to database-backed audit log with tamper detection
16. **Decision record** — Capture checker's final decision (Accept / Reject) and timestamp separately from AI recommendation
17. **Data retention policy** — Define how long validation records and document content are stored

### AI accuracy
18. **Fine-tuned evaluation set** — Build a test suite of 50+ real document sets with known discrepancies to measure AI accuracy over time
19. **Discrepancy feedback loop** — Allow checkers to mark AI findings as correct / incorrect; feed corrections back to improve prompts
20. **Hallucination guardrails** — Add post-processing to verify AI-cited field values actually appear in extracted text

---

*This PRD is a living document. Update the Change Log in design.md and bump the version number each time a section changes.*
