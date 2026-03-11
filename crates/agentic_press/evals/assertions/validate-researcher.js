module.exports = (output) => {
  if (typeof output !== 'string' || output.trim().length === 0) {
    return { pass: false, score: 0, reason: 'Output is empty' };
  }

  const errors = [];

  // Must have section headers
  const headers = (output.match(/^#+\s+/gm) || []).length;
  if (headers < 3) errors.push(`Too few section headers: ${headers} (min 3)`);

  // Must have source attributions (URLs or "Source:" references)
  const hasUrls = /https?:\/\//.test(output);
  const hasSourceRefs = /source:/i.test(output);
  if (!hasUrls && !hasSourceRefs) errors.push('No source attributions found (URLs or Source: references)');

  // Must have Key Facts or similar section
  const hasKeyFacts = /key\s+facts|key\s+findings|findings/i.test(output);
  if (!hasKeyFacts) errors.push('Missing Key Facts/Findings section');

  // Word count check (500-1000)
  const words = output.split(/\s+/).filter(w => w.length > 0).length;
  if (words < 300) errors.push(`Research brief too short: ${words} words (min 300)`);

  if (errors.length > 0) {
    return { pass: false, score: 0, reason: errors.join('; ') };
  }

  return { pass: true, score: 1, reason: `Valid: ${headers} sections, ${words} words, sources present` };
};
