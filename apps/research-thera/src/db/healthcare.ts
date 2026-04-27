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
