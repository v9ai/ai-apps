"""Maps skill tags to knowledge categories with hierarchy definitions."""

from typing import FrozenSet

# ── Canonical skill tags ────────────────────────────────────────────
SKILL_TAGS: FrozenSet[str] = frozenset({
    "javascript", "typescript", "python", "java", "csharp", "ruby",
    "php", "go", "rust", "swift", "kotlin", "scala",
    "elixir", "react", "vue", "angular", "svelte", "nextjs",
    "nodejs", "express", "django", "flask", "laravel", "fastapi",
    "spring-boot", "react-native", "flutter", "ios", "android", "postgresql",
    "mysql", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb",
    "sqlite", "sql", "aws", "gcp", "azure", "docker",
    "kubernetes", "terraform", "ansible", "jenkins", "ci-cd", "circleci",
    "serverless", "microservices", "rest-api", "graphql", "grpc", "websocket",
    "event-driven", "git", "linux", "agile", "tdd", "webpack",
    "jest", "pytest", "tailwind", "machine-learning", "deep-learning", "tensorflow",
    "pytorch", "pandas", "numpy", "scikit", "nlp", "computer-vision",
    "llm", "rag", "prompt-engineering", "fine-tuning", "embeddings", "transformers",
    "agents", "agentic-ai", "langchain", "langgraph", "llamaindex", "openai", "anthropic",
    "vercel-ai-sdk", "vector-db", "pinecone", "weaviate", "chromadb", "mlops",
    "huggingface", "model-evaluation", "structured-output", "function-calling", "mastra", "langfuse",
    "github-actions", "grafana", "prometheus", "loki",
    "cloudflare-workers", "cloudflare-workers-ai", "cloudflare-d1", "cloudflare-vectorize", "next-auth", "radix-ui",
    "shadcn-ui", "storybook", "playwright", "cypress", "vitest", "react-query",
    "zustand", "apollo-client", "remix", "astro", "drizzle-orm", "prisma",
    "trpc", "hono", "bun", "deno",
})

SKILL_LABELS: dict[str, str] = {
    "javascript": "JavaScript", "typescript": "TypeScript", "python": "Python",
    "java": "Java", "csharp": "C#", "ruby": "Ruby", "php": "PHP",
    "go": "Go", "rust": "Rust", "swift": "Swift", "kotlin": "Kotlin",
    "scala": "Scala", "elixir": "Elixir", "react": "React", "vue": "Vue.js",
    "angular": "Angular", "svelte": "Svelte", "nextjs": "Next.js",
    "nodejs": "Node.js", "express": "Express.js", "django": "Django",
    "flask": "Flask", "laravel": "Laravel", "fastapi": "FastAPI",
    "spring-boot": "Spring Boot", "react-native": "React Native",
    "flutter": "Flutter", "ios": "iOS Development", "android": "Android Development",
    "postgresql": "PostgreSQL", "mysql": "MySQL", "mongodb": "MongoDB",
    "redis": "Redis", "elasticsearch": "Elasticsearch", "cassandra": "Cassandra",
    "dynamodb": "DynamoDB", "sqlite": "SQLite", "sql": "SQL",
    "aws": "Amazon Web Services", "gcp": "Google Cloud Platform",
    "azure": "Microsoft Azure", "docker": "Docker", "kubernetes": "Kubernetes",
    "terraform": "Terraform", "ansible": "Ansible", "jenkins": "Jenkins",
    "ci-cd": "CI/CD", "circleci": "CircleCI", "serverless": "Serverless",
    "microservices": "Microservices", "rest-api": "REST API", "graphql": "GraphQL",
    "grpc": "gRPC", "websocket": "WebSocket",
    "event-driven": "Event-Driven Architecture", "git": "Git", "linux": "Linux",
    "agile": "Agile", "tdd": "Test-Driven Development", "webpack": "Webpack",
    "jest": "Jest", "pytest": "pytest", "tailwind": "Tailwind CSS",
    "machine-learning": "Machine Learning", "deep-learning": "Deep Learning",
    "tensorflow": "TensorFlow", "pytorch": "PyTorch", "pandas": "Pandas",
    "numpy": "NumPy", "scikit": "scikit-learn",
    "nlp": "Natural Language Processing", "computer-vision": "Computer Vision",
    "llm": "Large Language Models", "rag": "Retrieval-Augmented Generation",
    "prompt-engineering": "Prompt Engineering", "fine-tuning": "Fine-Tuning",
    "embeddings": "Embeddings", "transformers": "Transformers",
    "agents": "AI Agents", "agentic-ai": "Agentic AI", "langchain": "LangChain",
    "langgraph": "LangGraph", "llamaindex": "LlamaIndex",
    "openai": "OpenAI", "anthropic": "Anthropic Claude",
    "vercel-ai-sdk": "Vercel AI SDK", "vector-db": "Vector Databases",
    "pinecone": "Pinecone", "weaviate": "Weaviate", "chromadb": "ChromaDB",
    "mlops": "MLOps", "huggingface": "Hugging Face",
    "model-evaluation": "Model Evaluation", "structured-output": "Structured Output",
    "function-calling": "Function Calling", "mastra": "Mastra", "langfuse": "Langfuse",
    "github-actions": "GitHub Actions", "grafana": "Grafana",
    "prometheus": "Prometheus", "loki": "Loki",
    "cloudflare-workers": "Cloudflare Workers",
    "cloudflare-workers-ai": "Cloudflare Workers AI",
    "cloudflare-d1": "Cloudflare D1", "cloudflare-vectorize": "Cloudflare Vectorize",
    "next-auth": "NextAuth.js", "radix-ui": "Radix UI", "shadcn-ui": "shadcn/ui",
    "storybook": "Storybook", "playwright": "Playwright", "cypress": "Cypress",
    "vitest": "Vitest", "react-query": "React Query / TanStack Query",
    "zustand": "Zustand", "apollo-client": "Apollo Client", "remix": "Remix",
    "astro": "Astro", "drizzle-orm": "Drizzle ORM", "prisma": "Prisma",
    "trpc": "tRPC", "hono": "Hono", "bun": "Bun", "deno": "Deno",
}

