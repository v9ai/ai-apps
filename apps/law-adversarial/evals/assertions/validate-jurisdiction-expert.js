const VALID_CATEGORIES = ['precedent_hierarchy', 'procedural_rule', 'local_rule', 'standard_of_review', 'burden_allocation', 'statutory_interpretation'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];
const VALID_COMPLIANCE = ['compliant', 'non_compliant', 'unclear'];

module.exports = (output) => {
  let parsed;
  try {
    parsed = typeof output === 'string' ? JSON.parse(output) : output;
  } catch {
    return { pass: false, score: 0, reason: 'Output is not valid JSON' };
  }

  if (!parsed.jurisdiction_analysis || typeof parsed.jurisdiction_analysis !== 'string') {
    return { pass: false, score: 0, reason: 'Missing or invalid "jurisdiction_analysis"' };
  }

  if (!parsed.issues || !Array.isArray(parsed.issues)) {
    return { pass: false, score: 0, reason: 'Missing or invalid "issues" array' };
  }

  if (!Array.isArray(parsed.binding_authority_gaps)) {
    return { pass: false, score: 0, reason: 'Missing or invalid "binding_authority_gaps" array' };
  }

  if (!Array.isArray(parsed.procedural_compliance)) {
    return { pass: false, score: 0, reason: 'Missing or invalid "procedural_compliance" array' };
  }

  if (typeof parsed.overall_jurisdiction_fitness !== 'number' || parsed.overall_jurisdiction_fitness < 0 || parsed.overall_jurisdiction_fitness > 100) {
    return { pass: false, score: 0, reason: `"overall_jurisdiction_fitness" must be 0-100, got ${parsed.overall_jurisdiction_fitness}` };
  }

  const errors = [];
  for (let i = 0; i < parsed.issues.length; i++) {
    const issue = parsed.issues[i];
    if (!VALID_CATEGORIES.includes(issue.category)) errors.push(`issues[${i}]: invalid category "${issue.category}"`);
    if (!issue.description || typeof issue.description !== 'string') errors.push(`issues[${i}]: missing/invalid "description"`);
    if (!issue.controlling_authority || typeof issue.controlling_authority !== 'string') errors.push(`issues[${i}]: missing/invalid "controlling_authority"`);
    if (!issue.recommendation || typeof issue.recommendation !== 'string') errors.push(`issues[${i}]: missing/invalid "recommendation"`);
    if (!VALID_SEVERITIES.includes(issue.severity)) errors.push(`issues[${i}]: invalid severity "${issue.severity}"`);
    if (typeof issue.confidence !== 'number' || issue.confidence < 0 || issue.confidence > 1) {
      errors.push(`issues[${i}]: "confidence" must be 0-1, got ${issue.confidence}`);
    }
  }

  for (let i = 0; i < parsed.procedural_compliance.length; i++) {
    const pc = parsed.procedural_compliance[i];
    if (!pc.rule || typeof pc.rule !== 'string') errors.push(`procedural_compliance[${i}]: missing/invalid "rule"`);
    if (!VALID_COMPLIANCE.includes(pc.status)) errors.push(`procedural_compliance[${i}]: invalid status "${pc.status}"`);
    if (!pc.note || typeof pc.note !== 'string') errors.push(`procedural_compliance[${i}]: missing/invalid "note"`);
  }

  if (errors.length > 0) {
    return { pass: false, score: 0, reason: errors.join('; ') };
  }

  return { pass: true, score: 1, reason: `Valid: ${parsed.issues.length} issues, ${parsed.binding_authority_gaps.length} authority gaps, fitness: ${parsed.overall_jurisdiction_fitness}` };
};
