import { describe, it, expect, vi } from "vitest";

const { mockInsert, mockUpdate, mockSelect } = vi.hoisted(() => {
  const mockInsert = vi.fn().mockReturnValue({ error: null });
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({ error: null }),
  });
  const mockSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: {
          id: "test-session-id",
          brief_text: "The plaintiff argues breach of contract.",
          jurisdiction: "federal",
          status: "pending",
          config: { max_rounds: 1 },
        },
        error: null,
      }),
    }),
  });
  return { mockInsert, mockUpdate, mockSelect };
});

vi.mock("../runner", () => ({
  runAttacker: vi.fn().mockResolvedValue({
    attacks: [
      {
        claim: "Defendant breached the contract",
        weakness: "No evidence of breach presented",
        type: "factual",
        evidence: "Record shows full compliance",
      },
    ],
  }),
  runDefender: vi.fn().mockResolvedValue({
    rebuttals: [
      {
        attack_ref: "Defendant breached the contract",
        defense: "Exhibit A shows non-performance",
        supporting_citations: ["Smith v. Jones, 123 F.3d 456 (2d Cir. 2020)"],
        strength: 0.7,
      },
    ],
  }),
  runJudge: vi.fn().mockResolvedValue({
    findings: [
      {
        type: "factual",
        severity: "high",
        description: "Breach claim lacks evidentiary support",
        confidence: 0.85,
        suggested_fix: "Add documentary evidence of breach",
      },
    ],
    overall_score: 65,
  }),
}));

vi.mock("@/lib/neo4j/argument-graph", () => ({
  createClaim: vi.fn().mockResolvedValue("mock-node-id"),
  createAttack: vi.fn().mockResolvedValue(undefined),
  createSupport: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect,
    }),
  }),
}));

import { runStressTest } from "../orchestrator";
import { runAttacker, runDefender, runJudge } from "../runner";

describe("runStressTest", () => {
  it("calls attacker, defender, and judge in sequence", async () => {
    const events: string[] = [];
    await runStressTest("test-session-id", (e) => events.push(e.type));

    expect(runAttacker).toHaveBeenCalled();
    expect(runDefender).toHaveBeenCalled();
    expect(runJudge).toHaveBeenCalled();
  });

  it("emits events in correct order", async () => {
    const events: string[] = [];
    await runStressTest("test-session-id", (e) => events.push(e.type));

    expect(events).toContain("round_start");
    expect(events).toContain("attacker_complete");
    expect(events).toContain("defender_complete");
    expect(events).toContain("judge_complete");
    expect(events).toContain("session_complete");
    expect(events.indexOf("round_start")).toBeLessThan(events.indexOf("attacker_complete"));
    expect(events.indexOf("attacker_complete")).toBeLessThan(events.indexOf("defender_complete"));
    expect(events.indexOf("defender_complete")).toBeLessThan(events.indexOf("judge_complete"));
  });

  it("writes audit trail entries", async () => {
    await runStressTest("test-session-id");

    expect(mockInsert).toHaveBeenCalled();
  });
});
