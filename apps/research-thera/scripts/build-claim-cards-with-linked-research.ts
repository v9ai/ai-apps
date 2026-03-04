/**
 * Build Claim Cards Using Linked Research Corpus
 *
 * This script demonstrates how to use the 182 linked research papers
 * as a fixed corpus for claim generation instead of doing fresh searches.
 *
 * Usage:
 *   AI_SDK_LOG_WARNINGS=false pnpm tsx scripts/build-claim-cards-with-linked-research.ts
 */

// Load environment variables FIRST
import * as dotenv from "dotenv";
dotenv.config();

// Suppress AI SDK warnings BEFORE other imports
process.env.AI_SDK_LOG_WARNINGS = "false";
if (typeof globalThis !== "undefined") {
  (globalThis as any).AI_SDK_LOG_WARNINGS = false;
}

import { claimCardsTools } from "../src/tools/claim-cards.tools";
import { d1 } from "../src/db/d1";
import { sourceTools } from "../src/tools/sources.tools";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";
import type { PaperDetails } from "../src/tools/sources.tools";
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_DATABASE_ID,
  CLOUDFLARE_D1_TOKEN,
} from "../src/config/d1";

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

/**
 * Extract claims from paper titles when abstracts are unavailable
 */
async function extractClaimsFromTitles(
  topic: string,
  papers: PaperDetails[],
  opts?: { maxClaims?: number },
): Promise<string[]> {
  const maxClaims = Math.max(5, Math.min(30, opts?.maxClaims ?? 12));

  const claimsSchema = z.object({
    claims: z.array(z.string()),
  });

  // Group all titles
  const context = papers
    .map((p, idx) => `${idx + 1}. ${p.title} (${p.year || "n.d."})`)
    .join("\n");

  console.log(`   Analyzing ${papers.length} paper titles...`);

  const result = await generateObject({
    model: deepseek("deepseek-chat"),
    schema: claimsSchema,
    prompt: `You are extracting evidence-based claims from research paper titles.

Topic: "${topic}"

Research Paper Titles:
${context}

Task: Based on these paper titles, extract ${maxClaims} atomic, testable claims about "${topic}".

Rules:
- Infer likely research findings from the paper titles
- Make claims specific and falsifiable
- Each claim should reflect what these papers might demonstrate
- Avoid vague generalities
- Claims should be about ${topic}

Return only the claims array.`,
  });

  return result.object.claims.slice(0, maxClaims);
}

/**
 * Extract claims from many abstracts (batched) - IMPROVED VERSION
 * Enforces min/max claims per batch and processes multiple batches
 */
