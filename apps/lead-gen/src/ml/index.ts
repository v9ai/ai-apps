/**
 * ML module barrel export.
 *
 * Re-exports all public APIs from the ML submodules:
 * - embedder: BGE-small-en-v1.5 embedding service
 * - company-text: Canonical text builder for company embedding
 * - company-classifier: Keyword-based vertical and AI tier classifier
 * - contact-classifier: Weighted contact title classifier
 * - icp-scorer: ICP scoring with hand-tuned weights
 * - contact-ranker: BPR-logistic contact ranking
 * - template-recommender: Beta-binomial template recommendation
 */

export {
  EMBEDDING_DIM,
  MODEL_ID,
  embedText,
  embedQuery,
  embedDocument,
  embedBatch,
  cosineSimilarity,
} from "./embedder";

export {
  companyToEmbeddingText,
  type CompanyTextInput,
} from "./company-text";

export {
  VERTICAL_LABELS,
  AI_TIER_LABELS,
  classifyCompany,
  classifyCompanyLegacy,
  classifyCompanyFast,
  classifyBatch,
  AhoCorasickAutomaton,
  TrieNode,
  type CompanyClassification,
  type FastClassificationResult,
  type ClassificationResult,
  type CompanyInput as ClassifierCompanyInput,
} from "./company-classifier";

export {
  classifyContactML,
  type ContactMLClassification,
} from "./contact-classifier";

export {
  extractICPFeatures,
  scoreICP,
  scoreIcpQuantized,
  scoreIcpBatch,
  sigmoidFast,
  WEIGHTS_INT8,
  WEIGHT_SCALE,
  SIGMOID_LUT,
  type ICPFeatures,
  type CompanyFeatures,
} from "./icp-scorer";

export {
  scoreContact,
  scoreContactQuantized,
  rankContacts,
  rankContactsBatch,
  CONTACT_WEIGHTS_INT8,
  CONTACT_WEIGHT_SCALE,
  type ContactRankFeatures,
} from "./contact-ranker";

export {
  recommendTemplates,
  type TemplateScore,
  type TemplateInput,
  type CompanyInput,
  type OutcomeMap,
} from "./template-recommender";

export {
  analyzePost,
  analyzePostBatch,
  type PostAnalysis,
  type ExtractedSkill,
} from "./post-analyzer";
