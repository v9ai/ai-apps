const { parseOutput } = require('./parse-output');
const VALID_CHANGE_TYPES = ['rewrite', 'addition', 'deletion', 'citation_fix', 'structural'];

module.exports = (output) => {
  let parsed;
  try {
    parsed = parseOutput(output);
  } catch {
    return { pass: false, score: 0, reason: 'Output is not valid JSON' };
  }

  if (!parsed.revised_brief || typeof parsed.revised_brief !== 'string') {
    return { pass: false, score: 0, reason: 'Missing or invalid "revised_brief"' };
  }

  if (parsed.revised_brief.length < 50) {
    return { pass: false, score: 0, reason: 'Revised brief is too short — likely incomplete' };
  }

  if (!parsed.changes || !Array.isArray(parsed.changes)) {
    return { pass: false, score: 0, reason: 'Missing or invalid "changes" array' };
  }

  if (parsed.changes.length === 0) {
    return { pass: false, score: 0, reason: 'No changes found — expected at least 1 revision' };
  }

  if (typeof parsed.improvement_score !== 'number' || parsed.improvement_score < 0 || parsed.improvement_score > 100) {
    return { pass: false, score: 0, reason: `"improvement_score" must be 0-100, got ${parsed.improvement_score}` };
  }

  if (!parsed.change_summary || typeof parsed.change_summary !== 'string') {
    return { pass: false, score: 0, reason: 'Missing or invalid "change_summary"' };
  }

  const errors = [];
  for (let i = 0; i < parsed.changes.length; i++) {
    const c = parsed.changes[i];
    if (typeof c.original_text !== 'string') errors.push(`changes[${i}]: missing/invalid "original_text"`);
    if (typeof c.revised_text !== 'string') errors.push(`changes[${i}]: missing/invalid "revised_text"`);
    if (!VALID_CHANGE_TYPES.includes(c.change_type)) errors.push(`changes[${i}]: invalid change_type "${c.change_type}"`);
    if (!c.reason || typeof c.reason !== 'string') errors.push(`changes[${i}]: missing/invalid "reason"`);
    if (!c.finding_ref || typeof c.finding_ref !== 'string') errors.push(`changes[${i}]: missing/invalid "finding_ref"`);
  }

  if (errors.length > 0) {
    return { pass: false, score: 0, reason: errors.join('; ') };
  }

  return { pass: true, score: 1, reason: `Valid: ${parsed.changes.length} changes, improvement_score: ${parsed.improvement_score}` };
};
