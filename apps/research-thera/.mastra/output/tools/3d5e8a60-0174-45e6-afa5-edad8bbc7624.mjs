import crypto from 'crypto';
import { z } from 'zod';

function stableClaimId(claim, scope, topic) {
  const normalized = claim.trim().toLowerCase();
  const scopeStr = scope ? JSON.stringify(scope) : "";
  const topicStr = topic ?? "";
  const hash = crypto.createHash("sha256").update(normalized + scopeStr + topicStr).digest("hex").slice(0, 16);
  return `claim_${hash}`;
}
function tokenize(s) {
  return s.toLowerCase().split(/\W+/).filter((t) => t && t.length > 2);
}
function basicRelevanceScore(claim, s) {
  const text = `${s.title} ${s.abstract ?? ""}`.toLowerCase();
  const tokens = tokenize(claim);
  if (tokens.length === 0) return 0;
  const hits = tokens.filter((t) => text.includes(t)).length;
  const denom = Math.max(8, Math.floor(tokens.length * 0.75));
  return Math.min(1, hits / denom);
}
function bestSnippet(s) {
  const a = (s.abstract || "").trim();
  if (!a) return void 0;
  return a.length > 260 ? a.slice(0, 260) + "\u2026" : a;
}
async function mapWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    for (; ; ) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from(
    { length: Math.max(1, concurrency) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}
function packSourcesForPrompt(sources, opts) {
  const maxChars = opts?.maxChars;
  const maxAbstractChars = opts?.maxAbstractChars;
  const lines = [];
  let used = 0;
  for (const s of sources) {
    const year = s.year ? ` (${s.year})` : "";
    const abs = (s.abstract || "").replace(/\s+/g, " ").trim();
    const absShort = abs.length > maxAbstractChars ? abs.slice(0, maxAbstractChars) + "\u2026" : abs;
    const line = `- Title: ${s.title}${year}
  Authors: ${(s.authors || []).slice(0, 8).join(", ")}
  Abstract: ${absShort || "N/A"}
`;
    if (used + line.length > maxChars) break;
    lines.push(line);
    used += line.length;
  }
  return lines.join("\n");
}
function aggregateVerdict(evidence) {
  if (evidence.length === 0) return { verdict: "insufficient", confidence: 0 };
  const relevant = evidence.filter(
    (e) => e.polarity === "supports" || e.polarity === "contradicts" || e.polarity === "mixed"
  );
  if (relevant.length === 0) {
    const avg = evidence.reduce((s, e) => s + (e.score ?? 0), 0) / evidence.length;
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
  let verdict;
  if (supportRatio > 0.72) verdict = "supported";
  else if (contradictRatio > 0.72) verdict = "contradicted";
  else if (supportRatio + contradictRatio < 0.35) verdict = "insufficient";
  else verdict = "mixed";
  const avgScore = relevant.reduce((s, e) => s + (e.score ?? 0), 0) / relevant.length;
  const quantity = Math.min(1, relevant.length / 6);
  const decisiveness = Math.max(supportRatio, contradictRatio);
  const confidence = Math.min(
    0.95,
    avgScore * 0.55 + quantity * 0.25 + decisiveness * 0.2
  );
  return { verdict, confidence };
}
const extractedClaimsSchema = z.object({
  claims: z.array(
    z.object({
      claim: z.string().min(8).describe(
        "Atomic, testable statement. Avoid vague language; prefer measurable outcomes."
      ),
      topic: z.string().optional().describe(
        "Free-form topic label, e.g. 'policy', 'metrics', 'health'."
      ),
      scope: z.object({
        population: z.string().optional(),
        intervention: z.string().optional(),
        comparator: z.string().optional(),
        outcome: z.string().optional(),
        timeframe: z.string().optional(),
        setting: z.string().optional()
      }).optional(),
      anchors: z.array(z.string()).optional().describe(
        "0-5 source titles (or distinctive substrings) most directly related to this claim."
      )
    })
  ).min(1).max(30)
});
function buildExtractionPrompt(item, sources, maxClaims) {
  const packed = packSourcesForPrompt(sources, {
    maxChars: 14e3,
    maxAbstractChars: 420
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
async function resolveLinkedSourcesToDetails(linked, resolver, opts) {
  const maxSourcesToResolve = opts?.maxSourcesToResolve ?? 120;
  const concurrency = opts?.concurrency ?? 6;
  const slice = linked.slice(0, maxSourcesToResolve);
  const resolved = await mapWithConcurrency(slice, concurrency, async (ref) => {
    try {
      return await resolver.resolve(ref, {
        maxSourcesToResolve,
        concurrency,
        resolutionHints: opts?.resolutionHints
      });
    } catch {
      return null;
    }
  });
  return resolved.filter(Boolean);
}
async function buildClaimCardsFromItem(item, linkedSources, opts) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const resolvedSources = await resolveLinkedSourcesToDetails(
    linkedSources,
    opts.resolver,
    {
      maxSourcesToResolve: opts.maxSourcesToResolve ?? 120,
      concurrency: opts.resolutionConcurrency ?? 6,
      resolutionHints: opts.resolutionHints
    }
  );
  const maxSourcesForSynthesis = opts.maxSourcesForSynthesis ?? 60;
  const sourcesForSynthesis = resolvedSources.slice(0, maxSourcesForSynthesis);
  const maxClaims = opts.maxClaims ?? 12;
  const extracted = (await opts.extractor.extract(item, sourcesForSynthesis, maxClaims)).slice(0, maxClaims);
  const evidenceTopK = opts.evidenceTopK ?? 8;
  const useJudge = opts.useJudge ?? false;
  const judge = opts.judge;
  if (useJudge && !judge) {
    throw new Error("useJudge=true requires opts.judge");
  }
  const cards = [];
  for (const c of extracted) {
    const queries = [
      c.claim,
      ...opts.extraQueries ?? [],
      `${item.title}: ${c.claim}`
    ];
    const ranked = resolvedSources.map((s) => ({ s, score: basicRelevanceScore(c.claim, s) })).sort((a, b) => b.score - a.score);
    const anchors = (c.anchors ?? []).map((a) => a.toLowerCase());
    const boosted = ranked.map((r) => {
      const title = r.s.title.toLowerCase();
      const hit = anchors.some((a) => a && title.includes(a));
      return { ...r, score: Math.min(1, r.score + (hit ? 0.12 : 0)) };
    });
    const topSources = boosted.slice(0, evidenceTopK).map((x) => x.s);
    let evidence = [];
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
            locator: { url: s.url }
          };
        }
      );
      evidence = judged;
    } else {
      evidence = topSources.map((s) => ({
        source: s,
        polarity: "mixed",
        excerpt: bestSnippet(s),
        rationale: "Auto-mapped from title/abstract match (heuristic)",
        score: basicRelevanceScore(c.claim, s),
        locator: { url: s.url }
      }));
    }
    const { verdict, confidence } = aggregateVerdict(evidence);
    const card = {
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
        model: useJudge ? opts.judge?.name : void 0,
        resolvers: [opts.resolver.name],
        judge: useJudge ? opts.judge?.name : void 0,
        item: {
          id: item.id,
          title: item.title,
          tags: item.tags,
          createdAt: item.createdAt
        },
        dataset: {
          linkedCount: linkedSources.length,
          resolvedCount: resolvedSources.length,
          usedForSynthesisCount: sourcesForSynthesis.length
        }
      }
    };
    cards.push(card);
    if (opts.storage && item.id != null) {
      await opts.storage.saveCard(card, item.id);
    }
  }
  if (opts.storage && item.id != null) {
    await opts.storage.saveCardsForItem(cards, item.id);
  }
  return cards;
}
async function refreshClaimCardForItem(item, linkedSources, card, opts) {
  const resolvedSources = await resolveLinkedSourcesToDetails(
    linkedSources,
    opts.resolver,
    {
      maxSourcesToResolve: opts.maxSourcesToResolve ?? 120,
      concurrency: opts.resolutionConcurrency ?? 6,
      resolutionHints: opts.resolutionHints
    }
  );
  const evidenceTopK = opts.evidenceTopK ?? 8;
  const useJudge = opts.useJudge ?? false;
  const ranked = resolvedSources.map((s) => ({ s, score: basicRelevanceScore(card.claim, s) })).sort((a, b) => b.score - a.score).slice(0, evidenceTopK).map((x) => x.s);
  let evidence = [];
  if (useJudge) {
    if (!opts.judge) throw new Error("useJudge=true requires opts.judge");
    const judged = await mapWithConcurrency(
      ranked,
      opts.evidenceJudgeConcurrency ?? 6,
      async (s) => {
        const j = await opts.judge.judge(card.claim, s);
        return {
          source: s,
          polarity: j.polarity,
          excerpt: bestSnippet(s),
          rationale: j.rationale,
          score: j.score,
          locator: { url: s.url }
        };
      }
    );
    evidence = judged;
  } else {
    evidence = ranked.map((s) => ({
      source: s,
      polarity: "mixed",
      excerpt: bestSnippet(s),
      rationale: "Auto-mapped from title/abstract match (heuristic)",
      score: basicRelevanceScore(card.claim, s),
      locator: { url: s.url }
    }));
  }
  const { verdict, confidence } = aggregateVerdict(evidence);
  const refreshed = {
    ...card,
    verdict,
    confidence,
    evidence,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    provenance: {
      ...card.provenance,
      model: useJudge ? opts.judge?.name : void 0,
      resolvers: [opts.resolver.name],
      judge: useJudge ? opts.judge?.name : void 0,
      dataset: {
        linkedCount: linkedSources.length,
        resolvedCount: resolvedSources.length,
        usedForSynthesisCount: Math.min(
          opts.maxSourcesForSynthesis ?? 60,
          resolvedSources.length
        )
      }
    }
  };
  if (opts.storage && item.id != null) {
    await opts.storage.saveCard(refreshed, item.id);
  }
  return refreshed;
}
function createInMemoryStorage() {
  const cards = /* @__PURE__ */ new Map();
  const itemIndex = /* @__PURE__ */ new Map();
  return {
    name: "memory",
    async saveCard(card, itemId) {
      cards.set(card.id, card);
      if (itemId != null) {
        const set = itemIndex.get(itemId) ?? /* @__PURE__ */ new Set();
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
      return [...set].map((id) => cards.get(id)).filter(Boolean);
    },
    async deleteCard(cardId) {
      cards.delete(cardId);
      for (const set of itemIndex.values()) set.delete(cardId);
    }
  };
}

export { buildClaimCardsFromItem, buildExtractionPrompt, createInMemoryStorage, extractedClaimsSchema, refreshClaimCardForItem, resolveLinkedSourcesToDetails };
