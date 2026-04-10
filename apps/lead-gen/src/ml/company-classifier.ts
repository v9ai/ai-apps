/**
 * Company vertical and AI tier classifier.
 *
 * Two implementations:
 * 1. Legacy: keyword-based heuristics using sequential `String.includes()` scans.
 * 2. Fast: Aho-Corasick automaton for single-pass multi-pattern matching.
 *
 * Both produce identical results. The fast path processes all pattern
 * dictionaries in O(n + m + z) where n = text length, m = total pattern
 * chars, z = number of matches, versus O(n * k) for the naive approach
 * where k = number of patterns.
 *
 * Upgrade path: replace internals with DeBERTa zero-shot NLI pipeline.
 */

// ── Aho-Corasick Automaton ───────────────────────────────────────────────

/** Output entry stored in each trie node: label + unique pattern ID. */
interface PatternOutput {
  label: string;
  patternId: number;
}

/**
 * A single node in the Aho-Corasick trie. Each node represents a state
 * in the pattern matching automaton.
 */
export class TrieNode {
  /** Transitions keyed by character. */
  children: Map<string, TrieNode> = new Map();
  /** Failure link — longest proper suffix that is also a prefix in the trie. */
  fail: TrieNode | null = null;
  /** Outputs emitted when this state is reached (direct matches + via suffix links). */
  output: PatternOutput[] = [];
}

/**
 * Aho-Corasick automaton for single-pass multi-pattern string matching.
 *
 * Usage:
 * ```ts
 * const ac = new AhoCorasickAutomaton();
 * ac.addPattern("machine learning", "ai_core");
 * ac.addPattern("saas", "saas");
 * ac.build();
 * const hits = ac.search("a machine learning saas company");
 * // hits => Map { "ai_core" => 1, "saas" => 1 }
 * ```
 *
 * All patterns and search text are expected to be pre-lowercased by the caller.
 *
 * Semantics: `search()` counts **distinct patterns** that match per label,
 * matching `String.includes()` semantics (present-or-not per pattern).
 * If "llm" appears 5 times in the text, it still contributes +1 to its label.
 */
export class AhoCorasickAutomaton {
  private root: TrieNode = new TrieNode();
  private built = false;
  private nextPatternId = 0;

  /**
   * Insert a pattern into the trie, associating it with a label.
   * Multiple patterns may share the same label (e.g., all AI core terms
   * share the "ai_core" label). Each pattern gets a unique ID so the
   * search method counts distinct patterns, not total occurrences.
   */
  addPattern(pattern: string, label: string): void {
    if (this.built) {
      throw new Error("Cannot add patterns after build()");
    }
    const patternId = this.nextPatternId++;
    let node = this.root;
    for (const ch of pattern) {
      let child = node.children.get(ch);
      if (!child) {
        child = new TrieNode();
        node.children.set(ch, child);
      }
      node = child;
    }
    node.output.push({ label, patternId });
  }

