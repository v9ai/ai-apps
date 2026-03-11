module.exports = (output) => {
  if (typeof output !== 'string' || output.trim().length === 0) {
    return { pass: false, score: 0, reason: 'Output is empty' };
  }

  const errors = [];

  // Must have keyword table (pipe-separated table rows)
  const tableRows = (output.match(/\|.*\|/g) || []).length;
  if (tableRows < 3) errors.push(`Keyword table too small or missing: ${tableRows} rows (min 3)`);

  // Must have structure recommendations
  const hasStructure = /recommended structure|heading structure|h2s?:/i.test(output);
  if (!hasStructure) errors.push('Missing structure recommendations section');

  // Must have meta description
  const hasMeta = /meta description/i.test(output);
  if (!hasMeta) errors.push('Missing meta description');

  // Must have search intent analysis
  const hasIntent = /search intent|intent/i.test(output);
  if (!hasIntent) errors.push('Missing search intent analysis');

  if (errors.length > 0) {
    return { pass: false, score: 0, reason: errors.join('; ') };
  }

  return { pass: true, score: 1, reason: `Valid: ${tableRows} table rows, structure + meta + intent present` };
};
