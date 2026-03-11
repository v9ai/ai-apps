module.exports = (output) => {
  if (typeof output !== 'string' || output.trim().length === 0) {
    return { pass: false, score: 0, reason: 'Output is empty' };
  }

  const errors = [];

  const hasApprove = output.includes('APPROVE');
  const hasRevise = output.includes('REVISE');

  if (!hasApprove && !hasRevise) {
    return { pass: false, score: 0, reason: 'Missing DECISION — must contain APPROVE or REVISE' };
  }

  if (hasApprove && hasRevise) {
    errors.push('Contains both APPROVE and REVISE — must choose one');
  }

  if (hasApprove) {
    // Approved articles should have frontmatter with status: published
    if (!output.includes('status: published')) {
      errors.push('APPROVE decision but missing "status: published" in frontmatter');
    }
    // Should contain the article content (at least one heading)
    if (!output.includes('# ')) {
      errors.push('APPROVE decision but no article content found (no headings)');
    }
  }

  if (hasRevise) {
    // Should have at least Critical Issues section
    if (!output.includes('Critical Issues') && !output.includes('critical issue')) {
      errors.push('REVISE decision but no "Critical Issues" section found');
    }
  }

  if (errors.length > 0) {
    return { pass: false, score: 0, reason: errors.join('; ') };
  }

  const decision = hasApprove ? 'APPROVE' : 'REVISE';
  return { pass: true, score: 1, reason: `Valid ${decision} decision with proper structure` };
};
