//! Shared research infrastructure for multi-source academic paper discovery,
//! dual-model LLM agents, and team-based research orchestration.
//!
//! # Core capabilities
//!
//! * **Academic API clients** — [`ArxivClient`], [`SemanticScholarClient`],
//!   [`OpenAlexClient`], [`CrossrefClient`], [`CoreClient`], and [`ZenodoClient`]
//!   for searching and fetching papers from six major sources.
//! * **Unified paper model** — [`ResearchPaper`] normalises results from every
//!   source into a single type with `From` conversions.
//! * **Dual/multi-model LLM agents** — [`DualModelResearcher`] and
//!   [`MultiModelResearcher`] query DeepSeek and Qwen in parallel; the
//!   [`agent`] module exposes [`LlmProvider`] and builder helpers.
//! * **Agent tools** — ready-made [`tools`] (search, detail, recommendations)
//!   that implement the DeepSeek `Tool` trait for tool-use loops.
//! * **Code analysis** — [`code`] module wraps ast-grep for structural pattern
//!   search, structure analysis, and anti-pattern detection across languages.
//! * **Team orchestration** — [`team`] module provides [`team::TeamLead`],
//!   [`team::Teammate`], task scheduling, and broadcast messaging.
//! * **Semantic ranking** — [`EmbeddingRanker`] (API-based) and the optional
//!   `LocalRanker` (Candle, requires `local-vector`) implement the [`Ranker`] trait.
//! * **Retry logic** — [`retry`] module provides configurable exponential
//!   backoff with jitter for HTTP requests.
//! * **Search-quality critique** — [`critique`] module scores result sets on
//!   diversity, coverage, authority, and (with `local-vector`) semantic spread.
//!
//! # Feature flags
//!
//! | Flag | Effect |
//! |------|--------|
//! | `local-vector` | Enables Candle-based local embeddings, LanceDB vector store, text chunker, and semantic diversity scoring in critique. |

pub mod affiliation;
pub mod agent;
pub mod arxiv;
pub mod code;
pub mod core_api;
pub mod critique;
pub mod crossref;
pub mod dual;
pub mod embeddings;
pub mod ml_depth;
pub mod openalex;
pub mod paper;
pub mod retry;
pub mod scholar;
pub mod team;
pub mod tools;
pub mod zenodo;

#[cfg(feature = "local-vector")]
#[cfg_attr(docsrs, doc(cfg(feature = "local-vector")))]
pub mod chunker;
#[cfg(feature = "local-vector")]
#[cfg_attr(docsrs, doc(cfg(feature = "local-vector")))]
pub mod local_embeddings;
#[cfg(feature = "local-vector")]
#[cfg_attr(docsrs, doc(cfg(feature = "local-vector")))]
pub mod vector;

pub use affiliation::CompanyPaperSearch;
pub use agent::LlmProvider;
pub use arxiv::ArxivClient;
pub use core_api::CoreClient;
pub use critique::{Critique, CritiqueConfig, DimensionScores, DimensionWeights};
pub use crossref::CrossrefClient;
pub use dual::{DualModelResearcher, MultiModelResearcher, MultiResponse};
pub use embeddings::{EmbeddingRanker, Ranker};
pub use ml_depth::{MlDepthConfig, MlDepthDimensions, MlDepthScore, MlDepthVerdict};
pub use openalex::OpenAlexClient;
pub use paper::ResearchPaper;
pub use retry::RetryConfig;
pub use scholar::SemanticScholarClient;
pub use zenodo::ZenodoClient;

#[cfg(feature = "local-vector")]
#[cfg_attr(docsrs, doc(cfg(feature = "local-vector")))]
pub use chunker::{Chunk, ChunkStrategy, ChunkerConfig};
#[cfg(feature = "local-vector")]
#[cfg_attr(docsrs, doc(cfg(feature = "local-vector")))]
pub use local_embeddings::{EmbeddingEngine, LocalRanker};
#[cfg(feature = "local-vector")]
#[cfg_attr(docsrs, doc(cfg(feature = "local-vector")))]
pub use paper::dedup_by_embedding;
#[cfg(feature = "local-vector")]
#[cfg_attr(docsrs, doc(cfg(feature = "local-vector")))]
pub use vector::{SearchFilter, SearchResult, VectorStore};
