/**
 * Clinical metrics, risk classification, and Qwen chat client.
 *
 * All embedding operations have been moved to the Python FastAPI service
 * (langgraph/). This module retains only:
 *   - METRIC_REFERENCES + classifyMetricRisk  (trajectory UI + eval scorers)
 *   - computeMetricVelocity                   (trajectory velocity)
 *   - computeDerivedMetrics + MARKER_ALIAS_MAP (trajectory computation)
 *   - MarkerInput type                        (shared type)
 *   - qwen client                             (LLM chat for Q&A + trajectory)
 */

import { QwenClient } from "./qwen-client";

const qwen = new QwenClient({
  apiKey: process.env.DASHSCOPE_API_KEY!,
  baseURL: process.env.DASHSCOPE_BASE_URL,
});

export type MarkerInput = {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  flag: string;
};

/**
 * Clinical reference thresholds for derived biomarker ratios.
 */
export const METRIC_REFERENCES: Record<
  string,
  {
    label: string;
    formula: string;
    unit: string;
    optimal: [number, number];
    borderline: [number, number];
    significance: string;
    author: string;
    reference: string;
  }
> = {
  triglyceride_hdl_ratio: {
    label: "TG/HDL Ratio",
    formula: "Triglycerides / HDL",
    unit: "ratio",
    optimal: [0, 2.0],
    borderline: [2.0, 3.5],
    significance:
      "Insulin resistance surrogate — correlates with small dense LDL particle count",
    author: "McLaughlin et al.",
    reference:
      "McLaughlin T et al. Ann Intern Med. 2003;139(10):802-809. doi:10.7326/0003-4819-139-10-200311180-00007",
  },
  total_cholesterol_hdl_ratio: {
    label: "TC/HDL Ratio",
    formula: "Total Cholesterol / HDL",
    unit: "ratio",
    optimal: [0, 4.0],
    borderline: [4.0, 5.0],
    significance:
      "Cardiovascular risk index — better predictor than LDL alone",
    author: "Castelli et al.",
    reference:
      "Castelli WP. Atherosclerosis. 1996;124 Suppl:S1-9. doi:10.1016/0021-9150(96)05851-0",
  },
  hdl_ldl_ratio: {
    label: "HDL/LDL Ratio",
    formula: "HDL / LDL",
    unit: "ratio",
    optimal: [0.4, Infinity],
    borderline: [0.3, 0.4],
    significance:
      "Atherogenic risk — inversely tracks plaque progression",
    author: "Millán et al.",
    reference:
      "Millán J et al. Vasc Health Risk Manag. 2009;5:757-765. doi:10.2147/vhrm.s6269",
  },
  neutrophil_lymphocyte_ratio: {
    label: "NLR",
    formula: "Neutrophils / Lymphocytes",
    unit: "ratio",
    optimal: [1.0, 3.0],
    borderline: [3.0, 5.0],
    significance:
      "Systemic inflammation index — elevated in infection, stress, malignancy",
    author: "Fest et al.",
    reference:
      "Forget P et al. BMC Res Notes. 2017;10:12. doi:10.1186/s13104-016-2335-5",
  },
  ast_alt_ratio: {
    label: "De Ritis Ratio (AST/ALT)",
    formula: "AST / ALT",
    unit: "ratio",
    optimal: [0.8, 1.5],
    borderline: [1.5, 2.0],
    significance:
      "Liver damage differentiation — high values suggest alcoholic or cardiac origin",
    author: "De Ritis et al.",
    reference:
      "De Ritis F et al. Clin Chim Acta. 1957;2(1):70-74. doi:10.1016/0009-8981(57)90027-X; Botros M, Sikaris KA. Clin Biochem Rev. 2013;34(3):117-130. PMID:24353357",
  },
  bun_creatinine_ratio: {
    label: "BUN/Creatinine",
    formula: "BUN / Creatinine",
    unit: "ratio",
    optimal: [10, 20],
    borderline: [20, 25],
    significance:
      "Renal function — distinguishes pre-renal from intrinsic kidney injury",
    author: "Hosten et al.",
    reference:
      "Hosten AO. Clinical Methods. 3rd ed. Butterworths; 1990. Ch. 193. PMID:21250147",
  },
  glucose_triglyceride_index: {
    label: "TyG Index",
    formula: "ln(TG × Glucose × 0.5)",
    unit: "index",
    optimal: [0, 8.5],
    borderline: [8.5, 9.0],
    significance:
      "Metabolic syndrome predictor — validated against HOMA-IR gold standard",
    author: "Simental-Mendía et al.",
    reference:
      "Simental-Mendía LE et al. Metab Syndr Relat Disord. 2008;6(4):299-304. doi:10.1089/met.2008.0034",
  },
};

