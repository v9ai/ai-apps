//! Research tools — HTTP-based data gathering used by Phase 1 agents.
//!
//! Each tool is a plain async function returning a String result.
//! Tools run via reqwest — fully concurrent under tokio.

mod search;
mod fetch;
mod github;
mod arxiv;
mod orcid;

pub use search::web_search;
pub use fetch::fetch_url;
pub use github::github_profile;
pub use arxiv::{arxiv_search, semantic_scholar_search};
pub use orcid::orcid_works;
