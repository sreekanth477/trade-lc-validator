#!/usr/bin/env node
// Improvements: #9 (sort by severity), #13 (confidence), #18 (eval set), mock mode
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { runValidationPipeline } from './agents/orchestrator.js';
import { formatCliReport } from './utils/report.js';

// ── Demo documents ────────────────────────────────────────────────────────
const DEMO_DOCUMENTS = [
  {
    type: 'lc', filename: 'LC-2024-HBK-00847.txt', mediaType: 'text/plain',
    content: `LETTER OF CREDIT
LC Number: LC-2024-HBK-00847
Issuing Bank: Hyderabad Bank of Commerce, Hyderabad, India
APPLICANT: Global Tech Imports Pvt Ltd, Plot 42, HITEC City, Hyderabad 500081, India
BENEFICIARY: Shanghai Electronics Co. Ltd, No. 88 Pudong Avenue, Shanghai 200120, China
LC Amount: USD 285,000.00
Expiry Date: 15 March 2025
Latest Shipment Date: 28 February 2025
Port of Loading: Shanghai, China
Port of Discharge: Nhava Sheva, Mumbai, India
Partial Shipments: NOT ALLOWED
Transshipment: NOT ALLOWED
Goods: Electronic Components and PCB Assemblies as per Proforma Invoice PI-2024-0091
Incoterms: CIF Nhava Sheva
Documents Required:
1. Commercial Invoice: 3 Originals — issued by beneficiary, addressed to applicant, USD
2. Full Set Clean On Board BL — consigned to Order of Hyderabad Bank of Commerce
3. Insurance Certificate: 110% CIF, ICC(A), issued not later than shipment date`
  },
  {
    type: 'invoice', filename: 'INV-SE-20250215.txt', mediaType: 'text/plain',
    content: `COMMERCIAL INVOICE
Invoice Number: INV-SE-20250215
Date: 20 February 2025
Seller: Shanghai Electronics Co. Ltd, No. 88 Pudong Avenue, Shanghai 200120, China
Buyer: Global Tech Imports Pvt Ltd, Plot 42, HITEC City, Hyderabad 500081, India
LC Reference: LC-2024-HBK-00847
Goods: Electronic Components, PCB Assemblies, and Miscellaneous Hardware
Amount: USD 284,500.00
Currency: USD
Country of Origin: China
Incoterms: CIF Nhava Sheva
Number of Originals: 2
Number of Copies: 3`
  },
  {
    type: 'bl', filename: 'BL-COSCO-20250222.txt', mediaType: 'text/plain',
    content: `BILL OF LADING
BL Number: BL-COSCO-20250222
Carrier: COSCO SHIPPING Lines Co., Ltd.
Shipper: Shanghai Electronics Co. Ltd
Consignee: TO ORDER OF HYDERABAD BANK OF COMMERCE
Notify: Global Tech Imports Pvt Ltd, Hyderabad, India
Vessel: COSCO PACIFIC / Voyage 024E
Port of Loading: Shanghai, China
Port of Discharge: Nhava Sheva, Mumbai, India
Transshipment Port: Singapore (via PSA Singapore Terminal)
On Board Date: 22 February 2025
Clean on Board
Goods: Electronic Components and PCB Assemblies
Originals Issued: 3/3
Note: This shipment will be transshipped at Singapore.`
  },
  {
    type: 'insurance', filename: 'IC-PICC-20250221.txt', mediaType: 'text/plain',
    content: `INSURANCE CERTIFICATE
Certificate: IC-PICC-20250221
Date of Issue: 23 February 2025
Insurer: PICC Property and Casualty Company Limited
Insured: Shanghai Electronics Co. Ltd
Coverage: USD 313,500.00 (110% of USD 284,500.00)
Currency: USD
Type: Institute Cargo Clauses (A)
Goods: Electronic Components and PCB Assemblies
From: Shanghai, China  To: Nhava Sheva, Mumbai, India`
  }
];

