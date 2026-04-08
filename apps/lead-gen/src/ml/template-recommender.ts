/**
 * Beta-binomial posterior template recommender.
 *
 * Recommends email templates for a company based on a Bayesian model
 * of template effectiveness. Uses company attributes to compute prior
 * affinity and updates with observed send/reply outcomes.
 */

export interface TemplateScore {
  templateId: number;
  score: number;
  reason: string;
}

export interface TemplateInput {
  id: number;
  name: string;
  category?: string | null;
  tags?: string | null;
}

export interface CompanyInput {
  category?: string | null;
  ai_tier?: number | null;
  industry?: string | null;
  tags?: string | null;
}

// ── Outcome tracking ─────────────────────────────────────────────────────

/**
 * Outcomes map: category -> templateId -> { sent, replied }
 * This mirrors observed send/reply counts grouped by company category.
 */
export type OutcomeMap = Map<string, Map<number, { sent: number; replied: number }>>;

// ── Beta-binomial posterior ──────────────────────────────────────────────

/** Prior pseudo-counts (weak uniform prior). */
const ALPHA_PRIOR = 1;
const BETA_PRIOR = 3;

/**
 * Compute the posterior mean reply rate under a Beta-Binomial model.
 *
 * posterior = Beta(alpha + replies, beta + sent - replies)
 * E[posterior] = (alpha + replies) / (alpha + beta + sent)
 */
function posteriorMean(sent: number, replied: number): number {
  return (ALPHA_PRIOR + replied) / (ALPHA_PRIOR + BETA_PRIOR + sent);
}

// ── Category affinity priors ─────────────────────────────────────────────

function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const arr = JSON.parse(val);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Compute a prior affinity bonus for a template given company attributes.
 * Matches on category alignment and tag overlap.
 */
function priorAffinity(company: CompanyInput, template: TemplateInput): number {
  let bonus = 0;

  const templateTags = parseJsonArray(template.tags).map((t) =>
    t.toLowerCase(),
  );
  const companyTags = parseJsonArray(company.tags).map((t) =>
    t.toLowerCase(),
  );

  // Category alignment
  if (template.category && company.category) {
    const tc = template.category.toLowerCase();
    const cc = company.category.toLowerCase();
    if (tc === cc || tc.includes(cc) || cc.includes(tc)) {
      bonus += 0.10;
    }
  }

  // AI template for AI companies
  const isAiTemplate =
    templateTags.some((t) => t.includes("ai") || t.includes("ml")) ||
    (template.name?.toLowerCase().includes("ai") ?? false);
  if (isAiTemplate && (company.ai_tier ?? 0) >= 1) {
    bonus += 0.15;
  }

  // Tag overlap
  const overlap = companyTags.filter((t) => templateTags.includes(t)).length;
  bonus += Math.min(overlap * 0.05, 0.15);

  return bonus;
}

/**
 * Recommend and score email templates for a given company.
 *
 * Combines a Bayesian posterior from historical outcomes with a
 * prior affinity computed from company/template attribute alignment.
 *
 * @param company - Target company attributes
 * @param templates - Available email templates
 * @param outcomes - Optional observed send/reply outcomes by category
 * @returns Sorted array of template scores (descending)
 */
export function recommendTemplates(
  company: CompanyInput,
  templates: TemplateInput[],
  outcomes?: OutcomeMap,
): TemplateScore[] {
  const categoryKey = company.category ?? "UNKNOWN";

  const categoryOutcomes = outcomes?.get(categoryKey);

  return templates
    .map((template) => {
      const obs = categoryOutcomes?.get(template.id);
      const sent = obs?.sent ?? 0;
      const replied = obs?.replied ?? 0;

      const bayesianRate = posteriorMean(sent, replied);
      const affinity = priorAffinity(company, template);
      const score = Math.round((bayesianRate + affinity) * 1000) / 1000;

      // Build human-readable reason
      const parts: string[] = [];
      if (sent > 0) {
        parts.push(`${replied}/${sent} replies (rate ${(bayesianRate * 100).toFixed(1)}%)`);
      } else {
        parts.push("No prior data (using prior)");
      }
      if (affinity > 0) {
        parts.push(`affinity +${(affinity * 100).toFixed(0)}%`);
      }

      return {
        templateId: template.id,
        score,
        reason: parts.join("; "),
      };
    })
    .sort((a, b) => b.score - a.score);
}
