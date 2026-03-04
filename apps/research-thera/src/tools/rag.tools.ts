// import { LibSQLVector } from "@mastra/libsql"; // Disabled: Not compatible with D1
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_DATABASE_ID,
  CLOUDFLARE_D1_TOKEN,
} from "@/src/config/d1";

/**
 * RAG Tools for Mastra Workflows
 * Manages vector embeddings and retrieval using LibSQLVector
 *
 * Note: LibSQLVector is designed for libsql databases. With D1 migration,
 * vector store functionality is temporarily disabled pending D1-compatible
 * vector search implementation.
 */

// TODO: Re-enable vector store with D1-compatible solution
// Initialize vector store
// export const vectorStore = new LibSQLVector({
//   id: "goal-context-v1",
//   url: "...",
//   authToken: "...",
// });

/**
 * Upsert research chunks into vector store
 * TODO: Implement with D1-compatible vector search
 */
export async function upsertResearchChunks(params: {
  goalId: number;
  entityType: "TherapyResearch" | "Goal" | "Note" | "TherapeuticQuestion";
  entityId: number;
  title: string;
  abstract?: string;
  keyFindings?: string[];
  techniques?: string[];
}) {
  // TODO: Implement vector upsert
  console.log(
    `[RAG] Would upsert research chunks for ${params.entityType} ${params.entityId}`,
  );
  return 0;
}

/**
 * Retrieve relevant context for a goal
 * TODO: Implement once Mastra LibSQLVector API is stable
 */
export async function retrieveGoalContext(
  goalId: number,
  query: string,
  topK: number = 10,
) {
  // TODO: Implement vector query
  console.log(`[RAG] Would query goal ${goalId} context with: ${query}`);
  return [];
}

/**
 * Upsert goal description chunks
 * TODO: Implement once Mastra LibSQLVector API is stable
 */
export async function upsertGoalChunks(params: {
  goalId: number;
  title: string;
  description?: string;
}) {
  console.log(`[RAG] Would upsert goal ${params.goalId} chunks`);
}

/**
 * Upsert note chunks
 * TODO: Implement once Mastra LibSQLVector API is stable
 */
export async function upsertNoteChunks(params: {
  goalId: number;
  noteId: number;
  content: string;
}) {
  console.log(`[RAG] Would upsert note ${params.noteId} chunks`);
}

/**
 * Upsert question chunks
 * TODO: Implement once Mastra LibSQLVector API is stable
 */
export async function upsertQuestionChunks(params: {
  goalId: number;
  questionId: number;
  question: string;
  rationale: string;
}) {
  console.log(`[RAG] Would upsert question ${params.questionId} chunks`);
}

export const ragTools = {
  upsertResearchChunks,
  retrieveGoalContext,
  upsertGoalChunks,
  upsertNoteChunks,
  upsertQuestionChunks,
};
