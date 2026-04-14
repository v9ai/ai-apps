/**
 * Client-safe article metadata and matching engine.
 *
 * lib/articles.ts imports `fs` at the top level, so it cannot be used in
 * "use client" components. This module duplicates the pure data (slugs,
 * categories, icons) and provides a keyword-based matcher to connect
 * study plan headings → knowledge-base articles.
 *
 * Source of truth: lib/articles.ts (LESSON_SLUGS, CATEGORIES, CATEGORY_META)
 */

/* ── Types ──────────────────────────────────────────────────────── */

export interface LessonStub {
  slug: string;
  title: string;
  category: string;
  icon: string;
  url: string;
  number: number;
}

/* ── Raw data (mirrors lib/articles.ts) ─────────────────────────── */

const LESSON_SLUGS = [
  "transformer-architecture", "scaling-laws", "tokenization",
  "model-architectures", "inference-optimization", "pretraining-data", "embeddings",
  "prompt-engineering-fundamentals", "few-shot-chain-of-thought", "system-prompts",
  "structured-output", "prompt-optimization", "adversarial-prompting",
  "embedding-models", "vector-databases", "chunking-strategies",
  "retrieval-strategies", "advanced-rag", "rag-evaluation",
  "fine-tuning-fundamentals", "lora-adapters", "rlhf-preference",
  "dataset-curation", "continual-learning", "distillation-compression",
  "context-engineering", "context-window-management", "memory-architectures",
  "prompt-caching", "dynamic-context-assembly", "context-compression",
  "function-calling", "agent-architectures", "multi-agent-systems",
  "agent-memory", "code-agents", "agent-evaluation",
  "agent-harnesses", "agent-orchestration", "agent-sdks", "agent-debugging",
  "eval-fundamentals", "benchmark-design", "llm-as-judge",
  "human-evaluation", "red-teaming", "eval-frameworks-comparison", "deepeval-synthesizer",
  "llm-serving", "scaling-load-balancing", "cost-optimization",
  "observability", "edge-deployment", "ai-gateway",
  "constitutional-ai", "guardrails-filtering", "hallucination-mitigation",
  "bias-fairness", "ai-governance", "interpretability", "ci-cd-ai",
  "vision-language-models", "audio-speech-ai", "ai-for-code", "conversational-ai",
  "search-recommendations", "production-patterns", "langgraph",
  "langgraph-red-teaming", "llamaindex", "ai-engineer-roadmap",
  "aws", "azure", "gcp", "docker", "kubernetes",
  "aws-lambda-serverless", "aws-api-gateway-networking", "aws-iam-security",
  "aws-compute-containers", "aws-storage-s3", "aws-cicd-devops",
  "aws-architecture", "aws-ai-ml-services", "dynamodb-data-services",
  "microservices", "ci-cd", "nodejs", "solid-principles", "acid-properties",
];

const CATEGORIES: [number, number, string, string][] = [
  [1, 7, "Foundations & Architecture", "🧱"],
  [8, 13, "Prompting & In-Context Learning", "💡"],
  [14, 19, "RAG & Retrieval", "🔍"],
  [20, 25, "Fine-tuning & Training", "🔧"],
  [26, 31, "Context Engineering", "🧩"],
  [32, 41, "Agents & Harnesses", "🤖"],
  [42, 48, "Evals & Testing", "📊"],
  [49, 54, "Infrastructure & Deployment", "⚡"],
  [55, 61, "Safety & Alignment", "🛡"],
  [62, 65, "Multimodal AI", "👁"],
  [66, 71, "Applied AI & Production", "🚀"],
  [72, 76, "Cloud Platforms", "☁"],
  [77, 85, "AWS Deep Dives", "☁"],
  [86, 90, "Software Engineering", "🏗"],
];

const AWS_DEEP_DIVE_SLUGS = new Set([
  "aws-lambda-serverless", "aws-api-gateway-networking", "aws-iam-security",
  "aws-compute-containers", "aws-storage-s3", "aws-cicd-devops",
  "aws-architecture", "aws-ai-ml-services", "dynamodb-data-services",
]);

