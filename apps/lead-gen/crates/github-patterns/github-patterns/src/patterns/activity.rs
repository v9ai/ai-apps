use crate::client::GhClient;
use crate::types::{ActivitySummary, GhRepo};
use chrono::Utc;
use futures::future::join_all;
use std::collections::HashSet;
use tracing::warn;

/// Build an `ActivitySummary` for the org.
///
/// Commit-activity, contributors, and releases are fetched in parallel
/// for the top 5 non-fork repos, bounded by GitHub's secondary rate
/// limits (the concurrent batch is small enough to be safe).
pub async fn summarise(client: &GhClient, org: &str, repos: &[GhRepo]) -> ActivitySummary {
    let cutoff_90d = Utc::now() - chrono::Duration::days(90);

    let total_repos  = repos.len() as u32;
    let active_repos = repos
        .iter()
        .filter(|r| r.pushed_at.map_or(false, |p| p > cutoff_90d))
        .count() as u32;
    let total_stars  = repos.iter().map(|r| r.stargazers_count).sum();
    let last_push    = repos.iter().filter_map(|r| r.pushed_at).max();

    let sample: Vec<_> = repos.iter().filter(|r| !r.fork).take(5).collect();

    // ── parallel fetch commit activity ───────────────────────────────────────
    let commit_futs: Vec<_> = sample
        .iter()
        .map(|r| client.repo_commit_activity(org, &r.name))
        .collect();
    let commit_results = join_all(commit_futs).await;

    let mut total_weekly = 0.0_f32;
    let mut sampled = 0u32;
    for (repo, result) in sample.iter().zip(&commit_results) {
        match result {
            Ok(weeks) => {
                let total: u32 = weeks.iter().map(|w| w.total).sum();
                total_weekly += total as f32 / weeks.len().max(1) as f32;
                sampled += 1;
            }
            Err(e) => warn!("commit activity {}/{}: {e}", org, repo.name),
        }
    }
    let avg_weekly_commits = if sampled > 0 { total_weekly / sampled as f32 } else { 0.0 };

    // ── parallel fetch contributors ──────────────────────────────────────────
    let contrib_futs: Vec<_> = sample
        .iter()
        .map(|r| client.repo_contributors(org, &r.name))
        .collect();
    let contrib_results = join_all(contrib_futs).await;

    let mut logins: HashSet<String> = HashSet::new();
    for (repo, result) in sample.iter().zip(&contrib_results) {
        match result {
            Ok(contribs) => { logins.extend(contribs.iter().map(|c| c.login.clone())); }
            Err(e) => warn!("contributors {}/{}: {e}", org, repo.name),
        }
    }
    let total_contributors = logins.len() as u32;

    // ── parallel fetch releases ───────────────────────────────────────────────
    let release_futs: Vec<_> = sample
        .iter()
        .map(|r| client.repo_releases(org, &r.name))
        .collect();
    let release_results = join_all(release_futs).await;

    let mut releases_last_90d = 0u32;
    for (repo, result) in sample.iter().zip(&release_results) {
        match result {
            Ok(releases) => {
                releases_last_90d += releases
                    .iter()
                    .filter(|r| r.published_at.map_or(false, |p| p > cutoff_90d))
                    .count() as u32;
            }
            Err(e) => warn!("releases {}/{}: {e}", org, repo.name),
        }
    }

    ActivitySummary {
        total_repos,
        active_repos,
        avg_weekly_commits,
        total_stars,
        total_contributors,
        last_push,
        releases_last_90d,
    }
}

/// Score 0.0–1.0 from activity summary.
pub fn score(a: &ActivitySummary) -> f32 {
    let mut pts = 0.0_f32;

    // Active repos ratio
    if a.total_repos > 0 {
        pts += (a.active_repos as f32 / a.total_repos as f32) * 0.30;
    }
    // Commit velocity
    pts += (a.avg_weekly_commits / 50.0).min(0.25);

    // Release cadence (≥4 releases/90d = max points)
    pts += (a.releases_last_90d as f32 / 4.0).min(0.20);

    // Contributor breadth (≥20 unique = max)
    pts += (a.total_contributors as f32 / 20.0).min(0.15);

    // Star signal (≥1000 cumulative = max)
    pts += (a.total_stars as f32 / 1000.0).min(0.10);

    pts.min(1.0)
}

#[cfg(test)]
mod tests {
    use super::score;
    use crate::types::ActivitySummary;

    #[test]
    fn score_all_zeros_is_zero() {
        assert_eq!(score(&ActivitySummary::default()), 0.0);
    }

    #[test]
    fn score_fully_active_hits_one() {
        let a = ActivitySummary {
            total_repos: 10,
            active_repos: 10,
            avg_weekly_commits: 50.0,
            releases_last_90d: 4,
            total_contributors: 20,
            total_stars: 1000,
            last_push: None,
        };
        assert!((score(&a) - 1.0).abs() < 1e-4);
    }

    #[test]
    fn score_half_active() {
        let a = ActivitySummary {
            total_repos: 10,
            active_repos: 5,          // 0.15
            avg_weekly_commits: 25.0, // 0.25 (capped: 25/50 = 0.5 > 0.25)
            releases_last_90d: 2,     // 0.20 (capped: 2/4 = 0.5 > 0.20)
            total_contributors: 10,   // 0.15 (capped: 10/20 = 0.5 > 0.15)
            total_stars: 500,         // 0.10 (capped: 500/1000 = 0.5 > 0.10)
            last_push: None,
        };
        assert!((score(&a) - 0.85).abs() < 1e-4);
    }

    #[test]
    fn score_no_divide_by_zero_on_zero_repos() {
        let a = ActivitySummary { total_repos: 0, active_repos: 0, ..Default::default() };
        assert_eq!(score(&a), 0.0);
    }

    #[test]
    fn score_capped_at_one() {
        let a = ActivitySummary {
            total_repos: 1,
            active_repos: 1,
            avg_weekly_commits: 9999.0,
            releases_last_90d: 9999,
            total_contributors: 9999,
            total_stars: 9_999_999,
            last_push: None,
        };
        assert!(score(&a) <= 1.0 + 1e-4);
    }

    #[test]
    fn score_commit_velocity_only() {
        let a = ActivitySummary { avg_weekly_commits: 50.0, ..Default::default() };
        assert!((score(&a) - 0.25).abs() < 1e-4);
    }
}
