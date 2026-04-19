import { s as sql, g as generateObject } from '../mastra.mjs';
import { z } from 'zod';
import crypto from 'crypto';
import { sourceTools } from './0013290c-5452-43ab-8444-fdffe326a3bc.mjs';
import '@mastra/core';
import '@mastra/deployer-cloudflare';
import '@mastra/core/workflows';
import '@neondatabase/serverless';
import '@ai-sdk/openai';

async function extractClaims(text) {
  const schema = z.object({
    claims: z.array(z.string()).describe(
      "Atomic, testable claims extracted from the text. Each claim should be a single statement that can be verified independently."
    )
  });
  const result = await generateObject({
    schema,
    prompt: `Extract all factual claims from the following text. Make each claim:
1. Atomic (one testable statement)
2. Specific (include population, intervention, outcome where applicable)
3. Falsifiable (can be proven true or false)
4. Complete (doesn't require context from other claims)

Text:
${text}

Example transformations:
- "CBT helps anxiety" \u2192 "CBT reduces anxiety symptom severity in adults with generalized anxiety disorder"
- "Exercise improves mood" \u2192 "Regular aerobic exercise improves mood in adults with major depressive disorder"

Extract claims:`
  });
  return result.object.claims;
}
function stableClaimId(claim, scope) {
  const normalized = claim.trim().toLowerCase();
  const scopeStr = "";
  const hash = crypto.createHash("sha256").update(normalized + scopeStr).digest("hex").slice(0, 16);
  return `claim_${hash}`;
}
function bestSnippet(p) {
  const a = (p.abstract || "").trim();
  if (!a) return void 0;
  return a.length > 220 ? a.slice(0, 220) + "\u2026" : a;
}
function basicScore(claim, p) {
  const text = `${p.title} ${p.abstract ?? ""}`.toLowerCase();
  const tokens = claim.toLowerCase().split(/\W+/).filter(Boolean);
  const hits = tokens.filter((t) => text.includes(t)).length;
  return Math.min(1, hits / Math.max(6, tokens.length));
}
async function judgeEvidence(claim, paper) {
  const schema = z.object({
    polarity: z.enum(["supports", "contradicts", "mixed", "irrelevant"]).describe(
      "Does this paper support, contradict, provide mixed evidence for, or is irrelevant to the claim?"
    ),
    rationale: z.string().describe("Brief 1-2 sentence explanation"),
    score: z.number().min(0).max(1).describe("Confidence in this judgment (0-1)")
  });
  try {
    const result = await generateObject({
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
- score: confidence 0-1`
    });
    return result.object;
  } catch (error) {
    console.error("Error judging evidence:", error);
    return {
      polarity: "irrelevant",
      rationale: "Error during evaluation",
      score: 0
    };
  }
}
function aggregateVerdict(evidence) {
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
  const supportRatio = supports / relevant;
  const contradictRatio = contradicts / relevant;
  let verdict;
  if (supportRatio > 0.7) {
    verdict = "supported";
  } else if (contradictRatio > 0.7) {
    verdict = "contradicted";
  } else if (supportRatio + contradictRatio < 0.3) {
    verdict = "insufficient";
  } else {
    verdict = "mixed";
  }
  const evidenceStrength = Math.min(1, relevant / 5);
  const confidence = Math.min(0.95, avgScore * 0.7 + evidenceStrength * 0.3);
  return { verdict, confidence };
}
async function buildClaimCardsFromClaims(claims, opts) {
  const perSourceLimit = opts?.perSourceLimit ?? 10;
  const topK = opts?.topK ?? 6;
  const useLlmJudge = opts?.useLlmJudge ?? false;
  const sources = opts?.sources ?? ["crossref", "pubmed", "semantic_scholar"];
  const paperPool = opts?.paperPool;
  const poolConcurrency = Math.max(1, Math.min(8, opts?.poolConcurrency ?? 3));
  const enrichPool = opts?.enrichPool ?? true;
  const detailsCache = /* @__PURE__ */ new Map();
  const cacheKeyFor = (p) => {
    const doi = sourceTools.normalizeDoi(p.doi);
    if (doi) return `doi:${doi}`;
    const t = (p.title || "").trim();
    if (t) return `t:${sourceTools.titleFingerprint(t)}`;
    return `u:${p.url ?? Math.random().toString()}`;
  };
  const fetchDetailsCached = async (p) => {
    const key = cacheKeyFor(p);
    const cached = detailsCache.get(key);
    if (cached) return cached;
    const d = await sourceTools.fetchPaperDetails(p);
    detailsCache.set(key, d);
    return d;
  };
  const rankPoolForClaim = (claim, pool) => {
    const scored = pool.map((p) => {
      const score = basicScore(claim, p);
      return { p, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.map((x) => x.p);
  };
  const cards = [];
  let poolDetails = null;
  if (paperPool?.length) {
    const dedupedPool = sourceTools.dedupeCandidates(paperPool);
    if (!enrichPool) {
      poolDetails = dedupedPool.map((p) => ({
        ...p,
        abstract: p.abstract ?? "Abstract not available",
        authors: p.authors ?? [],
        doi: sourceTools.normalizeDoi(p.doi)
      }));
    } else {
      poolDetails = await sourceTools.mapLimit(
        dedupedPool,
        poolConcurrency,
        async (p) => {
          if (p.abstract && sourceTools.stripJats(p.abstract)?.length) {
            return {
              ...p,
              abstract: sourceTools.stripJats(p.abstract) ?? p.abstract,
              authors: p.authors ?? [],
              doi: sourceTools.normalizeDoi(p.doi)
            };
          }
          return fetchDetailsCached(p);
        }
      );
    }
  }
  for (const claim of claims) {
    const queries = [claim];
    let enriched = [];
    let sourceNames = [];
    if (poolDetails?.length) {
      const ranked = rankPoolForClaim(claim, poolDetails);
      enriched = ranked.slice(0, topK);
      sourceNames = ["linked_pool"];
    } else {
      const searchPromises = [];
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
          sourceTools.searchSemanticScholar(claim, perSourceLimit)
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
    const evidence = [];
    for (const p of enriched) {
      if (useLlmJudge) {
        const judgment = await judgeEvidence(claim, p);
        evidence.push({
          paper: p,
          polarity: judgment.polarity,
          excerpt: bestSnippet(p),
          rationale: judgment.rationale,
          score: judgment.score
        });
      } else {
        evidence.push({
          paper: p,
          polarity: "mixed",
          // Conservative default
          excerpt: bestSnippet(p),
          rationale: "Auto-mapped from abstract/title match",
          score: basicScore(claim, p)
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
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      provenance: {
        generatedBy: "pipeline:claim-cards@1",
        model: useLlmJudge ? "deepseek-chat" : void 0,
        sourceTools: sourceNames
      }
    });
  }
  return cards;
}
async function buildClaimCardsFromText(text, opts) {
  const claims = await extractClaims(text);
  return buildClaimCardsFromClaims(claims, opts);
}
async function refreshClaimCard(card, opts) {
  const [refreshed] = await buildClaimCardsFromClaims([card.claim], opts);
  return {
    ...refreshed,
    id: card.id,
    // Keep original ID
    createdAt: card.createdAt,
    // Keep original creation time
    notes: card.notes
    // Preserve any notes
  };
}
async function saveClaimCard(card, noteId) {
  const confidenceInt = Math.round(card.confidence * 100);
  await sql`
    INSERT INTO claim_cards (id, note_id, claim, scope, verdict, confidence, evidence, queries, provenance, notes, created_at, updated_at)
    VALUES (${card.id}, ${noteId || null}, ${card.claim}, ${card.scope ? JSON.stringify(card.scope) : null}, ${card.verdict}, ${confidenceInt}, ${JSON.stringify(card.evidence)}, ${JSON.stringify(card.queries)}, ${JSON.stringify(card.provenance)}, ${card.notes || null}, ${card.createdAt}, ${card.updatedAt})
    ON CONFLICT (id) DO UPDATE SET
      claim = excluded.claim,
      scope = excluded.scope,
      verdict = excluded.verdict,
      confidence = excluded.confidence,
      evidence = excluded.evidence,
      queries = excluded.queries,
      provenance = excluded.provenance,
      notes = excluded.notes,
      updated_at = excluded.updated_at`;
  if (noteId) {
    await sql`INSERT INTO notes_claims (note_id, claim_id) VALUES (${noteId}, ${card.id}) ON CONFLICT DO NOTHING`;
  }
}
async function getClaimCard(claimId) {
  const rows = await sql`SELECT * FROM claim_cards WHERE id = ${claimId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    claim: row.claim,
    scope: row.scope ? JSON.parse(row.scope) : void 0,
    verdict: row.verdict,
    confidence: row.confidence / 100,
    evidence: JSON.parse(row.evidence),
    queries: JSON.parse(row.queries),
    provenance: JSON.parse(row.provenance),
    notes: row.notes || void 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function getClaimCardsForNote(noteId) {
  const rows = await sql`
    SELECT cc.* FROM claim_cards cc
    INNER JOIN notes_claims nc ON cc.id = nc.claim_id
    WHERE nc.note_id = ${noteId}
    ORDER BY cc.created_at DESC`;
  return rows.map((row) => ({
    id: row.id,
    claim: row.claim,
    scope: row.scope ? JSON.parse(row.scope) : void 0,
    verdict: row.verdict,
    confidence: row.confidence / 100,
    evidence: JSON.parse(row.evidence),
    queries: JSON.parse(row.queries),
    provenance: JSON.parse(row.provenance),
    notes: row.notes || void 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function deleteClaimCard(claimId) {
  await sql`DELETE FROM notes_claims WHERE claim_id = ${claimId}`;
  await sql`DELETE FROM claim_cards WHERE id = ${claimId}`;
}
const claimCardsTools = {
  // Core claim card generation
  extractClaims,
  buildClaimCardsFromClaims,
  buildClaimCardsFromText,
  refreshClaimCard,
  // Database persistence
  saveClaimCard,
  getClaimCard,
  getClaimCardsForNote,
  deleteClaimCard
};

export { buildClaimCardsFromClaims, buildClaimCardsFromText, claimCardsTools, deleteClaimCard, extractClaims, getClaimCard, getClaimCardsForNote, refreshClaimCard, saveClaimCard };
