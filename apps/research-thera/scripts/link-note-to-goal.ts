/**
 * Script to create a goal and link an existing note to it
 *
 * Usage:
 *   tsx scripts/link-note-to-goal.ts --noteSlug=<slug> --goalTitle="Goal Title"
 *   OR
 *   tsx scripts/link-note-to-goal.ts --noteId=<id> --goalTitle="Goal Title"
 */

import { d1Tools, d1 } from "@/src/db";

async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  let noteSlug: string | undefined;
  let noteId: number | undefined;
  let goalTitle = "Strengthen Resilience in a Tough Job Search";
  let goalDescription: string | undefined;
  let createdBy = "";
  let familyMemberId = 1;

  for (const arg of args) {
    if (arg.startsWith("--noteSlug=")) {
      noteSlug = arg.split("=")[1];
    } else if (arg.startsWith("--noteId=")) {
      noteId = parseInt(arg.split("=")[1]);
    } else if (arg.startsWith("--goalTitle=")) {
      goalTitle = arg.split("=")[1];
    } else if (arg.startsWith("--goalDescription=")) {
      goalDescription = arg.split("=")[1];
    } else if (arg.startsWith("--userId=") || arg.startsWith("--createdBy=")) {
      createdBy = arg.split("=")[1];
    } else if (arg.startsWith("--familyMemberId=")) {
      familyMemberId = parseInt(arg.split("=")[1]);
    }
  }

  console.log("🎯 Creating goal and linking note...\n");

  // Validate required parameters
  if (!createdBy) {
    console.error("❌ Error: --userId or --createdBy parameter is required");
    console.log(
      "Usage: tsx scripts/link-note-to-goal.ts --noteSlug=<slug> --createdBy=<email>",
    );
    return;
  }

  // Step 1: Find the note
  let note;
  if (noteSlug) {
    console.log(`📝 Finding note by slug: ${noteSlug}`);
    note = await d1Tools.getNoteBySlug(noteSlug, createdBy);
  } else if (noteId) {
    console.log(`📝 Finding note by ID: ${noteId}`);
    note = await d1Tools.getNoteById(noteId, createdBy);
  } else {
    // If no note specified, list all notes to help the user
    console.log("❌ No note specified. Use --noteSlug or --noteId");
    console.log("\nListing all existing notes:\n");

    const result = await d1.execute({
      sql: `SELECT id, slug, entity_type, entity_id, content, tags, created_at FROM notes WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      args: [createdBy],
    });

    if (result.rows.length === 0) {
      console.log("No notes found.");
    } else {
      result.rows.forEach((row) => {
        const tags = row.tags ? JSON.parse(row.tags as string) : [];
        const preview = (row.content as string).substring(0, 100);
        console.log(`ID: ${row.id}`);
        console.log(`Slug: ${row.slug}`);
        console.log(`Entity: ${row.entity_type}/${row.entity_id}`);
        console.log(`Tags: ${tags.join(", ")}`);
        console.log(`Created: ${row.created_at}`);
        console.log(`Preview: ${preview}...`);
        console.log("---");
      });
    }
    return;
  }

  if (!note) {
    console.error("❌ Note not found!");
    return;
  }

  console.log(`✅ Found note: ID=${note.id}, Slug=${note.slug}`);
  console.log(`   Current entity: ${note.entityType}/${note.entityId}`);
  console.log(`   Tags: ${note.tags.join(", ")}`);
  console.log(`   Created: ${note.createdAt}\n`);

  // Get linked research count
  const linkedResearch = await d1Tools.getResearchForNote(note.id);
  console.log(`   Linked Research: ${linkedResearch.length} papers\n`);

  // Step 2: Create the goal
  console.log(`🎯 Creating goal: "${goalTitle}"`);
  const goalId = await d1Tools.createGoal({
    familyMemberId,
    createdBy,
    title: goalTitle,
    description: goalDescription || null,
  });

  const goal = await d1Tools.getGoal(goalId, createdBy);
  console.log(`✅ Created goal: ID=${goal.id}`);
  console.log(`   Title: ${goal.title}`);
  console.log(`   Status: ${goal.status}\n`);

  // Step 3: Update the note to link to the goal
  console.log(`🔗 Linking note ${note.id} to goal ${goalId}...`);
  await d1Tools.updateNote(note.id, createdBy, {
    entityId: goalId,
    entityType: "Goal",
  });

  const updatedNote = await d1Tools.getNoteById(note.id, createdBy);
  console.log(`✅ Updated note successfully!`);
  console.log(
    `   New entity: ${updatedNote?.entityType}/${updatedNote?.entityId}\n`,
  );

  console.log("🎉 Done! The note is now linked to the goal.");
  console.log(`\nSummary:`);
  console.log(`   Goal ID: ${goalId}`);
  console.log(`   Goal Title: ${goal.title}`);
  console.log(`   Note ID: ${note.id}`);
  console.log(`   Note Slug: ${note.slug}`);
  console.log(`   Linked Research: ${linkedResearch.length} papers`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
