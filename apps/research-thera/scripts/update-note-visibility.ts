import "dotenv/config";
import { sql as neonSql } from "../src/db/neon";

async function updateNoteVisibility() {
  try {
    console.log("Updating note visibility to PUBLIC...\n");

    await neonSql`UPDATE notes SET visibility = 'PUBLIC' WHERE slug = ${"state-of-remote-work"}`;

    console.log(`✅ Updated note visibility`);

    const rows = await neonSql`SELECT id, title, slug, visibility FROM notes WHERE slug = ${"state-of-remote-work"}`;

    if (rows.length > 0) {
      const note = rows[0];
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
