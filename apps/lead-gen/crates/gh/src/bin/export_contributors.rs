/// export_contributors — Export high-scoring GitHub contributors to the
/// Neon PostgreSQL `contacts` table.
///
/// Reads the LanceDB contributors store, filters by rising_score threshold,
/// and upserts matching entries into the `contacts` table using
/// `github_handle` as the dedup key.
///
/// Environment variables:
///   NEON_DATABASE_URL    Neon connection string (required)
///   LANCE_DB_PATH        LanceDB directory (default: ./contributors.lance)
///   EXPORT_THRESHOLD     Minimum rising_score to export (default: 0.5)
///   EXPORT_TOP_N         Number of top contributors to consider (default: 500)
use std::time::Duration;

use sqlx::postgres::PgPoolOptions;
use tracing::info;

use github_patterns::contrib_store::save_contributor_contact;
use github_patterns::contributors::ContributorsDb;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "export_contributors=info,github_patterns=info".into()),
        )
        .init();

    let db_url = std::env::var("NEON_DATABASE_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .expect("NEON_DATABASE_URL env var is required");

    let lance_path = std::env::var("LANCE_DB_PATH")
        .unwrap_or_else(|_| "./contributors.lance".into());

    let threshold: f32 = std::env::var("EXPORT_THRESHOLD")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.5);

    let top_n: usize = std::env::var("EXPORT_TOP_N")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(500);

    info!("connecting to Neon…");
    let pool = PgPoolOptions::new()
        .max_connections(3)
        .acquire_timeout(Duration::from_secs(10))
        .connect(&db_url)
        .await?;
    info!("Neon connection ready");

    info!("opening LanceDB at {lance_path}");
    let db = ContributorsDb::open(&lance_path).await?;
    let total_in_db = db.count().await;
    info!("LanceDB has {total_in_db} contributors, considering top {top_n}");

    let ranked = db.top_candidates(top_n).await?;
    info!(
        "fetched {} contributors, threshold={threshold:.2}",
        ranked.len()
    );

    let mut exported = 0usize;
    let mut skipped = 0usize;

    for candidate in &ranked {
        match save_contributor_contact(&pool, candidate, threshold, &[]).await {
            Ok(Some(id)) => {
                exported += 1;
                tracing::debug!("exported {} → contacts id={id}", candidate.login);
            }
            Ok(None) => {
                skipped += 1;
            }
            Err(e) => {
                tracing::warn!("failed to export {}: {e}", candidate.login);
            }
        }
    }

    info!(
        "export complete — {exported} contacts upserted, {skipped} below threshold ({threshold:.2})"
    );
    Ok(())
}
