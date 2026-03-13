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

export function getDevelopmentalTier(ageYears: number | null | undefined): string {
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
  goalId: Annotation<number | undefined>(),
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
  notesSummary: Annotation<string>({
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
  const goal = state.goalId
    ? await d1Tools.getGoal(state.goalId, state.userEmail)
    : null;

  const characteristic = state.characteristicId
    ? (await d1Tools.getCharacteristic(state.characteristicId, state.userEmail)) ?? null
    : null;

  // Derive familyMember from goal or characteristic
  const familyMemberId = goal?.familyMemberId ?? characteristic?.familyMemberId ?? null;
  const familyMember = familyMemberId
    ? await d1Tools.getFamilyMember(familyMemberId)
    : null;

  const uniqueOutcomes = characteristic
    ? await d1Tools.getUniqueOutcomesForCharacteristic(characteristic.id, state.userEmail)
    : [];

  return { goal, familyMember, characteristic, uniqueOutcomes };
}

async function fetchResearch(state: StoryStateType): Promise<Partial<StoryStateType>> {
  const research = await d1Tools.listTherapyResearch(state.goalId, state.characteristicId);
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

  // Fetch notes for the characteristic if available
  let notesSummary = "";
  if (state.characteristicId && state.userEmail) {
    const notes = await d1Tools.listNotesForEntity(state.characteristicId, "characteristic", state.userEmail);

    // Prioritize deep research notes over regular notes
    const priority: Record<string, number> = {
      DEEP_RESEARCH_SYNTHESIS: 0,
      DEEP_RESEARCH_MERGED: 1,
      DEEP_RESEARCH_FINDING: 2,
    };
    const sorted = [...notes].sort((a, b) => {
      const pa = priority[a.noteType ?? ""] ?? 3;
      const pb = priority[b.noteType ?? ""] ?? 3;
      return pa - pb;
    });

    const top5 = sorted.slice(0, 5);
    notesSummary = top5
      .map((note, i) => {
        const text = note.content.length > 1500 ? note.content.slice(0, 1500) + "..." : note.content;
        const label = note.title || `Note ${i + 1}`;
        return `${i + 1}. ${label}\n   ${text}`;
      })
      .join("\n\n");
  }

  return { researchSummary, notesSummary };
}

async function generateStory(state: StoryStateType): Promise<Partial<StoryStateType>> {
  const { goal, familyMember, characteristic, uniqueOutcomes, researchSummary, notesSummary, language, minutes } = state;

  if (!goal && !characteristic) {
    throw new Error("Context not loaded — need at least a goal or characteristic");
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

  // Build topic section from goal or characteristic
  let topicSection: string;
  if (goal) {
    topicSection = `## Goal
Title: ${goal.title}
Description: ${goal.description || "No additional description provided."}`;
  } else {
    const char = characteristic!;
    const label = char.externalizedName || char.title;
    topicSection = `## Topic
Title: ${label}
Category: ${char.category}
Description: ${char.description || "No additional description provided."}`;
  }

  const prompt = `Create a therapeutic audio session for the following ${goal ? "goal" : "topic"}. Write the full script in ${language}, approximately ${minutes} minutes long when read aloud.

${topicSection}

## Person
${personLine}
${characteristicsSection}

## Research Evidence
The following research papers inform the therapeutic techniques to use:

${researchSummary || "No research papers available yet. Use general evidence-based therapeutic techniques."}
${notesSummary ? `
## Clinical Notes & Observations
The following notes contain clinical observations, research findings, and insights specific to this person:

${notesSummary}
` : ""}
## Instructions
- Create a complete, flowing therapeutic audio script
- Incorporate specific techniques and findings from the research above
- When clinical notes are available, weave their insights and observations into the session
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
  const story = await d1Tools.createGoalStory({
    goalId: state.goalId ?? null,
    characteristicId: state.characteristicId ?? null,
    language: state.language,
    minutes: state.minutes,
    text: state.storyText,
  });
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
  goalId?: number;
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
