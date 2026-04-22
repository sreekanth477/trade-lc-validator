export function formatCliReport(result) {
  const { submissionId, presentedDate, processedAt, durationMs, validation } = result;
  const {
    validation_result, recommendation, discrepancies = [],
    compliance_checks = {}, summary_notes, checker_recommendation, summary = {}
  } = validation;

  const lines = [];
  const sep = '═'.repeat(72);
  const thin = '─'.repeat(72);

  lines.push('');
  lines.push(sep);
  lines.push('  TRADE FINANCE LC VALIDATION REPORT — UCP 600 COMPLIANCE ENGINE');
  lines.push(sep);
  lines.push(`  Submission ID : ${submissionId}`);
  lines.push(`  Presented Date: ${presentedDate || 'N/A'}`);
  lines.push(`  Processed At  : ${processedAt}`);
  lines.push(`  Duration      : ${durationMs}ms`);
  lines.push(thin);

  const recEmoji = recommendation === 'ACCEPT' ? '✅' : recommendation === 'REJECT' ? '❌' : '⚠️ ';
  lines.push('');
  lines.push(`  RECOMMENDATION: ${recEmoji}  ${recommendation}`);
  lines.push(`  Result        : ${validation_result}`);
  lines.push('');
  lines.push(`  FATAL      : ${summary.fatalCount ?? 0}`);
  lines.push(`  MINOR      : ${summary.minorCount ?? 0}`);
  lines.push(`  ADVISORY   : ${summary.advisoryCount ?? 0}`);
  lines.push(`  TOTAL      : ${summary.totalDiscrepancies ?? 0}`);
  lines.push('');
  lines.push(thin);

  lines.push('  COMPLIANCE CHECKS:');
  lines.push('');
  const checkLabels = {
    invoice_vs_lc: 'Invoice vs LC',
    bl_vs_lc: 'Bill of Lading vs LC',
    insurance_vs_lc: 'Insurance vs LC',
    cross_document_consistency: 'Cross-Document Consistency',
    document_set_completeness: 'Document Set Completeness',
    dates_compliance: 'Dates Compliance'
  };
  for (const [key, label] of Object.entries(checkLabels)) {
    const status = compliance_checks[key] || 'N/A';
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'PARTIAL' ? '⚠️ ' : '—';
    lines.push(`    ${icon}  ${label.padEnd(35)} ${status}`);
  }
  lines.push('');
  lines.push(thin);

  if (discrepancies.length > 0) {
    lines.push('  DISCREPANCIES:');
    lines.push('');
    // Sort: FATAL → MINOR → ADVISORY (#9 - sort by severity)
    const order = { FATAL: 0, MINOR: 1, ADVISORY: 2 };
    const sorted = [...discrepancies].sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
    for (const d of sorted) {
      const sevTag = d.severity === 'FATAL' ? '❌ FATAL   ' : d.severity === 'MINOR' ? '⚠️  MINOR   ' : 'ℹ️  ADVISORY';
      if (d.confidence) lines.push(`  ┌─ [${d.id}] ${sevTag} | ${d.document} | ${d.field} (confidence: ${d.confidence})`);
      else lines.push(`  ┌─ [${d.id}] ${sevTag} | ${d.document} | ${d.field}`);
      lines.push(`  │  UCP Rule   : ${d.ucp_article}`);
      lines.push(`  │  Required   : ${d.lc_requirement}`);
      lines.push(`  │  Found      : ${d.found_value}`);
      lines.push(`  │  Issue      : ${d.description}`);
      lines.push(`  └─ Fix        : ${d.remediation}`);
      lines.push('');
    }
    lines.push(thin);
  }

  if (summary_notes) {
    lines.push('  SUMMARY NOTES:');
    lines.push('');
    const wrapped = summary_notes.match(/.{1,68}/g) || [summary_notes];
    for (const line of wrapped) lines.push(`  ${line}`);
    lines.push('');
    lines.push(thin);
  }

  if (checker_recommendation) {
    lines.push('  CHECKER RECOMMENDATION:');
    lines.push('');
    const wrapped = checker_recommendation.match(/.{1,68}/g) || [checker_recommendation];
    for (const line of wrapped) lines.push(`  ${line}`);
    lines.push('');
    lines.push(thin);
  }

  lines.push('');
  return lines.join('\n');
}
