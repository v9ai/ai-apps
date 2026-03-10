import {
  METRIC_REFERENCES,
  classifyMetricRisk,
  computeMetricVelocity,
} from "@/lib/embeddings";

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

/**
 * Classify all metrics in a state and attach their research references.
 */
export function classifyStateMetrics(
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
export function computeTrajectoryVelocities(
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
