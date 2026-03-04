/* generic-claim-cards.tools.ts
 *
 * Turn a "parent item" (note, doc, project, ticket, etc.) + its linked sources into auditable Claim Cards.
 *
 * What it does:
 * 1) Resolves linked references (titles/ids/urls) -> SourceDetails (metadata + abstract/summary)
 * 2) Extracts cross-source atomic claims scoped to the parent's theme
 * 3) Maps/grades evidence from the linked set to each claim
 * 4) Aggregates verdict + confidence into auditable "cards"
 * 5) Optional persistence via a pluggable storage adapter (SQL, D1, Prisma, etc.)
 *
 * Design goals:
 * - Domain-agnostic (works for any topic, not just remote work)
 * - Provider-agnostic (swap Semantic Scholar/OpenAlex/Crossref/etc.)
 * - Storage-agnostic (swap D1/SQLite/Postgres/whatever)
 * - Auditable output (evidence list + rationale + provenance)
 *
 * Usage:
 *   const cards = await buildClaimCardsFromItem(
 *     { id: 123, title: "state-of-X", tags: ["research"], createdAt: "2026-02-03T00:00:00.000Z" },
 *     linkedSources,
 *     {
 *       maxClaims: 12,
 *       maxSourcesToResolve: 120,
 *       evidenceTopK: 8,
 *       useJudge: true,
 *       resolver: myResolver,          // REQUIRED
 *       extractor: myExtractor,        // REQUIRED
 *       judge: myJudge,                // optional (if useJudge)
 *       storage: myStorageAdapter,     // optional
 *       resolutionHints: { sources: ["semantic_scholar", "openalex", "crossref"] }, // optional
 *     },
 *   );
 *
 *   await myStorageAdapter?.saveCardsForItem(cards, 123);
 */

import crypto from "crypto";
import { z } from "zod";

/** -----------------------------
 *  Core Types
 *  ----------------------------- */

export type ClaimVerdict =
  | "unverified"
  | "supported"
  | "contradicted"
  | "mixed"
  | "insufficient";

export type EvidencePolarity =
  | "supports"
  | "contradicts"
  | "mixed"
  | "irrelevant";

export interface ClaimScope {
  population?: string;
  intervention?: string;
  comparator?: string;
  outcome?: string;
  timeframe?: string;
  setting?: string;
}

export type ClaimTopic = string; // free-form, domain-agnostic (e.g. "policy", "metrics", "health", etc.)

export interface ParentItemMeta {
  id?: string | number;
  title: string;
  tags?: string[];
  createdAt?: string;
  /** Optional: any additional context shown to the extractor (e.g. short description) */
  summary?: string;
}

export interface LinkedSourceRef {
  /** Human label (often a title). */
  title: string;

  /** Optional metadata (if you store it). */
  year?: number;
  authors?: string[];
  url?: string;

  /** Optional IDs for better resolution. */
  doi?: string;
  arxivId?: string;
  openAlexId?: string;
  semanticScholarId?: string;
  pmid?: string;
  isbn?: string;

  /** Any custom fields your app uses. */
  [k: string]: unknown;
}

export interface SourceDetails {
  id?: string; // provider-specific stable id
  title: string;
  authors?: string[];
  year?: number;
  url?: string;

  /** The "text" used for extraction/judging. */
  abstract?: string;

  /** Optional extra fields for auditing. */
  venue?: string;
  doi?: string;
  fieldsOfStudy?: string[];
  citationsCount?: number;

  /** Provider name (for provenance) */
  provider?: string;

  [k: string]: unknown;
}

export interface EvidenceItem {
  source: SourceDetails;
  polarity: EvidencePolarity;
  excerpt?: string;
  rationale?: string;
  score?: number; // 0..1 relevance/confidence score
  locator?: {
    section?: string;
    page?: number;
    url?: string;
  };
}

export interface ClaimCard {
  id: string;
  claim: string;
  scope?: ClaimScope;
  topic?: ClaimTopic;

  verdict: ClaimVerdict;
  confidence: number; // 0..1

  evidence: EvidenceItem[];
  queries: string[];

  createdAt: string;
  updatedAt: string;

  provenance: {
    generatedBy: string;
    model?: string;
    resolvers: string[];
    judge?: string;

    item?: {
      id?: string | number;
      title: string;
      tags?: string[];
      createdAt?: string;
    };

    dataset?: {
      linkedCount: number;
      resolvedCount: number;
      usedForSynthesisCount: number;
    };
  };

  notes?: string;
}

/** -----------------------------
 *  Pluggable Interfaces
 *  ----------------------------- */

