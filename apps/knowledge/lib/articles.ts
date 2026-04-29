import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export interface Lesson {
  slug: string;
  fileSlug: string;
  number: number;
  title: string;
  category: string;
  excerpt: string;
  difficulty: DifficultyLevel;
  wordCount: number;
  readingTimeMin: number;
  url: string;
}

export interface LessonWithContent extends Lesson {
  content: string;
}

export interface CategoryMeta {
  slug: string;
  icon: string;
  description: string;
  gradient: [string, string]; // [from, to] CSS colors
  outcomes?: string[];
}

export interface GroupedLessons {
  category: string;
  meta: CategoryMeta;
  articles: Lesson[];
}

// Ordered list of slugs — position (1-indexed) defines the lesson number
const LESSON_SLUGS = [
  // Foundations & Architecture (1-7)
  "transformer-architecture",
  "scaling-laws",
  "tokenization",
  "model-architectures",
  "inference-optimization",
  "pretraining-data",
  "embeddings",
  // Prompting & In-Context Learning (8-13)
  "prompt-engineering-fundamentals",
  "few-shot-chain-of-thought",
  "system-prompts",
  "structured-output",
  "prompt-optimization",
  "adversarial-prompting",
  // RAG & Retrieval (14-19)
  "embedding-models",
  "vector-databases",
  "chunking-strategies",
  "retrieval-strategies",
  "advanced-rag",
  "rag-evaluation",
  // Fine-tuning & Training (20-25)
  "fine-tuning-fundamentals",
  "lora-adapters",
  "rlhf-preference",
  "dataset-curation",
  "continual-learning",
  "distillation-compression",
  // Context Engineering (26-31)
  "context-engineering",
  "context-window-management",
  "memory-architectures",
  "prompt-caching",
  "dynamic-context-assembly",
  "context-compression",
  // Agents & Harnesses (32-41)
  "function-calling",
  "agent-architectures",
  "multi-agent-systems",
  "agent-memory",
  "code-agents",
  "agent-evaluation",
  "agent-harnesses",
  "agent-orchestration",
  "agent-sdks",
  "agent-debugging",
  // Evals & Testing (42-48)
  "eval-fundamentals",
  "benchmark-design",
  "llm-as-judge",
  "human-evaluation",
  "red-teaming",
  "eval-frameworks-comparison",
  "deepeval-synthesizer",
  // Infrastructure & Deployment (49-54)
  "llm-serving",
  "scaling-load-balancing",
  "cost-optimization",
  "observability",
  "edge-deployment",
  "ai-gateway",
  // Safety & Alignment (55-61)
  "constitutional-ai",
  "guardrails-filtering",
  "hallucination-mitigation",
  "bias-fairness",
  "ai-governance",
  "interpretability",
  "ci-cd-ai",
  // Multimodal AI (62-65)
  "vision-language-models",
  "audio-speech-ai",
  "ai-for-code",
  "conversational-ai",
  // Applied AI & Production (66-71)
  "search-recommendations",
  "production-patterns",
  "langgraph",
  "langgraph-red-teaming",
  "llamaindex",
  "ai-engineer-roadmap",
  // Cloud Platforms (72-76)
  "aws",
  "azure",
  "gcp",
  "docker",
  "kubernetes",
  // AWS Deep Dives (77-85)
  "aws-lambda-serverless",
  "aws-api-gateway-networking",
  "aws-iam-security",
  "aws-compute-containers",
  "aws-storage-s3",
  "aws-cicd-devops",
  "aws-architecture",
  "aws-ai-ml-services",
  "dynamodb-data-services",
  // Software Engineering (86-92)
  "microservices",
  "ci-cd",
  "nodejs",
  "solid-principles",
  "acid-properties",
  "postgresql-joins",
  "foreign-keys",
  // Communication Skills (93)
  "public-speaking",
];

