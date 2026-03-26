//! LanceDB-backed vector store for papers and text chunks.
//!
//! Requires the `local-vector` feature. Uses [`crate::local_embeddings::EmbeddingEngine`]
//! for on-device embedding and supports paper-level, chunk-level, and hybrid search.

pub mod store;

pub use store::{SearchFilter, SearchResult, VectorStore};
