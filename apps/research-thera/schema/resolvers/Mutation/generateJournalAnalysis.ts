import type { MutationResolvers } from "./../../types.generated";
import {
  db,
  listTherapyResearch,
  getFamilyMember,
  getIssuesForFamilyMember,
  getBehaviorObservationsForFamilyMember,
  getDeepIssueAnalysesForFamilyMember,
} from "@/src/db";
import { generateObject } from "@/src/lib/deepseek";
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

  // Build context from journal entry
  const entryContext = [
    entry.title ? `Title: ${entry.title}` : null,
    `Date: ${entry.entryDate}`,
    `Content: ${entry.content}`,
    entry.mood ? `Mood: ${entry.mood}${entry.moodScore ? ` (${entry.moodScore}/10)` : ""}` : null,
    entry.tags?.length ? `Tags: ${entry.tags.join(", ")}` : null,
  ].filter(Boolean).join("\n");

  // Build family member context if linked
  let familyContext = "";
  if (entry.familyMemberId) {
    const [member, issues, observations, deepAnalyses] = await Promise.all([
      getFamilyMember(entry.familyMemberId),
      getIssuesForFamilyMember(entry.familyMemberId, undefined, userEmail),
      getBehaviorObservationsForFamilyMember(entry.familyMemberId, userEmail),
      getDeepIssueAnalysesForFamilyMember(entry.familyMemberId, userEmail),
    ]);

    const sections: string[] = [];
    if (member) {
      const parts = [`**${member.firstName}${member.name ? ` ${member.name}` : ""}**`];
      if (member.ageYears) parts.push(`Age: ${member.ageYears}`);
      if (member.relationship) parts.push(`Relationship: ${member.relationship}`);
      if (member.bio) parts.push(`Bio: ${member.bio}`);
      sections.push(`### Person Profile\n${parts.join(" | ")}`);
    }
    if (issues.length > 0) {
      const issueLines = issues.slice(0, 10).map((i: { title: string; severity: string; category: string; description: string }) =>
        `- **${i.title}** [${i.severity}/${i.category}]: ${i.description.slice(0, 150)}`
      );
      sections.push(`### Known Issues (${issues.length})\n${issueLines.join("\n")}`);
    }
    if (observations.length > 0) {
      const obsLines = observations.slice(0, 8).map((o: { observedAt: string; observationType: string; intensity: string | null; notes: string | null }) =>
        `- ${o.observedAt}: ${o.observationType}${o.intensity ? ` (${o.intensity})` : ""}${o.notes ? ` — ${o.notes.slice(0, 100)}` : ""}`
      );
      sections.push(`### Recent Observations (${observations.length})\n${obsLines.join("\n")}`);
    }
    if (deepAnalyses.length > 0) {
      sections.push(`### Prior Deep Analysis Summary\n${deepAnalyses[0].summary.slice(0, 300)}`);
    }
    if (sections.length > 0) {
      familyContext = `\n\n## Family Member Context\n${sections.join("\n\n")}`;
    }
  }

  // Fetch existing research for this journal entry
  const research = await listTherapyResearch(undefined, undefined, undefined, journalEntryId);
  let researchContext = "";
  if (research.length > 0) {
    const lines = research.slice(0, 8).map((r, i) => {
      const kf = r.keyFindings.slice(0, 3).join("; ");
      const tt = r.therapeuticTechniques.slice(0, 3).join("; ");
      return [
        `[${i + 1}] "${r.title}" (id: ${r.id})`,
        kf ? `  Key findings: ${kf}` : "",
        tt ? `  Techniques: ${tt}` : "",
        r.evidenceLevel ? `  Evidence: ${r.evidenceLevel}` : "",
      ].filter(Boolean).join("\n");
    });
    researchContext = `\n\n## Research Papers\n${lines.join("\n\n")}`;
  }

  const prompt = [
    `You are a clinical psychologist performing a deep therapeutic analysis of a journal entry.`,
    `Analyze the emotional content, identify therapeutic patterns, and provide actionable clinical recommendations.`,
    ``,
    `## Journal Entry`,
    entryContext,
    familyContext,
    researchContext,
    ``,
    `## Instructions`,
    `Produce a structured JSON analysis with:`,
    ``,
    `1. **summary** (string): 2-3 paragraph clinical analysis summary. Identify the core emotional themes, therapeutic significance, and areas for exploration.`,
    ``,
    `2. **emotionalLandscape** (object):`,
    `   - primaryEmotions (string[]): The main emotions expressed directly in the entry`,
    `   - underlyingEmotions (string[]): Emotions that are implied or not directly stated but present`,
    `   - emotionalRegulation (string): Assessment of how the person is managing their emotions`,
    `   - attachmentPatterns (string, optional): Any attachment-related patterns observed`,
    ``,
    `3. **therapeuticInsights** (array, 3-5 items): Each with:`,
    `   - title (string): Brief insight name`,
    `   - observation (string): What was observed in the entry`,
    `   - clinicalRelevance (string): Why this matters therapeutically`,
    `   - relatedResearchIds (int[], optional): IDs from the research papers above`,
    ``,
    `4. **actionableRecommendations** (array, 3-5 items): Each with:`,
    `   - title (string): Recommendation name`,
    `   - description (string): 1-2 sentences explaining the recommendation`,
    `   - priority (string): immediate|short_term|long_term`,
    `   - concreteSteps (string[]): 2-3 specific actionable steps`,
    `   - relatedResearchIds (int[], optional): IDs from the research papers above`,
    ``,
    `5. **reflectionPrompts** (string[]): 3-5 deep self-reflection questions for the journal writer`,
    ``,
    `Write in the same language as the journal entry content.`,
    `If research papers are available, reference their IDs where relevant. Do NOT invent research references.`,
  ].join("\n");

  // Delete any existing analysis for this entry
  await db.deleteJournalAnalysis(journalEntryId, userEmail);

  const { object } = await generateObject({
    schema: analysisSchema,
    prompt,
    temperature: 0.3,
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