export const LESSON_NUMBER: Record<string, number> = Object.fromEntries(
  LESSON_SLUGS.map((slug, i) => [slug, i + 1]),
);

export const CATEGORIES: [number, number, string][] = [
  [1, 7, "Foundations & Architecture"],
  [8, 13, "Prompting & In-Context Learning"],
  [14, 19, "RAG & Retrieval"],
  [20, 25, "Fine-tuning & Training"],
  [26, 31, "Context Engineering"],
  [32, 41, "Agents & Harnesses"],
  [42, 48, "Evals & Testing"],
  [49, 54, "Infrastructure & Deployment"],
  [55, 61, "Safety & Alignment"],
  [62, 65, "Multimodal AI"],
  [66, 71, "Applied AI & Production"],
  [72, 76, "Cloud Platforms"],
  [77, 85, "AWS Deep Dives"],
  [86, 92, "Software Engineering"],
  [93, 93, "Communication Skills"],
];

export const CATEGORY_META: Record<string, CategoryMeta> = {
  "Foundations & Architecture": {
    slug: "foundations-architecture",
    icon: "🧱",
    description: "Start here — learn how transformers & LLMs actually work under the hood",
    gradient: ["var(--violet-9)", "var(--violet-11)"],
    outcomes: ["Understand self-attention and transformer internals", "Grasp scaling laws and tokenization", "Compare model architectures (GPT, Llama, Mistral)"],
  },
  "Prompting & In-Context Learning": {
    slug: "prompting-icl",
    icon: "💡",
    description: "Master the art of talking to LLMs — from basic prompts to advanced techniques",
    gradient: ["var(--blue-9)", "var(--blue-11)"],
    outcomes: ["Write effective system prompts and few-shot examples", "Use chain-of-thought and structured output", "Defend against prompt injection attacks"],
  },
  "RAG & Retrieval": {
    slug: "rag-retrieval",
    icon: "🔍",
    description: "Learn to connect LLMs to your own data with retrieval-augmented generation",
    gradient: ["var(--cyan-9)", "var(--cyan-11)"],
    outcomes: ["Build embedding and vector search pipelines", "Choose chunking and retrieval strategies", "Evaluate RAG system quality end-to-end"],
  },
  "Fine-tuning & Training": {
    slug: "fine-tuning",
    icon: "🔧",
    description: "Customize models for your use case with LoRA, RLHF & hands-on training",
    gradient: ["var(--jade-9)", "var(--jade-11)"],
    outcomes: ["Fine-tune with LoRA and QLoRA adapters", "Curate high-quality training datasets", "Apply RLHF and preference optimization"],
  },
  "Context Engineering": {
    slug: "context-engineering",
    icon: "🧩",
    description: "Master the discipline of designing what LLMs see — context windows, memory, caching, and dynamic assembly",
    gradient: ["var(--teal-9)", "var(--teal-11)"],
    outcomes: ["Design context window strategies and token budgets", "Implement memory architectures and prompt caching", "Build dynamic context assembly pipelines"],
  },
  "Agents & Harnesses": {
    slug: "agents-harnesses",
    icon: "🤖",
    description: "Build AI agents, harnesses, and orchestration systems that reason, act, and scale in production",
    gradient: ["var(--amber-9)", "var(--amber-11)"],
    outcomes: ["Implement function calling and agent architectures", "Design harnesses with event loops and permission models", "Build orchestration, debugging, and SDK integration patterns"],
  },
  "Evals & Testing": {
    slug: "evals-testing",
    icon: "📊",
    description: "Learn to measure what matters — testing and evaluating AI systems properly",
    gradient: ["var(--crimson-9)", "var(--crimson-11)"],
    outcomes: ["Design benchmarks and evaluation suites", "Use LLM-as-judge and human evaluation", "Red-team models for safety and reliability"],
  },
  "Infrastructure & Deployment": {
    slug: "infra-deployment",
    icon: "⚡",
    description: "Ship AI to production — serving, scaling, and keeping costs under control",
    gradient: ["var(--indigo-9)", "var(--indigo-11)"],
    outcomes: ["Serve LLMs with vLLM, TGI, and Triton", "Optimize inference costs at scale", "Set up observability and API gateways"],
  },
  "Safety & Alignment": {
    slug: "safety-alignment",
    icon: "🛡",
    description: "Build AI you can trust — guardrails, bias mitigation, and responsible practices",
    gradient: ["var(--orange-9)", "var(--orange-11)"],
    outcomes: ["Implement content filtering and guardrails", "Mitigate hallucinations and bias", "Apply governance and interpretability practices"],
  },
  "Multimodal AI": {
    slug: "multimodal-ai",
    icon: "👁",
    description: "Go beyond text — vision, audio, code generation, and conversational AI systems",
    gradient: ["var(--purple-9)", "var(--purple-11)"],
    outcomes: ["Work with vision-language models", "Build speech and audio AI pipelines", "Design conversational and code AI systems"],
  },
  "Applied AI & Production": {
    slug: "applied-production",
    icon: "🚀",
    description: "Real-world patterns, frameworks, and your roadmap to becoming an AI engineer",
    gradient: ["var(--slate-9)", "var(--slate-11)"],
    outcomes: ["Apply context engineering patterns", "Build with LangGraph and LlamaIndex", "Plan your AI engineer career path"],
  },
  "Cloud Platforms": {
    slug: "cloud-platforms",
    icon: "☁",
    description: "Overview of the major cloud providers, container runtimes, and orchestration platforms",
    gradient: ["var(--sky-9)", "var(--sky-11)"],
    outcomes: ["Compare AWS, Azure, and GCP capabilities", "Containerize workloads with Docker", "Orchestrate containers with Kubernetes"],
  },
  "AWS Deep Dives": {
    slug: "aws-deep-dives",
    icon: "☁",
    description: "Deep-dive reference guides for core AWS services — Lambda, ECS/EKS, IAM, S3, CI/CD, and AI/ML",
    gradient: ["var(--amber-9)", "var(--amber-11)"],
    outcomes: ["Master Lambda, API Gateway, and serverless patterns", "Secure workloads with IAM, KMS, and VPC", "Build CI/CD pipelines and IaC with CDK/CloudFormation"],
  },
  "Software Engineering": {
    slug: "software-engineering",
    icon: "🏗",
    description: "Timeless engineering principles — SOLID design, ACID guarantees, and production architecture",
    gradient: ["var(--slate-9)", "var(--slate-11)"],
    outcomes: ["Apply SOLID principles to real codebases", "Understand ACID transaction guarantees", "Design microservices and CI/CD pipelines"],
  },
  "Communication Skills": {
    slug: "communication-skills",
    icon: "🎤",
    description: "Speak with structure, presence, and confidence — public speaking and audience engagement for engineers",
    gradient: ["var(--ruby-9)", "var(--ruby-11)"],
    outcomes: ["Structure talks that hold attention", "Manage stage fright with rehearsal techniques", "Engage audiences through stories and pacing"],
  },
};

