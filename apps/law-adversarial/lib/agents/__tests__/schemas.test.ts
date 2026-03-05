import { describe, it, expect } from "vitest";
import {
  AttackerOutputSchema,
  DefenderOutputSchema,
  JudgeOutputSchema,
} from "../schemas";

describe("AttackerOutputSchema", () => {
  it("accepts valid attacker output", () => {
    const valid = {
      attacks: [
        {
          claim: "The contract was breached",
          weakness: "No evidence of breach",
          type: "factual",
          evidence: "Record shows compliance",
        },
      ],
    };
    expect(AttackerOutputSchema.parse(valid)).toEqual(valid);
  });

  it("rejects invalid attack type", () => {
    const invalid = {
      attacks: [
        {
          claim: "test",
          weakness: "test",
          type: "invalid_type",
          evidence: "test",
        },
      ],
    };
    expect(() => AttackerOutputSchema.parse(invalid)).toThrow();
  });

  it("rejects missing fields", () => {
    const invalid = {
      attacks: [{ claim: "test" }],
    };
    expect(() => AttackerOutputSchema.parse(invalid)).toThrow();
  });

  it("accepts empty attacks array", () => {
    const valid = { attacks: [] };
    expect(AttackerOutputSchema.parse(valid)).toEqual(valid);
  });
});

describe("DefenderOutputSchema", () => {
  it("accepts valid defender output", () => {
    const valid = {
      rebuttals: [
        {
          attack_ref: "The contract was breached",
          defense: "The contract was fully performed",
          supporting_citations: ["Smith v. Jones, 123 F.3d 456 (2d Cir. 2020)"],
          strength: 0.85,
        },
      ],
    };
    expect(DefenderOutputSchema.parse(valid)).toEqual(valid);
  });

  it("rejects strength > 1", () => {
    const invalid = {
      rebuttals: [
        {
          attack_ref: "test",
          defense: "test",
          supporting_citations: [],
          strength: 1.5,
        },
      ],
    };
    expect(() => DefenderOutputSchema.parse(invalid)).toThrow();
  });

  it("rejects strength < 0", () => {
    const invalid = {
      rebuttals: [
        {
          attack_ref: "test",
          defense: "test",
          supporting_citations: [],
          strength: -0.1,
        },
      ],
    };
    expect(() => DefenderOutputSchema.parse(invalid)).toThrow();
  });
});

describe("JudgeOutputSchema", () => {
  it("accepts valid judge output", () => {
    const valid = {
      findings: [
        {
          type: "legal",
          severity: "high",
          description: "Misapplication of precedent",
          confidence: 0.88,
          suggested_fix: "Cite correct authority",
        },
      ],
      overall_score: 72,
    };
    expect(JudgeOutputSchema.parse(valid)).toEqual(valid);
  });

  it("rejects score > 100", () => {
    const invalid = {
      findings: [],
      overall_score: 101,
    };
    expect(() => JudgeOutputSchema.parse(invalid)).toThrow();
  });

  it("rejects score < 0", () => {
    const invalid = {
      findings: [],
      overall_score: -1,
    };
    expect(() => JudgeOutputSchema.parse(invalid)).toThrow();
  });

  it("rejects invalid severity", () => {
    const invalid = {
      findings: [
        {
          type: "legal",
          severity: "extreme",
          description: "test",
          confidence: 0.5,
          suggested_fix: "test",
        },
      ],
      overall_score: 50,
    };
    expect(() => JudgeOutputSchema.parse(invalid)).toThrow();
  });

  it("accepts all valid severity levels", () => {
    for (const severity of ["low", "medium", "high", "critical"]) {
      const valid = {
        findings: [
          {
            type: "logical",
            severity,
            description: "test",
            confidence: 0.5,
            suggested_fix: "test",
          },
        ],
        overall_score: 50,
      };
      expect(() => JudgeOutputSchema.parse(valid)).not.toThrow();
    }
  });

  it("accepts all valid attack types", () => {
    for (const type of ["logical", "factual", "legal", "procedural", "citation"]) {
      const valid = {
        findings: [
          {
            type,
            severity: "medium",
            description: "test",
            confidence: 0.5,
            suggested_fix: "test",
          },
        ],
        overall_score: 50,
      };
      expect(() => JudgeOutputSchema.parse(valid)).not.toThrow();
    }
  });
});
