//! ESCO taxonomy bridge — maps internal skill tags to ESCO standard labels.
//!
//! The ESCO (European Skills, Competences, Qualifications and Occupations)
//! is the EU standard skills ontology with ~13,800 skills. This module
//! provides bidirectional mapping between our ~157 internal tags and their
//! ESCO equivalents, enabling eval against TechWolf datasets.
//!
//! Requires feature: `kernel-techwolf`

use std::collections::HashMap;

// ── All internal tags ────────────────────────────────────────────────────────

/// Complete list of internal skill taxonomy tags (157 entries).
const ALL_TAGS: &[&str] = &[
    "javascript",
    "typescript",
    "python",
    "java",
    "csharp",
    "ruby",
    "php",
    "go",
    "rust",
    "swift",
    "kotlin",
    "scala",
    "elixir",
    "react",
    "vue",
    "angular",
    "svelte",
    "nextjs",
    "nodejs",
    "express",
    "django",
    "flask",
    "laravel",
    "fastapi",
    "spring-boot",
    "react-native",
    "flutter",
    "ios",
    "android",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "elasticsearch",
    "cassandra",
    "dynamodb",
    "sqlite",
    "sql",
    "aws",
    "gcp",
    "azure",
    "docker",
    "kubernetes",
    "terraform",
    "ansible",
    "jenkins",
    "ci-cd",
    "circleci",
    "serverless",
    "microservices",
    "rest-api",
    "graphql",
    "grpc",
    "websocket",
    "event-driven",
    "git",
    "linux",
    "agile",
    "tdd",
    "webpack",
    "jest",
    "pytest",
    "tailwind",
    "machine-learning",
    "deep-learning",
    "tensorflow",
    "pytorch",
    "pandas",
    "numpy",
    "scikit",
    "nlp",
    "computer-vision",
    "llm",
    "rag",
    "prompt-engineering",
    "fine-tuning",
    "embeddings",
    "transformers",
    "agents",
    "agentic-ai",
    "langchain",
    "langgraph",
    "openai",
    "anthropic",
    "vercel-ai-sdk",
    "vector-db",
    "pinecone",
    "weaviate",
    "chromadb",
    "mlops",
    "huggingface",
    "model-evaluation",
    "structured-output",
    "function-calling",
    "mastra",
    "cloudflare-workers",
    "cloudflare-workers-ai",
    "cloudflare-d1",
    "cloudflare-vectorize",
    "next-auth",
    "radix-ui",
    "shadcn-ui",
    "storybook",
    "playwright",
    "cypress",
    "vitest",
    "react-query",
    "zustand",
    "apollo-client",
    "remix",
    "astro",
    "drizzle-orm",
    "prisma",
    "trpc",
    "hono",
    "bun",
    "deno",
];

// ── EscoMapping ──────────────────────────────────────────────────────────────

/// Bidirectional mapping between internal skill tags and ESCO standard labels.
///
/// Constructed via `EscoMapping::default()` which populates the static mapping
/// table covering programming languages, frameworks, databases, cloud/DevOps,
/// architecture, tools, data science, ML, and AI/LLM domains.
pub struct EscoMapping {
    /// Internal tag -> list of ESCO labels.
    tag_to_esco: HashMap<&'static str, Vec<&'static str>>,
    /// ESCO label (lowercased) -> internal tag.
    esco_to_tag: HashMap<String, &'static str>,
}

