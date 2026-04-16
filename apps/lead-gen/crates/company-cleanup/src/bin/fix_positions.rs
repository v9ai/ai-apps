/// fix_positions — detect and clear LinkedIn headlines stored as contact positions.
///
/// Usage:
///   DATABASE_URL=postgresql://... cargo run --release --bin fix_positions           # dry-run
///   DATABASE_URL=postgresql://... cargo run --release --bin fix_positions -- --fix   # update DB

use anyhow::{Context, Result};
use tracing::{info, warn};

use company_cleanup::contacts::{self, classify_position, HeadlineVerdict};
use company_cleanup::db;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let fix_mode = std::env::args().any(|a| a == "--fix");
    if fix_mode {
        warn!("FIX MODE — flagged positions WILL be set to NULL");
    } else {
        info!("DRY-RUN MODE — no DB changes (pass --fix to clear positions)");
    }

    // Connect to Neon PostgreSQL
    let db_url = std::env::var("DATABASE_URL").context("DATABASE_URL must be set")?;
    let pool = db::connect(&db_url).await?;

    // Fetch contacts with positions
    let all_contacts = contacts::fetch_contacts_with_positions(&pool).await?;
    info!("Fetched {} contacts with positions", all_contacts.len());

    // Classify each
    let mut flagged: Vec<HeadlineVerdict> = Vec::new();
    for contact in &all_contacts {
        if let Some(verdict) = classify_position(contact) {
            flagged.push(verdict);
        }
    }

    // Report
    info!("───────────────────────────────────────────────");
    info!(
        "Total with position: {} | Flagged as headline: {}",
        all_contacts.len(),
        flagged.len(),
    );

    // Print flagged (limit to 50 in dry-run for readability)
    let display_limit = if fix_mode { flagged.len() } else { 50 };
    for (i, v) in flagged.iter().enumerate().take(display_limit) {
        let pos_preview = if v.position.len() > 80 {
            format!("{}…", &v.position[..80])
        } else {
            v.position.clone()
        };
        info!(
            "[{:>4}] id={:<6} score={} {} | {} | {}",
            i + 1,
            v.contact_id,
            v.score,
            v.name,
            v.reasons.join(", "),
            pos_preview,
        );
    }
    if !fix_mode && flagged.len() > display_limit {
        info!("... and {} more (showing first {display_limit})", flagged.len() - display_limit);
    }

    // Fix if requested
    if fix_mode && !flagged.is_empty() {
        let ids: Vec<i32> = flagged.iter().map(|v| v.contact_id).collect();
        let cleared = contacts::clear_positions_batch(&pool, &ids).await?;
        info!("Cleared {cleared} contact positions");
    } else if !flagged.is_empty() {
        info!(
            "Dry-run complete. Pass --fix to clear {} headline positions.",
            flagged.len()
        );
    } else {
        info!("No headline positions found — nothing to do.");
    }

    Ok(())
}
