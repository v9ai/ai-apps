//! Map raw NER skill spans to the canonical 157-tag taxonomy.
//!
//! Layered strategy: exact alias match → fuzzy match → unmapped.

use std::collections::HashMap;

/// How the skill was mapped to the taxonomy.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MappingMethod {
    Exact,
    Fuzzy,
}

/// A skill span mapped (or not) to the canonical taxonomy.
#[derive(Debug, Clone)]
pub struct MappedSkill {
    pub raw_text: String,
    pub canonical_tag: Option<String>,
    pub mapping_confidence: f32,
    pub method: Option<MappingMethod>,
}

pub struct TaxonomyMapper {
    aliases: HashMap<String, String>,
    canonical_tags: Vec<String>,
}

impl TaxonomyMapper {
    pub fn new() -> Self {
        let mut aliases = HashMap::new();
        let mut canonical_tags = Vec::new();

        // Build alias map from the canonical taxonomy.
        // Each entry: (alias_lowercase, canonical_tag)
        let entries: &[(&[&str], &str)] = &[
            // Programming Languages
            (&["javascript", "js", "es6", "es2015", "ecmascript"], "javascript"),
            (&["typescript", "ts"], "typescript"),
            (&["python", "py", "python3", "python 3"], "python"),
            (&["java"], "java"),
            (&["rust", "rust-lang", "rustlang"], "rust"),
            (&["go", "golang", "go lang"], "go"),
            (&["c++", "cpp", "c plus plus", "cplusplus"], "c++"),
            (&["c#", "csharp", "c sharp", "c-sharp"], "c#"),
            (&["ruby", "rb"], "ruby"),
            (&["swift"], "swift"),
            (&["kotlin", "kt"], "kotlin"),
            (&["scala"], "scala"),
            (&["php"], "php"),
            (&["r", "r language", "rlang"], "r"),
            (&["julia"], "julia"),
            (&["elixir"], "elixir"),
            (&["haskell"], "haskell"),
            (&["clojure", "clj"], "clojure"),
            (&["lua"], "lua"),
            (&["dart"], "dart"),
            (&["zig"], "zig"),

            // Frontend
            (&["react", "reactjs", "react.js", "react js"], "react"),
            (&["vue", "vuejs", "vue.js", "vue js"], "vue"),
            (&["next.js", "nextjs", "next js", "next"], "nextjs"),
            (&["svelte", "sveltejs", "sveltekit"], "svelte"),
            (&["angular", "angularjs", "angular.js"], "angular"),
            (&["html", "html5"], "html"),
            (&["css", "css3", "cascading style sheets"], "css"),
            (&["tailwind", "tailwindcss", "tailwind css"], "tailwindcss"),
            (&["sass", "scss"], "sass"),

            // Backend
            (&["node.js", "nodejs", "node js", "node"], "nodejs"),
            (&["express", "expressjs", "express.js"], "express"),
            (&["django"], "django"),
            (&["flask"], "flask"),
            (&["fastapi", "fast api"], "fastapi"),
            (&["spring", "spring boot", "springboot", "spring-boot"], "spring-boot"),
            (&["rails", "ruby on rails", "ror"], "rails"),
            (&["laravel"], "laravel"),
            (&["asp.net", "asp net", "aspnet", ".net", "dotnet", "dot net"], ".net"),
            (&["nest.js", "nestjs", "nest js"], "nestjs"),

            // Databases
            (&["postgresql", "postgres", "psql", "pg"], "postgresql"),
            (&["mysql", "my sql"], "mysql"),
            (&["mongodb", "mongo", "mongo db"], "mongodb"),
            (&["redis"], "redis"),
            (&["elasticsearch", "elastic search", "elastic", "es"], "elasticsearch"),
            (&["dynamodb", "dynamo db", "dynamo"], "dynamodb"),
            (&["cassandra", "apache cassandra"], "cassandra"),
            (&["sqlite", "sqlite3"], "sqlite"),
            (&["neo4j"], "neo4j"),
            (&["clickhouse", "click house"], "clickhouse"),
            (&["cockroachdb", "cockroach db", "cockroach"], "cockroachdb"),
            (&["supabase"], "supabase"),
            (&["neon", "neon db", "neondb"], "neon"),

            // Cloud & DevOps
            (&["aws", "amazon web services", "amazon aws"], "aws"),
            (&["gcp", "google cloud", "google cloud platform"], "gcp"),
            (&["azure", "microsoft azure", "ms azure"], "azure"),
            (&["docker", "containers", "containerization"], "docker"),
            (&["kubernetes", "k8s", "kube"], "kubernetes"),
            (&["terraform", "tf"], "terraform"),
            (&["ansible"], "ansible"),
            (&["jenkins"], "jenkins"),
            (&["ci/cd", "ci cd", "cicd", "continuous integration", "continuous deployment"], "ci-cd"),
            (&["github actions", "gha"], "github-actions"),
            (&["vercel"], "vercel"),
            (&["cloudflare", "cf"], "cloudflare"),
            (&["nginx", "nginx server"], "nginx"),
            (&["linux", "unix"], "linux"),
            (&["git", "version control"], "git"),

            // AI/ML/GenAI
            (&["machine learning", "ml"], "ml"),
            (&["deep learning", "dl", "deep-learning"], "deep-learning"),
            (&["llm", "large language model", "large language models"], "llm"),
            (&["nlp", "natural language processing", "nlu", "natural language understanding"], "nlp"),
            (&["computer vision", "cv", "image recognition"], "computer-vision"),
            (&["rag", "retrieval augmented generation", "retrieval-augmented generation", "rag architectures", "rag architecture"], "rag"),
            (&["prompt engineering", "prompt-engineering", "prompting"], "prompt-engineering"),
            (&["fine-tuning", "finetuning", "fine tuning", "model fine-tuning"], "fine-tuning"),
            (&["tensorflow", "tf", "tensor flow"], "tensorflow"),
            (&["pytorch", "torch", "py torch"], "pytorch"),
            (&["transformers", "huggingface transformers", "hf transformers"], "transformers"),
            (&["langchain", "lang chain"], "langchain"),
            (&["embeddings", "embedding", "vector embeddings"], "embeddings"),
            (&["vector database", "vector db", "vectordb", "vector-db"], "vector-db"),
            (&["openai", "open ai", "gpt", "chatgpt"], "openai"),
            (&["anthropic", "claude"], "anthropic"),
            (&["vercel ai sdk", "ai sdk"], "vercel-ai-sdk"),
            (&["scikit-learn", "sklearn", "scikit learn"], "scikit-learn"),
            (&["pandas", "pd"], "pandas"),
            (&["numpy", "np"], "numpy"),
            (&["scipy", "sci py"], "scipy"),
            (&["keras"], "keras"),
            (&["huggingface", "hugging face", "hf"], "huggingface"),
            (&["mlops", "ml ops", "ml-ops"], "mlops"),
            (&["data science", "data-science"], "data-science"),

            // Data & Analytics
            (&["spark", "apache spark", "pyspark"], "spark"),
            (&["kafka", "apache kafka"], "kafka"),
            (&["airflow", "apache airflow"], "airflow"),
            (&["snowflake"], "snowflake"),
            (&["databricks"], "databricks"),
            (&["dbt"], "dbt"),
            (&["etl", "data pipeline", "data pipelines"], "etl"),
            (&["sql", "structured query language"], "sql"),

            // API & Protocols
            (&["graphql", "graph ql"], "graphql"),
            (&["rest", "rest api", "restful", "rest apis"], "rest"),
            (&["grpc", "g rpc"], "grpc"),
            (&["websocket", "websockets", "ws"], "websockets"),

            // Testing
            (&["jest"], "jest"),
            (&["cypress"], "cypress"),
            (&["playwright"], "playwright"),
            (&["pytest", "py test"], "pytest"),
            (&["selenium"], "selenium"),
            (&["unit testing", "unit tests"], "unit-testing"),

            // Mobile
            (&["react native", "react-native", "rn"], "react-native"),
            (&["flutter"], "flutter"),
            (&["ios", "ios development"], "ios"),
            (&["android", "android development"], "android"),

            // Security
            (&["cybersecurity", "cyber security", "security", "infosec"], "security"),
            (&["oauth", "oauth2", "o auth"], "oauth"),
            (&["jwt", "json web token", "json web tokens"], "jwt"),

            // Monitoring & Observability
            (&["prometheus"], "prometheus"),
            (&["grafana"], "grafana"),
            (&["datadog", "data dog"], "datadog"),
            (&["splunk"], "splunk"),
            (&["new relic", "newrelic"], "newrelic"),
            (&["opentelemetry", "otel", "open telemetry"], "opentelemetry"),

            // Tools & Misc
            (&["prisma"], "prisma"),
            (&["drizzle", "drizzle orm"], "drizzle"),
            (&["trpc", "t rpc"], "trpc"),
            (&["shadcn", "shadcn/ui", "shadcn ui"], "shadcn-ui"),
            (&["storybook"], "storybook"),
            (&["webpack"], "webpack"),
            (&["vite"], "vite"),
            (&["figma"], "figma"),
            (&["jira"], "jira"),

            // Methodologies
            (&["agile", "agile methodology"], "agile"),
            (&["scrum"], "scrum"),
            (&["microservices", "micro services", "micro-services"], "microservices"),
            (&["system design", "systems design"], "system-design"),
            (&["distributed systems", "distributed computing"], "distributed-systems"),
        ];

        for (aliases_list, tag) in entries {
            canonical_tags.push(tag.to_string());
            for alias in *aliases_list {
                aliases.insert(alias.to_lowercase(), tag.to_string());
            }
        }

        canonical_tags.sort();
        canonical_tags.dedup();

        Self { aliases, canonical_tags }
    }

