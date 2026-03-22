/**
 * Script to generate therapy research for a specific goal via LangGraph
 *
 * Usage:
 *   pnpm exec tsx scripts/generate-research-for-goal.ts
 *   Default goal: advocating-for-yourself-in-interviews
 */

import "dotenv/config";
import { db } from "@/src/db";
import { sql } from "@/src/db/neon";
import { runGraphAndWait } from "@/src/lib/langgraph-client";
const DEFAULT_GOAL_SLUG = "advocating-for-yourself-in-interviews";
const USER_EMAIL = process.env.USER_EMAIL || "nicolai.vadim@gmail.com";

async function main() {
  console.log(
    `Generating therapy research for goal: "${DEFAULT_GOAL_SLUG}"\n`,
  );

  try {
    const goal = await db.getGoalBySlug(DEFAULT_GOAL_SLUG, USER_EMAIL);
    if (!goal) {
      throw new Error(`Goal not found: ${DEFAULT_GOAL_SLUG}`);
    }

    console.log(`Goal: ${goal.title}`);
    console.log(`   Description: ${goal.description?.substring(0, 100)}...\n`);

    // Clean up existing research before generating new research
    console.log("Cleaning up existing research...");
    await sql`DELETE FROM therapy_research WHERE goal_id = ${goal.id}`;
    console.log(`   Deleted existing research papers\n`);

    // Build prompt (same pattern as generateResearch resolver)
    const prompt = [
      `Find evidence-based therapeutic research for the following goal:`,
      ``,
      `goal_id: ${goal.id}`,
      `Title: ${goal.title}`,
      goal.description ? `Description: ${goal.description}` : "",
      ``,
      `Search for academic papers that support this therapeutic goal.`,
      `Focus on evidence-based interventions, therapeutic techniques, and outcome measures.`,
      ``,
      `IMPORTANT: When calling save_research_papers, use goal_id: ${goal.id}.`,
    ].filter(Boolean).join("\n");

    // Call LangGraph research agent
    console.log("Running LangGraph research agent...\n");

    const result = await runGraphAndWait("research", {
      input: {
        messages: [{ role: "user", content: prompt }],
      },
    });

    const messages = result?.messages as
      | Array<{ content: string; type?: string }>
      | undefined;
    const lastAiMessage = messages
      ?.filter((m) => m.type === "ai" && m.content)
      .pop();
    const output = lastAiMessage?.content || "";

    console.log("Research complete!");
    console.log(`   Output length: ${output.length} chars\n`);

    // Display found research papers
    const research = await db.listTherapyResearch(goal.id);
    if (research.length > 0) {
      console.log(`Found ${research.length} research papers:\n`);
      research.forEach((paper, index) => {
        console.log(`${index + 1}. ${paper.title}`);
        if (paper.authors) console.log(`   Authors: ${paper.authors}`);
        if (paper.year) console.log(`   Year: ${paper.year}`);
        if (paper.journal) console.log(`   Journal: ${paper.journal}`);
        if (paper.doi) console.log(`   DOI: ${paper.doi}`);
        console.log("");
      });
    } else {
      console.log("No research papers found.\n");
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Error:", errorMessage);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
