//! OpenAlex API client for searching and retrieving academic works.
//!
//! Provides access to 250M+ works with no API key required.
//! Optional `mailto` enables the polite pool for higher rate limits.

pub mod client;
pub mod error;
pub mod types;

pub use client::OpenAlexClient;
pub use error::Error;
pub use types::*;
