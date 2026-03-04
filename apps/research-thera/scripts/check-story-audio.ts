import "dotenv/config";
import { d1 } from "../src/db/d1";

async function checkStoryAudio() {
  try {
    console.log("Checking stories table for audio columns...\n");

    const result = await d1.execute(`
      SELECT id, audio_key, audio_url, audio_generated_at, created_at 
      FROM stories 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log(`Found ${result.rows.length} stories:\n`);

    result.rows.forEach((row, index) => {
      console.log(`Story ${index + 1}:`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Audio Key: ${row.audio_key || "NULL"}`);
      console.log(`  Audio URL: ${row.audio_url || "NULL"}`);
      console.log(`  Generated At: ${row.audio_generated_at || "NULL"}`);
      console.log(`  Created At: ${row.created_at}`);
      console.log("");
    });

    const withAudio = result.rows.filter((row) => row.audio_url);
    console.log(
      `\nStories with audio: ${withAudio.length}/${result.rows.length}`,
    );
  } catch (error) {
    console.error("Error checking stories:", error);
  }
  process.exit(0);
}

checkStoryAudio();