export function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? {
    slug: "other",
    icon: "📄",
    description: "",
    gradient: ["var(--indigo-9)", "var(--indigo-11)"],
  };
}

function getCategory(num: number): string {
  for (const [lo, hi, name] of CATEGORIES) {
    if (num >= lo && num <= hi) return name;
  }
  return "Other";
}

export function resolveContentFile(slug: string): string | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  return fs.existsSync(filePath) ? filePath : null;
}

function extractTitle(content: string): string {
  for (const line of content.split("\n")) {
    const match = line.match(/^#\s+(.+)/);
    if (match) return match[1].trim();
  }
  return "Untitled";
}

function extractExcerpt(content: string, maxLen = 120): string {
  const lines = content.split("\n");
  let pastTitle = false;
  for (const line of lines) {
    if (!pastTitle) {
      if (line.match(/^#\s+/)) pastTitle = true;
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("```") || trimmed.startsWith("|") || trimmed.startsWith("-")) continue;
    // Strip markdown bold/italic/links
    const plain = trimmed
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      .replace(/`(.+?)`/g, "$1");
    if (plain.length < 30) continue;
    return plain.length > maxLen ? plain.slice(0, maxLen - 1).replace(/\s\S*$/, "") + "..." : plain;
  }
  return "";
}

export const AWS_DEEP_DIVE_SLUGS = new Set([
  "aws-lambda-serverless",
  "aws-api-gateway-networking",
  "aws-iam-security",
  "aws-compute-containers",
  "aws-storage-s3",
  "aws-cicd-devops",
  "aws-architecture",
  "aws-ai-ml-services",
  "dynamodb-data-services",
]);

export function getUrlPath(slug: string): string {
  if (AWS_DEEP_DIVE_SLUGS.has(slug)) {
    const sub = slug.startsWith("aws-") ? slug.slice(4) : slug;
    return `/aws/${sub}`;
  }
  return `/${slug}`;
}

function getDifficulty(number: number): DifficultyLevel {
  const cat = CATEGORIES.find(([lo, hi]) => number >= lo && number <= hi);
  if (!cat) return "intermediate";
  const [lo, hi] = cat;
  const range = hi - lo;
  const pos = (number - lo) / (range || 1);
  if (pos <= 0.4) return "beginner";
  if (pos <= 0.7) return "intermediate";
  return "advanced";
}

let _lessons: Lesson[] | null = null;

export function getAllLessons(): Lesson[] {
  if (_lessons) return _lessons;
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));

  _lessons = files
    .filter((file) => file.replace(/\.md$/, "") in LESSON_NUMBER)
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const number = LESSON_NUMBER[slug] ?? 0;
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
      const title = extractTitle(raw);
      const category = getCategory(number);
      const wordCount = raw.split(/\s+/).filter(Boolean).length;
      const readingTimeMin = Math.max(1, Math.round(wordCount / 200));
      const excerpt = extractExcerpt(raw);
      const difficulty = getDifficulty(number);
      return { slug, fileSlug: slug, number, title, category, excerpt, difficulty, wordCount, readingTimeMin, url: getUrlPath(slug) };
    })
    .sort((a, b) => a.number - b.number);
  return _lessons;
}