export interface ResolveOptions {
  maxSourcesToResolve?: number;
  concurrency?: number;

  /** Pass-through hints (e.g., "search sources") */
  resolutionHints?: Record<string, unknown>;
}

export interface Resolver {
  /** A short name for provenance, e.g. "sourceTools@v1" */
  name: string;

  /**
   * Resolve a linked ref into a canonical SourceDetails.
   * Return null if it cannot be resolved confidently.
   */
  resolve(
    ref: LinkedSourceRef,
    opts?: ResolveOptions,
  ): Promise<SourceDetails | null>;
}

export interface JudgeResult {
  polarity: EvidencePolarity;
  rationale: string;
  score: number; // 0..1
}

export interface Judge {
  /** A short name for provenance, e.g. "deepseek-chat" */
  name: string;
  judge(claim: string, source: SourceDetails): Promise<JudgeResult>;
}

export interface StorageAdapter {
  name: string;

  saveCard(card: ClaimCard, itemId?: string | number): Promise<void>;
  saveCardsForItem(cards: ClaimCard[], itemId: string | number): Promise<void>;

  getCard?(cardId: string): Promise<ClaimCard | null>;
  getCardsForItem?(itemId: string | number): Promise<ClaimCard[]>;
  deleteCard?(cardId: string): Promise<void>;
}

/** -----------------------------
 *  Helpers
 *  ----------------------------- */

function stableClaimId(claim: string, scope?: ClaimScope, topic?: ClaimTopic) {
  const normalized = claim.trim().toLowerCase();
  const scopeStr = scope ? JSON.stringify(scope) : "";
  const topicStr = topic ?? "";
  const hash = crypto
    .createHash("sha256")
    .update(normalized + scopeStr + topicStr)
    .digest("hex")
    .slice(0, 16);

  return `claim_${hash}`;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t && t.length > 2);
}

function basicRelevanceScore(claim: string, s: SourceDetails): number {
  const text = `${s.title} ${s.abstract ?? ""}`.toLowerCase();
  const tokens = tokenize(claim);
  if (tokens.length === 0) return 0;

  const hits = tokens.filter((t) => text.includes(t)).length;
  const denom = Math.max(8, Math.floor(tokens.length * 0.75));
  return Math.min(1, hits / denom);
}

function bestSnippet(s: SourceDetails): string | undefined {
  const a = (s.abstract || "").trim();
  if (!a) return undefined;
  return a.length > 260 ? a.slice(0, 260) + "…" : a;
}

/** Simple concurrency mapper (no extra deps). */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    for (;;) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

/** Pack sources into a text blob suitable for an LLM prompt (or a heuristic extractor). */
function packSourcesForPrompt(
  sources: SourceDetails[],
  opts?: { maxChars?: number; maxAbstractChars?: number },
): string {
  const maxChars = opts?.maxChars ?? 12000;
  const maxAbstractChars = opts?.maxAbstractChars ?? 500;

  const lines: string[] = [];
  let used = 0;

  for (const s of sources) {
    const year = s.year ? ` (${s.year})` : "";
    const abs = (s.abstract || "").replace(/\s+/g, " ").trim();
    const absShort =
      abs.length > maxAbstractChars
        ? abs.slice(0, maxAbstractChars) + "…"
        : abs;

    const line =
      `- Title: ${s.title}${year}\n` +
      `  Authors: ${(s.authors || []).slice(0, 8).join(", ")}\n` +
      `  Abstract: ${absShort || "N/A"}\n`;

    if (used + line.length > maxChars) break;
    lines.push(line);
    used += line.length;
  }

  return lines.join("\n");
}

/** -----------------------------
 *  Verdict Aggregation
 *  ----------------------------- */

