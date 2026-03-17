import { QwenClient } from "./qwen-client";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import {
  bloodTestEmbeddings,
  bloodMarkerEmbeddings,
  conditionEmbeddings,
  medicationEmbeddings,
  symptomEmbeddings,
  appointmentEmbeddings,
  healthStateEmbeddings,
} from "@/lib/db/schema";

const qwen = new QwenClient({
  apiKey: process.env.DASHSCOPE_API_KEY!,
  baseURL: process.env.DASHSCOPE_BASE_URL,
});

export type MarkerInput = {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  flag: string;
};

export type MarkerWithId = MarkerInput & { id: string };

export function formatTestForEmbedding(
  markers: MarkerInput[],
  meta: { fileName: string; uploadedAt: string }
): string {
  const flagged = markers.filter((m) => m.flag !== "normal");
  const summary =
    flagged.length > 0
      ? `${flagged.length} abnormal marker(s): ${flagged.map((m) => `${m.name} (${m.flag})`).join(", ")}`
      : "All markers within normal range";

  const lines = markers.map(
    (m) =>
      `${m.name}: ${m.value} ${m.unit} (ref: ${m.reference_range || "N/A"}) [${m.flag}]`
  );

  return [
    `Blood test: ${meta.fileName}`,
    `Date: ${meta.uploadedAt}`,
    `Summary: ${summary}`,
    "",
    ...lines,
  ].join("\n");
}

export function formatMarkerForEmbedding(
  marker: MarkerInput,
  meta: { fileName: string; testDate: string }
): string {
  return [
    `Marker: ${marker.name}`,
    `Value: ${marker.value} ${marker.unit}`,
    `Reference range: ${marker.reference_range || "N/A"}`,
    `Flag: ${marker.flag}`,
    `Test: ${meta.fileName}`,
    `Date: ${meta.testDate}`,
  ].join("\n");
}

export function formatConditionForEmbedding(
  name: string,
  notes: string | null
): string {
  return notes
    ? `Health condition: ${name}\nNotes: ${notes}`
    : `Health condition: ${name}`;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return qwen.embedOne(text);
}

/** Embed an entire blood test (summary of all markers). */
export async function embedBloodTest(
  testId: string,
  userId: string,
  markers: MarkerInput[],
  meta: { fileName: string; uploadedAt: string }
) {
  const content = formatTestForEmbedding(markers, meta);
  const embedding = await generateEmbedding(content);

  await db
    .insert(bloodTestEmbeddings)
    .values({
      testId,
      userId,
      content,
      embedding,
    })
    .onConflictDoUpdate({
      target: bloodTestEmbeddings.testId,
      set: { content, embedding, createdAt: sql`now()` },
    });
}

/** Embed each marker individually for fine-grained search. */
export async function embedBloodMarkers(
  testId: string,
  userId: string,
  markers: MarkerWithId[],
  meta: { fileName: string; testDate: string }
) {
  for (const marker of markers) {
    const content = formatMarkerForEmbedding(marker, meta);
    const embedding = await generateEmbedding(content);

    await db
      .insert(bloodMarkerEmbeddings)
      .values({
        markerId: marker.id,
        testId,
        userId,
        markerName: marker.name,
        content,
        embedding,
      })
      .onConflictDoUpdate({
        target: bloodMarkerEmbeddings.markerId,
        set: { content, embedding, markerName: marker.name, createdAt: sql`now()` },
      });
  }
}

/** Embed a health condition. */
export async function embedCondition(
  conditionId: string,
  userId: string,
  name: string,
  notes: string | null
) {
  const content = formatConditionForEmbedding(name, notes);
  const embedding = await generateEmbedding(content);

  await db
    .insert(conditionEmbeddings)
    .values({
      conditionId,
      userId,
      content,
      embedding,
    })
    .onConflictDoUpdate({
      target: conditionEmbeddings.conditionId,
      set: { content, embedding, createdAt: sql`now()` },
    });
}

