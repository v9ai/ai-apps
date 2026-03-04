import type { MutationResolvers } from "../../types.generated";
import { claimCardsTools } from "../../../src/tools/claim-cards.tools";
import { sourceTools, PaperCandidate } from "../../../src/tools/sources.tools";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";
import { toGqlClaimCards } from "../utils/normalize-claim-card";
import { d1 } from "../../../src/db/d1";
import type { PaperDetails } from "../../../src/tools/sources.tools";

// Suppress AI SDK warnings
if (typeof globalThis !== "undefined") {
  (globalThis as any).AI_SDK_LOG_WARNINGS = false;
}

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

/**
 * Load the 182 linked research items for a note
 * Adapt SQL to your schema (whatever powers "Linked Research (182)").
 */
async function loadLinkedResearchForNote(
  noteId: number,
): Promise<PaperCandidate[]> {
  // Query the notes_research join table to get research papers for this note
  const res = await d1.execute({
    sql: `
      SELECT
        r.id as id,
        r.title as title,
        r.year as year,
        r.doi as doi,
        r.url as url,
        r.authors as authors,
        r.abstract as abstract,
        r.journal as journal
      FROM therapy_research r
      INNER JOIN notes_research nr ON nr.research_id = r.id
      WHERE nr.note_id = ?
      ORDER BY r.year DESC
    `,
    args: [noteId],
  });

  return res.rows.map((r: any) => ({
    title: String(r.title),
    year: r.year != null ? Number(r.year) : undefined,
    doi: r.doi ? String(r.doi) : undefined,
    url: r.url ? String(r.url) : undefined,
    source: "linked",
    authors: r.authors ? JSON.parse(String(r.authors)) : undefined,
    abstract: r.abstract ? String(r.abstract) : undefined,
    journal: r.journal ? String(r.journal) : undefined,
  }));
}

/**
 * Extract claims from many abstracts (batched)
 */
async function extractClaimsFromPapersBatched(
  topic: string,
  papers: PaperDetails[],
  opts?: { batchSize?: number; maxClaims?: number },
): Promise<string[]> {
  const batchSize = Math.max(6, Math.min(20, opts?.batchSize ?? 12));
  const maxClaims = Math.max(5, Math.min(30, opts?.maxClaims ?? 12));

  const claimsSchema = z.object({
    claims: z.array(z.string()),
  });

  // Only papers with real abstracts
  const withAbstracts = papers.filter(
    (p) => p.abstract && p.abstract !== "Abstract not available",
  );

  // Sort roughly by recency to bias toward newer evidence first (optional)
  withAbstracts.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  // Batch the corpus
  const batches: PaperDetails[][] = [];
  for (let i = 0; i < withAbstracts.length; i += batchSize) {
    batches.push(withAbstracts.slice(i, i + batchSize));
  }

  const out: string[] = [];
  const seen = new Set<string>();

  for (const batch of batches) {
    if (out.length >= maxClaims) break;

    const context = batch
      .map((p) => `Title: ${p.title}\nAbstract: ${p.abstract}`)
      .join("\n\n---\n\n");

    const result = await generateObject({
      model: deepseek("deepseek-chat"),
      schema: claimsSchema,
      prompt: `You are extracting evidence-based claims from research abstracts.

Topic: "${topic}"

Abstracts:
${context}

Task: Extract 3–6 atomic, testable claims that are DIRECTLY supported by these abstracts.
Rules:
- one claim per line
- specific and falsifiable
- avoid vague generalities

Return only the claims array.`,
    });

    for (const c of result.object.claims) {
      const k = c.trim().toLowerCase().replace(/\s+/g, " ");
      if (!k) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(c.trim());
      if (out.length >= maxClaims) break;
    }
  }

  return out.slice(0, maxClaims);
}

/**
 * Build Claim Cards Resolver
 *
 * Enhanced to support using the 182 linked research papers as a fixed corpus:
 * 1. If useLinkedResearch=true, loads linked research for the note
 * 2. Extracts claims from the linked corpus (batched)
 * 3. Maps evidence ONLY from the linked corpus (no external searches)
 * 4. Falls back to external search if useLinkedResearch=false
 */