async function extractClaimsFromPapersBatched(
  topic: string,
  papers: PaperDetails[],
  opts?: {
    batchSize?: number; // how many papers per batch
    maxClaimsTotal?: number; // cap across all batches
    minClaimsPerBatch?: number;
    maxClaimsPerBatch?: number;
    maxBatches?: number; // hard cap to control cost
    abstractCharLimit?: number;
  },
): Promise<string[]> {
  const batchSize = Math.max(8, Math.min(16, opts?.batchSize ?? 12));
  const maxClaimsTotal = Math.max(8, Math.min(60, opts?.maxClaimsTotal ?? 20));
  const minClaimsPerBatch = Math.max(
    4,
    Math.min(10, opts?.minClaimsPerBatch ?? 6),
  );
  const maxClaimsPerBatch = Math.max(
    minClaimsPerBatch,
    Math.min(14, opts?.maxClaimsPerBatch ?? 10),
  );
  const maxBatches = Math.max(1, Math.min(12, opts?.maxBatches ?? 6));
  const abstractCharLimit = Math.max(
    300,
    Math.min(1400, opts?.abstractCharLimit ?? 900),
  );

  const normalizeKey = (s: string) =>
    s
      .toLowerCase()
      .replace(/[""]/g, '"')
      .replace(/[']/g, "'")
      .replace(/\s+/g, " ")
      .trim();

  const truncate = (s: string) => {
    const t = s.trim();
    if (t.length <= abstractCharLimit) return t;
    return t.slice(0, abstractCharLimit) + "…";
  };

  const withAbstracts = papers
    .filter((p) => p.abstract && p.abstract !== "Abstract not available")
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  console.log(`🧾 Linked corpus: ${papers.length} papers total`);
  console.log(`🧾 Papers with usable abstracts: ${withAbstracts.length}`);

  if (withAbstracts.length === 0) {
    console.warn(
      `   ⚠️  No papers have abstracts - falling back to title-based extraction`,
    );
    return await extractClaimsFromTitles(topic, papers, {
      maxClaims: maxClaimsTotal,
    });
  }

  // Build batches (bias toward recency, but ensure variety)
  const batches: PaperDetails[][] = [];
  for (
    let i = 0;
    i < withAbstracts.length && batches.length < maxBatches;
    i += batchSize
  ) {
    batches.push(withAbstracts.slice(i, i + batchSize));
  }

  console.log(
    `🧩 Claim extraction batches: ${batches.length} (batchSize=${batchSize})`,
  );

  const claimsSchema = z.object({
    claims: z.array(z.string()).min(minClaimsPerBatch).max(maxClaimsPerBatch),
  });

  const out: string[] = [];
  const seen = new Set<string>();

  for (let bi = 0; bi < batches.length; bi++) {
    if (out.length >= maxClaimsTotal) break;

    const batch = batches[bi];
    const context = batch
      .map((p, idx) => {
        const yr = p.year ? ` (${p.year})` : "";
        return `[#${idx + 1}] Title${yr}: ${p.title}\nAbstract: ${truncate(p.abstract)}`;
      })
      .join("\n\n---\n\n");

    console.log(`🤖 Extracting claims from batch ${bi + 1}/${batches.length}…`);

    const result = await generateObject({
      model: deepseek("deepseek-chat"),
      schema: claimsSchema,
      prompt: `
You are extracting evidence-based claims from research abstracts.

Topic: "${topic}"

Abstracts:
${context}

Return ${minClaimsPerBatch}-${maxClaimsPerBatch} claims that:
- are directly supported by these abstracts
- are atomic and testable
- include scope when possible (population/setting/outcome/timeframe)
- avoid generic statements like "remote work changed work"

Only return the JSON object { "claims": [...] }.
`.trim(),
    });

    for (const c of result.object.claims) {
      const key = normalizeKey(c);
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c.trim());
      if (out.length >= maxClaimsTotal) break;
    }
  }

  console.log(`✅ Extracted ${out.length} unique claims total`);
  return out.slice(0, maxClaimsTotal);
}

async function main() {
  const noteSlug = "state-of-remote-work";
  const noteId = 1; // Update this to match your note ID
  const topic =
    "State of remote work research and trends in the post-COVID labor market";

  console.log(
    `🚀 Building claim cards for ${noteSlug} note using LINKED RESEARCH corpus...`,
  );
  console.log(`   Note ID: ${noteId}`);
  console.log(`   Topic: ${topic}\n`);

  try {
    // Load linked research for this note
    console.log(`📚 Loading linked research for note...`);
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

    const pool = res.rows.map((r: any) => ({
      title: String(r.title),
      year: r.year != null ? Number(r.year) : undefined,
      doi: r.doi ? String(r.doi) : undefined,
      url: r.url ? String(r.url) : undefined,
      source: "linked" as const,
      authors: r.authors ? JSON.parse(String(r.authors)) : undefined,
      abstract: r.abstract ? String(r.abstract) : undefined,
      journal: r.journal ? String(r.journal) : undefined,
    }));

    console.log(`   ✓ Loaded ${pool.length} linked papers\n`);

    if (pool.length === 0) {
      console.error(
        `❌ No linked research found for note ${noteId}. Please link research papers first.`,
      );
      process.exit(1);
    }

    // Debug: Check abstract availability
    const withAbstractsInDb = pool.filter(
      (p) =>
        p.abstract &&
        p.abstract.trim() &&
        p.abstract !== "Abstract not available",
    );
    console.log(
      `📊 Abstract status: ${withAbstractsInDb.length}/${pool.length} papers already have abstracts in DB\n`,
    );

    // Check how many papers need enrichment
    const needEnrichment = pool.filter(
      (p) => !p.abstract || p.abstract === "Abstract not available",
    );

    let poolDetails: PaperDetails[];

    if (needEnrichment.length > 0) {
      console.log(
        `📄 Enriching ${needEnrichment.length}/${pool.length} papers missing abstracts...`,
      );
      let enrichedCount = 0;
      const enrichedMap = new Map<string, PaperDetails>();

      await sourceTools.mapLimit(needEnrichment, 3, async (p) => {
        const details = await sourceTools.fetchPaperDetails(p);
        const key = p.doi || p.title;
        enrichedMap.set(key, details);
        enrichedCount++;

        // Debug first few papers
        if (enrichedCount <= 3) {
          console.log(
            `   DEBUG [${enrichedCount}]: ${p.title.substring(0, 60)}...`,
          );
          console.log(
            `          Abstract: ${details.abstract?.substring(0, 100) || "NONE"}...`,
          );
        }

        if (
          enrichedCount % 10 === 0 ||
          enrichedCount === needEnrichment.length
        ) {
          console.log(
            `   Progress: ${enrichedCount}/${needEnrichment.length} papers enriched`,
          );
        }
        return details;
      });

      // Merge enriched with existing
      poolDetails = pool.map((p) => {
        const key = p.doi || p.title;
        return enrichedMap.get(key) || (p as PaperDetails);
      });
      console.log(`   ✓ Enriched ${needEnrichment.length} papers\n`);
    } else {
      console.log(
        `📄 All ${pool.length} papers already have abstracts (skipping enrichment)\n`,
      );
      poolDetails = pool as PaperDetails[];
    }

    // Extract claims from the corpus using batched extraction
    console.log(`🤖 Extracting claims from linked corpus...`);
    const extractedClaims = await extractClaimsFromPapersBatched(
      topic,
      poolDetails,
      {
        batchSize: 12, // Process 12 papers at a time
        maxClaimsTotal: 20, // Extract up to 20 claims total
        minClaimsPerBatch: 6, // At least 6 claims per batch
        maxClaimsPerBatch: 10, // At most 10 claims per batch
        maxBatches: 6, // Process up to 6 batches
        abstractCharLimit: 900, // Truncate long abstracts
      },
    );
    console.log(
      `   ✓ Extracted ${extractedClaims.length} claims from corpus\n`,
    );

    console.log(`🔨 Building claim cards from corpus...`);
    console.log(`   Pool size: ${pool.length} papers`);
    console.log(`   Top K evidence per claim: 12`);
    console.log(`   Using LLM judge: true\n`);

    const cards = await claimCardsTools.buildClaimCardsFromClaims(
      extractedClaims,
      {
        topK: 12, // Use more evidence per claim
        useLlmJudge: true, // Use DeepSeek to judge evidence
        paperPool: pool, // ✅ Use the linked research corpus
        enrichPool: false, // Already enriched above
        poolConcurrency: 3,
      },
    );

    console.log(`\n   ✓ Built ${cards.length} claim cards successfully!`);
    console.log(`\n💾 Saving ${cards.length} claim cards to database...`);
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      console.log(`   Saving claim ${i + 1}/${cards.length}...`);
      await claimCardsTools.saveClaimCard(card, noteId);
    }
    console.log(`   ✓ All cards saved`);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Generated ${cards.length} claim cards!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Display summary of claims
    cards.forEach((card: any, idx: number) => {
      console.log(`Claim ${idx + 1}/${cards.length}`);
      console.log(`📌 ${card.claim}`);
      console.log(
        `🎯 Verdict: ${card.verdict} (${Math.round(card.confidence * 100)}% confidence)`,
      );
      console.log(`📚 Evidence: ${card.evidence.length} sources\n`);
    });

    console.log(
      `\n✨ Claims are saved to database and linked to note #${noteId}`,
    );
    console.log(`   View them at: /notes/${noteSlug}\n`);
  } catch (error) {
    console.error("❌ Error building claim cards:", error);
    process.exit(1);
  }
}

main();
