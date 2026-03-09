import {
  computeDerivedMetrics,
  computeMetricVelocity,
  METRIC_REFERENCES,
  type MarkerInput,
} from "../../lib/embeddings";

/**
 * Custom Braintrust scorer: trajectory direction accuracy.
 *
 * Validates whether the LLM correctly identifies improving/stable/deteriorating
 * direction for each metric, based on the velocity sign computed from the
 * marker data.
 *
 * Returns a score 0-1 based on the percentage of correctly identified directions.
 */

type Direction = "improving" | "stable" | "deteriorating";

type ScorerArgs = {
  output: string;
  expected?: string;
  input?: {
    markers?: { prev: MarkerInput[]; curr: MarkerInput[] };
    daysBetween?: number;
    expectedDirection?: Record<string, Direction>;
  };
};

/**
 * Threshold for considering a velocity "stable" (essentially zero change).
 * If the absolute velocity per day is below this threshold, the metric
 * is considered stable.
 */
const STABILITY_THRESHOLD = 0.001;

/**
 * For metrics where higher is better (HDL/LDL ratio), positive velocity
 * means improving. For metrics where lower is better (TC/HDL, TG/HDL,
 * TyG, NLR), positive velocity means deteriorating.
 *
 * Special cases:
 * - BUN/Creatinine: optimal is 10-20, so direction depends on whether
 *   the value is moving toward or away from the optimal range
 * - AST/ALT (De Ritis): optimal is 0.8-1.2, same logic
 */
const HIGHER_IS_BETTER = new Set(["hdl_ldl_ratio"]);
const RANGE_OPTIMAL = new Set(["bun_creatinine_ratio", "ast_alt_ratio", "neutrophil_lymphocyte_ratio"]);

/**
 * Determine the expected direction based on velocity and metric semantics.
 */
function classifyDirection(
  metricKey: string,
  velocity: number,
  prevValue: number | null,
  currValue: number | null
): Direction {
  if (Math.abs(velocity) < STABILITY_THRESHOLD) {
    return "stable";
  }

  // For range-optimal metrics, determine direction based on whether
  // the value is moving toward or away from the optimal range
  if (RANGE_OPTIMAL.has(metricKey) && prevValue != null && currValue != null) {
    const ref = METRIC_REFERENCES[metricKey];
    if (ref) {
      const [optLo, optHi] = ref.optimal;
      const optMid = (optLo + optHi) / 2;
      const prevDist = Math.abs(prevValue - optMid);
      const currDist = Math.abs(currValue - optMid);
      if (currDist < prevDist) return "improving";
      if (currDist > prevDist) return "deteriorating";
      return "stable";
    }
  }

  // For "higher is better" metrics
  if (HIGHER_IS_BETTER.has(metricKey)) {
    return velocity > 0 ? "improving" : "deteriorating";
  }

  // For "lower is better" metrics (TC/HDL, TG/HDL, TyG)
  return velocity < 0 ? "improving" : "deteriorating";
}

/**
 * Map metric keys to output patterns for detecting mentions.
 */
const METRIC_OUTPUT_PATTERNS: Record<string, RegExp[]> = {
  hdl_ldl_ratio: [/hdl[\/\s]*ldl/i, /hdl\s+to\s+ldl/i],
  total_cholesterol_hdl_ratio: [
    /tc[\/\s]*hdl/i,
    /total\s*cholesterol[\/\s]*hdl/i,
    /atherogenic/i,
  ],
  triglyceride_hdl_ratio: [/tg[\/\s]*hdl/i, /triglyceride[\/\s]*hdl/i],
  glucose_triglyceride_index: [/tyg/i, /triglyceride[\s-]*glucose/i, /glucose[\s-]*triglyceride/i],
  neutrophil_lymphocyte_ratio: [/nlr/i, /neutrophil[\/\s]*lymphocyte/i],
  bun_creatinine_ratio: [/bun[\/\s]*creatinine/i, /bun[\/\s]*cr\b/i],
  ast_alt_ratio: [/de\s*ritis/i, /ast[\/\s]*alt/i],
};

const DIRECTION_SYNONYMS: Record<Direction, RegExp> = {
  improving: /improv|decreas|better|positive|downward|recover|lower|reduc|favorable|declin/i,
  stable: /stable|unchanged|consistent|maintained|steady|flat|minimal|no\s*(?:significant\s*)?change/i,
  deteriorating:
    /worsen|increas|rising|deteriorat|elevated|higher|upward|accelerat|spike|climb|grew|concern/i,
};

/**
 * Extract the direction the LLM reports for a given metric.
 */
function extractLLMDirection(
  output: string,
  metricKey: string
): Direction | null {
  const patterns = METRIC_OUTPUT_PATTERNS[metricKey];
  if (!patterns) return null;

  const sentences = output.split(/[.!?\n]+/).map((s) => s.trim());

  for (const sentence of sentences) {
    const mentionsMetric = patterns.some((p) => p.test(sentence));
    if (!mentionsMetric) continue;

    const lower = sentence.toLowerCase();

    // Check for direction synonyms — prefer the first match
    // (order: improving, stable, deteriorating)
    // But prioritize explicit terms
    if (DIRECTION_SYNONYMS.improving.test(lower)) return "improving";
    if (DIRECTION_SYNONYMS.deteriorating.test(lower)) return "deteriorating";
    if (DIRECTION_SYNONYMS.stable.test(lower)) return "stable";
  }

  return null;
}

export function trajectoryDirection(args: ScorerArgs): {
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

  let expectedDirections: Record<string, Direction> = {};

  if (input?.expectedDirection) {
    expectedDirections = input.expectedDirection;
  } else if (input?.markers && input?.daysBetween && input.daysBetween > 0) {
    const prevDerived = computeDerivedMetrics(input.markers.prev);
    const currDerived = computeDerivedMetrics(input.markers.curr);
    const velocity = computeMetricVelocity(
      prevDerived,
      currDerived,
      input.daysBetween
    );

    for (const [key, vel] of Object.entries(velocity)) {
      if (vel != null) {
        expectedDirections[key] = classifyDirection(
          key,
          vel,
          prevDerived[key],
          currDerived[key]
        );
      }
    }
  }

  const correct: string[] = [];
  const incorrect: string[] = [];
  const missing: string[] = [];

  for (const [metricKey, expectedDir] of Object.entries(expectedDirections)) {
    const ref = METRIC_REFERENCES[metricKey];
    const label = ref?.label ?? metricKey;

    const llmDir = extractLLMDirection(output, metricKey);

    if (llmDir === null) {
      missing.push(`${label}: expected ${expectedDir}, not mentioned`);
    } else if (llmDir === expectedDir) {
      correct.push(`${label}: ${expectedDir}`);
    } else {
      incorrect.push(`${label}: expected ${expectedDir}, got ${llmDir}`);
    }
  }

  const mentioned = correct.length + incorrect.length;
  const total = Object.keys(expectedDirections).length;
  const score = mentioned === 0 ? 0 : correct.length / mentioned;

  return {
    name: "TrajectoryDirection",
    score,
    metadata: { correct, incorrect, missing, total },
  };
}
