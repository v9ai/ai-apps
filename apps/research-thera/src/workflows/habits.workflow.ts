import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { sql as neonSql } from "@/src/db/neon";
import { createHabit } from "@/src/db";
import { generateObject } from "@/src/lib/deepseek";
import { ROMANIAN_INSTRUCTION } from "@/src/lib/ro";

const habitInputSchema = z.object({
  family_member_id: z.number().int().optional(),
  issue_id: z.number().int().optional(),
  user_email: z.string().email(),
  count: z.number().int().min(1).max(20).default(5),
  language: z.enum(["en", "ro"]).default("en"),
});

const habitSchema = z.object({
  title: z.string().max(120),
  description: z.string().nullable().optional(),
  frequency: z.enum(["daily", "weekly"]).default("daily"),
  targetCount: z.number().int().min(1).max(10).default(1),
});

const habitOutputSchema = z.object({
  habits: z.array(
    habitSchema.extend({ id: z.number().int() }),
  ),
  error: z.string().optional(),
});

const collectedSchema = z.object({
  prompt: z.string(),
  resolvedFamilyMemberId: z.number().int().nullable(),
  issueId: z.number().int().nullable(),
  userEmail: z.string(),
  count: z.number().int(),
  error: z.string().optional(),
});

const generatedSchema = collectedSchema.extend({
  habits: z.array(habitSchema),
});

const collectData = createStep({
  id: "collect_data",
  inputSchema: habitInputSchema,
  outputSchema: collectedSchema,
  execute: async ({ inputData }) => {
    const { user_email, count } = inputData;
    const issueId = inputData.issue_id ?? null;
    let resolvedFamilyMemberId = inputData.family_member_id ?? null;

    if (!issueId && !resolvedFamilyMemberId) {
      return {
        prompt: "",
        resolvedFamilyMemberId: null,
        issueId,
        userEmail: user_email,
        count,
        error: "Either issue_id or family_member_id is required",
      };
    }

    let focalIssueContext = "";
    if (issueId) {
      const issueRows = await neonSql`
        SELECT id, title, description, category, severity, recommendations, family_member_id
        FROM issues WHERE id = ${issueId} AND user_id = ${user_email}
      `;
      if (issueRows.length === 0) {
        return {
          prompt: "",
          resolvedFamilyMemberId: null,
          issueId,
          userEmail: user_email,
          count,
          error: `Issue ${issueId} not found`,
        };
      }
      const issue = issueRows[0];
      if (!resolvedFamilyMemberId && issue.family_member_id) {
        resolvedFamilyMemberId = issue.family_member_id as number;
      }
      const recs: string[] = issue.recommendations
        ? JSON.parse(issue.recommendations as string)
        : [];
      const focalLines = [
        `Title: ${issue.title}`,
        `Category: ${issue.category}`,
        `Severity: ${issue.severity}`,
      ];
      if (issue.description) {
        focalLines.push(`Description: ${(issue.description as string).slice(0, 400)}`);
      }
      if (recs.length > 0) {
        focalLines.push("Existing recommendations:");
        for (const r of recs.slice(0, 5)) focalLines.push(`  - ${r}`);
      }

      const researchRows = await neonSql`
        SELECT title, key_findings, therapeutic_techniques FROM therapy_research
        WHERE issue_id = ${issueId} ORDER BY relevance_score DESC LIMIT 5
      `;
      if (researchRows.length > 0) {
        focalLines.push("Related research:");
        for (const r of researchRows) {
          focalLines.push(`  Paper: ${r.title}`);
          const kf: string[] = r.key_findings ? JSON.parse(r.key_findings as string) : [];
          if (kf.length > 0) focalLines.push(`    Key findings: ${kf.slice(0, 2).join("; ")}`);
          const tt: string[] = r.therapeutic_techniques ? JSON.parse(r.therapeutic_techniques as string) : [];
          if (tt.length > 0) focalLines.push(`    Techniques: ${tt.slice(0, 3).join("; ")}`);
        }
      }
      focalIssueContext = focalLines.join("\n");
    }

    let profileContext = "";
    let goalsContext = "";
    let otherIssuesContext = "";
    let charsContext = "";
    let existingHabits: string[] = [];

    if (resolvedFamilyMemberId) {
      const fmRows = await neonSql`
        SELECT first_name, age_years, date_of_birth, relationship, bio
        FROM family_members WHERE id = ${resolvedFamilyMemberId} AND user_id = ${user_email}
      `;
      if (fmRows.length > 0) {
        const fm = fmRows[0];
        const parts = [`Name: ${fm.first_name}`];
        if (fm.age_years) parts.push(`Age: ${fm.age_years} years old`);
        if (fm.date_of_birth) parts.push(`Date of birth: ${fm.date_of_birth}`);
        if (fm.relationship) parts.push(`Relationship: ${fm.relationship}`);
        if (fm.bio) parts.push(`Bio: ${(fm.bio as string).slice(0, 200)}`);
        profileContext = parts.join("\n");
      }

      const goalRows = await neonSql`
        SELECT title, description, priority FROM goals
        WHERE family_member_id = ${resolvedFamilyMemberId} AND user_id = ${user_email} AND status = 'active'
        ORDER BY created_at DESC LIMIT 6
      `;
      if (goalRows.length > 0) {
        goalsContext = goalRows
          .map((r) => {
            const head = `- [${String(r.priority).toUpperCase()}] ${r.title}`;
            return r.description ? `${head}: ${(r.description as string).slice(0, 100)}` : head;
          })
          .join("\n");
      }

      const otherIssueRows = issueId
        ? await neonSql`
            SELECT title, category, severity FROM issues
            WHERE family_member_id = ${resolvedFamilyMemberId} AND user_id = ${user_email} AND id != ${issueId}
            ORDER BY created_at DESC LIMIT 8
          `
        : await neonSql`
            SELECT title, category, severity FROM issues
            WHERE family_member_id = ${resolvedFamilyMemberId} AND user_id = ${user_email}
            ORDER BY created_at DESC LIMIT 8
          `;
      if (otherIssueRows.length > 0) {
        otherIssuesContext = otherIssueRows
          .map((r) => `- [${String(r.severity).toUpperCase()}] ${r.title} (${r.category})`)
          .join("\n");
      }

      const charRows = await neonSql`
        SELECT title, category, severity FROM family_member_characteristics
        WHERE family_member_id = ${resolvedFamilyMemberId} AND user_id = ${user_email} LIMIT 8
      `;
      if (charRows.length > 0) {
        charsContext = charRows
          .map((r) => {
            const head = `- ${r.title} (${r.category})`;
            return r.severity ? `${head} — ${r.severity}` : head;
          })
          .join("\n");
      }

      const existingRows = await neonSql`
        SELECT title FROM habits
        WHERE family_member_id = ${resolvedFamilyMemberId} AND user_id = ${user_email} AND status = 'active'
      `;
      existingHabits = existingRows.map((r) => r.title as string);
    }

    const focusIntro = issueId && focalIssueContext
      ? `You are a therapeutic habit coach. Generate personalized, evidence-based habits specifically designed to address the following issue. Create exactly ${count} habits that directly target the root causes and symptoms of this issue.`
      : `You are a therapeutic habit coach. Generate personalized, evidence-based habits for the following person. Create exactly ${count} distinct habits tailored to their specific goals, issues, and characteristics.`;

    const directive = focalIssueContext
      ? "directly address the Target Issue above"
      : "address the person's goals and challenges";

    const parts: string[] = [focusIntro, ""];
    if (focalIssueContext) parts.push("## Target Issue (PRIMARY FOCUS)", focalIssueContext, "");
    if (profileContext) parts.push("## Person Profile", profileContext, "");
    if (goalsContext) parts.push("## Active Therapeutic Goals", goalsContext, "");
    if (otherIssuesContext) parts.push("## Other Known Issues (context only)", otherIssuesContext, "");
    if (charsContext) parts.push("## Characteristics", charsContext, "");
    if (existingHabits.length > 0) {
      parts.push(
        "## Already Tracking (do NOT suggest these again)",
        existingHabits.map((h) => `- ${h}`).join("\n"),
        "",
      );
    }
    parts.push(
      "## Instructions",
      `Generate exactly ${count} habit suggestions that:`,
      `- ${directive}`,
      "- Are age-appropriate and realistic",
      "- Mix daily (most) and weekly habits",
      "- Have a target count of 1 unless repetition clearly helps (e.g. breathing exercises ×3)",
      "- Are specific and actionable (not vague like 'be more positive')",
      "- Do NOT duplicate any existing habits listed above",
      "",
      "Respond with a JSON object:",
      '{"habits": [',
      '  {"title": "...", "description": "...", "frequency": "daily" or "weekly", "targetCount": 1-5}',
      "]}",
      "",
      "Keep titles concise (3-6 words). Descriptions explain the therapeutic benefit (1-2 sentences).",
    );

    if (inputData.language === "ro") {
      parts.unshift(ROMANIAN_INSTRUCTION, "");
    }

    return {
      prompt: parts.join("\n"),
      resolvedFamilyMemberId,
      issueId,
      userEmail: user_email,
      count,
    };
  },
});

