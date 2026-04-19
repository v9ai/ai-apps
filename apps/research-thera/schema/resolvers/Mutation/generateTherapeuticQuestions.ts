import type { MutationResolvers } from "./../../types.generated";
import { db, insertTherapeuticQuestions } from "@/src/db";
import {
  listTherapyResearch,
  getFamilyMember,
  getIssuesForFamilyMember,
  getBehaviorObservationsForFamilyMember,
  getTeacherFeedbacksForFamilyMember,
  getContactFeedbacksForFamilyMember,
  getDeepIssueAnalysesForFamilyMember,
} from "@/src/db";
import { sql as neonSql } from "@/src/db/neon";
import { generateObject } from "@/src/lib/deepseek";
import { isSexTherapyGoal, withRo } from "@/src/lib/ro";
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

  // Build context from journal entry, issue, or goal — and resolve familyMemberId
  let contextText: string;
  let familyMemberId: number | null = null;
  if (journalEntryId) {
    const entry = await db.getJournalEntry(journalEntryId, userEmail);
    if (!entry) throw new Error("Journal entry not found");
    familyMemberId = entry.familyMemberId;
    contextText = [
      entry.title ? `Journal Entry: ${entry.title}` : "Journal Entry",
      `Content: ${entry.content}`,
      entry.mood ? `Mood: ${entry.mood}${entry.moodScore ? ` (${entry.moodScore}/10)` : ""}` : "",
      entry.tags?.length ? `Tags: ${entry.tags.join(", ")}` : "",
    ].filter(Boolean).join("\n");
  } else if (issueId) {
    const issue = await db.getIssue(issueId, userEmail);
    if (!issue) throw new Error("Issue not found");
    familyMemberId = issue.familyMemberId;
    contextText = [
      `Issue: ${issue.title}`,
      `Category: ${issue.category}`,
      `Severity: ${issue.severity}`,
      issue.description ? `Description: ${issue.description}` : "",
      issue.recommendations ? `Recommendations: ${issue.recommendations}` : "",
    ].filter(Boolean).join("\n");
  } else {
    const goal = await db.getGoal(goalId!, userEmail);
    familyMemberId = goal.familyMemberId;
    contextText = [
      `Goal: ${goal.title}`,
      goal.description ? `Description: ${goal.description}` : "",
    ].filter(Boolean).join("\n");
  }

  // Build holistic family member context if available
  let familyContextText = "";
  if (familyMemberId) {
    const [member, allIssues, observations, teacherFeedbacks, contactFeedbacks, deepAnalyses, characteristics] = await Promise.all([
      getFamilyMember(familyMemberId),
      getIssuesForFamilyMember(familyMemberId, undefined, userEmail),
      getBehaviorObservationsForFamilyMember(familyMemberId, userEmail),
      getTeacherFeedbacksForFamilyMember(familyMemberId, userEmail),
      getContactFeedbacksForFamilyMember(familyMemberId, userEmail),
      getDeepIssueAnalysesForFamilyMember(familyMemberId, userEmail),
      neonSql`SELECT category, title, description, severity, impairment_domains FROM family_member_characteristics WHERE family_member_id = ${familyMemberId} AND user_id = ${userEmail} ORDER BY created_at DESC`,
    ]);

    const sections: string[] = [];

    if (member) {
      const parts = [`**${member.firstName}${member.name ? ` ${member.name}` : ""}**`];
      if (member.ageYears) parts.push(`Age: ${member.ageYears}`);
      if (member.relationship) parts.push(`Relationship: ${member.relationship}`);
      if (member.dateOfBirth) parts.push(`DOB: ${member.dateOfBirth}`);
      if (member.bio) parts.push(`Bio: ${member.bio}`);
      sections.push(`### Person Profile\n${parts.join(" | ")}`);
    }

    if (characteristics.length > 0) {
      const charLines = characteristics.map((c: Record<string, unknown>) => {
        const parts = [`- **${c.title}** (${c.category}${c.severity ? `, ${c.severity}` : ""})` ];
        if (c.description) parts.push(`  ${c.description}`);
        if (c.impairment_domains) {
          try { parts.push(`  Domains: ${JSON.parse(c.impairment_domains as string).join(", ")}`); } catch {}
        }
        return parts.join("\n");
      });
      sections.push(`### Characteristics & Support Needs (${characteristics.length})\n${charLines.join("\n")}`);
    }

    if (allIssues.length > 0) {
      const issueLines = allIssues.slice(0, 15).map((i: { title: string; severity: string; category: string; description: string }) =>
        `- **${i.title}** [${i.severity}/${i.category}]: ${i.description.slice(0, 150)}`
      );
      sections.push(`### All Known Issues (${allIssues.length})\n${issueLines.join("\n")}`);
    }

    if (observations.length > 0) {
      const obsLines = observations.slice(0, 10).map((o: { observedAt: string; observationType: string; intensity: string | null; notes: string | null }) =>
        `- ${o.observedAt}: ${o.observationType}${o.intensity ? ` (${o.intensity})` : ""}${o.notes ? ` — ${o.notes.slice(0, 100)}` : ""}`
      );
      sections.push(`### Recent Behavior Observations (${observations.length})\n${obsLines.join("\n")}`);
    }

    if (teacherFeedbacks.length > 0) {
      const tfLines = teacherFeedbacks.slice(0, 5).map((tf: { feedbackDate: string; teacherName: string; subject: string | null; content: string }) =>
        `- ${tf.feedbackDate} (${tf.teacherName}${tf.subject ? `, ${tf.subject}` : ""}): ${tf.content.slice(0, 150)}`
      );
      sections.push(`### Teacher Feedbacks (${teacherFeedbacks.length})\n${tfLines.join("\n")}`);
    }

    if (contactFeedbacks.length > 0) {
      const cfLines = contactFeedbacks.slice(0, 5).map((cf: { feedbackDate: string; subject: string | null; content: string }) =>
        `- ${cf.feedbackDate}${cf.subject ? ` (${cf.subject})` : ""}: ${cf.content.slice(0, 150)}`
      );
      sections.push(`### Contact Feedbacks (${contactFeedbacks.length})\n${cfLines.join("\n")}`);
    }

    if (deepAnalyses.length > 0) {
      const daLines = deepAnalyses.slice(0, 3).map((da: { summary: string }) =>
        `- ${da.summary.slice(0, 200)}`
      );
      sections.push(`### Deep Issue Analyses (${deepAnalyses.length})\n${daLines.join("\n")}`);
    }

    if (sections.length > 0) {
      familyContextText = `\n## Full Profile Context\n${sections.join("\n\n")}`;
    }
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
    `You are a clinical research analyst. Based on the following therapeutic context, the person's full profile, and research papers, generate questions that would help explore this issue further.`,
    ``,
    `## Current Context`,
    contextText,
    familyContextText,
    ``,
    `## Research Papers`,
    researchSummary,
    ``,
    `## Instructions`,
    `Generate 4-6 questions that:`,
    `- Dig deeper into unexplored aspects of the issue, informed by the person's full profile and history`,
    `- Connect patterns across the person's known issues, observations, and feedback`,
    `- Bridge gaps between the research findings and the specific context`,
    `- Suggest new therapeutic directions informed by the evidence and the person's characteristics`,
    `- Help assess which interventions may be most effective given the full picture`,
    `- Consider practical implementation and family dynamics`,
    ``,
    `Each question should reference specific research where relevant (use the paper ID and title).`,
    `Provide a rationale explaining why the question matters and how the person's profile informs it.`,
  ].join("\n");

  const isRo = await isSexTherapyGoal({ goalId, issueId, journalEntryId });

  const { object } = await generateObject({
    schema: questionSchema,
    prompt: withRo(prompt, isRo),
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
