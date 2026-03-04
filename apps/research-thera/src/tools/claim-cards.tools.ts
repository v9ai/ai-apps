import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";
import crypto from "crypto";
import {
  sourceTools,
  type PaperCandidate,
  type PaperDetails,
} from "./sources.tools";

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

/**
 * Claim Cards Tools
 * Turn research claims into auditable, evidence-backed cards
 *
 * Usage:
 * ```typescript
 * const cards = await buildClaimCardsFromClaims([
 *   "CBT reduces anxiety symptom severity in adults with GAD",
 *   "Exposure therapy is effective for PTSD treatment"
 * ]);
 * ```
 */

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

export interface EvidenceItem {
  paper: PaperCandidate;
  polarity: EvidencePolarity;
  excerpt?: string;
  rationale?: string;
  score?: number;
  locator?: {
    section?: string;
    page?: number;
    url?: string;
  };
}

export interface ClaimScope {
  population?: string;
  intervention?: string;
  comparator?: string;
  outcome?: string;
  timeframe?: string;
  setting?: string;
}

export interface ClaimCard {
  id: string;
  claim: string;
  scope?: ClaimScope;
  verdict: ClaimVerdict;
  confidence: number;
  evidence: EvidenceItem[];
  queries: string[];
  createdAt: string;
  updatedAt: string;
  provenance: {
    generatedBy: string;
    model?: string;
    sourceTools: string[];
  };
  notes?: string;
}

/**
 * Extract atomic claims from text using LLM
 */
export async function extractClaims(text: string): Promise<string[]> {
  const schema = z.object({
    claims: z
      .array(z.string())
      .describe(
        "Atomic, testable claims extracted from the text. Each claim should be a single statement that can be verified independently.",
      ),
  });

  const result = await generateObject({
    model: deepseek("deepseek-chat"),
    schema,
    prompt: `Extract all factual claims from the following text. Make each claim:
1. Atomic (one testable statement)
2. Specific (include population, intervention, outcome where applicable)
3. Falsifiable (can be proven true or false)
4. Complete (doesn't require context from other claims)

Text:
${text}

Example transformations:
- "CBT helps anxiety" → "CBT reduces anxiety symptom severity in adults with generalized anxiety disorder"
- "Exercise improves mood" → "Regular aerobic exercise improves mood in adults with major depressive disorder"

Extract claims:`,
  });

  return result.object.claims;
}

/**
 * Generate a stable ID for a claim
 */
function stableClaimId(claim: string, scope?: ClaimScope): string {
  const normalized = claim.trim().toLowerCase();
  const scopeStr = scope ? JSON.stringify(scope) : "";
  const hash = crypto
    .createHash("sha256")
    .update(normalized + scopeStr)
    .digest("hex")
    .slice(0, 16);
  return `claim_${hash}`;
}

/**
 * Extract best snippet from paper for display
 */
function bestSnippet(p: PaperDetails): string | undefined {
  const a = (p.abstract || "").trim();
  if (!a) return undefined;
  return a.length > 220 ? a.slice(0, 220) + "…" : a;
}

/**
 * Basic scoring heuristic (token overlap)
 */
function basicScore(claim: string, p: PaperDetails): number {
  const text = `${p.title} ${p.abstract ?? ""}`.toLowerCase();
  const tokens = claim.toLowerCase().split(/\W+/).filter(Boolean);
  const hits = tokens.filter((t) => text.includes(t)).length;
  return Math.min(1, hits / Math.max(6, tokens.length));
}

/**
 * Judge evidence polarity using LLM
 */
async function judgeEvidence(
  claim: string,
  paper: PaperDetails,
): Promise<{ polarity: EvidencePolarity; rationale: string; score: number }> {
  const schema = z.object({
    polarity: z
      .enum(["supports", "contradicts", "mixed", "irrelevant"])
      .describe(
        "Does this paper support, contradict, provide mixed evidence for, or is irrelevant to the claim?",
      ),
    rationale: z.string().describe("Brief 1-2 sentence explanation"),
    score: z
      .number()
      .min(0)
      .max(1)
      .describe("Confidence in this judgment (0-1)"),
  });

  try {
    const result = await generateObject({
      model: deepseek("deepseek-chat"),
      schema,
      prompt: `Evaluate whether this research paper supports, contradicts, or is irrelevant to the claim.

Claim: "${claim}"

Paper:
Title: ${paper.title}
Authors: ${paper.authors.join(", ")}
Abstract: ${paper.abstract || "No abstract available"}

Respond with:
- polarity: supports/contradicts/mixed/irrelevant
- rationale: why (1-2 sentences)
- score: confidence 0-1`,
    });

    return result.object;
  } catch (error) {
    console.error("Error judging evidence:", error);
    return {
      polarity: "irrelevant",
      rationale: "Error during evaluation",
      score: 0,
    };
  }
}