  /**
   * Compute failure links via BFS (Aho-Corasick construction).
   *
   * After this call, no more patterns can be added. The automaton is
   * ready for search.
   */
  build(): void {
    const queue: TrieNode[] = [];

    // Depth-1 nodes fail to root
    for (const child of this.root.children.values()) {
      child.fail = this.root;
      queue.push(child);
    }

    // BFS to compute failure links for deeper nodes
    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const [ch, child] of current.children) {
        queue.push(child);

        // Walk failure links to find the longest proper suffix match
        let failNode = current.fail;
        while (failNode !== null && !failNode.children.has(ch)) {
          failNode = failNode.fail;
        }
        child.fail = failNode ? failNode.children.get(ch)! : this.root;

        // If the failure target is the node itself, point to root instead
        if (child.fail === child) {
          child.fail = this.root;
        }

        // Merge output from the failure chain (suffix links / dictionary suffix links)
        if (child.fail.output.length > 0) {
          child.output = child.output.concat(child.fail.output);
        }
      }
    }

    this.built = true;
  }

  /**
   * Run the automaton over `text` in a single linear pass.
   *
   * @returns Map from label to the number of **distinct patterns** matched
   *          for that label. Each pattern is counted at most once regardless
   *          of how many times it appears in the text, matching the semantics
   *          of the legacy `countHits()` (which uses `String.includes()`).
   */
  search(text: string): Map<string, number> {
    if (!this.built) {
      throw new Error("Must call build() before search()");
    }

    const seen = new Set<number>();         // deduplicate by patternId
    const counts = new Map<string, number>();
    let node = this.root;

    for (const ch of text) {
      while (node !== this.root && !node.children.has(ch)) {
        node = node.fail!;
      }
      node = node.children.get(ch) ?? this.root;

      // Emit all outputs at this state (includes suffix-link outputs)
      if (node.output.length > 0) {
        for (const { label, patternId } of node.output) {
          if (!seen.has(patternId)) {
            seen.add(patternId);
            counts.set(label, (counts.get(label) ?? 0) + 1);
          }
        }
      }
    }

    return counts;
  }
}

// ── Classification labels ────────────────────────────────────────────────

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

/** Result type for the fast classifier. */
export interface FastClassificationResult {
  vertical: string;
  confidence: number;
  aiTier: number;
}

/** Input shape for batch classification. */
export interface CompanyInput {
  name: string;
  description: string;
  website?: string;
}

/** Full result for batch classification (extends fast result with reasons). */
export interface ClassificationResult extends FastClassificationResult {
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

// ── Label constants for automaton output tags ────────────────────────────

const L_AI_CORE = "ai_core";
const L_AI_FEATURE = "ai_feature";
const L_CONSULTING = "consulting";
const L_STAFFING = "staffing";
const L_AGENCY = "agency";
const L_SAAS = "saas";
const L_DEVTOOLS = "devtools";

// ── Build automata at module initialization (once) ───────────────────────

function buildClassificationAutomaton(): AhoCorasickAutomaton {
  const ac = new AhoCorasickAutomaton();

  const groups: [string[], string][] = [
    [AI_CORE_TERMS, L_AI_CORE],
    [AI_FEATURE_TERMS, L_AI_FEATURE],
    [CONSULTING_TERMS, L_CONSULTING],
    [STAFFING_TERMS, L_STAFFING],
    [AGENCY_TERMS, L_AGENCY],
    [SAAS_TERMS, L_SAAS],
    [DEVTOOLS_TERMS, L_DEVTOOLS],
  ];

  for (const [terms, label] of groups) {
    for (const term of terms) {
      // All patterns are already lowercase
      ac.addPattern(term, label);
    }
  }

  ac.build();
  return ac;
}

/** Pre-built automaton for all classification patterns (vertical + AI tier). */
const classificationAutomaton = buildClassificationAutomaton();

// ── Legacy helpers (kept for backward compat) ────────────────────────────

function countHits(text: string, terms: string[]): number {
  let hits = 0;
  for (const term of terms) {
    if (text.includes(term)) hits++;
  }
  return hits;
}

// ── Shared scoring logic (used by both legacy and fast paths) ────────────

function computeClassification(
  aiCoreHits: number,
  aiFeatureHits: number,
  consultingHits: number,
  staffingHits: number,
  agencyHits: number,
  saasHits: number,
  devtoolsHits: number,
): { category: string; ai_tier: number; confidence: number; reasons: string[] } {
  const reasons: string[] = [];

  // ── AI tier scoring ─────────────────────────────────────────────────────
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
    { label: "IT consulting and services company", score: consultingHits * 0.3 },
    { label: "Staffing and recruitment agency", score: staffingHits * 0.35 },
    { label: "Marketing or creative agency", score: agencyHits * 0.35 },
    { label: "Enterprise SaaS platform", score: saasHits * 0.25 },
    { label: "Developer tools and infrastructure", score: devtoolsHits * 0.25 },
    { label: "Non-AI software product company", score: 0.1 }, // default baseline
  ];

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const category = best.score > 0.1 ? best.label : "Non-AI software product company";

