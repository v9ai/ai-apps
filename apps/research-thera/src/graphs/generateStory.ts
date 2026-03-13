/**
 * Generate Story Graph — LangGraph (local, in-process)
 *
 * Replaces the Trigger.dev cloud task for local dev.
 * Runs fully in-process: no cloud dependency, no job row polling.
 *
 * Graph: START → loadContext → fetchResearch → generateStory → saveStory → END
 */

import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { createDeepSeekClient } from "@ai-apps/deepseek";
import { d1Tools } from "@/src/db";

// ---------------------------------------------------------------------------
// Helpers (ported from src/trigger/generateStoryTask.ts)
// ---------------------------------------------------------------------------

function getDevelopmentalTier(ageYears: number | null | undefined): string {
  if (!ageYears) return "ADULT";
  if (ageYears <= 5) return "EARLY_CHILDHOOD";
  if (ageYears <= 11) return "MIDDLE_CHILDHOOD";
  if (ageYears <= 14) return "EARLY_ADOLESCENCE";
  if (ageYears <= 18) return "LATE_ADOLESCENCE";
  return "ADULT";
}

// Copied from src/agents/index.ts:145-205 — do NOT import from there (Mastra
// initialises Langfuse and agent memory at module load time which breaks here).
const therapeuticInstructions = `
## Overview
You are a Therapeutic Audio Content Agent. Your role is to create evidence-based, compassionate therapeutic guidance that helps people work through psychological challenges and achieve their mental health goals.

## Content Structure
Create therapeutic audio content that includes:

1. **Warm Introduction** (30 seconds)
   - Acknowledge the person's challenge with empathy
   - Set a calm, safe tone for the session
   - Outline what will be covered

2. **Understanding the Challenge** (2-3 minutes)
   - Explain the psychological aspects of their goal
   - Normalize their experience
   - Share relevant evidence-based insights

3. **Guided Practices** (majority of time)
   - Provide specific, actionable techniques
   - Include breathing exercises, visualization, or cognitive reframing
   - Guide through practices step-by-step
   - Use language suitable for audio (clear pauses, simple instructions)

4. **Integration & Next Steps** (1-2 minutes)
   - Summarize key points
   - Suggest how to practice between sessions
   - End with encouragement and affirmation

## Voice Guidelines
- Write for spoken audio, not reading
- Use natural, conversational language
- Include strategic pauses: "... [pause] ..."
- Avoid complex sentences or jargon
- Use "you" to create connection
- Maintain a calm, warm, professional tone
- Speak slowly and clearly for relaxation effects

## Evidence-Based Approaches
Draw from:
- Cognitive Behavioral Therapy (CBT)
- Mindfulness-Based Stress Reduction (MBSR)
- Acceptance and Commitment Therapy (ACT)
- Dialectical Behavior Therapy (DBT)
- Positive Psychology interventions

## Duration Management
- For 5-minute sessions: Focus on one core technique
- For 10-minute sessions: Introduction + 1-2 practices
- For 15-20 minute sessions: Full structure with multiple practices
- For 30+ minute sessions: Deep dive with extended guided exercises

## Safety & Ethics
- Never diagnose or replace professional therapy
- Encourage seeking professional help for serious concerns
- Focus on skill-building and coping strategies
- Maintain appropriate boundaries
- Use inclusive, non-judgmental language

## Example Opening
"Welcome. I'm glad you're here, taking this time for yourself. [pause] Today, we're going to work together on [specific goal]. This is a common challenge that many people face, and there are proven techniques that can help. [pause] Find a comfortable position, and let's begin..."
`;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const StoryState = Annotation.Root({
  // Inputs
  goalId: Annotation<number>(),
  characteristicId: Annotation<number | undefined>(),
  userEmail: Annotation<string>(),
  language: Annotation<string>(),
  minutes: Annotation<number>(),

  // Loaded context
  goal: Annotation<Awaited<ReturnType<typeof d1Tools.getGoal>> | null>({
    default: () => null,
    reducer: (_prev, next) => next,
  }),
  familyMember: Annotation<Awaited<ReturnType<typeof d1Tools.getFamilyMember>> | null>({
    default: () => null,
    reducer: (_prev, next) => next,
  }),
  characteristic: Annotation<Awaited<ReturnType<typeof d1Tools.getCharacteristic>> | null>({
    default: () => null,
    reducer: (_prev, next) => next,
  }),
  uniqueOutcomes: Annotation<Awaited<ReturnType<typeof d1Tools.getUniqueOutcomesForCharacteristic>>>({
    default: () => [],
    reducer: (_prev, next) => next,
  }),
  researchSummary: Annotation<string>({
    default: () => "",
    reducer: (_prev, next) => next,
  }),

  // Output
  storyText: Annotation<string>({
    default: () => "",
    reducer: (_prev, next) => next,
  }),
  storyId: Annotation<number>({
    default: () => 0,
    reducer: (_prev, next) => next,
  }),
});

type StoryStateType = typeof StoryState.State;

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