/**
 * Aggregate evidence into verdict and confidence
 */
function aggregateVerdict(evidence: EvidenceItem[]): {
  verdict: ClaimVerdict;
  confidence: number;
} {
  if (evidence.length === 0) {
    return { verdict: "insufficient", confidence: 0 };
  }

  const polarities = evidence.map((e) => e.polarity);
  const scores = evidence.map((e) => e.score ?? 0);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  const supports = polarities.filter((p) => p === "supports").length;
  const contradicts = polarities.filter((p) => p === "contradicts").length;
  const mixed = polarities.filter((p) => p === "mixed").length;
  const relevant = supports + contradicts + mixed;

  if (relevant === 0) {
    return { verdict: "insufficient", confidence: Math.max(0.1, avgScore) };
  }

  // Determine verdict based on evidence distribution
  const supportRatio = supports / relevant;
  const contradictRatio = contradicts / relevant;

  let verdict: ClaimVerdict;
  if (supportRatio > 0.7) {
    verdict = "supported";
  } else if (contradictRatio > 0.7) {
    verdict = "contradicted";
  } else if (supportRatio + contradictRatio < 0.3) {
    verdict = "insufficient";
  } else {
    verdict = "mixed";
  }

  // Confidence is based on average score and number of relevant papers
  const evidenceStrength = Math.min(1, relevant / 5); // More evidence = higher confidence
  const confidence = Math.min(0.95, avgScore * 0.7 + evidenceStrength * 0.3);

  return { verdict, confidence };
}

/**
 * Build claim cards from a list of claims
 */
