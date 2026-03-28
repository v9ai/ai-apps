pub mod error;
pub mod types;

#[cfg(feature = "client")]
pub mod client;

#[cfg(feature = "patterns")]
pub mod patterns;

// Re-exports
pub use error::{GhError, Result};
pub use types::*;

#[cfg(feature = "client")]
pub use client::GhClient;

#[cfg(feature = "patterns")]
pub use patterns::analyse_org;
