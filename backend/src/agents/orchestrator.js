import { v4 as uuidv4 } from 'uuid';
import { extractAllDocuments } from './extraction-agent.js';
import { validateCompliance } from './validation-agent.js';
import { logger, auditLog } from '../utils/logger.js';

export async function runValidationPipeline(documents, options = {}) {
  const { presentedDate, requestedBy } = options;
  const submissionId = uuidv4();
  const startTime = Date.now();

  auditLog({ event: 'VALIDATION_STARTED', submissionId, requestedBy: requestedBy || 'api',
    presentedDate, documentTypes: documents.map(d => d.type) });

  if (!documents.some(d => d.type === 'lc')) {
    const err = new Error('Letter of Credit (LC) document is required.');
    auditLog({ event: 'VALIDATION_FAILED', submissionId, error: err.message });
    throw err;
  }

  let extractedFields, validationResult;
  try {
    extractedFields = await extractAllDocuments(documents);
    validationResult = await validateCompliance(extractedFields, { submissionId, presentedDate });

    auditLog({
      event: 'VALIDATION_COMPLETED', submissionId,
      recommendation: validationResult.recommendation,
      validation_result: validationResult.validation_result,
      ...validationResult.summary,
      durationMs: Date.now() - startTime
    });
  } catch (err) {
    auditLog({ event: 'VALIDATION_FAILED', submissionId, error: err.message, durationMs: Date.now() - startTime });
    throw err;
  }

  // Flag docs that need manual entry (#14)
  const docsNeedingManualEntry = Object.entries(extractedFields)
    .filter(([, v]) => v?.needsManualEntry)
    .map(([type]) => type);

  return {
    submissionId,
    status: 'COMPLETED',
    presentedDate: presentedDate || null,
    processedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    documentTypes: documents.map(d => d.type),
    extractedFields,
    docsNeedingManualEntry,
    validation: validationResult
  };
}
