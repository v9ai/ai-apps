const VALID_STATUSES = ['valid', 'mischaracterized', 'overruled', 'distinguished', 'fabricated', 'inapposite'];

module.exports = (output) => {
  let parsed;
  try {
    parsed = typeof output === 'string' ? JSON.parse(output) : output;
  } catch {
    return { pass: false, score: 0, reason: 'Output is not valid JSON' };
  }

  if (!parsed.citations || !Array.isArray(parsed.citations)) {
    return { pass: false, score: 0, reason: 'Missing or invalid "citations" array' };
  }

  if (parsed.citations.length === 0) {
    return { pass: false, score: 0, reason: 'No citations found — expected at least 1' };
  }

  if (typeof parsed.fabrication_risk !== 'number' || parsed.fabrication_risk < 0 || parsed.fabrication_risk > 1) {
    return { pass: false, score: 0, reason: `"fabrication_risk" must be 0-1, got ${parsed.fabrication_risk}` };
  }

  if (!parsed.summary || typeof parsed.summary !== 'string') {
    return { pass: false, score: 0, reason: 'Missing or invalid "summary"' };
  }

  const errors = [];
  for (let i = 0; i < parsed.citations.length; i++) {
    const c = parsed.citations[i];
    if (!c.citation || typeof c.citation !== 'string') errors.push(`citations[${i}]: missing/invalid "citation"`);
    if (!VALID_STATUSES.includes(c.status)) errors.push(`citations[${i}]: invalid status "${c.status}"`);
    if (!c.actual_holding || typeof c.actual_holding !== 'string') errors.push(`citations[${i}]: missing/invalid "actual_holding"`);
    if (!c.brief_characterization || typeof c.brief_characterization !== 'string') errors.push(`citations[${i}]: missing/invalid "brief_characterization"`);
    if (!c.issue || typeof c.issue !== 'string') errors.push(`citations[${i}]: missing/invalid "issue"`);
    if (typeof c.confidence !== 'number' || c.confidence < 0 || c.confidence > 1) {
      errors.push(`citations[${i}]: "confidence" must be 0-1, got ${c.confidence}`);
    }
  }

  if (errors.length > 0) {
    return { pass: false, score: 0, reason: errors.join('; ') };
  }

  return { pass: true, score: 1, reason: `Valid: ${parsed.citations.length} citations checked, fabrication_risk: ${parsed.fabrication_risk}` };
};
