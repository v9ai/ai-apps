import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { db } from "@/lib/db";
import {
  conditionEmbeddings,
  medicationEmbeddings,
  symptomEmbeddings,
  appointmentEmbeddings,
  journalEmbeddings,
} from "@/lib/db/schema";

// ── Singleton pipeline ───────────────────────────────────────────────

let _pipeline: FeatureExtractionPipeline | null = null;

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!_pipeline) {
    // @ts-expect-error — union too complex for HF transformers overloads
    _pipeline = await pipeline("feature-extraction", "Xenova/bge-large-en-v1.5", {
      dtype: "q8",
    });
  }
  return _pipeline;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

// ── Text formatters (mirrors langgraph/embeddings.py) ────────────────

export function formatCondition(name: string, notes: string | null): string {
  return notes ? `Health condition: ${name}\nNotes: ${notes}` : `Health condition: ${name}`;
}

export function formatMedication(
  name: string,
  dosage: string | null,
  frequency: string | null,
  notes: string | null,
): string {
  const lines = [`Medication: ${name}`];
  if (dosage) lines.push(`Dosage: ${dosage}`);
  if (frequency) lines.push(`Frequency: ${frequency}`);
  if (notes) lines.push(`Notes: ${notes}`);
  return lines.join("\n");
}

export function formatSymptom(
  description: string,
  severity: string | null,
  loggedAt: string | null,
): string {
  const lines = [`Symptom: ${description}`];
  if (severity) lines.push(`Severity: ${severity}`);
  if (loggedAt) lines.push(`Date: ${loggedAt}`);
  return lines.join("\n");
}

export function formatAppointment(
  title: string,
  provider: string | null,
  notes: string | null,
  appointmentDate: string | null,
): string {
  const lines = [`Appointment: ${title}`];
  if (provider) lines.push(`Provider: ${provider}`);
  if (appointmentDate) lines.push(`Date: ${appointmentDate}`);
  if (notes) lines.push(`Notes: ${notes}`);
  return lines.join("\n");
}

// ── Entity embed + DB upsert ─────────────────────────────────────────

export async function embedCondition(
  conditionId: string,
  userId: string,
  name: string,
  notes: string | null,
): Promise<void> {
  const content = formatCondition(name, notes);
  const embedding = await generateEmbedding(content);
  await db
    .insert(conditionEmbeddings)
    .values({ conditionId, userId, content, embedding })
    .onConflictDoUpdate({
      target: conditionEmbeddings.conditionId,
      set: { content, embedding },
    });
}

export async function embedMedication(
  medicationId: string,
  userId: string,
  name: string,
  opts: { dosage?: string | null; frequency?: string | null; notes?: string | null },
): Promise<void> {
  const content = formatMedication(
    name,
    opts.dosage ?? null,
    opts.frequency ?? null,
    opts.notes ?? null,
  );
  const embedding = await generateEmbedding(content);
  await db
    .insert(medicationEmbeddings)
    .values({ medicationId, userId, content, embedding })
    .onConflictDoUpdate({
      target: medicationEmbeddings.medicationId,
      set: { content, embedding },
    });
}

export async function embedSymptom(
  symptomId: string,
  userId: string,
  description: string,
  opts: { severity?: string | null; loggedAt?: string | null },
): Promise<void> {
  const content = formatSymptom(description, opts.severity ?? null, opts.loggedAt ?? null);
  const embedding = await generateEmbedding(content);
  await db
    .insert(symptomEmbeddings)
    .values({ symptomId, userId, content, embedding })
    .onConflictDoUpdate({
      target: symptomEmbeddings.symptomId,
      set: { content, embedding },
    });
}

export async function embedAppointment(
  appointmentId: string,
  userId: string,
  title: string,
  opts: {
    provider?: string | null;
    notes?: string | null;
    appointmentDate?: string | null;
  },
): Promise<void> {
  const content = formatAppointment(
    title,
    opts.provider ?? null,
    opts.notes ?? null,
    opts.appointmentDate ?? null,
  );
  const embedding = await generateEmbedding(content);
  await db
    .insert(appointmentEmbeddings)
    .values({ appointmentId, userId, content, embedding })
    .onConflictDoUpdate({
      target: appointmentEmbeddings.appointmentId,
      set: { content, embedding },
    });
}
