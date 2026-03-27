pub mod embedding;

pub use embedding::{cosine_similarity, CandleEmbedder, Embedder};

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

/// A single vector search result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorSearchResult {
    pub id: String,
    pub score: f32,
    pub metadata: serde_json::Value,
}

/// Filter criteria for vector search.
#[derive(Debug, Clone, Default)]
pub struct VectorFilter {
    pub industry: Option<String>,
    pub min_employees: Option<i32>,
    pub max_employees: Option<i32>,
}

/// Trait for vector index operations.
#[async_trait]
pub trait VectorIndex: Send + Sync {
    /// Insert a document with its text (will be embedded internally).
    async fn upsert(&self, id: &str, text: &str, metadata: serde_json::Value) -> Result<()>;

    /// Insert a batch of documents. Returns count inserted.
    async fn upsert_batch(
        &self,
        items: &[(String, String, serde_json::Value)],
    ) -> Result<usize>;

    /// Pure vector search by text query.
    async fn search(&self, query: &str, limit: usize) -> Result<Vec<VectorSearchResult>>;

    /// Hybrid search combining vector similarity with metadata filters.
    async fn hybrid_search(
        &self,
        query: &str,
        filter: VectorFilter,
        limit: usize,
    ) -> Result<Vec<VectorSearchResult>>;

    /// Get the embedding dimension.
    fn dimension(&self) -> usize;

    /// Get the number of indexed documents.
    async fn count(&self) -> Result<usize>;
}
