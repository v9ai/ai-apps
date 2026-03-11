const AI_PHRASES = [
  'in this article',
  'in today\'s rapidly',
  'it\'s worth noting',
  'in conclusion',
  'landscape',
  'paradigm shift',
  'game-changer',
  'revolutionize',
  'at the end of the day',
  'dive deep into',
  'without further ado',
  'let\'s explore',
];

module.exports = (output) => {
  if (typeof output !== 'string' || output.trim().length === 0) {
    return { pass: false, score: 0, reason: 'Output is empty' };
  }

  const errors = [];

  // Word count (700-1000)
  const words = output.split(/\s+/).filter(w => w.length > 0).length;
  if (words < 700) errors.push(`Word count too low: ${words} (min 700)`);
  if (words > 1000) errors.push(`Word count too high: ${words} (max 1000)`);

  // H2 count (3+)
  const h2s = (output.match(/^##\s+/gm) || []).length;
  if (h2s < 3) errors.push(`Too few H2 sections: ${h2s} (min 3)`);

  // No generic AI phrasing
  const foundPhrases = AI_PHRASES.filter(p => output.toLowerCase().includes(p));
  if (foundPhrases.length > 0) {
    errors.push(`Generic AI phrasing found: "${foundPhrases.join('", "')}"`);
  }

  if (errors.length > 0) {
    return { pass: false, score: 0, reason: errors.join('; ') };
  }

  return { pass: true, score: 1, reason: `Valid: ${words} words, ${h2s} H2 sections, no AI phrasing` };
};