# ── Category definitions for the knowledge app ────────────────────────

TECH_CATEGORIES: dict[str, dict] = {
    "Databases & Storage": {
        "icon": "&#x1f5c4;&#xfe0f;",
        "description": "Database systems, caching, and data storage technologies",
        "gradient_from": "#0891b2",
        "gradient_to": "#22d3ee",
    },
    "Backend Frameworks": {
        "icon": "&#x2699;&#xfe0f;",
        "description": "Server-side frameworks and runtime environments",
        "gradient_from": "#059669",
        "gradient_to": "#34d399",
    },
    "Frontend Frameworks": {
        "icon": "&#x1f3a8;",
        "description": "Client-side frameworks, libraries, and UI toolkits",
        "gradient_from": "#7c3aed",
        "gradient_to": "#a78bfa",
    },
    "Cloud & DevOps": {
        "icon": "&#x2601;&#xfe0f;",
        "description": "Cloud platforms, containers, orchestration, and CI/CD",
        "gradient_from": "#2563eb",
        "gradient_to": "#60a5fa",
    },
    "Languages": {
        "icon": "&#x1f4dd;",
        "description": "Programming languages and their ecosystems",
        "gradient_from": "#d97706",
        "gradient_to": "#fbbf24",
    },
    "Testing & Quality": {
        "icon": "&#x2705;",
        "description": "Testing frameworks, quality assurance, and development practices",
        "gradient_from": "#e11d48",
        "gradient_to": "#fb7185",
    },
    "API & Communication": {
        "icon": "&#x1f50c;",
        "description": "API protocols, real-time communication, and integration patterns",
        "gradient_from": "#6366f1",
        "gradient_to": "#818cf8",
    },
}

# ── Tag to category mapping ───────────────────────────────────────────

