import type { MutationResolvers } from "./../../types.generated";
import { d1Tools, insertTherapeuticQuestions } from "@/src/db";
import { listTherapyResearch } from "@/src/db";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";

export const generateTherapeuticQuestions: NonNullable<MutationResolvers['generateTherapeuticQuestions']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId ?? undefined;
  const issueId = args.issueId ?? undefined;

  if (!goalId && !issueId) {
    throw new Error("Either goalId or issueId is required");
  }

  // Build context from issue or goal
  let contextText: string;
  if (issueId) {
    const issue = await d1Tools.getIssue(issueId, userEmail);
    if (!issue) throw new Error("Issue not found");
    contextText = [
      `Issue: ${issue.title}`,
      `Category: ${issue.category}`,
      `Severity: ${issue.severity}`,
      issue.description ? `Description: ${issue.description}` : "",
      issue.recommendations ? `Recommendations: ${issue.recommendations}` : "",
    ].filter(Boolean).join("\n");
  } else {
    const goal = await d1Tools.getGoal(goalId!, userEmail);
    contextText = [
      `Goal: ${goal.title}`,
      goal.description ? `Description: ${goal.description}` : "",
    ].filter(Boolean).join("\n");
  }

  // Fetch existing research
  const research = await listTherapyResearch(goalId, issueId);
  if (!research.length) {
    return {
      success: false,
      message: "No research found. Generate research first before creating questions.",
      questions: [],
    };
  }

  // Build research summary for the prompt
  const researchSummary = research
    .slice(0, 10)
    .map((r, i) => {
      const kf = r.keyFindings.slice(0, 3).join("; ");
      const tt = r.therapeuticTechniques.slice(0, 3).join("; ");
      return [
        `[${i + 1}] "${r.title}" (id: ${r.id})`,
        r.abstract ? `  Abstract: ${r.abstract.slice(0, 200)}` : "",
        kf ? `  Key findings: ${kf}` : "",
        tt ? `  Techniques: ${tt}` : "",
        r.evidenceLevel ? `  Evidence: ${r.evidenceLevel}` : "",
      ].filter(Boolean).join("\n");
    })
    .join("\n\n");

  const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });

  const questionSchema = z.object({
    questions: z.array(z.object({
      question: z.string().describe("A specific, actionable therapeutic question"),
      researchId: z.number().optional().describe("ID of the most relevant research paper"),
      researchTitle: z.string().optional().describe("Title of the most relevant research paper"),
      rationale: z.string().describe("Why this question matters and how the research supports it"),
    })).min(3).max(8),
  });

  const prompt = [
    `You are a clinical research analyst. Based on the following therapeutic context and research papers, generate questions that would help explore this issue further.`,
    ``,
    `## Context`,
    contextText,
    ``,
    `## Research Papers`,
    researchSummary,
    ``,
    `## Instructions`,
    `Generate 4-6 questions that:`,
    `- Dig deeper into unexplored aspects of the issue`,
    `- Bridge gaps between the research findings and the specific context`,
    `- Suggest new therapeutic directions informed by the evidence`,
    `- Help assess which interventions may be most effective`,
    `- Consider practical implementation and family dynamics`,
    ``,
    `Each question should reference specific research where relevant (use the paper ID and title).`,
    `Provide a rationale explaining why the question matters.`,
  ].join("\n");

  const { object } = await generateObject({
    model: deepseek("deepseek-chat"),
    schema: questionSchema,
    prompt,
  });

  // Persist to DB
  const saved = await insertTherapeuticQuestions(
    object.questions.map((q) => ({
      goalId,
      issueId,
      question: q.question,
      researchId: q.researchId,
      researchTitle: q.researchTitle,
      rationale: q.rationale,
    })),
  );

  return {
    success: true,
    message: `Generated ${saved.length} questions from ${research.length} research papers.`,
    questions: saved,
  };
};
