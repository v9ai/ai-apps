import "dotenv/config";
import { d1 } from "../src/db/d1";

async function checkNote() {
  try {
    console.log("Checking note with slug 'state-of-remote-work'...\n");

    const result = await d1.execute({
      sql: `SELECT id, title, slug, visibility, user_id FROM notes WHERE slug = ?`,
      args: ["state-of-remote-work"],
    });

    if (result.rows.length === 0) {
      console.log("❌ Note not found in D1 database");
      console.log("\nChecking all notes...");

      const allNotes = await d1.execute({
        sql: `SELECT id, title, slug FROM notes LIMIT 5`,
        args: [],
      });

      console.log("Available notes:");
      allNotes.rows.forEach((row) => {
        console.log(
          `  - ID: ${row.id}, Title: ${row.title}, Slug: ${row.slug}`,
        );
      });
    } else {
      const note = result.rows[0];
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
