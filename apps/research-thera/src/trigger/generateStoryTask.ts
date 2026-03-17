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
  /** When set, this issue is the primary focus of the story */
  issueId?: number;
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
    const { jobId, goalId, userEmail, language = "English", minutes = 30, issueId } = payload;

    logger.info("generate-story.started", { jobId, goalId, language, minutes });

    // --- 10% — Load goal context ---
    await d1Tools.updateGenerationJob(jobId, { progress: 10 });

    const goal = await d1Tools.getGoal(goalId, userEmail);
    const familyMember = await d1Tools.getFamilyMember(goal.familyMemberId);

    if (!familyMember) {
      throw new Error(`Family member ${goal.familyMemberId} not found`);
    }

    const issue = issueId
      ? (await d1Tools.getIssue(issueId, userEmail)) ?? null
      : null;

    logger.info("generate-story.loaded_context", {
      jobId,
      goalTitle: goal.title,
      familyMemberName: familyMember.firstName,
      issueId: issue?.id ?? null,
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

    if (!familyMember.ageYears) {
      logger.warn("generate-story.missing_age", {
        jobId,
        familyMemberId: familyMember.id,
        firstName: familyMember.firstName,
        note: "ageYears is null — tier defaults to ADULT which may produce adult-register content",
      });
    }

    let issueSection = "";
    if (issue) {
      const lines: string[] = [];
      lines.push(
        `\n## Therapeutic Focus`,
        `${issue.title}`,
        `Category: ${issue.category}`,
      );
      if (issue.description) {
        lines.push(`Description: ${issue.description}`);
      }
      if (issue.recommendations && issue.recommendations.length > 0) {
        lines.push(`\n## Recommendations`);
        for (const rec of issue.recommendations) {
          lines.push(`- ${rec}`);
        }
      }
      issueSection = lines.join("\n") + "\n";
    }

    // Determine if LEGO play is appropriate for this developmental tier
    const legoAppropriate = ["EARLY_CHILDHOOD", "MIDDLE_CHILDHOOD", "EARLY_ADOLESCENCE"].includes(developmentalTier);

    const legoInstructions = legoAppropriate
      ? `
## LEGO Therapeutic Play (REQUIRED)
This session MUST integrate LEGO building as a hands-on therapeutic activity. This is NOT optional — LEGO play is a core modality for this age group:
- Use LEGO construction as a metaphor for the therapeutic concept (e.g., building a "brave tower," "feelings wall," or "calm castle")
- MUST include at least one guided LEGO building moment with clear spoken instructions and pauses for the child to build
- Make LEGO participation optional for the listener: "If you have some LEGO bricks, grab a few now... if not, just imagine building in your mind"
- Connect every building activity back to the therapeutic goal — the building IS the practice, not a distraction
- Name specific LEGO techniques: Feelings Tower, Worry Wall, Brave Bridge, Memory Build, or Calm Castle — whichever fits the goal
- Dedicate at least 30% of the session time to LEGO-based activities`
      : "";

    const isChild = developmentalTier !== "ADULT";
    const ageLabel = familyMember.ageYears
      ? `${familyMember.ageYears}-year-old child`
      : "child";

    // Hard age-enforcement block injected immediately after the person line for children.
    // Without this, the LLM can drift to adult register even when age is stated.
    const ageEnforcementBlock = isChild
      ? `

CRITICAL AGE REQUIREMENT: ${familyMember.firstName} is a ${ageLabel} (${developmentalTier} tier). Every word of this script MUST be written for a child, NOT for an adult.
- Use only simple words (1-2 syllables when possible).
- Use playful, warm, concrete language — no abstract adult concepts.
- NEVER say ${familyMember.firstName} is "normal like an adult", "behaves like an adult", or describe adult-level coping.
- NEVER use adult register, adult emotional vocabulary, or adult expectations.
- If you find yourself writing for a grown-up, stop and rewrite for a ${ageLabel}.`
      : "";

    const prompt = `Create a therapeutic audio session for the following goal. Write the full script in ${language}, approximately ${minutes} minutes long when read aloud at a calm pace of about 120 words per minute.

CRITICAL: This script will be read aloud by a text-to-speech engine. Write ONLY plain spoken prose. Absolutely NO markdown formatting — no **, ##, *, -, bullet points, numbered lists, headers, bold, or italic syntax. No section labels. Just natural flowing speech.

## Goal
Title: ${goal.title}
Description: ${goal.description || "No additional description provided."}

## Person
This is for ${familyMember.firstName}${ageContext}.
Developmental Tier: ${developmentalTier}${ageEnforcementBlock}
${issueSection}
## Research Evidence
The following research papers inform the therapeutic techniques to use:

${researchSummary || "No research papers available yet. Use general evidence-based therapeutic techniques."}
${legoInstructions}
## Audio Script Requirements
- Write as spoken prose ONLY — the listener cannot see any text, they can only hear
- Use "..." (three dots) for all pauses — between sections, after instructions, within sentences. NEVER write [pause] or any bracket markers — TTS engines read them literally
- Keep sentences short: maximum ${isChild ? "15" : "20"} words each
- Use spoken transitions: "Now..." "Next..." "When you're ready..." "Good. Let's try..."
- CRITICAL: Every breathing exercise MUST have explicit counted timing. NEVER write just "take a deep breath". ALWAYS write: "Breathe in... two... three... four... And slowly breathe out... two... three... four... five..." If you mention breathing at all, include the numbered counts.
- Vary pacing: alternate between instruction, story or metaphor, and silence
- Never give more than two instructions in a row without an ellipsis pause or encouragement
- Address ${familyMember.firstName} by name at least 3 times throughout the session
- Address ONLY ${familyMember.firstName} directly throughout the entire session. NEVER directly address or speak to any parent, caregiver, or other person. You may suggest ${familyMember.firstName} ask a parent or caregiver for help, but always in third person (e.g., "you can ask your mom to help you practice this" — never "Mom, do this with him")
- Write in ${language}
- Personalize for ${familyMember.firstName}${ageContext} (developmental tier: ${developmentalTier})${isChild ? `\n- This is for a ${ageLabel} — use child vocabulary, playful framing, and age-appropriate techniques throughout. Never adult-register.` : ""}${legoAppropriate ? `\n- LEGO play is REQUIRED for this session — include guided LEGO building activities as described in the LEGO Therapeutic Play section above` : ""}
- Target duration: ${minutes} minutes (approximately ${minutes * 120} words at calm pace)`;

    logger.info("generate-story.generating", { jobId, promptLength: prompt.length });

    const response = await therapeuticAgent.generate(
      [{ role: "user", content: prompt }],
      { modelSettings: { maxTokens: 8192 } },
    );

    let generatedText = response.text;

    if (!generatedText) {
      throw new Error("Agent returned empty text");
    }

    // Post-process: convert [pause] → "..." and strip any other bracket markers
    // (LLM sometimes ignores the prompt instruction to avoid bracket notation)
    generatedText = generatedText
      .replace(/\[pause\]/gi, "...")
      .replace(/\[sound:[^\]]*\]/gi, "")
      .replace(/\[[^\]]+\]/g, "");

    logger.info("generate-story.generated", {
      jobId,
      textLength: generatedText.length,
    });

    // --- 90% — Save to DB ---
    await d1Tools.updateGenerationJob(jobId, { progress: 90 });

    const story = await d1Tools.createStory({ goalId, language, minutes, content: generatedText });

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
