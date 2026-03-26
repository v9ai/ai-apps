//! Zenodo REST API client for searching and retrieving open-access records.
//!
//! Provides access to 3M+ research outputs (papers, datasets, software)
//! with no API key required for public records. Optional access token
//! enables higher rate limits.

pub mod client;
pub mod error;
pub mod types;

pub use client::ZenodoClient;
pub use error::Error;
pub use types::*;