impl Default for EscoMapping {
    fn default() -> Self {
        let mappings: Vec<(&str, &[&str])> = vec![
            // ── Programming Languages ────────────────────────────────────
            ("javascript", &["JavaScript", "JavaScript framework"] as &[&str]),
            ("typescript", &["TypeScript"]),
            ("python", &["Python (computer programming)", "Python", "use Python"]),
            ("java", &["Java (computer programming)", "Java"]),
            ("csharp", &["C#"]),
            ("ruby", &["Ruby (computer programming)", "Ruby"]),
            ("php", &["PHP"]),
            ("go", &["Go (computer programming)", "Go"]),
            ("rust", &["Rust (computer programming)", "Rust"]),
            ("swift", &["Swift (programming language)", "Swift"]),
            ("kotlin", &["Kotlin (computer programming)", "Kotlin"]),
            ("scala", &["Scala"]),
            ("elixir", &["Elixir (computer programming)"]),
            // ── Frontend Frameworks ──────────────────────────────────────
            ("react", &["React.js", "React", "React framework"]),
            ("vue", &["Vue.js"]),
            ("angular", &["AngularJS", "Angular"]),
            ("svelte", &["Svelte"]),
            ("nextjs", &["Next.js"]),
            // ── Backend Frameworks ───────────────────────────────────────
            ("nodejs", &["Node.js"]),
            ("express", &["Express.js"]),
            ("django", &["Django (web framework)", "Django"]),
            ("flask", &["Flask (web framework)"]),
            ("fastapi", &["FastAPI"]),
            ("spring-boot", &["Spring Boot"]),
            ("laravel", &["Laravel"]),
            // ── Mobile ───────────────────────────────────────────────────
            ("react-native", &["React Native"]),
            ("flutter", &["Flutter"]),
            ("ios", &["iOS development", "iOS"]),
            ("android", &["Android development", "Android"]),
            // ── Databases ────────────────────────────────────────────────
            ("postgresql", &["PostgreSQL"]),
            ("mysql", &["MySQL"]),
            ("mongodb", &["MongoDB"]),
            ("redis", &["Redis"]),
            ("elasticsearch", &["Elasticsearch"]),
            ("cassandra", &["Apache Cassandra", "Cassandra"]),
            ("dynamodb", &["Amazon DynamoDB", "DynamoDB"]),
            ("sqlite", &["SQLite"]),
            ("sql", &["SQL", "use SQL", "use structured query language"]),
            // ── Cloud & DevOps ───────────────────────────────────────────
            ("aws", &["Amazon Web Services", "AWS"]),
            ("gcp", &["Google Cloud Platform", "GCP"]),
            ("azure", &["Microsoft Azure", "Azure"]),
            ("docker", &["Docker", "use Docker"]),
            ("kubernetes", &["Kubernetes", "use Kubernetes"]),
            ("terraform", &["Terraform"]),
            ("ansible", &["Ansible"]),
            ("jenkins", &["Jenkins"]),
            ("ci-cd", &["continuous integration", "continuous deployment", "CI/CD"]),
            ("circleci", &["CircleCI"]),
            ("serverless", &["serverless computing", "serverless architecture"]),
            // ── Architecture ─────────────────────────────────────────────
            ("microservices", &["microservices architecture", "microservices"]),
            ("rest-api", &["REST API", "RESTful API", "representational state transfer"]),
            ("graphql", &["GraphQL"]),
            ("grpc", &["gRPC"]),
            ("websocket", &["WebSocket"]),
            ("event-driven", &["event-driven architecture"]),
            // ── Tools ────────────────────────────────────────────────────
            ("git", &["Git", "use Git", "version control"]),
            ("linux", &["Linux", "use Linux"]),
            ("agile", &["agile project management", "agile development", "Agile"]),
            ("tdd", &["test-driven development", "TDD"]),
            ("webpack", &["Webpack"]),
            ("jest", &["Jest"]),
            ("pytest", &["pytest"]),
            ("tailwind", &["Tailwind CSS"]),
            ("storybook", &["Storybook"]),
            ("playwright", &["Playwright"]),
            ("cypress", &["Cypress"]),
            ("vitest", &["Vitest"]),
            // ── Data Science & ML ────────────────────────────────────────
            ("machine-learning", &["machine learning", "apply machine learning"]),
            ("deep-learning", &["deep learning"]),
            ("tensorflow", &["TensorFlow"]),
            ("pytorch", &["PyTorch"]),
            ("pandas", &["pandas (software)", "Pandas"]),
            ("numpy", &["NumPy", "NumPy/SciPy"]),
            ("scikit", &["scikit-learn"]),
            ("nlp", &["natural language processing", "NLP"]),
            ("computer-vision", &["computer vision"]),
            // ── AI / LLM / GenAI ─────────────────────────────────────────
            ("llm", &["large language models"]),
            ("rag", &["retrieval-augmented generation"]),
            ("prompt-engineering", &["prompt engineering"]),
            ("fine-tuning", &["fine-tuning", "model fine-tuning"]),
            ("embeddings", &["embeddings", "word embeddings"]),
            ("transformers", &["Transformers", "transformer architecture"]),
            ("agents", &["AI agents", "intelligent agents"]),
            ("agentic-ai", &["agentic AI"]),
            ("langchain", &["LangChain"]),
            ("openai", &["OpenAI API", "OpenAI"]),
            ("anthropic", &["Anthropic API", "Claude API"]),
            ("vector-db", &["vector database"]),
            ("pinecone", &["Pinecone"]),
            ("weaviate", &["Weaviate"]),
            ("chromadb", &["ChromaDB", "Chroma"]),
            ("mlops", &["MLOps", "machine learning operations"]),
            ("huggingface", &["Hugging Face"]),
            ("model-evaluation", &["model evaluation", "ML model evaluation"]),
            ("structured-output", &["structured output"]),
            ("function-calling", &["function calling"]),
            // ── JS Ecosystem ─────────────────────────────────────────────
            ("react-query", &["React Query", "TanStack Query"]),
            ("apollo-client", &["Apollo Client", "Apollo GraphQL"]),
            ("remix", &["Remix"]),
            ("astro", &["Astro"]),
            ("prisma", &["Prisma"]),
            ("trpc", &["tRPC"]),
            ("hono", &["Hono"]),
            ("bun", &["Bun"]),
            ("deno", &["Deno"]),
            ("drizzle-orm", &["Drizzle ORM"]),
            ("next-auth", &["NextAuth.js", "NextAuth"]),
            ("zustand", &["Zustand"]),
        ];

        let mut tag_to_esco = HashMap::with_capacity(mappings.len());
        let mut esco_to_tag = HashMap::with_capacity(mappings.len() * 2);

        for (tag, labels) in &mappings {
            tag_to_esco.insert(*tag, labels.to_vec());
            for label in *labels {
                esco_to_tag.insert(label.to_lowercase(), *tag);
            }
        }

        Self {
            tag_to_esco,
            esco_to_tag,
        }
    }
}