export const buildClaimCards: NonNullable<MutationResolvers['buildClaimCards']> = async (_parent, { input }) => {
  const {
    text,
    claims,
    perSourceLimit,
    topK,
    useLlmJudge,
    sources,
    persist: persistRaw,
    noteId: noteIdRaw,

    /**
     * NEW (works in your script already because input is any):
     * If true, use the note's linked research as the evidence corpus.
     */
    useLinkedResearch,

    /**
     * NEW: how many claim-extraction batches to run from the linked corpus
     */
    claimExtractionBatchSize,
    maxExtractedClaims,
  } = input as any;

  const persist = Boolean(persistRaw);
  const noteId =
    noteIdRaw == null
      ? null
      : typeof noteIdRaw === "string"
        ? Number(noteIdRaw)
        : Number(noteIdRaw);

  if (persist && (!Number.isFinite(noteId) || noteId == null)) {
    console.warn(
      "⚠️  persist=true was requested but noteId is missing/invalid; skipping DB save",
    );
  }

  // Map GraphQL enums to lowercase source names
  const sourcesLowercase = sources?.map((s: any) => s.toLowerCase()) as any[];
  const allowedSources = sourcesLowercase ?? ["crossref", "pubmed"];

  const shouldUseLinked = Boolean(useLinkedResearch && noteId != null);

  let cards: any;

  if (text) {
    if (shouldUseLinked) {
      console.log(`📚 Using linked research corpus for noteId=${noteId}...`);
      const pool = await loadLinkedResearchForNote(noteId!);
      console.log(`   ✓ Loaded ${pool.length} linked papers`);

      // Enrich pool to PaperDetails (abstracts/authors/doi normalized)
      const poolDetails = await sourceTools.mapLimit(pool, 3, async (p) =>
        sourceTools.fetchPaperDetails(p),
      );

      // Extract claims *from the corpus*, not from a fresh search
      const extractedClaims = await extractClaimsFromPapersBatched(
        text,
        poolDetails,
        {
          batchSize: claimExtractionBatchSize ?? 12,
          maxClaims: maxExtractedClaims ?? 12,
        },
      );

      console.log(
        `   ✓ Extracted ${extractedClaims.length} claims from linked corpus`,
      );

      // Build claim cards, mapping evidence ONLY from the pool
      cards = await claimCardsTools.buildClaimCardsFromClaims(extractedClaims, {
        topK: topK ?? 8,
        useLlmJudge: useLlmJudge ?? true,
        paperPool: pool, // ✅ this is the key
        enrichPool: false, // already enriched above (optional)
        poolConcurrency: 3,
      });
    } else {
      // Existing behavior (search external APIs)
      const searchLimit = perSourceLimit ?? 15;
      const allResults: any[] = [];

      const searchWithRetry = async (
        searchFn: () => Promise<any[]>,
        name: string,
      ) => {
        try {
          return await searchFn();
        } catch (error: any) {
          const status = error?.status || error?.response?.status;
          if (status === 429 || error?.message?.includes("429")) {
            console.log(
              `⏳ ${name} rate limit hit, waiting 5s and retrying...`,
            );
            await new Promise((resolve) => setTimeout(resolve, 5000));
            try {
              return await searchFn();
            } catch {
              console.warn(`⚠️  ${name} failed after retry, skipping`);
              return [];
            }
          }
          console.warn(`⚠️  ${name} error:`, error?.message || error);
          return [];
        }
      };

      if (allowedSources.includes("crossref")) {
        const results = await searchWithRetry(
          () => sourceTools.searchCrossref(text, searchLimit),
          "Crossref",
        );
        allResults.push(results);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      if (allowedSources.includes("pubmed")) {
        const results = await searchWithRetry(
          () => sourceTools.searchPubMed(text, searchLimit),
          "PubMed",
        );
        allResults.push(results);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      const allPapers = allResults.flat();
      const deduped = sourceTools.dedupeCandidates(allPapers);

      const topPapers = deduped.slice(0, Math.min(20, searchLimit * 2));
      const papersWithDetails = await Promise.all(
        topPapers.map(async (p) => {
          try {
            return await sourceTools.fetchPaperDetails(p);
          } catch {
            return p;
          }
        }),
      );

      const papersContext = papersWithDetails
        .filter((p) => (p as any).abstract)
        .slice(0, 10)
        .map((p: any) => `Title: ${p.title}\nAbstract: ${p.abstract}`)
        .join("\n\n---\n\n");

      if (papersContext) {
        const claimsSchema = z.object({ claims: z.array(z.string()) });

        const result = await generateObject({
          model: deepseek("deepseek-chat"),
          schema: claimsSchema,
          prompt: `Extract 5-12 high-quality claims from these abstracts:\n\n${papersContext}`,
        });

        const extractedClaims = result.object.claims;

        cards = await claimCardsTools.buildClaimCardsFromClaims(
          extractedClaims,
          {
            perSourceLimit: perSourceLimit ?? undefined,
            topK: topK ?? undefined,
            useLlmJudge: useLlmJudge ?? undefined,
            sources: sourcesLowercase,
          },
        );
      } else {
        cards = await claimCardsTools.buildClaimCardsFromText(text, {
          perSourceLimit: perSourceLimit ?? undefined,
          topK: topK ?? undefined,
          useLlmJudge: useLlmJudge ?? undefined,
          sources: sourcesLowercase,
        });
      }
    }
  } else if (claims && claims.length > 0) {
    cards = await claimCardsTools.buildClaimCardsFromClaims(claims, {
      perSourceLimit: perSourceLimit ?? undefined,
      topK: topK ?? undefined,
      useLlmJudge: useLlmJudge ?? undefined,
      sources: sourcesLowercase,
    });
  } else {
    throw new Error("Must provide either text or claims");
  }

  console.log(`\n✅ Successfully built ${cards.length} claim cards\n`);

  // Persist raw cards
  if (persist && noteId != null && Number.isFinite(noteId)) {
    console.log(
      `💾 Saving ${cards.length} claim cards into DB (noteId=${noteId})...`,
    );
    for (const card of cards) {
      await claimCardsTools.saveClaimCard(card, noteId);
    }
    console.log(
      `✅ Saved ${cards.length}/${cards.length} claim cards (noteId=${noteId})\n`,
    );
  }

  const normalizedCards = toGqlClaimCards(cards);
  return { cards: normalizedCards } as any;
};