export function getLessonBySlug(slug: string): LessonWithContent | null {
  const file = resolveContentFile(slug);
  if (!file) return null;
  const raw = fs.readFileSync(file, "utf-8");
  const number = LESSON_NUMBER[slug] ?? 0;
  const title = extractTitle(raw);
  const category = getCategory(number);
  const wordCount = raw.split(/\s+/).filter(Boolean).length;
  const readingTimeMin = Math.max(1, Math.round(wordCount / 200));
  const excerpt = extractExcerpt(raw);
  const difficulty = getDifficulty(number);
  return { slug, fileSlug: slug, number, title, category, excerpt, difficulty, wordCount, readingTimeMin, url: getUrlPath(slug), content: raw };
}

export function getTotalWordCount(): number {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
  let total = 0;
  for (const file of files) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
    total += raw.split(/\s+/).filter(Boolean).length;
  }
  return total;
}

export function getGroupedLessons(): GroupedLessons[] {
  const lessons = getAllLessons();
  const groups = new Map<string, Lesson[]>();

  for (const a of lessons) {
    const list = groups.get(a.category) || [];
    list.push(a);
    groups.set(a.category, list);
  }

  // Return in category order (based on CATEGORIES array)
  const ordered: GroupedLessons[] = [];
  for (const [, , name] of CATEGORIES) {
    const list = groups.get(name);
    if (list && list.length > 0) {
      ordered.push({ category: name, meta: getCategoryMeta(name), articles: list });
    }
  }
  return ordered;
}