  const confidence = Math.min(best.score, 1.0);
  reasons.push(`Top vertical: ${category} (score ${confidence.toFixed(2)})`);

  return { category, ai_tier, confidence, reasons };
}

// ── Public API ────────────────────────────────────────────────────────────

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

  const aiCoreHits = countHits(t, AI_CORE_TERMS);
  const aiFeatureHits = countHits(t, AI_FEATURE_TERMS);
  const consultingHits = countHits(t, CONSULTING_TERMS);
  const staffingHits = countHits(t, STAFFING_TERMS);
  const agencyHits = countHits(t, AGENCY_TERMS);
  const saasHits = countHits(t, SAAS_TERMS);
  const devtoolsHits = countHits(t, DEVTOOLS_TERMS);

  return computeClassification(
    aiCoreHits, aiFeatureHits, consultingHits,
    staffingHits, agencyHits, saasHits, devtoolsHits,
  );
}

/** Legacy alias for the original keyword-based classifier. */
export const classifyCompanyLegacy = classifyCompany;

/**
 * Fast company classifier using Aho-Corasick automaton.
 *
 * Runs all pattern dictionaries in a single linear pass over the input
 * text, then applies the same scoring logic as the legacy classifier.
 *
 * Complexity: O(n + m + z) where n = |text|, m = total pattern chars,
 * z = number of matches. The automaton is built once at module load.
 */
export function classifyCompanyFast(
  text: string,
): FastClassificationResult {
  const t = text.toLowerCase();
  const hits = classificationAutomaton.search(t);

  const aiCoreHits = hits.get(L_AI_CORE) ?? 0;
  const aiFeatureHits = hits.get(L_AI_FEATURE) ?? 0;
  const consultingHits = hits.get(L_CONSULTING) ?? 0;
  const staffingHits = hits.get(L_STAFFING) ?? 0;
  const agencyHits = hits.get(L_AGENCY) ?? 0;
  const saasHits = hits.get(L_SAAS) ?? 0;
  const devtoolsHits = hits.get(L_DEVTOOLS) ?? 0;

  const result = computeClassification(
    aiCoreHits, aiFeatureHits, consultingHits,
    staffingHits, agencyHits, saasHits, devtoolsHits,
  );

  return {
    vertical: result.category,
    confidence: result.confidence,
    aiTier: result.ai_tier,
  };
}

/**
 * Batch-classify an array of companies using the Aho-Corasick fast path.
 *
 * Concatenates name + description + website into a single text block per
 * company and runs through the automaton. Useful for bulk enrichment
 * pipelines where thousands of companies need classification in one pass.
 */
export function classifyBatch(
  companies: CompanyInput[],
): ClassificationResult[] {
  return companies.map((company) => {
    const parts = [company.name, company.description];
    if (company.website) parts.push(company.website);
    const text = parts.join(" ").toLowerCase();

    const hits = classificationAutomaton.search(text);

    const aiCoreHits = hits.get(L_AI_CORE) ?? 0;
    const aiFeatureHits = hits.get(L_AI_FEATURE) ?? 0;
    const consultingHits = hits.get(L_CONSULTING) ?? 0;
    const staffingHits = hits.get(L_STAFFING) ?? 0;
    const agencyHits = hits.get(L_AGENCY) ?? 0;
    const saasHits = hits.get(L_SAAS) ?? 0;
    const devtoolsHits = hits.get(L_DEVTOOLS) ?? 0;

    const result = computeClassification(
      aiCoreHits, aiFeatureHits, consultingHits,
      staffingHits, agencyHits, saasHits, devtoolsHits,
    );

    return {
      vertical: result.category,
      confidence: result.confidence,
      aiTier: result.ai_tier,
      reasons: result.reasons,
    };
  });
}
