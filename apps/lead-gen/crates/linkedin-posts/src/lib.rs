pub mod analysis;
pub mod authority;
pub mod db;
pub mod intent_scorer;
pub mod models;
pub mod neon;
pub mod post_ner;
pub mod recruitment;
pub mod scoring;

/// LanceDB path: $LANCE_DB_PATH or ~/.lance/linkedin
pub fn lance_db_path() -> String {
    if let Ok(p) = std::env::var("LANCE_DB_PATH") {
        return p;
    }
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    format!("{}/.lance/linkedin", home)
}
