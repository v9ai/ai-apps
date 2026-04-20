import type { MutationResolvers } from "./../../types.generated";
import { z } from "zod";
import { db } from "@/src/db";
import { runGraphAndWait } from "@/src/lib/langgraph-client";
import { generateObject } from "@/src/lib/deepseek";

const PLANNER_SYSTEM_PROMPT = [
  "You are a clinical research librarian. Given a therapist's note (journal/goal/issue with title, content, age, and any related-person context), output 3 PubMed-style search queries that capture SEMANTIC intent, not literal keywords.",
  "For metaphorical language (e.g., \"distraction\" meaning career regret), translate to clinical concepts (\"career decision regret\", \"counterfactual rumination\", \"midlife occupational transition\").",
  "Each query must be age-appropriate — prefix with the age bucket when provided (e.g., \"adults: career decision regret\").",
  "Queries should be complementary, not redundant.",
  "Output ONLY JSON: {\"queries\":[q1,q2,q3]}",
].join(" ");

const plannerSchema = z.object({
  queries: z.array(z.string().min(1).max(200)).length(3),
});

async function planQueries(userPrompt: string): Promise<string[] | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const { object } = await generateObject({
        schema: plannerSchema,
        prompt: `${PLANNER_SYSTEM_PROMPT}\n\n${userPrompt}`,
        temperature: 0,
      });
      return object.queries.map((q) => q.trim().slice(0, 200));
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    console.warn("[generateResearch] planner failed, falling back:", err instanceof Error ? err.message : err);
    return null;
  }
}

