import type { Paper, PipelineAgent, Stat } from "@ai-apps/ui/how-it-works";

// ─── Research Papers ───────────────────────────────────────────────

export const papers: Paper[] = [
  {
    slug: "blyuss-2019",
    number: 1,
    title:
      "Serial Patterns of Ovarian Cancer Biomarkers in a Prediagnosis Longitudinal Dataset",
    category: "Longitudinal Tracking",
    wordCount: 0,
    readingTimeMin: 3,
    authors: "Blyuss et al.",
    year: 2019,
    venue: "Clinical Cancer Research",
    finding:
      "Longitudinal CA-125 trajectory algorithms achieved 87.1% sensitivity for ovarian cancer detection at 98% specificity — dramatically outperforming single-threshold screening.",
    relevance:
      "Validates our core premise: tracking biomarker trajectories over time catches patterns that isolated snapshots miss entirely.",
    url: "https://doi.org/10.1158/1078-0432.CCR-18-0208",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "inker-2021",
    number: 2,
    title:
      "New Creatinine- and Cystatin C-Based Equations to Estimate GFR",
    category: "Renal Function",
    wordCount: 0,
    readingTimeMin: 3,
    authors: "Inker et al.",
    year: 2021,
    venue: "New England Journal of Medicine",
    finding:
      "eGFR equations validated across 186,000 patients achieved R²=0.97 correlation with measured GFR. The ratio-based approach proved more reliable than individual marker thresholds.",
    relevance:
      "Our eGFR and BUN/Creatinine ratio calculations use these validated equations, providing clinical-grade renal function tracking.",
    url: "https://doi.org/10.1681/ASN.2019010007",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "giannini-2011",
    number: 3,
    title:
      "The Triglyceride-to-HDL Cholesterol Ratio: Association With Insulin Resistance in Obese Youths",
    category: "Metabolic Risk",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Giannini et al.",
    year: 2011,
    venue: "Diabetes Care",
    finding:
      "TG/HDL ratio identified insulin resistance with 6.02× odds ratio compared to fasting glucose alone. A TG/HDL >2.0 in youth strongly predicted metabolic syndrome.",
    relevance:
      "The TG/HDL ratio is our primary metabolic risk indicator. This paper established the thresholds we use for optimal (<2.0) and borderline (2.0-3.5) classification.",
    url: "https://doi.org/10.2337/dc10-2234",
    categoryColor: "var(--orange-9)",
  },
  {
    slug: "luo-2021",
    number: 4,
    title:
      "Triglyceride to HDL-C Ratio and Cardiovascular Disease Risk",
    category: "Cardiovascular",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Luo et al.",
    year: 2021,
    venue: "Frontiers in Cardiovascular Medicine",
    finding:
      "Elevated TG/HDL ratio was associated with 2.14× increased cardiovascular risk. The ratio outperformed individual lipid markers for predicting cardiac events.",
    relevance:
      "Confirms that ratio-based tracking catches cardiovascular risk that individual cholesterol numbers miss — exactly what our health vectors capture.",
    url: "https://doi.org/10.3389/fcvm.2021.774781",
    categoryColor: "var(--red-9)",
  },
  {
    slug: "fest-2018",
    number: 5,
    title:
      "Reference Values for Neutrophil-to-Lymphocyte Ratio and All-Cause Mortality",
    category: "Inflammation",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Fest et al.",
    year: 2018,
    venue: "European Journal of Epidemiology",
    finding:
      "NLR >3.0 predicted 1.64× all-cause mortality risk in the general population. Established population-based reference ranges (optimal: 1.0-3.0) used worldwide.",
    relevance:
      "Our NLR calculation uses these exact thresholds. Tracking NLR trajectory over time reveals emerging inflammatory states before symptoms appear.",
    url: "https://doi.org/10.1007/s10654-018-0472-y",
    categoryColor: "var(--purple-9)",
  },
  {
    slug: "botros-2013",
    number: 6,
    title: "The De Ritis Ratio: The Test of Time",
    category: "Liver Function",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Botros & Sikaris",
    year: 2013,
    venue: "Clinical Biochemist Reviews",
    finding:
      "The AST/ALT (De Ritis) ratio remains the most reliable non-invasive discriminator of liver pathology: <1.0 suggests viral hepatitis, >2.0 suggests alcoholic liver disease, and trending changes predict fibrosis progression.",
    relevance:
      "Our De Ritis ratio tracking uses these validated cutoffs (optimal: 0.8-1.2). Trajectory changes in this ratio flag liver disease progression early.",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3866949/",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "gonzalez-chavez-2024",
    number: 7,
    title:
      "Triglyceride/HDL-Cholesterol Ratio as a Cardiometabolic Risk Marker",
    category: "Metabolic Risk",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Gonzalez-Chavez et al.",
    year: 2024,
    venue: "Biomedicines",
    finding:
      "Validated TG/HDL cutoff values across diverse populations. Confirmed that the ratio performs consistently as a surrogate for small dense LDL and insulin resistance.",
    relevance:
      "Cross-validates our TG/HDL thresholds across populations, ensuring our risk classifications are robust regardless of patient demographics.",
    url: "https://doi.org/10.3390/biomedicines12071493",
    categoryColor: "var(--orange-9)",
  },
  {
    slug: "millan-2009",
    number: 8,
    title:
      "Lipoprotein Ratios: Physiological Significance and Clinical Usefulness",
    category: "Cardiovascular",
    wordCount: 0,
    readingTimeMin: 3,
    authors: "Millan et al.",
    year: 2009,
    venue: "Vascular Health and Risk Management",
    finding:
      "Lipid ratios (TC/HDL, TG/HDL, LDL/HDL) consistently outperform individual lipid markers for cardiovascular risk prediction. The TC/HDL ratio <4.5 defines optimal atherogenic risk.",
    relevance:
      "The foundational paper for our ratio-based approach. Proves that computed ratios are more clinically informative than raw biomarker values alone.",
    url: "https://doi.org/10.2147/vhrm.s6269",
    categoryColor: "var(--red-9)",
  },
];

