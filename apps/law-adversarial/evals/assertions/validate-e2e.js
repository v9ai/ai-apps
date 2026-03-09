const { parseOutput } = require('./parse-output');

/**
 * Validates cross-agent coherence in the E2E pipeline.
 * - Defender rebuttals must reference attacker claims (attack_ref matches attacker weakness text)
 * - Judge findings should map to points raised by attacker/defender
 * - Overall coherence: judge score should correlate with defender strength and attacker severity
 */
module.exports = (output, context) => {
  let judgeOutput;
  try {
    judgeOutput = parseOutput(output);
  } catch {
    return { pass: false, score: 0, reason: 'Judge output is not valid JSON' };
  }

  // Parse the pre-computed attacker and defender outputs from vars
  let attackerOutput, defenderOutput;
  try {
    attackerOutput = typeof context.vars.attackerOutput === 'string'
      ? JSON.parse(context.vars.attackerOutput)
      : context.vars.attackerOutput;
  } catch {
    return { pass: false, score: 0, reason: 'Could not parse attackerOutput from vars' };
  }

  try {
    defenderOutput = typeof context.vars.defenderOutput === 'string'
      ? JSON.parse(context.vars.defenderOutput)
      : context.vars.defenderOutput;
  } catch {
    return { pass: false, score: 0, reason: 'Could not parse defenderOutput from vars' };
  }

  // Validate judge structure
  if (!judgeOutput.findings || !Array.isArray(judgeOutput.findings)) {
    return { pass: false, score: 0, reason: 'Judge output missing "findings" array' };
  }
  if (typeof judgeOutput.overall_score !== 'number') {
    return { pass: false, score: 0, reason: 'Judge output missing "overall_score"' };
  }

  const errors = [];

  // 1. Cross-reference: defender rebuttals should reference attacker claims
  if (attackerOutput.attacks && defenderOutput.rebuttals) {
    const attackTexts = attackerOutput.attacks.map(a =>
      (a.claim + ' ' + a.weakness).toLowerCase()
    );

    for (let i = 0; i < defenderOutput.rebuttals.length; i++) {
      const rebuttal = defenderOutput.rebuttals[i];
      const ref = (rebuttal.attack_ref || '').toLowerCase();

      // Check that attack_ref has some overlap with at least one attacker claim/weakness
      const hasMatch = attackTexts.some(text => {
        // Look for meaningful keyword overlap (at least 3 shared words of 4+ chars)
        const refWords = ref.split(/\s+/).filter(w => w.length >= 4);
        const textWords = text.split(/\s+/).filter(w => w.length >= 4);
        const shared = refWords.filter(w => textWords.includes(w));
        return shared.length >= 3 || text.includes(ref) || ref.includes(text.substring(0, 40));
      });

      if (!hasMatch && ref.length > 0) {
        errors.push(`Defender rebuttal[${i}] attack_ref "${ref.substring(0, 60)}..." does not match any attacker claim`);
      }
    }
  }

  // 2. Judge findings should reference topics raised by attacker or defender
  const allAgentText = [
    ...(attackerOutput.attacks || []).map(a => (a.claim + ' ' + a.weakness + ' ' + a.evidence).toLowerCase()),
    ...(defenderOutput.rebuttals || []).map(r => (r.attack_ref + ' ' + r.defense).toLowerCase()),
  ].join(' ');

  let unmappedFindings = 0;
  for (let i = 0; i < judgeOutput.findings.length; i++) {
    const finding = judgeOutput.findings[i];
    const desc = (finding.description || '').toLowerCase();
    const descWords = desc.split(/\s+/).filter(w => w.length >= 5);

    // At least 2 meaningful words from the finding description should appear in agent text
    const matchingWords = descWords.filter(w => allAgentText.includes(w));
    if (matchingWords.length < 2) {
      unmappedFindings++;
    }
  }

  // Allow up to 1 unmapped finding (judge may introduce new observations)
  if (unmappedFindings > 1) {
    errors.push(`${unmappedFindings} judge findings have no clear connection to attacker/defender discussion`);
  }

  // 3. Coherence: if defender mostly concedes (low strength), judge score should be lower
  if (defenderOutput.rebuttals && defenderOutput.rebuttals.length > 0) {
    const avgStrength = defenderOutput.rebuttals.reduce((sum, r) => sum + (r.strength || 0), 0)
      / defenderOutput.rebuttals.length;

    // If defender is very weak (avg strength < 0.2) but judge scores high (> 70), flag incoherence
    if (avgStrength < 0.2 && judgeOutput.overall_score > 70) {
      errors.push(
        `Coherence issue: defender avg strength ${avgStrength.toFixed(2)} but judge score ${judgeOutput.overall_score} — expected lower score when defense is weak`
      );
    }

    // If defender is strong (avg strength > 0.6) but judge scores very low (< 20), flag incoherence
    if (avgStrength > 0.6 && judgeOutput.overall_score < 20) {
      errors.push(
        `Coherence issue: defender avg strength ${avgStrength.toFixed(2)} but judge score ${judgeOutput.overall_score} — expected higher score when defense is strong`
      );
    }
  }

  if (errors.length > 0) {
    return { pass: false, score: 0, reason: `E2E coherence issues: ${errors.join('; ')}` };
  }

  return {
    pass: true,
    score: 1,
    reason: `E2E coherent: ${judgeOutput.findings.length} findings, score ${judgeOutput.overall_score}/100, cross-references valid`,
  };
};
