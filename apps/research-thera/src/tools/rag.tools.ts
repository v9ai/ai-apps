import { sql } from "@/src/db/neon";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}

/**
 * Upsert research chunks into Neon PGVector store
 */
export async function upsertResearchChunks(params: {
  goalId?: number;
  entityType: "TherapyResearch" | "Goal" | "Note" | "TherapeuticQuestion";
  entityId: number;
  title: string;
  abstract?: string;
  keyFindings?: string[];
  techniques?: string[];
}) {
  const content = [
    params.title,
    params.abstract ?? "",
    ...(params.keyFindings ?? []),
    ...(params.techniques ?? []),
  ]
    .filter(Boolean)
    .join("\n");

  console.log(
    `[RAG] Upserting ${params.entityType} ${params.entityId}: ${params.title}`,
  );

  const embedding = await embed(content);
  const metadata = {
    keyFindings: params.keyFindings ?? [],
    techniques: params.techniques ?? [],
  };

  await sql(
    `INSERT INTO research_embeddings (goal_id, entity_type, entity_id, title, content, embedding, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (entity_type, entity_id) DO UPDATE
       SET title = EXCLUDED.title,
           content = EXCLUDED.content,
           embedding = EXCLUDED.embedding,
           metadata = EXCLUDED.metadata,
           goal_id = EXCLUDED.goal_id`,
    [
      params.goalId ?? null,
      params.entityType,
      params.entityId,
      params.title,
      content,
      JSON.stringify(embedding),
      JSON.stringify(metadata),
    ],
  );

  return embedding.length;
}

/**
 * Retrieve relevant context for a goal using cosine similarity
 */
export async function retrieveGoalContext(
  goalId: number,
  query: string,
  topK: number = 10,
) {
  console.log(`[RAG] Querying goal ${goalId} context with: ${query}`);

  const queryEmbedding = await embed(query);

  // Use pgvector cosine distance operator <=> (range 0..2);
  // cosine similarity = 1 - cosine_distance. The L2 operator <-> would
  // give Euclidean distance, for which `1 - dist` is not a similarity.
  const rows = await sql(
    `SELECT entity_type, entity_id, title, content, metadata,
            1 - (embedding <=> $1) AS similarity
     FROM research_embeddings
     WHERE goal_id = $2
     ORDER BY embedding <=> $1
     LIMIT $3`,
    [JSON.stringify(queryEmbedding), goalId, topK],
  );

  return rows;
}

/**
 * Upsert goal description chunks
 */
export async function upsertGoalChunks(params: {
  goalId: number;
  title: string;
  description?: string;
}) {
  const content = [params.title, params.description ?? ""]
    .filter(Boolean)
    .join("\n");

  console.log(`[RAG] Upserting goal ${params.goalId} chunks`);

  const embedding = await embed(content);

  await sql(
    `INSERT INTO research_embeddings (goal_id, entity_type, entity_id, title, content, embedding, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (entity_type, entity_id) DO UPDATE
       SET title = EXCLUDED.title,
           content = EXCLUDED.content,
           embedding = EXCLUDED.embedding,
           goal_id = EXCLUDED.goal_id`,
    [
      params.goalId,
      "Goal",
      params.goalId,
      params.title,
      content,
      JSON.stringify(embedding),
      JSON.stringify({}),
    ],
  );
}

/**
 * Upsert note chunks
 */
export async function upsertNoteChunks(params: {
  goalId: number;
  noteId: number;
  content: string;
}) {
  console.log(`[RAG] Upserting note ${params.noteId} chunks`);

  const embedding = await embed(params.content);

  await sql(
    `INSERT INTO research_embeddings (goal_id, entity_type, entity_id, title, content, embedding, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (entity_type, entity_id) DO UPDATE
       SET content = EXCLUDED.content,
           embedding = EXCLUDED.embedding,
           goal_id = EXCLUDED.goal_id`,
    [
      params.goalId,
      "Note",
      params.noteId,
      `Note ${params.noteId}`,
      params.content,
      JSON.stringify(embedding),
      JSON.stringify({}),
    ],
  );
}

/**
 * Upsert question chunks
 */
export async function upsertQuestionChunks(params: {
  goalId: number;
  questionId: number;
  question: string;
  rationale: string;
}) {
  const content = `${params.question}\n${params.rationale}`;
  console.log(`[RAG] Upserting question ${params.questionId} chunks`);

  const embedding = await embed(content);

  await sql(
    `INSERT INTO research_embeddings (goal_id, entity_type, entity_id, title, content, embedding, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (entity_type, entity_id) DO UPDATE
       SET title = EXCLUDED.title,
           content = EXCLUDED.content,
           embedding = EXCLUDED.embedding,
           goal_id = EXCLUDED.goal_id`,
    [
      params.goalId,
      "TherapeuticQuestion",
      params.questionId,
      params.question,
      content,
      JSON.stringify(embedding),
      JSON.stringify({}),
    ],
  );
}

export const ragTools = {
  upsertResearchChunks,
  retrieveGoalContext,
  upsertGoalChunks,
  upsertNoteChunks,
  upsertQuestionChunks,
};
