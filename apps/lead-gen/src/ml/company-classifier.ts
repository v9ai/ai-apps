/**
 * Company vertical and AI tier classifier.
 *
 * Uses keyword-based heuristics as a reliable fallback. Can be upgraded
 * to DeBERTa zero-shot NLI via @huggingface/transformers when the ONNX
 * model is available.
 */

/** Vertical classification labels (for future DeBERTa NLI). */
export const VERTICAL_LABELS = [
  "AI-first product company",
  "AI-native technology company",
  "Non-AI software product company",
  "IT consulting and services company",
  "Staffing and recruitment agency",
  "Marketing or creative agency",
  "Enterprise SaaS platform",
  "Developer tools and infrastructure",
] as const;

/** AI tier labels (for future DeBERTa NLI). */
export const AI_TIER_LABELS = [
  "This company does not use AI as a core product",
  "This company uses AI as a significant product feature",
  "This company is an AI-first or AI-native company",
] as const;

export interface CompanyClassification {
  category: string;
  ai_tier: number;
  confidence: number;
  reasons: string[];
}

// ── Keyword dictionaries ──────────────────────────────────────────────────

const AI_CORE_TERMS = [
  "artificial intelligence", "machine learning", "deep learning",
  "neural network", "large language model", "llm", "nlp",
  "natural language processing", "computer vision", "generative ai",
  "foundation model", "transformer", "diffusion model", "reinforcement learning",
  "mlops", "ai-first", "ai-native", "ai platform", "ai infrastructure",
];

const AI_FEATURE_TERMS = [
  "ai-powered", "ai powered", "ai-driven", "ai driven",
  "machine learning powered", "intelligent automation",
  "predictive analytics", "smart automation", "chatbot",
  "recommendation engine", "ai features", "ai capabilities",
  "ai assistant", "copilot",
];

const CONSULTING_TERMS = [
  "consulting", "consultancy", "advisory", "professional services",
  "managed services", "outsourcing", "it services", "digital transformation",
  "systems integrator", "implementation partner",
];

const STAFFING_TERMS = [
  "staffing", "recruitment", "recruiting", "talent acquisition",
  "headhunting", "placement", "temp agency", "employment agency",
  "job board", "hiring platform",
];

const AGENCY_TERMS = [
  "marketing agency", "creative agency", "design agency", "digital agency",
  "advertising agency", "branding agency", "pr agency", "media agency",
  "content agency", "seo agency",
];

const SAAS_TERMS = [
  "saas", "software as a service", "cloud platform", "enterprise software",
  "crm", "erp", "enterprise platform", "business software",
];

const DEVTOOLS_TERMS = [
  "developer tools", "devtools", "dev tools", "infrastructure",
  "open source", "api platform", "sdk", "framework", "developer platform",
  "ci/cd", "observability", "monitoring", "orchestration",
];

function countHits(text: string, terms: string[]): number {
  let hits = 0;
  for (const term of terms) {
    if (text.includes(term)) hits++;
  }
  return hits;
}

/**
 * Classify a company by vertical and AI tier using keyword heuristics.
 *
 * This is a reliable fallback that works without model downloads.
 * Upgrade path: replace internals with DeBERTa zero-shot NLI pipeline.
 */
export async function classifyCompany(
  text: string,
): Promise<CompanyClassification> {
  const t = text.toLowerCase();
  const reasons: string[] = [];

  // ── AI tier scoring ─────────────────────────────────────────────────────
  const aiCoreHits = countHits(t, AI_CORE_TERMS);
  const aiFeatureHits = countHits(t, AI_FEATURE_TERMS);

  let ai_tier = 0;
  if (aiCoreHits >= 3) {
    ai_tier = 2;
    reasons.push(`Strong AI-core signal (${aiCoreHits} core terms)`);
  } else if (aiCoreHits >= 1) {
    ai_tier = aiFeatureHits >= 1 ? 2 : 1;
    reasons.push(
      `AI signal: ${aiCoreHits} core, ${aiFeatureHits} feature terms`,
    );
  } else if (aiFeatureHits >= 2) {
    ai_tier = 1;
    reasons.push(`AI-feature signal (${aiFeatureHits} feature terms)`);
  }

  // ── Vertical scoring ────────────────────────────────────────────────────
  const scores: { label: string; score: number }[] = [
    { label: "AI-first product company", score: aiCoreHits >= 3 ? 0.9 : aiCoreHits >= 1 ? 0.5 : 0 },
    { label: "AI-native technology company", score: ai_tier === 2 ? 0.7 : 0 },
    { label: "IT consulting and services company", score: countHits(t, CONSULTING_TERMS) * 0.3 },
    { label: "Staffing and recruitment agency", score: countHits(t, STAFFING_TERMS) * 0.35 },
    { label: "Marketing or creative agency", score: countHits(t, AGENCY_TERMS) * 0.35 },
    { label: "Enterprise SaaS platform", score: countHits(t, SAAS_TERMS) * 0.25 },
    { label: "Developer tools and infrastructure", score: countHits(t, DEVTOOLS_TERMS) * 0.25 },
    { label: "Non-AI software product company", score: 0.1 }, // default baseline
  ];

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const category = best.score > 0.1 ? best.label : "Non-AI software product company";

  const confidence = Math.min(best.score, 1.0);
  reasons.push(`Top vertical: ${category} (score ${confidence.toFixed(2)})`);

  return { category, ai_tier, confidence, reasons };
}
