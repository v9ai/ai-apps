//! arXiv API client for searching and fetching preprints.
//!
//! Uses the arXiv Atom feed API with polite delays and retry-on-429.

pub mod client;
pub mod error;
pub mod types;

pub use client::ArxivClient;
pub use error::Error;
pub use types::*;