function resolveAge(member: { ageYears?: number | null; dateOfBirth?: string | null }): number | null {
  if (member.ageYears) return member.ageYears;
  if (!member.dateOfBirth) return null;
  const birth = new Date(member.dateOfBirth);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function memberLabel(member: { firstName: string; name?: string | null; ageYears?: number | null; dateOfBirth?: string | null; relationship?: string | null }): string {
  const age = resolveAge(member);
  return `${member.firstName}${member.name ? ` ${member.name}` : ""}${age ? `, age ${age}` : ""}${member.relationship ? ` (${member.relationship})` : ""}`;
}

function buildSiblingIssuesSection(
  allIssues: Array<{ id: number; title: string; category: string; severity: string; description: string }>,
  primaryIssueId?: number,
): string {
  const siblings = primaryIssueId
    ? allIssues.filter((i) => i.id !== primaryIssueId)
    : allIssues;
  if (siblings.length === 0) return "";

  const lines = siblings
    .map((i) =>
      `- [${i.severity.toUpperCase()}] ${i.title} (${i.category})${i.description ? `: ${i.description.slice(0, 150)}` : ""}`,
    )
    .join("\n");

  return [
    ``,
    `## Other Known Issues for This Family Member (${siblings.length})`,
    lines,
    ``,
    `Consider this broader clinical picture when selecting research papers.`,
    `Focus on the primary topic above, but prefer papers that address comorbidities or interaction effects when relevant.`,
  ].join("\n");
}

export const generateResearch: NonNullable<MutationResolvers['generateResearch']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId ?? undefined;
  const issueId = args.issueId ?? undefined;
  const feedbackId = args.feedbackId ?? undefined;
  const journalEntryId = args.journalEntryId ?? undefined;

  if (goalId) {
    await db.getGoal(goalId, userEmail);
  }

  await db.cleanupStaleJobs(15);

  const jobId = crypto.randomUUID();
  await db.createGenerationJob(jobId, userEmail, "RESEARCH", goalId);

  let prompt: string;
  let evalPromptContext: string;
  let relatedFamilyMember: Awaited<ReturnType<typeof db.getFamilyMember>> | null = null;
  if (feedbackId) {
    const feedback = await db.getContactFeedback(feedbackId, userEmail);
    if (!feedback) throw new Error("Feedback not found");
    let feedbackSiblingSection = "";
    if (feedback.familyMemberId) {
      const allIssues = await db.getIssuesForFamilyMember(feedback.familyMemberId, undefined, userEmail);
      feedbackSiblingSection = buildSiblingIssuesSection(allIssues);
    }
    const contextLines = [
      `feedback_id: ${feedbackId}`,
      `Subject: ${feedback.subject}`,
      `Content: ${feedback.content}`,
      feedback.tags ? `Tags: ${feedback.tags}` : "",
      feedbackSiblingSection,
    ].filter(Boolean);
    evalPromptContext = contextLines.join("\n");
    prompt = [
      `Find evidence-based therapeutic research for the following clinical feedback:`,
      ``,
      ...contextLines,
      ``,
      `Search for academic papers that address the issues described.`,
      `Focus on evidence-based interventions, therapeutic techniques, and outcome measures.`,
      ``,
      `IMPORTANT: When calling save_research_papers, use feedback_id: ${feedbackId} — do NOT use issue_id.`,
    ].join("\n");
  } else if (issueId) {
    const issue = await db.getIssue(issueId, userEmail);
    if (!issue) throw new Error("Issue not found");

    const primaryMember = await db.getFamilyMember(issue.familyMemberId);
    relatedFamilyMember = issue.relatedFamilyMemberId
      ? await db.getFamilyMember(issue.relatedFamilyMemberId)
      : null;
    const relatedMember = relatedFamilyMember;

    const allIssues = await db.getIssuesForFamilyMember(issue.familyMemberId, undefined, userEmail);
    const issueSiblingSection = buildSiblingIssuesSection(allIssues, issueId);

    const contextLines = [
      `issue_id: ${issueId}`,
      `Title: ${issue.title}`,
      `Category: ${issue.category}`,
      `Severity: ${issue.severity}`,
      issue.description ? `Description: ${issue.description}` : "",
      issue.recommendations ? `Recommendations: ${issue.recommendations}` : "",
      primaryMember ? `Primary person: ${memberLabel(primaryMember)}` : "",
      relatedMember ? `Also involves: ${memberLabel(relatedMember)}` : "",
      issueSiblingSection,
    ].filter(Boolean);
    evalPromptContext = contextLines.join("\n");
    prompt = [
      `Find evidence-based therapeutic research for the following clinical issue:`,
      ``,
      ...contextLines,
      ``,
      `Search for academic papers that address this issue, considering the relational and family dynamics involved.`,
      `Focus on evidence-based interventions, therapeutic techniques, and outcome measures.`,
      ``,
      `IMPORTANT: When calling save_research_papers, use issue_id: ${issueId} — do NOT use feedback_id.`,
    ].join("\n");
  } else if (journalEntryId) {
    const entry = await db.getJournalEntry(journalEntryId, userEmail);
    if (!entry) throw new Error("Journal entry not found");

    let memberContext = "";
    let journalSiblingSection = "";
    if (entry.familyMemberId) {
      const allIssues = await db.getIssuesForFamilyMember(entry.familyMemberId, undefined, userEmail);
      journalSiblingSection = buildSiblingIssuesSection(allIssues);
      try {
        const fm = await db.getFamilyMember(entry.familyMemberId);
        if (fm) {
          memberContext = `Person: ${memberLabel(fm)}`;
        }
      } catch { /* non-fatal */ }
    } else {
      // Journal entry isn't linked to a specific family member — fall back to the
      // user's own "self" profile so age-appropriate research still gets returned.
      try {
        const self = await db.getSelfFamilyMember(userEmail);
        if (self) {
          memberContext = `Person: ${memberLabel(self)}`;
        }
      } catch { /* non-fatal */ }
    }
    const contextLines = [
      `journal_entry_id: ${journalEntryId}`,
      entry.title ? `Title: ${entry.title}` : "",
      `Content: ${entry.content}`,
      entry.mood ? `Mood: ${entry.mood}${entry.moodScore ? ` (${entry.moodScore}/10)` : ""}` : "",
      entry.tags?.length ? `Tags: ${entry.tags.join(", ")}` : "",
      memberContext,
      journalSiblingSection,
    ].filter(Boolean);
    evalPromptContext = contextLines.join("\n");
    prompt = [
      `Find evidence-based therapeutic research for the following journal entry:`,
      ``,
      ...contextLines,
      ``,
      `IMPORTANT: If the journal content is NOT in English, first translate it to English before searching.`,
      `Use the TRANSLATED English terms as your search queries.`,
      ``,
      `Search for academic papers that address the themes and concerns described in this journal entry.`,
      `Focus on evidence-based interventions, therapeutic techniques, and outcome measures.`,
      `Only save papers with real abstracts (not "None", "...", or empty). Skip papers lacking abstracts.`,
      ``,
      `IMPORTANT: When calling save_research_papers, use journal_entry_id: ${journalEntryId} — do NOT use goal_id, issue_id, or feedback_id.`,
    ].join("\n");
  } else if (goalId) {
    const goal = await db.getGoal(goalId, userEmail);
    let goalSiblingSection = "";
    let memberContext = "";
    if (goal.familyMemberId) {
      const allIssues = await db.getIssuesForFamilyMember(goal.familyMemberId, undefined, userEmail);
      goalSiblingSection = buildSiblingIssuesSection(allIssues);
      try {
        const fm = await db.getFamilyMember(goal.familyMemberId);
        if (fm) {
          memberContext = `Patient: ${memberLabel(fm)}`;
        }
      } catch { /* non-fatal */ }
    } else {
      try {
        const self = await db.getSelfFamilyMember(userEmail);
        if (self) {
          memberContext = `Patient: ${memberLabel(self)}`;
        }
      } catch { /* non-fatal */ }
    }
    const contextLines = [
      `goal_id: ${goalId}`,
      `Title: ${goal.title}`,
      goal.description ? `Description: ${goal.description}` : "",
      memberContext,
      goalSiblingSection,
    ].filter(Boolean);
    evalPromptContext = contextLines.join("\n");
    prompt = [
      `Find evidence-based therapeutic research for the following goal:`,
      ``,
      ...contextLines,
      ``,
      `IMPORTANT: If the goal title is NOT in English, first translate it to English before searching.`,
      `For example, "Creste rezistenta la frustrare" (Romanian) = "Increase frustration tolerance".`,
      `Use the TRANSLATED English terms as your search queries.`,
      ``,
      `Search for academic papers that support this therapeutic goal.`,
      `Focus on evidence-based interventions, therapeutic techniques, and outcome measures.`,
      `Only save papers with real abstracts (not "None", "...", or empty). Skip papers lacking abstracts.`,
      ``,
      `IMPORTANT: When calling save_research_papers, use goal_id: ${goalId} — do NOT use issue_id or feedback_id.`,
    ].join("\n");
  } else {
    throw new Error("Either goalId, issueId, feedbackId, or journalEntryId is required");
  }

  const hasRelatedMember = relatedFamilyMember !== null;

  const plannedQueries = await planQueries(prompt);

  // Fire-and-forget: CF Worker accepts request via ctx.waitUntil and updates the job row itself when done.
  runGraphAndWait("research", {
    input: {
      messages: [{ role: "user", content: prompt }],
      jobId,
      userEmail,
      goalId: goalId ?? null,
      issueId: issueId ?? null,
      feedbackId: feedbackId ?? null,
      journalEntryId: journalEntryId ?? null,
      hasRelatedMember,
      evalPromptContext,
      plannedQueries: plannedQueries ?? undefined,
    },
  }).catch(async (err) => {
    const message = err instanceof Error ? err.message : "LangGraph dispatch failed";
    console.error("[generateResearch] dispatch error:", message);
    await db.updateGenerationJob(jobId, {
      status: "FAILED",
      error: JSON.stringify({ message, code: "DISPATCH_FAILED" }),
    });
  });

  return {
    success: true,
    message: "Research generation started",
    jobId,
  };
};
