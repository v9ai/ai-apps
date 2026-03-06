"use server";

import { createClient } from "@/lib/supabase/server";
import {
  qwen,
  METRIC_REFERENCES,
  classifyMetricRisk,
  computeMetricVelocity,
} from "@/lib/embeddings";
import { redirect } from "next/navigation";

export type TrajectoryState = {
  id: string;
  test_id: string;
  content: string;
  derived_metrics: Record<string, number | null>;
  created_at: string;
  file_name: string;
  test_date: string | null;
  similarity_to_latest: number | null;
};

export type MetricRisk = "optimal" | "borderline" | "elevated" | "low";

export type TrajectoryMetricDetail = {
  key: string;
  label: string;
  value: number;
  risk: MetricRisk;
  reference: string;
  description: string;
};

export type TrajectoryVelocity = {
  fromDate: string;
  toDate: string;
  daysBetween: number;
  deltas: Record<string, number | null>;
};

export async function getHealthTrajectory(): Promise<TrajectoryState[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data, error } = await supabase.rpc(
    "get_health_trajectory_with_similarity"
  );

  if (error) throw new Error(error.message);
  return (data ?? []) as TrajectoryState[];
}

/**
 * Classify all metrics in a state and attach their research references.
 */
function classifyStateMetrics(
  derivedMetrics: Record<string, number | null>
): TrajectoryMetricDetail[] {
  return Object.entries(derivedMetrics)
    .filter(([, v]) => v != null)
    .map(([key, val]) => {
      const v = val as number;
      const ref = METRIC_REFERENCES[key];
      return {
        key,
        label: ref?.label ?? key,
        value: v,
        risk: classifyMetricRisk(key, v),
        reference: ref?.reference ?? "",
        description: ref?.description ?? "",
      };
    });
}

/**
 * Compute velocity (rate of change per day) between consecutive states.
 *
 * Longitudinal biomarker trajectory analysis follows the approach described in:
 * Lacher DA, et al. "Temporal trends in US adults: serial analysis of NHANES."
 * Clin Chem. 2005;51(7):1232-1239. doi:10.1373/clinchem.2005.048918
 */
function computeTrajectoryVelocities(
  trajectory: TrajectoryState[]
): TrajectoryVelocity[] {
  const velocities: TrajectoryVelocity[] = [];
  for (let i = 1; i < trajectory.length; i++) {
    const prev = trajectory[i - 1];
    const curr = trajectory[i];
    const prevDate = new Date(prev.test_date ?? prev.created_at);
    const currDate = new Date(curr.test_date ?? curr.created_at);
    const daysBetween = Math.max(
      1,
      Math.round(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    velocities.push({
      fromDate: prev.test_date ?? prev.created_at,
      toDate: curr.test_date ?? curr.created_at,
      daysBetween,
      deltas: computeMetricVelocity(
        prev.derived_metrics,
        curr.derived_metrics,
        daysBetween
      ),
    });
  }
  return velocities;
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
          ? ` | similarity to latest: ${(state.similarity_to_latest * 100).toFixed(1)}%`
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
