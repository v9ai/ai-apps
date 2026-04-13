import type { MarkerInput } from "../../lib/embeddings";

export type TrajectoryCase = {
  id: string;
  description: string;
  markers: { prev: MarkerInput[]; curr: MarkerInput[] };
  daysBetween: number;
  expectedRisks: Record<string, "optimal" | "borderline" | "elevated" | "low">;
  expectedDirection: Record<
    string,
    "improving" | "stable" | "deteriorating"
  >;
  groundTruthSummary: string;
};

/**
 * 15 trajectory test cases covering diverse metabolic profiles,
 * edge cases, and clinical scenarios.
 *
 * Cases 1-10 cover core metabolic trajectory scenarios.
 * Cases 11-15 cover special scenarios (all-low, mixed renal+metabolic,
 * velocity acceleration, identical states, boundary thresholds).
 */
export const trajectoryCases: TrajectoryCase[] = [
  // -----------------------------------------------------------------------
  // 1. Improving cholesterol profile
  // -----------------------------------------------------------------------
  {
    id: "improving-cholesterol",
    description:
      "Cholesterol lipid panel improving from elevated to optimal over 180 days",
    markers: {
      prev: [
        { name: "HDL", value: "42", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "180", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "265", unit: "mg/dL", reference_range: "0-200", flag: "high" },
        { name: "Triglycerides", value: "195", unit: "mg/dL", reference_range: "0-150", flag: "high" },
        { name: "Glucose", value: "98", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "3500", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "2000", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "14", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "0.9", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "25", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "28", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
      curr: [
        { name: "HDL", value: "55", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "110", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "195", unit: "mg/dL", reference_range: "0-200", flag: "normal" },
        { name: "Triglycerides", value: "115", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "92", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "3200", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "1900", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "13", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "0.9", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "22", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "24", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
    },
    daysBetween: 180,
    expectedRisks: {
      hdl_ldl_ratio: "optimal",
      total_cholesterol_hdl_ratio: "optimal",
      triglyceride_hdl_ratio: "optimal",
      glucose_triglyceride_index: "optimal",
      neutrophil_lymphocyte_ratio: "optimal",
      bun_creatinine_ratio: "optimal",
      ast_alt_ratio: "optimal",
    },
    expectedDirection: {
      hdl_ldl_ratio: "improving",
      total_cholesterol_hdl_ratio: "improving",
      triglyceride_hdl_ratio: "improving",
      glucose_triglyceride_index: "improving",
    },
    groundTruthSummary:
      "All lipid ratios have improved to optimal levels. HDL/LDL ratio rose from ~0.23 to ~0.50. TC/HDL dropped from ~6.31 to ~3.55. TG/HDL dropped from ~4.64 to ~2.09, now borderline. The trajectory shows clear cardiovascular risk improvement over 180 days.",
  },

  // -----------------------------------------------------------------------
  // 2. Worsening metabolic markers with TyG index
  // -----------------------------------------------------------------------
  {
    id: "worsening-metabolic",
    description:
      "Metabolic markers worsening: TyG index and TG/HDL rising from optimal to elevated",
    markers: {
      prev: [
        { name: "HDL", value: "60", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "100", unit: "mg/dL", reference_range: "0-100", flag: "normal" },
        { name: "Total Cholesterol", value: "200", unit: "mg/dL", reference_range: "0-200", flag: "normal" },
        { name: "Triglycerides", value: "105", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "92", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "3000", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "1800", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "15", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "22", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "20", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
      curr: [
        { name: "HDL", value: "48", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "145", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "245", unit: "mg/dL", reference_range: "0-200", flag: "high" },
        { name: "Triglycerides", value: "210", unit: "mg/dL", reference_range: "0-150", flag: "high" },
        { name: "Glucose", value: "135", unit: "mg/dL", reference_range: "70-100", flag: "high" },
        { name: "Neutrophils", value: "3400", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "1700", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "16", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "28", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "24", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
    },
    daysBetween: 180,
    expectedRisks: {
      triglyceride_hdl_ratio: "elevated",
      glucose_triglyceride_index: "elevated",
      total_cholesterol_hdl_ratio: "borderline",
      hdl_ldl_ratio: "low",
    },
    expectedDirection: {
      triglyceride_hdl_ratio: "deteriorating",
      glucose_triglyceride_index: "deteriorating",
      total_cholesterol_hdl_ratio: "deteriorating",
      hdl_ldl_ratio: "deteriorating",
    },
    groundTruthSummary:
      "TG/HDL ratio rose from 1.75 to 4.38 (elevated), indicating insulin resistance per McLaughlin et al. TyG index rose from ~8.27 to ~9.15 (elevated), per Simental-Mendia. Metabolic markers have significantly worsened, suggesting developing insulin resistance.",
  },

  // -----------------------------------------------------------------------
  // 3. Stable trajectory with all optimal
  // -----------------------------------------------------------------------
  {
    id: "stable-optimal",
    description: "Stable trajectory with minimal changes, all metrics optimal",
    markers: {
      prev: [
        { name: "HDL", value: "55", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "95", unit: "mg/dL", reference_range: "0-100", flag: "normal" },
        { name: "Total Cholesterol", value: "185", unit: "mg/dL", reference_range: "0-200", flag: "normal" },
        { name: "Triglycerides", value: "100", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "88", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "3800", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "2000", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "14", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "0.9", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "24", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "22", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
      curr: [
        { name: "HDL", value: "54", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "98", unit: "mg/dL", reference_range: "0-100", flag: "normal" },
        { name: "Total Cholesterol", value: "188", unit: "mg/dL", reference_range: "0-200", flag: "normal" },
        { name: "Triglycerides", value: "105", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "90", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "3700", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "2100", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "15", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "0.9", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "23", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "23", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
    },
    daysBetween: 90,
    expectedRisks: {
      hdl_ldl_ratio: "optimal",
      total_cholesterol_hdl_ratio: "optimal",
      triglyceride_hdl_ratio: "optimal",
      glucose_triglyceride_index: "optimal",
      neutrophil_lymphocyte_ratio: "optimal",
      bun_creatinine_ratio: "optimal",
      ast_alt_ratio: "optimal",
    },
    expectedDirection: {
      hdl_ldl_ratio: "stable",
      total_cholesterol_hdl_ratio: "stable",
      triglyceride_hdl_ratio: "stable",
      neutrophil_lymphocyte_ratio: "stable",
      bun_creatinine_ratio: "stable",
      ast_alt_ratio: "stable",
    },
    groundTruthSummary:
      "All derived metrics remain in the optimal range with negligible changes. The trajectory is stable, indicating consistent health maintenance. No clinically significant shifts detected.",
  },

  // -----------------------------------------------------------------------
  // 4. Mixed trends: cholesterol improving, NLR worsening
  // -----------------------------------------------------------------------
  {
    id: "mixed-cholesterol-nlr",
    description:
      "Mixed: cholesterol improving while NLR inflammation marker worsening",
    markers: {
      prev: [
        { name: "HDL", value: "46", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "170", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "245", unit: "mg/dL", reference_range: "0-200", flag: "high" },
        { name: "Triglycerides", value: "160", unit: "mg/dL", reference_range: "0-150", flag: "high" },
        { name: "Glucose", value: "95", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "4200", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "2000", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "14", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "25", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "28", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
      curr: [
        { name: "HDL", value: "54", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "105", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "190", unit: "mg/dL", reference_range: "0-200", flag: "normal" },
        { name: "Triglycerides", value: "110", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "90", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "8000", unit: "/uL", reference_range: "2000-7000", flag: "high" },
        { name: "Lymphocytes", value: "1500", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "15", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "24", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "26", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
    },
    daysBetween: 178,
    expectedRisks: {
      hdl_ldl_ratio: "optimal",
      total_cholesterol_hdl_ratio: "optimal",
      triglyceride_hdl_ratio: "optimal",
      neutrophil_lymphocyte_ratio: "elevated",
    },
    expectedDirection: {
      hdl_ldl_ratio: "improving",
      total_cholesterol_hdl_ratio: "improving",
      triglyceride_hdl_ratio: "improving",
      neutrophil_lymphocyte_ratio: "deteriorating",
    },
    groundTruthSummary:
      "Lipid ratios have improved substantially: TC/HDL from ~5.33 to ~3.52 (optimal), HDL/LDL from ~0.27 to ~0.51 (optimal). However, NLR has risen from 2.1 to 5.33, now elevated per Forget et al. (threshold 3.0-5.0 borderline, >5.0 elevated). This mixed pattern warrants attention to the inflammatory marker despite cardiovascular improvement.",
  },

  // -----------------------------------------------------------------------
  // 5. Liver function deterioration (De Ritis ratio)
  // -----------------------------------------------------------------------
  {
    id: "liver-deritis-worsening",
    description: "De Ritis ratio rising from optimal to elevated, suggesting liver concern",
    markers: {
      prev: [
        { name: "HDL", value: "50", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "110", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "200", unit: "mg/dL", reference_range: "0-200", flag: "normal" },
        { name: "Triglycerides", value: "120", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "90", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "3500", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "2000", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "15", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "32", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "30", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
      curr: [
        { name: "HDL", value: "48", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "115", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "205", unit: "mg/dL", reference_range: "0-200", flag: "high" },
        { name: "Triglycerides", value: "130", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "94", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "3600", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "1900", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "16", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "68", unit: "U/L", reference_range: "10-40", flag: "high" },
        { name: "ALT", value: "30", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
    },
    daysBetween: 152,
    expectedRisks: {
      ast_alt_ratio: "elevated",
      bun_creatinine_ratio: "optimal",
    },
    expectedDirection: {
      ast_alt_ratio: "deteriorating",
      bun_creatinine_ratio: "stable",
    },
    groundTruthSummary:
      "De Ritis ratio (AST/ALT) rose from 1.07 (optimal) to 2.27 (elevated). Per Botros & Sikaris, a ratio >2.0 suggests possible alcoholic liver disease pattern. AST increased significantly while ALT remained stable. BUN/Creatinine remains optimal. Liver function follow-up is warranted.",
  },

  // -----------------------------------------------------------------------
  // 6. Rapid NLR spike (inflammation)
  // -----------------------------------------------------------------------
  {
    id: "rapid-nlr-spike",
    description: "Rapid NLR increase from optimal to elevated over 45 days",
    markers: {
      prev: [
        { name: "HDL", value: "52", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "100", unit: "mg/dL", reference_range: "0-100", flag: "normal" },
        { name: "Total Cholesterol", value: "192", unit: "mg/dL", reference_range: "0-200", flag: "normal" },
        { name: "Triglycerides", value: "90", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "88", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "4000", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "2000", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "13", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "0.9", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "22", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "20", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
      curr: [
        { name: "HDL", value: "50", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "105", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "198", unit: "mg/dL", reference_range: "0-200", flag: "normal" },
        { name: "Triglycerides", value: "95", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "90", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "7500", unit: "/uL", reference_range: "2000-7000", flag: "high" },
        { name: "Lymphocytes", value: "1200", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "14", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "0.9", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "24", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "22", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
    },
    daysBetween: 45,
    expectedRisks: {
      neutrophil_lymphocyte_ratio: "elevated",
      hdl_ldl_ratio: "optimal",
      triglyceride_hdl_ratio: "optimal",
    },
    expectedDirection: {
      neutrophil_lymphocyte_ratio: "deteriorating",
      hdl_ldl_ratio: "stable",
      triglyceride_hdl_ratio: "stable",
    },
    groundTruthSummary:
      "NLR surged from 2.0 (optimal) to 6.25 (elevated) in just 45 days. Per Forget et al., NLR >5.0 indicates significant systemic inflammation. The rapid rate of change (~0.094/day) is clinically concerning. All other metrics remain stable. Urgent medical consultation recommended.",
  },

  // -----------------------------------------------------------------------
  // 7. Recovery pattern: elevated to optimal
  // -----------------------------------------------------------------------
  {
    id: "recovery-pattern",
    description:
      "Recovery from elevated cardiovascular and metabolic risk to optimal",
    markers: {
      prev: [
        { name: "HDL", value: "40", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "185", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "270", unit: "mg/dL", reference_range: "0-200", flag: "high" },
        { name: "Triglycerides", value: "210", unit: "mg/dL", reference_range: "0-150", flag: "high" },
        { name: "Glucose", value: "128", unit: "mg/dL", reference_range: "70-100", flag: "high" },
        { name: "Neutrophils", value: "4500", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "2000", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "16", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "30", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "28", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
      curr: [
        { name: "HDL", value: "58", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "100", unit: "mg/dL", reference_range: "0-100", flag: "normal" },
        { name: "Total Cholesterol", value: "188", unit: "mg/dL", reference_range: "0-200", flag: "normal" },
        { name: "Triglycerides", value: "88", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "90", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "3800", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "2000", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "14", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "26", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "24", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
    },
    daysBetween: 245,
    expectedRisks: {
      hdl_ldl_ratio: "optimal",
      total_cholesterol_hdl_ratio: "optimal",
      triglyceride_hdl_ratio: "optimal",
      glucose_triglyceride_index: "optimal",
    },
    expectedDirection: {
      hdl_ldl_ratio: "improving",
      total_cholesterol_hdl_ratio: "improving",
      triglyceride_hdl_ratio: "improving",
      glucose_triglyceride_index: "improving",
    },
    groundTruthSummary:
      "Dramatic recovery across all cardiovascular and metabolic markers. HDL/LDL improved from ~0.22 (low) to ~0.58 (optimal). TC/HDL dropped from 6.75 (elevated) to 3.24 (optimal). TG/HDL dropped from 5.25 (elevated) to 1.52 (optimal). TyG index normalized. This indicates successful intervention or lifestyle changes.",
  },

  // -----------------------------------------------------------------------
  // 8. All metrics elevated (high-risk profile)
  // -----------------------------------------------------------------------
  {
    id: "all-elevated",
    description: "All seven derived metrics in elevated range, multi-system risk",
    markers: {
      prev: [
        { name: "HDL", value: "42", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "195", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "280", unit: "mg/dL", reference_range: "0-200", flag: "high" },
        { name: "Triglycerides", value: "230", unit: "mg/dL", reference_range: "0-150", flag: "high" },
        { name: "Glucose", value: "142", unit: "mg/dL", reference_range: "70-100", flag: "high" },
        { name: "Neutrophils", value: "6500", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "1200", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "27", unit: "mg/dL", reference_range: "7-20", flag: "high" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "75", unit: "U/L", reference_range: "10-40", flag: "high" },
        { name: "ALT", value: "30", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
      curr: [
        { name: "HDL", value: "40", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "200", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "285", unit: "mg/dL", reference_range: "0-200", flag: "high" },
        { name: "Triglycerides", value: "250", unit: "mg/dL", reference_range: "0-150", flag: "high" },
        { name: "Glucose", value: "150", unit: "mg/dL", reference_range: "70-100", flag: "high" },
        { name: "Neutrophils", value: "7200", unit: "/uL", reference_range: "2000-7000", flag: "high" },
        { name: "Lymphocytes", value: "1100", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "29", unit: "mg/dL", reference_range: "7-20", flag: "high" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "82", unit: "U/L", reference_range: "10-40", flag: "high" },
        { name: "ALT", value: "30", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
    },
    daysBetween: 182,
    expectedRisks: {
      hdl_ldl_ratio: "low",
      total_cholesterol_hdl_ratio: "elevated",
      triglyceride_hdl_ratio: "elevated",
      glucose_triglyceride_index: "elevated",
      neutrophil_lymphocyte_ratio: "elevated",
      bun_creatinine_ratio: "elevated",
      ast_alt_ratio: "elevated",
    },
    expectedDirection: {
      total_cholesterol_hdl_ratio: "deteriorating",
      triglyceride_hdl_ratio: "deteriorating",
      glucose_triglyceride_index: "deteriorating",
      neutrophil_lymphocyte_ratio: "deteriorating",
      bun_creatinine_ratio: "deteriorating",
      ast_alt_ratio: "deteriorating",
    },
    groundTruthSummary:
      "All seven derived metrics are elevated, representing a multi-system risk profile: cardiovascular (TC/HDL ~7.13, HDL/LDL ~0.20 low), metabolic (TG/HDL ~6.25, TyG ~9.43), inflammatory (NLR ~6.55), renal (BUN/Cr ~29.0), and hepatic (De Ritis ~2.73). All metrics are worsening. Comprehensive urgent medical evaluation is needed.",
  },

  // -----------------------------------------------------------------------
  // 9. Renal + liver focus (BUN/Creatinine and De Ritis)
  // -----------------------------------------------------------------------
  {
    id: "renal-liver-focus",
    description:
      "BUN/Creatinine and De Ritis ratio both deteriorating from optimal to elevated",
    markers: {
      prev: [
        { name: "HDL", value: "55", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "100", unit: "mg/dL", reference_range: "0-100", flag: "normal" },
        { name: "Total Cholesterol", value: "190", unit: "mg/dL", reference_range: "0-200", flag: "normal" },
        { name: "Triglycerides", value: "100", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "88", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "3500", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "2000", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "14", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "28", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "30", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
      curr: [
        { name: "HDL", value: "52", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "105", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "195", unit: "mg/dL", reference_range: "0-200", flag: "normal" },
        { name: "Triglycerides", value: "108", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "92", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "3800", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "1900", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "28", unit: "mg/dL", reference_range: "7-20", flag: "high" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "72", unit: "U/L", reference_range: "10-40", flag: "high" },
        { name: "ALT", value: "30", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
    },
    daysBetween: 136,
    expectedRisks: {
      bun_creatinine_ratio: "elevated",
      ast_alt_ratio: "elevated",
      hdl_ldl_ratio: "optimal",
      total_cholesterol_hdl_ratio: "optimal",
    },
    expectedDirection: {
      bun_creatinine_ratio: "deteriorating",
      ast_alt_ratio: "deteriorating",
      hdl_ldl_ratio: "stable",
      total_cholesterol_hdl_ratio: "stable",
    },
    groundTruthSummary:
      "BUN/Creatinine rose from 14.0 (optimal) to 28.0 (elevated), suggesting possible pre-renal azotemia per Hosten. De Ritis ratio rose from 0.93 (optimal) to 2.40 (elevated), suggesting hepatocellular concern per De Ritis/Botros. Lipid ratios remain stable and optimal. Parallel renal and hepatic deterioration requires comprehensive follow-up.",
  },

  // -----------------------------------------------------------------------
  // 10. Single snapshot (no trend possible)
  // -----------------------------------------------------------------------
  {
    id: "single-snapshot",
    description: "Single test result with no prior data to establish trend",
    markers: {
      prev: [
        { name: "HDL", value: "50", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "130", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "215", unit: "mg/dL", reference_range: "0-200", flag: "high" },
        { name: "Triglycerides", value: "130", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "95", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "4000", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "2000", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "15", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "25", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "22", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
      curr: [
        { name: "HDL", value: "50", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "130", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "215", unit: "mg/dL", reference_range: "0-200", flag: "high" },
        { name: "Triglycerides", value: "130", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "95", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "4000", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "2000", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "15", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "25", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "22", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
    },
    daysBetween: 0,
    expectedRisks: {
      hdl_ldl_ratio: "borderline",
      total_cholesterol_hdl_ratio: "optimal",
      triglyceride_hdl_ratio: "optimal",
      glucose_triglyceride_index: "optimal",
      neutrophil_lymphocyte_ratio: "optimal",
      bun_creatinine_ratio: "optimal",
      ast_alt_ratio: "optimal",
    },
    expectedDirection: {
      hdl_ldl_ratio: "stable",
      total_cholesterol_hdl_ratio: "stable",
      triglyceride_hdl_ratio: "stable",
    },
    groundTruthSummary:
      "Single snapshot only. TC/HDL 4.30 (optimal), HDL/LDL 0.38 (borderline), TG/HDL 2.60 (borderline). Most metrics are optimal. No trend analysis possible without prior data. Follow-up testing recommended to establish baseline trajectory.",
  },

  // -----------------------------------------------------------------------
  // 11. All-low profile
  // -----------------------------------------------------------------------
  {
    id: "all-low-profile",
    description: "All ratio metrics below optimal range lower bound",
    markers: {
      prev: [
        { name: "HDL", value: "75", unit: "mg/dL", reference_range: "40-60", flag: "high" },
        { name: "LDL", value: "180", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "130", unit: "mg/dL", reference_range: "0-200", flag: "normal" },
        { name: "Triglycerides", value: "45", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "72", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "2200", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "3500", unit: "/uL", reference_range: "1000-3000", flag: "high" },
        { name: "BUN", value: "8", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "1.2", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "12", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "20", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
      curr: [
        { name: "HDL", value: "78", unit: "mg/dL", reference_range: "40-60", flag: "high" },
        { name: "LDL", value: "185", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "125", unit: "mg/dL", reference_range: "0-200", flag: "normal" },
        { name: "Triglycerides", value: "40", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "70", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "2000", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "3800", unit: "/uL", reference_range: "1000-3000", flag: "high" },
        { name: "BUN", value: "7", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "1.3", unit: "mg/dL", reference_range: "0.6-1.2", flag: "high" },
        { name: "AST", value: "10", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "18", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
    },
    daysBetween: 120,
    expectedRisks: {
      hdl_ldl_ratio: "optimal",
      total_cholesterol_hdl_ratio: "optimal",
      triglyceride_hdl_ratio: "optimal",
      neutrophil_lymphocyte_ratio: "low",
      bun_creatinine_ratio: "low",
      ast_alt_ratio: "low",
    },
    expectedDirection: {
      neutrophil_lymphocyte_ratio: "deteriorating",
      bun_creatinine_ratio: "deteriorating",
      ast_alt_ratio: "stable",
    },
    groundTruthSummary:
      "Multiple ratios are below the optimal lower bound. NLR ~0.53 (low, normal is 1.0-3.0), potentially indicating relative lymphocytosis or neutropenia. BUN/Creatinine ~5.38 (low, normal is 10-20), possibly indicating low protein intake or liver disease. De Ritis ratio ~0.56 (low, normal 0.8-1.2). While low values for lipid ratios (TG/HDL, TC/HDL) are favorable, the low NLR, BUN/Cr, and De Ritis ratios warrant clinical investigation.",
  },

  // -----------------------------------------------------------------------
  // 12. Mixed renal + metabolic
  // -----------------------------------------------------------------------
  {
    id: "mixed-renal-metabolic",
    description:
      "BUN/Creatinine elevated with concurrent metabolic derangement",
    markers: {
      prev: [
        { name: "HDL", value: "50", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "120", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "210", unit: "mg/dL", reference_range: "0-200", flag: "high" },
        { name: "Triglycerides", value: "140", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "105", unit: "mg/dL", reference_range: "70-100", flag: "high" },
        { name: "Neutrophils", value: "4000", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "2000", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "22", unit: "mg/dL", reference_range: "7-20", flag: "high" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "30", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "28", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
      curr: [
        { name: "HDL", value: "44", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "155", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "248", unit: "mg/dL", reference_range: "0-200", flag: "high" },
        { name: "Triglycerides", value: "200", unit: "mg/dL", reference_range: "0-150", flag: "high" },
        { name: "Glucose", value: "130", unit: "mg/dL", reference_range: "70-100", flag: "high" },
        { name: "Neutrophils", value: "4200", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "1800", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "28", unit: "mg/dL", reference_range: "7-20", flag: "high" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "35", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "30", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
    },
    daysBetween: 150,
    expectedRisks: {
      bun_creatinine_ratio: "elevated",
      triglyceride_hdl_ratio: "elevated",
      glucose_triglyceride_index: "elevated",
      total_cholesterol_hdl_ratio: "elevated",
      hdl_ldl_ratio: "low",
    },
    expectedDirection: {
      bun_creatinine_ratio: "deteriorating",
      triglyceride_hdl_ratio: "deteriorating",
      glucose_triglyceride_index: "deteriorating",
      total_cholesterol_hdl_ratio: "deteriorating",
    },
    groundTruthSummary:
      "Combined renal and metabolic deterioration. BUN/Creatinine rose from 22.0 (borderline) to 28.0 (elevated), indicating worsening pre-renal concern per Hosten. TG/HDL increased from 2.80 to 4.55 (elevated), and TyG index from ~8.57 to ~9.12 (elevated), suggesting insulin resistance per McLaughlin and Simental-Mendia. TC/HDL worsened from 4.20 to 5.64 (elevated). Multi-system deterioration requires coordinated care.",
  },

  // -----------------------------------------------------------------------
  // 13. Velocity acceleration — metrics worsening faster
  // -----------------------------------------------------------------------
  {
    id: "velocity-acceleration",
    description:
      "Metrics deteriorating with accelerating velocity between time points",
    markers: {
      prev: [
        { name: "HDL", value: "55", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "120", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "210", unit: "mg/dL", reference_range: "0-200", flag: "high" },
        { name: "Triglycerides", value: "130", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "100", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "3500", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "2000", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "15", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "0.9", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "25", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "25", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
      curr: [
        { name: "HDL", value: "44", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "170", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "265", unit: "mg/dL", reference_range: "0-200", flag: "high" },
        { name: "Triglycerides", value: "220", unit: "mg/dL", reference_range: "0-150", flag: "high" },
        { name: "Glucose", value: "138", unit: "mg/dL", reference_range: "70-100", flag: "high" },
        { name: "Neutrophils", value: "5500", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "1500", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "22", unit: "mg/dL", reference_range: "7-20", flag: "high" },
        { name: "Creatinine", value: "0.9", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "45", unit: "U/L", reference_range: "10-40", flag: "high" },
        { name: "ALT", value: "30", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
    },
    daysBetween: 60,
    expectedRisks: {
      hdl_ldl_ratio: "low",
      total_cholesterol_hdl_ratio: "elevated",
      triglyceride_hdl_ratio: "elevated",
      glucose_triglyceride_index: "elevated",
      neutrophil_lymphocyte_ratio: "borderline",
      bun_creatinine_ratio: "borderline",
      ast_alt_ratio: "borderline",
    },
    expectedDirection: {
      hdl_ldl_ratio: "deteriorating",
      total_cholesterol_hdl_ratio: "deteriorating",
      triglyceride_hdl_ratio: "deteriorating",
      glucose_triglyceride_index: "deteriorating",
      neutrophil_lymphocyte_ratio: "deteriorating",
      bun_creatinine_ratio: "deteriorating",
      ast_alt_ratio: "deteriorating",
    },
    groundTruthSummary:
      "All metrics deteriorated significantly in just 60 days, representing rapid health decline. TC/HDL jumped from 3.82 to 6.02 (elevated), TG/HDL from 2.36 to 5.00 (elevated), TyG from ~8.47 to ~9.14 (elevated). The velocity is high: TC/HDL changing at ~0.037/day, TG/HDL at ~0.044/day. This rate of deterioration is alarming and warrants urgent evaluation.",
  },

  // -----------------------------------------------------------------------
  // 14. Identical states (stable)
  // -----------------------------------------------------------------------
  {
    id: "identical-states",
    description: "Two identical blood test snapshots with zero velocity",
    markers: {
      prev: [
        { name: "HDL", value: "52", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "110", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "200", unit: "mg/dL", reference_range: "0-200", flag: "normal" },
        { name: "Triglycerides", value: "115", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "92", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "3600", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "1800", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "14", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "0.9", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "24", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "22", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
      curr: [
        { name: "HDL", value: "52", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "110", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "200", unit: "mg/dL", reference_range: "0-200", flag: "normal" },
        { name: "Triglycerides", value: "115", unit: "mg/dL", reference_range: "0-150", flag: "normal" },
        { name: "Glucose", value: "92", unit: "mg/dL", reference_range: "70-100", flag: "normal" },
        { name: "Neutrophils", value: "3600", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "1800", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "14", unit: "mg/dL", reference_range: "7-20", flag: "normal" },
        { name: "Creatinine", value: "0.9", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "24", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "22", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
    },
    daysBetween: 90,
    expectedRisks: {
      hdl_ldl_ratio: "optimal",
      total_cholesterol_hdl_ratio: "optimal",
      triglyceride_hdl_ratio: "optimal",
      glucose_triglyceride_index: "optimal",
      neutrophil_lymphocyte_ratio: "optimal",
      bun_creatinine_ratio: "optimal",
      ast_alt_ratio: "optimal",
    },
    expectedDirection: {
      hdl_ldl_ratio: "stable",
      total_cholesterol_hdl_ratio: "stable",
      triglyceride_hdl_ratio: "stable",
      glucose_triglyceride_index: "stable",
      neutrophil_lymphocyte_ratio: "stable",
      bun_creatinine_ratio: "stable",
      ast_alt_ratio: "stable",
    },
    groundTruthSummary:
      "Identical results across both time points. All metrics are in the optimal range. Zero velocity on every metric. The trajectory is perfectly stable with no change whatsoever. This is consistent with well-maintained health or could indicate lab reproducibility.",
  },

  // -----------------------------------------------------------------------
  // 15. Boundary thresholds — right at borderline/elevated edges
  // -----------------------------------------------------------------------
  {
    id: "boundary-thresholds",
    description:
      "Values right at borderline/elevated boundary for multiple metrics",
    markers: {
      prev: [
        { name: "HDL", value: "50", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "125", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "225", unit: "mg/dL", reference_range: "0-200", flag: "high" },
        { name: "Triglycerides", value: "175", unit: "mg/dL", reference_range: "0-150", flag: "high" },
        { name: "Glucose", value: "108", unit: "mg/dL", reference_range: "70-100", flag: "high" },
        { name: "Neutrophils", value: "5000", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "1000", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "25", unit: "mg/dL", reference_range: "7-20", flag: "high" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "40", unit: "U/L", reference_range: "10-40", flag: "normal" },
        { name: "ALT", value: "20", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
      curr: [
        { name: "HDL", value: "50", unit: "mg/dL", reference_range: "40-60", flag: "normal" },
        { name: "LDL", value: "125", unit: "mg/dL", reference_range: "0-100", flag: "high" },
        { name: "Total Cholesterol", value: "275", unit: "mg/dL", reference_range: "0-200", flag: "high" },
        { name: "Triglycerides", value: "176", unit: "mg/dL", reference_range: "0-150", flag: "high" },
        { name: "Glucose", value: "110", unit: "mg/dL", reference_range: "70-100", flag: "high" },
        { name: "Neutrophils", value: "5100", unit: "/uL", reference_range: "2000-7000", flag: "normal" },
        { name: "Lymphocytes", value: "1000", unit: "/uL", reference_range: "1000-3000", flag: "normal" },
        { name: "BUN", value: "26", unit: "mg/dL", reference_range: "7-20", flag: "high" },
        { name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6-1.2", flag: "normal" },
        { name: "AST", value: "41", unit: "U/L", reference_range: "10-40", flag: "high" },
        { name: "ALT", value: "20", unit: "U/L", reference_range: "10-40", flag: "normal" },
      ],
    },
    daysBetween: 30,
    expectedRisks: {
      hdl_ldl_ratio: "low",
      total_cholesterol_hdl_ratio: "elevated",
      triglyceride_hdl_ratio: "borderline",
      neutrophil_lymphocyte_ratio: "elevated",
      bun_creatinine_ratio: "elevated",
      ast_alt_ratio: "elevated",
    },
    expectedDirection: {
      total_cholesterol_hdl_ratio: "deteriorating",
      triglyceride_hdl_ratio: "stable",
      neutrophil_lymphocyte_ratio: "stable",
      bun_creatinine_ratio: "deteriorating",
      ast_alt_ratio: "deteriorating",
    },
    groundTruthSummary:
      "Multiple metrics sit right at or just past the borderline/elevated boundary. TC/HDL is 5.50 (borderline/elevated boundary). TG/HDL is 3.52 (borderline, just past 3.5 boundary). NLR is 5.10 (just past 5.0, elevated). BUN/Cr is 26.0 (just past 25, elevated). De Ritis is 2.05 (just past 2.0, elevated). These boundary cases are clinically significant because small lab variations could shift the classification. Serial monitoring is essential.",
  },
];