// ─── Research Stats ────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "87%",
    label: "Sensitivity via longitudinal tracking",
    source: "Blyuss et al., Clin Cancer Res 2019",
    paperIndex: 0,
  },
  {
    number: "R²=0.97",
    label: "eGFR estimation across 186K patients",
    source: "Inker et al., NEJM 2021",
    paperIndex: 1,
  },
  {
    number: "6×",
    label: "Insulin resistance detection via TG/HDL",
    source: "Giannini et al., Diabetes Care 2011",
    paperIndex: 2,
  },
  {
    number: "1.64×",
    label: "Mortality prediction via NLR",
    source: "Fest et al., Eur J Epidemiol 2018",
    paperIndex: 4,
  },
];

// ─── Pipeline Agents ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
  {
    name: "PDF Extractor",
    description:
      "Parses uploaded blood test PDFs via Unstructured.io's HiRes strategy with OCR. A three-tier parser chain — HTML table regex, European FormKeysValues pairs, free-text pattern matching — handles any lab report format. Alias-based marker resolution (case-insensitive MARKER_ALIAS_MAP) normalizes names like 'Trigliceride' to 'Triglycerides', with deduplication and HTML stripping for embedded markup. Parsed markers flow directly into the Ratio Calculator.",
    researchBasis: "Unstructured document parsing + OCR",
  },
  {
    name: "Ratio Calculator",
    description:
      "Computes 7 clinical ratios via computeDerivedMetrics() — TG/HDL, NLR, De Ritis, BUN/Creatinine, TC/HDL, HDL/LDL, and TyG Index — each with peer-reviewed thresholds stored in METRIC_REFERENCES (label, unit, ranges, clinical description, citation). classifyMetricRisk() maps each value to optimal, borderline, elevated, or low with range-aware direction: NLR and De Ritis measure distance to optimal midpoint, HDL/LDL is higher-is-better, TC/HDL and TG/HDL are lower-is-better. These risk classifications persist in the health_state_embeddings JSONB column and are embedded into the health vector by the Vector Encoder.",
    researchBasis: "McLaughlin et al., Fest et al., Botros & Sikaris",
    paperIndices: [2, 4, 5],
  },
  {
    name: "Vector Encoder",
    description:
      "Generates three embedding types via Qwen text-embedding-v4 (1024 dimensions, DashScope API): test-level embeddings for full panel comparison, marker-level embeddings for individual biomarker search, and health-state embeddings that include derived metrics alongside raw values. The health-state vector captures the full clinical picture — ratios, risk tiers, and raw markers — in a single 1024-dim point that feeds into the Similarity Analyzer and powers the Q&A retrieval system.",
    researchBasis: "Blyuss et al. (2019) — longitudinal encoding",
    paperIndices: [0],
  },
  {
    name: "Similarity Analyzer",
    description:
      "Uses pgvector's <=> cosine distance operator over an HNSW index for sub-linear approximate nearest neighbor search. The get_health_trajectory_with_similarity() Postgres RPC computes similarity-to-latest in SQL, returning a timeline where 0.99 means near-identical health state and 0.85 flags a significant shift. This timeline, alongside per-day velocities from the Velocity Monitor, feeds into the Trajectory Analyst.",
    researchBasis: "Inker et al. (2021) — validated correlations",
    paperIndices: [1],
  },
  {
    name: "Velocity Monitor",
    description:
      "Calculates per-day rate-of-change for every biomarker and ratio. Direction interpretation is range-aware: NLR rising is bad (higher-is-worse), HDL/LDL rising is good (higher-is-better), and De Ritis moving away from the 0.8–1.2 optimal midpoint in either direction triggers a flag. The eval framework validates directional accuracy with a 0.001/day stability threshold.",
    researchBasis: "Giannini et al. (2011), Fest et al. (2018)",
    paperIndices: [2, 4],
  },
  {
    name: "Trajectory Analyst",
    description:
      "Qwen Plus (temperature 0.3, max 1500 tokens) with a system prompt that embeds all 7 metric thresholds and paper citations. Classifies trajectory direction as improving, stable, or deteriorating by cross-referencing computed velocities with clinical thresholds. Every insight includes the specific ratio value, its risk tier, and the supporting citation — grounded in the same METRIC_REFERENCES the Ratio Calculator uses.",
    researchBasis: "All 8 peer-reviewed papers",
    paperIndices: [0, 1, 2, 3, 4, 5, 6, 7],
  },
];

