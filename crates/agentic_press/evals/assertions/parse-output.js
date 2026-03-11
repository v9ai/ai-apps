/**
 * Extract and parse JSON from LLM output that may include thinking tags,
 * markdown fences, or other wrapper text (e.g. deepseek-reasoner's <think> blocks).
 */
function parseOutput(output) {
  if (typeof output !== 'string') return output;

  // Strip <think>...</think> blocks (deepseek-reasoner)
  let cleaned = output.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // Strip "Thinking: ..." prefix (promptfoo's reasoner format)
  cleaned = cleaned.replace(/^Thinking:[\s\S]*?\n\s*\n/m, '').trim();

  // Strip markdown JSON fences
  cleaned = cleaned.replace(/^```json\s*/m, '').replace(/\s*```\s*$/m, '').trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fallback: find the first { ... } or [ ... ] block
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error('No valid JSON found in output');
  }
}

module.exports = { parseOutput };
