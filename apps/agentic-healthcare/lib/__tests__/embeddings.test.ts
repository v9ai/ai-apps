import { describe, it, expect } from "vitest";
import {
  formatTestForEmbedding,
  formatMarkerForEmbedding,
  formatConditionForEmbedding,
  formatMedicationForEmbedding,
  formatSymptomForEmbedding,
  formatAppointmentForEmbedding,
  formatHealthStateForEmbedding,
  computeDerivedMetrics,
  classifyMetricRisk,
  computeMetricVelocity,
  METRIC_REFERENCES,
  type MarkerInput,
} from "../embeddings";

// ---------------------------------------------------------------------------
// formatTestForEmbedding
// ---------------------------------------------------------------------------
describe("formatTestForEmbedding", () => {
  const normalMarker: MarkerInput = {
    name: "Hemoglobin",
    value: "14.5",
    unit: "g/dL",
    reference_range: "12.0-16.0",
    flag: "normal",
  };

  const highMarker: MarkerInput = {
    name: "Glucose",
    value: "130",
    unit: "mg/dL",
    reference_range: "70-100",
    flag: "high",
  };

  const lowMarker: MarkerInput = {
    name: "Iron",
    value: "40",
    unit: "µg/dL",
    reference_range: "60-170",
    flag: "low",
  };

  it("formats a test with all normal markers", () => {
    const result = formatTestForEmbedding([normalMarker], {
      fileName: "lab-results.pdf",
      uploadedAt: "2026-03-01",
    });
    expect(result).toContain("Blood test: lab-results.pdf");
    expect(result).toContain("Date: 2026-03-01");
    expect(result).toContain("All markers within normal range");
    expect(result).toContain("Hemoglobin: 14.5 g/dL (ref: 12.0-16.0) [normal]");
  });

  it("summarizes abnormal markers", () => {
    const result = formatTestForEmbedding([normalMarker, highMarker, lowMarker], {
      fileName: "test.pdf",
      uploadedAt: "2026-03-01",
    });
    expect(result).toContain("2 abnormal marker(s)");
    expect(result).toContain("Glucose (high)");
    expect(result).toContain("Iron (low)");
  });

  it("includes all marker lines", () => {
    const result = formatTestForEmbedding([normalMarker, highMarker], {
      fileName: "test.pdf",
      uploadedAt: "2026-03-01",
    });
    const lines = result.split("\n");
    // Header (3 lines) + blank line + 2 marker lines
    expect(lines).toHaveLength(6);
  });

  it("handles empty reference range", () => {
    const marker: MarkerInput = {
      name: "Test",
      value: "5",
      unit: "mg",
      reference_range: "",
      flag: "normal",
    };
    const result = formatTestForEmbedding([marker], {
      fileName: "test.pdf",
      uploadedAt: "2026-03-01",
    });
    expect(result).toContain("(ref: N/A)");
  });
});

// ---------------------------------------------------------------------------
// formatMarkerForEmbedding
// ---------------------------------------------------------------------------
describe("formatMarkerForEmbedding", () => {
  it("formats all marker fields", () => {
    const result = formatMarkerForEmbedding(
      {
        name: "Cholesterol",
        value: "220",
        unit: "mg/dL",
        reference_range: "< 200",
        flag: "high",
      },
      { fileName: "lipid-panel.pdf", testDate: "2026-03-01" }
    );
    expect(result).toContain("Marker: Cholesterol");
    expect(result).toContain("Value: 220 mg/dL");
    expect(result).toContain("Reference range: < 200");
    expect(result).toContain("Flag: high");
    expect(result).toContain("Test: lipid-panel.pdf");
    expect(result).toContain("Date: 2026-03-01");
  });

  it("produces exactly 6 lines", () => {
    const result = formatMarkerForEmbedding(
      { name: "A", value: "1", unit: "u", reference_range: "r", flag: "normal" },
      { fileName: "f", testDate: "d" }
    );
    expect(result.split("\n")).toHaveLength(6);
  });

  it("handles empty reference range", () => {
    const result = formatMarkerForEmbedding(
      { name: "A", value: "1", unit: "u", reference_range: "", flag: "normal" },
      { fileName: "f", testDate: "d" }
    );
    expect(result).toContain("Reference range: N/A");
  });
});

// ---------------------------------------------------------------------------
// formatConditionForEmbedding
// ---------------------------------------------------------------------------
describe("formatConditionForEmbedding", () => {
  it("formats condition with notes", () => {
    const result = formatConditionForEmbedding("Diabetes Type 2", "Diagnosed 2020, managed with diet");
    expect(result).toBe("Health condition: Diabetes Type 2\nNotes: Diagnosed 2020, managed with diet");
  });

  it("formats condition without notes", () => {
    const result = formatConditionForEmbedding("Hypertension", null);
    expect(result).toBe("Health condition: Hypertension");
  });
});

