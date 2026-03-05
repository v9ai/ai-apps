const VALID_TYPES = ['logical', 'factual', 'legal', 'procedural', 'citation'];

module.exports = (output) => {
  let parsed;
  try {
    parsed = typeof output === 'string' ? JSON.parse(output) : output;
  } catch {
    return { pass: false, score: 0, reason: 'Output is not valid JSON' };
  }

  if (!parsed.attacks || !Array.isArray(parsed.attacks)) {
    return { pass: false, score: 0, reason: 'Missing or invalid "attacks" array' };
  }

  if (parsed.attacks.length === 0) {
    return { pass: false, score: 0, reason: 'No attacks found — expected at least 1' };
  }

  const errors = [];
  for (let i = 0; i < parsed.attacks.length; i++) {
    const a = parsed.attacks[i];
    if (!a.claim || typeof a.claim !== 'string') errors.push(`attacks[${i}]: missing/invalid "claim"`);
    if (!a.weakness || typeof a.weakness !== 'string') errors.push(`attacks[${i}]: missing/invalid "weakness"`);
    if (!VALID_TYPES.includes(a.type)) errors.push(`attacks[${i}]: invalid type "${a.type}"`);
    if (!a.evidence || typeof a.evidence !== 'string') errors.push(`attacks[${i}]: missing/invalid "evidence"`);
  }

  if (errors.length > 0) {
    return { pass: false, score: 0, reason: errors.join('; ') };
  }

  return { pass: true, score: 1, reason: `Valid: ${parsed.attacks.length} attacks found` };
};
