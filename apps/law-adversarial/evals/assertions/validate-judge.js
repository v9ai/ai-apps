const VALID_TYPES = ['logical', 'factual', 'legal', 'procedural', 'citation'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

module.exports = (output) => {
  let parsed;
  try {
    parsed = typeof output === 'string' ? JSON.parse(output) : output;
  } catch {
    return { pass: false, score: 0, reason: 'Output is not valid JSON' };
  }

  if (!parsed.findings || !Array.isArray(parsed.findings)) {
    return { pass: false, score: 0, reason: 'Missing or invalid "findings" array' };
  }

  if (typeof parsed.overall_score !== 'number' || parsed.overall_score < 0 || parsed.overall_score > 100) {
    return { pass: false, score: 0, reason: `"overall_score" must be 0-100, got ${parsed.overall_score}` };
  }

  if (parsed.findings.length === 0) {
    return { pass: false, score: 0, reason: 'No findings found — expected at least 1' };
  }

  const errors = [];
  for (let i = 0; i < parsed.findings.length; i++) {
    const f = parsed.findings[i];
    if (!VALID_TYPES.includes(f.type)) errors.push(`findings[${i}]: invalid type "${f.type}"`);
    if (!VALID_SEVERITIES.includes(f.severity)) errors.push(`findings[${i}]: invalid severity "${f.severity}"`);
    if (!f.description || typeof f.description !== 'string') errors.push(`findings[${i}]: missing/invalid "description"`);
    if (typeof f.confidence !== 'number' || f.confidence < 0 || f.confidence > 1) {
      errors.push(`findings[${i}]: "confidence" must be 0-1, got ${f.confidence}`);
    }
    if (!f.suggested_fix || typeof f.suggested_fix !== 'string') errors.push(`findings[${i}]: missing/invalid "suggested_fix"`);
  }

  if (errors.length > 0) {
    return { pass: false, score: 0, reason: errors.join('; ') };
  }

  return { pass: true, score: 1, reason: `Valid: ${parsed.findings.length} findings, score ${parsed.overall_score}/100` };
};
