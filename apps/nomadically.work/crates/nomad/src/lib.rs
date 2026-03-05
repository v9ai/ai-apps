pub mod constants;
pub mod d1;
pub mod signals;
pub mod heuristic;
pub mod classifier;
pub mod role_tagger;
pub mod ats_enhance;
pub mod pipeline;
pub mod cleanup;
pub mod reporter;

use serde::{Deserialize, Serialize};


/// Confidence level for classification results.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Confidence {
    High,
    Medium,
    Low,
}

impl Confidence {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::High => "high",
            Self::Medium => "medium",
            Self::Low => "low",
        }
    }

    pub fn score(&self) -> f64 {
        match self {
            Self::High => 0.9,
            Self::Medium => 0.6,
            Self::Low => 0.3,
        }
    }
}

impl std::fmt::Display for Confidence {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

/// EU remote classification result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobClassification {
    #[serde(alias = "is_remote_eu", alias = "isRemoteEu", alias = "isRemoteEU")]
    pub is_remote_eu: bool,
    pub confidence: Confidence,
    #[serde(default)]
    pub reason: String,
}

/// Raw job row from D1 — matches the columns fetched for classification.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct JobRow {
    pub id: i64,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub location: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub workplace_type: Option<String>,
    #[serde(default)]
    pub offices: Option<String>,
    #[serde(default)]
    pub categories: Option<String>,
    #[serde(default)]
    pub ashby_is_remote: Option<serde_json::Value>,
    #[serde(default)]
    pub ashby_secondary_locations: Option<String>,
    #[serde(default)]
    pub ashby_address: Option<String>,
    #[serde(default)]
    pub source_kind: Option<String>,
    #[serde(default)]
    pub company_key: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub external_id: Option<String>,
    #[serde(default)]
    pub url: Option<String>,
    // Role tagging fields
    #[serde(default)]
    pub role_frontend_react: Option<i64>,
    #[serde(default)]
    pub role_ai_engineer: Option<i64>,
    #[serde(default)]
    pub role_confidence: Option<String>,
    #[serde(default)]
    pub role_reason: Option<String>,
    #[serde(default)]
    pub role_source: Option<String>,
}

impl JobRow {
    pub fn get_str(&self, field: &str) -> &str {
        match field {
            "title" => self.title.as_deref().unwrap_or(""),
            "location" => self.location.as_deref().unwrap_or(""),
            "description" => self.description.as_deref().unwrap_or(""),
            "country" => self.country.as_deref().unwrap_or(""),
            "workplace_type" => self.workplace_type.as_deref().unwrap_or(""),
            "offices" => self.offices.as_deref().unwrap_or(""),
            "categories" => self.categories.as_deref().unwrap_or(""),
            "ashby_secondary_locations" => self.ashby_secondary_locations.as_deref().unwrap_or(""),
            "ashby_address" => self.ashby_address.as_deref().unwrap_or(""),
            "source_kind" => self.source_kind.as_deref().unwrap_or(""),
            "company_key" => self.company_key.as_deref().unwrap_or(""),
            _ => "",
        }
    }

    pub fn ashby_is_remote_bool(&self) -> bool {
        match &self.ashby_is_remote {
            Some(serde_json::Value::Bool(b)) => *b,
            Some(serde_json::Value::Number(n)) => n.as_i64() == Some(1),
            _ => false,
        }
    }
}

/// Extracted EU signals from a job row.
#[derive(Debug, Clone, Default)]
pub struct SignalSet {
    pub ats_remote: bool,
    pub eu_country_code: bool,
    pub country_code: Option<String>,
    pub negative_signals: Vec<String>,
    pub us_implicit_signals: Vec<String>,
    pub eu_timezone: bool,
    pub eu_countries_in_location: Vec<String>,
    pub all_locations: Vec<String>,
}

/// Job processing status values.
pub mod status {
    pub const NEW: &str = "new";
    pub const ENHANCED: &str = "enhanced";
    pub const ROLE_MATCH: &str = "role-match";
    pub const ROLE_NOMATCH: &str = "role-nomatch";
    pub const EU_REMOTE: &str = "eu-remote";
    pub const NON_EU: &str = "non-eu";
}

/// Default LLM model for classification, role tagging, and reporting.
pub const DEFAULT_MODEL: &str = "claude-opus-4-6";

/// Shared SELECT column list for fetching jobs for classification/enhancement.
pub const CLASSIFY_SELECT: &str = "\
    id, title, location, description, country, workplace_type, \
    offices, categories, ashby_is_remote, ashby_secondary_locations, \
    ashby_address, source_kind, company_key, status, external_id, url";

/// Role tagging result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleTagResult {
    pub frontend_react: bool,
    pub ai_engineer: bool,
    pub confidence: Confidence,
    pub reason: String,
    pub source: String,
}
