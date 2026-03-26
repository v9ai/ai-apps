//! Crossref API client for DOI-based metadata lookup and keyword search.
//!
//! Supports the polite pool via optional `mailto` for higher rate limits.

pub mod client;
pub mod error;
pub mod types;

pub use client::CrossrefClient;
pub use error::Error;
pub use types::*;