/** Format a medication for embedding. */
export function formatMedicationForEmbedding(
  name: string,
  opts: { dosage?: string | null; frequency?: string | null; notes?: string | null }
): string {
  const lines = [`Medication: ${name}`];
  if (opts.dosage) lines.push(`Dosage: ${opts.dosage}`);
  if (opts.frequency) lines.push(`Frequency: ${opts.frequency}`);
  if (opts.notes) lines.push(`Notes: ${opts.notes}`);
  return lines.join("\n");
}

/** Embed a medication. */
export async function embedMedication(
  medicationId: string,
  userId: string,
  name: string,
  opts: { dosage?: string | null; frequency?: string | null; notes?: string | null }
) {
  const content = formatMedicationForEmbedding(name, opts);
  const embedding = await generateEmbedding(content);

  await db
    .insert(medicationEmbeddings)
    .values({
      medicationId,
      userId,
      content,
      embedding,
    })
    .onConflictDoUpdate({
      target: medicationEmbeddings.medicationId,
      set: { content, embedding, createdAt: sql`now()` },
    });
}

/** Format a symptom for embedding. */
export function formatSymptomForEmbedding(
  description: string,
  opts: { severity?: string | null; loggedAt: string }
): string {
  const lines = [`Symptom: ${description}`];
  if (opts.severity) lines.push(`Severity: ${opts.severity}`);
  lines.push(`Date: ${opts.loggedAt}`);
  return lines.join("\n");
}

/** Embed a symptom. */
export async function embedSymptom(
  symptomId: string,
  userId: string,
  description: string,
  opts: { severity?: string | null; loggedAt: string }
) {
  const content = formatSymptomForEmbedding(description, opts);
  const embedding = await generateEmbedding(content);

  await db
    .insert(symptomEmbeddings)
    .values({
      symptomId,
      userId,
      content,
      embedding,
    })
    .onConflictDoUpdate({
      target: symptomEmbeddings.symptomId,
      set: { content, embedding, createdAt: sql`now()` },
    });
}

/** Format an appointment for embedding. */
export function formatAppointmentForEmbedding(
  title: string,
  opts: { provider?: string | null; notes?: string | null; appointmentDate?: string | null }
): string {
  const lines = [`Appointment: ${title}`];
  if (opts.provider) lines.push(`Provider: ${opts.provider}`);
  if (opts.appointmentDate) lines.push(`Date: ${opts.appointmentDate}`);
  if (opts.notes) lines.push(`Notes: ${opts.notes}`);
  return lines.join("\n");
}

/** Embed an appointment. */
export async function embedAppointment(
  appointmentId: string,
  userId: string,
  title: string,
  opts: { provider?: string | null; notes?: string | null; appointmentDate?: string | null }
) {
  const content = formatAppointmentForEmbedding(title, opts);
  const embedding = await generateEmbedding(content);

  await db
    .insert(appointmentEmbeddings)
    .values({
      appointmentId,
      userId,
      content,
      embedding,
    })
    .onConflictDoUpdate({
      target: appointmentEmbeddings.appointmentId,
      set: { content, embedding, createdAt: sql`now()` },
    });
}

/**
 * Clinical reference thresholds for derived biomarker ratios.
 */
export const METRIC_REFERENCES: Record<
  string,
  {
    label: string;
    unit: string;
    optimal: [number, number];
    borderline: [number, number];
    description: string;
    reference: string;
  }
