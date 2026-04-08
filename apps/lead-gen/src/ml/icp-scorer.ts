/**
 * Learned ICP (Ideal Customer Profile) scoring function.
 *
 * Hand-tuned weighted sum with domain-knowledge weights for B2B lead-gen.
 * Features are extracted from the company record and related counts.
 */

export interface ICPFeatures {
  hasDescription: number;
  descriptionLengthNorm: number;
  hasWebsite: number;
  hasLinkedin: number;
  hasEmail: number;
  emailCount: number;
  tagCount: number;
  serviceCount: number;
  aiTier: number;
  isConsultancy: number;
  isProduct: number;
  factsCount: number;
  hasGithub: number;
  githubAiScore: number;
  hfPresenceScore: number;
  intentScore: number;
  contactsCount: number;
  dmContactsCount: number;
  hasJobBoard: number;
}

function parseJsonArrayLen(val: string | null | undefined): number {
  if (!val) return 0;
  try {
    const arr = JSON.parse(val);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Extract ICP feature vector from a company record and optional counts.
 *
 * @param company - Company row (loosely typed to avoid tight coupling)
 * @param contactsCount - Total contacts for this company
 * @param dmCount - Decision-maker contacts for this company
 * @param factsCount - Company facts count
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractICPFeatures(
  company: any,
  contactsCount = 0,
  dmCount = 0,
  factsCount = 0,
): ICPFeatures {
  const desc = company.description ?? "";
  const emailsArr = parseJsonArrayLen(company.emails);

  return {
    hasDescription: desc.length > 0 ? 1 : 0,
    descriptionLengthNorm: Math.min(desc.length / 500, 1),
    hasWebsite: company.website ? 1 : 0,
    hasLinkedin: company.linkedin_url ? 1 : 0,
    hasEmail: company.email ? 1 : 0,
    emailCount: (company.email ? 1 : 0) + emailsArr,
    tagCount: parseJsonArrayLen(company.tags),
    serviceCount: parseJsonArrayLen(company.services),
    aiTier: company.ai_tier ?? 0,
    isConsultancy: company.category === "CONSULTANCY" ? 1 : 0,
    isProduct: company.category !== "CONSULTANCY" && company.category !== "UNKNOWN" ? 1 : 0,
    factsCount,
    hasGithub: company.github_url ? 1 : 0,
    githubAiScore: company.github_ai_score ?? 0,
    hfPresenceScore: (company.hf_presence_score ?? 0) / 100,
    intentScore: (company.intent_score ?? 0) / 100,
    contactsCount,
    dmContactsCount: dmCount,
    hasJobBoard: company.job_board_url ? 1 : 0,
  };
}

// ── Hand-tuned weights (domain knowledge) ────────────────────────────────

const WEIGHTS: Record<keyof ICPFeatures, number> = {
  hasDescription: 0.05,
  descriptionLengthNorm: 0.03,
  hasWebsite: 0.04,
  hasLinkedin: 0.03,
  hasEmail: 0.06,
  emailCount: 0.02,
  tagCount: 0.01,
  serviceCount: 0.02,
  aiTier: 0.15,           // AI-first companies are highest priority
  isConsultancy: -0.08,   // Consultancies are lower priority
  isProduct: 0.06,
  factsCount: 0.01,
  hasGithub: 0.04,
  githubAiScore: 0.10,    // GitHub AI activity is a strong signal
  hfPresenceScore: 0.08,  // HuggingFace presence indicates AI depth
  intentScore: 0.12,      // Intent signals are highly predictive
  contactsCount: 0.03,
  dmContactsCount: 0.08,  // Having DM contacts is critical for outreach
  hasJobBoard: 0.05,
};

const BIAS = 0.10; // baseline score

/**
 * Score a company against the ICP using a hand-tuned weighted sum.
 *
 * @returns score (0..1) and human-readable reasons for top contributors.
 */
export function scoreICP(
  features: ICPFeatures,
): { score: number; reasons: string[] } {
  let raw = BIAS;
  const contributions: { name: string; value: number }[] = [];

  for (const key of Object.keys(WEIGHTS) as (keyof ICPFeatures)[]) {
    const contribution = WEIGHTS[key] * features[key];
    raw += contribution;
    if (Math.abs(contribution) >= 0.02) {
      contributions.push({ name: key, value: contribution });
    }
  }

  const score = Math.max(0, Math.min(1, raw));

  // Top reasons sorted by absolute contribution
  contributions.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const reasons = contributions.slice(0, 5).map((c) => {
    const dir = c.value > 0 ? "+" : "";
    return `${c.name}: ${dir}${(c.value * 100).toFixed(1)}%`;
  });

  return { score: Math.round(score * 1000) / 1000, reasons };
}