// ── Lookup methods ───────────────────────────────────────────────────────────

impl EscoMapping {
    /// Look up which ESCO labels correspond to an internal tag.
    pub fn esco_labels_for_tag(&self, tag: &str) -> Option<&[&'static str]> {
        self.tag_to_esco.get(tag).map(|v| v.as_slice())
    }

    /// Look up which internal tag corresponds to an ESCO label.
    /// Performs case-insensitive matching.
    pub fn tag_for_esco_label(&self, esco_label: &str) -> Option<&'static str> {
        self.esco_to_tag.get(&esco_label.to_lowercase()).copied()
    }

    /// Check if an ESCO label matches any internal tag.
    /// More lenient than `tag_for_esco_label` — also checks substring containment
    /// and common variations.
    pub fn fuzzy_match_esco(&self, esco_label: &str) -> Option<&'static str> {
        let lower = esco_label.to_lowercase();

        // 1. Exact case-insensitive match in esco_to_tag
        if let Some(&tag) = self.esco_to_tag.get(&lower) {
            return Some(tag);
        }

        // 2. Check if the ESCO label contains any internal tag name
        //    e.g. "use Docker" contains "docker", "apply machine learning" contains "machine-learning"
        for &tag in self.tag_to_esco.keys() {
            // Try the tag directly (handles single-word tags like "docker")
            if lower.contains(tag) {
                return Some(tag);
            }
            // Try with hyphens replaced by spaces (handles "machine-learning" -> "machine learning")
            let spaced = tag.replace('-', " ");
            if spaced != tag && lower.contains(&spaced) {
                return Some(tag);
            }
        }

        // 3. Check if any internal tag name contains the ESCO label
        //    e.g. tag "ci-cd" for label "ci"
        for &tag in self.tag_to_esco.keys() {
            if tag.contains(&*lower) {
                return Some(tag);
            }
        }

        None
    }

    /// Number of internal tags with ESCO mappings.
    pub fn mapped_tag_count(&self) -> usize {
        self.tag_to_esco.len()
    }

    /// Return all internal tags that have no ESCO mapping.
    pub fn unmapped_tags(&self) -> Vec<&'static str> {
        ALL_TAGS
            .iter()
            .filter(|tag| !self.tag_to_esco.contains_key(**tag))
            .copied()
            .collect()
    }
}

