import { createClient } from "@/lib/supabase/server";
import { runAttacker, runDefender, runJudge, runCitationVerifier, runJurisdictionExpert, runBriefRewriter } from "./runner";
import type { JudgeOutput, RoundContext } from "./types";

export type StressTestEvent =
  | { type: "round_start"; round: number }
  | { type: "attacker_complete"; round: number; attackCount: number }
  | { type: "defender_complete"; round: number; rebuttalCount: number }
  | { type: "judge_complete"; round: number; findingCount: number; score: number }
  | { type: "citation_verifier_complete"; citationCount: number; fabricationRisk: number }
  | { type: "jurisdiction_expert_complete"; issueCount: number; fitness: number }
  | { type: "brief_rewriter_complete"; changeCount: number; improvementScore: number }
  | { type: "session_complete"; overallScore: number }
  | { type: "error"; message: string };

export type EventEmitter = (event: StressTestEvent) => void;

export async function runStressTest(
  sessionId: string,
  emit?: EventEmitter,
) {
  const supabase = await createClient();

  // Fetch session
  const { data: stressSession, error: sessionError } = await supabase
    .from("stress_test_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !stressSession) {
    throw new Error("Session not found");
  }

  const briefText = stressSession.brief_text;
  if (!briefText) {
    throw new Error("No brief text available. Paste text or upload a document.");
  }

  const maxRounds = (stressSession.config as { max_rounds?: number })?.max_rounds ?? 3;

  // Set status to running
  await supabase
    .from("stress_test_sessions")
    .update({ status: "running" })
    .eq("id", sessionId);

  await writeAudit(supabase, sessionId, "system", "session_started", null, `Starting ${maxRounds}-round analysis`);

  const previousFindings: JudgeOutput[] = [];
  let lastScore = 0;

  try {
    for (let round = 1; round <= maxRounds; round++) {
      emit?.({ type: "round_start", round });

      const ctx: RoundContext = {
        brief: briefText,
        jurisdiction: stressSession.jurisdiction ?? undefined,
        round,
        previousFindings,
      };

      // Attacker
      const attacks = await runAttacker(ctx);
      await writeAudit(
        supabase, sessionId, "attacker", "analysis_complete",
        `Round ${round}`,
        `Found ${attacks.attacks.length} weaknesses`,
        round,
      );
      emit?.({ type: "attacker_complete", round, attackCount: attacks.attacks.length });

      // Defender
      const defense = await runDefender(ctx, attacks);
      await writeAudit(
        supabase, sessionId, "defender", "rebuttal_complete",
        `Round ${round}`,
        `Provided ${defense.rebuttals.length} rebuttals`,
        round,
      );
      emit?.({ type: "defender_complete", round, rebuttalCount: defense.rebuttals.length });

      // Judge
      const judgment = await runJudge(ctx, attacks, defense);
      previousFindings.push(judgment);
      lastScore = judgment.overall_score;

      await writeAudit(
        supabase, sessionId, "judge", "judgment_rendered",
        `Round ${round}`,
        `${judgment.findings.length} findings, score: ${judgment.overall_score}`,
        round,
      );
      emit?.({
        type: "judge_complete",
        round,
        findingCount: judgment.findings.length,
        score: judgment.overall_score,
      });

      // Write findings to DB
      for (const finding of judgment.findings) {
        await supabase.from("findings").insert({
          session_id: sessionId,
          type: finding.type,
          severity: finding.severity,
          description: finding.description,
          confidence: finding.confidence,
          suggested_fix: finding.suggested_fix,
          round,
        });
      }

    }

    // Expert agents — run in parallel after adversarial rounds
    const finalCtx: RoundContext = {
      brief: briefText,
      jurisdiction: stressSession.jurisdiction ?? undefined,
      round: maxRounds,
      previousFindings,
    };

    const [citationResult, jurisdictionResult] = await Promise.all([
      runCitationVerifier(finalCtx).catch(() => null),
      runJurisdictionExpert(finalCtx).catch(() => null),
    ]);

    if (citationResult) {
      await writeAudit(
        supabase, sessionId, "citation_verifier", "verification_complete",
        null,
        `${citationResult.citations.length} citations checked, fabrication risk: ${(citationResult.fabrication_risk * 100).toFixed(0)}%`,
      );
      emit?.({
        type: "citation_verifier_complete",
        citationCount: citationResult.citations.length,
        fabricationRisk: citationResult.fabrication_risk,
      });
    }

    if (jurisdictionResult) {
      await writeAudit(
        supabase, sessionId, "jurisdiction_expert", "analysis_complete",
        null,
        `${jurisdictionResult.issues.length} jurisdiction issues, fitness: ${jurisdictionResult.overall_jurisdiction_fitness}/100`,
      );
      emit?.({
        type: "jurisdiction_expert_complete",
        issueCount: jurisdictionResult.issues.length,
        fitness: jurisdictionResult.overall_jurisdiction_fitness,
      });
    }

    // Brief Rewriter — uses judge findings to produce a revised brief
    const lastJudgment = previousFindings[previousFindings.length - 1];
    if (lastJudgment) {
      const rewriteResult = await runBriefRewriter(finalCtx, lastJudgment).catch(() => null);
      if (rewriteResult) {
        await writeAudit(
          supabase, sessionId, "brief_rewriter", "rewrite_complete",
          null,
          `${rewriteResult.changes.length} changes, estimated improvement: ${rewriteResult.improvement_score}/100`,
        );
        emit?.({
          type: "brief_rewriter_complete",
          changeCount: rewriteResult.changes.length,
          improvementScore: rewriteResult.improvement_score,
        });
      }
    }

    // Complete
    await supabase
      .from("stress_test_sessions")
      .update({
        status: "completed",
        overall_score: lastScore,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    await writeAudit(supabase, sessionId, "system", "session_completed", null, `Final score: ${lastScore}`);
    emit?.({ type: "session_complete", overallScore: lastScore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("stress_test_sessions")
      .update({ status: "failed" })
      .eq("id", sessionId);
    await writeAudit(supabase, sessionId, "system", "session_failed", null, message);
    emit?.({ type: "error", message });
    throw err;
  }
}

async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  agent: "attacker" | "defender" | "judge" | "citation_verifier" | "jurisdiction_expert" | "brief_rewriter" | "system",
  action: string,
  inputSummary: string | null,
  outputSummary: string,
  round?: number,
) {
  await supabase.from("audit_trail").insert({
    session_id: sessionId,
    agent,
    action,
    input_summary: inputSummary,
    output_summary: outputSummary,
    round: round ?? null,
  });
}

