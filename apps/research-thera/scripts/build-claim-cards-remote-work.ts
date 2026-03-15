#!/usr/bin/env tsx
/**
 * Build Claim Cards for State of Remote Work Note
 *
 * This script triggers the buildClaimCards mutation for the "state-of-remote-work" note.
 * It uses the enhanced resolver that grounds claims in actual research content.
 *
 * Usage:
 *   pnpm tsx scripts/build-claim-cards-remote-work.ts
 */

import "dotenv/config";
import { buildClaimCards } from "../schema/resolvers/Mutation/buildClaimCards";
import { sql as neonSql } from "../src/db/neon";

// Suppress AI SDK warnings
if (typeof globalThis !== "undefined") {
  (globalThis as any).AI_SDK_LOG_WARNINGS = false;
}

type StorageDetection = {
  table: string;
  noteIdColumn: string;
  claimColumn: string;
} | null;

async function listTables(): Promise<string[]> {
  const rows = await neonSql`SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  return rows.map((r: any) => String(r.name));
}

async function tableColumns(table: string): Promise<string[]> {
  const rows = await neonSql`SELECT column_name as name FROM information_schema.columns WHERE table_name = ${table} AND table_schema = 'public'`;
  return rows.map((r: any) => String(r.name));
}

/**
 * Auto-detect claim storage table by finding one with both note_id and claim columns
 */
async function detectClaimStorage(): Promise<StorageDetection> {
  const tables = await listTables();

  for (const table of tables) {
    const cols = await tableColumns(table);

    const noteIdColumn =
      cols.find((c) => c.toLowerCase() === "note_id") ??
      cols.find((c) => c.toLowerCase() === "noteid") ??
      null;

    if (!noteIdColumn) continue;

    const claimColumn =
      cols.find((c) => c.toLowerCase() === "claim") ??
      cols.find((c) => c.toLowerCase() === "statement") ??
      null;

    if (!claimColumn) continue;

    return { table, noteIdColumn, claimColumn };
  }

  return null;
}

async function claimExists(
  storage: NonNullable<StorageDetection>,
  noteId: number,
  claim: string,
): Promise<boolean> {
  const query = `SELECT 1 AS ok FROM ${storage.table} WHERE ${storage.noteIdColumn} = $1 AND ${storage.claimColumn} = $2 LIMIT 1`;
  const rows = await neonSql(query, [noteId, claim]);
  return rows.length > 0;
}

async function verifyLinkTable(
  noteId: number,
  expectedCount: number,
): Promise<void> {
  const tables = await listTables();

  // Check for notes_claims linking table
  if (tables.includes("notes_claims")) {
    const rows = await neonSql`SELECT COUNT(*) as count FROM notes_claims WHERE note_id = ${noteId}`;
    const linkCount = Number(rows[0]?.count ?? 0);

    if (linkCount !== expectedCount) {
      console.warn(
        `⚠️  Link table mismatch: expected ${expectedCount} links, found ${linkCount}`,
      );
    } else {
      console.log(
        `✅ Verified ${linkCount} note-claim relationships in notes_claims`,
      );
    }
  }
}

async function main() {
  console.log("🚀 Building claim cards for state-of-remote-work note...\n");

  try {
    // 1. Get the note
    const noteResult = await neonSql`SELECT id, slug, content FROM notes WHERE slug = ${"state-of-remote-work"}`;

    if (noteResult.length === 0) {
      console.error("❌ Note 'state-of-remote-work' not found");
      console.log("\n💡 Tip: Make sure the note exists in the database");
      return;
    }

    const note = noteResult[0];
    const noteId = note.id as number;
    const content = note.content as string;

    console.log(`📝 Found note: ${note.slug}`);
    console.log(`   Note ID: ${noteId}`);
    console.log(`   Content length: ${content.length} characters\n`);

    // 2. Detect storage for verification
    const storage = await detectClaimStorage();
    if (storage) {
      console.log(
        `🔎 DB verify will check table "${storage.table}" (${storage.noteIdColumn}, ${storage.claimColumn})\n`,
      );
    } else {
      console.warn(
        "⚠️  Could not auto-detect claim storage table for verification\n",
      );
    }

    // 3. Prepare the topic/question for claim extraction
    const topic =
      "State of remote work research and trends in the post-COVID labor market";

    console.log(`🔍 Topic: ${topic}\n`);

    // 4. Call the buildClaimCards mutation with persistence enabled
    console.log("⚙️  Building claim cards + saving to DB...");
    console.log("   - Searching research APIs (Crossref, PubMed)");
    console.log(
      "   - Extracting evidence-based claims from research abstracts",
    );
    console.log("   - Mapping evidence and calculating verdicts");
    console.log("   - Saving raw cards to DB (persist=true)\n");

    const result = await (buildClaimCards as any)(
      {},
      {
        input: {
          text: topic,
          perSourceLimit: 15,
          topK: 8,
          useLlmJudge: true,
          // Use only reliable sources (Crossref, PubMed)
          // Semantic Scholar excluded due to strict rate limits
          sources: ["CROSSREF", "PUBMED"],
          // Enable persistence in resolver
          persist: true,
          noteId,
        },
      },
      {} as any,
    );

    const cards = result.cards;

    console.log(`✅ Generated ${cards.length} claim cards!\n`);

    // 5. Display results
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Claim ${i + 1}/${cards.length}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`\n📌 ${card.claim}`);
      console.log(`\n🎯 Verdict: ${String(card.verdict).toUpperCase()}`);
      console.log(
        `💪 Confidence: ${Math.round(Number(card.confidence) * 100)}%`,
      );
      console.log(`\n📚 Evidence (${card.evidence?.length ?? 0} sources):`);

      for (let j = 0; j < Math.min(3, card.evidence?.length ?? 0); j++) {
        const ev = card.evidence[j];
        const icon =
          ev.polarity === "SUPPORTS"
            ? "✓"
            : ev.polarity === "CONTRADICTS"
              ? "✗"
              : ev.polarity === "MIXED"
                ? "~"
                : "-";
        console.log(
          `\n   ${icon} [${String(ev.polarity).toUpperCase()}] ${ev.paper?.title}`,
        );
        if (ev.paper?.year) console.log(`     Year: ${ev.paper.year}`);
        if (ev.rationale) console.log(`     Rationale: ${ev.rationale}`);
        if (ev.score != null)
          console.log(`     Score: ${Math.round(ev.score * 100)}%`);
      }

      if ((card.evidence?.length ?? 0) > 3) {
        console.log(
          `\n   ... and ${(card.evidence?.length ?? 0) - 3} more sources`,
        );
      }
    }

    // 6. Verify DB contains the claims
    if (storage) {
      console.log("\n\n🔐 Verifying claim cards exist in DB...");

      const missing: string[] = [];
      for (const card of cards) {
        const ok = await claimExists(storage, noteId, String(card.claim));
        if (!ok) missing.push(String(card.claim));
      }

      if (missing.length > 0) {
        console.error(
          "❌ Verification failed: some claims were not found in DB.",
        );
        console.error(`Missing (${missing.length}/${cards.length}):`);
        for (const m of missing.slice(0, 5))
          console.error(`  - ${m.slice(0, 100)}...`);
        if (missing.length > 5)
          console.error(`  ... and ${missing.length - 5} more`);

        process.exit(1);
      }

      console.log(
        `✅ Verification passed: all ${cards.length} claims exist in DB.`,
      );

      // Verify link table relationships
      await verifyLinkTable(noteId, cards.length);
    }

    // 7. Summary
    const verdictCounts = cards.reduce(
      (acc: Record<string, number>, card: any) => {
        acc[card.verdict] = (acc[card.verdict] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log("\n\n📊 Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Total Claims: ${cards.length}`);
    console.log(`Verdicts:`);
    for (const [verdict, count] of Object.entries(verdictCounts)) {
      console.log(`  - ${verdict}: ${count}`);
    }

    const avgConfidence =
      cards.reduce(
        (sum: number, card: any) => sum + Number(card.confidence),
        0,
      ) / cards.length;
    console.log(`Average Confidence: ${Math.round(avgConfidence * 100)}%`);

    const totalEvidence = cards.reduce(
      (sum: number, card: any) => sum + (card.evidence?.length ?? 0),
      0,
    );
    console.log(`Total Evidence: ${totalEvidence} sources`);

    console.log("\n✨ Done! Claims are saved and linked to the note.");
  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
