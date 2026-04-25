import type { MutationResolvers } from "./../../types.generated";
import { z } from "zod";
import { db } from "@/src/db";
import { startGraphRun } from "@/src/lib/langgraph-client";
import { generateObject } from "@/src/lib/deepseek";

const PLANNER_SYSTEM_PROMPT = [
  "You are a clinical research librarian. Given a therapist's note (journal/goal/issue with title, content, age, and any related-person context), output 3 PubMed-style search queries that capture SEMANTIC intent, not literal keywords.",
  "For metaphorical language (e.g., \"distraction\" meaning career regret), translate to clinical concepts (\"career decision regret\", \"counterfactual rumination\", \"midlife occupational transition\").",
  "Each query must be age-appropriate — prefix with the age bucket when provided (e.g., \"adults: career decision regret\").",
  "If the prompt contains a Subject Profile section, GROUND the queries in the concrete behaviors, teacher observations, and journal incidents listed there — not just the goal title. For parent-regulation goals, target one query at the parent skill, one at the child's clinical presentation (e.g. ODD/CD, emotion dysregulation, selective eating), and one at the dyadic intervention (e.g. Collaborative Problem Solving, Parent Management Training, Emotion Coaching).",
  "Queries should be complementary, not redundant.",
  "Output ONLY JSON: {\"queries\":[q1,q2,q3]}",
].join(" ");

const plannerSchema = z.object({
  queries: z.array(z.string().min(1).max(200)).length(3),
});

