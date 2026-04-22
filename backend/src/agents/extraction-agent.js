// Improvements applied:
//   #11 — Prompt caching (cache_control on system/instruction blocks)
//   #12 — Retry logic via withRetry()
//   #13 — Confidence scores per extracted field
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const model = process.env.CLAUDE_MODEL || 'claude-opus-4-5';

// ── #11 Prompt caching: extraction instructions are identical every call,
//    so we mark them with cache_control to reuse the KV cache.
const EXTRACTION_INSTRUCTIONS = {
  lc: `Extract all fields from this Letter of Credit. Return ONLY valid JSON — no markdown, no preamble.
Include a "confidence" object mapping each field name to HIGH, MEDIUM, or LOW based on how clearly the value appeared in the document.
{
  "lc_number": "", "issuing_bank": "", "applicant_name": "", "applicant_address": "",
  "beneficiary_name": "", "beneficiary_address": "", "lc_amount": "", "lc_currency": "",
  "expiry_date": "", "latest_shipment_date": "", "port_of_loading": "", "port_of_discharge": "",
  "partial_shipments": "", "transshipment": "", "goods_description": "",
  "documents_required": [], "incoterms": "",
  "confidence": {}
}`,

  invoice: `Extract all fields from this Commercial Invoice. Return ONLY valid JSON — no markdown, no preamble.
Include a "confidence" object mapping each field name to HIGH, MEDIUM, or LOW.
{
  "invoice_number": "", "invoice_date": "", "seller_name": "", "buyer_name": "",
  "lc_reference": "", "amount": "", "currency": "", "goods_description": "",
  "quantity": "", "originals_count": "", "incoterms": "", "country_of_origin": "",
  "confidence": {}
}`,

  bl: `Extract all fields from this Bill of Lading. Return ONLY valid JSON — no markdown, no preamble.
Include a "confidence" object mapping each field name to HIGH, MEDIUM, or LOW.
{
  "bl_number": "", "shipper": "", "consignee": "", "notify_party": "", "carrier": "",
  "vessel_name": "", "voyage_number": "", "port_of_loading": "", "port_of_discharge": "",
  "on_board_date": "", "goods_description": "", "quantity_packages": "",
  "transshipment_port": "", "clean_notation": "", "originals_issued": "",
  "confidence": {}
}`,

  insurance: `Extract all fields from this Insurance Certificate. Return ONLY valid JSON — no markdown, no preamble.
Include a "confidence" object mapping each field name to HIGH, MEDIUM, or LOW.
{
  "certificate_number": "", "insurer": "", "insured_party": "", "issue_date": "",
  "coverage_amount": "", "currency": "", "coverage_type": "", "goods_description": "",
  "voyage_from": "", "voyage_to": "",
  "confidence": {}
}`
};

function buildContentBlocks(document) {
  const { type, content, mediaType, filename } = document;
  const blocks = [];

  if (mediaType === 'application/pdf') {
    blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: content } });
  } else if (mediaType && mediaType.startsWith('image/')) {
    blocks.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: content } });
  } else {
    blocks.push({ type: 'text', text: `Filename: ${filename || 'unknown'}\nType: ${type}\n\nContent:\n${content}` });
  }

  // #11 cache_control: mark the instruction block as cacheable
  blocks.push({
    type: 'text',
    text: EXTRACTION_INSTRUCTIONS[type] || `Extract all fields from this ${type} document and return ONLY valid JSON.`,
    cache_control: { type: 'ephemeral' }
  });

  return blocks;
}

export async function extractDocumentFields(document) {
  const { type, filename } = document;
  logger.info(`Extracting fields from ${type}`, { filename });

  const raw = await withRetry(
    async () => {
      const response = await client.messages.create({
        model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: buildContentBlocks(document) }]
      });
      return response.content[0]?.text || '{}';
    },
    { retries: 3, baseDelayMs: 1000, label: `extraction:${type}` }
  );

  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    logger.info(`Extracted ${type} fields successfully`, { filename, confidence: parsed.confidence });
    return parsed;
  } catch (err) {
    logger.error(`Failed to parse ${type} extraction JSON`, { error: err.message });
    throw new Error(`JSON parse failed for ${type}: ${err.message}`);
  }
}

export async function extractAllDocuments(documents) {
  logger.info(`Parallel extraction for ${documents.length} document(s)`);

  const results = await Promise.allSettled(
    documents.map(doc => extractDocumentFields(doc).then(fields => ({ type: doc.type, fields })))
  );

  const extractedFields = {};
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      extractedFields[result.value.type] = result.value.fields;
    } else {
      const type = documents[i]?.type || 'unknown';
      logger.error(`Extraction failed for ${type}`, { error: result.reason?.message });
      extractedFields[type] = { error: result.reason?.message || 'Extraction failed', needsManualEntry: true };
    }
  });

  return extractedFields;
}