// ── Improvement #18: Evaluation set ──────────────────────────────────────
const EVAL_SCENARIOS = [
  {
    name: 'Fully compliant set',
    expectedRecommendation: 'ACCEPT',
    expectedFatalCount: 0,
    documents: [
      {
        type: 'lc', filename: 'lc-clean.txt', mediaType: 'text/plain',
        content: `LC Number: LC-EVAL-001\nIssuing Bank: Test Bank\nApplicant: Test Buyer, London, UK\nBeneficiary: Test Seller, Paris, France\nAmount: EUR 50,000.00\nExpiry: 30 June 2025\nLatest Shipment: 15 June 2025\nPort of Loading: Paris, France\nPort of Discharge: London, UK\nPartial Shipments: ALLOWED\nTransshipment: ALLOWED\nGoods: Industrial Machinery\nIncoterms: CIF London\nDocuments: 1 Original Invoice, 1 Original BL, Insurance 110% CIF ICC(A)`
      },
      {
        type: 'invoice', filename: 'inv-clean.txt', mediaType: 'text/plain',
        content: `Invoice: INV-EVAL-001\nDate: 10 June 2025\nSeller: Test Seller, Paris, France\nBuyer: Test Buyer, London, UK\nLC Ref: LC-EVAL-001\nGoods: Industrial Machinery\nAmount: EUR 50,000.00\nCurrency: EUR\nOriginals: 1`
      },
      {
        type: 'bl', filename: 'bl-clean.txt', mediaType: 'text/plain',
        content: `BL: BL-EVAL-001\nCarrier: Test Carrier\nShipper: Test Seller\nConsignee: Test Buyer\nPort of Loading: Paris, France\nPort of Discharge: London, UK\nOn Board: 10 June 2025\nClean on Board\nGoods: Industrial Machinery\nOriginals: 1/1`
      },
      {
        type: 'insurance', filename: 'ins-clean.txt', mediaType: 'text/plain',
        content: `Certificate: INS-EVAL-001\nIssued: 9 June 2025\nInsurer: Eval Insurance Co.\nInsured: Test Seller\nCoverage: EUR 55,000.00 (110% of 50,000)\nCurrency: EUR\nType: Institute Cargo Clauses (A)\nGoods: Industrial Machinery\nFrom: Paris, France  To: London, UK`
      }
    ]
  }
];

// ── Mock result (used when no API key is present) ─────────────────────────
function buildMockResult() {
  return {
    submissionId: 'mock-' + uuidv4(),
    status: 'COMPLETED',
    presentedDate: new Date().toISOString().split('T')[0],
    processedAt: new Date().toISOString(),
    durationMs: 8423,
    documentTypes: ['lc', 'invoice', 'bl', 'insurance'],
    extractedFields: {
      lc: { lc_number: 'LC-2024-HBK-00847', lc_amount: '285,000.00', lc_currency: 'USD', transshipment: 'NOT ALLOWED', confidence: {} },
      invoice: { invoice_number: 'INV-SE-20250215', amount: '284,500.00', originals_count: '2', confidence: {} },
      bl: { bl_number: 'BL-COSCO-20250222', transshipment_port: 'Singapore', on_board_date: '22 February 2025', confidence: {} },
      insurance: { certificate_number: 'IC-PICC-20250221', issue_date: '23 February 2025', confidence: {} }
    },
    docsNeedingManualEntry: [],
    validation: {
      validation_result: 'NON_COMPLIANT',
      recommendation: 'REJECT',
      discrepancies: [
        { id: 'D001', severity: 'FATAL', document: 'INVOICE', field: 'amount', lc_requirement: 'USD 285,000.00', found_value: 'USD 284,500.00', ucp_article: 'UCP 600 Article 18', description: 'Invoice amount does not match LC amount.', remediation: 'Issue revised invoice for USD 285,000.00 or obtain LC amendment.' },
        { id: 'D002', severity: 'FATAL', document: 'INVOICE', field: 'originals_count', lc_requirement: '3 Originals', found_value: '2 Originals', ucp_article: 'UCP 600 Article 17 / Article 18', description: 'Only 2 originals presented; LC requires 3.', remediation: 'Present the third original invoice before LC expiry.' },
        { id: 'D003', severity: 'FATAL', document: 'BL', field: 'transshipment_port', lc_requirement: 'Transshipment: NOT ALLOWED', found_value: 'Transshipment via Singapore', ucp_article: 'UCP 600 Article 20', description: 'BL shows transshipment at Singapore; LC prohibits transshipment.', remediation: 'Arrange direct shipment or obtain LC amendment permitting transshipment.' },
        { id: 'D004', severity: 'FATAL', document: 'INSURANCE', field: 'issue_date', lc_requirement: 'Issue date ≤ BL on-board date (22 Feb 2025)', found_value: '23 February 2025', ucp_article: 'UCP 600 Article 28', description: 'Insurance issued after BL on-board date.', remediation: 'Request re-issued insurance certificate dated on or before 22 February 2025.' },
        { id: 'D005', severity: 'MINOR', document: 'INVOICE', field: 'goods_description', lc_requirement: 'Electronic Components and PCB Assemblies', found_value: 'Electronic Components, PCB Assemblies, and Miscellaneous Hardware', ucp_article: 'UCP 600 Article 18', description: 'Invoice adds "Miscellaneous Hardware" not in LC goods description.', remediation: 'Revise invoice goods description to match LC exactly.' }
      ],
      compliance_checks: { invoice_vs_lc: 'FAIL', bl_vs_lc: 'FAIL', insurance_vs_lc: 'FAIL', cross_document_consistency: 'PARTIAL', document_set_completeness: 'PARTIAL', dates_compliance: 'FAIL' },
      summary_notes: 'Four fatal discrepancies: invoice amount, missing original, prohibited transshipment, insurance after shipment.',
      checker_recommendation: 'Issue Notice of Refusal citing all four FATAL discrepancies per UCP 600 Article 16.',
      summary: { totalDiscrepancies: 5, fatalCount: 4, minorCount: 1, advisoryCount: 0, guardrailFlagCount: 0 }
    }
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--demo') args.demo = true;
    else if (argv[i] === '--mock') args.mock = true;
    else if (argv[i] === '--eval') args.eval = true;
    else if (['--lc','--invoice','--bl','--insurance'].includes(argv[i])) {
      args[argv[i].replace('--', '')] = argv[++i];
    }
  }
  return args;
}

function detectMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }[ext] || 'text/plain';
}

async function runEval() {
  console.log('\n=== EVALUATION SET RUN ===\n');
  let passed = 0;
  for (const scenario of EVAL_SCENARIOS) {
    console.log(`Scenario: ${scenario.name}`);
    try {
      const result = await runValidationPipeline(scenario.documents, { presentedDate: new Date().toISOString().split('T')[0] });
      const recMatch = result.validation.recommendation === scenario.expectedRecommendation;
      const fatalMatch = result.validation.summary.fatalCount === scenario.expectedFatalCount;
      const ok = recMatch && fatalMatch;
      console.log(`  Result: ${ok ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`  Recommendation: ${result.validation.recommendation} (expected: ${scenario.expectedRecommendation}) ${recMatch ? '✅' : '❌'}`);
      console.log(`  Fatal count: ${result.validation.summary.fatalCount} (expected: ${scenario.expectedFatalCount}) ${fatalMatch ? '✅' : '❌'}`);
      if (ok) passed++;
    } catch (err) {
      console.log(`  ❌ ERROR: ${err.message}`);
    }
    console.log('');
  }
  console.log(`=== ${passed}/${EVAL_SCENARIOS.length} scenarios passed ===\n`);
  process.exit(passed === EVAL_SCENARIOS.length ? 0 : 1);
}

async function main() {
  const args = parseArgs(process.argv);

  // Mock mode
  if (args.mock || (args.demo && !process.env.ANTHROPIC_API_KEY)) {
    if (!args.mock) console.log('\n[MOCK MODE] ANTHROPIC_API_KEY not set.\n');
    console.log(formatCliReport(buildMockResult()));
    process.exit(1);
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY is not set.');
    process.exit(1);
  }

  if (args.eval) return runEval();

  let documents = [];
  if (args.demo) {
    console.log('\nRunning DEMO validation...\n');
    documents = DEMO_DOCUMENTS;
  } else {
    for (const type of ['lc', 'invoice', 'bl', 'insurance']) {
      const fp = args[type];
      if (!fp) continue;
      if (!fs.existsSync(fp)) { console.error(`File not found: ${fp}`); process.exit(1); }
      const mime = detectMime(fp);
      const content = mime === 'text/plain' ? fs.readFileSync(fp, 'utf8') : fs.readFileSync(fp).toString('base64');
      documents.push({ type, filename: path.basename(fp), mediaType: mime, content });
    }
    if (!documents.length) {
      console.error('Usage: node src/cli.js --demo\n       node src/cli.js --lc <file> [--invoice <file>] [--bl <file>] [--insurance <file>]');
      process.exit(1);
    }
  }

  try {
    const result = await runValidationPipeline(documents, {
      presentedDate: new Date().toISOString().split('T')[0],
      requestedBy: 'cli'
    });
    console.log(formatCliReport(result));
    process.exit(result.validation?.recommendation === 'REJECT' ? 1 : 0);
  } catch (err) {
    console.error('\nERROR:', err.message);
    process.exit(1);
  }
}

main();