// ── Gap Analysis ─────────────────────────────────────────────────────────────

impl EscoMapping {
    /// Analyze which ESCO skills from a ground-truth dataset have no internal mapping.
    ///
    /// Returns `(mapped_count, unmapped_count, unmapped_skills)` where `unmapped_skills`
    /// is a list of `(esco_label, frequency)` sorted by frequency descending.
    pub fn gap_analysis(
        &self,
        esco_labels: &[String],
    ) -> (usize, usize, Vec<(String, usize)>) {
        let mut mapped = 0usize;
        let mut unmapped_freq: HashMap<String, usize> = HashMap::new();

        for label in esco_labels {
            if self.fuzzy_match_esco(label).is_some() {
                mapped += 1;
            } else {
                *unmapped_freq.entry(label.clone()).or_insert(0) += 1;
            }
        }

        let unmapped_count: usize = unmapped_freq.values().sum();

        let mut unmapped_skills: Vec<(String, usize)> = unmapped_freq.into_iter().collect();
        unmapped_skills.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));

        (mapped, unmapped_count, unmapped_skills)
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_mapping_coverage() {
        let m = EscoMapping::default();
        // Should have at least 50 mapped tags
        assert!(m.mapped_tag_count() >= 50);
    }

    #[test]
    fn test_tag_to_esco() {
        let m = EscoMapping::default();
        let labels = m.esco_labels_for_tag("python").unwrap();
        assert!(labels.iter().any(|l| l.contains("Python")));
    }

    #[test]
    fn test_esco_to_tag() {
        let m = EscoMapping::default();
        assert_eq!(
            m.tag_for_esco_label("Python (computer programming)"),
            Some("python")
        );
        assert_eq!(
            m.tag_for_esco_label("machine learning"),
            Some("machine-learning")
        );
    }

    #[test]
    fn test_fuzzy_match() {
        let m = EscoMapping::default();
        assert_eq!(m.fuzzy_match_esco("use Docker"), Some("docker"));
        assert_eq!(
            m.fuzzy_match_esco("apply machine learning"),
            Some("machine-learning")
        );
    }

    #[test]
    fn test_case_insensitive() {
        let m = EscoMapping::default();
        assert_eq!(m.tag_for_esco_label("PYTHON"), Some("python"));
        assert_eq!(m.tag_for_esco_label("javascript"), Some("javascript"));
    }

    #[test]
    fn test_gap_analysis() {
        let m = EscoMapping::default();
        let labels = vec![
            "Python (computer programming)".to_string(),
            "underwater basket weaving".to_string(),
            "machine learning".to_string(),
            "underwater basket weaving".to_string(),
        ];
        let (mapped, unmapped, gaps) = m.gap_analysis(&labels);
        assert_eq!(mapped, 2);
        assert_eq!(unmapped, 2);
        assert_eq!(gaps[0].0, "underwater basket weaving");
        assert_eq!(gaps[0].1, 2);
    }

    #[test]
    fn test_unmapped_tags() {
        let m = EscoMapping::default();
        let unmapped = m.unmapped_tags();
        // Some niche tags like "mastra" won't have ESCO mappings
        assert!(unmapped.contains(&"mastra"));
    }

    #[test]
    fn test_bidirectional_consistency() {
        let m = EscoMapping::default();
        // Every tag in tag_to_esco should have all its labels in esco_to_tag
        for (&tag, labels) in &m.tag_to_esco {
            for label in labels {
                let resolved = m.tag_for_esco_label(label);
                assert_eq!(
                    resolved,
                    Some(tag),
                    "ESCO label '{}' should map back to tag '{}'",
                    label,
                    tag
                );
            }
        }
    }

    #[test]
    fn test_unmapped_completeness() {
        let m = EscoMapping::default();
        let unmapped = m.unmapped_tags();
        let mapped_count = m.mapped_tag_count();
        // mapped + unmapped should equal total tag count
        assert_eq!(
            mapped_count + unmapped.len(),
            ALL_TAGS.len(),
            "mapped ({}) + unmapped ({}) should equal total tags ({})",
            mapped_count,
            unmapped.len(),
            ALL_TAGS.len()
        );
    }
}
