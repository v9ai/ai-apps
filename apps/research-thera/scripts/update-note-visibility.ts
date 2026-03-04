import "dotenv/config";
import { d1 } from "../src/db/d1";

async function updateNoteVisibility() {
  try {
    console.log("Updating note visibility to PUBLIC...\n");

    await d1.execute({
      sql: `UPDATE notes SET visibility = 'PUBLIC' WHERE slug = ?`,
      args: ["state-of-remote-work"],
    });

    console.log(`✅ Updated note visibility`);

    // Verify the update
    const check = await d1.execute({
      sql: `SELECT id, title, slug, visibility FROM notes WHERE slug = ?`,
      args: ["state-of-remote-work"],
    });

    if (check.rows.length > 0) {
      const note = check.rows[0];
      console.log("\n✅ Verified:");
      console.log(`  ID: ${note.id}`);
      console.log(`  Title: ${note.title}`);
      console.log(`  Slug: ${note.slug}`);
      console.log(`  Visibility: ${note.visibility}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

updateNoteVisibility();
