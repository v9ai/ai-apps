use anyhow::{Context, Result};
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub github_token: String,
    pub database_url: String,
    pub lance_uri: String,
    pub sqlite_path: String,
    pub embed_model: String,
    pub match_threshold: f32,
    pub fetch_per_source: u32,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let _ = dotenvy::dotenv();
        Ok(Self {
            github_token: env::var("GITHUB_TOKEN").context("GITHUB_TOKEN missing")?,
            database_url: env::var("DATABASE_URL").context("DATABASE_URL missing")?,
            lance_uri: env::var("LANCE_URI").unwrap_or_else(|_| "./data/lance".into()),
            sqlite_path: env::var("LEADMATCH_SQLITE").unwrap_or_else(|_| "./data/leadmatch.db".into()),
            embed_model: env::var("EMBED_MODEL")
                .unwrap_or_else(|_| "sentence-transformers/all-MiniLM-L6-v2".into()),
            match_threshold: env::var("MATCH_THRESHOLD")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.70),
            fetch_per_source: env::var("FETCH_PER_SOURCE")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(25),
        })
    }
}