export function classifyMetricRisk(
  metricKey: string,
  value: number
): "optimal" | "borderline" | "elevated" | "low" {
  const ref = METRIC_REFERENCES[metricKey];
  if (!ref) return "optimal";
  const [optLo, optHi] = ref.optimal;
  const [, bordHi] = ref.borderline;
  if (value < optLo) return "low";
  if (value <= optHi) return "optimal";
  if (value <= bordHi) return "borderline";
  return "elevated";
}

export function computeMetricVelocity(
  prev: Record<string, number | null>,
  curr: Record<string, number | null>,
  daysBetween: number
): Record<string, number | null> {
  if (daysBetween <= 0) return {};
  const velocity: Record<string, number | null> = {};
  for (const key of Object.keys(curr)) {
    const p = prev[key];
    const c = curr[key];
    velocity[key] = p != null && c != null ? (c - p) / daysBetween : null;
  }
  return velocity;
}

const MARKER_ALIAS_MAP: Record<string, string[]> = {
  hdl: ["hdl", "hdl cholesterol", "hdl-c", "hdl-cholesterol"],
  ldl: ["ldl", "ldl cholesterol", "ldl-c", "ldl-cholesterol"],
  total_cholesterol: [
    "total cholesterol",
    "cholesterol total",
    "cholesterol",
  ],
  triglycerides: ["triglycerides", "triglyceride", "trig"],
  glucose: ["glucose", "fasting glucose", "blood glucose"],
  neutrophils: ["neutrophils", "neutrophil", "neutrophil count", "neut"],
  lymphocytes: ["lymphocytes", "lymphocyte", "lymphocyte count", "lymph"],
  bun: ["bun", "blood urea nitrogen", "urea nitrogen"],
  creatinine: ["creatinine", "creat"],
  ast: ["ast", "aspartate aminotransferase", "sgot"],
  alt: ["alt", "alanine aminotransferase", "sgpt"],
};

/** Compute derived metrics (ratios) from a set of markers. */
export function computeDerivedMetrics(
  markers: MarkerInput[]
): Record<string, number | null> {
  const lookup = new Map<string, number>();
  for (const m of markers) {
    const val = parseFloat(m.value);
    if (!isNaN(val)) {
      lookup.set(m.name.toLowerCase().trim(), val);
    }
  }

  function resolve(key: string): number | null {
    const aliases = MARKER_ALIAS_MAP[key];
    if (!aliases) return null;
    for (const alias of aliases) {
      const val = lookup.get(alias);
      if (val !== undefined) return val;
    }
    return null;
  }

  function ratio(a: string, b: string): number | null {
    const va = resolve(a);
    const vb = resolve(b);
    if (va == null || vb == null || vb === 0) return null;
    return va / vb;
  }

  const trig = resolve("triglycerides");
  const gluc = resolve("glucose");
  const gti =
    trig != null && gluc != null && trig > 0 && gluc > 0
      ? Math.log(trig * gluc * 0.5)
      : null;

  return {
    hdl_ldl_ratio: ratio("hdl", "ldl"),
    total_cholesterol_hdl_ratio: ratio("total_cholesterol", "hdl"),
    triglyceride_hdl_ratio: ratio("triglycerides", "hdl"),
    glucose_triglyceride_index: gti,
    neutrophil_lymphocyte_ratio: ratio("neutrophils", "lymphocytes"),
    bun_creatinine_ratio: ratio("bun", "creatinine"),
    ast_alt_ratio: ratio("ast", "alt"),
  };
}

export { qwen };
