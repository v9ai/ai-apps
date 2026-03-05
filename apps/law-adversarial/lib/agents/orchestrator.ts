import { createClient } from "@/lib/supabase/server";
import { runAttacker, runDefender, runJudge } from "./runner";
import {
  createClaim,
  createAttack,
  createSupport,
} from "@/lib/neo4j/argument-graph";
import type { JudgeOutput, RoundContext } from "./types";

export type StressTestEvent =
  | { type: "round_start"; round: number }
  | { type: "attacker_complete"; round: number; attackCount: number }
  | { type: "defender_complete"; round: number; rebuttalCount: number }
  | { type: "judge_complete"; round: number; findingCount: number; score: number }
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

      // Populate Neo4j argument graph
      try {
        await populateGraph(sessionId, round, attacks, defense, judgment);
      } catch {
        // Neo4j is optional — don't fail the pipeline
      }
    }

    // Complete
    await supabase
      .from("stress_test_sessions")
      .update({
        status: "completed",
        overall_score: lastScore,
        completed_at: new Date().toISOString(),
        neo4j_graph_id: sessionId,
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
  agent: "attacker" | "defender" | "judge" | "system",
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

async function populateGraph(
  sessionId: string,
  round: number,
  attacks: { attacks: { claim: string; weakness: string; type: string }[] },
  defense: { rebuttals: { attack_ref: string; defense: string; strength: number }[] },
  judgment: { findings: { description: string; severity: string; confidence: number }[] },
) {
  // Create attacker claim nodes
  const attackNodeIds: string[] = [];
  for (const atk of attacks.attacks) {
    const id = await createClaim({
      text: atk.weakness,
      strength: 0.8,
      confidence: 0.7,
      source_agent: "attacker",
      round,
      session_id: sessionId,
    });
    attackNodeIds.push(id);
  }

  // Create defender claim nodes + ATTACKS edges from defense to attacker claims
  for (let i = 0; i < defense.rebuttals.length; i++) {
    const reb = defense.rebuttals[i];
    const defId = await createClaim({
      text: reb.defense,
      strength: reb.strength,
      confidence: reb.strength,
      source_agent: "defender",
      round,
      session_id: sessionId,
    });

    // Link defender rebuttal to the attacker claim it addresses
    if (attackNodeIds[i]) {
      await createAttack(defId, attackNodeIds[i], {
        strength: reb.strength,
        type: "rebut",
        created_by: "defender",
        round,
      });
    }
  }

  // Create judge finding nodes + SUPPORTS edges from judge to attacker claims
  for (let i = 0; i < judgment.findings.length; i++) {
    const finding = judgment.findings[i];
    const judgeId = await createClaim({
      text: finding.description,
      strength: finding.confidence,
      confidence: finding.confidence,
      source_agent: "judge",
      round,
      session_id: sessionId,
    });

    // Link judge finding to a related attacker claim if one exists
    if (attackNodeIds[i]) {
      await createSupport(judgeId, attackNodeIds[i], {
        strength: finding.confidence,
        type: "evidential",
        created_by: "judge",
        round,
      });
    }
  }
}