/** Slug-derived titles are sometimes poor — override those here */
const TITLE_OVERRIDES: Record<string, string> = {
  "rlhf-preference": "RLHF & Preference Optimization",
  "ci-cd-ai": "CI/CD for AI Systems",
  "ci-cd": "CI/CD Pipelines",
  "few-shot-chain-of-thought": "Few-Shot & Chain-of-Thought",
  "llm-as-judge": "LLM-as-Judge Evaluation",
  "llm-serving": "LLM Serving & Inference",
  "ai-for-code": "AI for Code Generation",
  "ai-gateway": "AI Gateway & Routing",
  "ai-engineer-roadmap": "AI Engineer Roadmap",
  "ai-governance": "AI Governance & Policy",
  "deepeval-synthesizer": "DeepEval Synthesizer",
  "dynamodb-data-services": "DynamoDB & Data Services",
  "aws-api-gateway-networking": "AWS API Gateway & Networking",
  "aws-iam-security": "AWS IAM & Security",
  "aws-compute-containers": "AWS Compute & Containers",
  "aws-storage-s3": "AWS S3 & Storage",
  "aws-cicd-devops": "AWS CI/CD & DevOps",
  "aws-ai-ml-services": "AWS AI/ML Services",
  "aws-lambda-serverless": "AWS Lambda & Serverless",
  "aws-architecture": "AWS Architecture Patterns",
  "lora-adapters": "LoRA & QLoRA Adapters",
  "solid-principles": "SOLID Principles",
  "acid-properties": "ACID Properties",
  "nodejs": "Node.js",
  "gcp": "Google Cloud Platform",
  "langgraph-red-teaming": "LangGraph Red Teaming",
};

/* ── Build stubs ────────────────────────────────────────────────── */

function getUrl(slug: string): string {
  if (AWS_DEEP_DIVE_SLUGS.has(slug)) {
    const sub = slug.startsWith("aws-") ? slug.slice(4) : slug;
    return `/aws/${sub}`;
  }
  return `/${slug}`;
}

function humanize(slug: string): string {
  if (TITLE_OVERRIDES[slug]) return TITLE_OVERRIDES[slug];
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAi\b/g, "AI")
    .replace(/\bRag\b/g, "RAG")
    .replace(/\bLlm\b/g, "LLM")
    .replace(/\bSdk(s?)\b/g, "SDK$1")
    .replace(/\bApi\b/g, "API")
    .replace(/\bCi\b/g, "CI")
    .replace(/\bCd\b/g, "CD")
    .replace(/\bIam\b/g, "IAM")
    .replace(/\bS3\b/gi, "S3")
    .replace(/\bAws\b/g, "AWS")
    .replace(/\bMl\b/g, "ML");
}

function getCategoryInfo(num: number): { name: string; icon: string } {
  for (const [lo, hi, name, icon] of CATEGORIES) {
    if (num >= lo && num <= hi) return { name, icon };
  }
  return { name: "Other", icon: "📄" };
}

export const ARTICLE_STUBS: LessonStub[] = LESSON_SLUGS.map((slug, i) => {
  const number = i + 1;
  const { name, icon } = getCategoryInfo(number);
  return { slug, title: humanize(slug), category: name, icon, url: getUrl(slug), number };
});

/* ── Keyword index & matcher ────────────────────────────────────── */

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

// Inverted index: token → set of article indices
const KEYWORD_INDEX = new Map<string, Set<number>>();

for (let i = 0; i < ARTICLE_STUBS.length; i++) {
  const stub = ARTICLE_STUBS[i];
  const tokens = new Set([
    ...tokenize(stub.slug.replace(/-/g, " ")),
    ...tokenize(stub.title),
    ...tokenize(stub.category),
  ]);
  for (const t of tokens) {
    let set = KEYWORD_INDEX.get(t);
    if (!set) { set = new Set(); KEYWORD_INDEX.set(t, set); }
    set.add(i);
  }
}

export function matchArticles(
  heading: string,
  techTags?: string[],
  maxResults = 4,
): LessonStub[] {
  const headingTokens = tokenize(heading);
  const scores = new Float32Array(ARTICLE_STUBS.length);

  // Score by heading keyword matches against article index
  for (const token of headingTokens) {
    const indices = KEYWORD_INDEX.get(token);
    if (indices) {
      for (const idx of indices) scores[idx] += 3;
    }
  }

  // Boost articles whose slug contains a tech tag from the job description
  if (techTags) {
    for (const tag of techTags) {
      const tagToken = tag.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (tagToken.length < 2) continue;
      for (let i = 0; i < ARTICLE_STUBS.length; i++) {
        if (ARTICLE_STUBS[i].slug.includes(tagToken)) scores[i] += 2;
      }
    }
  }

  // Collect, filter, sort, return top N
  const results: { stub: LessonStub; score: number }[] = [];
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] >= 3) results.push({ stub: ARTICLE_STUBS[i], score: scores[i] });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults).map((r) => r.stub);
}