function aggregateVerdict(evidence: EvidenceItem[]): {
  verdict: ClaimVerdict;
  confidence: number;
} {
  if (evidence.length === 0) return { verdict: "insufficient", confidence: 0 };

  const relevant = evidence.filter(
    (e) =>
      e.polarity === "supports" ||
      e.polarity === "contradicts" ||
      e.polarity === "mixed",
  );

  if (relevant.length === 0) {
    const avg =
      evidence.reduce((s, e) => s + (e.score ?? 0), 0) / evidence.length;
    return { verdict: "insufficient", confidence: Math.max(0.1, avg) };
  }

  const supports = relevant.filter((e) => e.polarity === "supports");
  const contradicts = relevant.filter((e) => e.polarity === "contradicts");
  const mixed = relevant.filter((e) => e.polarity === "mixed");

  const sW = supports.reduce((a, e) => a + (e.score ?? 0), 0);
  const cW = contradicts.reduce((a, e) => a + (e.score ?? 0), 0);
  const mW = mixed.reduce((a, e) => a + (e.score ?? 0), 0);

  const totalW = sW + cW + mW || 1e-9;
  const supportRatio = sW / totalW;
  const contradictRatio = cW / totalW;

  let verdict: ClaimVerdict;
  if (supportRatio > 0.72) verdict = "supported";
  else if (contradictRatio > 0.72) verdict = "contradicted";
  else if (supportRatio + contradictRatio < 0.35) verdict = "insufficient";
  else verdict = "mixed";

  const avgScore =
    relevant.reduce((s, e) => s + (e.score ?? 0), 0) / relevant.length;
  const quantity = Math.min(1, relevant.length / 6);
  const decisiveness = Math.max(supportRatio, contradictRatio);

  const confidence = Math.min(
    0.95,
    avgScore * 0.55 + quantity * 0.25 + decisiveness * 0.2,
  );

  return { verdict, confidence };
}

/** -----------------------------
 *  Claim Extraction
 *  (Default: expects you to plug in an LLM call elsewhere.
 *   This module defines schema + prompt builders to keep it generic.)
 *  ----------------------------- */

export interface ExtractedClaim {
  claim: string;
  scope?: ClaimScope;
  topic?: ClaimTopic;
  anchors?: string[]; // optional titles/substrings
}

/**
 * Adapter-friendly: pass your own extractor to avoid coupling to a specific LLM SDK.
 * If you *do* want a stock LLM extractor, implement Extractor using your model of choice.
 */
export interface Extractor {
  name: string;
  extract(
    item: ParentItemMeta,
    sources: SourceDetails[],
    maxClaims: number,
  ): Promise<ExtractedClaim[]>;
}

/** A JSON schema for LLM-based extraction, if you want it. */
export const extractedClaimsSchema = z.object({
  claims: z
    .array(
      z.object({
        claim: z
          .string()
          .min(8)
          .describe(
            "Atomic, testable statement. Avoid vague language; prefer measurable outcomes.",
          ),
        topic: z
          .string()
          .optional()
          .describe(
            "Free-form topic label, e.g. 'policy', 'metrics', 'health'.",
          ),
        scope: z
          .object({
            population: z.string().optional(),
            intervention: z.string().optional(),
            comparator: z.string().optional(),
            outcome: z.string().optional(),
            timeframe: z.string().optional(),
            setting: z.string().optional(),
          })
          .optional(),
        anchors: z
          .array(z.string())
          .optional()
          .describe(
            "0-5 source titles (or distinctive substrings) most directly related to this claim.",
          ),
      }),
    )
    .min(1)
    .max(30),
});

/** Prompt template you can feed into any LLM. */
export function buildExtractionPrompt(
  item: ParentItemMeta,
  sources: SourceDetails[],
  maxClaims: number,
) {
  const packed = packSourcesForPrompt(sources, {
    maxChars: 14000,
    maxAbstractChars: 420,
  });

  return `You are building auditable "claim cards" for a parent item (note/document/project).

Item title: "${item.title}"
Tags: ${(item.tags ?? []).join(", ") || "N/A"}
Item summary: ${item.summary ?? "N/A"}

Task:
Extract up to ${maxClaims} atomic, testable, cross-source claims that summarize the *state of evidence* across the linked sources.
Rules:
- Each claim must be falsifiable and specific (include population/setting/timeframe/outcome when possible).
- Avoid universal claims ("always", "proves").
- Prefer claims that can be audited against titles/abstracts.
- If evidence appears mixed across sources, still extract the claim but keep it narrow and testable.
- Add 0-5 anchors (source titles/substrings) most directly related.

Linked sources (titles + abstract snippets):
${packed}

Return JSON with "claims".`;
}

/** -----------------------------
 *  Core: Build claim cards from an Item + linked sources
 *  ----------------------------- */

export interface BuildOptions {
  /** Required: resolution */
  resolver: Resolver;

  /** Required: extraction (LLM or non-LLM) */
  extractor: Extractor;

  /** Optional: evidence judging */
  useJudge?: boolean;
  judge?: Judge;

  /** Controls */
  maxSourcesToResolve?: number;
  resolutionConcurrency?: number;

  maxClaims?: number;
  maxSourcesForSynthesis?: number;

  evidenceTopK?: number;
  evidenceJudgeConcurrency?: number;

  /** Optional: store additional queries on each card (for refresh/search) */
  extraQueries?: string[];

