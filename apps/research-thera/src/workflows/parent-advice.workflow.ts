import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { sql as neonSql } from "@/src/db/neon";
import { saveParentAdvice } from "@/src/db";
import { generateObject } from "@/src/lib/deepseek";

const inputSchema = z.object({
  goal_id: z.number().int(),
  user_email: z.string().email(),
  language: z.string().default("English"),
});

const outputSchema = z.object({
  advice: z.string().optional(),
  error: z.string().optional(),
});

const collectedSchema = z.object({
  goalId: z.number().int(),
  userEmail: z.string(),
  language: z.string(),
  prompt: z.string(),
  error: z.string().optional(),
});

const generatedSchema = collectedSchema.extend({
  advice: z.string().optional(),
});

const collectData = createStep({
  id: "collect_data",
  inputSchema,
  outputSchema: collectedSchema,
  execute: async ({ inputData }) => {
    const { goal_id, user_email, language } = inputData;
    const base = { goalId: goal_id, userEmail: user_email, language };

    const goalRows = await neonSql`
      SELECT id, title, description, family_member_id
      FROM goals WHERE id = ${goal_id} AND user_id = ${user_email}
    `;
    if (goalRows.length === 0) {
      return { ...base, prompt: "", error: `Goal ${goal_id} not found` };
    }
    const goal = goalRows[0];
    const familyMemberId = goal.family_member_id as number | null;

    const researchRows = await neonSql`
      SELECT title, authors, year, evidence_level, relevance_score, abstract, key_findings, therapeutic_techniques
      FROM therapy_research WHERE goal_id = ${goal_id}
      ORDER BY relevance_score DESC LIMIT 10
    `;
    if (researchRows.length === 0) {
      return {
        ...base,
        prompt: "",
        error: "No research found for this goal. Generate research first.",
      };
    }

    let childContext = "";
    let issuesContext = "";
    let deepAnalysisContext = "";

    if (familyMemberId) {
      const fmRows = await neonSql`
        SELECT first_name, age_years, date_of_birth, relationship
        FROM family_members WHERE id = ${familyMemberId}
      `;
      if (fmRows.length > 0) {
        const fm = fmRows[0];
        const parts = [`Name: ${fm.first_name}`];
        if (fm.age_years) parts.push(`Age: ${fm.age_years} years old`);
        if (fm.date_of_birth) parts.push(`Date of birth: ${fm.date_of_birth}`);
        if (fm.relationship) parts.push(`Relationship: ${fm.relationship}`);
        childContext = parts.join("\n");
      }

      const issueRows = await neonSql`
        SELECT title, category, severity, description FROM issues
        WHERE family_member_id = ${familyMemberId} AND user_id = ${user_email}
        ORDER BY created_at DESC LIMIT 10
      `;
      if (issueRows.length > 0) {
        issuesContext = issueRows
          .map((r) => {
            const desc = r.description ? (r.description as string).slice(0, 200) : "";
            return `- [${String(r.severity ?? "").toUpperCase()}] ${r.title} (${r.category}): ${desc}`;
          })
          .join("\n");
      }

      const daRows = await neonSql`
        SELECT summary, priority_recommendations, pattern_clusters, family_system_insights
        FROM deep_issue_analyses
        WHERE family_member_id = ${familyMemberId} AND user_id = ${user_email}
        ORDER BY created_at DESC LIMIT 1
      `;
      if (daRows.length > 0) {
        const da = daRows[0];
        const daParts = [`### Executive Summary\n${da.summary}`];

        const recs = da.priority_recommendations
          ? JSON.parse(da.priority_recommendations as string)
          : [];
        if (recs.length > 0) {
          const recsText = recs
            .slice(0, 5)
            .map(
              (r: Record<string, unknown>) =>
                `${r.rank ?? ""}. [${r.urgency ?? ""}] ${r.issueTitle ?? "General"}: ${r.rationale ?? ""}\n   Approach: ${r.suggestedApproach ?? ""}`,
            )
            .join("\n");
          daParts.push(`### Priority Recommendations from Deep Analysis\n${recsText}`);
        }

        const clusters = da.pattern_clusters
          ? JSON.parse(da.pattern_clusters as string)
          : [];
        if (clusters.length > 0) {
          const clustersText = clusters
            .map((c: Record<string, unknown>) => {
              const base = `- "${c.name ?? ""}" (${c.pattern ?? ""}): ${c.description ?? ""}`;
              return c.suggestedRootCause ? `${base} | Root cause: ${c.suggestedRootCause}` : base;
            })
            .join("\n");
          daParts.push(`### Identified Behavioral Patterns\n${clustersText}`);
        }

        const insights = da.family_system_insights
          ? JSON.parse(da.family_system_insights as string)
          : [];
        const actionable = insights
          .filter((i: Record<string, unknown>) => i.actionable)
          .map((i: Record<string, unknown>) => i.insight as string);
        if (actionable.length > 0) {
          daParts.push(
            `### Actionable Family System Insights\n${actionable.map((i: string) => `- ${i}`).join("\n")}`,
          );
        }

        deepAnalysisContext = daParts.join("\n\n");
      }
    }

    const researchLines = researchRows.map((r, idx) => {
      const lines = [`[${idx + 1}] "${r.title}"`];
      const authors: string[] = r.authors ? JSON.parse(r.authors as string) : [];
      if (authors.length > 0) lines.push(`  Authors: ${authors.join(", ")}`);
      if (r.year) lines.push(`  Year: ${r.year}`);
      if (r.evidence_level) lines.push(`  Evidence level: ${r.evidence_level}`);
      if (r.relevance_score) lines.push(`  Relevance: ${r.relevance_score}`);
      if (r.abstract) lines.push(`  Abstract: ${(r.abstract as string).slice(0, 400)}`);
      const kf: string[] = r.key_findings ? JSON.parse(r.key_findings as string) : [];
      if (kf.length > 0) lines.push(`  Key findings: ${kf.join("; ")}`);
      const tt: string[] = r.therapeutic_techniques
        ? JSON.parse(r.therapeutic_techniques as string)
        : [];
      if (tt.length > 0) lines.push(`  Therapeutic techniques: ${tt.join("; ")}`);
      return lines.join("\n");
    });

    const researchContext = researchLines.join("\n\n");
    const researchCount = researchRows.length;

    const parts: string[] = [
      "You are a child development and parenting expert. Generate practical, evidence-based parenting advice that is STRICTLY GROUNDED in the research papers and deep analysis provided below.",
      "",
      "## Goal",
      `Title: ${goal.title}`,
    ];
    if (goal.description) parts.push(`Description: ${goal.description}`);
    parts.push("");

    if (childContext) parts.push(`## Child Profile\n${childContext}`);
    if (issuesContext) parts.push(`## Known Issues\n${issuesContext}`);
    parts.push("");

    parts.push(`## Research Evidence (${researchCount} papers)`);
    parts.push(researchContext);
    parts.push("");

    if (deepAnalysisContext) {
      parts.push(`## Deep Analysis (LangGraph)\n${deepAnalysisContext}`);
      parts.push("");
    }

    parts.push(
      "## Instructions",
      `Write comprehensive parenting advice (800-1500 words) in ${language}.`,
      "",
      "CRITICAL GROUNDING RULES:",
      "- Every piece of advice MUST trace back to a specific research paper listed above",
      "- Cite papers using their EXACT title and authors as shown above (e.g. 'According to Roberts and Kim (2023) in their systematic review...')",
      "- Do NOT paraphrase or invent paper titles — use the exact titles from the ## Research Evidence section",
      "- Do NOT cite any papers or authors that are not listed in the ## Research Evidence section above",
      "- Only recommend therapeutic techniques that appear in the 'Therapeutic techniques' list of a paper above",
      "- If the deep analysis identified specific patterns or root causes, address those directly",
      "- If the deep analysis has priority recommendations, translate those into parent-friendly language",
      "",
      "STRUCTURE:",
      "- Start with a brief empathetic introduction acknowledging the parent's situation",
      "- For each recommendation, explain the research basis, then give concrete at-home steps",
      "- Use the therapeutic techniques from the research papers as the backbone of your advice",
      "- Include specific examples and scenarios grounded in the child's known issues",
      "- End with guidance on when to seek additional professional support",
      "",
      "AGE-APPROPRIATENESS:",
      "- All recommendations must be appropriate for the child's actual age",
      "- Verify the child's date of birth year matches the stated age",
      "- Do not suggest interventions designed for a different age group",
      "",
      'Respond with a JSON object: {"advice": "<your full advice text>"}',
    );

    return { ...base, prompt: parts.join("\n") };
  },
});

