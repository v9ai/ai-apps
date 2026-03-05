module.exports = (output) => {
  let parsed;
  try {
    parsed = typeof output === 'string' ? JSON.parse(output) : output;
  } catch {
    return { pass: false, score: 0, reason: 'Output is not valid JSON' };
  }

  if (!parsed.rebuttals || !Array.isArray(parsed.rebuttals)) {
    return { pass: false, score: 0, reason: 'Missing or invalid "rebuttals" array' };
  }

  if (parsed.rebuttals.length === 0) {
    return { pass: false, score: 0, reason: 'No rebuttals found — expected at least 1' };
  }

  const errors = [];
  for (let i = 0; i < parsed.rebuttals.length; i++) {
    const r = parsed.rebuttals[i];
    if (!r.attack_ref || typeof r.attack_ref !== 'string') errors.push(`rebuttals[${i}]: missing/invalid "attack_ref"`);
    if (!r.defense || typeof r.defense !== 'string') errors.push(`rebuttals[${i}]: missing/invalid "defense"`);
    if (!Array.isArray(r.supporting_citations)) errors.push(`rebuttals[${i}]: missing/invalid "supporting_citations" array`);
    if (typeof r.strength !== 'number' || r.strength < 0 || r.strength > 1) {
      errors.push(`rebuttals[${i}]: "strength" must be a number between 0 and 1, got ${r.strength}`);
    }
  }

  if (errors.length > 0) {
    return { pass: false, score: 0, reason: errors.join('; ') };
  }

  return { pass: true, score: 1, reason: `Valid: ${parsed.rebuttals.length} rebuttals found` };
};
