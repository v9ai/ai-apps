import { sql as neonSql } from "./neon";
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

// ────────────────────────────────────────────────────────────────────
// Embedding pipeline (singleton — bge-large-en-v1.5, 1024-dim)
// Mirrors apps/agentic-healthcare/lib/embed.ts
// ────────────────────────────────────────────────────────────────────

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

function vec(arr: number[]): string {
  return `[${arr.join(",")}]`;
}

// ────────────────────────────────────────────────────────────────────
// Conditions
// ────────────────────────────────────────────────────────────────────

export type Condition = {
  id: string;
  userId: string;
  name: string;
  notes: string | null;
  createdAt: string;
};

function toCondition(r: Record<string, unknown>): Condition {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    name: r.name as string,
    notes: (r.notes as string | null) ?? null,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

export async function listConditions(userId: string): Promise<Condition[]> {
  const rows = await neonSql`
    SELECT id, user_id, name, notes, created_at
    FROM conditions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows.map(toCondition);
}

export async function getCondition(
  id: string,
  userId: string,
): Promise<Condition | null> {
  const rows = await neonSql`
    SELECT id, user_id, name, notes, created_at
    FROM conditions
    WHERE id = ${id} AND user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ? toCondition(rows[0]) : null;
}

export async function createCondition(params: {
  userId: string;
  name: string;
  notes: string | null;
}): Promise<Condition> {
  const rows = await neonSql`
    INSERT INTO conditions (user_id, name, notes)
    VALUES (${params.userId}, ${params.name}, ${params.notes})
    RETURNING id, user_id, name, notes, created_at
  `;
  return toCondition(rows[0]);
}

export async function deleteCondition(id: string, userId: string): Promise<void> {
  await neonSql`
    DELETE FROM conditions
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

function formatCondition(name: string, notes: string | null): string {
  return notes
    ? `Health condition: ${name}\nNotes: ${notes}`
    : `Health condition: ${name}`;
}

export async function embedCondition(
  conditionId: string,
  userId: string,
  name: string,
  notes: string | null,
): Promise<void> {
  const content = formatCondition(name, notes);
  const embedding = await generateEmbedding(content);
  await neonSql`
    INSERT INTO condition_embeddings (condition_id, user_id, content, embedding)
    VALUES (${conditionId}, ${userId}, ${content}, ${vec(embedding)}::vector)
    ON CONFLICT (condition_id) DO UPDATE
      SET content = EXCLUDED.content,
          embedding = EXCLUDED.embedding
  `;
}

// ────────────────────────────────────────────────────────────────────
// Medications
// ────────────────────────────────────────────────────────────────────

export type Medication = {
  id: string;
  userId: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
};

function toMedication(r: Record<string, unknown>): Medication {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    name: r.name as string,
    dosage: (r.dosage as string | null) ?? null,
    frequency: (r.frequency as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    startDate:
      r.start_date instanceof Date
        ? r.start_date.toISOString().slice(0, 10)
        : (r.start_date as string | null) ?? null,
    endDate:
      r.end_date instanceof Date
        ? r.end_date.toISOString().slice(0, 10)
        : (r.end_date as string | null) ?? null,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

export async function listMedications(userId: string): Promise<Medication[]> {
  const rows = await neonSql`
    SELECT id, user_id, name, dosage, frequency, notes, start_date, end_date, created_at
    FROM medications
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows.map(toMedication);
}

export async function createMedication(params: {
  userId: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
}): Promise<Medication> {
  const rows = await neonSql`
    INSERT INTO medications (user_id, name, dosage, frequency, notes, start_date, end_date)
    VALUES (${params.userId}, ${params.name}, ${params.dosage}, ${params.frequency}, ${params.notes}, ${params.startDate}, ${params.endDate})
    RETURNING id, user_id, name, dosage, frequency, notes, start_date, end_date, created_at
  `;
  return toMedication(rows[0]);
}

export async function deleteMedication(id: string, userId: string): Promise<void> {
  await neonSql`
    DELETE FROM medications
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

function formatMedication(
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

export async function embedMedication(
  medicationId: string,
  userId: string,
  name: string,
  opts: {
    dosage: string | null;
    frequency: string | null;
    notes: string | null;
  },
): Promise<void> {
  const content = formatMedication(name, opts.dosage, opts.frequency, opts.notes);
  const embedding = await generateEmbedding(content);
  await neonSql`
    INSERT INTO medication_embeddings (medication_id, user_id, content, embedding)
    VALUES (${medicationId}, ${userId}, ${content}, ${vec(embedding)}::vector)
    ON CONFLICT (medication_id) DO UPDATE
      SET content = EXCLUDED.content,
          embedding = EXCLUDED.embedding
  `;
}

// ────────────────────────────────────────────────────────────────────
// Symptoms
// ────────────────────────────────────────────────────────────────────

export type Symptom = {
  id: string;
  userId: string;
  description: string;
  severity: string | null;
  loggedAt: string;
  createdAt: string;
};

function toSymptom(r: Record<string, unknown>): Symptom {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    description: r.description as string,
    severity: (r.severity as string | null) ?? null,
    loggedAt:
      r.logged_at instanceof Date
        ? r.logged_at.toISOString()
        : (r.logged_at as string),
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

export async function listSymptoms(userId: string): Promise<Symptom[]> {
  const rows = await neonSql`
    SELECT id, user_id, description, severity, logged_at, created_at
    FROM symptoms
    WHERE user_id = ${userId}
    ORDER BY logged_at DESC
  `;
  return rows.map(toSymptom);
}

export async function createSymptom(params: {
  userId: string;
  description: string;
  severity: string | null;
  loggedAt: string | null;
}): Promise<Symptom> {
  const loggedAt = params.loggedAt ?? new Date().toISOString();
  const rows = await neonSql`
    INSERT INTO symptoms (user_id, description, severity, logged_at)
    VALUES (${params.userId}, ${params.description}, ${params.severity}, ${loggedAt})
    RETURNING id, user_id, description, severity, logged_at, created_at
  `;
  return toSymptom(rows[0]);
}

export async function deleteSymptom(id: string, userId: string): Promise<void> {
  await neonSql`
    DELETE FROM symptoms
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

function formatSymptom(
  description: string,
  severity: string | null,
  loggedAt: string | null,
): string {
  const lines = [`Symptom: ${description}`];
  if (severity) lines.push(`Severity: ${severity}`);
  if (loggedAt) lines.push(`Date: ${loggedAt}`);
  return lines.join("\n");
}

export async function embedSymptom(
  symptomId: string,
  userId: string,
  description: string,
  opts: { severity: string | null; loggedAt: string | null },
): Promise<void> {
  const content = formatSymptom(description, opts.severity, opts.loggedAt);
  const embedding = await generateEmbedding(content);
  await neonSql`
    INSERT INTO symptom_embeddings (symptom_id, user_id, content, embedding)
    VALUES (${symptomId}, ${userId}, ${content}, ${vec(embedding)}::vector)
    ON CONFLICT (symptom_id) DO UPDATE
      SET content = EXCLUDED.content,
          embedding = EXCLUDED.embedding
  `;
}
