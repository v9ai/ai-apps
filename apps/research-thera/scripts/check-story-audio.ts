import "dotenv/config";
import { sql as neonSql } from "../src/db/neon";

async function checkStoryAudio() {
  try {
    console.log("Checking stories table for audio columns...\n");

    const rows = await neonSql`
      SELECT id, audio_key, audio_url, audio_generated_at, created_at
      FROM stories
      ORDER BY created_at DESC
      LIMIT 5`;

    console.log(`Found ${rows.length} stories:\n`);

    rows.forEach((row: any, index: number) => {
      console.log(`Story ${index + 1}:`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Audio Key: ${row.audio_key || "NULL"}`);
      console.log(`  Audio URL: ${row.audio_url || "NULL"}`);
      console.log(`  Generated At: ${row.audio_generated_at || "NULL"}`);
      console.log(`  Created At: ${row.created_at}`);
      console.log("");
    });

    const withAudio = rows.filter((row: any) => row.audio_url);
    console.log(
      `\nStories with audio: ${withAudio.length}/${rows.length}`,
    );
  } catch (error) {
    console.error("Error checking stories:", error);
  }
  process.exit(0);
}

checkStoryAudio();
