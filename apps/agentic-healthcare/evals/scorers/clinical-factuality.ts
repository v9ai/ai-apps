import { METRIC_REFERENCES } from "../../lib/embeddings";

/**
 * Custom Braintrust scorer: clinical factuality.
 *
 * Extracts threshold claims from LLM output (e.g., "TG/HDL > 3.5 suggests
 * insulin resistance") and validates each claim against METRIC_REFERENCES.
 * Returns a score 0-1 based on the percentage of correct threshold claims.
 */

type ScorerArgs = {
  output: string;
  expected?: string;
  input?: unknown;
};

/**
 * Known threshold patterns from METRIC_REFERENCES that an LLM might cite.
 * Each entry maps a regex pattern to a validation function that checks
 * whether the claimed threshold is consistent with the reference data.
 */
const THRESHOLD_PATTERNS: Array<{
  /** Human-readable label for the claim being validated */
  label: string;
  /** Regex to detect the claim in LLM output (case-insensitive) */
  pattern: RegExp;
  /** Returns true if the claim extracted by the regex is factually correct */
  validate: (match: RegExpMatchArray) => boolean;
}> = [
  // --- HDL/LDL Ratio ---
  {
    label: "HDL/LDL optimal >= 0.4",
    pattern: /hdl[\/\s]*ldl[^.]*(?:optimal|good|desirable)[^.]*(?:>|>=|above|over|at least)\s*([\d.]+)/i,
    validate: (m) => {
      const val = parseFloat(m[1]);
      return val >= 0.3 && val <= 0.5; // Close to the 0.4 threshold
    },
  },
  // --- TC/HDL Ratio --- (Castelli et al.)
  {
    label: "TC/HDL optimal < 4.0",
    pattern: /tc[\/\s]*hdl[^.]*(?:optimal|ideal|low risk)[^.]*(?:<|<=|below|under)\s*([\d.]+)/i,
    validate: (m) => {
      const val = parseFloat(m[1]);
      return val >= 3.5 && val <= 4.5;
    },
  },
  {
    label: "TC/HDL borderline 4.0-5.0",
    pattern: /tc[\/\s]*hdl[^.]*(?:borderline|moderate)[^.]*(\d+\.?\d*)\s*[-–to]+\s*(\d+\.?\d*)/i,
    validate: (m) => {
      const lo = parseFloat(m[1]);
      const hi = parseFloat(m[2]);
      return lo >= 3.5 && lo <= 4.5 && hi >= 4.5 && hi <= 5.5;
    },
  },
  // --- TG/HDL Ratio ---
  {
    label: "TG/HDL > 3.5 suggests insulin resistance",
    pattern: /tg[\/\s]*hdl[^.]*(?:>|>=|above|over|exceeds?)\s*([\d.]+)[^.]*insulin\s*resistance/i,
    validate: (m) => {
      const val = parseFloat(m[1]);
      return val >= 2.5 && val <= 4.0; // Captures claims near the 3.5 threshold
    },
  },
  {
    label: "TG/HDL optimal < 2.0",
    pattern: /tg[\/\s]*hdl[^.]*(?:optimal|ideal|normal)[^.]*(?:<|<=|below|under)\s*([\d.]+)/i,
    validate: (m) => {
      const val = parseFloat(m[1]);
      return val >= 1.5 && val <= 2.5;
    },
  },
  // --- TyG Index ---
  {
    label: "TyG index threshold for insulin resistance",
    pattern: /tyg[^.]*(?:>|>=|above|over|exceeds?)\s*([\d.]+)[^.]*insulin\s*resistance/i,
    validate: (m) => {
      const val = parseFloat(m[1]);
      return val >= 8.0 && val <= 9.5;
    },
  },
  {
    label: "TyG optimal < 8.5",
    pattern: /tyg[^.]*(?:optimal|normal|ideal)[^.]*(?:<|<=|below|under)\s*([\d.]+)/i,
    validate: (m) => {
      const val = parseFloat(m[1]);
      return val >= 8.0 && val <= 9.0;
    },
  },
  // --- NLR ---
  {
    label: "NLR optimal 1-3",
    pattern: /nlr[^.]*(?:normal|optimal)[^.]*(\d+\.?\d*)\s*[-–to]+\s*(\d+\.?\d*)/i,
    validate: (m) => {
      const lo = parseFloat(m[1]);
      const hi = parseFloat(m[2]);
      return lo >= 0.5 && lo <= 2.0 && hi >= 2.5 && hi <= 4.0;
    },
  },
  {
    label: "NLR elevated > 5",
    pattern: /nlr[^.]*(?:elevated|high|abnormal)[^.]*(?:>|>=|above|over|exceeds?)\s*([\d.]+)/i,
    validate: (m) => {
      const val = parseFloat(m[1]);
      return val >= 3.0 && val <= 6.0;
    },
  },
  // --- BUN/Creatinine ---
  {
    label: "BUN/Creatinine optimal 10-20",
    pattern: /bun[\/\s]*creatinine[^.]*(?:normal|optimal)[^.]*(\d+\.?\d*)\s*[-–to]+\s*(\d+\.?\d*)/i,
    validate: (m) => {
      const lo = parseFloat(m[1]);
      const hi = parseFloat(m[2]);
      return lo >= 8 && lo <= 12 && hi >= 18 && hi <= 22;
    },
  },
  {
    label: "BUN/Creatinine > 20 pre-renal",
    pattern: /bun[\/\s]*creatinine[^.]*(?:>|>=|above|over|exceeds?)\s*([\d.]+)[^.]*pre[\s-]*renal/i,
    validate: (m) => {
      const val = parseFloat(m[1]);
      return val >= 18 && val <= 25;
    },
  },
  // --- De Ritis Ratio ---
  {
    label: "De Ritis > 2.0 alcoholic liver",
    pattern: /(?:de\s*ritis|ast[\/\s]*alt)[^.]*(?:>|>=|above|over|exceeds?)\s*([\d.]+)[^.]*(?:alcoholic|liver)/i,
    validate: (m) => {
      const val = parseFloat(m[1]);
      return val >= 1.5 && val <= 2.5;
    },
  },
  {
    label: "De Ritis optimal 0.8-1.5",
    pattern: /(?:de\s*ritis|ast[\/\s]*alt)[^.]*(?:optimal|normal)[^.]*(\d+\.?\d*)\s*[-–to]+\s*(\d+\.?\d*)/i,
    validate: (m) => {
      const lo = parseFloat(m[1]);
      const hi = parseFloat(m[2]);
      return lo >= 0.6 && lo <= 1.0 && hi >= 1.2 && hi <= 1.8;
    },
  },
  // --- Researcher citation checks ---
  {
    label: "McLaughlin citation for TG/HDL",
    pattern: /McLaughlin[^.]*(?:tg|triglyceride)[^.]*hdl/i,
    validate: () => true, // Citation itself is factual
  },
  {
    label: "Forget citation for NLR",
    pattern: /Forget[^.]*(?:nlr|neutrophil)/i,
    validate: () => true,
  },
  {
    label: "Simental citation for TyG",
    pattern: /Simental[^.]*(?:tyg|triglyceride|glucose)/i,
    validate: () => true,
  },
  {
    label: "Castelli citation for TC/HDL",
    pattern: /Castelli[^.]*(?:tc|hdl|ldl|lipid|cholesterol|cardiovascular)/i,
    validate: () => true,
  },
  {
    label: "Millán citation for HDL/LDL",
    pattern: /Mill[áa]n[^.]*(?:hdl|ldl|atherogenic|plaque)/i,
    validate: () => true,
  },
  {
    label: "Fest citation for NLR",
    pattern: /Fest[^.]*(?:nlr|neutrophil|inflammation)/i,
    validate: () => true,
  },
  {
    label: "De Ritis / Botros citation",
    pattern: /(?:De\s*Ritis|Botros|Sikaris)[^.]*(?:ast|alt|liver|hepat)/i,
    validate: () => true,
  },
  {
    label: "Hosten citation for BUN/Creatinine",
    pattern: /Hosten[^.]*(?:bun|creatinine|renal|kidney)/i,
    validate: () => true,
  },
];

