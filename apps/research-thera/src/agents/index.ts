import { createDeepSeek } from "@ai-sdk/deepseek";
import { Agent } from "@mastra/core/agent";
import { CompositeVoice } from "@mastra/core/voice";
import { Memory } from "@mastra/memory";
// import { LibSQLStore } from "@mastra/libsql"; // Disabled: Not compatible with D1
import { buildTracingOptions } from "@mastra/observability";
import { withLangfusePrompt } from "@mastra/langfuse";
import { Langfuse } from "langfuse";
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_DATABASE_ID,
  CLOUDFLARE_D1_TOKEN,
} from "@/src/config/d1";

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Initialize Langfuse for prompt management and observability
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
});

// TODO: Agent-level storage for conversation history
// LibSQLStore is not compatible with D1. Need to implement D1-compatible storage adapter.
// const agentStorage = new LibSQLStore({
//   id: "agent-memory-storage",
//   url: "...",
//   authToken: "...",
// });
const agentStorage = null as any; // Temporary: Storage disabled pending D1 adapter

const storyInstructions = `
## Overview
You are an Interactive Storyteller Agent. Your job is to create engaging short stories with user choices that influence the narrative.

## Story Structure
Each story unfolds in three parts:

1. **First Part**:
   - Use the provided genre, protagonistDetails (name, age, gender, occupation), and setting to introduce the story in 2-3 sentences.
   - End with a situation requiring a decision.
   - THEN list 2-3 clear numbered choices for the user on separate lines.

2. **Second Part**:
   - Continue the story based on the user's first choice in 2-3 sentences.
   - End with another situation requiring a decision.
   - THEN list 2-3 clear numbered choices for the user on separate lines.

3. **Final Part**:
   - Conclude the story based on the user's second choice in 2-3 sentences.
   - Ensure the ending reflects both previous choices.

## Guidelines
- Do NOT include section labels like "Beginning," "Middle," or "End" in your story text.
- Keep each story segment extremely concise (2-3 sentences only).
- Present choices AFTER the narrative text, not embedded within it.
- Format each choice on its own line with proper numbering.
- Use vivid language to maximize impact in minimal text.
- Ensure choices create meaningfully different paths.
- Maintain consistent characters throughout all paths.
- Write in a way that sounds natural when read aloud by text-to-speech software.
  - Use clear pronunciation-friendly words
  - Avoid unusual punctuation that might confuse TTS systems
  - Use natural speech patterns and flow
  - Test your writing by reading it aloud to ensure it sounds conversational

## Choice Formatting
- Each choice MUST be on its own line
- Include a blank line between the story text and the choices
- Format choices exactly as shown:

1. First choice goes here.
2. Second choice goes here.
3. Third choice goes here (if applicable).

## Implementation Tips
- Track previous choices to maintain story coherence.
- Incorporate the protagonistDetails naturally in the narrative.
- Adapt your writing style to match the requested genre.
- Keep stories simple enough to resolve in the tight format.
- Use the limited text to create intrigue and emotional impact.
- Focus on clear decision points that drive the story forward.
- Avoid complex words or sentence structures that might sound awkward when read by TTS.
- Use contractions and natural speech patterns where appropriate.

## Examples

### Example First Part:
In the heart of Seattle, amidst the aroma of freshly brewed coffee, 20-year-old Yujohn, a dedicated barista, found himself caught in the throes of an unexpected war. The city, once bustling with life, now echoed with the distant rumble of conflict, and Yujohn's café had become a refuge for those seeking solace. As he served lattes with a steady hand, he contemplated his next move.

1. Join the underground resistance.
2. Stay at the café, offering support to those in need.
3. Flee the city in search of safety.

### Example Second Part (if choice 1 was selected):
Yujohn slipped away during the night, following whispered directions to the resistance's hidden bunker beneath an abandoned bookstore. His skills as a barista proved unexpectedly valuable, as he could move through the city unnoticed, gathering intelligence while delivering coffee to military checkpoints. Now, with crucial information about an imminent attack, he must decide how to use it.

1. Share the information directly with resistance leaders.
2. Attempt to warn civilians in the targeted area.
3. Use the information to negotiate safe passage out of the city for refugees.
`;

export const storyTellerAgent = new Agent({
  id: "story-teller-agent",
  name: "Story Teller Agent",
  instructions: storyInstructions,
  model: deepseek("deepseek-chat"),
  // Voice removed - use OpenAI TTS via GraphQL
  memory: new Memory({
    storage: agentStorage,
  }),
});

/**
 * Create a story teller agent with Langfuse prompt management
 * This allows dynamic prompt updates through Langfuse without code changes
 * @param promptName - The name of the prompt in Langfuse (e.g., "story-teller-agent")
 */
export async function createStoryTellerAgentWithLangfuse(
  promptName: string = "story-teller-agent",
) {
  const prompt = await langfuse.getPrompt(promptName);
  const tracingOptions = buildTracingOptions(withLangfusePrompt(prompt));

  const agent = new Agent({
    id: "story-teller-agent-langfuse",
    name: "Story Teller Agent (Langfuse)",
    instructions: prompt.prompt,
    model: deepseek("deepseek-chat"),
    // Voice removed - use OpenAI TTS via GraphQL
    memory: new Memory({
      storage: agentStorage,
    }),
  });

  // Store tracing options for use during generation
  (agent as any)._langfuseTracingOptions = tracingOptions;

  return agent;
}

// Therapeutic Agent Instructions
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

// Therapeutic Agent with OpenAI TTS (via GraphQL)
export const therapeuticAgent = new Agent({
  id: "therapeutic-agent",
  name: "Therapeutic Audio Agent",
  instructions: therapeuticInstructions,
  model: deepseek("deepseek-chat"),
});

/**
 * Create a therapeutic agent with Langfuse prompt management
 * This allows dynamic prompt updates through Langfuse without code changes
 * @param promptName - The name of the prompt in Langfuse (e.g., "therapeutic-agent")
 */
export async function createTherapeuticAgentWithLangfuse(
  promptName: string = "therapeutic-agent",
) {
  const prompt = await langfuse.getPrompt(promptName);
  const tracingOptions = buildTracingOptions(withLangfusePrompt(prompt));

  const agent = new Agent({
    id: "therapeutic-agent-langfuse",
    name: "Therapeutic Audio Agent (Langfuse)",
    instructions: prompt.prompt,
    model: deepseek("deepseek-chat"),
    // Voice removed - use OpenAI TTS via GraphQL
    memory: new Memory({
      storage: agentStorage,
    }),
  });

  // Store tracing options for use during generation
  (agent as any)._langfuseTracingOptions = tracingOptions;

  return agent;
}

// Export Langfuse instance for use in other parts of the application
export { langfuse };
