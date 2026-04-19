import type { ResearchPaper } from "./types";

export interface DimensionWeights {
  result_count: number;
  year_range: number;
  source_diversity: number;
  abstract_coverage: number;
  recency_bias: number;
  citation_network: number;
  authority: number;
  field_diversity: number;
}

export const DEFAULT_WEIGHTS: DimensionWeights = {
  result_count: 0.15,
  year_range: 0.12,
  source_diversity: 0.12,
  abstract_coverage: 0.12,
  recency_bias: 0.12,
  citation_network: 0.1,
  authority: 0.12,
  field_diversity: 0.15,
};

export interface DimensionScores {
  result_count: number;
  year_range: number;
  source_diversity: number;
  abstract_coverage: number;
  recency_bias: number;
  citation_network: number;
  authority: number;
  field_diversity: number;
}

export interface CritiqueConfig {
  min_results?: number;
  min_year_range?: number;
  min_sources?: number;
  quality_threshold?: number;
  authority_citation_threshold?: number;
  authority_min_fraction?: number;
  /** Year considered "current" for recency-bias detection (default: current calendar year). */
  current_year?: number;
  weights?: Partial<DimensionWeights>;
}

export interface Critique {
  quality_score: number;
  dimension_scores: DimensionScores;
  issues: string[];
  suggestions: string[];
}

const ZERO_SCORES: DimensionScores = {
  result_count: 0,
  year_range: 0,
  source_diversity: 0,
  abstract_coverage: 0,
  recency_bias: 0,
  citation_network: 0,
  authority: 0,
  field_diversity: 0,
};

function normaliseWeights(w: DimensionWeights): DimensionWeights {
  const total =
    w.result_count +
    w.year_range +
    w.source_diversity +
    w.abstract_coverage +
    w.recency_bias +
    w.citation_network +
    w.authority +
    w.field_diversity;
  if (total <= 0) return { ...DEFAULT_WEIGHTS };
  return {
    result_count: w.result_count / total,
    year_range: w.year_range / total,
    source_diversity: w.source_diversity / total,
    abstract_coverage: w.abstract_coverage / total,
    recency_bias: w.recency_bias / total,
    citation_network: w.citation_network / total,
    authority: w.authority / total,
    field_diversity: w.field_diversity / total,
  };
}

export function critique(papers: ResearchPaper[], config: CritiqueConfig = {}): Critique {
  const min_results = config.min_results ?? 5;
  const min_year_range = config.min_year_range ?? 3;
  const min_sources = config.min_sources ?? 2;
  const authority_threshold = config.authority_citation_threshold ?? 100;
  const authority_min_fraction = config.authority_min_fraction ?? 0.1;
  const current_year = config.current_year ?? new Date().getUTCFullYear();
  const weights = normaliseWeights({ ...DEFAULT_WEIGHTS, ...(config.weights ?? {}) });

  const issues: string[] = [];
  const suggestions: string[] = [];

  if (papers.length === 0) {
    issues.push(`Too few papers (0, expected at least ${min_results})`);
    suggestions.push("Broaden search terms or relax filters");
    return { quality_score: 0, dimension_scores: { ...ZERO_SCORES }, issues, suggestions };
  }

  // 1. Result count
  const count_score = Math.min(papers.length / min_results, 1);
  if (papers.length < min_results) {
    issues.push(`Too few papers (${papers.length}, expected at least ${min_results})`);
    suggestions.push("Broaden search terms or relax filters");
  }

  // 2. Year range
  const years = papers.map((p) => p.year).filter((y): y is number => y != null);
  let year_range_score = 0;
  if (years.length > 0) {
    const mn = Math.min(...years);
    const mx = Math.max(...years);
    const span = mx - mn;
    year_range_score = Math.min(span / min_year_range, 1);
    if (span < min_year_range) {
      issues.push(`Narrow time range (${mn}-${mx})`);
      suggestions.push("Include older foundational papers");
    }
  } else {
    issues.push("No year data available");
  }

  // 3. Source diversity
  const sources = new Set(papers.map((p) => p.source));
  const source_score = Math.min(sources.size / min_sources, 1);
  if (sources.size < min_sources) {
    issues.push(`Limited source diversity (${sources.size} source${sources.size === 1 ? "" : "s"})`);
    suggestions.push("Search across arXiv, Semantic Scholar, OpenAlex");
  }

  // 4. Abstract coverage
  const with_abs = papers.filter((p) => p.abstract_text && p.abstract_text.length > 0).length;
  const abstract_score = with_abs / papers.length;
  if (abstract_score < 0.5) {
    issues.push(`Low abstract coverage (${Math.round(abstract_score * 100)}%)`);
    suggestions.push("Prefer sources with full abstracts (arXiv, Semantic Scholar)");
  }

  // 5. Recency bias
  const recency_score = scoreRecencyBias(years, current_year);
  if (years.length >= 2) {
    const recent_cutoff = Math.max(0, current_year - 1);
    const recent_count = years.filter((y) => y >= recent_cutoff).length;
    const recent_frac = recent_count / years.length;
    if (recent_frac > 0.7) {
      issues.push(
        `Recency bias: ${Math.round(recent_frac * 100)}% of papers from ${recent_cutoff}+`,
      );
      suggestions.push("Add seminal/foundational papers from earlier years");
    }
  }

  // 6. Citation network (Gini)
  const citation_network_score = scoreCitationNetwork(papers);
  const citationCounts = papers
    .map((p) => p.citation_count)
    .filter((c): c is number => c != null);
  if (citationCounts.length >= 2) {
    const gini = giniCoefficient(citationCounts);
    if (gini > 0.8) {
      issues.push(
        `Citation concentration too high (Gini ${gini.toFixed(2)}) — corpus dominated by a few papers`,
      );
      suggestions.push("Balance highly-cited papers with newer or niche works");
    } else if (gini < 0.1) {
      issues.push(`Citation counts suspiciously uniform (Gini ${gini.toFixed(2)})`);
      suggestions.push("Include a mix of landmark and emerging papers");
    }
  }

  // 7. Authority
  const authority_score = scoreAuthority(papers, authority_threshold, authority_min_fraction);
  if (authority_score < 0.01 && papers.length > 0) {
    issues.push(`No landmark papers (>${authority_threshold} citations) in corpus`);
    suggestions.push("Include well-established, highly-cited foundational works");
  }

  // 8. Field diversity
  const field_diversity_score = scoreFieldDiversity(papers);
  {
    const allFields = new Set<string>();
    let papersWithFields = 0;
    for (const p of papers) {
      if (p.fields_of_study && p.fields_of_study.length > 0) {
        papersWithFields++;
        for (const f of p.fields_of_study) allFields.add(f.toLowerCase());
      }
    }
    if (allFields.size <= 1 && papersWithFields >= 3) {
      issues.push("All papers in a single research field");
      suggestions.push("Include cross-disciplinary perspectives");
    }
  }

  const dimension_scores: DimensionScores = {
    result_count: count_score,
    year_range: year_range_score,
    source_diversity: source_score,
    abstract_coverage: abstract_score,
    recency_bias: recency_score,
    citation_network: citation_network_score,
    authority: authority_score,
    field_diversity: field_diversity_score,
  };

  const quality_score = clamp01(
    count_score * weights.result_count +
      year_range_score * weights.year_range +
      source_score * weights.source_diversity +
      abstract_score * weights.abstract_coverage +
      recency_score * weights.recency_bias +
      citation_network_score * weights.citation_network +
      authority_score * weights.authority +
      field_diversity_score * weights.field_diversity,
  );

  return { quality_score, dimension_scores, issues, suggestions };
}