  /** Pass-through hints to the resolver (provider list, etc.) */
  resolutionHints?: Record<string, unknown>;

  /** Optional persistence */
  storage?: StorageAdapter;
}

export async function resolveLinkedSourcesToDetails(
  linked: LinkedSourceRef[],
  resolver: Resolver,
  opts?: {
    maxSourcesToResolve?: number;
    concurrency?: number;
    resolutionHints?: Record<string, unknown>;
  },
): Promise<SourceDetails[]> {
  const maxSourcesToResolve = opts?.maxSourcesToResolve ?? 120;
  const concurrency = opts?.concurrency ?? 6;

  const slice = linked.slice(0, maxSourcesToResolve);

  const resolved = await mapWithConcurrency(slice, concurrency, async (ref) => {
    try {
      return await resolver.resolve(ref, {
        maxSourcesToResolve,
        concurrency,
        resolutionHints: opts?.resolutionHints,
      });
    } catch {
      return null;
    }
  });

  return resolved.filter(Boolean) as SourceDetails[];
}

export async function buildClaimCardsFromItem(
  item: ParentItemMeta,
  linkedSources: LinkedSourceRef[],
  opts: BuildOptions,
): Promise<ClaimCard[]> {
  const now = new Date().toISOString();

  // 1) Resolve linked refs -> SourceDetails
  const resolvedSources = await resolveLinkedSourcesToDetails(
    linkedSources,
    opts.resolver,
    {
      maxSourcesToResolve: opts.maxSourcesToResolve ?? 120,
      concurrency: opts.resolutionConcurrency ?? 6,
      resolutionHints: opts.resolutionHints,
    },
  );

  // 2) Extract claims from a subset (token control)
  const maxSourcesForSynthesis = opts.maxSourcesForSynthesis ?? 60;
  const sourcesForSynthesis = resolvedSources.slice(0, maxSourcesForSynthesis);

  const maxClaims = opts.maxClaims ?? 12;
  const extracted = (
    await opts.extractor.extract(item, sourcesForSynthesis, maxClaims)
  ).slice(0, maxClaims);

  // 3) Evidence mapping per claim (from full resolved set)
  const evidenceTopK = opts.evidenceTopK ?? 8;
  const useJudge = opts.useJudge ?? false;
  const judge = opts.judge;

  if (useJudge && !judge) {
    throw new Error("useJudge=true requires opts.judge");
  }

  const cards: ClaimCard[] = [];

  for (const c of extracted) {
    const queries = [
      c.claim,
      ...(opts.extraQueries ?? []),
      `${item.title}: ${c.claim}`,
    ];

    // Preselect evidence candidates via heuristic scoring
    const ranked = resolvedSources
      .map((s) => ({ s, score: basicRelevanceScore(c.claim, s) }))
      .sort((a, b) => b.score - a.score);

    // Optional anchor boost
    const anchors = (c.anchors ?? []).map((a) => a.toLowerCase());
    const boosted = ranked.map((r) => {
      const title = r.s.title.toLowerCase();
      const hit = anchors.some((a) => a && title.includes(a));
      return { ...r, score: Math.min(1, r.score + (hit ? 0.12 : 0)) };
    });

    const topSources = boosted.slice(0, evidenceTopK).map((x) => x.s);

    let evidence: EvidenceItem[] = [];
    if (useJudge && judge) {
      const judged = await mapWithConcurrency(
        topSources,
        opts.evidenceJudgeConcurrency ?? 6,
        async (s) => {
          const j = await judge.judge(c.claim, s);
          return {
            source: s,
            polarity: j.polarity,
            excerpt: bestSnippet(s),
            rationale: j.rationale,
            score: j.score,
            locator: { url: s.url },
          };
        },
      );
      evidence = judged;
    } else {
      evidence = topSources.map((s) => ({
        source: s,
        polarity: "mixed" as const,
        excerpt: bestSnippet(s),
        rationale: "Auto-mapped from title/abstract match (heuristic)",
        score: basicRelevanceScore(c.claim, s),
        locator: { url: s.url },
      }));
    }

    const { verdict, confidence } = aggregateVerdict(evidence);

    const card: ClaimCard = {
      id: stableClaimId(c.claim, c.scope, c.topic),
      claim: c.claim,
      scope: c.scope,
      topic: c.topic,
      verdict,
      confidence,
      evidence,
      queries,
      createdAt: now,
      updatedAt: now,
      provenance: {
        generatedBy: "generic:claim-cards@1",
        model: useJudge ? opts.judge?.name : undefined,
        resolvers: [opts.resolver.name],
        judge: useJudge ? opts.judge?.name : undefined,
        item: {
          id: item.id,
          title: item.title,
          tags: item.tags,
          createdAt: item.createdAt,
        },
        dataset: {
          linkedCount: linkedSources.length,
          resolvedCount: resolvedSources.length,
          usedForSynthesisCount: sourcesForSynthesis.length,
        },
      },
    };

    cards.push(card);

    // Optional persistence per-card (or do it later in bulk)
    if (opts.storage && item.id != null) {
      await opts.storage.saveCard(card, item.id);
    }
  }

  // Optional bulk persistence
  if (opts.storage && item.id != null) {
    await opts.storage.saveCardsForItem(cards, item.id);
  }

  return cards;
}