    /// Map a raw skill text to the canonical taxonomy.
    pub fn map_skill(&self, raw_text: &str) -> MappedSkill {
        let lower = raw_text.to_lowercase().trim().to_string();

        // Layer 1: Exact alias match
        if let Some(tag) = self.aliases.get(&lower) {
            return MappedSkill {
                raw_text: raw_text.to_string(),
                canonical_tag: Some(tag.clone()),
                mapping_confidence: 1.0,
                method: Some(MappingMethod::Exact),
            };
        }

        // Layer 2: Fuzzy match (Jaro-Winkler)
        let mut best_score = 0.0f32;
        let mut best_tag: Option<&str> = None;

        for tag in &self.canonical_tags {
            let score = jaro_winkler(&lower, tag);
            if score > best_score {
                best_score = score;
                best_tag = Some(tag);
            }
            // Also check all aliases
        }
        // Check aliases too for fuzzy
        for (alias, tag) in &self.aliases {
            let score = jaro_winkler(&lower, alias);
            if score > best_score {
                best_score = score;
                best_tag = Some(tag);
            }
        }

        if best_score >= 0.85 {
            if let Some(tag) = best_tag {
                return MappedSkill {
                    raw_text: raw_text.to_string(),
                    canonical_tag: Some(tag.to_string()),
                    mapping_confidence: best_score,
                    method: Some(MappingMethod::Fuzzy),
                };
            }
        }

        // Layer 3: Unmapped
        MappedSkill {
            raw_text: raw_text.to_string(),
            canonical_tag: None,
            mapping_confidence: best_score,
            method: None,
        }
    }

