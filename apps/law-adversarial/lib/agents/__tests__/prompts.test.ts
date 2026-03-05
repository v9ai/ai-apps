import { describe, it, expect } from "vitest";
import { buildAttackerPrompt, buildDefenderPrompt, buildJudgePrompt } from "../prompts";
import type { RoundContext } from "../types";

const baseCtx: RoundContext = {
  brief: "The plaintiff argues that defendant breached the contract on March 15.",
  jurisdiction: "federal",
  round: 1,
  previousFindings: [],
};

describe("buildAttackerPrompt", () => {
  it("includes the brief text", () => {
    const prompt = buildAttackerPrompt(baseCtx);
    expect(prompt).toContain("breached the contract on March 15");
  });

  it("includes jurisdiction when provided", () => {
    const prompt = buildAttackerPrompt(baseCtx);
    expect(prompt).toContain("federal");
  });

  it("uses general principles when no jurisdiction", () => {
    const prompt = buildAttackerPrompt({ ...baseCtx, jurisdiction: undefined });
    expect(prompt).toContain("general U.S. federal law");
  });

  it("asks to dig deeper in round > 1", () => {
    const prompt = buildAttackerPrompt({ ...baseCtx, round: 3 });
    expect(prompt).toContain("round 3");
    expect(prompt).toContain("NOT already identified");
  });

  it("shows previous findings for later rounds", () => {
    const ctx: RoundContext = {
      ...baseCtx,
      round: 2,
      previousFindings: [
        {
          findings: [
            {
              type: "logical",
              severity: "high",
              description: "Circular reasoning detected",
              confidence: 0.9,
              suggested_fix: "Restructure argument",
            },
          ],
          overall_score: 65,
        },
      ],
    };
    const prompt = buildAttackerPrompt(ctx);
    expect(prompt).toContain("Circular reasoning detected");
    expect(prompt).toContain("65");
  });

  it("requests JSON output format", () => {
    const prompt = buildAttackerPrompt(baseCtx);
    expect(prompt).toContain('"attacks"');
    expect(prompt).toContain('"claim"');
    expect(prompt).toContain('"weakness"');
  });
});

describe("buildDefenderPrompt", () => {
  it("includes attacks to rebut", () => {
    const prompt = buildDefenderPrompt(baseCtx, '{"attacks": []}');
    expect(prompt).toContain("Attacks to Rebut");
  });

  it("includes defense strategies", () => {
    const prompt = buildDefenderPrompt(baseCtx, "[]");
    expect(prompt).toContain("Distinguishing precedent");
    expect(prompt).toContain("Alternative authority");
  });
});

describe("buildJudgePrompt", () => {
  it("includes both attacker and defender output", () => {
    const prompt = buildJudgePrompt(baseCtx, "attacker data", "defender data");
    expect(prompt).toContain("attacker data");
    expect(prompt).toContain("defender data");
  });

  it("includes scoring rubric", () => {
    const prompt = buildJudgePrompt(baseCtx, "", "");
    expect(prompt).toContain("90-100");
    expect(prompt).toContain("0-19");
  });

  it("asks to compare against previous rounds in round > 1", () => {
    const prompt = buildJudgePrompt({ ...baseCtx, round: 2 }, "", "");
    expect(prompt).toContain("Compare against previous rounds");
  });
});