> = {
  hdl_ldl_ratio: {
    label: "HDL/LDL Ratio",
    unit: "ratio",
    optimal: [0.4, Infinity],
    borderline: [0.3, 0.4],
    description: "Higher values indicate better cardiovascular lipid balance",
    reference:
      "Castelli WP. Atherosclerosis. 1996;124 Suppl:S1-9. doi:10.1016/0021-9150(96)05851-0",
  },
  total_cholesterol_hdl_ratio: {
    label: "TC/HDL Ratio",
    unit: "ratio",
    optimal: [0, 4.5],
    borderline: [4.5, 5.5],
    description: "Atherogenic index; lower is better for cardiovascular risk",
    reference:
      "Millán J et al. Vasc Health Risk Manag. 2009;5:757-765. doi:10.2147/vhrm.s6269",
  },
  triglyceride_hdl_ratio: {
    label: "TG/HDL Ratio",
    unit: "ratio",
    optimal: [0, 2.0],
    borderline: [2.0, 3.5],
    description:
      "Surrogate marker for insulin resistance and small dense LDL particles",
    reference:
      "McLaughlin T et al. Ann Intern Med. 2003;139(10):802-809. doi:10.7326/0003-4819-139-10-200311180-00007",
  },
  glucose_triglyceride_index: {
    label: "TyG Index",
    unit: "index",
    optimal: [0, 8.5],
    borderline: [8.5, 9.0],
    description:
      "Triglyceride-glucose index; surrogate for insulin resistance",
    reference:
      "Simental-Mendía LE et al. Metab Syndr Relat Disord. 2008;6(4):299-304. doi:10.1089/met.2008.0034",
  },
  neutrophil_lymphocyte_ratio: {
    label: "NLR",
    unit: "ratio",
    optimal: [1.0, 3.0],
    borderline: [3.0, 5.0],
    description:
      "Systemic inflammation marker; elevated values associated with poorer outcomes",
    reference:
      "Forget P et al. BMC Res Notes. 2017;10:12. doi:10.1186/s13104-016-2335-5",
  },
  bun_creatinine_ratio: {
    label: "BUN/Creatinine",
    unit: "ratio",
    optimal: [10, 20],
    borderline: [20, 25],
    description:
      "Renal function discriminator; helps distinguish pre-renal from intrinsic causes",
    reference:
      "Hosten AO. Clinical Methods. 3rd ed. Butterworths; 1990. Ch. 193. PMID:21250147",
  },
  ast_alt_ratio: {
    label: "De Ritis Ratio (AST/ALT)",
    unit: "ratio",
    optimal: [0.8, 1.2],
    borderline: [1.2, 2.0],
    description:
      "Hepatocellular injury pattern; >2.0 suggests alcoholic liver disease",
    reference:
      "De Ritis F et al. Clin Chim Acta. 1957;2(1):70-74. doi:10.1016/0009-8981(57)90027-X; Botros M, Sikaris KA. Clin Biochem Rev. 2013;34(3):117-130. PMID:24353357",
  },
};

export function classifyMetricRisk(
  metricKey: string,
  value: number
): "optimal" | "borderline" | "elevated" | "low" {
  const ref = METRIC_REFERENCES[metricKey];
  if (!ref) return "optimal";
  const [optLo, optHi] = ref.optimal;
  const [, bordHi] = ref.borderline;
  if (value < optLo) return "low";
  if (value <= optHi) return "optimal";
  if (value <= bordHi) return "borderline";
  return "elevated";
}

export function computeMetricVelocity(
  prev: Record<string, number | null>,
  curr: Record<string, number | null>,
  daysBetween: number
): Record<string, number | null> {
  if (daysBetween <= 0) return {};
  const velocity: Record<string, number | null> = {};
  for (const key of Object.keys(curr)) {
    const p = prev[key];
    const c = curr[key];
    velocity[key] = p != null && c != null ? (c - p) / daysBetween : null;
  }
  return velocity;
}

const MARKER_ALIAS_MAP: Record<string, string[]> = {
  hdl: ["hdl", "hdl cholesterol", "hdl-c", "hdl-cholesterol"],
  ldl: ["ldl", "ldl cholesterol", "ldl-c", "ldl-cholesterol"],
  total_cholesterol: [
    "total cholesterol",
    "cholesterol total",
    "cholesterol",
  ],
  triglycerides: ["triglycerides", "triglyceride", "trig"],
  glucose: ["glucose", "fasting glucose", "blood glucose"],
  neutrophils: ["neutrophils", "neutrophil", "neutrophil count", "neut"],
  lymphocytes: ["lymphocytes", "lymphocyte", "lymphocyte count", "lymph"],
  bun: ["bun", "blood urea nitrogen", "urea nitrogen"],
  creatinine: ["creatinine", "creat"],
  ast: ["ast", "aspartate aminotransferase", "sgot"],
  alt: ["alt", "alanine aminotransferase", "sgpt"],
};

