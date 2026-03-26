//! CORE API client for searching open-access research outputs.
//!
//! Requires an API key from <https://core.ac.uk/services/api>.

pub mod client;
pub mod error;
pub mod types;

pub use client::CoreClient;
pub use error::Error;
pub use types::*;
