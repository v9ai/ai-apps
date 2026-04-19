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
  listFamilyMembers,
  getIssuesReferencingFamilyMember,
} from "@/src/db";
import { sql as neonSql } from "@/src/db/neon";
import { generateObject } from "@/src/lib/deepseek";
import { isRoGoal, withRo } from "@/src/lib/ro";
import { z } from "zod";

const analysisSchema = z.object({
  summary: z.string(),
  emotionalLandscape: z.object({
    primaryEmotions: z.array(z.string()),
    underlyingEmotions: z.array(z.string()),
    emotionalRegulation: z.string(),
    attachmentPatterns: z.string().optional(),
  }),
  therapeuticInsights: z.array(z.object({
    title: z.string(),
    observation: z.string(),
    clinicalRelevance: z.string(),
    relatedResearchIds: z.array(z.number()).optional(),
  })),
  actionableRecommendations: z.array(z.object({
    title: z.string(),
    description: z.string(),
    priority: z.string(),
    concreteSteps: z.array(z.string()),
    relatedResearchIds: z.array(z.number()).optional(),
  })),
  reflectionPrompts: z.array(z.string()),
});

export const generateJournalAnalysis: NonNullable<MutationResolvers['generateJournalAnalysis']> = async (_parent, args, ctx) => {
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

  // ── Linked goal context ─────────────────────────────────────────
  let goalContext = "";
  if (entry.goalId) {
    try {
      const goal = await db.getGoal(entry.goalId, userEmail);
      goalContext = `\n\n## Linked Goal\n- **${goal.title}**${goal.description ? `\n  ${goal.description}` : ""}`;
    } catch { /* goal may not exist */ }
  }

  // ── Other journal entries (for pattern detection) ───────────────
  let otherEntriesContext = "";
  const otherEntries = await db.listJournalEntries(userEmail, {
    familyMemberId: entry.familyMemberId ?? undefined,
  });
  const siblings = otherEntries.filter(e => e.id !== journalEntryId).slice(0, 8);
  if (siblings.length > 0) {
    const lines = siblings.map(e => {
      let line = `- ${e.entryDate}`;
      if (e.mood) line += ` | Mood: ${e.mood}${e.moodScore ? ` (${e.moodScore}/10)` : ""}`;
      if (e.tags?.length) line += ` | Tags: ${e.tags.join(", ")}`;
      line += `\n  ${(e.content || "").slice(0, 200)}`;
      return line;
    });
    otherEntriesContext = `\n\n## Other Journal Entries (${siblings.length})\n${lines.join("\n")}`;
  }

  // ── Family member full context ──────────────────────────────────
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
      relatedIssues,
      allMembers,
    ] = await Promise.all([
      getFamilyMember(entry.familyMemberId),
      getIssuesForFamilyMember(entry.familyMemberId, undefined, userEmail),
      getBehaviorObservationsForFamilyMember(entry.familyMemberId, userEmail),
      getTeacherFeedbacksForFamilyMember(entry.familyMemberId, userEmail),
      getContactFeedbacksForFamilyMember(entry.familyMemberId, userEmail),
      getDeepIssueAnalysesForFamilyMember(entry.familyMemberId, userEmail),
      neonSql`SELECT category, title, description, severity, impairment_domains FROM family_member_characteristics WHERE family_member_id = ${entry.familyMemberId} AND user_id = ${userEmail} ORDER BY created_at DESC`,
      getIssuesReferencingFamilyMember(entry.familyMemberId, userEmail),
      listFamilyMembers(userEmail),
    ]);

    // Person profile
    if (member) {
      const parts = [`**${member.firstName}${member.name ? ` ${member.name}` : ""}**`];
      if (member.ageYears) parts.push(`Age: ${member.ageYears}`);
      if (member.relationship) parts.push(`Relationship: ${member.relationship}`);
      if (member.dateOfBirth) parts.push(`DOB: ${member.dateOfBirth}`);
      if (member.bio) parts.push(`Bio: ${member.bio}`);
      sections.push(`### Person Profile\n${parts.join(" | ")}`);
    }

    // Characteristics & support needs
    if (characteristics.length > 0) {
      const charLines = characteristics.map((c: Record<string, unknown>) => {
        const parts = [`- **${c.title}** (${c.category}${c.severity ? `, ${c.severity}` : ""})`];
        if (c.description) parts.push(`  ${c.description}`);
        if (c.impairment_domains) {
          try { parts.push(`  Domains: ${JSON.parse(c.impairment_domains as string).join(", ")}`); } catch { /* skip */ }
        }
        return parts.join("\n");
      });
      sections.push(`### Characteristics & Support Needs (${characteristics.length})\n${charLines.join("\n")}`);
    }

    // All issues
    if (issues.length > 0) {
      const issueLines = issues.slice(0, 15).map((i: { id: number; title: string; severity: string; category: string; description: string; recommendations?: string[] | null }) => {
        let line = `- [ID:${i.id}] **${i.title}** [${i.severity}/${i.category}]: ${i.description.slice(0, 150)}`;
        if (i.recommendations && i.recommendations.length > 0) {
          line += `\n  Recommendations: ${i.recommendations.slice(0, 3).join("; ")}`;
        }
        return line;
      });
      sections.push(`### All Issues (${issues.length})\n${issueLines.join("\n")}`);

      // Research for these issues
      const issueIds = issues.map((i: { id: number }) => i.id);
      const issueResearch = await getResearchForFamilyMemberIssues(issueIds);
      if (issueResearch.length > 0) {
        const rLines = issueResearch.slice(0, 10).map((r: { id: number; issueId: number | null; title: string; keyFindings: string[]; therapeuticTechniques: string[]; evidenceLevel: string | null }) => {
          let line = `- [ResearchID:${r.id}] "${r.title}"`;
          if (r.evidenceLevel) line += ` (${r.evidenceLevel})`;
          if (r.issueId) line += ` for issue #${r.issueId}`;
          if (r.keyFindings?.length) line += `\n  Key findings: ${r.keyFindings.slice(0, 3).join("; ")}`;
          if (r.therapeuticTechniques?.length) line += `\n  Techniques: ${r.therapeuticTechniques.slice(0, 3).join("; ")}`;
          return line;
        });
        sections.push(`### Research for Issues (${issueResearch.length})\n${rLines.join("\n")}`);
      }
    }

    // Behavior observations
    if (observations.length > 0) {
      const obsLines = observations.slice(0, 10).map((o: { observedAt: string; observationType: string; frequency?: number | null; intensity: string | null; context?: string | null; notes: string | null }) => {
        let line = `- ${o.observedAt}: ${o.observationType}`;
        if (o.frequency) line += `, freq=${o.frequency}`;
        if (o.intensity) line += `, intensity=${o.intensity}`;
        if (o.context) line += ` | Context: ${o.context.slice(0, 100)}`;
        if (o.notes) line += ` | Notes: ${o.notes.slice(0, 100)}`;
        return line;
      });
      sections.push(`### Behavior Observations (${observations.length})\n${obsLines.join("\n")}`);
    }

    // Teacher feedbacks
    if (teacherFeedbacks.length > 0) {
      const tfLines = teacherFeedbacks.slice(0, 5).map((tf: { feedbackDate: string; teacherName: string; subject: string | null; content: string }) =>
        `- ${tf.feedbackDate} from ${tf.teacherName}${tf.subject ? ` (${tf.subject})` : ""}\n  ${tf.content.slice(0, 200)}`
      );
      sections.push(`### Teacher Feedbacks (${teacherFeedbacks.length})\n${tfLines.join("\n")}`);
    }

    // Contact feedbacks
    if (contactFeedbacks.length > 0) {
      const cfLines = contactFeedbacks.slice(0, 5).map((cf: { feedbackDate: string; subject: string | null; content: string }) =>
        `- ${cf.feedbackDate}${cf.subject ? ` (${cf.subject})` : ""}\n  ${cf.content.slice(0, 200)}`
      );
      sections.push(`### Contact Feedbacks (${contactFeedbacks.length})\n${cfLines.join("\n")}`);
    }

    // Issues from other family members referencing this person
    if (relatedIssues.length > 0) {
      const riLines = relatedIssues.slice(0, 5).map((ri: { id: number; title: string; category: string; severity: string; description: string; familyMemberId: number }) =>
        `- [ID:${ri.id}] "${ri.title}" (${ri.category}, ${ri.severity}) from member #${ri.familyMemberId}\n  ${ri.description.slice(0, 150)}`
      );
      sections.push(`### Issues From Other Members Referencing This Person (${relatedIssues.length})\n${riLines.join("\n")}`);
    }

    // Prior deep analyses
    if (deepAnalyses.length > 0) {
      const daLines = deepAnalyses.slice(0, 1).map((da: { summary: string; createdAt: string }) =>
        `- ${da.createdAt.slice(0, 10)}: ${da.summary.slice(0, 300)}`
      );
      sections.push(`### Prior Deep Issue Analyses (${deepAnalyses.length})\n${daLines.join("\n")}`);
    }

    // Other family members (systemic context)
    const otherMembers = allMembers.filter(m => m.id !== entry.familyMemberId);
    if (otherMembers.length > 0) {
      const mLines = otherMembers.map((m: { id: number; firstName: string; name?: string | null; ageYears?: number | null; relationship?: string | null }) => {
        let line = `- [ID:${m.id}] ${m.firstName}`;
        if (m.name) line += ` ${m.name}`;
        if (m.ageYears) line += `, age ${m.ageYears}`;
        if (m.relationship) line += ` (${m.relationship})`;
        return line;
      });
      sections.push(`### Other Family Members\n${mLines.join("\n")}`);
    }
  }

  const familyContext = sections.length > 0
    ? `\n\n## Family Member Context\n${sections.join("\n\n")}`
    : "";

  // ── Research for this specific journal entry ────────────────────
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
    researchContext = `\n\n## Research Papers (Journal Entry)\n${lines.join("\n\n")}`;
  }

  // ── Build prompt ────────────────────────────────────────────────
  const prompt = [
    `You are a clinical psychologist performing a deep therapeutic analysis of a journal entry.`,
    `You have access to the FULL history of this person — their issues, observations, feedbacks, characteristics, prior analyses, research papers, and other journal entries.`,
    `Use ALL of this context to produce a comprehensive clinical analysis that connects the current entry to the broader therapeutic picture.`,
    ``,
    `## Journal Entry (Primary Focus)`,
    entryContext,
    goalContext,
    otherEntriesContext,
    familyContext,
    researchContext,
    ``,
    `## Instructions`,
    `Analyze this journal entry in the context of ALL the data above. Produce a structured JSON analysis with:`,
    ``,
    `1. **summary** (string): 2-3 paragraph clinical analysis. Connect the entry's themes to the broader history — known issues, behavioral patterns, feedback from teachers/contacts, prior analyses. Identify what is new, what is recurring, and what is evolving.`,
    ``,
    `2. **emotionalLandscape** (object):`,
    `   - primaryEmotions (string[]): Main emotions expressed directly`,
    `   - underlyingEmotions (string[]): Emotions implied or not directly stated but present, informed by the full history`,
    `   - emotionalRegulation (string): Assessment of emotional management, referencing behavioral observations if available`,
    `   - attachmentPatterns (string, optional): Attachment-related patterns from the entry and broader context`,
    ``,
    `3. **therapeuticInsights** (array, 3-5 items): Each with:`,
    `   - title (string): Brief insight name`,
    `   - observation (string): What was observed — connect to specific issues, observations, or feedbacks from the data`,
    `   - clinicalRelevance (string): Why this matters therapeutically, referencing the person's characteristics and history`,
    `   - relatedResearchIds (int[], optional): IDs from the research papers above — do NOT invent IDs`,
    ``,
    `4. **actionableRecommendations** (array, 3-5 items): Each with:`,
    `   - title (string): Recommendation name`,
    `   - description (string): 1-2 sentences explaining the recommendation with reference to the person's specific situation`,
    `   - priority (string): immediate|short_term|long_term`,
    `   - concreteSteps (string[]): 2-3 specific actionable steps tailored to the person's age, characteristics, and family context`,
    `   - relatedResearchIds (int[], optional): IDs from the research papers above`,
    ``,
    `5. **reflectionPrompts** (string[]): 3-5 deep self-reflection questions that connect the journal entry to the broader patterns in the data`,
    ``,
    `Write in the same language as the journal entry content.`,
    `Reference specific issues, observations, or feedbacks by their details when making insights.`,
    `If research papers are available, reference their IDs where relevant. Do NOT invent research references.`,
  ].join("\n");

  // Delete any existing analysis for this entry
  await db.deleteJournalAnalysis(journalEntryId, userEmail);

  const isRo = await isRoGoal({ journalEntryId });

  const { object } = await generateObject({
    schema: analysisSchema,
    prompt: withRo(prompt, isRo),
    temperature: 0.3,
    max_tokens: 8192,
  });

  const analysisId = await db.createJournalAnalysis({
    journalEntryId,
    userId: userEmail,
    summary: object.summary,
    emotionalLandscape: object.emotionalLandscape,
    therapeuticInsights: object.therapeuticInsights,
    actionableRecommendations: object.actionableRecommendations,
    reflectionPrompts: object.reflectionPrompts,
  });

  return {
    success: true,
    message: "Deep analysis generated successfully.",
    analysis: {
      id: analysisId,
      journalEntryId,
      summary: object.summary,
      emotionalLandscape: object.emotionalLandscape,
      therapeuticInsights: object.therapeuticInsights,
      actionableRecommendations: object.actionableRecommendations,
      reflectionPrompts: object.reflectionPrompts,
      model: "deepseek-chat",
      createdAt: new Date().toISOString(),
    },
  };
};