/**
 * Also check for explicit numeric threshold claims like
 * "TG/HDL ratio of 4.5" or "NLR = 6.2 [elevated]".
 */
function validateExplicitRiskLabels(output: string): {
  correct: number;
  total: number;
} {
  let correct = 0;
  let total = 0;

  // Match patterns like "metric_name: X.XXXX [risk]" or "metric (risk)"
  const riskLabelPattern =
    /(?:hdl\/ldl|tc\/hdl|tg\/hdl|tyg|nlr|bun\/creatinine|de ritis|ast\/alt)[^:]*:\s*([\d.]+)\s*\[(\w+)\]/gi;

  let match: RegExpExecArray | null;
  while ((match = riskLabelPattern.exec(output)) !== null) {
    total++;
    const metricText = match[0].toLowerCase();
    const value = parseFloat(match[1]);
    const claimedRisk = match[2].toLowerCase();

    // Determine which metric key this maps to
    let metricKey: string | null = null;
    if (metricText.includes("hdl/ldl") || metricText.includes("hdl ldl")) {
      metricKey = "hdl_ldl_ratio";
    } else if (metricText.includes("tc/hdl") || metricText.includes("tc hdl")) {
      metricKey = "total_cholesterol_hdl_ratio";
    } else if (metricText.includes("tg/hdl") || metricText.includes("tg hdl")) {
      metricKey = "triglyceride_hdl_ratio";
    } else if (metricText.includes("tyg")) {
      metricKey = "glucose_triglyceride_index";
    } else if (metricText.includes("nlr")) {
      metricKey = "neutrophil_lymphocyte_ratio";
    } else if (metricText.includes("bun")) {
      metricKey = "bun_creatinine_ratio";
    } else if (metricText.includes("de ritis") || metricText.includes("ast/alt")) {
      metricKey = "ast_alt_ratio";
    }

    if (metricKey && METRIC_REFERENCES[metricKey]) {
      const ref = METRIC_REFERENCES[metricKey];
      const [optLo, optHi] = ref.optimal;
      const [, bordHi] = ref.borderline;

      let expectedRisk: string;
      if (value < optLo) expectedRisk = "low";
      else if (value <= optHi) expectedRisk = "optimal";
      else if (value <= bordHi) expectedRisk = "borderline";
      else expectedRisk = "elevated";

      if (claimedRisk === expectedRisk) correct++;
    }
  }

  return { correct, total };
}

export function clinicalFactuality(args: ScorerArgs): {
  name: string;
  score: number;
  metadata: { matched: string[]; failed: string[]; total: number };
} {
  const { output } = args;
  const matched: string[] = [];
  const failed: string[] = [];

  // Check threshold claim patterns
  for (const { label, pattern, validate } of THRESHOLD_PATTERNS) {
    const match = output.match(pattern);
    if (match) {
      if (validate(match)) {
        matched.push(label);
      } else {
        failed.push(label);
      }
    }
  }

  // Check explicit risk label claims
  const riskLabels = validateExplicitRiskLabels(output);
  if (riskLabels.total > 0) {
    matched.push(`${riskLabels.correct}/${riskLabels.total} explicit risk labels correct`);
    if (riskLabels.correct < riskLabels.total) {
      failed.push(
        `${riskLabels.total - riskLabels.correct}/${riskLabels.total} explicit risk labels incorrect`
      );
    }
  }

  const total = matched.length + failed.length;
  const score = total === 0 ? 1.0 : matched.length / total;

  return {
    name: "ClinicalFactuality",
    score,
    metadata: { matched, failed, total },
  };
}
