"""Maps skill tags to knowledge categories with hierarchy definitions."""

from src.models.taxonomy import SKILL_TAGS, SKILL_LABELS

# ── Category definitions for the knowledge app ────────────────────────
# Each category: (name, icon, description, gradient_from, gradient_to)

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
    # Databases & Storage
    "postgresql": "Databases & Storage",
    "mysql": "Databases & Storage",
    "mongodb": "Databases & Storage",
    "redis": "Databases & Storage",
    "elasticsearch": "Databases & Storage",
    "cassandra": "Databases & Storage",
    "dynamodb": "Databases & Storage",
    "sqlite": "Databases & Storage",
    "sql": "Databases & Storage",
    "vector-db": "Databases & Storage",
    "pinecone": "Databases & Storage",
    "weaviate": "Databases & Storage",
    "chromadb": "Databases & Storage",
    "cloudflare-d1": "Databases & Storage",

    # Backend Frameworks
    "nodejs": "Backend Frameworks",
    "express": "Backend Frameworks",
    "django": "Backend Frameworks",
    "flask": "Backend Frameworks",
    "laravel": "Backend Frameworks",
    "fastapi": "Backend Frameworks",
    "spring-boot": "Backend Frameworks",
    "hono": "Backend Frameworks",
    "trpc": "Backend Frameworks",
    "drizzle-orm": "Backend Frameworks",
    "prisma": "Backend Frameworks",

    # Frontend Frameworks
    "react": "Frontend Frameworks",
    "vue": "Frontend Frameworks",
    "angular": "Frontend Frameworks",
    "svelte": "Frontend Frameworks",
    "nextjs": "Frontend Frameworks",
    "remix": "Frontend Frameworks",
    "astro": "Frontend Frameworks",
    "react-native": "Frontend Frameworks",
    "flutter": "Frontend Frameworks",
    "tailwind": "Frontend Frameworks",
    "radix-ui": "Frontend Frameworks",
    "shadcn-ui": "Frontend Frameworks",
    "react-query": "Frontend Frameworks",
    "zustand": "Frontend Frameworks",
    "apollo-client": "Frontend Frameworks",

    # Cloud & DevOps
    "aws": "Cloud & DevOps",
    "gcp": "Cloud & DevOps",
    "azure": "Cloud & DevOps",
    "docker": "Cloud & DevOps",
    "kubernetes": "Cloud & DevOps",
    "terraform": "Cloud & DevOps",
    "ansible": "Cloud & DevOps",
    "jenkins": "Cloud & DevOps",
    "ci-cd": "Cloud & DevOps",
    "circleci": "Cloud & DevOps",
    "serverless": "Cloud & DevOps",
    "microservices": "Cloud & DevOps",
    "cloudflare-workers": "Cloud & DevOps",
    "cloudflare-workers-ai": "Cloud & DevOps",
    "cloudflare-vectorize": "Cloud & DevOps",
    "linux": "Cloud & DevOps",
    "git": "Cloud & DevOps",

    # Languages
    "javascript": "Languages",
    "typescript": "Languages",
    "python": "Languages",
    "java": "Languages",
    "csharp": "Languages",
    "ruby": "Languages",
    "php": "Languages",
    "go": "Languages",
    "rust": "Languages",
    "swift": "Languages",
    "kotlin": "Languages",
    "scala": "Languages",
    "elixir": "Languages",
    "bun": "Languages",
    "deno": "Languages",

    # Testing & Quality
    "jest": "Testing & Quality",
    "pytest": "Testing & Quality",
    "playwright": "Testing & Quality",
    "cypress": "Testing & Quality",
    "vitest": "Testing & Quality",
    "storybook": "Testing & Quality",
    "tdd": "Testing & Quality",
    "agile": "Testing & Quality",
    "webpack": "Testing & Quality",

    # API & Communication
    "rest-api": "API & Communication",
    "graphql": "API & Communication",
    "grpc": "API & Communication",
    "websocket": "API & Communication",
    "event-driven": "API & Communication",
}


def get_category_for_tag(tag: str) -> str:
    """Return the knowledge category for a skill tag, or 'Languages' as fallback."""
    return TAG_TO_CATEGORY.get(tag, "Languages")


def get_label_for_tag(tag: str) -> str:
    """Return the human-readable label for a skill tag."""
    return SKILL_LABELS.get(tag, tag.replace("-", " ").title())


def normalize_tag(raw: str) -> str | None:
    """Normalize a raw technology name to a canonical skill tag, or None if unknown."""
    lowered = raw.lower().strip().replace(" ", "-").replace(".", "").replace("/", "-")

    # Direct match
    if lowered in SKILL_TAGS:
        return lowered

    # Common aliases
    aliases: dict[str, str] = {
        "postgres": "postgresql",
        "pg": "postgresql",
        "node": "nodejs",
        "node-js": "nodejs",
        "express-js": "express",
        "expressjs": "express",
        "next-js": "nextjs",
        "next": "nextjs",
        "react-js": "react",
        "reactjs": "react",
        "vue-js": "vue",
        "vuejs": "vue",
        "angular-js": "angular",
        "angularjs": "angular",
        "svelte-js": "svelte",
        "sveltejs": "svelte",
        "tailwindcss": "tailwind",
        "tailwind-css": "tailwind",
        "k8s": "kubernetes",
        "tf": "terraform",
        "mongo": "mongodb",
        "elastic": "elasticsearch",
        "es": "elasticsearch",
        "dynamo": "dynamodb",
        "amazon-web-services": "aws",
        "google-cloud": "gcp",
        "google-cloud-platform": "gcp",
        "microsoft-azure": "azure",
        "c-sharp": "csharp",
        "c#": "csharp",
        "spring": "spring-boot",
        "springboot": "spring-boot",
        "fast-api": "fastapi",
        "scikit-learn": "scikit",
        "sklearn": "scikit",
        "rlhf": "rlhf-preference",
        "ci": "ci-cd",
        "cd": "ci-cd",
        "cicd": "ci-cd",
        "rest": "rest-api",
        "restful": "rest-api",
    }
    if lowered in aliases:
        return aliases[lowered]

    return None
