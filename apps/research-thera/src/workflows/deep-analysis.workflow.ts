import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { sql as neonSql } from "@/src/db/neon";
import { createDeepIssueAnalysis } from "@/src/db";
import { generateObject } from "@/src/lib/deepseek";
import { ROMANIAN_INSTRUCTION } from "@/src/lib/ro";

const inputSchema = z.object({
  family_member_id: z.number().int(),
  trigger_issue_id: z.number().int().nullable().optional(),
  user_email: z.string().email(),
  language: z.enum(["en", "ro"]).default("en"),
});

const outputSchema = z.object({
  analysis_id: z.number().int().optional(),
  error: z.string().optional(),
});

const collectedSchema = z.object({
  familyMemberId: z.number().int(),
  triggerIssueId: z.number().int().nullable(),
  userEmail: z.string(),
  prompt: z.string(),
  dataSnapshot: z.record(z.unknown()),
  error: z.string().optional(),
});

const analyzedSchema = collectedSchema.extend({
  analysis: z.record(z.unknown()).optional(),
});

const coerceList = <T>(schema: z.ZodType<T>) =>
  z.preprocess(
    (v) => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]),
    z.array(schema),
  );

const patternClusterSchema = z.object({
  name: z.string(),
  description: z.string(),
  issueIds: coerceList(z.number().int()),
  issueTitles: coerceList(z.string()),
  categories: coerceList(z.string()),
  pattern: z.string(),
  confidence: z.number().min(0).max(1),
  suggestedRootCause: z.string().nullable().optional(),
});

const timelinePhaseSchema = z.object({
  period: z.string(),
  issueIds: coerceList(z.number().int()),
  description: z.string(),
  moodTrend: z.string().nullable().optional(),
  keyEvents: coerceList(z.string()),
});

const timelineAnalysisSchema = z.object({
  phases: z.array(timelinePhaseSchema),
  moodCorrelation: z.string().nullable().optional(),
  escalationTrend: z.string(),
  criticalPeriods: coerceList(z.string()),
});

const familySystemInsightSchema = z.object({
  insight: z.string(),
  involvedMemberIds: coerceList(z.number().int()),
  involvedMemberNames: coerceList(z.string()),
  evidenceIssueIds: coerceList(z.number().int()),
  systemicPattern: z.string().nullable().optional(),
  actionable: z.boolean(),
});

const priorityRecommendationSchema = z.object({
  rank: z.number().int(),
  issueId: z.number().int().nullable().optional(),
  issueTitle: z.string().nullable().optional(),
  rationale: z.string(),
  urgency: z.string(),
  suggestedApproach: z.string(),
  relatedResearchIds: coerceList(z.number().int()).optional(),
});

const researchRelevanceSchema = z.object({
  patternClusterName: z.string(),
  relevantResearchIds: coerceList(z.number().int()),
  relevantResearchTitles: coerceList(z.string()),
  coverageGaps: coerceList(z.string()),
});

const parentAdviceItemSchema = z.object({
  title: z.string(),
  advice: z.string(),
  targetIssueIds: coerceList(z.number().int()),
  targetIssueTitles: coerceList(z.string()),
  relatedPatternCluster: z.string().nullable().optional(),
  relatedResearchIds: coerceList(z.number().int()).optional(),
  relatedResearchTitles: coerceList(z.string()).optional(),
  ageAppropriate: z.boolean().default(true),
  developmentalContext: z.string().nullable().optional(),
  priority: z.string(),
  concreteSteps: coerceList(z.string()),
});

const deepAnalysisSchema = z.object({
  summary: z.string(),
  patternClusters: z.array(patternClusterSchema),
  timelineAnalysis: timelineAnalysisSchema,
  familySystemInsights: z.array(familySystemInsightSchema),
  priorityRecommendations: z.array(priorityRecommendationSchema),
  researchRelevance: z.array(researchRelevanceSchema),
  parentAdvice: z.array(parentAdviceItemSchema),
});