// ─── Dimension scorers ───────────────────────────────────────────────────────

function scoreRecencyBias(years: number[], current_year: number): number {
  if (years.length < 2) return 0.5;
  const recent_cutoff = Math.max(0, current_year - 1);
  const recent_count = years.filter((y) => y >= recent_cutoff).length;
  const recent_frac = recent_count / years.length;
  if (recent_frac <= 0.4) return 1;
  return clamp01((1 - recent_frac) / 0.6);
}

function scoreCitationNetwork(papers: ResearchPaper[]): number {
  const counts = papers.map((p) => p.citation_count).filter((c): c is number => c != null);
  if (counts.length < 2) return 0.5;
  const n = counts.length;
  const mean = counts.reduce((a, b) => a + b, 0) / n;
  if (mean < 0.001) return 0.3;
  const gini = giniCoefficient(counts);
  const score = gini <= 0.6 ? 0.6 + (gini / 0.6) * 0.4 : 1 - ((gini - 0.6) / 0.4) * 0.8;
  return clamp01(score);
}

function giniCoefficient(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n < 2) return 0;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  if (mean < 0.001) return 0;
  let sumDiff = 0;
  for (let i = 0; i < n; i++) {
    const a = sorted[i] as number;
    for (let j = i + 1; j < n; j++) {
      const b = sorted[j] as number;
      sumDiff += Math.abs(b - a);
    }
  }
  return sumDiff / (n * n * mean);
}

function scoreAuthority(papers: ResearchPaper[], threshold: number, min_fraction: number): number {
  if (papers.length === 0) return 0;
  const withCitations = papers.filter((p) => p.citation_count != null);
  if (withCitations.length === 0) return 0.5;
  const landmark = withCitations.filter((p) => (p.citation_count ?? 0) >= threshold).length;
  const fraction = landmark / withCitations.length;
  return Math.min(fraction / Math.max(min_fraction, 0.01), 1);
}

function scoreFieldDiversity(papers: ResearchPaper[]): number {
  if (papers.length === 0) return 0;
  const all = new Set<string>();
  let papersWithFields = 0;
  for (const p of papers) {
    if (p.fields_of_study && p.fields_of_study.length > 0) {
      papersWithFields++;
      for (const f of p.fields_of_study) all.add(f.toLowerCase());
    }
  }
  if (papersWithFields === 0) return 0.5;
  switch (all.size) {
    case 0:
      return 0;
    case 1:
      return 0.2;
    case 2:
      return 0.4;
    case 3:
      return 0.6;
    case 4:
      return 0.8;
    default:
      return 1;
  }
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