// ---------------------------------------------------------------------------
// formatMedicationForEmbedding
// ---------------------------------------------------------------------------
describe("formatMedicationForEmbedding", () => {
  it("formats medication with all fields", () => {
    const result = formatMedicationForEmbedding("Metformin", {
      dosage: "500mg",
      frequency: "Twice daily",
      notes: "Take with food",
    });
    expect(result).toBe(
      "Medication: Metformin\nDosage: 500mg\nFrequency: Twice daily\nNotes: Take with food"
    );
  });

  it("formats medication with name only", () => {
    const result = formatMedicationForEmbedding("Aspirin", {});
    expect(result).toBe("Medication: Aspirin");
  });

  it("skips null fields", () => {
    const result = formatMedicationForEmbedding("Ibuprofen", {
      dosage: "200mg",
      frequency: null,
      notes: null,
    });
    expect(result).toBe("Medication: Ibuprofen\nDosage: 200mg");
  });

  it("skips undefined fields", () => {
    const result = formatMedicationForEmbedding("Lisinopril", { dosage: "10mg" });
    expect(result).toBe("Medication: Lisinopril\nDosage: 10mg");
  });
});

// ---------------------------------------------------------------------------
// formatSymptomForEmbedding
// ---------------------------------------------------------------------------
describe("formatSymptomForEmbedding", () => {
  it("formats symptom with severity", () => {
    const result = formatSymptomForEmbedding("Persistent fatigue after meals", {
      severity: "moderate",
      loggedAt: "3/1/2026",
    });
    expect(result).toBe(
      "Symptom: Persistent fatigue after meals\nSeverity: moderate\nDate: 3/1/2026"
    );
  });

  it("formats symptom without severity", () => {
    const result = formatSymptomForEmbedding("Headache", {
      severity: null,
      loggedAt: "3/1/2026",
    });
    expect(result).toBe("Symptom: Headache\nDate: 3/1/2026");
  });

  it("always includes the date", () => {
    const result = formatSymptomForEmbedding("Nausea", {
      loggedAt: "2026-03-01",
    });
    expect(result).toContain("Date: 2026-03-01");
  });
});

// ---------------------------------------------------------------------------
// formatAppointmentForEmbedding
// ---------------------------------------------------------------------------
describe("formatAppointmentForEmbedding", () => {
  it("formats appointment with all fields", () => {
    const result = formatAppointmentForEmbedding("Annual checkup", {
      provider: "Dr. Smith",
      appointmentDate: "2026-03-01",
      notes: "Discussed cholesterol levels, recommended statin therapy",
    });
    expect(result).toBe(
      "Appointment: Annual checkup\n" +
      "Provider: Dr. Smith\n" +
      "Date: 2026-03-01\n" +
      "Notes: Discussed cholesterol levels, recommended statin therapy"
    );
  });

  it("formats appointment with title only", () => {
    const result = formatAppointmentForEmbedding("Quick visit", {});
    expect(result).toBe("Appointment: Quick visit");
  });

  it("skips null fields", () => {
    const result = formatAppointmentForEmbedding("Follow-up", {
      provider: null,
      appointmentDate: "2026-03-15",
      notes: null,
    });
    expect(result).toBe("Appointment: Follow-up\nDate: 2026-03-15");
  });

  it("places date before notes", () => {
    const result = formatAppointmentForEmbedding("Visit", {
      appointmentDate: "2026-01-01",
      notes: "Some notes",
    });
    const dateIndex = result.indexOf("Date:");
    const notesIndex = result.indexOf("Notes:");
    expect(dateIndex).toBeLessThan(notesIndex);
  });
});

