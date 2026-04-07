import type { MutationResolvers } from "./../../types.generated";
import { db, insertTherapeuticQuestions } from "@/src/db";
import { listTherapyResearch } from "@/src/db";
import { generateObject } from "@/src/lib/deepseek";
import { z } from "zod";

export const generateTherapeuticQuestions: NonNullable<MutationResolvers['generateTherapeuticQuestions']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId ?? undefined;
  const issueId = args.issueId ?? undefined;
  const journalEntryId = args.journalEntryId ?? undefined;

  if (!goalId && !issueId && !journalEntryId) {
    throw new Error("Either goalId, issueId, or journalEntryId is required");
  }

  // Build context from journal entry, issue, or goal
  let contextText: string;
  if (journalEntryId) {
    const entry = await db.getJournalEntry(journalEntryId, userEmail);
    if (!entry) throw new Error("Journal entry not found");
    contextText = [
      entry.title ? `Journal Entry: ${entry.title}` : "Journal Entry",
      `Content: ${entry.content}`,
      entry.mood ? `Mood: ${entry.mood}${entry.moodScore ? ` (${entry.moodScore}/10)` : ""}` : "",
      entry.tags?.length ? `Tags: ${entry.tags.join(", ")}` : "",
    ].filter(Boolean).join("\n");
  } else if (issueId) {
    const issue = await db.getIssue(issueId, userEmail);
    if (!issue) throw new Error("Issue not found");
    contextText = [
      `Issue: ${issue.title}`,
      `Category: ${issue.category}`,
      `Severity: ${issue.severity}`,
      issue.description ? `Description: ${issue.description}` : "",
      issue.recommendations ? `Recommendations: ${issue.recommendations}` : "",
    ].filter(Boolean).join("\n");
  } else {
    const goal = await db.getGoal(goalId!, userEmail);
    contextText = [
      `Goal: ${goal.title}`,
      goal.description ? `Description: ${goal.description}` : "",
    ].filter(Boolean).join("\n");
  }

  // Fetch existing research
  const research = await listTherapyResearch(goalId, issueId, undefined, journalEntryId);
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

    schema: questionSchema,
    prompt,
  });

  // Persist to DB
  const saved = await insertTherapeuticQuestions(
    object.questions.map((q) => ({
      goalId,
      issueId,
      journalEntryId,
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
