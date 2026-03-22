import type { MutationResolvers } from "../../types.generated";
import { claimCardsTools } from "../../../src/tools/claim-cards.tools";
import { sourceTools } from "../../../src/tools/sources.tools";
import { generateObject } from "../../../src/lib/deepseek";
import { z } from "zod";
import { toGqlClaimCards } from "../utils/normalize-claim-card";

// Suppress AI SDK warnings
if (typeof globalThis !== "undefined") {
  (globalThis as any).AI_SDK_LOG_WARNINGS = false;
}

/**
 * Build Claim Cards Resolver
 *
 * Enhanced to ensure claims are grounded in actual research content:
 * 1. When text is provided, first searches for relevant research papers
 * 2. Extracts claims from the papers' abstracts (not just the input text)
 * 3. This ensures claims are evidence-based and verifiable against real research
 * 4. Falls back to text-only extraction if no papers are found
 */
export const buildClaimCards: NonNullable<
  MutationResolvers["buildClaimCards"]
> = async (_parent, { input }) => {
  const {
    text,
    claims,
    perSourceLimit,
    topK,
    useLlmJudge,
    sources,
    // Extended params for persistence (passed by scripts)
    persist: persistRaw,
    noteId: noteIdRaw,
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
  // Default sources: Crossref and PubMed (most reliable, no rate limits)
  // Semantic Scholar excluded due to strict rate limits
  const allowedSources = sourcesLowercase ?? ["crossref", "pubmed"];

  let cards;

  if (text) {
    // Enhanced text processing: Search research first, then extract claims from actual papers
    const searchLimit = perSourceLimit ?? 15;

    console.log(
      `📡 Starting research paper search across ${allowedSources.length} source(s)...`,
    );
    console.log(`   Sources: ${allowedSources.join(", ")}`);
    console.log(`   Limit per source: ${searchLimit}\n`);

    // 1. Search for relevant papers across multiple sources
    // Search sequentially with delays to avoid rate limits
    const allResults: any[] = [];

    // Helper to retry on rate limit with longer delay
    const searchWithRetry = async (
      searchFn: () => Promise<any[]>,
      name: string,
    ) => {
      try {
        return await searchFn();
      } catch (error: any) {
        const status = error?.status || error?.response?.status;
        if (status === 429 || error?.message?.includes("429")) {
          console.log(`⏳ ${name} rate limit hit, waiting 5s and retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          try {
            return await searchFn();
          } catch (retryError) {
            console.warn(`⚠️  ${name} failed after retry, skipping`);
            return [];
          }
        }
        console.warn(`⚠️  ${name} error:`, error?.message || error);
        return [];
      }
    };

    // Search sources sequentially with 1.5s delay between each to avoid rate limits
    if (allowedSources.includes("crossref")) {
      console.log("🔍 Searching Crossref...");
      const results = await searchWithRetry(
        () => sourceTools.searchCrossref(text, searchLimit),
        "Crossref",
      );
      console.log(`   ✓ Found ${results.length} papers from Crossref`);
      allResults.push(results);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    if (allowedSources.includes("pubmed")) {
      console.log("🔍 Searching PubMed...");
      const results = await searchWithRetry(
        () => sourceTools.searchPubMed(text, searchLimit),
        "PubMed",
      );
      console.log(`   ✓ Found ${results.length} papers from PubMed`);
      allResults.push(results);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    if (allowedSources.includes("semantic_scholar")) {
      const results = await searchWithRetry(
        () => sourceTools.searchSemanticScholar(text, searchLimit),
        "Semantic Scholar",
      );
      allResults.push(results);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    if (allowedSources.includes("openalex") && process.env.OPENALEX_API_KEY) {
      const results = await searchWithRetry(
        () => sourceTools.searchOpenAlex(text, searchLimit),
        "OpenAlex",
      );
      allResults.push(results);
    }

    const allPapers = allResults.flat();
    console.log(`\n📚 Total papers found: ${allPapers.length}`);
    const deduped = sourceTools.dedupeCandidates(allPapers);
    console.log(`   After deduplication: ${deduped.length} unique papers\n`);

    // 2. Fetch full details for top papers
    const topPapers = deduped.slice(0, Math.min(20, searchLimit * 2));
    console.log(
      `📄 Fetching full details for top ${topPapers.length} papers...`,
    );
    const papersWithDetails = await Promise.all(
      topPapers.map(async (p) => {
        try {
          return await sourceTools.fetchPaperDetails(p);
        } catch {
          return p;
        }
      }),
    );
    console.log(`   ✓ Fetched details for ${papersWithDetails.length} papers`);

    // 3. Extract claims from the research papers' content (not just the user text)
    const papersContext = papersWithDetails
      .filter((p) => p.abstract)
      .slice(0, 10) // Use top 10 papers with abstracts
      .map((p) => `Title: ${p.title}\nAbstract: ${p.abstract}`)
      .join("\n\n---\n\n");

    const papersWithAbstracts = papersWithDetails.filter(
      (p) => p.abstract,
    ).length;
    console.log(`\n📝 Papers with abstracts: ${papersWithAbstracts}`);
    console.log(`   Using top 10 for claim extraction\n`);

    if (papersContext) {
      console.log(
        `🤖 Extracting claims from research abstracts using DeepSeek...`,
      );
      // Extract research-grounded claims
      const claimsSchema = z.object({
        claims: z
          .array(z.string())
          .describe(
            "Atomic, testable claims extracted from the research papers. Each claim should be grounded in the actual research content.",
          ),
      });

      const result = await generateObject({

        schema: claimsSchema,
        prompt: `You are extracting evidence-based claims from research papers.

User's topic/question: "${text}"

Research papers found:
${papersContext}

Task: Extract atomic, testable claims that:
1. Are directly supported by the research abstracts above
2. Are specific and measurable (include population, intervention, outcome when applicable)
3. Can be verified against the papers
4. Relate to the user's topic: "${text}"

Extract 5-12 high-quality claims that summarize the research findings.`,
      });

      const extractedClaims = result.object.claims;
      console.log(`   ✓ Extracted ${extractedClaims.length} claims\n`);
      console.log(`🔬 Building claim cards with evidence mapping...`);
      console.log(`   This involves searching for evidence for each claim\n`);

      // Build claim cards from these research-grounded claims
      cards = await claimCardsTools.buildClaimCardsFromClaims(extractedClaims, {
        perSourceLimit: perSourceLimit ?? undefined,
        topK: topK ?? undefined,
        useLlmJudge: useLlmJudge ?? undefined,
        sources: sourcesLowercase,
      });
    } else {
      // Fallback to original method if no papers found
      cards = await claimCardsTools.buildClaimCardsFromText(text, {
        perSourceLimit: perSourceLimit ?? undefined,
        topK: topK ?? undefined,
        useLlmJudge: useLlmJudge ?? undefined,
        sources: sourcesLowercase,
      });
    }
  } else if (claims && claims.length > 0) {
    // For explicit claims, use the existing method
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

  // ✅ Persist *raw* cards before GraphQL normalization
  if (persist && noteId != null && Number.isFinite(noteId)) {
    console.log(
      `💾 Saving ${cards.length} claim cards into DB (noteId=${noteId})...`,
    );
    let saved = 0;

    for (const card of cards) {
      try {
        await claimCardsTools.saveClaimCard(card, noteId);
        saved++;
      } catch (e: any) {
        // Fail loudly to ensure persistence issues are visible
        console.error("❌ Failed saving claim card:", {
          noteId,
          claimId: card?.id,
          claim: card?.claim?.slice(0, 100),
          error: e?.message ?? e,
        });
        throw e;
      }
    }

    console.log(
      `✅ Saved ${saved}/${cards.length} claim cards (noteId=${noteId})\n`,
    );
  }

  // Normalize output to ensure consistent GraphQL types for UI rendering
  const normalizedCards = toGqlClaimCards(cards);

  return { cards: normalizedCards } as any;
};
