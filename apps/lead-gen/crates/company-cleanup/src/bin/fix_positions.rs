/// fix_positions — detect and clear LinkedIn headlines stored as contact positions.
///
/// Usage:
///   DATABASE_URL=postgresql://... cargo run --release --bin fix_positions                # dry-run
///   DATABASE_URL=postgresql://... cargo run --release --bin fix_positions -- --fix       # null positions
///   DATABASE_URL=postgresql://... cargo run --release --bin fix_positions -- --delete    # delete contacts
///   DATABASE_URL=postgresql://... cargo run --release --bin fix_positions -- --delete-ids /path/to/ids.txt

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

    let args: Vec<String> = std::env::args().collect();
    let fix_mode = args.iter().any(|a| a == "--fix");
    let delete_mode = args.iter().any(|a| a == "--delete");
    let delete_ids_file = args.windows(2)
        .find(|w| w[0] == "--delete-ids")
        .map(|w| w[1].clone());

    if let Some(ref path) = delete_ids_file {
        warn!("DELETE-IDS MODE — will delete contacts listed in {path}");
    } else if delete_mode {
        warn!("DELETE MODE — flagged contacts WILL be permanently deleted");
    } else if fix_mode {
        warn!("FIX MODE — flagged positions WILL be set to NULL");
    } else {
        info!("DRY-RUN MODE — no DB changes (pass --fix, --delete, or --delete-ids <file>)");
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
        let pos_preview: String = if v.position.chars().count() > 80 {
            format!("{}…", v.position.chars().take(80).collect::<String>())
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

    // Handle --delete-ids (from a previous run's saved IDs)
    if let Some(ref path) = delete_ids_file {
        let content = std::fs::read_to_string(path).context("reading IDs file")?;
        let ids: Vec<i32> = content
            .lines()
            .filter_map(|l| l.trim().parse::<i32>().ok())
            .collect();
        info!("Loaded {} IDs from {path}", ids.len());
        let deleted = contacts::delete_contacts_batch(&pool, &ids).await?;
        info!("Deleted {deleted} contacts");
        return Ok(());
    }

    // Act on flagged
    if delete_mode && !flagged.is_empty() {
        let ids: Vec<i32> = flagged.iter().map(|v| v.contact_id).collect();
        let deleted = contacts::delete_contacts_batch(&pool, &ids).await?;
        info!("Deleted {deleted} contacts");
    } else if fix_mode && !flagged.is_empty() {
        let ids: Vec<i32> = flagged.iter().map(|v| v.contact_id).collect();
        let cleared = contacts::clear_positions_batch(&pool, &ids).await?;
        info!("Cleared {cleared} contact positions");
    } else if !flagged.is_empty() {
        info!(
            "Dry-run complete. Pass --fix to clear, --delete to remove {} headline contacts.",
            flagged.len()
        );
    } else {
        info!("No headline positions found — nothing to do.");
    }

    Ok(())
}
