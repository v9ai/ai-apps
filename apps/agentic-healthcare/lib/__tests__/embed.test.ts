import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock @huggingface/transformers ────────────────────────────────────
const mockEmbedder = vi.fn();
vi.mock("@huggingface/transformers", () => ({
  pipeline: vi.fn().mockResolvedValue(mockEmbedder),
}));

// ── Mock DB + schema ──────────────────────────────────────────────────
const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

vi.mock("@/lib/db", () => ({ db: { insert: mockInsert } }));
vi.mock("@/lib/db/schema", () => ({
  conditionEmbeddings: { conditionId: "conditionId" },
  medicationEmbeddings: { medicationId: "medicationId" },
  symptomEmbeddings: { symptomId: "symptomId" },
  appointmentEmbeddings: { appointmentId: "appointmentId" },
}));

import {
  formatCondition,
  formatMedication,
  formatSymptom,
  formatAppointment,
  generateEmbedding,
  embedCondition,
  embedMedication,
  embedSymptom,
  embedAppointment,
} from "@/lib/embed";

// ── formatCondition ───────────────────────────────────────────────────
describe("formatCondition", () => {
  it("name only", () => {
    expect(formatCondition("Hypertension", null)).toBe("Health condition: Hypertension");
  });

  it("name + notes", () => {
    expect(formatCondition("Diabetes", "Type 2, diet-controlled")).toBe(
      "Health condition: Diabetes\nNotes: Type 2, diet-controlled",
    );
  });

  it("empty string notes treated as present", () => {
    expect(formatCondition("Asthma", "")).toBe("Health condition: Asthma\nNotes: ");
  });
});

// ── formatMedication ──────────────────────────────────────────────────
describe("formatMedication", () => {
  it("name only", () => {
    expect(formatMedication("Metformin", null, null, null)).toBe("Medication: Metformin");
  });

  it("all fields", () => {
    expect(formatMedication("Metformin", "500mg", "twice daily", "with food")).toBe(
      "Medication: Metformin\nDosage: 500mg\nFrequency: twice daily\nNotes: with food",
    );
  });

  it("partial fields — dosage only", () => {
    expect(formatMedication("Aspirin", "81mg", null, null)).toBe(
      "Medication: Aspirin\nDosage: 81mg",
    );
  });

  it("partial fields — notes only", () => {
    expect(formatMedication("Vitamin D", null, null, "1000 IU")).toBe(
      "Medication: Vitamin D\nNotes: 1000 IU",
    );
  });
});

// ── formatSymptom ─────────────────────────────────────────────────────
describe("formatSymptom", () => {
  it("description only", () => {
    expect(formatSymptom("Headache", null, null)).toBe("Symptom: Headache");
  });

  it("all fields", () => {
    expect(formatSymptom("Fatigue", "moderate", "2026-03-01")).toBe(
      "Symptom: Fatigue\nSeverity: moderate\nDate: 2026-03-01",
    );
  });

  it("severity without date", () => {
    expect(formatSymptom("Nausea", "mild", null)).toBe("Symptom: Nausea\nSeverity: mild");
  });
});

// ── formatAppointment ─────────────────────────────────────────────────
describe("formatAppointment", () => {
  it("title only", () => {
    expect(formatAppointment("Annual checkup", null, null, null)).toBe(
      "Appointment: Annual checkup",
    );
  });

  it("all fields", () => {
    expect(
      formatAppointment("Cardiology follow-up", "Dr. Smith", "Follow lipid panel", "2026-04-15"),
    ).toBe(
      "Appointment: Cardiology follow-up\nProvider: Dr. Smith\nDate: 2026-04-15\nNotes: Follow lipid panel",
    );
  });

  it("provider and date without notes", () => {
    expect(formatAppointment("Blood draw", "Quest Diagnostics", null, "2026-05-01")).toBe(
      "Appointment: Blood draw\nProvider: Quest Diagnostics\nDate: 2026-05-01",
    );
  });
});

// ── generateEmbedding ─────────────────────────────────────────────────
describe("generateEmbedding", () => {
  beforeEach(() => {
    mockEmbedder.mockResolvedValue({ data: new Float32Array(1024).fill(0.1) });
  });

  it("returns a 1024-element number array", async () => {
    const result = await generateEmbedding("test text");
    expect(result).toHaveLength(1024);
    expect(typeof result[0]).toBe("number");
  });

  it("calls the embedder with mean pooling and normalization", async () => {
    await generateEmbedding("clinical note");
    expect(mockEmbedder).toHaveBeenCalledWith("clinical note", {
      pooling: "mean",
      normalize: true,
    });
  });
});

// ── entity embed functions ────────────────────────────────────────────
describe("embedCondition", () => {
  beforeEach(() => {
    mockEmbedder.mockResolvedValue({ data: new Float32Array(1024).fill(0.2) });
    mockInsert.mockClear();
    mockValues.mockClear();
    mockOnConflictDoUpdate.mockClear();
  });

  it("inserts with correctly formatted content", async () => {
    await embedCondition("cid-1", "uid-1", "Hypertension", "Stage 1");
    const insertedValues = mockValues.mock.calls[0][0];
    expect(insertedValues.content).toBe(
      "Health condition: Hypertension\nNotes: Stage 1",
    );
    expect(insertedValues.conditionId).toBe("cid-1");
    expect(insertedValues.userId).toBe("uid-1");
  });

  it("embedding vector has 1024 dimensions", async () => {
    await embedCondition("cid-2", "uid-1", "Asthma", null);
    const insertedValues = mockValues.mock.calls[0][0];
    expect(insertedValues.embedding).toHaveLength(1024);
  });
});

describe("embedMedication", () => {
  beforeEach(() => {
    mockEmbedder.mockResolvedValue({ data: new Float32Array(1024).fill(0.2) });
    mockInsert.mockClear();
    mockValues.mockClear();
  });

  it("formats content with all fields", async () => {
    await embedMedication("mid-1", "uid-1", "Metformin", {
      dosage: "500mg",
      frequency: "twice daily",
      notes: "with food",
    });
    const { content } = mockValues.mock.calls[0][0];
    expect(content).toBe(
      "Medication: Metformin\nDosage: 500mg\nFrequency: twice daily\nNotes: with food",
    );
  });
});

describe("embedSymptom", () => {
  beforeEach(() => {
    mockEmbedder.mockResolvedValue({ data: new Float32Array(1024).fill(0.2) });
    mockInsert.mockClear();
    mockValues.mockClear();
  });

  it("formats content with severity and date", async () => {
    await embedSymptom("sid-1", "uid-1", "Chest tightness", {
      severity: "moderate",
      loggedAt: "3/15/2026",
    });
    const { content } = mockValues.mock.calls[0][0];
    expect(content).toBe(
      "Symptom: Chest tightness\nSeverity: moderate\nDate: 3/15/2026",
    );
  });
});

describe("embedAppointment", () => {
  beforeEach(() => {
    mockEmbedder.mockResolvedValue({ data: new Float32Array(1024).fill(0.2) });
    mockInsert.mockClear();
    mockValues.mockClear();
  });

  it("formats content with provider and date", async () => {
    await embedAppointment("aid-1", "uid-1", "Cardiology follow-up", {
      provider: "Dr. Lee",
      appointmentDate: "2026-06-01",
    });
    const { content } = mockValues.mock.calls[0][0];
    expect(content).toBe(
      "Appointment: Cardiology follow-up\nProvider: Dr. Lee\nDate: 2026-06-01",
    );
  });
});
