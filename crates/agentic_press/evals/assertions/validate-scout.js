module.exports = (output) => {
  if (typeof output !== 'string' || output.trim().length === 0) {
    return { pass: false, score: 0, reason: 'Output is empty' };
  }

  // Count numbered items (1. 2. 3. etc or 1) 2) 3) etc)
  const numberedItems = output.match(/^\s*\d+[\.\)]/gm) || [];
  if (numberedItems.length < 5) {
    return { pass: false, score: 0, reason: `Expected 5 numbered topics, found ${numberedItems.length}` };
  }

  // Check for source links or references
  const hasLinks = /https?:\/\//.test(output) || /source/i.test(output);
  if (!hasLinks) {
    return { pass: false, score: 0, reason: 'No source links or references found' };
  }

  return { pass: true, score: 1, reason: `Valid: ${numberedItems.length} numbered topics with sources` };
};
