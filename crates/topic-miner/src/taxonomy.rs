//! Skill taxonomy — ported from lead-gen's skill-taxonomy.ts.
//!
//! Each entry maps a kebab-case slug to a human label, category, and a set of
//! regex patterns that detect the skill in source code.

use std::collections::HashMap;
use std::sync::LazyLock;

#[derive(Debug, Clone)]
pub struct SkillDef {
    pub tag: &'static str,
    pub label: &'static str,
    pub category: &'static str,
    /// Regex patterns (case-insensitive) that signal this skill in code.
    pub patterns: &'static [&'static str],
}

/// All 150+ canonical skill tags with detection patterns.
pub static TAXONOMY: LazyLock<HashMap<&'static str, SkillDef>> = LazyLock::new(|| {
    let entries: Vec<SkillDef> = vec![
        // ── Programming Languages ────────────────────────────────────────────
        SkillDef { tag: "javascript", label: "JavaScript", category: "Languages", patterns: &[r"\.js$", r"\.mjs$", r"\.cjs$"] },
        SkillDef { tag: "typescript", label: "TypeScript", category: "Languages", patterns: &[r"\.ts$", r"\.tsx$", r"tsconfig"] },
        SkillDef { tag: "python", label: "Python", category: "Languages", patterns: &[r"\.py$", r"import\s+\w+", r"from\s+\w+\s+import"] },
        SkillDef { tag: "java", label: "Java", category: "Languages", patterns: &[r"\.java$", r"import\s+java\."] },
        SkillDef { tag: "csharp", label: "C#", category: "Languages", patterns: &[r"\.cs$", r"using\s+System"] },
        SkillDef { tag: "ruby", label: "Ruby", category: "Languages", patterns: &[r"\.rb$", r"require\s+['\"]"] },
        SkillDef { tag: "php", label: "PHP", category: "Languages", patterns: &[r"\.php$", r"<\?php"] },
        SkillDef { tag: "go", label: "Go", category: "Languages", patterns: &[r"\.go$", r"package\s+main", r"import\s+\("] },
        SkillDef { tag: "rust", label: "Rust", category: "Languages", patterns: &[r"\.rs$", r"Cargo\.toml", r"use\s+std::"] },
        SkillDef { tag: "swift", label: "Swift", category: "Languages", patterns: &[r"\.swift$", r"import\s+Foundation"] },
        SkillDef { tag: "kotlin", label: "Kotlin", category: "Languages", patterns: &[r"\.kt$", r"import\s+kotlin"] },
        SkillDef { tag: "scala", label: "Scala", category: "Languages", patterns: &[r"\.scala$"] },
        SkillDef { tag: "elixir", label: "Elixir", category: "Languages", patterns: &[r"\.ex$", r"\.exs$", r"defmodule"] },

        // ── Frontend Frameworks ──────────────────────────────────────────────
        SkillDef { tag: "react", label: "React", category: "Frontend", patterns: &[r"from\s+['\"]react['\"]", r"useState|useEffect|useRef|useCallback", r"jsx|tsx"] },
        SkillDef { tag: "vue", label: "Vue.js", category: "Frontend", patterns: &[r"from\s+['\"]vue['\"]", r"\.vue$"] },
        SkillDef { tag: "angular", label: "Angular", category: "Frontend", patterns: &[r"@angular/", r"\.component\.ts$"] },
        SkillDef { tag: "svelte", label: "Svelte", category: "Frontend", patterns: &[r"\.svelte$", r"from\s+['\"]svelte['\"]"] },
        SkillDef { tag: "nextjs", label: "Next.js", category: "Frontend", patterns: &[r"from\s+['\"]next", r"next\.config", r"app/layout\.", r"app/page\."] },

        // ── Backend Frameworks ───────────────────────────────────────────────
        SkillDef { tag: "nodejs", label: "Node.js", category: "Backend", patterns: &[r"require\(", r"node:", r"process\.env"] },
        SkillDef { tag: "express", label: "Express.js", category: "Backend", patterns: &[r"from\s+['\"]express['\"]", r"app\.listen"] },
        SkillDef { tag: "django", label: "Django", category: "Backend", patterns: &[r"from\s+django", r"INSTALLED_APPS"] },
        SkillDef { tag: "flask", label: "Flask", category: "Backend", patterns: &[r"from\s+flask", r"@app\.route"] },
        SkillDef { tag: "laravel", label: "Laravel", category: "Backend", patterns: &[r"use\s+Illuminate"] },
        SkillDef { tag: "fastapi", label: "FastAPI", category: "Backend", patterns: &[r"from\s+fastapi", r"FastAPI\(\)"] },
        SkillDef { tag: "spring-boot", label: "Spring Boot", category: "Backend", patterns: &[r"@SpringBoot", r"spring-boot"] },

        // ── Mobile ───────────────────────────────────────────────────────────
        SkillDef { tag: "react-native", label: "React Native", category: "Mobile", patterns: &[r"react-native", r"from\s+['\"]react-native"] },
        SkillDef { tag: "flutter", label: "Flutter", category: "Mobile", patterns: &[r"import\s+['\"]package:flutter"] },
        SkillDef { tag: "ios", label: "iOS Development", category: "Mobile", patterns: &[r"UIKit|SwiftUI|\.xcodeproj"] },
        SkillDef { tag: "android", label: "Android Development", category: "Mobile", patterns: &[r"android\.", r"AndroidManifest"] },

        // ── Databases ────────────────────────────────────────────────────────
        SkillDef { tag: "postgresql", label: "PostgreSQL", category: "Databases", patterns: &[r"postgres|pg_|pgvector|neon", r"@neondatabase"] },
        SkillDef { tag: "mysql", label: "MySQL", category: "Databases", patterns: &[r"mysql2?['\"/]"] },
        SkillDef { tag: "mongodb", label: "MongoDB", category: "Databases", patterns: &[r"mongodb|mongoose"] },
        SkillDef { tag: "redis", label: "Redis", category: "Databases", patterns: &[r"redis|ioredis"] },
        SkillDef { tag: "elasticsearch", label: "Elasticsearch", category: "Databases", patterns: &[r"elasticsearch|@elastic"] },
        SkillDef { tag: "cassandra", label: "Cassandra", category: "Databases", patterns: &[r"cassandra"] },
        SkillDef { tag: "dynamodb", label: "DynamoDB", category: "Databases", patterns: &[r"dynamodb|DynamoDB"] },
        SkillDef { tag: "sqlite", label: "SQLite", category: "Databases", patterns: &[r"sqlite|better-sqlite"] },
        SkillDef { tag: "sql", label: "SQL", category: "Databases", patterns: &[r"\.sql$", r"SELECT\s+.*FROM", r"INSERT\s+INTO"] },

        // ── Cloud & DevOps ───────────────────────────────────────────────────
        SkillDef { tag: "aws", label: "Amazon Web Services", category: "Cloud & DevOps", patterns: &[r"@aws-sdk|aws-cdk|s3://|arn:aws"] },
        SkillDef { tag: "gcp", label: "Google Cloud Platform", category: "Cloud & DevOps", patterns: &[r"@google-cloud|gcloud"] },
        SkillDef { tag: "azure", label: "Microsoft Azure", category: "Cloud & DevOps", patterns: &[r"@azure|azure\."] },
        SkillDef { tag: "docker", label: "Docker", category: "Cloud & DevOps", patterns: &[r"[Dd]ockerfile|docker-compose|\.dockerignore"] },
        SkillDef { tag: "kubernetes", label: "Kubernetes", category: "Cloud & DevOps", patterns: &[r"k8s|kubernetes|kubectl|helm"] },
        SkillDef { tag: "terraform", label: "Terraform", category: "Cloud & DevOps", patterns: &[r"\.tf$|terraform"] },
        SkillDef { tag: "ansible", label: "Ansible", category: "Cloud & DevOps", patterns: &[r"ansible|playbook\.yml"] },
        SkillDef { tag: "jenkins", label: "Jenkins", category: "Cloud & DevOps", patterns: &[r"[Jj]enkinsfile"] },
        SkillDef { tag: "ci-cd", label: "CI/CD", category: "Cloud & DevOps", patterns: &[r"\.github/workflows|\.gitlab-ci|circleci"] },
        SkillDef { tag: "circleci", label: "CircleCI", category: "Cloud & DevOps", patterns: &[r"circleci|\.circleci"] },
        SkillDef { tag: "serverless", label: "Serverless", category: "Cloud & DevOps", patterns: &[r"serverless\.yml|@serverless|edge-runtime"] },

        // ── Architecture ─────────────────────────────────────────────────────
        SkillDef { tag: "microservices", label: "Microservices", category: "Architecture", patterns: &[r"microservice|service-mesh"] },
        SkillDef { tag: "rest-api", label: "REST API", category: "Architecture", patterns: &[r"app\.(get|post|put|delete|patch)\(", r"fetch\(|axios"] },
        SkillDef { tag: "graphql", label: "GraphQL", category: "Architecture", patterns: &[r"graphql|@apollo|gql`|\.graphql$", r"typeDefs|resolvers"] },
        SkillDef { tag: "grpc", label: "gRPC", category: "Architecture", patterns: &[r"grpc|\.proto$|protobuf"] },
        SkillDef { tag: "websocket", label: "WebSocket", category: "Architecture", patterns: &[r"[Ww]eb[Ss]ocket|wss?://|ws\.on"] },
        SkillDef { tag: "event-driven", label: "Event-Driven Architecture", category: "Architecture", patterns: &[r"EventEmitter|pubsub|emit\(|\.on\(['\"]"] },

        // ── Tools ────────────────────────────────────────────────────────────
        SkillDef { tag: "git", label: "Git", category: "Tools", patterns: &[r"\.git/|\.gitignore|git\s+(commit|push|pull)"] },
        SkillDef { tag: "linux", label: "Linux", category: "Tools", patterns: &[r"/bin/|/usr/|chmod|chown"] },
        SkillDef { tag: "agile", label: "Agile", category: "Tools", patterns: &[r"sprint|kanban|scrum"] },
        SkillDef { tag: "tdd", label: "Test-Driven Development", category: "Tools", patterns: &[r"describe\(|it\(|test\(|expect\(|assert"] },
        SkillDef { tag: "webpack", label: "Webpack", category: "Tools", patterns: &[r"webpack\.config|from\s+['\"]webpack"] },
        SkillDef { tag: "jest", label: "Jest", category: "Tools", patterns: &[r"from\s+['\"]jest|jest\.config"] },
        SkillDef { tag: "pytest", label: "pytest", category: "Tools", patterns: &[r"import\s+pytest|@pytest"] },
        SkillDef { tag: "tailwind", label: "Tailwind CSS", category: "Tools", patterns: &[r"tailwind\.config|@tailwind"] },

        // ── Data Science & ML ────────────────────────────────────────────────
        SkillDef { tag: "machine-learning", label: "Machine Learning", category: "Data Science & ML", patterns: &[r"sklearn|scikit|ml_|machine.?learn"] },
        SkillDef { tag: "deep-learning", label: "Deep Learning", category: "Data Science & ML", patterns: &[r"deep.?learn|neural.?net|backprop"] },
        SkillDef { tag: "tensorflow", label: "TensorFlow", category: "Data Science & ML", patterns: &[r"tensorflow|import\s+tf"] },
        SkillDef { tag: "pytorch", label: "PyTorch", category: "Data Science & ML", patterns: &[r"import\s+torch|pytorch"] },
        SkillDef { tag: "pandas", label: "Pandas", category: "Data Science & ML", patterns: &[r"import\s+pandas|pd\.DataFrame"] },
        SkillDef { tag: "numpy", label: "NumPy", category: "Data Science & ML", patterns: &[r"import\s+numpy|np\.array"] },
        SkillDef { tag: "scikit", label: "scikit-learn", category: "Data Science & ML", patterns: &[r"from\s+sklearn|scikit"] },
        SkillDef { tag: "nlp", label: "Natural Language Processing", category: "Data Science & ML", patterns: &[r"nlp|tokeniz|spacy|nltk|huggingface"] },
        SkillDef { tag: "computer-vision", label: "Computer Vision", category: "Data Science & ML", patterns: &[r"computer.?vision|opencv|yolo|image.?classif"] },

        // ── AI / LLM / GenAI ─────────────────────────────────────────────────
        SkillDef { tag: "llm", label: "Large Language Models", category: "AI / LLM", patterns: &[r"llm|large.?language|chat.?completion"] },
        SkillDef { tag: "rag", label: "Retrieval-Augmented Generation", category: "AI / LLM", patterns: &[r"\brag\b|retriev.*generat|retriev.*augment"] },
        SkillDef { tag: "prompt-engineering", label: "Prompt Engineering", category: "AI / LLM", patterns: &[r"prompt|system.?message|few.?shot"] },
        SkillDef { tag: "fine-tuning", label: "Fine-Tuning", category: "AI / LLM", patterns: &[r"fine.?tun|lora|qlora|adapter"] },
        SkillDef { tag: "embeddings", label: "Embeddings", category: "AI / LLM", patterns: &[r"embed|embedding|vector.?search|cosine.?sim"] },
        SkillDef { tag: "transformers", label: "Transformers", category: "AI / LLM", patterns: &[r"transformer|attention.?head|self.?attention|BertModel"] },
        SkillDef { tag: "agents", label: "AI Agents", category: "AI / LLM", patterns: &[r"\bagent|tool_call|function.?call|agentic"] },
        SkillDef { tag: "agentic-ai", label: "Agentic AI", category: "AI / LLM", patterns: &[r"agentic|agent.?loop|agent.?team"] },
        SkillDef { tag: "langchain", label: "LangChain", category: "AI / LLM", patterns: &[r"langchain|from\s+langchain"] },
        SkillDef { tag: "langgraph", label: "LangGraph", category: "AI / LLM", patterns: &[r"langgraph|from\s+langgraph"] },
        SkillDef { tag: "openai", label: "OpenAI", category: "AI / LLM", patterns: &[r"openai|from\s+['\"]openai|gpt-[34]"] },
        SkillDef { tag: "anthropic", label: "Anthropic Claude", category: "AI / LLM", patterns: &[r"anthropic|claude|@anthropic"] },
        SkillDef { tag: "vercel-ai-sdk", label: "Vercel AI SDK", category: "AI / LLM", patterns: &[r"from\s+['\"]ai['\"]|from\s+['\"]@ai-sdk"] },
        SkillDef { tag: "vector-db", label: "Vector Databases", category: "AI / LLM", patterns: &[r"vector.?db|lancedb|pgvector|pinecone|weaviate|chromadb"] },
        SkillDef { tag: "pinecone", label: "Pinecone", category: "AI / LLM", patterns: &[r"pinecone|@pinecone"] },
        SkillDef { tag: "weaviate", label: "Weaviate", category: "AI / LLM", patterns: &[r"weaviate"] },
        SkillDef { tag: "chromadb", label: "ChromaDB", category: "AI / LLM", patterns: &[r"chromadb|chroma"] },
        SkillDef { tag: "mlops", label: "MLOps", category: "AI / LLM", patterns: &[r"mlops|mlflow|wandb|weights.?biases"] },
        SkillDef { tag: "huggingface", label: "Hugging Face", category: "AI / LLM", patterns: &[r"huggingface|hf_hub|from_pretrained|transformers"] },
        SkillDef { tag: "model-evaluation", label: "Model Evaluation", category: "AI / LLM", patterns: &[r"eval|benchmark|accuracy|f1.?score|bleu"] },
        SkillDef { tag: "structured-output", label: "Structured Output", category: "AI / LLM", patterns: &[r"structured.?output|json.?schema|zod|response_format"] },
        SkillDef { tag: "function-calling", label: "Function Calling", category: "AI / LLM", patterns: &[r"function.?call|tool.?use|tool_choice"] },
        SkillDef { tag: "mastra", label: "Mastra", category: "AI / LLM", patterns: &[r"mastra|from\s+['\"]mastra"] },

        // ── Cloudflare ───────────────────────────────────────────────────────
        SkillDef { tag: "cloudflare-workers", label: "Cloudflare Workers", category: "Cloudflare", patterns: &[r"cloudflare.*workers|wrangler|miniflare"] },
        SkillDef { tag: "cloudflare-workers-ai", label: "Cloudflare Workers AI", category: "Cloudflare", patterns: &[r"workers.?ai|@cloudflare/ai"] },
        SkillDef { tag: "cloudflare-d1", label: "Cloudflare D1", category: "Cloudflare", patterns: &[r"cloudflare.*d1|D1Database"] },
        SkillDef { tag: "cloudflare-vectorize", label: "Cloudflare Vectorize", category: "Cloudflare", patterns: &[r"vectorize|VectorizeIndex"] },

        // ── Frontend (extended) ──────────────────────────────────────────────
        SkillDef { tag: "next-auth", label: "NextAuth.js", category: "Frontend", patterns: &[r"next-auth|NextAuth"] },
        SkillDef { tag: "radix-ui", label: "Radix UI", category: "Frontend", patterns: &[r"@radix-ui"] },
        SkillDef { tag: "shadcn-ui", label: "shadcn/ui", category: "Frontend", patterns: &[r"shadcn|@/components/ui"] },
        SkillDef { tag: "storybook", label: "Storybook", category: "Frontend", patterns: &[r"storybook|\.stories\."] },
        SkillDef { tag: "playwright", label: "Playwright", category: "Frontend", patterns: &[r"playwright|@playwright"] },
        SkillDef { tag: "cypress", label: "Cypress", category: "Frontend", patterns: &[r"cypress|cy\."] },
        SkillDef { tag: "vitest", label: "Vitest", category: "Frontend", patterns: &[r"vitest|from\s+['\"]vitest"] },
        SkillDef { tag: "react-query", label: "React Query / TanStack Query", category: "Frontend", patterns: &[r"@tanstack/react-query|useQuery|useMutation"] },
        SkillDef { tag: "zustand", label: "Zustand", category: "Frontend", patterns: &[r"zustand|create\(\s*\(set"] },
        SkillDef { tag: "apollo-client", label: "Apollo Client", category: "Frontend", patterns: &[r"@apollo/client|useQuery|useMutation|ApolloProvider"] },
        SkillDef { tag: "remix", label: "Remix", category: "Frontend", patterns: &[r"from\s+['\"]@remix|remix\.config"] },
        SkillDef { tag: "astro", label: "Astro", category: "Frontend", patterns: &[r"\.astro$|astro\.config"] },

        // ── Backend (extended) ───────────────────────────────────────────────
        SkillDef { tag: "drizzle-orm", label: "Drizzle ORM", category: "Backend", patterns: &[r"drizzle-orm|drizzle-kit|from\s+['\"]drizzle"] },
        SkillDef { tag: "prisma", label: "Prisma", category: "Backend", patterns: &[r"@prisma|prisma\.schema"] },
        SkillDef { tag: "trpc", label: "tRPC", category: "Backend", patterns: &[r"@trpc|trpc"] },
        SkillDef { tag: "hono", label: "Hono", category: "Backend", patterns: &[r"from\s+['\"]hono"] },
        SkillDef { tag: "bun", label: "Bun", category: "Backend", patterns: &[r"bun\.sh|bunfig|Bun\.serve"] },
        SkillDef { tag: "deno", label: "Deno", category: "Backend", patterns: &[r"deno\.|Deno\."] },
    ];

    entries.into_iter().map(|s| (s.tag, s)).collect()
});

/// Look up a taxonomy entry by slug.
pub fn get(tag: &str) -> Option<&'static SkillDef> {
    TAXONOMY.get(tag)
}

/// All category names present in the taxonomy.
pub fn categories() -> Vec<&'static str> {
    let mut cats: Vec<&str> = TAXONOMY.values().map(|s| s.category).collect();
    cats.sort();
    cats.dedup();
    cats
}
