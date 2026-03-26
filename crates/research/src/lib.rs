pub mod agent;
pub mod arxiv;
pub mod code;
pub mod core_api;
pub mod crossref;
pub mod dual;
pub mod embeddings;
pub mod openalex;
pub mod paper;
pub mod scholar;
pub mod team;
pub mod tools;

#[cfg(feature = "local-vector")]
pub mod chunker;
#[cfg(feature = "local-vector")]
pub mod critique;
#[cfg(feature = "local-vector")]
pub mod local_embeddings;
#[cfg(feature = "local-vector")]
pub mod vector;

pub use agent::LlmProvider;
pub use arxiv::ArxivClient;
pub use core_api::CoreClient;
pub use embeddings::{EmbeddingRanker, Ranker};
pub use crossref::CrossrefClient;
pub use dual::{DualModelResearcher, MultiModelResearcher, MultiResponse};
pub use openalex::OpenAlexClient;
pub use paper::ResearchPaper;
#[cfg(feature = "local-vector")]
pub use paper::dedup_by_embedding;
pub use scholar::SemanticScholarClient;

#[cfg(feature = "local-vector")]
pub use chunker::{Chunk, ChunkerConfig};
#[cfg(feature = "local-vector")]
pub use critique::{Critique, CritiqueConfig};
#[cfg(feature = "local-vector")]
pub use local_embeddings::{EmbeddingEngine, LocalRanker};
#[cfg(feature = "local-vector")]
pub use vector::VectorStore;
