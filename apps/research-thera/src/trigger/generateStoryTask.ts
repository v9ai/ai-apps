/**
 * Generate Story Task — Trigger.dev
 *
 * Generates a therapeutic story from research papers using the therapeuticAgent.
 * Runs as a durable Trigger.dev task to avoid Vercel serverless timeouts.
 *
 * Payload: { jobId, goalId, userId, userEmail, language?, minutes? }
 */

import { task, logger } from "@trigger.dev/sdk/v3";
import { therapeuticAgent } from "@/src/agents/index";
import { d1Tools } from "@/src/db";

function getDevelopmentalTier(ageYears: number | null | undefined): string {
  if (!ageYears) return "ADULT";
  if (ageYears <= 5) return "EARLY_CHILDHOOD";
  if (ageYears <= 11) return "MIDDLE_CHILDHOOD";
  if (ageYears <= 14) return "EARLY_ADOLESCENCE";
  if (ageYears <= 18) return "LATE_ADOLESCENCE";
  return "ADULT";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenerateStoryPayload {
  jobId: string;
  goalId: number;
  /** Clerk userId — passed through for D1 ownership checks */
  userId: string;
  /** Normalized user email — used as createdBy in D1 */
  userEmail: string;
  language?: string;
  minutes?: number;
  /** When set, this characteristic is the primary focus of the story */
  characteristicId?: number;
}

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const generateStoryTask = task({
  id: "generate-story",
  maxDuration: 600,
  retry: {
    maxAttempts: 1,
  },
  onFailure: async ({
    payload,
    error,
  }: {
    payload: GenerateStoryPayload;
    error: unknown;
  }) => {
    const message =
      error instanceof Error ? error.message : "Story generation failed";
    logger.error("generate-story.job_failed", {
      jobId: payload.jobId,
      goalId: payload.goalId,
      error: message,
    });
    await d1Tools
      .updateGenerationJob(payload.jobId, {
        status: "FAILED",
        error: JSON.stringify({ message }),
      })
      .catch(() => {});
  },
  run: async (payload: GenerateStoryPayload) => {
    const { jobId, goalId, userEmail, language = "English", minutes = 10, characteristicId } = payload;

    logger.info("generate-story.started", { jobId, goalId, language, minutes });

    // --- 10% — Load goal context ---
    await d1Tools.updateGenerationJob(jobId, { progress: 10 });

    const goal = await d1Tools.getGoal(goalId, userEmail);
    const familyMember = await d1Tools.getFamilyMember(goal.familyMemberId);

    if (!familyMember) {
      throw new Error(`Family member ${goal.familyMemberId} not found`);
    }

    const characteristics = await d1Tools.getCharacteristicsForFamilyMember(
      goal.familyMemberId,
      userEmail,
    );

    const focusCharacteristic = characteristicId
      ? (await d1Tools.getCharacteristic(characteristicId, userEmail)) ?? null
      : null;

    logger.info("generate-story.loaded_context", {
      jobId,
      goalTitle: goal.title,
      familyMemberName: familyMember.firstName,
      characteristicCount: characteristics.length,
      focusCharacteristicId: focusCharacteristic?.id ?? null,
    });

    // --- 30% — Fetch research papers ---
    await d1Tools.updateGenerationJob(jobId, { progress: 30 });

    const research = await d1Tools.listTherapyResearch(goalId);

    logger.info("generate-story.fetched_research", {
      jobId,
      paperCount: research.length,
    });

    // Build research summary from top papers (limit to 10 most relevant)
    const topPapers = research.slice(0, 10);
    const researchSummary = topPapers
      .map((paper, i) => {
        const findings = paper.keyFindings.join("; ");
        const techniques = paper.therapeuticTechniques.join("; ");
        return `${i + 1}. "${paper.title}" (${paper.year ?? "n.d."})
   Key findings: ${findings}
   Therapeutic techniques: ${techniques}`;
      })
      .join("\n\n");

    // --- 60% — Generate therapeutic story ---
    await d1Tools.updateGenerationJob(jobId, { progress: 60 });

    const ageContext = familyMember.ageYears
      ? ` (age ${familyMember.ageYears})`
      : "";

    const developmentalTier = getDevelopmentalTier(familyMember.ageYears);

    // Fetch unique outcomes for the focus characteristic
    const uniqueOutcomes = focusCharacteristic
      ? await d1Tools.getUniqueOutcomesForCharacteristic(
          focusCharacteristic.id,
          userEmail,
        )
      : [];

    const otherCharacteristics = focusCharacteristic
      ? characteristics.filter((c) => c.id !== focusCharacteristic.id)
      : characteristics;

    const characteristicsSection = (() => {
      const lines: string[] = [];
      if (focusCharacteristic) {
        const focusLabel =
          focusCharacteristic.externalizedName || focusCharacteristic.title;
        lines.push(
          `\n## Therapeutic Focus`,
          `${focusLabel}`,
          `Category: ${focusCharacteristic.category}`,
        );
        if (focusCharacteristic.description) {
          lines.push(`Description: ${focusCharacteristic.description}`);
        }
        if (focusCharacteristic.strengths) {
          lines.push(`\n## Strengths`, focusCharacteristic.strengths);
        }
        if (uniqueOutcomes.length > 0) {
          lines.push(
            `\n## Sparkling Moments`,
            ...uniqueOutcomes.map(
              (o) => `- ${o.observedAt}: ${o.description}`,
            ),
          );
        }
      }
      if (otherCharacteristics.length > 0) {
        lines.push(
          `\n## Additional Person Characteristics`,
          ...otherCharacteristics.map(
            (c) =>
              `- ${c.category}: ${c.title}${c.description ? ` — ${c.description}` : ""}`,
          ),
        );
      }
      return lines.length > 0 ? lines.join("\n") + "\n" : "";
    })();

    const prompt = `Create a therapeutic audio session for the following goal. Write the full script in ${language}, approximately ${minutes} minutes long when read aloud.

## Goal
Title: ${goal.title}
Description: ${goal.description || "No additional description provided."}

## Person
This is for ${familyMember.firstName}${ageContext}.
Developmental Tier: ${developmentalTier}
${characteristicsSection}

## Research Evidence
The following research papers inform the therapeutic techniques to use:

${researchSummary || "No research papers available yet. Use general evidence-based therapeutic techniques."}

## Instructions
- Create a complete, flowing therapeutic audio script
- Incorporate specific techniques and findings from the research above
- Personalize for ${familyMember.firstName}${ageContext} (developmental tier: ${developmentalTier})
- Target duration: ${minutes} minutes when read aloud at a calm pace
- Write in ${language}
- Follow the therapeutic audio content structure (warm introduction, understanding the challenge, guided practices, integration)`;

    logger.info("generate-story.generating", { jobId, promptLength: prompt.length });

    const response = await therapeuticAgent.generate([
      { role: "user", content: prompt },
    ]);

    const generatedText = response.text;

    if (!generatedText) {
      throw new Error("Agent returned empty text");
    }

    logger.info("generate-story.generated", {
      jobId,
      textLength: generatedText.length,
    });

    // --- 90% — Save to DB ---
    await d1Tools.updateGenerationJob(jobId, { progress: 90 });

    const story = await d1Tools.createGoalStory(goalId, language, minutes, generatedText);

    logger.info("generate-story.saved", { jobId, storyId: story.id });

    // --- 100% — Done ---
    await d1Tools.updateGenerationJob(jobId, {
      status: "SUCCEEDED",
      progress: 100,
      result: JSON.stringify({ storyId: story.id, text: generatedText }),
    });

    return { success: true, storyId: story.id };
  },
});