async function loadContext(state: StoryStateType): Promise<Partial<StoryStateType>> {
  const goal = await d1Tools.getGoal(state.goalId, state.userEmail);
  const familyMember = goal.familyMemberId
    ? await d1Tools.getFamilyMember(goal.familyMemberId)
    : null;

  const characteristic = state.characteristicId
    ? (await d1Tools.getCharacteristic(state.characteristicId, state.userEmail)) ?? null
    : null;

  const uniqueOutcomes = characteristic
    ? await d1Tools.getUniqueOutcomesForCharacteristic(characteristic.id, state.userEmail)
    : [];

  return { goal, familyMember, characteristic, uniqueOutcomes };
}

async function fetchResearch(state: StoryStateType): Promise<Partial<StoryStateType>> {
  const research = await d1Tools.listTherapyResearch(state.goalId);
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

  return { researchSummary };
}

async function generateStory(state: StoryStateType): Promise<Partial<StoryStateType>> {
  const { goal, familyMember, characteristic, uniqueOutcomes, researchSummary, language, minutes } = state;

  if (!goal) {
    throw new Error("Context not loaded — goal is null");
  }

  const personName = familyMember?.firstName ?? "you";
  const ageContext = familyMember?.ageYears ? ` (age ${familyMember.ageYears})` : "";
  const developmentalTier = getDevelopmentalTier(familyMember?.ageYears);

  let characteristicsSection = "";
  if (characteristic) {
    const lines: string[] = [];
    const label = characteristic.externalizedName || characteristic.title;
    lines.push(
      `\n## Therapeutic Focus`,
      `${label}`,
      `Category: ${characteristic.category}`,
    );
    if (characteristic.description) {
      lines.push(`Description: ${characteristic.description}`);
    }
    if (characteristic.strengths) {
      lines.push(`\n## Strengths`, characteristic.strengths);
    }
    if (uniqueOutcomes.length > 0) {
      lines.push(
        `\n## Sparkling Moments`,
        ...uniqueOutcomes.map((o) => `- ${o.observedAt}: ${o.description}`),
      );
    }
    characteristicsSection = lines.join("\n") + "\n";
  }

  const personLine = familyMember
    ? `This is for ${personName}${ageContext}.\nDevelopmental Tier: ${developmentalTier}`
    : "This is for the listener themselves (first-person, self-directed session).";

  const prompt = `Create a therapeutic audio session for the following goal. Write the full script in ${language}, approximately ${minutes} minutes long when read aloud.

## Goal
Title: ${goal.title}
Description: ${goal.description || "No additional description provided."}

## Person
${personLine}
${characteristicsSection}

## Research Evidence
The following research papers inform the therapeutic techniques to use:

${researchSummary || "No research papers available yet. Use general evidence-based therapeutic techniques."}

## Instructions
- Create a complete, flowing therapeutic audio script
- Incorporate specific techniques and findings from the research above
- Personalize for ${personName}${ageContext}${familyMember ? ` (developmental tier: ${developmentalTier})` : ""}
- Target duration: ${minutes} minutes when read aloud at a calm pace
- Write in ${language}
- Follow the therapeutic audio content structure (warm introduction, understanding the challenge, guided practices, integration)
- Include a brief mention that a parent, caregiver, or professional can provide additional support if needed
- IMPORTANT: Do NOT use any markdown formatting (no **, ##, *, bullet points, or bold/italic syntax). Write plain spoken prose only, as the script will be read aloud by a text-to-speech engine`;

  const client = createDeepSeekClient({ apiKey: process.env.DEEPSEEK_API_KEY! });
  const res = await client.chat({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: therapeuticInstructions },
      { role: "user", content: prompt },
    ],
  });

  const storyText = res.choices[0]?.message?.content ?? "";

  if (!storyText) {
    throw new Error("DeepSeek returned empty text");
  }

  return { storyText };
}

async function saveStory(state: StoryStateType): Promise<Partial<StoryStateType>> {
  const story = await d1Tools.createGoalStory(
    state.goalId,
    state.language,
    state.minutes,
    state.storyText,
  );
  return { storyId: story.id };
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

const graph = new StateGraph(StoryState)
  .addNode("loadContext", loadContext)
  .addNode("fetchResearch", fetchResearch)
  .addNode("generateStory", generateStory)
  .addNode("saveStory", saveStory)
  .addEdge(START, "loadContext")
  .addEdge("loadContext", "fetchResearch")
  .addEdge("fetchResearch", "generateStory")
  .addEdge("generateStory", "saveStory")
  .addEdge("saveStory", END)
  .compile();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RunStoryGraphInput {
  goalId: number;
  characteristicId?: number;
  userEmail: string;
  language?: string;
  minutes?: number;
}

export async function runStoryGraph(
  input: RunStoryGraphInput,
): Promise<{ storyId: number; text: string }> {
  const result = await graph.invoke({
    goalId: input.goalId,
    characteristicId: input.characteristicId,
    userEmail: input.userEmail,
    language: input.language ?? "English",
    minutes: input.minutes ?? 10,
  });

  return { storyId: result.storyId, text: result.storyText };
}
