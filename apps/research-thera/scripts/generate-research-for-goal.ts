/**
 * Script to generate therapy research for a specific goal
 *
 * Usage:
 *   pnpm exec tsx scripts/generate-research-for-goal.ts
 *   Default goal: advocating-for-yourself-in-interviews
 */

import "dotenv/config";
import { d1Tools, d1 } from "@/src/db";
import { generateTherapyResearchWorkflow } from "@/src/workflows/generateTherapyResearch.workflow";

// Suppress AI SDK warnings
(globalThis as any).AI_SDK_LOG_WARNINGS = false;

const DEFAULT_GOAL_SLUG = "advocating-for-yourself-in-interviews";
const USER_EMAIL = process.env.USER_EMAIL || "nicolai.vadim@gmail.com";

async function main() {
  console.log(
    `🔍 Generating therapy research for goal: "${DEFAULT_GOAL_SLUG}"\n`,
  );

  try {
    // Fetch the goal
    const goal = await d1Tools.getGoalBySlug(DEFAULT_GOAL_SLUG, USER_EMAIL);
    if (!goal) {
      throw new Error(`Goal not found: ${DEFAULT_GOAL_SLUG}`);
    }

    console.log(`📌 Goal: ${goal.title}`);
    console.log(`   Description: ${goal.description?.substring(0, 100)}...\n`);

    // Clean up existing research before generating new research
    console.log("🧹 Cleaning up existing research...");
    await d1.execute({
      sql: `DELETE FROM therapy_research WHERE goal_id = ?`,
      args: [goal.id],
    });
    console.log(`   Deleted existing research papers\n`);

    // Run the research generation workflow
    console.log("🔬 Running research generation workflow...\n");
    const run = await generateTherapyResearchWorkflow.createRun();
    const result = await run.start({
      inputData: {
        userId: USER_EMAIL,
        goalId: goal.id,
      },
    });

    console.log("✅ Workflow completed!");
    console.log(`   Status: ${result.status}`);

    if (result.status === "success") {
      const message = result.result?.message || "Workflow succeeded";
      const count = result.result?.count || 0;

      console.log(`   Message: ${message}`);
      console.log(`   Papers found: ${count}\n`);

      // Display found research papers
      if (count > 0) {
        console.log("📚 Found research papers:\n");
        const research = await d1Tools.listTherapyResearch(goal.id);

        research.forEach((paper, index) => {
          console.log(`${index + 1}. ${paper.title}`);
          if (paper.authors) console.log(`   Authors: ${paper.authors}`);
          if (paper.year) console.log(`   Year: ${paper.year}`);
          if (paper.journal) console.log(`   Journal: ${paper.journal}`);
          if (paper.doi) console.log(`   DOI: ${paper.doi}`);
          if (paper.url) console.log(`   URL: ${paper.url}`);
          console.log("");
        });
      }
    } else if (result.status === "failed") {
      const errorMsg = (result as any).error?.message || "Unknown error";
      throw new Error(`Workflow failed: ${errorMsg}`);
    } else {
      throw new Error(
        `Workflow completed with unexpected status: ${result.status}`,
      );
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("❌ Error:", errorMessage);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("✨ Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Unexpected error:", err);
    process.exit(1);
  });