type IssueRow = {
  id: number;
  title: string;
  category: string;
  severity: string;
  description: string | null;
  recommendations: string | null;
  related_family_member_id: number | null;
  created_at: string;
};

const collectData = createStep({
  id: "collect_data",
  inputSchema,
  outputSchema: collectedSchema,
  execute: async ({ inputData }) => {
    const { family_member_id, user_email } = inputData;
    const triggerIssueId = inputData.trigger_issue_id ?? null;
    const base = {
      familyMemberId: family_member_id,
      triggerIssueId,
      userEmail: user_email,
    };

    const fmRows = await neonSql`
      SELECT id, first_name, name, age_years, relationship, bio
      FROM family_members WHERE id = ${family_member_id}
    `;
    if (fmRows.length === 0) {
      return {
        ...base,
        prompt: "",
        dataSnapshot: {},
        error: `Family member ${family_member_id} not found`,
      };
    }
    const fm = fmRows[0];

    const issueRowsRaw = await neonSql`
      SELECT id, title, category, severity, description, recommendations, related_family_member_id, created_at
      FROM issues WHERE family_member_id = ${family_member_id} AND user_id = ${user_email}
      ORDER BY created_at DESC
    `;
    const issues = issueRowsRaw as unknown as IssueRow[];

    const observations = await neonSql`
      SELECT observed_at, observation_type, frequency, intensity, context, notes
      FROM behavior_observations WHERE family_member_id = ${family_member_id} AND user_id = ${user_email}
      ORDER BY observed_at DESC LIMIT 30
    `;

    const journals = await neonSql`
      SELECT entry_date, mood, mood_score, tags, content
      FROM journal_entries WHERE family_member_id = ${family_member_id} AND user_id = ${user_email}
      ORDER BY entry_date DESC LIMIT 20
    `;

    const teacherFbs = await neonSql`
      SELECT feedback_date, teacher_name, subject, content, tags
      FROM teacher_feedbacks WHERE family_member_id = ${family_member_id} AND user_id = ${user_email}
      ORDER BY feedback_date DESC LIMIT 15
    `;

    const contactFbs = await neonSql`
      SELECT feedback_date, subject, content, tags
      FROM contact_feedbacks WHERE family_member_id = ${family_member_id} AND user_id = ${user_email}
      ORDER BY feedback_date DESC LIMIT 15
    `;

    const relatedIssues = await neonSql`
      SELECT i.id, i.title, i.category, i.severity, i.description, i.family_member_id, fm.first_name
      FROM issues i LEFT JOIN family_members fm ON fm.id = i.family_member_id
      WHERE i.related_family_member_id = ${family_member_id} AND i.user_id = ${user_email}
      ORDER BY i.created_at DESC LIMIT 15
    `;

    const issueIds = issues.map((r) => r.id);
    let research: Record<string, unknown>[] = [];
    let issueContacts: Record<string, unknown>[] = [];
    if (issueIds.length > 0) {
      research = (await neonSql`
        SELECT id, issue_id, title, key_findings, therapeutic_techniques, evidence_level
        FROM therapy_research WHERE issue_id = ANY(${issueIds}::int[])
        ORDER BY relevance_score DESC LIMIT 20
      `) as unknown as Record<string, unknown>[];

      issueContacts = (await neonSql`
        SELECT DISTINCT ic.issue_id, c.id, c.first_name, c.last_name, c.role, c.age_years, c.notes
        FROM issue_contacts ic JOIN contacts c ON c.id = ic.contact_id
        WHERE ic.issue_id = ANY(${issueIds}::int[]) AND ic.user_id = ${user_email}
      `) as unknown as Record<string, unknown>[];
    }

    const allMembers = await neonSql`
      SELECT id, first_name, name, age_years, relationship
      FROM family_members WHERE user_id = ${user_email}
    `;

    const triggerIssue = triggerIssueId
      ? issues.find((r) => r.id === triggerIssueId) ?? null
      : null;
    const otherIssues = triggerIssueId
      ? issues.filter((r) => r.id !== triggerIssueId)
      : issues;

    const sections: string[] = [];

    if (triggerIssue) {
      const tiRecs = (() => {
        if (!triggerIssue.recommendations) return "";
        try {
          const recs = JSON.parse(triggerIssue.recommendations);
          return Array.isArray(recs) && recs.length > 0
            ? `\n  Current recommendations: ${recs.join("; ")}`
            : "";
        } catch {
          return "";
        }
      })();
      sections.push(
        "You are a clinical psychologist and family systems analyst. " +
          "Your PRIMARY task is to provide an in-depth analysis of a SPECIFIC issue involving this family member. " +
          "The other issues, observations, and feedback are provided as CONTEXT to help you understand " +
          "how this issue fits into the broader picture — but your analysis must CENTER on the trigger issue.\n\n" +
          "CRITICAL — ATTRIBUTION RULES:\n" +
          "- For each issue, carefully read the description to identify WHO is the primary actor/aggressor, " +
          "WHO is the victim or recipient, and WHO are bystanders.\n" +
          "- The profiled family member may be the VICTIM, not the actor. Do NOT assume they caused the behavior described.\n" +
          "- People mentioned in descriptions who are NOT listed in ## Other Family Members are external individuals " +
          "(classmates, school colleagues, neighbors, etc.) — do NOT assume they are siblings or family members " +
          "unless the description explicitly states so.\n\n" +
          `## TRIGGER ISSUE (Primary Focus)\n` +
          `- [ID:${triggerIssue.id}] "${triggerIssue.title}" (${triggerIssue.category}, ${triggerIssue.severity} severity, ${String(triggerIssue.created_at).slice(0, 10)})\n` +
          `  ${(triggerIssue.description ?? "").slice(0, 500)}${tiRecs}`,
      );
      sections.push(
        "IMPORTANT: Only reference issue IDs, research IDs, and family member IDs that appear in the data below.\n" +
          "Your summary, pattern clusters, and priority recommendations must primarily address the trigger issue above. " +
          "Other issues should be referenced only when they relate to or shed light on the trigger issue.",
      );
    } else {
      sections.push(
        "You are a clinical psychologist and family systems analyst. Analyze the complete history " +
          "of issues, observations, journal entries, and feedback involving a family member to identify " +
          "patterns, systemic dynamics, and priorities.\n\n" +
          "CRITICAL — ATTRIBUTION RULES:\n" +
          "- For each issue, carefully read the description to identify WHO is the primary actor/aggressor, " +
          "WHO is the victim or recipient, and WHO are bystanders.\n" +
          "- The profiled family member may be the VICTIM, not the actor. Do NOT assume they caused the behavior described.\n" +
          "- People mentioned in descriptions who are NOT listed in ## Other Family Members are external individuals " +
          "(classmates, school colleagues, neighbors, etc.) — do NOT assume they are siblings or family members " +
          "unless the description explicitly states so.\n\n" +
          "IMPORTANT: Only reference issue IDs, research IDs, and family member IDs that appear in the data below.",
      );
    }

    const profileParts = [`Name: ${fm.first_name}${fm.name ? " " + fm.name : ""}`];
    if (fm.age_years) profileParts.push(`Age: ${fm.age_years}`);
    if (fm.relationship) profileParts.push(`Relationship: ${fm.relationship}`);
    if (fm.bio) profileParts.push(`Bio: ${(fm.bio as string).slice(0, 500)}`);
    sections.push(`## Family Member Profile\n${profileParts.join("\n")}`);

    const contextIssues = (triggerIssue ? otherIssues : issues).slice(0, 30);
    const issueLines = contextIssues.map((r) => {
      let line = `- [ID:${r.id}] "${r.title}" (${r.category}, ${r.severity} severity, ${String(r.created_at).slice(0, 10)})`;
      if (r.description) line += `\n  ${r.description.slice(0, 300)}`;
      if (r.recommendations) {
        try {
          const recs = JSON.parse(r.recommendations);
          if (Array.isArray(recs) && recs.length > 0) {
            line += `\n  Recommendations: ${recs.join("; ")}`;
          }
        } catch {
          /* ignore */
        }
      }
      return line;
    });
    const header = triggerIssue
      ? "## Other Issues (Context)"
      : `## All Issues (${issues.length})`;
    const roleNote =
      "\n(Note: The profiled family member may be the subject, victim, or bystander in these incidents. Determine their role from each description.)\n";
    sections.push(`${header}${roleNote}${issueLines.join("\n") || "None"}`);

    if (observations.length > 0) {
      const obsLines = observations.map((r) => {
        let line = `- ${String(r.observed_at).slice(0, 10)}: ${r.observation_type}`;
        if (r.frequency) line += `, freq=${r.frequency}`;
        if (r.intensity) line += `, intensity=${r.intensity}`;
        if (r.context) line += ` | Context: ${(r.context as string).slice(0, 200)}`;
        if (r.notes) line += ` | Notes: ${(r.notes as string).slice(0, 200)}`;
        return line;
      });
      sections.push(
        `## Behavior Observations (${observations.length})\n${obsLines.join("\n")}`,
      );
    }

    if (journals.length > 0) {
      const jLines = journals.map((r) => {
        let line = `- ${r.entry_date}`;
        if (r.mood) line += ` | Mood: ${r.mood}`;
        if (r.mood_score !== null && r.mood_score !== undefined) line += ` (${r.mood_score}/10)`;
        if (r.tags) {
          try {
            const tags = typeof r.tags === "string" ? JSON.parse(r.tags) : r.tags;
            if (Array.isArray(tags) && tags.length > 0) {
              line += ` | Tags: ${tags.join(", ")}`;
            }
          } catch {
            /* ignore */
          }
        }
        line += `\n  ${(r.content as string ?? "").slice(0, 300)}`;
        return line;
      });
      sections.push(`## Journal Entries (${journals.length})\n${jLines.join("\n")}`);
    }

    if (teacherFbs.length > 0) {
      const tfLines = teacherFbs.map((r) => {
        let line = `- ${r.feedback_date} from ${r.teacher_name}`;
        if (r.subject) line += ` (${r.subject})`;
        line += `\n  ${(r.content as string ?? "").slice(0, 500)}`;
        return line;
      });
      sections.push(`## Teacher Feedbacks (${teacherFbs.length})\n${tfLines.join("\n")}`);
    }

    if (contactFbs.length > 0) {
      const cfLines = contactFbs.map((r) => {
        let line = `- ${r.feedback_date}`;
        if (r.subject) line += ` (${r.subject})`;
        line += `\n  ${(r.content as string ?? "").slice(0, 500)}`;
        return line;
      });
      sections.push(`## Contact Feedbacks (${contactFbs.length})\n${cfLines.join("\n")}`);
    }

    if (relatedIssues.length > 0) {
      const riLines = relatedIssues.map((r) => {
        const name = r.first_name ?? `member #${r.family_member_id}`;
        let line = `- [ID:${r.id}] "${r.title}" (${r.category}, ${r.severity}) — primary: ${name} [ID:${r.family_member_id}]`;
        if (r.description) line += `\n  ${(r.description as string).slice(0, 300)}`;
        return line;
      });
      sections.push(
        `## Issues From Other Family Members Referencing This Person (${relatedIssues.length})\n${riLines.join("\n")}`,
      );
    }

    if (research.length > 0) {
      const rLines = research.map((r) => {
        const kf: string[] = r.key_findings ? JSON.parse(r.key_findings as string) : [];
        const tt: string[] = r.therapeutic_techniques
          ? JSON.parse(r.therapeutic_techniques as string)
          : [];
        let line = `- [ResearchID:${r.id}] "${r.title}"`;
        if (r.evidence_level) line += ` (${r.evidence_level})`;
        if (r.issue_id) line += ` for issue #${r.issue_id}`;
        line += `\n  Key findings: ${kf.slice(0, 3).join("; ")}`;
        line += `\n  Techniques: ${tt.slice(0, 3).join("; ")}`;
        return line;
      });
      sections.push(`## Existing Research (${research.length})\n${rLines.join("\n")}`);
    }

    const others = allMembers.filter((m) => m.id !== family_member_id);
    if (others.length > 0) {
      const oLines = others.map((m) => {
        let line = `- [ID:${m.id}] ${m.first_name}`;
        if (m.name) line += ` ${m.name}`;
        if (m.age_years) line += `, age ${m.age_years}`;
        if (m.relationship) line += ` (${m.relationship})`;
        return line;
      });
      sections.push(`## Other Family Members\n${oLines.join("\n")}`);
    }

    if (issueContacts.length > 0) {
      type ContactInfo = {
        first: string;
        last: string | null;
        role: string | null;
        age: number | null;
        notes: string | null;
      };
      const seenContacts = new Map<number, ContactInfo>();
      const contactIssueMap = new Map<number, number[]>();
      for (const row of issueContacts) {
        const cId = row.id as number;
        seenContacts.set(cId, {
          first: row.first_name as string,
          last: row.last_name as string | null,
          role: row.role as string | null,
          age: row.age_years as number | null,
          notes: row.notes as string | null,
        });
        const prev = contactIssueMap.get(cId) ?? [];
        prev.push(row.issue_id as number);
        contactIssueMap.set(cId, prev);
      }
      const cLines: string[] = [];
      for (const [cId, info] of seenContacts) {
        let line = `- ${info.first}`;
        if (info.last) line += ` ${info.last}`;
        if (info.role) line += ` (${info.role})`;
        if (info.age) line += `, age ${info.age}`;
        const issuesStr = (contactIssueMap.get(cId) ?? []).map((i) => `#${i}`).join(", ");
        line += ` — mentioned in issues: ${issuesStr}`;
        if (info.notes) line += ` | ${info.notes.slice(0, 200)}`;
        cLines.push(line);
      }
      sections.push(
        "## Related Contacts (Non-Family)\n" +
          "These are people mentioned in the issues above who are NOT family members. " +
          "Use their roles to understand the social context of each incident.\n" +
          cLines.join("\n"),
      );
    }

    const instructionsTrigger = triggerIssue
      ? `## Instructions
Analyze the data above with PRIMARY FOCUS on the trigger issue (ID:${triggerIssue.id}: "${triggerIssue.title}").
Produce a structured JSON analysis with these fields:

1. **summary** (string): 2-3 paragraph executive summary for a parent/caregiver CENTERED on the trigger issue. Start with the trigger issue, then explain how other issues relate to it.
2. **patternClusters** (array of objects): Related issue groups. The trigger issue MUST appear in at least one cluster. Each has: name (string), description (string), issueIds (array of ints), issueTitles (array of strings), categories (array of strings), pattern (string: recurring|escalating|co-occurring|seasonal|triggered), confidence (float 0-1), suggestedRootCause (optional string).
3. **timelineAnalysis** (object): phases (array of objects: {period (string), issueIds (array of ints), description (string), moodTrend (string: declining|improving|stable|volatile), keyEvents (array of strings)}), moodCorrelation (optional string), escalationTrend (string: improving|worsening|stable|cyclical), criticalPeriods (array of strings). Focus timeline on the trigger issue's evolution.
4. **familySystemInsights** (array of objects): {insight (string), involvedMemberIds (array of ints), involvedMemberNames (array of strings), evidenceIssueIds (array of ints), systemicPattern (optional string), actionable (bool)}. Prioritize insights related to the trigger issue.
5. **priorityRecommendations** (array of objects): {rank (int), issueId (optional int), issueTitle (optional string), rationale (string), urgency (string: immediate|short_term|long_term), suggestedApproach (string), relatedResearchIds (optional array of ints)}. The FIRST recommendation (rank 1) MUST address the trigger issue directly.
6. **researchRelevance** (array of objects): {patternClusterName (string), relevantResearchIds (array of ints), relevantResearchTitles (array of strings), coverageGaps (array of strings)}.
7. **parentAdvice** (array of objects): Practical, evidence-based parenting advice linked to the analysis above. Generate 3-7 items. The FIRST item MUST address the trigger issue directly. Each has: title (string), advice (string), targetIssueIds (array of ints), targetIssueTitles (array of strings), relatedPatternCluster (optional string), relatedResearchIds (optional array of ints), relatedResearchTitles (optional array of strings), ageAppropriate (bool), developmentalContext (optional string), priority (string: immediate|short_term|long_term), concreteSteps (array of strings).

IMPORTANT: Every field annotated as "array of" MUST be a JSON array, even when there is only one item. For example: coverageGaps must be ["single gap"], NOT "single gap".

Write the analysis in the same language as the majority of the input data.`
      : `## Instructions

Analyze all the data above and produce a structured JSON analysis with these fields:

1. **summary** (string)
2. **patternClusters** (array of objects)
3. **timelineAnalysis** (object)
4. **familySystemInsights** (array of objects)
5. **priorityRecommendations** (array of objects)
6. **researchRelevance** (array of objects)
7. **parentAdvice** (array of objects)

IMPORTANT: Every field annotated as "array of" MUST be a JSON array, even when there is only one item.

Write the analysis in the same language as the majority of the input data.`;
    sections.push(instructionsTrigger);

    if (inputData.language === "ro") {
      sections.unshift(ROMANIAN_INSTRUCTION);
    }

    const prompt = sections.join("\n\n");

    const dataSnapshot = {
      issueCount: issues.length,
      observationCount: observations.length,
      journalEntryCount: journals.length,
      contactFeedbackCount: contactFbs.length,
      teacherFeedbackCount: teacherFbs.length,
      researchPaperCount: research.length,
      relatedMemberIssueCount: relatedIssues.length,
      issueContactCount: issueContacts.length,
    };

    return { ...base, prompt, dataSnapshot };
  },
});

