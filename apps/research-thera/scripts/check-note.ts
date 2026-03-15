import "dotenv/config";
import { sql as neonSql } from "../src/db/neon";

async function checkNote() {
  try {
    console.log("Checking note with slug 'state-of-remote-work'...\n");

    const rows = await neonSql`SELECT id, title, slug, visibility, user_id FROM notes WHERE slug = ${"state-of-remote-work"}`;

    if (rows.length === 0) {
      console.log("❌ Note not found in database");
      console.log("\nChecking all notes...");

      const allNotes = await neonSql`SELECT id, title, slug FROM notes LIMIT 5`;

      console.log("Available notes:");
      allNotes.forEach((row: any) => {
        console.log(
          `  - ID: ${row.id}, Title: ${row.title}, Slug: ${row.slug}`,
        );
      });
    } else {
      const note = rows[0];
      console.log("✅ Note found:");
      console.log(`  ID: ${note.id}`);
      console.log(`  Title: ${note.title}`);
      console.log(`  Slug: ${note.slug}`);
      console.log(`  Visibility: ${note.visibility}`);
      console.log(`  User ID: ${note.user_id}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkNote();