const generate = createStep({
  id: "generate",
  inputSchema: collectedSchema,
  outputSchema: generatedSchema,
  execute: async ({ inputData }) => {
    if (inputData.error) return { ...inputData, habits: [] };

    const { object } = await generateObject({
      schema: z.object({ habits: z.array(habitSchema) }),
      prompt: inputData.prompt,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const normalised = object.habits
      .filter((h) => h && h.title)
      .slice(0, inputData.count)
      .map((h) => {
        const freq: "daily" | "weekly" = h.frequency === "weekly" ? "weekly" : "daily";
        return {
          title: h.title.slice(0, 120),
          description: h.description ? h.description.slice(0, 400) : null,
          frequency: freq,
          targetCount: Math.max(1, Math.min(h.targetCount ?? 1, 10)),
        };
      });

    if (normalised.length === 0) {
      return { ...inputData, habits: [], error: "No valid habits in DeepSeek response" };
    }
    return { ...inputData, habits: normalised };
  },
});

const persist = createStep({
  id: "persist",
  inputSchema: generatedSchema,
  outputSchema: habitOutputSchema,
  execute: async ({ inputData }) => {
    if (inputData.error || inputData.habits.length === 0) {
      return { habits: [], error: inputData.error };
    }

    const inserted: Array<z.infer<typeof habitSchema> & { id: number }> = [];
    for (const h of inputData.habits) {
      const id = await createHabit({
        userId: inputData.userEmail,
        familyMemberId: inputData.resolvedFamilyMemberId ?? null,
        issueId: inputData.issueId ?? null,
        title: h.title,
        description: h.description ?? null,
        frequency: h.frequency,
        targetCount: h.targetCount,
      });
      inserted.push({ ...h, id });
    }
    return { habits: inserted };
  },
});

export const habitsWorkflow = createWorkflow({
  id: "habits",
  inputSchema: habitInputSchema,
  outputSchema: habitOutputSchema,
})
  .then(collectData)
  .then(generate)
  .then(persist)
  .commit();
