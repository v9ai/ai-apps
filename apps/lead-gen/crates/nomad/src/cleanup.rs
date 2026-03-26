use anyhow::Result;
use serde_json::json;
use tracing::info;

use crate::d1::D1Client;

/// Remove stale/expired jobs from D1.
///
/// A job is considered stale if:
///   - It has status='stale' (already marked)
///   - It was created more than `max_age_days` ago and has no `first_published` date
///   - It has a `first_published` date older than `max_age_days`
pub async fn cleanup_stale_jobs(db: &D1Client, max_age_days: u32) -> Result<CleanupStats> {
    let mut stats = CleanupStats::default();

    // Count stale jobs first
    let count_rows = db
        .query(
            "SELECT count(*) as cnt FROM jobs WHERE status = 'stale'",
            None,
        )
        .await?;
    let already_stale = count_rows
        .first()
        .and_then(|r| r.get("cnt"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as u32;

    // Mark old jobs without published dates as stale
    db.execute(
        "UPDATE jobs SET status = 'stale', updated_at = datetime('now') \
         WHERE status NOT IN ('stale', 'eu-remote') \
         AND first_published IS NULL \
         AND created_at < datetime('now', ?)",
        Some(vec![json!(format!("-{max_age_days} days"))]),
    )
    .await?;

    // Mark old published jobs as stale
    db.execute(
        "UPDATE jobs SET status = 'stale', updated_at = datetime('now') \
         WHERE status NOT IN ('stale', 'eu-remote') \
         AND first_published IS NOT NULL \
         AND first_published < datetime('now', ?)",
        Some(vec![json!(format!("-{max_age_days} days"))]),
    )
    .await?;

    // Count newly stale
    let count_rows = db
        .query(
            "SELECT count(*) as cnt FROM jobs WHERE status = 'stale'",
            None,
        )
        .await?;
    let total_stale = count_rows
        .first()
        .and_then(|r| r.get("cnt"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as u32;

    stats.newly_stale = total_stale.saturating_sub(already_stale);
    stats.total_stale = total_stale;

    info!(
        "Cleanup: {} newly stale, {} total stale (max age: {} days)",
        stats.newly_stale, stats.total_stale, max_age_days
    );

    Ok(stats)
}

/// Delete stale jobs that have been stale for more than `grace_days`.
pub async fn purge_stale_jobs(db: &D1Client, grace_days: u32) -> Result<u32> {
    // Count before delete
    let count_rows = db
        .query(
            "SELECT count(*) as cnt FROM jobs \
             WHERE status = 'stale' AND updated_at < datetime('now', ?)",
            Some(vec![json!(format!("-{grace_days} days"))]),
        )
        .await?;
    let to_purge = count_rows
        .first()
        .and_then(|r| r.get("cnt"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as u32;

    if to_purge > 0 {
        db.execute(
            "DELETE FROM jobs WHERE status = 'stale' AND updated_at < datetime('now', ?)",
            Some(vec![json!(format!("-{grace_days} days"))]),
        )
        .await?;
        info!("Purged {} stale jobs (grace period: {} days)", to_purge, grace_days);
    }

    Ok(to_purge)
}

#[derive(Debug, Default)]
pub struct CleanupStats {
    pub newly_stale: u32,
    pub total_stale: u32,
}
