//! Keyword-based slug mapping and relevance scoring.
//!
//! Ported from `scripts/scrape-udemy-courses.ts`.

/// Keywords that must appear in a course's full text for it to be relevant.
/// At least one must match for a course to be stored.
pub const RELEVANCE_KEYWORDS: &[&str] = &[
    "vector database",
    "vector db",
    "vectorstore",
    "vector store",
    "pinecone",
    "weaviate",
    "qdrant",
    "milvus",
    "chroma",
    "chromadb",
    "pgvector",
    "faiss",
    "similarity search",
    "embedding",
    "vector search",
    "nearest neighbor",
    "rag",
    "retrieval augmented",
    "retrieval-augmented",
    "langchain",
    "llamaindex",
    "langgraph",
];

/// Udemy topic slugs that should be skipped — Udemy promotes these on every page.
pub const PROMO_SLUGS: &[&str] = &[
    "google-ai-fundamentals",
    "google-ai-for-brainstorming-and-planning",
    "google-ai-for-research-and-insights",
    "google-ai-for-writing-and-communicating",
    "google-ai-for-content-creation",
    "google-ai-for-data-analysis",
    "google-ai-for-workflow-automation",
];

/// Seed topic slugs for the Udemy topic crawler.
pub const SEED_TOPICS: &[&str] = &[
    "vector-databases",
    "langchain",
    "openai-api",
    "retrieval-augmented-generation",
    "ai-agents",
    "generative-ai",
];

type SlugEntry = (&'static str, &'static [&'static str]);

/// Maps each lesson slug to the keywords that indicate a course belongs there.
pub const SLUG_KEYWORDS: &[SlugEntry] = &[
    (
        "vector-databases",
        &[
            "vector database",
            "pinecone",
            "weaviate",
            "qdrant",
            "milvus",
            "chroma",
            "pgvector",
            "faiss",
            "similarity search",
            "nearest neighbor",
            "vector store",
            "vector index",
            "vector search",
            "ann index",
            "hnsw",
        ],
    ),
    (
        "embedding-models",
        &[
            "embedding model",
            "sentence transformer",
            "text-embedding",
            "word2vec",
            "sbert",
            "embed model",
            "vector representation",
            "openai embedding",
        ],
    ),
    (
        "retrieval-strategies",
        &[
            "retrieval",
            "semantic search",
            "hybrid search",
            "reranking",
            "bm25",
            "dense retrieval",
            "sparse retrieval",
            "rag retrieval",
            "search engine",
        ],
    ),
    (
        "advanced-rag",
        &[
            "advanced rag",
            "agentic rag",
            "multi-step retrieval",
            "query decomposition",
            "self-rag",
            "corrective rag",
            "graph rag",
            "rag pipeline",
        ],
    ),
    (
        "chunking-strategies",
        &[
            "chunking",
            "text splitting",
            "document splitting",
            "chunk size",
            "recursive split",
            "semantic chunking",
        ],
    ),
    (
        "rag-evaluation",
        &[
            "rag eval",
            "faithfulness",
            "context relevance",
            "answer relevance",
            "groundedness",
            "ragas",
            "trulens",
        ],
    ),
    (
        "embeddings",
        &[
            "embedding",
            "dense vector",
            "embedding space",
            "cosine similarity",
            "semantic similarity",
            "vector embedding",
        ],
    ),
    (
        "langgraph",
        &["langgraph", "langchain graph", "state graph", "agentic rag"],
    ),
    (
        "function-calling",
        &["function calling", "tool calling", "tool use"],
    ),
    (
        "agent-architectures",
        &[
            "ai agent",
            "agent architecture",
            "react agent",
            "react loop",
            "multi-agent",
            "agentic",
        ],
    ),
];

/// Returns true if the course text passes the hard relevance filter.
pub fn is_relevant(text: &str) -> bool {
    let lower = text.to_lowercase();
    RELEVANCE_KEYWORDS.iter().any(|kw| lower.contains(kw))
}

/// Returns `(slug, score)` pairs for all matching lesson slugs.
///
/// Score formula (from TS): `clamp(0.3, (hits / total) * 1.5, 1.0)`
pub fn match_slugs(text: &str) -> Vec<(String, f32)> {
    let lower = text.to_lowercase();
    let mut matches = Vec::new();

    for (slug, keywords) in SLUG_KEYWORDS {
        let hits = keywords.iter().filter(|kw| lower.contains(*kw)).count();
        if hits > 0 {
            let score = (hits as f32 / keywords.len() as f32 * 1.5)
                .min(1.0)
                .max(0.3);
            let rounded = (score * 100.0).round() / 100.0;
            matches.push((slug.to_string(), rounded));
        }
    }

    matches
}
