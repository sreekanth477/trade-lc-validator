# Trade LC Validator — Design Progress

## Overview
Tracking UI/UX design changes and improvements for the Trade LC Validator frontend.

---

## Status Legend
| Symbol | Meaning |
|--------|---------|
| ✅ | Completed |
| 🔄 | In Progress |
| 🔲 | Planned |
| ❌ | Blocked |

---

## Phase 1 — Initial Build ✅
> Baseline implementation shipped with the MVP scaffold.

| # | Component | Description | Status |
|---|-----------|-------------|--------|
| 1.1 | App shell | Single-page layout with header, main, footer | ✅ |
| 1.2 | Header bar | Logo, title, "Powered by Claude AI" badge | ✅ |
| 1.3 | Upload zone | 2×2 card grid for LC / Invoice / BL / Insurance | ✅ |
| 1.4 | File picker | Click-to-select with filename feedback, accepts PDF/PNG/JPG/TXT | ✅ |
| 1.5 | Action buttons | "Validate Documents" (gated on LC) + "Run Demo" | ✅ |
| 1.6 | Loading state | Spinner + status message while AI processes | ✅ |
| 1.7 | Summary banner | ACCEPT / REJECT / CONDITIONAL badge + Fatal/Minor/Advisory counts | ✅ |
| 1.8 | Compliance checks grid | 6 checks with PASS/FAIL/PARTIAL badges | ✅ |
| 1.9 | Discrepancy table | Severity-colour-coded rows, UCP rule references | ✅ |
| 1.10 | Extracted fields panel | Tabbed view (LC / INV / BL / INS) with key-value grid | ✅ |
| 1.11 | Summary & notes | Summary notes + checker recommendation blocks | ✅ |
| 1.12 | Error state | Error message with retry button | ✅ |
| 1.13 | Reset flow | "New Validation" button returns to idle state | ✅ |

---

## Phase 2 — Design Improvements 🔲
> Planned visual polish and UX enhancements.

### 2.1 Layout & Spacing
| # | Item | Notes | Status |
|---|------|-------|--------|
| 2.1.1 | Responsive breakpoints | Mobile (< 768px), Tablet (768–1024px), Desktop | 🔲 |
| 2.1.2 | Upload grid — stack to 1 col on mobile | Currently fixed 2-col | 🔲 |
| 2.1.3 | Compliance checks grid — 2-col on tablet | Currently 3-col fixed | 🔲 |
| 2.1.4 | Consistent section padding | Audit 24px / 32px / 40px rhythm | 🔲 |

### 2.2 Upload Zone
| # | Item | Notes | Status |
|---|------|-------|--------|
| 2.2.1 | Drag-and-drop support | Add dragover/drop event handlers | 🔲 |
| 2.2.2 | File size indicator | Show KB/MB next to filename | 🔲 |
| 2.2.3 | Remove file button | × icon to clear a selected file | 🔲 |
| 2.2.4 | File type icon | PDF / image / text icon in card | 🔲 |
| 2.2.5 | Upload progress bar | Visual feedback during large file upload | 🔲 |

### 2.3 Results — Summary Banner
| # | Item | Notes | Status |
|---|------|-------|--------|
| 2.3.1 | Animated entry | Slide-in or fade-in on load | 🔲 |
| 2.3.2 | Submission metadata collapse | Collapsible meta row (ID, timestamp, duration) | 🔲 |
| 2.3.3 | Print / Export button | Download report as PDF or CSV | 🔲 |

### 2.4 Discrepancy Table
| # | Item | Notes | Status |
|---|------|-------|--------|
| 2.4.1 | Expandable row detail | Click row to expand full description + remediation | 🔲 |
| 2.4.2 | Sort by severity | Default FATAL → MINOR → ADVISORY | 🔲 |
| 2.4.3 | Filter by document type | Dropdown: All / LC / Invoice / BL / Insurance | 🔲 |
| 2.4.4 | Severity icon in badge | ❌ / ⚠️ / ℹ️ prefix in badge | 🔲 |

### 2.5 Extracted Fields Panel
| # | Item | Notes | Status |
|---|------|-------|--------|
| 2.5.1 | Highlight mismatched fields | Red border/background on fields flagged in discrepancies | 🔲 |
| 2.5.2 | Copy field value button | Clipboard icon per field | 🔲 |
| 2.5.3 | Empty field suppression toggle | Hide / show blank fields | 🔲 |

### 2.6 Colour & Typography
| # | Item | Notes | Status |
|---|------|-------|--------|
| 2.6.1 | Design token audit | Consolidate palette into CSS custom properties (`:root`) | 🔲 |
| 2.6.2 | Dark mode support | `prefers-color-scheme: dark` media query | 🔲 |
| 2.6.3 | Font scale review | Base 14px → 15px for body, 13px for labels | 🔲 |
| 2.6.4 | Focus ring styles | Accessible keyboard-navigation focus indicators | 🔲 |

### 2.7 Accessibility (a11y)
| # | Item | Notes | Status |
|---|------|-------|--------|
| 2.7.1 | ARIA labels on upload cards | `aria-label`, `role="button"` | 🔲 |
| 2.7.2 | Live region for results | `aria-live="polite"` on result section | 🔲 |
| 2.7.3 | Table `<caption>` and `scope` | Semantic table headers | 🔲 |
| 2.7.4 | Colour-not-only indicators | Ensure severity not conveyed by colour alone | 🔲 |
| 2.7.5 | Keyboard-navigable tabs | Arrow-key navigation in extracted fields tabs | 🔲 |

---

## Phase 3 — Advanced Features 🔲
> Post-MVP enhancements.

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 3.1 | Multi-document set history | In-session list of past submissions | 🔲 |
| 3.2 | Side-by-side document view | LC on left, flagged document on right | 🔲 |
| 3.3 | Animated compliance score ring | Donut chart showing overall compliance % | 🔲 |
| 3.4 | Notification toast system | Success / error toasts replacing inline states | 🔲 |
| 3.5 | Skeleton loading screens | Skeleton placeholders while AI extracts | 🔲 |
| 3.6 | PDF inline preview | Render uploaded PDF pages in-browser | 🔲 |

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-04-22 | Initial | Created design.md, logged Phase 1 as complete |

---

## Notes & Decisions

- **No external UI library** — all styles in plain JS-in-CSS (`styles` objects in each component). Keeps the bundle lean and avoids Tailwind/MUI churn.
- **Color palette**: `#0d2137` (navy header), `#1a5276` (primary), `#27ae60` (pass/accept green), `#e74c3c` (fatal/reject red), `#f39c12` (minor/warning amber).
- **Font**: `system-ui` stack — no Google Fonts import, loads instantly in a bank intranet.
- **State machine**: `idle → validating → result | error` — keeps App.jsx simple and predictable.
