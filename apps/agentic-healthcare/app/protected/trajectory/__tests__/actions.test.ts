import { describe, it, expect } from "vitest";
import {
  classifyStateMetrics,
  computeTrajectoryVelocities,
  type TrajectoryState,
} from "../utils";

// ---------------------------------------------------------------------------
// Helper to build a TrajectoryState for testing
// ---------------------------------------------------------------------------
function makeState(
  overrides: Partial<TrajectoryState> & { derived_metrics: Record<string, number | null> }
): TrajectoryState {
  return {
    id: "test-id",
    test_id: "test-test-id",
    content: "",
    file_name: "test.pdf",
    created_at: "2026-01-01",
    test_date: null,
    similarity_to_latest: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// classifyStateMetrics
// ---------------------------------------------------------------------------
describe("classifyStateMetrics", () => {
  it("filters null metric values", () => {
    const result = classifyStateMetrics({
      hdl_ldl_ratio: 0.5,
      triglyceride_hdl_ratio: null,
    });
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("hdl_ldl_ratio");
  });

  it("enriches with label, reference, description from METRIC_REFERENCES", () => {
    const result = classifyStateMetrics({ hdl_ldl_ratio: 0.5 });
    expect(result[0].label).toBe("HDL/LDL Ratio");
    expect(result[0].reference).toContain("Castelli");
    expect(result[0].description).toContain("cardiovascular");
  });

  it("falls back to key as label for unknown metrics", () => {
    const result = classifyStateMetrics({ custom_metric: 42 });
    expect(result[0].label).toBe("custom_metric");
    expect(result[0].reference).toBe("");
    expect(result[0].description).toBe("");
  });

  it("handles empty metrics object", () => {
    expect(classifyStateMetrics({})).toEqual([]);
  });

  it("handles all-null metrics (returns empty array)", () => {
    const result = classifyStateMetrics({
      hdl_ldl_ratio: null,
      triglyceride_hdl_ratio: null,
      ast_alt_ratio: null,
    });
    expect(result).toEqual([]);
  });

  it("preserves original numeric precision", () => {
    const result = classifyStateMetrics({ hdl_ldl_ratio: 0.123456789 });
    expect(result[0].value).toBe(0.123456789);
  });
});

// ---------------------------------------------------------------------------
// computeTrajectoryVelocities
// ---------------------------------------------------------------------------
describe("computeTrajectoryVelocities", () => {
  it("empty trajectory → empty array", () => {
    expect(computeTrajectoryVelocities([])).toEqual([]);
  });

  it("single state → empty array (no pairs)", () => {
    const states = [makeState({ derived_metrics: { nlr: 2.0 } })];
    expect(computeTrajectoryVelocities(states)).toEqual([]);
  });

  it("two states → one velocity entry", () => {
    const states = [
      makeState({ created_at: "2026-01-01", derived_metrics: { nlr: 2.0 } }),
      makeState({ created_at: "2026-01-31", derived_metrics: { nlr: 3.0 } }),
    ];
    const velocities = computeTrajectoryVelocities(states);
    expect(velocities).toHaveLength(1);
    expect(velocities[0].daysBetween).toBe(30);
  });

  it("three states → two velocity entries", () => {
    const states = [
      makeState({ created_at: "2026-01-01", derived_metrics: { nlr: 1.0 } }),
      makeState({ created_at: "2026-02-01", derived_metrics: { nlr: 2.0 } }),
      makeState({ created_at: "2026-03-01", derived_metrics: { nlr: 3.0 } }),
    ];
    const velocities = computeTrajectoryVelocities(states);
    expect(velocities).toHaveLength(2);
  });

  it("uses test_date when available, falls back to created_at", () => {
    const states = [
      makeState({
        created_at: "2026-01-01",
        test_date: "2025-12-15",
        derived_metrics: { nlr: 1.0 },
      }),
      makeState({
        created_at: "2026-02-01",
        test_date: null,
        derived_metrics: { nlr: 2.0 },
      }),
    ];
    const velocities = computeTrajectoryVelocities(states);
    expect(velocities[0].fromDate).toBe("2025-12-15");
    expect(velocities[0].toDate).toBe("2026-02-01");
  });

  it("correct daysBetween calculation", () => {
    const states = [
      makeState({ created_at: "2026-01-01", derived_metrics: { nlr: 1.0 } }),
      makeState({ created_at: "2026-01-11", derived_metrics: { nlr: 2.0 } }),
    ];
    const velocities = computeTrajectoryVelocities(states);
    expect(velocities[0].daysBetween).toBe(10);
  });

  it("daysBetween minimum is 1 (same-day tests)", () => {
    const states = [
      makeState({ created_at: "2026-01-01", derived_metrics: { nlr: 1.0 } }),
      makeState({ created_at: "2026-01-01", derived_metrics: { nlr: 2.0 } }),
    ];
    const velocities = computeTrajectoryVelocities(states);
    expect(velocities[0].daysBetween).toBe(1);
  });

  it("correct fromDate/toDate labeling", () => {
    const states = [
      makeState({
        test_date: "2025-06-01",
        created_at: "2025-06-02",
        derived_metrics: { nlr: 1.0 },
      }),
      makeState({
        test_date: "2025-12-01",
        created_at: "2025-12-02",
        derived_metrics: { nlr: 2.0 },
      }),
    ];
    const velocities = computeTrajectoryVelocities(states);
    expect(velocities[0].fromDate).toBe("2025-06-01");
    expect(velocities[0].toDate).toBe("2025-12-01");
  });

  it("metric deltas computed correctly between states", () => {
    const states = [
      makeState({
        created_at: "2026-01-01",
        derived_metrics: { nlr: 2.0, tg_hdl: 1.0 },
      }),
      makeState({
        created_at: "2026-01-11",
        derived_metrics: { nlr: 3.0, tg_hdl: 2.0 },
      }),
    ];
    const velocities = computeTrajectoryVelocities(states);
    expect(velocities[0].deltas.nlr).toBeCloseTo(0.1);
    expect(velocities[0].deltas.tg_hdl).toBeCloseTo(0.1);
  });

  it("mixed null/non-null derived_metrics propagation", () => {
    const states = [
      makeState({
        created_at: "2026-01-01",
        derived_metrics: { nlr: 2.0, gti: null },
      }),
      makeState({
        created_at: "2026-01-11",
        derived_metrics: { nlr: 3.0, gti: 8.5 },
      }),
    ];
    const velocities = computeTrajectoryVelocities(states);
    expect(velocities[0].deltas.nlr).toBeCloseTo(0.1);
    expect(velocities[0].deltas.gti).toBeNull();
  });

  it("large time gaps (365+ days)", () => {
    const states = [
      makeState({ created_at: "2025-01-01", derived_metrics: { nlr: 1.0 } }),
      makeState({ created_at: "2026-01-01", derived_metrics: { nlr: 2.0 } }),
    ];
    const velocities = computeTrajectoryVelocities(states);
    expect(velocities[0].daysBetween).toBe(365);
    expect(velocities[0].deltas.nlr).toBeCloseTo(1.0 / 365);
  });

  it("reversed dates (older created_at but newer test_date)", () => {
    const states = [
      makeState({
        created_at: "2026-03-01",
        test_date: "2025-06-01",
        derived_metrics: { nlr: 1.0 },
      }),
      makeState({
        created_at: "2026-01-01",
        test_date: "2025-12-01",
        derived_metrics: { nlr: 2.0 },
      }),
    ];
    const velocities = computeTrajectoryVelocities(states);
    // test_date is used: 2025-06-01 → 2025-12-01 = ~183 days
    expect(velocities[0].daysBetween).toBe(183);
    expect(velocities[0].fromDate).toBe("2025-06-01");
    expect(velocities[0].toDate).toBe("2025-12-01");
  });
});
