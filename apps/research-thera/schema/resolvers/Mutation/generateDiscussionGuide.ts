import type { MutationResolvers } from "./../../types.generated";
import {
  db,
  listTherapyResearch,
  getFamilyMember,
  getIssuesForFamilyMember,
  getBehaviorObservationsForFamilyMember,
  getTeacherFeedbacksForFamilyMember,
  getContactFeedbacksForFamilyMember,
  getDeepIssueAnalysesForFamilyMember,
  getResearchForFamilyMemberIssues,
} from "@/src/db";
import { sql as neonSql } from "@/src/db/neon";
import { generateObject } from "@/src/lib/deepseek";
import { isRoGoal, withRo } from "@/src/lib/ro";
import { z } from "zod";

const discussionGuideSchema = z.object({
  behaviorSummary: z.string(),
  developmentalContext: z.object({
    stage: z.string(),
    explanation: z.string(),
    normalizedBehavior: z.string(),
    researchBasis: z.string().nullish(),
  }),
  conversationStarters: z.array(z.object({
    opener: z.string(),
    context: z.string(),
    ageAppropriateNote: z.string().nullish(),
  })),
  talkingPoints: z.array(z.object({
    point: z.string(),
    explanation: z.string(),
    researchBacking: z.string().nullish(),
    relatedResearchIds: z.array(z.number()).nullish(),
  })),
  languageGuide: z.object({
    whatToSay: z.array(z.object({
      phrase: z.string(),
      reason: z.string(),
      alternative: z.string().nullish(),
    })),
    whatNotToSay: z.array(z.object({
      phrase: z.string(),
      reason: z.string(),
      alternative: z.string().nullish(),
    })),
  }),
  anticipatedReactions: z.array(z.object({
    reaction: z.string(),
    likelihood: z.string(),
    howToRespond: z.string(),
  })),
  followUpPlan: z.array(z.object({
    action: z.string(),
    timing: z.string(),
    description: z.string(),
  })),
});