// ─── Story ─────────────────────────────────────────────────────────

export const story =
  "You upload a blood test PDF. Within seconds, Unstructured.io's HiRes strategy with OCR " +
  "runs it through a three-tier cascade — HTML table extraction, European FormKeysValues pair parsing, " +
  "then free-text pattern matching — normalizing every marker through alias resolution so that " +
  "'Trigliceride' and 'Triglycerides' resolve to the same biomarker. " +
  "From those raw values, 7 clinical ratios emerge: TG/HDL, NLR, De Ritis, BUN/Creatinine, TC/HDL, " +
  "HDL/LDL, and TyG Index — each classified against peer-reviewed thresholds into optimal, borderline, " +
  "elevated, or low risk tiers. But the real insight comes from what happens next. " +
  "Your entire panel is encoded into a 1024-dimensional health vector via Qwen text-embedding-v4, " +
  "capturing ratios, risk tiers, and raw markers in a single geometric point. " +
  "pgvector's HNSW index computes cosine similarity against every previous upload, while per-day " +
  "velocity tracking measures how fast each ratio is drifting — catching a quietly rising NLR or a " +
  "deteriorating De Ritis ratio before either crosses a clinical threshold. " +
  "Finally, a trajectory analyst powered by Qwen Plus at temperature 0.3 synthesizes everything: " +
  "it cross-references your computed velocities against the same peer-reviewed thresholds, classifies " +
  "your trajectory as improving, stable, or deteriorating, and grounds every insight in a specific " +
  "ratio value, risk tier, and supporting citation. " +
  "The result: your blood work stops being a snapshot and becomes a trajectory.";
