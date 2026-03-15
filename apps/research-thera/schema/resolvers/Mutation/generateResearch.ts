import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";
import { Client } from "@langchain/langgraph-sdk";

const LANGGRAPH_URL = process.env.LANGGRAPH_URL || "http://127.0.0.1:2024";

export const generateResearch: NonNullable<MutationResolvers['generateResearch']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId ?? undefined;
  const feedbackId = args.feedbackId ?? undefined;

  // Verify the goal exists and belongs to the user (only when goalId is provided)
  if (goalId) {
    await d1Tools.getGoal(goalId, userEmail);
  }

  // Clean up any stale RUNNING jobs (stuck > 15 min) before creating a new one
  await d1Tools.cleanupStaleJobs(15);

  // Create a tracking job (inserted with status='RUNNING')
  const jobId = crypto.randomUUID();
  await d1Tools.createGenerationJob(jobId, userEmail, "RESEARCH", goalId);

  // Build prompt from goal or feedback context
  let prompt: string;
  if (feedbackId) {
    const feedback = await d1Tools.getContactFeedback(feedbackId, userEmail);
    if (!feedback) throw new Error("Feedback not found");
    prompt = [
      `Find evidence-based therapeutic research for the following clinical feedback:`,
      ``,
      `Subject: ${feedback.subject}`,
      `Content: ${feedback.content}`,
      feedback.tags ? `Tags: ${feedback.tags}` : "",
      ``,
      `Search for academic papers that address the issues described.`,
      `Focus on evidence-based interventions, therapeutic techniques, and outcome measures.`,
    ].filter(Boolean).join("\n");
  } else if (goalId) {
    const goal = await d1Tools.getGoal(goalId, userEmail);
    prompt = [
      `Find evidence-based therapeutic research for the following goal:`,
      ``,
      `Title: ${goal.title}`,
      goal.description ? `Description: ${goal.description}` : "",
      ``,
      `Search for academic papers that support this therapeutic goal.`,
      `Focus on evidence-based interventions, therapeutic techniques, and outcome measures.`,
    ].filter(Boolean).join("\n");
  } else {
    throw new Error("Either goalId or feedbackId is required");
  }

  // Fire-and-forget: run LangGraph agent in background, update job on completion
  const client = new Client({ apiUrl: LANGGRAPH_URL });

  client.runs.wait(null, "research", {
    input: {
      messages: [{ role: "user", content: prompt }],
    },
  }).then(async (result) => {
    const messages = (result as Record<string, unknown>)?.messages as
      | Array<{ content: string; type?: string }>
      | undefined;
    const lastAiMessage = messages
      ?.filter((m) => m.type === "ai" && m.content)
      .pop();

    await d1Tools.updateGenerationJob(jobId, {
      status: "SUCCEEDED",
      progress: 100,
      result: JSON.stringify({
        count: messages?.filter((m) => m.type === "ai").length ?? 0,
        output: lastAiMessage?.content || "No research results returned.",
      }),
    });
  }).catch(async (err) => {
    const message = err instanceof Error ? err.message : "LangGraph agent failed";
    console.error("[generateResearch] LangGraph error:", message);
    await d1Tools.updateGenerationJob(jobId, {
      status: "FAILED",
      error: JSON.stringify({ message }),
    });
  });

  return {
    success: true,
    message: "Research generation started via LangGraph",
    jobId,
  };
};