    /// Map a batch of raw skills.
    pub fn map_skills(&self, raw_texts: &[&str]) -> Vec<MappedSkill> {
        raw_texts.iter().map(|t| self.map_skill(t)).collect()
    }

    /// Number of canonical tags in the taxonomy.
    pub fn tag_count(&self) -> usize {
        self.canonical_tags.len()
    }
}

impl Default for TaxonomyMapper {
    fn default() -> Self {
        Self::new()
    }
}

/// Jaro-Winkler similarity (0.0 to 1.0).
fn jaro_winkler(s1: &str, s2: &str) -> f32 {
    let jaro = jaro(s1, s2);
    // Winkler boost: reward common prefix up to 4 chars
    let prefix_len = s1.chars()
        .zip(s2.chars())
        .take(4)
        .take_while(|(a, b)| a == b)
        .count();
    let p = 0.1; // standard Winkler scaling factor
    jaro + (prefix_len as f32 * p * (1.0 - jaro))
}

/// Jaro similarity.
fn jaro(s1: &str, s2: &str) -> f32 {
    if s1 == s2 {
        return 1.0;
    }
    let s1_chars: Vec<char> = s1.chars().collect();
    let s2_chars: Vec<char> = s2.chars().collect();
    let len1 = s1_chars.len();
    let len2 = s2_chars.len();

    if len1 == 0 || len2 == 0 {
        return 0.0;
    }

    let match_distance = (len1.max(len2) / 2).saturating_sub(1);
    let mut s1_matches = vec![false; len1];
    let mut s2_matches = vec![false; len2];
    let mut matches = 0u32;
    let mut transpositions = 0u32;

    for i in 0..len1 {
        let start = i.saturating_sub(match_distance);
        let end = (i + match_distance + 1).min(len2);
        for j in start..end {
            if s2_matches[j] || s1_chars[i] != s2_chars[j] {
                continue;
            }
            s1_matches[i] = true;
            s2_matches[j] = true;
            matches += 1;
            break;
        }
    }

    if matches == 0 {
        return 0.0;
    }

    let mut k = 0;
    for i in 0..len1 {
        if !s1_matches[i] {
            continue;
        }
        while !s2_matches[k] {
            k += 1;
        }
        if s1_chars[i] != s2_chars[k] {
            transpositions += 1;
        }
        k += 1;
    }

    let m = matches as f32;
    (m / len1 as f32 + m / len2 as f32 + (m - transpositions as f32 / 2.0) / m) / 3.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_match() {
        let mapper = TaxonomyMapper::new();
        let result = mapper.map_skill("React.js");
        assert_eq!(result.canonical_tag, Some("react".to_string()));
        assert_eq!(result.method, Some(MappingMethod::Exact));
    }

    #[test]
    fn alias_match() {
        let mapper = TaxonomyMapper::new();
        let result = mapper.map_skill("k8s");
        assert_eq!(result.canonical_tag, Some("kubernetes".to_string()));

        let result = mapper.map_skill("Amazon Web Services");
        assert_eq!(result.canonical_tag, Some("aws".to_string()));
    }

    #[test]
    fn fuzzy_match() {
        let mapper = TaxonomyMapper::new();
        let result = mapper.map_skill("javascrip"); // typo
        assert!(result.canonical_tag.is_some());
        assert_eq!(result.method, Some(MappingMethod::Fuzzy));
    }

    #[test]
    fn unmapped() {
        let mapper = TaxonomyMapper::new();
        let result = mapper.map_skill("quantum computing frameworks");
        assert!(result.canonical_tag.is_none() || result.mapping_confidence < 0.85);
    }

    #[test]
    fn jaro_winkler_identity() {
        assert!((jaro_winkler("test", "test") - 1.0).abs() < 1e-6);
    }

    #[test]
    fn jaro_winkler_similar() {
        let score = jaro_winkler("javascript", "javascrip");
        assert!(score > 0.9);
    }
}
