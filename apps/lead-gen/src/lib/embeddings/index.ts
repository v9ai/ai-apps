/**
 * Embedding utilities — re-exports from the canonical ml/ modules.
 *
 * The embedding implementation lives in `src/ml/embedder.ts` and
 * `src/ml/company-text.ts`. This barrel provides a convenient
 * `@/lib/embeddings` import path.
 *
 * NOTE: The upstream modules (`@/ml/embedder`, `@/ml/company-text`)
 * must exist before these re-exports resolve. They will be created as
 * part of the ML pipeline buildout.
 */

export {
  embedText,
  embedQuery,
  embedDocument,
  embedBatch,
  cosineSimilarity,
  EMBEDDING_DIM,
} from "@/ml/embedder";

export { companyToEmbeddingText } from "@/ml/company-text";