export const generateDiscussionGuide: NonNullable<MutationResolvers['generateDiscussionGuide']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { journalEntryId } = args;
  const entry = await db.getJournalEntry(journalEntryId, userEmail);
  if (!entry) throw new Error("Journal entry not found");

  // ── Build primary journal entry context ─────────────────────────
  const entryContext = [
    entry.title ? `Title: ${entry.title}` : null,
    `Date: ${entry.entryDate}`,
    `Content: ${entry.content}`,
    entry.mood ? `Mood: ${entry.mood}${entry.moodScore ? ` (${entry.moodScore}/10)` : ""}` : null,
    entry.tags?.length ? `Tags: ${entry.tags.join(", ")}` : null,
  ].filter(Boolean).join("\n");

  // ── Family member context ──────────────────────────────────────
  let childAge: number | null = null;
  const sections: string[] = [];

  if (entry.familyMemberId) {
    const [
      member,
      issues,
      observations,
      teacherFeedbacks,
      contactFeedbacks,
      deepAnalyses,
      characteristics,
    ] = await Promise.all([
      getFamilyMember(entry.familyMemberId),
      getIssuesForFamilyMember(entry.familyMemberId, undefined, userEmail),
      getBehaviorObservationsForFamilyMember(entry.familyMemberId, userEmail),
      getTeacherFeedbacksForFamilyMember(entry.familyMemberId, userEmail),
      getContactFeedbacksForFamilyMember(entry.familyMemberId, userEmail),
      getDeepIssueAnalysesForFamilyMember(entry.familyMemberId, userEmail),
      neonSql`SELECT category, title, description, severity, impairment_domains FROM family_member_characteristics WHERE family_member_id = ${entry.familyMemberId} AND user_id = ${userEmail} ORDER BY created_at DESC`,
    ]);

    if (member) {
      childAge = member.ageYears ?? null;
      const parts = [`**${member.firstName}${member.name ? ` ${member.name}` : ""}**`];
      if (member.ageYears) parts.push(`Age: ${member.ageYears}`);
      if (member.relationship) parts.push(`Relationship: ${member.relationship}`);
      if (member.dateOfBirth) parts.push(`DOB: ${member.dateOfBirth}`);
      sections.push(`### Child Profile\n${parts.join(" | ")}`);
    }

    if (characteristics.length > 0) {
      const charLines = characteristics.map((c: Record<string, unknown>) => {
        const parts = [`- **${c.title}** (${c.category}${c.severity ? `, ${c.severity}` : ""})`];
        if (c.description) parts.push(`  ${c.description}`);
        return parts.join("\n");
      });
      sections.push(`### Characteristics & Support Needs (${characteristics.length})\n${charLines.join("\n")}`);
    }

    if (issues.length > 0) {
      const issueLines = issues.slice(0, 10).map((i: { id: number; title: string; severity: string; category: string; description: string }) =>
        `- [ID:${i.id}] **${i.title}** [${i.severity}/${i.category}]: ${i.description.slice(0, 150)}`
      );
      sections.push(`### Known Issues (${issues.length})\n${issueLines.join("\n")}`);

      const issueIds = issues.map((i: { id: number }) => i.id);
      const issueResearch = await getResearchForFamilyMemberIssues(issueIds);
      if (issueResearch.length > 0) {
        const rLines = issueResearch.slice(0, 8).map((r: { id: number; title: string; keyFindings: string[]; therapeuticTechniques: string[]; evidenceLevel: string | null }) => {
          let line = `- [ResearchID:${r.id}] "${r.title}"`;
          if (r.evidenceLevel) line += ` (${r.evidenceLevel})`;
          if (r.keyFindings?.length) line += `\n  Key findings: ${r.keyFindings.slice(0, 3).join("; ")}`;
          if (r.therapeuticTechniques?.length) line += `\n  Techniques: ${r.therapeuticTechniques.slice(0, 3).join("; ")}`;
          return line;
        });
        sections.push(`### Research for Issues (${issueResearch.length})\n${rLines.join("\n")}`);
      }
    }

    if (observations.length > 0) {
      const obsLines = observations.slice(0, 8).map((o: { observedAt: string; observationType: string; frequency?: number | null; intensity: string | null; context?: string | null; notes: string | null }) => {
        let line = `- ${o.observedAt}: ${o.observationType}`;
        if (o.intensity) line += `, intensity=${o.intensity}`;
        if (o.context) line += ` | Context: ${o.context.slice(0, 100)}`;
        return line;
      });
      sections.push(`### Behavior Observations (${observations.length})\n${obsLines.join("\n")}`);
    }

    if (teacherFeedbacks.length > 0) {
      const tfLines = teacherFeedbacks.slice(0, 5).map((tf: { feedbackDate: string; teacherName: string; subject: string | null; content: string }) =>
        `- ${tf.feedbackDate} from ${tf.teacherName}: ${tf.content.slice(0, 200)}`
      );
      sections.push(`### Teacher Feedbacks (${teacherFeedbacks.length})\n${tfLines.join("\n")}`);
    }

    if (contactFeedbacks.length > 0) {
      const cfLines = contactFeedbacks.slice(0, 5).map((cf: { feedbackDate: string; subject: string | null; content: string }) =>
        `- ${cf.feedbackDate}: ${cf.content.slice(0, 200)}`
      );
      sections.push(`### Contact Feedbacks (${contactFeedbacks.length})\n${cfLines.join("\n")}`);
    }

    if (deepAnalyses.length > 0) {
      const da = deepAnalyses[0] as { summary: string; createdAt: string };
      sections.push(`### Prior Deep Analysis\n${da.summary.slice(0, 400)}`);
    }
  }

  const familyContext = sections.length > 0
    ? `\n\n## Family & Child Context\n${sections.join("\n\n")}`
    : "";

  // ── Research for this journal entry ────────────────────────────
  const research = await listTherapyResearch(undefined, undefined, undefined, journalEntryId);
  let researchContext = "";
  if (research.length > 0) {
    const lines = research.slice(0, 10).map((r, i) => {
      const kf = r.keyFindings.slice(0, 3).join("; ");
      const tt = r.therapeuticTechniques.slice(0, 3).join("; ");
      return [
        `[${i + 1}] "${r.title}" (id: ${r.id})`,
        r.abstract ? `  Abstract: ${r.abstract.slice(0, 200)}` : "",
        kf ? `  Key findings: ${kf}` : "",
        tt ? `  Techniques: ${tt}` : "",
        r.evidenceLevel ? `  Evidence: ${r.evidenceLevel}` : "",
      ].filter(Boolean).join("\n");
    });
    researchContext = `\n\n## Research Papers\n${lines.join("\n\n")}`;
  }

  // ── Build prompt ────────────────────────────────────────────────
  const ageRef = childAge ? `${childAge} years old` : "unknown age";
  const prompt = [
    `You are a developmental psychology expert helping a parent prepare for a conversation with their child about a behavior described in a journal entry.`,
    `You are NOT writing clinical notes. You are creating a practical, warm, evidence-based discussion guide that a parent can actually use during a real conversation with their child.`,
    ``,
    `## Journal Entry`,
    entryContext,
    familyContext,
    researchContext,
    ``,
    `## Instructions`,
    ``,
    `Based on the journal entry above, generate a parent discussion guide. The child is ${ageRef}.`,
    ``,
    `1. **behaviorSummary** (string): A brief 1-2 sentence plain-language summary of the behavior that needs to be discussed.`,
    ``,
    `2. **developmentalContext** (object): Help the parent understand WHY this behavior happens at this age.`,
    `   - stage (string): The developmental stage name (e.g., "Early Adolescence", "Middle Childhood", "Preschool")`,
    `   - explanation (string): What is developmentally normal vs. concerning about this behavior — explain in parent-friendly language`,
    `   - normalizedBehavior (string): Reassure the parent about what part of this is age-typical — help them stay calm`,
    `   - researchBasis (string, optional): Reference specific research if available (use research paper IDs like "ResearchID:5" — do NOT invent IDs)`,
    ``,
    `3. **conversationStarters** (array, 3-4 items): Age-appropriate ways to open the discussion.`,
    `   - opener (string): The exact words a parent could say to begin the conversation`,
    `   - context (string): When/where to use this opener (e.g., "during a calm moment after dinner", "on a walk together")`,
    `   - ageAppropriateNote (string, optional): Why this approach works for the child's developmental stage`,
    ``,
    `4. **talkingPoints** (array, 3-5 items): Key things to cover in the discussion.`,
    `   - point (string): The main idea to convey`,
    `   - explanation (string): How to explain it in age-appropriate terms the child can understand`,
    `   - researchBacking (string, optional): What research supports this approach (reference paper IDs if available)`,
    `   - relatedResearchIds (int[], optional): IDs from the research papers above`,
    ``,
    `5. **languageGuide** (object): Concrete phrases to use and avoid.`,
    `   - whatToSay (array, 4-6 items): Helpful phrases with { phrase, reason, alternative (optional) }`,
    `   - whatNotToSay (array, 3-5 items): Harmful phrases with { phrase, reason, alternative (required — what to say instead) }`,
    ``,
    `6. **anticipatedReactions** (array, 3-4 items): How the child might respond.`,
    `   - reaction (string): What the child might say or do`,
    `   - likelihood (string): "high", "medium", or "low"`,
    `   - howToRespond (string): How the parent should respond — stay calm and empathetic`,
    ``,
    `7. **followUpPlan** (array, 3-4 items): Steps to reinforce the discussion over time.`,
    `   - action (string): What to do`,
    `   - timing (string): When (e.g., "same evening", "next day", "within a week", "ongoing")`,
    `   - description (string): How to do it practically`,
    ``,
    `IMPORTANT RULES:`,
    `- Use warm, non-judgmental, empathetic language throughout — the parent is seeking to understand, not punish.`,
    `- Never label the child — focus on the behavior, not the character ("what you did" not "you are").`,
    `- Be specific and practical — generic advice like "talk to your child" is unhelpful.`,
    `- If the child has known characteristics or conditions (e.g., ADHD, autism, anxiety), adapt all recommendations accordingly.`,
    `- Write in the same language as the journal entry content.`,
    `- If research papers are available, cite them by ID. Do NOT invent research references or IDs.`,
    `- All language and explanations must be adapted to the child's age (${ageRef}).`,
    `- This guide should be something a parent can read in 5 minutes and feel prepared to have the conversation.`,
  ].join("\n");

  // Delete existing guide
  await db.deleteDiscussionGuide(journalEntryId, userEmail);

  const isRo = await isRoGoal({ userEmail, journalEntryId });

  const { object } = await generateObject({
    schema: discussionGuideSchema,
    prompt: withRo(prompt, isRo),
    temperature: 0.3,
    max_tokens: 8192,
  });

  const guideId = await db.createDiscussionGuide({
    journalEntryId,
    userId: userEmail,
    childAge,
    behaviorSummary: object.behaviorSummary,
    developmentalContext: object.developmentalContext,
    conversationStarters: object.conversationStarters,
    talkingPoints: object.talkingPoints,
    languageGuide: object.languageGuide,
    anticipatedReactions: object.anticipatedReactions,
    followUpPlan: object.followUpPlan,
  });

  return {
    success: true,
    message: "Discussion guide generated successfully.",
    guide: {
      id: guideId,
      journalEntryId,
      childAge,
      behaviorSummary: object.behaviorSummary,
      developmentalContext: object.developmentalContext,
      conversationStarters: object.conversationStarters,
      talkingPoints: object.talkingPoints,
      languageGuide: object.languageGuide,
      anticipatedReactions: object.anticipatedReactions,
      followUpPlan: object.followUpPlan,
      model: "deepseek-chat",
      createdAt: new Date().toISOString(),
    },
  };
};
