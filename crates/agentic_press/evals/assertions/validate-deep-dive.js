module.exports = (output) => {
  if (typeof output !== 'string' || output.trim().length === 0) {
    return { pass: false, score: 0, reason: 'Output is empty' };
  }

  const errors = [];

  // Word count (2500-3500)
  const words = output.split(/\s+/).filter(w => w.length > 0).length;
  if (words < 2500) errors.push(`Word count too low: ${words} (min 2500)`);
  if (words > 3500) errors.push(`Word count too high: ${words} (max 3500)`);

  // Section count (7-9 H2s)
  const h2s = (output.match(/^##\s+/gm) || []).length;
  if (h2s < 7) errors.push(`Too few H2 sections: ${h2s} (min 7)`);
  if (h2s > 9) errors.push(`Too many H2 sections: ${h2s} (max 9)`);

  // Citation count (5+, Author + Year format like "Smith et al., 2023" or "(Author, 2024)")
  const citations = output.match(/\([A-Z][a-z]+(?:\s+et\s+al\.?)?,\s*\d{4}\)/g) || [];
  if (citations.length < 5) errors.push(`Too few citations: ${citations.length} (min 5, Author+Year format)`);

  // Percentage figures (3+)
  const percentages = output.match(/\d+(?:\.\d+)?%/g) || [];
  if (percentages.length < 3) errors.push(`Too few percentage figures: ${percentages.length} (min 3)`);

  if (errors.length > 0) {
    return { pass: false, score: 0, reason: errors.join('; ') };
  }

  return {
    pass: true,
    score: 1,
    reason: `Valid: ${words} words, ${h2s} sections, ${citations.length} citations, ${percentages.length} percentage figures`,
  };
};
