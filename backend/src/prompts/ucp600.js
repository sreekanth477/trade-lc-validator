export const UCP600_RULES = [
  {
    article: "Art 14a",
    title: "Standard for Examination – Time Limit",
    rule: "Banks have a maximum of five banking days following the day of presentation to determine compliance.",
    checkpoints: [
      "Presentation date must be on or before expiry date",
      "Determination of compliance within 5 banking days",
      "Documents presented after expiry are non-compliant"
    ]
  },
  {
    article: "Art 14b",
    title: "Data Consistency Across Documents",
    rule: "Data need not be identical but must not conflict with data in any other stipulated document or the credit.",
    checkpoints: [
      "Beneficiary name consistent across all documents",
      "Applicant name consistent across all documents",
      "Goods description must not conflict across documents",
      "Port of loading/discharge consistent with LC",
      "Currency must not conflict",
      "Amounts must not conflict (except invoice vs LC ceiling)"
    ]
  },
  {
    article: "Art 14e",
    title: "Goods Description in Non-Invoice Documents",
    rule: "In documents other than the commercial invoice, goods description may be in general terms not conflicting with the credit.",
    checkpoints: [
      "Non-invoice documents may use general goods descriptions",
      "General descriptions must not conflict with LC goods description"
    ]
  },
  {
    article: "Art 17",
    title: "Original Documents",
    rule: "At least one original of each stipulated document must be presented. If multiples required, exact count must match.",
    checkpoints: [
      "At least one original of each stipulated document required",
      "If LC requires 3 originals, exactly 3 must be presented"
    ]
  },
  {
    article: "Art 18",
    title: "Commercial Invoice",
    rule: "Invoice must be issued by beneficiary, addressed to applicant, in same currency, goods description must correspond with LC, amount must not exceed LC amount.",
    checkpoints: [
      "Invoice must be issued by beneficiary",
      "Invoice must be addressed to applicant",
      "Invoice currency must match LC currency",
      "Goods description must correspond exactly with LC",
      "Invoice amount must not exceed LC amount",
      "Number of originals must match LC requirement"
    ]
  },
  {
    article: "Art 20",
    title: "Bill of Lading",
    rule: "BL must show on-board notation with date, ports matching LC. If transshipment prohibited, BL must not show transshipment. Must be clean.",
    checkpoints: [
      "On-board notation with date required",
      "On-board date on or before latest shipment date",
      "Port of loading must match LC exactly",
      "Port of discharge must match LC exactly",
      "If transshipment prohibited, BL must not show transshipment",
      "BL must be clean"
    ]
  },
  {
    article: "Art 27",
    title: "Clean Transport Document",
    rule: "No clauses noting defective condition of goods or packaging.",
    checkpoints: [
      "No clauses noting defective goods",
      "No clauses noting defective packaging"
    ]
  },
  {
    article: "Art 28",
    title: "Insurance Document",
    rule: "Minimum 110% of CIF value, same currency as LC, issue date not later than BL date, must cover risks stipulated in LC.",
    checkpoints: [
      "Minimum coverage 110% of CIF/CIP value",
      "Insurance currency must match LC currency",
      "Issue date must not be later than BL on-board date",
      "Coverage type must match LC stipulation"
    ]
  },
  {
    article: "Art 29",
    title: "Expiry Date and Presentation",
    rule: "Presentation must be on or before expiry date.",
    checkpoints: [
      "All documents presented on or before LC expiry date"
    ]
  },
  {
    article: "Art 31",
    title: "Partial Drawings or Shipments",
    rule: "If partial shipments not allowed, full quantity must ship in a single consignment.",
    checkpoints: [
      "If partial shipments prohibited, full quantity in one consignment",
      "Single BL must cover entire LC quantity"
    ]
  }
];

export const UCP600_SYSTEM_PROMPT = `You are a senior Trade Finance document checker specialising in UCP 600 compliance.

UCP 600 VALIDATION RULES:

1. ART 14a – EXAMINATION TIME & EXPIRY
   - Presentation date must be on or before LC expiry date (FATAL if not)

2. ART 14b – DATA CONSISTENCY
   - Data across documents need not be identical but must not conflict
   - Beneficiary/applicant names, ports, currency must be consistent

3. ART 14e – NON-INVOICE GOODS DESCRIPTION
   - BL, Insurance etc. may use general terms; must not conflict with LC

4. ART 17 – ORIGINAL DOCUMENTS
   - Exact originals count as required by LC; shortfall is FATAL

5. ART 18 – COMMERCIAL INVOICE
   - Issued by beneficiary, addressed to applicant, same currency as LC
   - Goods description must correspond with LC
   - Amount must NOT exceed LC amount
   - Originals count must match LC requirement

6. ART 20 – BILL OF LADING
   - On-board notation with date required
   - On-board date on or before latest shipment date
   - Port of loading and discharge must match LC exactly
   - If transshipment prohibited: BL must NOT mention transshipment

7. ART 27 – CLEAN TRANSPORT DOCUMENT
   - No clauses noting defective goods or packaging

8. ART 28 – INSURANCE
   - Minimum 110% of CIF value; same currency as LC
   - Issue date must NOT be later than BL on-board date
   - Must cover risks stipulated in LC

9. ART 29 – PRESENTATION EXPIRY
   - All documents presented on or before expiry date

10. ART 31 – PARTIAL SHIPMENTS
    - If prohibited, full quantity in one consignment

SEVERITY:
- FATAL: causes document refusal — amount over LC, missing originals, prohibited transshipment, insurance after BL date, post-expiry presentation
- MINOR: correctable — minor description variations, missing non-critical fields
- ADVISORY: best-practice warnings

IMPORTANT: For each discrepancy, quote the EXACT values you found in the documents — do not paraphrase. Only cite field values that actually appear in the extracted data.

Return structured JSON only. No markdown. No preamble.`;
