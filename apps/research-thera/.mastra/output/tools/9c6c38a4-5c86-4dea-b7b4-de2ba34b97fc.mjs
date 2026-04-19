import { s as sql } from '../mastra.mjs';
import OpenAI from 'openai';
import '@mastra/core';
import '@mastra/deployer-cloudflare';
import '@mastra/core/workflows';
import 'zod';
import '@neondatabase/serverless';
import '@ai-sdk/openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
async function embed(text) {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return res.data[0].embedding;
}
async function upsertResearchChunks(params) {
  const content = [
    params.title,
    params.abstract ?? "",
    ...params.keyFindings ?? [],
    ...params.techniques ?? []
  ].filter(Boolean).join("\n");
  console.log(
    `[RAG] Upserting ${params.entityType} ${params.entityId}: ${params.title}`
  );
  const embedding = await embed(content);
  const metadata = {
    keyFindings: params.keyFindings ?? [],
    techniques: params.techniques ?? []
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
      JSON.stringify(metadata)
    ]
  );
  return embedding.length;
}
async function retrieveGoalContext(goalId, query, topK = 10) {
  console.log(`[RAG] Querying goal ${goalId} context with: ${query}`);
  const queryEmbedding = await embed(query);
  const rows = await sql(
    `SELECT entity_type, entity_id, title, content, metadata,
            1 - (embedding <-> $1) AS similarity
     FROM research_embeddings
     WHERE goal_id = $2
     ORDER BY embedding <-> $1
     LIMIT $3`,
    [JSON.stringify(queryEmbedding), goalId, topK]
  );
  return rows;
}
async function upsertGoalChunks(params) {
  const content = [params.title, params.description ?? ""].filter(Boolean).join("\n");
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
      JSON.stringify({})
    ]
  );
}
async function upsertNoteChunks(params) {
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
      JSON.stringify({})
    ]
  );
}
async function upsertQuestionChunks(params) {
  const content = `${params.question}
${params.rationale}`;
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
      JSON.stringify({})
    ]
  );
}
const ragTools = {
  upsertResearchChunks,
  retrieveGoalContext,
  upsertGoalChunks,
  upsertNoteChunks,
  upsertQuestionChunks
};

export { ragTools, retrieveGoalContext, upsertGoalChunks, upsertNoteChunks, upsertQuestionChunks, upsertResearchChunks };