const generate = createStep({
  id: "generate",
  inputSchema: collectedSchema,
  outputSchema: generatedSchema,
  execute: async ({ inputData }) => {
    if (inputData.error) return { ...inputData };

    try {
      const { object } = await generateObject({
        schema: z.object({ advice: z.string() }).passthrough(),
        prompt: inputData.prompt,
        temperature: 0.4,
        max_tokens: 8192,
      });

      let advice = (object as { advice?: string }).advice;
      if (!advice) {
        for (const v of Object.values(object as Record<string, unknown>)) {
          if (typeof v === "string" && v.length > 100) {
            advice = v;
            break;
          }
        }
      }

      if (!advice) {
        return { ...inputData, error: "DeepSeek returned no advice field" };
      }
      return { ...inputData, advice };
    } catch (exc) {
      const msg = exc instanceof Error ? exc.message : String(exc);
      return { ...inputData, error: `generate failed: ${msg}` };
    }
  },
});

const persist = createStep({
  id: "persist",
  inputSchema: generatedSchema,
  outputSchema,
  execute: async ({ inputData }) => {
    if (inputData.error || !inputData.advice) {
      return { advice: undefined, error: inputData.error };
    }
    try {
      await saveParentAdvice(
        inputData.goalId,
        inputData.userEmail,
        inputData.advice,
        inputData.language,
      );
    } catch (exc) {
      const msg = exc instanceof Error ? exc.message : String(exc);
      return { advice: inputData.advice, error: `persist failed: ${msg}` };
    }
    return { advice: inputData.advice };
  },
});

export const parentAdviceWorkflow = createWorkflow({
  id: "parent_advice",
  inputSchema,
  outputSchema,
})
  .then(collectData)
  .then(generate)
  .then(persist)
  .commit();
