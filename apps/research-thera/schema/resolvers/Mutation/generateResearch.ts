import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import { sql as neonSql } from "@/src/db/neon";
import { runGraphAndWait } from "@/src/lib/langgraph-client";
import { generateObject } from "@/src/lib/deepseek";
import { z } from "zod";

const EVIDENCE_WEIGHTS: Record<string, number> = {
  "meta-analysis": 1.0,
  meta_analysis: 1.0,
  systematic_review: 0.9,
  "systematic-review": 0.9,
  rct: 0.8,
  cohort: 0.6,
  case_control: 0.5,
  "case-control": 0.5,
  case_series: 0.35,
  "case-series": 0.35,
  case_study: 0.2,
  "case-study": 0.2,
  expert_opinion: 0.1,
};

function parseJsonField(value: unknown): string[] {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

async function runResearchEvals(
  issueId: number | undefined,
  feedbackId: number | undefined,
  goalId: number | undefined,
  prompt: string,
  hasRelatedMember: boolean,
): Promise<Record<string, number | string>> {
  const rows = issueId
    ? await neonSql`SELECT title, abstract, key_findings, therapeutic_techniques, evidence_level FROM therapy_research WHERE issue_id = ${issueId} ORDER BY relevance_score DESC LIMIT 10`
    : feedbackId
      ? await neonSql`SELECT title, abstract, key_findings, therapeutic_techniques, evidence_level FROM therapy_research WHERE feedback_id = ${feedbackId} ORDER BY relevance_score DESC LIMIT 10`
      : await neonSql`SELECT title, abstract, key_findings, therapeutic_techniques, evidence_level FROM therapy_research WHERE goal_id = ${goalId} ORDER BY relevance_score DESC LIMIT 10`;

  if (!rows.length) return { error: "no papers found" };

  // Deterministic evidence quality score
  const evidenceQuality =
    rows.reduce((sum, r) => sum + (EVIDENCE_WEIGHTS[r.evidence_level as string] ?? 0.3), 0) /
    rows.length;

  // LLM-based relevance, actionability, and family dynamics scoring
  const papersText = rows
    .map((r, i) => {
      const kf = parseJsonField(r.key_findings).slice(0, 3).join("; ");
      const tt = parseJsonField(r.therapeutic_techniques).slice(0, 3).join("; ");
      const abstract = ((r.abstract as string) || "").slice(0, 200);
      return `[${i + 1}] ${r.title}\nAbstract: ${abstract}\nKey findings: ${kf}\nTechniques: ${tt}`;
    })
    .join("\n\n");

  const evalSchema = z.object({
    relevance: z
      .number()
      .min(0)
      .max(1)
      .describe("How relevant are the papers to the clinical topic (0-1)"),
    actionability: z
      .number()
      .min(0)
      .max(1)
      .describe("How actionable are the therapeutic techniques for a practicing therapist (0-1)"),
    familyDynamicsCoverage: z
      .number()
      .min(0)
      .max(1)
      .describe("How well do the papers address family and relational dynamics (0-1)"),
    rationale: z.string().describe("2-3 sentence summary of the evaluation"),
  });

  const evalPrompt = [
    `You are evaluating research papers curated for a therapy case.`,
    ``,
    `## Clinical Context`,
    prompt.slice(0, 800),
    ``,
    `## Papers Found (${rows.length})`,
    papersText,
    ``,
    `Score this research collection (0-1 each):`,
    `- relevance: how well papers match the clinical topic`,
    `- actionability: how actionable the techniques are for a practicing therapist`,
    hasRelatedMember
      ? `- familyDynamicsCoverage: how well papers address family and relational dynamics (important: a related family member is involved)`
      : `- familyDynamicsCoverage: set to 0 since no related family member is involved`,
    `- rationale: brief 2-3 sentence summary`,
    ``,
    `Be honest: if papers are tangential, score low. If evidence is strong and directly applicable, score high.`,
  ]
    .filter(Boolean)
    .join("\n");

  const { object } = await generateObject({

    schema: evalSchema,
    prompt: evalPrompt,
  });

  const components = [object.relevance, object.actionability, evidenceQuality];
  if (hasRelatedMember) components.push(object.familyDynamicsCoverage);
  const overall = components.reduce((a, b) => a + b, 0) / components.length;

  const scores: Record<string, number | string> = {
    relevance: Math.round(object.relevance * 100) / 100,
    actionability: Math.round(object.actionability * 100) / 100,
    evidenceQuality: Math.round(evidenceQuality * 100) / 100,
    overall: Math.round(overall * 100) / 100,
    rationale: object.rationale,
    paperCount: rows.length,
  };
  if (hasRelatedMember) {
    scores.familyDynamicsCoverage = Math.round(object.familyDynamicsCoverage * 100) / 100;
  }

  return scores;
}

export const generateResearch: NonNullable<MutationResolvers['generateResearch']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId ?? undefined;
  const issueId = args.issueId ?? undefined;
  const feedbackId = args.feedbackId ?? undefined;

  // Verify the goal exists and belongs to the user (only when goalId is provided)
  if (goalId) {
    await db.getGoal(goalId, userEmail);
  }

  // Clean up any stale RUNNING jobs (stuck > 15 min) before creating a new one
  await db.cleanupStaleJobs(15);

  // Create a tracking job (inserted with status='RUNNING')
  const jobId = crypto.randomUUID();
  await db.createGenerationJob(jobId, userEmail, "RESEARCH", goalId);

  // Build prompt from goal, issue, or feedback context
  let prompt: string;
  let relatedFamilyMember: Awaited<ReturnType<typeof db.getFamilyMember>> | null = null;
  if (feedbackId) {
    const feedback = await db.getContactFeedback(feedbackId, userEmail);
    if (!feedback) throw new Error("Feedback not found");
    let feedbackSiblingSection = "";
    if (feedback.familyMemberId) {
      const allIssues = await db.getIssuesForFamilyMember(feedback.familyMemberId, undefined, userEmail);
      feedbackSiblingSection = buildSiblingIssuesSection(allIssues);
    }
    prompt = [
      `Find evidence-based therapeutic research for the following clinical feedback:`,
      ``,
      `feedback_id: ${feedbackId}`,
      `Subject: ${feedback.subject}`,
      `Content: ${feedback.content}`,
      feedback.tags ? `Tags: ${feedback.tags}` : "",
      feedbackSiblingSection,
      ``,
      `Search for academic papers that address the issues described.`,
      `Focus on evidence-based interventions, therapeutic techniques, and outcome measures.`,
      ``,
      `IMPORTANT: When calling save_research_papers, use feedback_id: ${feedbackId} — do NOT use issue_id.`,
    ].filter(Boolean).join("\n");
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

    prompt = [
      `Find evidence-based therapeutic research for the following clinical issue:`,
      ``,
      `issue_id: ${issueId}`,
      `Title: ${issue.title}`,
      `Category: ${issue.category}`,
      `Severity: ${issue.severity}`,
      issue.description ? `Description: ${issue.description}` : "",
      issue.recommendations ? `Recommendations: ${issue.recommendations}` : "",
      ``,
      primaryMember
        ? `Primary person: ${primaryMember.firstName}${primaryMember.name ? ` ${primaryMember.name}` : ""}${primaryMember.ageYears ? `, age ${primaryMember.ageYears}` : ""}${primaryMember.relationship ? ` (${primaryMember.relationship})` : ""}`
        : "",
      relatedMember
        ? `Also involves: ${relatedMember.firstName}${relatedMember.name ? ` ${relatedMember.name}` : ""}${relatedMember.ageYears ? `, age ${relatedMember.ageYears}` : ""}${relatedMember.relationship ? ` (${relatedMember.relationship})` : ""}`
        : "",
      issueSiblingSection,
      ``,
      `Search for academic papers that address this issue, considering the relational and family dynamics involved.`,
      `Focus on evidence-based interventions, therapeutic techniques, and outcome measures.`,
      ``,
      `IMPORTANT: When calling save_research_papers, use issue_id: ${issueId} — do NOT use feedback_id.`,
    ].filter(Boolean).join("\n");
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
          memberContext = `Patient: ${fm.firstName}${fm.name ? ` ${fm.name}` : ""}${fm.ageYears ? `, age ${fm.ageYears}` : ""}${fm.relationship ? ` (${fm.relationship})` : ""}`;
        }
      } catch { /* non-fatal */ }
    }
    prompt = [
      `Find evidence-based therapeutic research for the following goal:`,
      ``,
      `goal_id: ${goalId}`,
      `Title: ${goal.title}`,
      goal.description ? `Description: ${goal.description}` : "",
      memberContext,
      ``,
      `IMPORTANT: If the goal title is NOT in English, first translate it to English before searching.`,
      `For example, "Creste rezistenta la frustrare" (Romanian) = "Increase frustration tolerance".`,
      `Use the TRANSLATED English terms as your search queries.`,
      goalSiblingSection,
      ``,
      `Search for academic papers that support this therapeutic goal.`,
      `Focus on evidence-based interventions, therapeutic techniques, and outcome measures.`,
      `Only save papers with real abstracts (not "None", "...", or empty). Skip papers lacking abstracts.`,
      ``,
      `IMPORTANT: When calling save_research_papers, use goal_id: ${goalId} — do NOT use issue_id or feedback_id.`,
    ].filter(Boolean).join("\n");
  } else {
    throw new Error("Either goalId, issueId, or feedbackId is required");
  }

  const hasRelatedMember = relatedFamilyMember !== null;

  // Fire-and-forget: run LangGraph agent in background, update job on completion
  runGraphAndWait("research", {
    input: {
      messages: [{ role: "user", content: prompt }],
    },
  }).then(async (result) => {
    const messages = result?.messages as
      | Array<{ content: string; type?: string }>
      | undefined;
    const lastAiMessage = messages
      ?.filter((m) => m.type === "ai" && m.content)
      .pop();
    const output = lastAiMessage?.content || "";
    const count = messages?.filter((m) => m.type === "ai").length ?? 0;

    let evals: Record<string, number | string> | undefined;
    try {
      evals = await runResearchEvals(issueId, feedbackId, goalId, prompt, hasRelatedMember);
    } catch (evalErr) {
      console.error("[generateResearch] Eval error:", evalErr);
    }

    await db.updateGenerationJob(jobId, {
      status: "SUCCEEDED",
      progress: 100,
      result: JSON.stringify({ count, output, ...(evals ? { evals } : {}) }),
    });
  }).catch(async (err) => {
    const message = err instanceof Error ? err.message : "LangGraph agent failed";
    console.error("[generateResearch] LangGraph error:", message);
    await db.updateGenerationJob(jobId, {
      status: "FAILED",
      error: JSON.stringify({ message }),
    });
  });

  return {
    success: true,
    message: "Research generation started via LangGraph",
    jobId,
  };
};
