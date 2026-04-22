// Improvements applied:
//   #11 — Prompt caching on system prompt
//   #12 — Retry logic
//   #20 — Hallucination guardrails (verify cited values appear in extracted data)
import Anthropic from '@anthropic-ai/sdk';
import { UCP600_SYSTEM_PROMPT } from '../prompts/ucp600.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const model = process.env.CLAUDE_MODEL || 'claude-opus-4-5';

const VALIDATION_SCHEMA = `{
  "validation_result": "COMPLIANT | NON_COMPLIANT | CONDITIONAL",
  "recommendation": "ACCEPT | REJECT | CONDITIONAL_ACCEPTANCE",
  "discrepancies": [
    {
      "id": "D001",
      "severity": "FATAL | MINOR | ADVISORY",
      "document": "LC | INVOICE | BL | INSURANCE",
      "field": "",
      "lc_requirement": "",
      "found_value": "",
      "ucp_article": "UCP 600 Article XX",
      "description": "",
      "remediation": ""
    }
  ],
  "compliance_checks": {
    "invoice_vs_lc": "PASS | FAIL | PARTIAL",
    "bl_vs_lc": "PASS | FAIL | PARTIAL",
    "insurance_vs_lc": "PASS | FAIL | PARTIAL",
    "cross_document_consistency": "PASS | FAIL | PARTIAL",
    "document_set_completeness": "PASS | FAIL | PARTIAL",
    "dates_compliance": "PASS | FAIL | PARTIAL"
  },
  "summary_notes": "",
  "checker_recommendation": ""
}`;

// ── #20 Hallucination guardrail ────────────────────────────────────────────
// Verifies each discrepancy's found_value actually appears somewhere in the
// extracted data. Flags any that cannot be verified.
function applyHallucinationGuardrails(discrepancies, extractedFields) {
  const allText = JSON.stringify(extractedFields).toLowerCase();

  return discrepancies.map(d => {
    if (!d.found_value || d.found_value === 'N/A' || d.found_value === '') return d;

    const normalised = d.found_value.toLowerCase().replace(/[,\s]+/g, '');
    const appears = allText.replace(/[,\s]+/g, '').includes(normalised) ||
      allText.includes(d.found_value.toLowerCase().slice(0, 10));

    return appears
      ? d
      : { ...d, _guardrail_flag: true, _guardrail_note: 'found_value could not be verified in extracted data — review manually' };
  });
}

// ── Streaming validation (Improvement #10) ────────────────────────────────
// Used by the streaming SSE endpoint. Yields raw text chunks as they arrive.
export async function* streamValidation(extractedFields, submissionMeta) {
  const systemPrompt = `${UCP600_SYSTEM_PROMPT}\n\nReturn ONLY valid JSON matching this schema:\n${VALIDATION_SCHEMA}`;
  const userPrompt = buildUserPrompt(extractedFields, submissionMeta);

  const stream = client.messages.stream({
    model,
    max_tokens: 4096,
    // #11 cache the system prompt — it never changes between requests
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }]
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
      yield chunk.delta.text;
    }
  }
}

function buildUserPrompt(extractedFields, submissionMeta) {
  return `Validate the following extracted trade finance document data for UCP 600 compliance.

Submission Metadata:
${JSON.stringify(submissionMeta, null, 2)}

Extracted Document Fields:
${JSON.stringify(extractedFields, null, 2)}

Instructions:
1. Compare each document against LC requirements
2. Check all UCP 600 articles
3. For each discrepancy, quote the EXACT value found in the extracted data above — do not paraphrase
4. Assign correct severity (FATAL/MINOR/ADVISORY)
5. Reference the specific UCP 600 article
6. Return ONLY valid JSON — no markdown, no explanatory text`;
}

export async function validateCompliance(extractedFields, submissionMeta) {
  logger.info('Starting UCP 600 compliance validation', { submissionId: submissionMeta?.submissionId });

  const systemPrompt = `${UCP600_SYSTEM_PROMPT}\n\nReturn ONLY valid JSON matching this schema:\n${VALIDATION_SCHEMA}`;

  const raw = await withRetry(
    async () => {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: buildUserPrompt(extractedFields, submissionMeta) }]
      });
      return response.content[0]?.text || '{}';
    },
    { retries: 3, baseDelayMs: 2000, label: 'validation' }
  );

  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    logger.error('Failed to parse validation JSON', { error: err.message });
    throw new Error(`Validation JSON parse failed: ${err.message}`);
  }

  // #20 Apply hallucination guardrails
  if (Array.isArray(parsed.discrepancies)) {
    parsed.discrepancies = applyHallucinationGuardrails(parsed.discrepancies, extractedFields);
    const flagged = parsed.discrepancies.filter(d => d._guardrail_flag).length;
    if (flagged > 0) {
      logger.warn(`Hallucination guardrail flagged ${flagged} discrepancy/ies for manual review`);
    }
  }

  const discrepancies = parsed.discrepancies || [];
  parsed.summary = {
    totalDiscrepancies: discrepancies.length,
    fatalCount: discrepancies.filter(d => d.severity === 'FATAL').length,
    minorCount: discrepancies.filter(d => d.severity === 'MINOR').length,
    advisoryCount: discrepancies.filter(d => d.severity === 'ADVISORY').length,
    guardrailFlagCount: discrepancies.filter(d => d._guardrail_flag).length
  };

  logger.info('Validation completed', {
    result: parsed.validation_result,
    recommendation: parsed.recommendation,
    ...parsed.summary
  });

  return parsed;
}
