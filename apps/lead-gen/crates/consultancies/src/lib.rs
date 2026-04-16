pub mod classify;
pub mod db;
pub mod discovery;
pub mod github;
pub mod scrape;
pub mod seeds;

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct Consultancy {
    pub key: String,
    pub name: String,
    pub website: String,
    pub canonical_domain: String,
    pub description: String,
    pub location: String,
    pub size: String,
    pub source: String,
    pub services: Vec<String>,
    pub industries: Vec<String>,
    pub is_ai_focused: bool,
    pub score: f32,
    pub score_reasons: ScoreReasons,
    pub ai_tier: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScoreReasons {
    pub method: &'static str,
    pub keyword_hits: Vec<String>,
    pub ai_keyword_hits: Vec<String>,
    pub anti_hits: Vec<String>,
    pub source_bonus: f32,
    pub ai_score: f32,
    pub consultancy_score: f32,
}