// ---------------------------------------------------------------------------
// METRIC_REFERENCES
// ---------------------------------------------------------------------------
describe("METRIC_REFERENCES", () => {
  it("has entries for all 7 derived metrics", () => {
    const expected = [
      "hdl_ldl_ratio",
      "total_cholesterol_hdl_ratio",
      "triglyceride_hdl_ratio",
      "glucose_triglyceride_index",
      "neutrophil_lymphocyte_ratio",
      "bun_creatinine_ratio",
      "ast_alt_ratio",
    ];
    for (const key of expected) {
      expect(METRIC_REFERENCES).toHaveProperty(key);
      expect(METRIC_REFERENCES[key].reference).toBeTruthy();
      expect(METRIC_REFERENCES[key].label).toBeTruthy();
    }
  });

  it("each reference includes a DOI or PMID", () => {
    for (const [, ref] of Object.entries(METRIC_REFERENCES)) {
      expect(
        ref.reference.includes("doi:") || ref.reference.includes("PMID:")
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// classifyMetricRisk
// ---------------------------------------------------------------------------
describe("classifyMetricRisk", () => {
  it("classifies optimal NLR", () => {
    expect(classifyMetricRisk("neutrophil_lymphocyte_ratio", 2.0)).toBe("optimal");
  });

  it("classifies borderline NLR", () => {
    expect(classifyMetricRisk("neutrophil_lymphocyte_ratio", 4.0)).toBe("borderline");
  });

  it("classifies elevated NLR", () => {
    expect(classifyMetricRisk("neutrophil_lymphocyte_ratio", 6.0)).toBe("elevated");
  });

  it("classifies low NLR", () => {
    expect(classifyMetricRisk("neutrophil_lymphocyte_ratio", 0.5)).toBe("low");
  });

  it("classifies optimal TG/HDL", () => {
    expect(classifyMetricRisk("triglyceride_hdl_ratio", 1.5)).toBe("optimal");
  });

  it("classifies elevated TG/HDL (McLaughlin threshold)", () => {
    expect(classifyMetricRisk("triglyceride_hdl_ratio", 4.0)).toBe("elevated");
  });

  it("classifies De Ritis ratio borderline", () => {
    expect(classifyMetricRisk("ast_alt_ratio", 1.5)).toBe("borderline");
  });

  it("classifies De Ritis ratio elevated (>2.0 alcoholic liver pattern)", () => {
    expect(classifyMetricRisk("ast_alt_ratio", 2.5)).toBe("elevated");
  });

  it("returns optimal for unknown metric keys", () => {
    expect(classifyMetricRisk("unknown_metric", 999)).toBe("optimal");
  });

  it("classifies BUN/Cr within normal range", () => {
    expect(classifyMetricRisk("bun_creatinine_ratio", 15)).toBe("optimal");
  });

  it("classifies TyG index borderline", () => {
    expect(classifyMetricRisk("glucose_triglyceride_index", 8.7)).toBe("borderline");
  });
});

// ---------------------------------------------------------------------------
// computeMetricVelocity
// ---------------------------------------------------------------------------
describe("computeMetricVelocity", () => {
  it("computes per-day deltas between two metric sets", () => {
    const prev = { nlr: 2.0, tg_hdl: 1.5, gti: null };
    const curr = { nlr: 3.0, tg_hdl: 2.0, gti: 8.5 };
    const vel = computeMetricVelocity(prev, curr, 30);

    expect(vel.nlr).toBeCloseTo(1.0 / 30);
    expect(vel.tg_hdl).toBeCloseTo(0.5 / 30);
    expect(vel.gti).toBeNull(); // prev was null
  });

  it("returns empty object for zero days", () => {
    const vel = computeMetricVelocity({ a: 1 }, { a: 2 }, 0);
    expect(vel).toEqual({});
  });

  it("handles both nulls", () => {
    const vel = computeMetricVelocity({ a: null }, { a: null }, 10);
    expect(vel.a).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeDerivedMetrics
// ---------------------------------------------------------------------------
describe("computeDerivedMetrics", () => {
  it("computes HDL/LDL ratio", () => {
    const markers: MarkerInput[] = [
      { name: "HDL", value: "60", unit: "mg/dL", reference_range: "", flag: "normal" },
      { name: "LDL", value: "120", unit: "mg/dL", reference_range: "", flag: "normal" },
    ];
    const metrics = computeDerivedMetrics(markers);
    expect(metrics.hdl_ldl_ratio).toBeCloseTo(0.5);
  });

  it("computes TyG index from glucose and triglycerides", () => {
    const markers: MarkerInput[] = [
      { name: "Glucose", value: "100", unit: "mg/dL", reference_range: "", flag: "normal" },
      { name: "Triglycerides", value: "150", unit: "mg/dL", reference_range: "", flag: "normal" },
    ];
    const metrics = computeDerivedMetrics(markers);
    // ln(150 * 100 * 0.5) / ln(10) = log10(7500)
    expect(metrics.glucose_triglyceride_index).toBeCloseTo(Math.log10(7500));
  });

  it("returns null for missing markers", () => {
    const metrics = computeDerivedMetrics([]);
    expect(metrics.hdl_ldl_ratio).toBeNull();
    expect(metrics.neutrophil_lymphocyte_ratio).toBeNull();
  });

  it("handles case-insensitive alias matching", () => {
    const markers: MarkerInput[] = [
      { name: "AST", value: "30", unit: "U/L", reference_range: "", flag: "normal" },
      { name: "ALT", value: "25", unit: "U/L", reference_range: "", flag: "normal" },
    ];
    const metrics = computeDerivedMetrics(markers);
    expect(metrics.ast_alt_ratio).toBeCloseTo(1.2);
  });
});

// ---------------------------------------------------------------------------
// formatHealthStateForEmbedding (includes risk classification)
// ---------------------------------------------------------------------------
describe("formatHealthStateForEmbedding", () => {
  it("includes risk classification in metric lines", () => {
    const metrics = { triglyceride_hdl_ratio: 4.5, neutrophil_lymphocyte_ratio: 2.0 };
    const result = formatHealthStateForEmbedding(
      [{ name: "HDL", value: "40", unit: "mg/dL", reference_range: "40-60", flag: "normal" }],
      metrics,
      { fileName: "test.pdf", uploadedAt: "2026-03-01" }
    );
    expect(result).toContain("[elevated]");
    expect(result).toContain("[optimal]");
    expect(result).toContain("risk classification");
  });

  it("labels metrics with their clinical names", () => {
    const metrics = { ast_alt_ratio: 1.1 };
    const result = formatHealthStateForEmbedding([], metrics, {
      fileName: "test.pdf",
      uploadedAt: "2026-03-01",
    });
    expect(result).toContain("De Ritis Ratio (AST/ALT)");
  });
});