/** -----------------------------
 *  Refresh a single card within an item context
 *  (re-resolve sources + re-map evidence for the same claim)
 *  ----------------------------- */

export async function refreshClaimCardForItem(
  item: ParentItemMeta,
  linkedSources: LinkedSourceRef[],
  card: ClaimCard,
  opts: Omit<BuildOptions, "extractor"> & {
    /** No extraction needed for refresh; we keep the same claim text */
    resolver: Resolver;
  },
): Promise<ClaimCard> {
  const resolvedSources = await resolveLinkedSourcesToDetails(
    linkedSources,
    opts.resolver,
    {
      maxSourcesToResolve: opts.maxSourcesToResolve ?? 120,
      concurrency: opts.resolutionConcurrency ?? 6,
      resolutionHints: opts.resolutionHints,
    },
  );

  const evidenceTopK = opts.evidenceTopK ?? 8;
  const useJudge = opts.useJudge ?? false;

  const ranked = resolvedSources
    .map((s) => ({ s, score: basicRelevanceScore(card.claim, s) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, evidenceTopK)
    .map((x) => x.s);

  let evidence: EvidenceItem[] = [];
  if (useJudge) {
    if (!opts.judge) throw new Error("useJudge=true requires opts.judge");

    const judged = await mapWithConcurrency(
      ranked,
      opts.evidenceJudgeConcurrency ?? 6,
      async (s) => {
        const j = await opts.judge!.judge(card.claim, s);
        return {
          source: s,
          polarity: j.polarity,
          excerpt: bestSnippet(s),
          rationale: j.rationale,
          score: j.score,
          locator: { url: s.url },
        };
      },
    );
    evidence = judged;
  } else {
    evidence = ranked.map((s) => ({
      source: s,
      polarity: "mixed" as const,
      excerpt: bestSnippet(s),
      rationale: "Auto-mapped from title/abstract match (heuristic)",
      score: basicRelevanceScore(card.claim, s),
      locator: { url: s.url },
    }));
  }

  const { verdict, confidence } = aggregateVerdict(evidence);

  const refreshed: ClaimCard = {
    ...card,
    verdict,
    confidence,
    evidence,
    updatedAt: new Date().toISOString(),
    provenance: {
      ...card.provenance,
      model: useJudge ? opts.judge?.name : undefined,
      resolvers: [opts.resolver.name],
      judge: useJudge ? opts.judge?.name : undefined,
      dataset: {
        linkedCount: linkedSources.length,
        resolvedCount: resolvedSources.length,
        usedForSynthesisCount: Math.min(
          opts.maxSourcesForSynthesis ?? 60,
          resolvedSources.length,
        ),
      },
    },
  };

  if (opts.storage && item.id != null) {
    await opts.storage.saveCard(refreshed, item.id);
  }

  return refreshed;
}

/** -----------------------------
 *  Optional: Tiny in-memory storage adapter (for tests)
 *  ----------------------------- */

export function createInMemoryStorage(): StorageAdapter {
  const cards = new Map<string, ClaimCard>();
  const itemIndex = new Map<string | number, Set<string>>();

  return {
    name: "memory",
    async saveCard(card, itemId) {
      cards.set(card.id, card);
      if (itemId != null) {
        const set = itemIndex.get(itemId) ?? new Set<string>();
        set.add(card.id);
        itemIndex.set(itemId, set);
      }
    },
    async saveCardsForItem(cs, itemId) {
      for (const c of cs) await this.saveCard(c, itemId);
    },
    async getCard(cardId) {
      return cards.get(cardId) ?? null;
    },
    async getCardsForItem(itemId) {
      const set = itemIndex.get(itemId);
      if (!set) return [];
      return [...set].map((id) => cards.get(id)!).filter(Boolean);
    },
    async deleteCard(cardId) {
      cards.delete(cardId);
      for (const set of itemIndex.values()) set.delete(cardId);
    },
  };
}
