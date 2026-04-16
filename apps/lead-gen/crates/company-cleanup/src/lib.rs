pub mod classifier;
pub mod corpus;
pub mod db;
pub mod store;

use serde::Serialize;

/// Classification result for a single company.
#[derive(Debug, Clone, Serialize)]
pub struct Verdict {
    pub is_crypto: bool,
    /// 0.0-1.0 confidence in the classification direction.
    pub confidence: f32,
    /// Human-readable top-3 nearest-neighbour matches.
    pub top_matches: Vec<String>,
}
