/**
 * Canonical skill taxonomy — single source of truth.
 *
 * Both the TypeScript app (src/lib/skills/) and the Python worker
 * (workers/process-jobs/) consume this list. Never duplicate it.
 *
 * To add a skill:
 *   1. Add the tag + label here
 *   2. Run `pnpm schema:generate`
 *   3. The Python worker's SKILL_TAGS frozenset will be regenerated
 */

/** Canonical skill tags with human-readable labels. */
export const SKILL_TAXONOMY: Record<string, string> = {
  // Programming Languages
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  csharp: "C#",
  ruby: "Ruby",
  php: "PHP",
  go: "Go",
  rust: "Rust",
  swift: "Swift",
  kotlin: "Kotlin",
  scala: "Scala",
  elixir: "Elixir",

  // Frontend Frameworks
  react: "React",
  vue: "Vue.js",
  angular: "Angular",
  svelte: "Svelte",
  nextjs: "Next.js",

  // Backend Frameworks
  nodejs: "Node.js",
  express: "Express.js",
  django: "Django",
  flask: "Flask",
  laravel: "Laravel",
  fastapi: "FastAPI",
  "spring-boot": "Spring Boot",

  // Mobile Development
  "react-native": "React Native",
  flutter: "Flutter",
  ios: "iOS Development",
  android: "Android Development",

  // Databases
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  mongodb: "MongoDB",
  redis: "Redis",
  elasticsearch: "Elasticsearch",
  cassandra: "Cassandra",
  dynamodb: "DynamoDB",
  sqlite: "SQLite",
  sql: "SQL",

  // Cloud & DevOps
  aws: "Amazon Web Services",
  gcp: "Google Cloud Platform",
  azure: "Microsoft Azure",
  docker: "Docker",
  kubernetes: "Kubernetes",
  terraform: "Terraform",
  ansible: "Ansible",
  jenkins: "Jenkins",
  "ci-cd": "CI/CD",
  circleci: "CircleCI",
  serverless: "Serverless",

  // Architecture
  microservices: "Microservices",
  "rest-api": "REST API",
  graphql: "GraphQL",
  grpc: "gRPC",
  websocket: "WebSocket",
  "event-driven": "Event-Driven Architecture",

  // Tools
  git: "Git",
  linux: "Linux",
  agile: "Agile",
  tdd: "Test-Driven Development",
  webpack: "Webpack",
  jest: "Jest",
  pytest: "pytest",
  tailwind: "Tailwind CSS",

  // Data Science & ML
  "machine-learning": "Machine Learning",
  "deep-learning": "Deep Learning",
  tensorflow: "TensorFlow",
  pytorch: "PyTorch",
  pandas: "Pandas",
  numpy: "NumPy",
  scikit: "scikit-learn",
  nlp: "Natural Language Processing",
  "computer-vision": "Computer Vision",

  // AI / LLM / GenAI
  llm: "Large Language Models",
  rag: "Retrieval-Augmented Generation",
  "prompt-engineering": "Prompt Engineering",
  "fine-tuning": "Fine-Tuning",
  embeddings: "Embeddings",
  transformers: "Transformers",
  agents: "AI Agents",
  "agentic-ai": "Agentic AI",
  langchain: "LangChain",
  langgraph: "LangGraph",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  "vercel-ai-sdk": "Vercel AI SDK",
  "vector-db": "Vector Databases",
  pinecone: "Pinecone",
  weaviate: "Weaviate",
  chromadb: "ChromaDB",
  mlops: "MLOps",
  huggingface: "Hugging Face",
  "model-evaluation": "Model Evaluation",
  "structured-output": "Structured Output",
  "function-calling": "Function Calling",
  mastra: "Mastra",

  // Cloudflare ecosystem
  "cloudflare-workers": "Cloudflare Workers",
  "cloudflare-workers-ai": "Cloudflare Workers AI",
  "cloudflare-d1": "Cloudflare D1",
  "cloudflare-vectorize": "Cloudflare Vectorize",

  // Frontend (extended)
  "next-auth": "NextAuth.js",
  "radix-ui": "Radix UI",
  "shadcn-ui": "shadcn/ui",
  storybook: "Storybook",
  playwright: "Playwright",
  cypress: "Cypress",
  vitest: "Vitest",
  "react-query": "React Query / TanStack Query",
  zustand: "Zustand",
  "apollo-client": "Apollo Client",
  remix: "Remix",
  astro: "Astro",

  // Backend (extended)
  "drizzle-orm": "Drizzle ORM",
  prisma: "Prisma",
  trpc: "tRPC",
  hono: "Hono",
  bun: "Bun",
  deno: "Deno",
};

