module.exports = (output) => {
  if (typeof output !== 'string' || output.trim().length === 0) {
    return { pass: false, score: 0, reason: 'Output is empty' };
  }

  const errors = [];

  // Word count (150-220)
  const words = output.split(/\s+/).filter(w => w.length > 0).length;
  if (words < 150) errors.push(`Word count too low: ${words} (min 150)`);
  if (words > 220) errors.push(`Word count too high: ${words} (max 220)`);

  // No "I" opener — first non-empty line shouldn't start with "I "
  const firstLine = output.trim().split('\n').find(l => l.trim().length > 0) || '';
  if (/^\s*I\s/.test(firstLine)) {
    errors.push('First line starts with "I" — LinkedIn posts should open with a claim or stat');
  }

  // Hashtag count (4-6)
  const hashtags = output.match(/#\w+/g) || [];
  if (hashtags.length < 4) errors.push(`Too few hashtags: ${hashtags.length} (min 4)`);
  if (hashtags.length > 6) errors.push(`Too many hashtags: ${hashtags.length} (max 6)`);

  // No generic hashtags
  const genericTags = ['#ai', '#tech', '#technology', '#innovation'];
  const foundGeneric = hashtags.filter(h => genericTags.includes(h.toLowerCase()));
  if (foundGeneric.length > 0) {
    errors.push(`Generic hashtags found: ${foundGeneric.join(', ')} — use specific ones`);
  }

  if (errors.length > 0) {
    return { pass: false, score: 0, reason: errors.join('; ') };
  }

  return { pass: true, score: 1, reason: `Valid: ${words} words, ${hashtags.length} specific hashtags, strong opener` };
};
