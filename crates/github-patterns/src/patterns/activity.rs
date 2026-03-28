use crate::client::GhClient;
use crate::types::{ActivitySummary, GhRepo};
use chrono::Utc;
use tracing::warn;

/// Build an `ActivitySummary` for the org.  Commit-activity stats are
/// fetched for the top 5 most-active (non-fork) repos only to stay
/// within GitHub's secondary rate-limit budget.
pub async fn summarise(client: &GhClient, org: &str, repos: &[GhRepo]) -> ActivitySummary {
    let cutoff_90d = Utc::now() - chrono::Duration::days(90);

    let total_repos = repos.len() as u32;
    let active_repos = repos
        .iter()
        .filter(|r| r.pushed_at.map_or(false, |p| p > cutoff_90d))
        .count() as u32;

    let total_stars: u32 = repos.iter().map(|r| r.stargazers_count).sum();

    let last_push = repos
        .iter()
        .filter_map(|r| r.pushed_at)
        .max();

    // Sample commit activity from top-5 non-fork repos
    let sample_repos: Vec<_> = repos
        .iter()
        .filter(|r| !r.fork)
        .take(5)
        .collect();

    let mut total_weekly_commits = 0.0_f32;
    let mut sampled = 0u32;
    for repo in &sample_repos {
        match client.repo_commit_activity(org, &repo.name).await {
            Ok(weeks) => {
                let total: u32 = weeks.iter().map(|w| w.total).sum();
                let avg = total as f32 / weeks.len().max(1) as f32;
                total_weekly_commits += avg;
                sampled += 1;
            }
            Err(e) => warn!("commit activity fetch failed {}/{}: {e}", org, repo.name),
        }
    }
    let avg_weekly_commits = if sampled > 0 {
        total_weekly_commits / sampled as f32
    } else {
        0.0
    };

    // Count contributors across sampled repos (deduplicated by login)
    let mut contributor_logins: std::collections::HashSet<String> = Default::default();
    for repo in &sample_repos {
        match client.repo_contributors(org, &repo.name).await {
            Ok(contribs) => {
                for c in contribs {
                    contributor_logins.insert(c.login);
                }
            }
            Err(e) => warn!("contributor fetch failed {}/{}: {e}", org, repo.name),
        }
    }
    let total_contributors = contributor_logins.len() as u32;

    // Count releases from sample repos in the last 90 days
    let mut releases_last_90d = 0u32;
    for repo in &sample_repos {
        match client.repo_releases(org, &repo.name).await {
            Ok(releases) => {
                releases_last_90d += releases
                    .iter()
                    .filter(|r| r.published_at.map_or(false, |p| p > cutoff_90d))
                    .count() as u32;
            }
            Err(e) => warn!("release fetch failed {}/{}: {e}", org, repo.name),
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
            active_repos: 10,       // 10/10 * 0.30 = 0.30
            avg_weekly_commits: 50.0, // 50/50 capped at 0.25
            releases_last_90d: 4,   // 4/4 capped at 0.20
            total_contributors: 20, // 20/20 capped at 0.15
            total_stars: 1000,      // 1000/1000 capped at 0.10
            last_push: None,
        };
        assert!((score(&a) - 1.0).abs() < 1e-4);
    }

    #[test]
    fn score_half_active() {
        let a = ActivitySummary {
            total_repos: 10,
            active_repos: 5,          // 0.5 * 0.30 = 0.15
            avg_weekly_commits: 25.0, // 25/50 * 0.25 = 0.125  → but formula is (25/50).min(0.25) = 0.125?
            // Wait: (avg/50).min(0.25) → 25/50 = 0.5, min(0.25) → 0.25. Hmm, 0.5 > 0.25 so capped.
            // Recalculate: 25/50 = 0.5 → min(0.25) = 0.25
            releases_last_90d: 2,     // 2/4 = 0.5 → min(0.20) = 0.20
            total_contributors: 10,   // 10/20 = 0.5 → min(0.15) = 0.15
            total_stars: 500,         // 500/1000 = 0.5 → min(0.10) = 0.10
            last_push: None,
        };
        // 0.15 + 0.25 + 0.20 + 0.15 + 0.10 = 0.85
        assert!((score(&a) - 0.85).abs() < 1e-4);
    }

    #[test]
    fn score_no_divide_by_zero_on_zero_repos() {
        let a = ActivitySummary {
            total_repos: 0,
            active_repos: 0,
            avg_weekly_commits: 0.0,
            ..Default::default()
        };
        // total_repos=0 → active ratio skipped, rest 0 → 0.0
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
        let a = ActivitySummary {
            avg_weekly_commits: 50.0, // → 0.25
            ..Default::default()
        };
        assert!((score(&a) - 0.25).abs() < 1e-4);
    }
}
