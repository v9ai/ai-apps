pub mod error;
pub mod types;

#[cfg(feature = "client")]
pub mod client;

#[cfg(feature = "patterns")]
pub mod deps;

#[cfg(feature = "patterns")]
pub mod readme;

#[cfg(feature = "patterns")]
pub mod patterns;

/// Partner staffing fitness scoring — delivery leads, architects, consultants.
#[cfg(feature = "search")]
pub mod partner_fitness;

/// Local BERT semantic scorer — no cloud required.
/// Load once with `EmbedScorer::new()`, reuse across orgs.
#[cfg(feature = "embed")]
pub mod embed;

/// Neon PostgreSQL writer — saves `OrgPatterns` and derived tags.
#[cfg(feature = "neon")]
pub mod store;

/// LanceDB contributor store — persists full GitHub user profiles.
#[cfg(feature = "lance")]
pub mod contributors;

/// Keyword-based AI/ML skill extraction from contributor bios and repos.
#[cfg(feature = "lance")]
pub mod skills;

/// ICP feature bridge — maps `RisingStar` to `Vec<f32>` for ML scorers.
#[cfg(feature = "icp")]
pub mod icp_bridge;

/// Neon PostgreSQL writer — saves `RisingStar` entries to the contacts table.
#[cfg(all(feature = "lance", feature = "neon"))]
pub mod contrib_store;

// Re-exports
pub use error::{GhError, Result};
pub use types::*;

#[cfg(feature = "client")]
pub use client::GhClient;

#[cfg(feature = "patterns")]
pub use patterns::analyse_org;

#[cfg(feature = "embed")]
pub use embed::EmbedScorer;

#[cfg(feature = "search")]
pub use partner_fitness::{compute_partner_fitness, extract_archetypes, PartnerFitness};
