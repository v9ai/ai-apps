/**
 * Entity value normalization for B2B NER output.
 *
 * Converts raw extracted text into structured values:
 *   - Funding amounts  →  numeric USD value
 *   - Team sizes       →  numeric headcount
 *   - Tech names       →  canonical casing / name
 */

// ---------------------------------------------------------------------------
// Funding
// ---------------------------------------------------------------------------

const MAGNITUDE_SUFFIXES: Record<string, number> = {
  k: 1_000,
  K: 1_000,
  m: 1_000_000,
  M: 1_000_000,
  b: 1_000_000_000,
  B: 1_000_000_000,
  bn: 1_000_000_000,
  Bn: 1_000_000_000,
  t: 1_000_000_000_000,
  T: 1_000_000_000_000,
  thousand: 1_000,
  million: 1_000_000,
  billion: 1_000_000_000,
  trillion: 1_000_000_000_000,
};

/**
 * Parse a funding amount string into a numeric USD value.
 *
 * @example
 * normalizeFundingAmount("$5M")        // 5_000_000
 * normalizeFundingAmount("raised $120M") // 120_000_000
 * normalizeFundingAmount("€3.5 billion") // 3_500_000_000
 * normalizeFundingAmount("gibberish")    // null
 */
export function normalizeFundingAmount(text: string): number | null {
  // Strip currency symbols and commas, collapse whitespace
  const cleaned = text.replace(/[€£¥₹$,]/g, "").trim();

  // Pattern: optional number with decimals, then optional multiplier word/suffix
  const match = cleaned.match(
    /(\d+(?:\.\d+)?)\s*(k|K|m|M|b|B|bn|Bn|t|T|thousand|million|billion|trillion)?/,
  );
  if (!match) return null;

  const base = parseFloat(match[1]);
  if (Number.isNaN(base)) return null;

  const suffix = match[2];
  const multiplier = suffix ? (MAGNITUDE_SUFFIXES[suffix] ?? 1) : 1;

  return base * multiplier;
}

// ---------------------------------------------------------------------------
// Team size
// ---------------------------------------------------------------------------

/**
 * Parse a team-size string into a numeric headcount.
 * For range expressions (e.g. "200-500"), returns the midpoint.
 *
 * @example
 * normalizeTeamSize("200 employees")  // 200
 * normalizeTeamSize("team of 50+")    // 50
 * normalizeTeamSize("500-person")     // 500
 * normalizeTeamSize("200-500")        // 350
 */
export function normalizeTeamSize(text: string): number | null {
  const cleaned = text.replace(/,/g, "").trim();

  // Range: "200-500", "200 to 500"
  const rangeMatch = cleaned.match(/(\d+)\s*[-–—]\s*(\d+)/);
  if (rangeMatch) {
    const lo = parseInt(rangeMatch[1], 10);
    const hi = parseInt(rangeMatch[2], 10);
    if (!Number.isNaN(lo) && !Number.isNaN(hi)) {
      return Math.round((lo + hi) / 2);
    }
  }

  // Single number with optional suffix/prefix context
  const singleMatch = cleaned.match(/(\d+)\s*\+?/);
  if (singleMatch) {
    const n = parseInt(singleMatch[1], 10);
    return Number.isNaN(n) ? null : n;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Tech name normalization
// ---------------------------------------------------------------------------

/**
 * Map of lowercase aliases / abbreviations to canonical technology names.
 */
const TECH_ALIASES: Record<string, string> = {
  // Containers & orchestration
  k8s: "Kubernetes",
  kubernetes: "Kubernetes",
  docker: "Docker",
  openshift: "OpenShift",
  helm: "Helm",

  // Databases
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  pg: "PostgreSQL",
  mysql: "MySQL",
  mongo: "MongoDB",
  mongodb: "MongoDB",
  redis: "Redis",
  dynamodb: "DynamoDB",
  dynamo: "DynamoDB",
  cockroachdb: "CockroachDB",
  cockroach: "CockroachDB",
  sqlite: "SQLite",
  neo4j: "Neo4j",
  cassandra: "Cassandra",
  elasticsearch: "Elasticsearch",
  es: "Elasticsearch",
  clickhouse: "ClickHouse",

  // Cloud
  aws: "AWS",
  gcp: "GCP",
  "google cloud": "GCP",
  azure: "Azure",
  vercel: "Vercel",
  cloudflare: "Cloudflare",

  // AI / ML
  pytorch: "PyTorch",
  torch: "PyTorch",
  tensorflow: "TensorFlow",
  tf: "TensorFlow",
  jax: "JAX",
  huggingface: "Hugging Face",
  "hugging face": "Hugging Face",
  hf: "Hugging Face",
  langchain: "LangChain",
  llamaindex: "LlamaIndex",
  openai: "OpenAI",
  mlx: "MLX",
  onnx: "ONNX",
  triton: "Triton",
  vllm: "vLLM",
  mlflow: "MLflow",

  // Frontend
  react: "React",
  reactjs: "React",
  "react.js": "React",
  nextjs: "Next.js",
  "next.js": "Next.js",
  next: "Next.js",
  vue: "Vue",
  vuejs: "Vue",
  "vue.js": "Vue",
  angular: "Angular",
  svelte: "Svelte",
  sveltekit: "SvelteKit",

  // Backend / runtimes
  node: "Node.js",
  nodejs: "Node.js",
  "node.js": "Node.js",
  deno: "Deno",
  bun: "Bun",
  fastapi: "FastAPI",
  django: "Django",
  flask: "Flask",
  express: "Express",
  "express.js": "Express",
  rails: "Rails",
  "ruby on rails": "Rails",
  spring: "Spring",
  "spring boot": "Spring Boot",

  // Languages
  typescript: "TypeScript",
  ts: "TypeScript",
  javascript: "JavaScript",
  js: "JavaScript",
  python: "Python",
  py: "Python",
  rust: "Rust",
  go: "Go",
  golang: "Go",
  java: "Java",
  kotlin: "Kotlin",
  swift: "Swift",
  "c++": "C++",
  cpp: "C++",
  "c#": "C#",
  csharp: "C#",
  ruby: "Ruby",
  elixir: "Elixir",
  scala: "Scala",

  // Infrastructure & CI
  terraform: "Terraform",
  pulumi: "Pulumi",
  ansible: "Ansible",
  jenkins: "Jenkins",
  "github actions": "GitHub Actions",
  "gitlab ci": "GitLab CI",
  circleci: "CircleCI",
  argocd: "ArgoCD",
  argo: "ArgoCD",
  datadog: "Datadog",
  grafana: "Grafana",
  prometheus: "Prometheus",

  // Messaging
  kafka: "Kafka",
  rabbitmq: "RabbitMQ",
  nats: "NATS",

  // GraphQL
  graphql: "GraphQL",
  apollo: "Apollo",
  hasura: "Hasura",
};

/**
 * Normalize a technology name to its canonical form.
 * Returns the input with original casing if no alias is found.
 *
 * @example
 * normalizeTechName("k8s")      // "Kubernetes"
 * normalizeTechName("postgres")  // "PostgreSQL"
 * normalizeTechName("UnknownTech") // "UnknownTech"
 */
export function normalizeTechName(text: string): string {
  const key = text.trim().toLowerCase();
  return TECH_ALIASES[key] ?? text.trim();
}
