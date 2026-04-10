//! # hf
//!
//! Parallel data retrieval from Hugging Face Hub for the salescue / v9ai
//! lead-generation ecosystem. Bounded concurrency via `buffer_unordered`.
//!
//! ```rust,no_run
//! use hf::{HfClient, FetchRequest};
//!
//! #[tokio::main]
//! async fn main() -> Result<(), hf::Error> {
//!     let client = HfClient::new(None, 8)?;
//!     let repos = vec!["v9ai/salescue-score-v1", "v9ai/salescue-intent-v1"];
//!     let cards = client.fetch_model_cards(&repos).await?;
//!     for (repo, card) in cards {
//!         println!("{repo}: {} bytes", card.len());
//!     }
//!     Ok(())
//! }
//! ```

mod client;
mod error;
mod types;
pub mod org;

#[cfg(feature = "sqlite")]
pub mod db;

pub use client::HfClient;
pub use error::Error;
pub use org::OrgScanner;
pub use types::{
    FetchRequest, FetchResult, ListOptions, RepoInfo, RepoType, SiblingFile,
    OrgProfile, OrgSummary, TrainingSignal, TrainingSignalType,
    ModelMaturity, EffortLevel, SalesSignal, SalesCategory,
    OrgFingerprint, SimilarOrg, SimilarOrgOptions,
};
