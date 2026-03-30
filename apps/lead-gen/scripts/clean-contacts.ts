/**
 * Delete contacts matching specific tags.
 *
 * Usage:
 *   pnpm clean:contacts ai-recruiter-tier-2              # delete contacts with tag
 *   pnpm clean:contacts ai-recruiter-tier-2 unverified   # multiple tags (OR)
 *   pnpm clean:contacts ai-recruiter-tier-2 --dry-run    # preview only
 */

import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const tags = args.filter((a) => a !== "--dry-run");

  if (tags.length === 0) {
    console.error("Usage: pnpm clean:contacts <tag1> [tag2 ...] [--dry-run]");
    process.exit(1);
  }

  const { db } = await import("@/db");
  const { contacts } = await import("@/db/schema");
  const { sql } = await import("drizzle-orm");

  // Build OR condition: tags::jsonb contains any of the specified values
  const conditions = tags.map((t) => sql`${contacts.tags}::jsonb @> ${JSON.stringify([t])}::jsonb`);
  const where = conditions.length === 1
    ? conditions[0]
    : sql.join(conditions, sql` OR `);

  // Count + sample
  const matched = await db
    .select({
      id: contacts.id,
      first_name: contacts.first_name,
      last_name: contacts.last_name,
      email: contacts.email,
      company: contacts.company,
      tags: contacts.tags,
    })
    .from(contacts)
    .where(where);

  console.log(`\nFound ${matched.length} contacts matching tags: ${tags.join(", ")}`);

  if (matched.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  // Show sample
  const sample = matched.slice(0, 5);
  console.log("\nSample:");
  for (const c of sample) {
    console.log(`  ${c.first_name} ${c.last_name} <${c.email ?? "no email"}> @ ${c.company ?? "?"} — tags: ${c.tags}`);
  }
  if (matched.length > 5) {
    console.log(`  ... and ${matched.length - 5} more`);
  }

  if (dryRun) {
    console.log("\n[DRY RUN] No contacts deleted.");
    return;
  }

  // Delete
  const ids = matched.map((c) => c.id);
  const batchSize = 500;
  let deleted = 0;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const placeholders = sql.join(batch.map((id) => sql`${id}`), sql`, `);
    await db.delete(contacts).where(sql`${contacts.id} IN (${placeholders})`);
    deleted += batch.length;
    if (ids.length > batchSize) {
      console.log(`  Deleted ${deleted}/${ids.length}...`);
    }
  }

  console.log(`\nDeleted ${deleted} contacts.`);
}

main().catch((e) => {
  console.error("clean-contacts failed:", e);
  process.exit(1);
});