TAG_TO_CATEGORY: dict[str, str] = {
    "postgresql": "Databases & Storage", "mysql": "Databases & Storage",
    "mongodb": "Databases & Storage", "redis": "Databases & Storage",
    "elasticsearch": "Databases & Storage", "cassandra": "Databases & Storage",
    "dynamodb": "Databases & Storage", "sqlite": "Databases & Storage",
    "sql": "Databases & Storage", "vector-db": "Databases & Storage",
    "pinecone": "Databases & Storage", "weaviate": "Databases & Storage",
    "chromadb": "Databases & Storage", "cloudflare-d1": "Databases & Storage",
    "nodejs": "Backend Frameworks", "express": "Backend Frameworks",
    "django": "Backend Frameworks", "flask": "Backend Frameworks",
    "laravel": "Backend Frameworks", "fastapi": "Backend Frameworks",
    "spring-boot": "Backend Frameworks", "hono": "Backend Frameworks",
    "trpc": "Backend Frameworks", "drizzle-orm": "Backend Frameworks",
    "prisma": "Backend Frameworks",
    "langchain": "Backend Frameworks", "langgraph": "Backend Frameworks",
    "llamaindex": "Backend Frameworks",
    "react": "Frontend Frameworks", "vue": "Frontend Frameworks",
    "angular": "Frontend Frameworks", "svelte": "Frontend Frameworks",
    "nextjs": "Frontend Frameworks", "remix": "Frontend Frameworks",
    "astro": "Frontend Frameworks", "react-native": "Frontend Frameworks",
    "flutter": "Frontend Frameworks", "tailwind": "Frontend Frameworks",
    "radix-ui": "Frontend Frameworks", "shadcn-ui": "Frontend Frameworks",
    "react-query": "Frontend Frameworks", "zustand": "Frontend Frameworks",
    "apollo-client": "Frontend Frameworks",
    "aws": "Cloud & DevOps", "gcp": "Cloud & DevOps", "azure": "Cloud & DevOps",
    "docker": "Cloud & DevOps", "kubernetes": "Cloud & DevOps",
    "terraform": "Cloud & DevOps", "ansible": "Cloud & DevOps",
    "jenkins": "Cloud & DevOps", "ci-cd": "Cloud & DevOps",
    "circleci": "Cloud & DevOps", "serverless": "Cloud & DevOps",
    "microservices": "Cloud & DevOps", "cloudflare-workers": "Cloud & DevOps",
    "cloudflare-workers-ai": "Cloud & DevOps",
    "cloudflare-vectorize": "Cloud & DevOps",
    "github-actions": "Cloud & DevOps", "grafana": "Cloud & DevOps",
    "prometheus": "Cloud & DevOps", "loki": "Cloud & DevOps",
    "linux": "Cloud & DevOps", "git": "Cloud & DevOps",
    "javascript": "Languages", "typescript": "Languages", "python": "Languages",
    "java": "Languages", "csharp": "Languages", "ruby": "Languages",
    "php": "Languages", "go": "Languages", "rust": "Languages",
    "swift": "Languages", "kotlin": "Languages", "scala": "Languages",
    "elixir": "Languages", "bun": "Languages", "deno": "Languages",
    "jest": "Testing & Quality", "pytest": "Testing & Quality",
    "playwright": "Testing & Quality", "cypress": "Testing & Quality",
    "vitest": "Testing & Quality", "storybook": "Testing & Quality",
    "tdd": "Testing & Quality", "agile": "Testing & Quality",
    "webpack": "Testing & Quality",
    "rest-api": "API & Communication", "graphql": "API & Communication",
    "grpc": "API & Communication", "websocket": "API & Communication",
    "event-driven": "API & Communication",
}


def get_category_for_tag(tag: str) -> str:
    return TAG_TO_CATEGORY.get(tag, "Languages")


def get_label_for_tag(tag: str) -> str:
    return SKILL_LABELS.get(tag, tag.replace("-", " ").title())


def normalize_tag(raw: str) -> str | None:
    """Normalize a raw technology name to a canonical skill tag, or None if unknown."""
    lowered = raw.lower().strip().replace(" ", "-").replace(".", "").replace("/", "-")

    if lowered in SKILL_TAGS:
        return lowered

    aliases: dict[str, str] = {
        "postgres": "postgresql", "pg": "postgresql",
        "node": "nodejs", "node-js": "nodejs",
        "express-js": "express", "expressjs": "express",
        "next-js": "nextjs", "next": "nextjs",
        "react-js": "react", "reactjs": "react",
        "vue-js": "vue", "vuejs": "vue",
        "angular-js": "angular", "angularjs": "angular",
        "svelte-js": "svelte", "sveltejs": "svelte",
        "tailwindcss": "tailwind", "tailwind-css": "tailwind",
        "k8s": "kubernetes", "tf": "terraform",
        "mongo": "mongodb", "elastic": "elasticsearch", "es": "elasticsearch",
        "dynamo": "dynamodb", "amazon-web-services": "aws",
        "google-cloud": "gcp", "google-cloud-platform": "gcp",
        "microsoft-azure": "azure", "c-sharp": "csharp", "c#": "csharp",
        "spring": "spring-boot", "springboot": "spring-boot",
        "fast-api": "fastapi", "scikit-learn": "scikit", "sklearn": "scikit",
        "rlhf": "rlhf-preference", "ci": "ci-cd", "cd": "ci-cd", "cicd": "ci-cd",
        "rest": "rest-api", "restful": "rest-api",
        "llama-index": "llamaindex", "llama_index": "llamaindex",
        "hugging-face": "huggingface", "huggingface": "huggingface",
        "websockets": "websocket", "web-sockets": "websocket",
        "react-18": "react", "react-19": "react",
        "css-in-js": "tailwind",
        "github-actions": "github-actions",
        "prom": "prometheus",
    }
    if lowered in aliases:
        return aliases[lowered]

    return None
