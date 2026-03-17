"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { qwen, METRIC_REFERENCES } from "@/lib/embeddings";
import { sql } from "drizzle-orm";
import {
  classifyStateMetrics,
  computeTrajectoryVelocities,
} from "./utils";
import type {
  TrajectoryState,
  TrajectoryMetricDetail,
  TrajectoryVelocity,
} from "./utils";

export async function getHealthTrajectory(): Promise<TrajectoryState[]> {
  const { userId } = await withAuth();

  const data = await db.execute(sql`
    WITH latest AS (
      SELECT embedding
      FROM health_state_embeddings
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    )
    SELECT
      e.id,
      e.test_id,
      e.content,
      e.derived_metrics,
      e.created_at,
      t.file_name,
      t.test_date,
      CASE
        WHEN (SELECT embedding FROM latest) IS NOT NULL
        THEN 1 - (e.embedding <=> (SELECT embedding FROM latest))
        ELSE NULL
      END as similarity_to_latest
    FROM health_state_embeddings e
    JOIN blood_tests t ON t.id = e.test_id
    WHERE e.user_id = ${userId}
    ORDER BY COALESCE(t.test_date::timestamptz, e.created_at) ASC
  `);

  return data.rows as TrajectoryState[];
}

export async function getTrajectoryInsights() {
  const trajectory = await getHealthTrajectory();

  if (trajectory.length === 0) {
    return {
      answer:
        "No health states found. Upload blood tests to build your trajectory.",
      stateCount: 0,
      currentTest: null,
      riskSummary: [] as TrajectoryMetricDetail[],
      velocities: [] as TrajectoryVelocity[],
    };
  }

  const latest = trajectory[trajectory.length - 1];
  const riskSummary = classifyStateMetrics(latest.derived_metrics);
  const velocities = computeTrajectoryVelocities(trajectory);

  const context = trajectory
    .map((state, i) => {
      const date = state.test_date ?? state.created_at;
      const classified = classifyStateMetrics(state.derived_metrics);
      const metricStr = classified
        .map((m) => `${m.label}: ${m.value.toFixed(3)} [${m.risk}]`)
        .join(", ");
      const simStr =
        state.similarity_to_latest != null
          ? ` | similarity to latest: ${(Number(state.similarity_to_latest) * 100).toFixed(1)}%`
          : "";
      return `--- State ${i + 1} (${date})${simStr} ---\nFile: ${state.file_name}\nDerived metrics: ${metricStr || "none"}\n${state.content}`;
    })
    .join("\n\n");

  const velocityContext =
    velocities.length > 0
      ? "\n\nRate of change (per day) between consecutive states:\n" +
        velocities
          .map((v) => {
            const deltas = Object.entries(v.deltas)
              .filter(([, d]) => d != null)
              .map(([k, d]) => {
                const ref = METRIC_REFERENCES[k];
                return `${ref?.label ?? k}: ${(d as number).toFixed(6)}/day`;
              })
              .join(", ");
            return `${v.fromDate} -> ${v.toDate} (${v.daysBetween}d): ${deltas || "no common metrics"}`;
          })
          .join("\n")
      : "";

  const referenceContext = Object.entries(METRIC_REFERENCES)
    .map(
      ([, ref]) =>
        `- ${ref.label}: optimal ${ref.optimal[0]}–${ref.optimal[1] === Infinity ? "∞" : ref.optimal[1]}, borderline ${ref.borderline[0]}–${ref.borderline[1]}. ${ref.description}. Ref: ${ref.reference}`
    )
    .join("\n");

  const completion = await qwen.chat({
    model: "qwen-plus",
    messages: [
      {
        role: "system",
        content: `You are a health trajectory analyst grounded in clinical research. You analyze how a person's overall health state evolves over multiple blood tests.

Use the following evidence-based thresholds for your analysis:
${referenceContext}

Focus on:
1. Risk classification of each derived metric at each time point (optimal/borderline/elevated)
2. Trajectory direction: improving, stable, or deteriorating — use the rate-of-change data
3. Cosine similarity between states as a measure of overall health stability
4. Clinically significant shifts that may warrant follow-up

When citing a threshold or classification, note the source paper briefly (e.g., "per McLaughlin et al., TG/HDL >3.5 suggests insulin resistance").

Be concise and factual. Remind the user to consult their doctor for medical advice.`,
      },
      {
        role: "user",
        content: `Analyze this health trajectory with ${trajectory.length} states:\n\n${context}${velocityContext}`,
      },
    ],
    temperature: 0.3,
    max_completion_tokens: 1500,
  });

  return {
    answer: completion.choices[0]?.message.content ?? "",
    stateCount: trajectory.length,
    currentTest: latest.file_name,
    riskSummary,
    velocities,
  };
}