/** Compute derived metrics (ratios) from a set of markers. */
export function computeDerivedMetrics(
  markers: MarkerInput[]
): Record<string, number | null> {
  const lookup = new Map<string, number>();
  for (const m of markers) {
    const val = parseFloat(m.value);
    if (!isNaN(val)) {
      lookup.set(m.name.toLowerCase().trim(), val);
    }
  }

  function resolve(key: string): number | null {
    const aliases = MARKER_ALIAS_MAP[key];
    if (!aliases) return null;
    for (const alias of aliases) {
      const val = lookup.get(alias);
      if (val !== undefined) return val;
    }
    return null;
  }

  function ratio(a: string, b: string): number | null {
    const va = resolve(a);
    const vb = resolve(b);
    if (va == null || vb == null || vb === 0) return null;
    return va / vb;
  }

  const trig = resolve("triglycerides");
  const gluc = resolve("glucose");
  const gti =
    trig != null && gluc != null && trig > 0 && gluc > 0
      ? Math.log(trig * gluc * 0.5) / Math.LN10
      : null;

  return {
    hdl_ldl_ratio: ratio("hdl", "ldl"),
    total_cholesterol_hdl_ratio: ratio("total_cholesterol", "hdl"),
    triglyceride_hdl_ratio: ratio("triglycerides", "hdl"),
    glucose_triglyceride_index: gti,
    neutrophil_lymphocyte_ratio: ratio("neutrophils", "lymphocytes"),
    bun_creatinine_ratio: ratio("bun", "creatinine"),
    ast_alt_ratio: ratio("ast", "alt"),
  };
}

/** Format an entire blood panel + derived metrics as structured text for embedding. */
export function formatHealthStateForEmbedding(
  markers: MarkerInput[],
  derivedMetrics: Record<string, number | null>,
  meta: { fileName: string; uploadedAt: string }
): string {
  const flagged = markers.filter((m) => m.flag !== "normal");
  const summary =
    flagged.length > 0
      ? `${flagged.length} abnormal marker(s): ${flagged.map((m) => `${m.name} (${m.flag})`).join(", ")}`
      : "All markers within normal range";

  const metricLines = Object.entries(derivedMetrics)
    .filter(([, v]) => v != null)
    .map(([k, v]) => {
      const val = v as number;
      const risk = classifyMetricRisk(k, val);
      const ref = METRIC_REFERENCES[k];
      const label = ref?.label ?? k;
      return `${label}: ${val.toFixed(4)} [${risk}]`;
    });

  const markerLines = markers.map(
    (m) =>
      `${m.name}: ${m.value} ${m.unit} (ref: ${m.reference_range || "N/A"}) [${m.flag}]`
  );

  return [
    `Health state: ${meta.fileName}`,
    `Date: ${meta.uploadedAt}`,
    `Total markers: ${markers.length}`,
    `Summary: ${summary}`,
    "",
    "Derived metrics (with risk classification):",
    ...(metricLines.length > 0 ? metricLines : ["none computed"]),
    "",
    "All markers:",
    ...markerLines,
  ].join("\n");
}

/** Embed an entire blood panel as a health state vector for trajectory analysis. */
export async function embedHealthState(
  testId: string,
  userId: string,
  markers: MarkerInput[],
  meta: { fileName: string; uploadedAt: string }
) {
  const derivedMetrics = computeDerivedMetrics(markers);
  const content = formatHealthStateForEmbedding(markers, derivedMetrics, meta);
  const embedding = await generateEmbedding(content);

  await db
    .insert(healthStateEmbeddings)
    .values({
      testId,
      userId,
      content,
      derivedMetrics,
      embedding,
    })
    .onConflictDoUpdate({
      target: healthStateEmbeddings.testId,
      set: { content, derivedMetrics, embedding, createdAt: sql`now()` },
    });
}

export { qwen };
