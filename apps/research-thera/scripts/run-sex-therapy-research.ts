import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const USER_EMAIL = process.env.USER_EMAIL || "nicolai.vadim@gmail.com";
const FAMILY_MEMBER_ID = 3;
const GOAL_SLUG = "sex-therapy-intimacy-desire";
const TAG = "sex-therapy";

async function main() {
  const { db } = await import("@/src/db");
  const { sql } = await import("@/src/db/neon");
  const { generateTherapyResearch } = await import("@/src/workflows");

  let goalId: number;
  try {
    const existing = await db.getGoalBySlug(GOAL_SLUG, USER_EMAIL);
    goalId = existing.id;
    console.log(`Found existing goal ${goalId}: "${existing.title}"`);
    const tags: string[] = existing.tags ?? [];
    if (!tags.includes(TAG)) {
      await db.updateGoal(existing.id, USER_EMAIL, {
        tags: [...tags, TAG],
      });
      console.log(`  → Added tag "${TAG}"`);
    }
  } catch {
    goalId = await db.createGoal({
      familyMemberId: FAMILY_MEMBER_ID,
      createdBy: USER_EMAIL,
      slug: GOAL_SLUG,
      title: "Rebuild sexual intimacy and desire in long-term partnership",
      description:
        "Partner has expressed feeling sexually objectified and has withdrawn from physical intimacy. Seeking evidence-based interventions addressing: hypoactive sexual desire disorder, sexual desire discrepancy, emotional and sexual intimacy in long-term couples, communication about sex, sensate focus, cognitive-behavioral therapy for sexual dysfunction, and relational sex therapy.",
    });
    console.log(`Created goal ${goalId}`);

    await db.updateGoal(goalId, USER_EMAIL, { tags: [TAG] });
    console.log(`  → Tagged "${TAG}"`);

    await sql`UPDATE journal_entries SET goal_id = ${goalId} WHERE id IN (25, 26) AND user_id = ${USER_EMAIL}`;
    console.log(`  → Linked journal entries 25, 26 to goal ${goalId}`);
  }

  console.log(`\n=== Running deep research pipeline for goal ${goalId} ===\n`);
  const t0 = Date.now();

  const result = await generateTherapyResearch({
    userId: USER_EMAIL,
    goalId,
  });

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n=== Pipeline complete in ${elapsed}s ===`);
  console.log(`Success: ${result.success}`);
  console.log(`Papers persisted: ${result.count}`);
  if (result.message) console.log(`Message: ${result.message}`);

  const research = await db.listTherapyResearch(goalId);
  console.log(`\nTotal research rows for goal ${goalId}: ${research.length}`);
  research.slice(0, 15).forEach((r: any, i: number) => {
    console.log(`  ${i + 1}. [${r.evidenceLevel ?? "?"}] ${r.title}`);
    if (r.doi) console.log(`     DOI: ${r.doi}`);
    if (r.year) console.log(`     Year: ${r.year}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