const analyze = createStep({
  id: "analyze",
  inputSchema: collectedSchema,
  outputSchema: analyzedSchema,
  execute: async ({ inputData }) => {
    if (inputData.error) return { ...inputData };

    try {
      const { object } = await generateObject({
        schema: deepAnalysisSchema,
        prompt: inputData.prompt,
        temperature: 0.3,
        max_tokens: 8192,
      });
      return { ...inputData, analysis: object as unknown as Record<string, unknown> };
    } catch (exc) {
      const msg = exc instanceof Error ? exc.message : String(exc);
      return { ...inputData, error: `analyze failed: ${msg}` };
    }
  },
});

const persist = createStep({
  id: "persist",
  inputSchema: analyzedSchema,
  outputSchema,
  execute: async ({ inputData }) => {
    if (inputData.error || !inputData.analysis) {
      return { error: inputData.error };
    }
    try {
      const a = inputData.analysis as z.infer<typeof deepAnalysisSchema>;
      const id = await createDeepIssueAnalysis({
        familyMemberId: inputData.familyMemberId,
        triggerIssueId: inputData.triggerIssueId,
        userId: inputData.userEmail,
        summary: a.summary ?? "",
        patternClusters: a.patternClusters ?? [],
        timelineAnalysis: a.timelineAnalysis ?? {},
        familySystemInsights: a.familySystemInsights ?? [],
        priorityRecommendations: a.priorityRecommendations ?? [],
        researchRelevance: a.researchRelevance ?? [],
        parentAdvice: a.parentAdvice ?? [],
        dataSnapshot: inputData.dataSnapshot,
      });
      return { analysis_id: id };
    } catch (exc) {
      const msg = exc instanceof Error ? exc.message : String(exc);
      return { error: `persist failed: ${msg}` };
    }
  },
});

export const deepAnalysisWorkflow = createWorkflow({
  id: "deep_analysis",
  inputSchema,
  outputSchema,
})
  .then(collectData)
  .then(analyze)
  .then(persist)
  .commit();
