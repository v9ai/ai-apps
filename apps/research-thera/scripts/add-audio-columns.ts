import "dotenv/config";
import { sql as neonSql } from "../src/db/neon";

async function applyMigration() {
  try {
    console.log("Checking audio columns in stories table (Neon/PostgreSQL)...");
    console.log("Note: Columns should already exist via Drizzle migrations.");

    const rows = await neonSql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'stories' AND column_name IN ('audio_key', 'audio_url', 'audio_generated_at')`;

    const cols = rows.map((r: any) => r.column_name);
    console.log("Existing audio columns:", cols);

    if (!cols.includes("audio_key")) {
      await neonSql`ALTER TABLE stories ADD COLUMN audio_key text`;
      console.log("✓ Added audio_key column");
    }
    if (!cols.includes("audio_url")) {
      await neonSql`ALTER TABLE stories ADD COLUMN audio_url text`;
      console.log("✓ Added audio_url column");
    }
    if (!cols.includes("audio_generated_at")) {
      await neonSql`ALTER TABLE stories ADD COLUMN audio_generated_at text`;
      console.log("✓ Added audio_generated_at column");
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
  process.exit(0);
}

applyMigration();