async function planQueries(userPrompt: string): Promise<string[] | null> {
  // generateObject does not accept an AbortSignal, so race a real timeout
  // promise to guarantee the resolver can't hang on a stalled DeepSeek call.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("planner timeout after 20000ms")), 20000);
  });
  try {
    const { object } = await Promise.race([
      generateObject({
        schema: plannerSchema,
        prompt: `${PLANNER_SYSTEM_PROMPT}\n\n${userPrompt}`,
        temperature: 0,
      }),
      timeout,
    ]);
    return object.queries.map((q) => q.trim().slice(0, 200));
  } catch (err) {
    console.warn("[generateResearch] planner failed, falling back:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
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

async function buildSubjectProfile(
  familyMemberId: number,
  userEmail: string,
): Promise<string> {
  const [fm, characteristics, issues, teacherFbs, observations, analyses, journalEntries] = await Promise.all([
    db.getFamilyMember(familyMemberId),
    db.getCharacteristicsForFamilyMember(familyMemberId, userEmail),
    db.getIssuesForFamilyMember(familyMemberId, undefined, userEmail),
    db.getTeacherFeedbacksForFamilyMember(familyMemberId, userEmail),
    db.getBehaviorObservationsForFamilyMember(familyMemberId, userEmail),
    db.getDeepIssueAnalysesForFamilyMember(familyMemberId, userEmail),
    db.listJournalEntries(userEmail, { familyMemberId }),
  ]);
  if (!fm) return "";

  const sections: string[] = [];
  sections.push(`## Subject Profile`);
  sections.push(`**${memberLabel(fm)}**${fm.bio ? ` — ${fm.bio.slice(0, 400)}` : ""}`);

  if (characteristics.length > 0) {
    const lines = characteristics
      .slice(0, 12)
      .map((c) => {
        const tag = c.category ? `[${c.category}${c.riskTier && c.riskTier !== "NONE" ? `/${c.riskTier}` : ""}]` : "";
        const desc = c.description ? `: ${c.description.slice(0, 200)}` : "";
        return `- ${tag} ${c.title ?? ""}${desc}`.trim();
      })
      .join("\n");
    sections.push(`### Priority Concerns & Support Needs (${characteristics.length})\n${lines}`);
  }

  if (issues.length > 0) {
    const lines = issues
      .slice(0, 20)
      .map((i) => `- [${(i.severity || "").toUpperCase()}] ${i.title} (${i.category})${i.description ? `: ${i.description.slice(0, 180)}` : ""}`)
      .join("\n");
    sections.push(`### Known Issues (${issues.length})\n${lines}`);
  }

  if (teacherFbs.length > 0) {
    const lines = teacherFbs
      .slice(0, 5)
      .map((t) => `- ${t.feedbackDate} — ${t.teacherName}${t.subject ? ` (${t.subject})` : ""}: ${(t.content || "").slice(0, 250)}`)
      .join("\n");
    sections.push(`### Teacher Observations (${teacherFbs.length})\n${lines}`);
  }

  if (observations.length > 0) {
    const lines = observations
      .slice(0, 5)
      .map((o) => {
        const bits = [o.observationType, o.intensity && `intensity:${o.intensity}`, o.frequency != null && `freq:${o.frequency}`].filter(Boolean);
        return `- ${o.observedAt} [${bits.join(", ")}]${o.context ? ` ctx: ${o.context.slice(0, 120)}` : ""}${o.notes ? ` — ${o.notes.slice(0, 160)}` : ""}`;
      })
      .join("\n");
    sections.push(`### Behavior Observations (${observations.length})\n${lines}`);
  }

  if (journalEntries.length > 0) {
    const lines = journalEntries
      .slice(0, 10)
      .map((j) => `- ${j.entryDate}${j.title ? ` — ${j.title}` : ""}${j.mood ? ` [${j.mood}]` : ""}${j.content ? `: ${j.content.slice(0, 200)}` : ""}`)
      .join("\n");
    sections.push(`### Recent Journal Entries (last ${Math.min(journalEntries.length, 10)} of ${journalEntries.length})\n${lines}`);
  }

  if (analyses.length > 0) {
    const pieces = analyses.slice(0, 3).map((a, idx) => {
      const advice = Array.isArray(a.parentAdvice) ? (a.parentAdvice as Array<{ title?: string; advice?: string }>) : [];
      const adviceLines = advice
        .slice(0, 3)
        .map((p) => `    • ${p.title ?? ""}${p.advice ? `: ${String(p.advice).slice(0, 180)}` : ""}`.trim())
        .join("\n");
      return `- [Analysis ${idx + 1}] ${(a.summary || "").slice(0, 350)}${adviceLines ? `\n${adviceLines}` : ""}`;
    });
    sections.push(`### Prior Clinical Analyses (${analyses.length})\n${pieces.join("\n")}`);
  }

  return sections.join("\n\n");
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
    let subjectProfile = "";
    let memberContext = "";
    if (goal.familyMemberId) {
      try {
        const fm = await db.getFamilyMember(goal.familyMemberId);
        if (fm) {
          memberContext = `Patient: ${memberLabel(fm)}`;
        }
        subjectProfile = await buildSubjectProfile(goal.familyMemberId, userEmail);
      } catch (err) {
        console.warn("[generateResearch] subject profile failed:", err instanceof Error ? err.message : err);
      }
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
      subjectProfile,
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
      `When the goal targets parent self-regulation or co-regulation, also search for research on the child's observed presentation (see Subject Profile) so recommendations address BOTH sides of the dyad — the parent's skill + the child's clinical pattern (e.g. defiance, ODD-spectrum, emotion dysregulation, selective eating, peer-conflict).`,
      `Only save papers with real abstracts (not "None", "...", or empty). Skip papers lacking abstracts.`,
      ``,
      `IMPORTANT: When calling save_research_papers, use goal_id: ${goalId} — do NOT use issue_id or feedback_id.`,
    ].join("\n");
  } else {
    throw new Error("Either goalId, issueId, feedbackId, or journalEntryId is required");
  }

  const hasRelatedMember = relatedFamilyMember !== null;

  const plannedQueries = await planQueries(prompt);

  try {
    const { threadId, runId } = await startGraphRun(
      "research",
      {
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
      },
      userEmail,
    );
    await db.setGenerationJobLangGraphIds(jobId, threadId, runId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "LangGraph dispatch failed";
    console.error("[generateResearch] dispatch error:", message);
    await db.updateGenerationJob(jobId, {
      status: "FAILED",
      error: JSON.stringify({ message, code: "DISPATCH_FAILED" }),
    });
  }

  return {
    success: true,
    message: "Research generation started",
    jobId,
  };
};
