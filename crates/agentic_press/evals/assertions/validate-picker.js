const { parseOutput } = require('./parse-output');

module.exports = (output) => {
  let parsed;
  try {
    parsed = parseOutput(output);
  } catch {
    return { pass: false, score: 0, reason: 'Output is not valid JSON' };
  }

  if (!Array.isArray(parsed)) {
    return { pass: false, score: 0, reason: `Expected JSON array, got ${typeof parsed}` };
  }

  if (parsed.length === 0) {
    return { pass: false, score: 0, reason: 'Empty array — expected at least 1 topic selection' };
  }

  const errors = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (!item.topic || typeof item.topic !== 'string') errors.push(`[${i}]: missing/invalid "topic"`);
    if (!item.angle || typeof item.angle !== 'string') errors.push(`[${i}]: missing/invalid "angle"`);
    if (!item.why_viral || typeof item.why_viral !== 'string') errors.push(`[${i}]: missing/invalid "why_viral"`);
  }

  if (errors.length > 0) {
    return { pass: false, score: 0, reason: errors.join('; ') };
  }

  return { pass: true, score: 1, reason: `Valid: ${parsed.length} topic(s) with topic, angle, and why_viral` };
};
