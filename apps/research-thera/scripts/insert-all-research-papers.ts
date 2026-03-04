import { d1 } from "../src/db/d1";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_DATABASE_ID,
  CLOUDFLARE_D1_TOKEN,
} from "../src/config/d1";

// Load environment variables
dotenv.config();

// Read CSV data from file
const csvPath = path.join(__dirname, "research-papers.csv");
const csvData = fs.readFileSync(csvPath, "utf-8");

async function insertAllResearchPapers() {
  console.log("🚀 Starting research papers insertion...\n");

  // Get the note ID for 'state-of-remote-work'
  const noteResult = await d1.execute({
    sql: "SELECT id FROM notes WHERE slug = ?",
    args: ["state-of-remote-work"],
  });

  if (noteResult.rows.length === 0) {
    console.error("❌ Note 'state-of-remote-work' not found");
    return;
  }

  const noteId = noteResult.rows[0].id as number;
  console.log(`📝 Found note with ID: ${noteId}\n`);

  // Parse CSV
  const lines = csvData.trim().split("\n").slice(1); // Skip header
  const papers = lines
    .map((line) => {
      // Handle quoted CSV fields
      const matches = line.match(
        /(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^\",]+)|(?<=,)(?=,))/g,
      );
      if (!matches || matches.length < 5) {
        console.warn(
          `⚠️  Skipping malformed line: ${line.substring(0, 50)}...`,
        );
        return null;
      }

      const [rank, year, title, venue, url] = matches.map((m) =>
        m ? m.replace(/^"|"$/g, "").replace(/""/g, '"') : "",
      );

      return {
        rank: parseInt(rank) || 0,
        year: year ? parseInt(year) : null,
        title: title || "Unknown Title",
        venue: venue || "Unknown Venue",
        url: url ? url.split(" | ")[0] : "",
      };
    })
    .filter(Boolean);

  console.log(`📊 Parsed ${papers.length} papers from CSV\n`);

  let insertedCount = 0;
  let failedCount = 0;
  const researchIds: number[] = [];

  for (const paper of papers) {
    try {
      // Check if paper already exists by URL to prevent duplicates
      const existingPaper = await d1.execute({
        sql: `SELECT id FROM therapy_research WHERE url = ?`,
        args: [paper!.url],
      });

      let researchId: number;

      if (existingPaper.rows.length > 0) {
        // Paper already exists, use existing ID
        researchId = existingPaper.rows[0].id as number;
        console.log(
          `⏭️  Skipping duplicate: ${paper!.title.substring(0, 50)}...`,
        );
      } else {
        // Insert new paper into therapy_research table
        const result = await d1.execute({
          sql: `INSERT INTO therapy_research (
            goal_id, therapeutic_goal_type, title, authors, year, journal, 
            url, key_findings, therapeutic_techniques, relevance_score, 
            extracted_by, extraction_confidence
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id`,
          args: [
            0, // goal_id = 0 for general research
            "post-covid-labor-market",
            paper!.title,
            JSON.stringify(["Various"]),
            paper!.year,
            paper!.venue,
            paper!.url,
            JSON.stringify([
              `Rank ${paper!.rank} in post-COVID job market research`,
            ]),
            JSON.stringify([
              "remote work",
              "labor market",
              "post-COVID",
              "employment",
            ]),
            101 - paper!.rank, // Higher rank = higher score
            "csv-import",
            90,
          ],
        });

        researchId = result.rows[0].id as number;
        insertedCount++;
      }

      researchIds.push(researchId);

      // Link to note (INSERT OR IGNORE prevents duplicate links)
      await d1.execute({
        sql: `INSERT OR IGNORE INTO notes_research (note_id, research_id) VALUES (?, ?)`,
        args: [noteId, researchId],
      });

      if (insertedCount % 10 === 0 || insertedCount === papers.length) {
        console.log(
          `✅ Progress: ${insertedCount}/${papers.length} papers inserted`,
        );
      }
    } catch (err: any) {
      failedCount++;
      console.error(
        `❌ Error inserting paper rank ${paper!.rank}: ${err.message}`,
      );
    }
  }

  console.log(`\n🎉 Insertion complete!`);
  console.log(`   ✅ Successfully inserted: ${insertedCount} papers`);
  console.log(`   ❌ Failed: ${failedCount} papers`);
  console.log(`   🔗 All linked to note ID: ${noteId}`);
  console.log(
    `\n📋 Research IDs: ${researchIds.slice(0, 5).join(", ")}...${researchIds.slice(-3).join(", ")}`,
  );
}

insertAllResearchPapers()
  .then(() => {
    console.log("\n✨ Script completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n💥 Script failed:", err);
    process.exit(1);
  });