/** Set of all canonical skill tags. */
export const SKILL_TAGS = new Set(Object.keys(SKILL_TAXONOMY));

/**
 * ESCO (European Skills, Competences, Qualifications and Occupations) URI mappings.
 * Maps internal skill tags to their ESCO v1.1.0 equivalents.
 * Used for eval benchmarking against TechWolf datasets and EU labor market interop.
 *
 * URI format: http://data.europa.eu/esco/skill/<id>
 * Labels match ESCO preferred terms.
 */
export const ESCO_SKILL_MAP: Record<string, { label: string; uri?: string }> = {
  // Programming Languages
  javascript: { label: "JavaScript" },
  typescript: { label: "TypeScript" },
  python: { label: "Python (computer programming)" },
  java: { label: "Java (computer programming)" },
  csharp: { label: "C#" },
  ruby: { label: "Ruby (computer programming)" },
  php: { label: "PHP" },
  go: { label: "Go (computer programming)" },
  rust: { label: "Rust (computer programming)" },
  swift: { label: "Swift (programming language)" },
  kotlin: { label: "Kotlin (computer programming)" },
  scala: { label: "Scala" },

  // Frontend
  react: { label: "React.js" },
  vue: { label: "Vue.js" },
  angular: { label: "AngularJS" },
  nextjs: { label: "Next.js" },

  // Backend
  nodejs: { label: "Node.js" },
  django: { label: "Django (web framework)" },
  flask: { label: "Flask (web framework)" },
  fastapi: { label: "FastAPI" },
  "spring-boot": { label: "Spring Boot" },

  // Databases
  postgresql: { label: "PostgreSQL" },
  mysql: { label: "MySQL" },
  mongodb: { label: "MongoDB" },
  redis: { label: "Redis" },
  elasticsearch: { label: "Elasticsearch" },
  sql: { label: "use structured query language" },

  // Cloud & DevOps
  aws: { label: "Amazon Web Services" },
  gcp: { label: "Google Cloud Platform" },
  azure: { label: "Microsoft Azure" },
  docker: { label: "use Docker" },
  kubernetes: { label: "Kubernetes" },
  terraform: { label: "Terraform" },
  ansible: { label: "Ansible" },
  "ci-cd": { label: "continuous integration" },

  // Architecture
  microservices: { label: "microservices architecture" },
  "rest-api": { label: "representational state transfer" },
  graphql: { label: "GraphQL" },

  // Tools
  git: { label: "use Git" },
  linux: { label: "Linux" },
  agile: { label: "agile project management" },

  // Data Science & ML
  "machine-learning": { label: "machine learning" },
  "deep-learning": { label: "deep learning" },
  tensorflow: { label: "TensorFlow" },
  pytorch: { label: "PyTorch" },
  pandas: { label: "pandas (software)" },
  numpy: { label: "NumPy" },
  scikit: { label: "scikit-learn" },
  nlp: { label: "natural language processing" },
  "computer-vision": { label: "computer vision" },

  // AI / LLM / GenAI
  llm: { label: "large language models" },
  embeddings: { label: "word embeddings" },
  transformers: { label: "transformer architecture" },
  mlops: { label: "machine learning operations" },
  huggingface: { label: "Hugging Face" },
};

/** Set of tags that have ESCO mappings. */
export const ESCO_MAPPED_TAGS = new Set(Object.keys(ESCO_SKILL_MAP));

/** Reverse lookup: ESCO label (lowercased) → internal tag. */
export const ESCO_LABEL_TO_TAG: Record<string, string> = Object.fromEntries(
  Object.entries(ESCO_SKILL_MAP).map(([tag, { label }]) => [label.toLowerCase(), tag])
);
