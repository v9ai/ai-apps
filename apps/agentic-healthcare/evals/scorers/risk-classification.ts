import {
  classifyMetricRisk,
  computeDerivedMetrics,
  METRIC_REFERENCES,
  type MarkerInput,
} from "../../lib/embeddings";

/**
 * Custom Braintrust scorer: risk classification accuracy.
 *
 * Extracts risk labels (optimal/borderline/elevated/low) from LLM output
 * for each derived metric and compares against the ground-truth
 * classification from classifyMetricRisk().
 *
 * Returns a score 0-1 based on the percentage of correctly classified metrics.
 */

type MetricRisk = "optimal" | "borderline" | "elevated" | "low";

type ScorerArgs = {
  output: string;
  expected?: string;
  input?: {
    markers?: { curr: MarkerInput[] };
    expectedRisks?: Record<string, MetricRisk>;
  };
};

/**
 * Map METRIC_REFERENCES keys to patterns that might appear in LLM output.
 */
const METRIC_OUTPUT_PATTERNS: Record<string, RegExp[]> = {
  hdl_ldl_ratio: [/hdl[\/\s]*ldl/i, /hdl\s+to\s+ldl/i],
  total_cholesterol_hdl_ratio: [
    /tc[\/\s]*hdl/i,
    /total\s*cholesterol[\/\s]*hdl/i,
    /atherogenic\s*index/i,
  ],
  triglyceride_hdl_ratio: [/tg[\/\s]*hdl/i, /triglyceride[\/\s]*hdl/i],
  glucose_triglyceride_index: [/tyg/i, /triglyceride[\s-]*glucose/i, /glucose[\s-]*triglyceride/i],
  neutrophil_lymphocyte_ratio: [/nlr/i, /neutrophil[\/\s]*lymphocyte/i],
  bun_creatinine_ratio: [/bun[\/\s]*creatinine/i, /bun[\/\s]*cr\b/i],
  ast_alt_ratio: [/de\s*ritis/i, /ast[\/\s]*alt/i],
};

const RISK_LABELS: MetricRisk[] = ["optimal", "borderline", "elevated", "low"];

/**
 * Extract risk label(s) the LLM associated with a given metric in its output.
 *
 * Strategy: find sentences/phrases that mention the metric, then look for
 * a risk label within the same sentence or nearby context.
 */
function extractLLMRiskForMetric(
  output: string,
  metricKey: string
): MetricRisk | null {
  const patterns = METRIC_OUTPUT_PATTERNS[metricKey];
  if (!patterns) return null;

  // Split output into sentences (rough approximation)
  const sentences = output.split(/[.!?\n]+/).map((s) => s.trim());

  for (const sentence of sentences) {
    const mentionsMetric = patterns.some((p) => p.test(sentence));
    if (!mentionsMetric) continue;

    // Look for the most recent risk label in this sentence
    const lower = sentence.toLowerCase();
    for (const risk of RISK_LABELS) {
      if (lower.includes(risk)) {
        return risk;
      }
    }

    // Also check bracket notation like [elevated]
    const bracketMatch = sentence.match(/\[(optimal|borderline|elevated|low)\]/i);
    if (bracketMatch) {
      return bracketMatch[1].toLowerCase() as MetricRisk;
    }
  }

  return null;
}

export function riskClassification(args: ScorerArgs): {
  name: string;
  score: number;
  metadata: {
    correct: string[];
    incorrect: string[];
    missing: string[];
    total: number;
  };
} {
  const { output, input } = args;

  // Compute ground truth from markers or use provided expectedRisks
  let expectedRisks: Record<string, MetricRisk> = {};

  if (input?.expectedRisks) {
    expectedRisks = input.expectedRisks;
  } else if (input?.markers?.curr) {
    const derived = computeDerivedMetrics(input.markers.curr);
    for (const [key, value] of Object.entries(derived)) {
      if (value != null) {
        expectedRisks[key] = classifyMetricRisk(key, value);
      }
    }
  }

  const correct: string[] = [];
  const incorrect: string[] = [];
  const missing: string[] = [];

  for (const [metricKey, expectedRisk] of Object.entries(expectedRisks)) {
    const ref = METRIC_REFERENCES[metricKey];
    const label = ref?.label ?? metricKey;

    const llmRisk = extractLLMRiskForMetric(output, metricKey);

    if (llmRisk === null) {
      missing.push(`${label}: expected ${expectedRisk}, not mentioned`);
    } else if (llmRisk === expectedRisk) {
      correct.push(`${label}: ${expectedRisk}`);
    } else {
      incorrect.push(`${label}: expected ${expectedRisk}, got ${llmRisk}`);
    }
  }

  // Score based on mentioned metrics only (don't penalize for unmentioned ones
  // as the LLM may focus on clinically significant metrics)
  const mentioned = correct.length + incorrect.length;
  const total = Object.keys(expectedRisks).length;
  const score = mentioned === 0 ? 0 : correct.length / mentioned;

  return {
    name: "RiskClassification",
    score,
    metadata: { correct, incorrect, missing, total },
  };
}