export async function buildClaimCardsFromClaims(
  claims: string[],
  opts?: {
    perSourceLimit?: number;
    topK?: number;
    useLlmJudge?: boolean;
    sources?: (
      | "crossref"
      | "pubmed"
      | "semantic_scholar"
      | "openalex"
      | "arxiv"
      | "europepmc"
    )[];

    /**
     * NEW: If provided, we will NOT call search APIs per-claim.
     * Instead we rank evidence from this pool (e.g., your 182 linked papers).
     *
     * Best practice: pool items should already include abstracts;
     * if not, we'll enrich them (slow) unless you pre-backfill to DB.
     */
    paperPool?: PaperCandidate[];

    /**
     * NEW: Controls how aggressively we enrich the pool (if abstracts missing).
     * Keep low to avoid hammering upstream APIs.
     */
    poolConcurrency?: number;

    /**
     * NEW: If true, we attempt to enrich pool items missing abstracts
     * by calling fetchPaperDetails. If false, we rank on title-only.
     */
    enrichPool?: boolean;
  },
): Promise<ClaimCard[]> {
  const perSourceLimit = opts?.perSourceLimit ?? 10;
  const topK = opts?.topK ?? 6;
  const useLlmJudge = opts?.useLlmJudge ?? false;
  const sources = opts?.sources ?? ["crossref", "pubmed", "semantic_scholar"];

  const paperPool = opts?.paperPool;
  const poolConcurrency = Math.max(1, Math.min(8, opts?.poolConcurrency ?? 3));
  const enrichPool = opts?.enrichPool ?? true;

  // Small in-memory cache to avoid repeated fetches within one run.
  const detailsCache = new Map<string, PaperDetails>();

  const cacheKeyFor = (p: PaperCandidate) => {
    const doi = sourceTools.normalizeDoi(p.doi);
    if (doi) return `doi:${doi}`;
    const t = (p.title || "").trim();
    if (t) return `t:${sourceTools.titleFingerprint(t)}`;
    return `u:${p.url ?? Math.random().toString()}`;
  };

  const fetchDetailsCached = async (
    p: PaperCandidate,
  ): Promise<PaperDetails> => {
    const key = cacheKeyFor(p);
    const cached = detailsCache.get(key);
    if (cached) return cached;

    const d = await sourceTools.fetchPaperDetails(p);
    detailsCache.set(key, d);
    return d;
  };

  const rankPoolForClaim = (claim: string, pool: PaperDetails[]) => {
    // Prefer abstract-aware scoring, fallback to title-only.
    const scored = pool.map((p) => {
      const score = basicScore(claim, p); // uses title + abstract (if present)
      return { p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((x) => x.p);
  };

  const cards: ClaimCard[] = [];

  // If a pool is provided, enrich it once (optional) and reuse for every claim.
  let poolDetails: PaperDetails[] | null = null;
  if (paperPool?.length) {
    const dedupedPool = sourceTools.dedupeCandidates(paperPool);

    if (!enrichPool) {
      // Keep as-is; ensure shape matches PaperDetails as best as possible.
      poolDetails = dedupedPool.map((p) => ({
        ...p,
        abstract: p.abstract ?? "Abstract not available",
        authors: p.authors ?? [],
        doi: sourceTools.normalizeDoi(p.doi),
      }));
    } else {
      // Enrich missing abstracts / normalize metadata with limited concurrency.
      poolDetails = await sourceTools.mapLimit(
        dedupedPool,
        poolConcurrency,
        async (p) => {
          // If the pool already has an abstract, still normalize DOI/JATS.
          if (p.abstract && sourceTools.stripJats(p.abstract)?.length) {
            return {
              ...p,
              abstract: sourceTools.stripJats(p.abstract) ?? p.abstract,
              authors: p.authors ?? [],
              doi: sourceTools.normalizeDoi(p.doi),
            } as PaperDetails;
          }
          return fetchDetailsCached(p);
        },
      );
    }
  }

  for (const claim of claims) {
    const queries = [claim];

    let enriched: PaperDetails[] = [];
    let sourceNames: string[] = [];

    if (poolDetails?.length) {
      // ✅ Pool-driven evidence selection (your 182).
      const ranked = rankPoolForClaim(claim, poolDetails);
      enriched = ranked.slice(0, topK);
      sourceNames = ["linked_pool"];
    } else {
      // ✅ Existing behavior: per-claim external search.
      const searchPromises: Promise<PaperCandidate[]>[] = [];
      sourceNames = [];

      if (sources.includes("crossref")) {
        searchPromises.push(sourceTools.searchCrossref(claim, perSourceLimit));
        sourceNames.push("crossref");
      }
      if (sources.includes("pubmed")) {
        searchPromises.push(sourceTools.searchPubMed(claim, perSourceLimit));
        sourceNames.push("pubmed");
      }
      if (sources.includes("semantic_scholar")) {
        searchPromises.push(
          sourceTools.searchSemanticScholar(claim, perSourceLimit),
        );
        sourceNames.push("semantic_scholar");
      }
      if (sources.includes("openalex")) {
        searchPromises.push(sourceTools.searchOpenAlex(claim, perSourceLimit));
        sourceNames.push("openalex");
      }
      if (sources.includes("arxiv")) {
        searchPromises.push(sourceTools.searchArxiv(claim, perSourceLimit));
        sourceNames.push("arxiv");
      }
      if (sources.includes("europepmc")) {
        searchPromises.push(sourceTools.searchEuropePmc(claim, perSourceLimit));
        sourceNames.push("europepmc");
      }

      const results = await Promise.all(searchPromises);
      const allCandidates = results.flat();
      const candidates = sourceTools.dedupeCandidates(allCandidates);

      for (const c of candidates.slice(0, topK)) {
        const details = await sourceTools.fetchPaperDetails(c);
        enriched.push(details);
      }
    }

    // Judge evidence vs claim
    const evidence: EvidenceItem[] = [];
    for (const p of enriched) {
      if (useLlmJudge) {
        const judgment = await judgeEvidence(claim, p);
        evidence.push({
          paper: p,
          polarity: judgment.polarity,
          excerpt: bestSnippet(p),
          rationale: judgment.rationale,
          score: judgment.score,
        });
      } else {
        // Use heuristic scoring
        evidence.push({
          paper: p,
          polarity: "mixed", // Conservative default
          excerpt: bestSnippet(p),
          rationale: "Auto-mapped from abstract/title match",
          score: basicScore(claim, p),
        });
      }
    }

    const { verdict, confidence } = aggregateVerdict(evidence);

    cards.push({
      id: stableClaimId(claim),
      claim,
      verdict,
      confidence,
      evidence,
      queries,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provenance: {
        generatedBy: "mastra:claim-cards@1",
        model: useLlmJudge ? "deepseek-chat" : undefined,
        sourceTools: sourceNames,
      },
    });
  }

  return cards;
}

/**
 * Build claim cards from free text (extract claims first)
 */
export async function buildClaimCardsFromText(
  text: string,
  opts?: Parameters<typeof buildClaimCardsFromClaims>[1],
): Promise<ClaimCard[]> {
  const claims = await extractClaims(text);
  return buildClaimCardsFromClaims(claims, opts);
}

/**
 * Refresh evidence for existing claim cards
 */
export async function refreshClaimCard(
  card: ClaimCard,
  opts?: Parameters<typeof buildClaimCardsFromClaims>[1],
): Promise<ClaimCard> {
  const [refreshed] = await buildClaimCardsFromClaims([card.claim], opts);
  return {
    ...refreshed,
    id: card.id, // Keep original ID
    createdAt: card.createdAt, // Keep original creation time
    notes: card.notes, // Preserve any notes
  };
}

/**
 * Database persistence for claim cards
 */
import { d1 } from "@/src/db/d1";
import path from "path";

export async function saveClaimCard(
  card: ClaimCard,
  noteId?: number,
): Promise<void> {
  const confidenceInt = Math.round(card.confidence * 100);

  await d1.execute({
    sql: `INSERT OR REPLACE INTO claim_cards
      (id, note_id, claim, scope, verdict, confidence, evidence, queries, provenance, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      card.id,
      noteId || null,
      card.claim,
      card.scope ? JSON.stringify(card.scope) : null,
      card.verdict,
      confidenceInt,
      JSON.stringify(card.evidence),
      JSON.stringify(card.queries),
      JSON.stringify(card.provenance),
      card.notes || null,
      card.createdAt,
      card.updatedAt,
    ],
  });

  // Link to note if provided
  if (noteId) {
    await d1.execute({
      sql: `INSERT OR IGNORE INTO notes_claims (note_id, claim_id) VALUES (?, ?)`,
      args: [noteId, card.id],
    });
  }
}

export async function getClaimCard(claimId: string): Promise<ClaimCard | null> {
  const result = await d1.execute({
    sql: `SELECT * FROM claim_cards WHERE id = ?`,
    args: [claimId],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id as string,
    claim: row.claim as string,
    scope: row.scope ? JSON.parse(row.scope as string) : undefined,
    verdict: row.verdict as ClaimVerdict,
    confidence: (row.confidence as number) / 100,
    evidence: JSON.parse(row.evidence as string),
    queries: JSON.parse(row.queries as string),
    provenance: JSON.parse(row.provenance as string),
    notes: (row.notes as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getClaimCardsForNote(
  noteId: number,
): Promise<ClaimCard[]> {
  const result = await d1.execute({
    sql: `SELECT cc.* FROM claim_cards cc
      INNER JOIN notes_claims nc ON cc.id = nc.claim_id
      WHERE nc.note_id = ?
      ORDER BY cc.created_at DESC`,
    args: [noteId],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    claim: row.claim as string,
    scope: row.scope ? JSON.parse(row.scope as string) : undefined,
    verdict: row.verdict as ClaimVerdict,
    confidence: (row.confidence as number) / 100,
    evidence: JSON.parse(row.evidence as string),
    queries: JSON.parse(row.queries as string),
    provenance: JSON.parse(row.provenance as string),
    notes: (row.notes as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function deleteClaimCard(claimId: string): Promise<void> {
  await d1.execute({
    sql: `DELETE FROM notes_claims WHERE claim_id = ?`,
    args: [claimId],
  });

  await d1.execute({
    sql: `DELETE FROM claim_cards WHERE id = ?`,
    args: [claimId],
  });
}

export const claimCardsTools = {
  // Core claim card generation
  extractClaims,
  buildClaimCardsFromClaims,
  buildClaimCardsFromText,
  refreshClaimCard,

  // Database persistence
  saveClaimCard,
  getClaimCard,
  getClaimCardsForNote,
  deleteClaimCard,
};
