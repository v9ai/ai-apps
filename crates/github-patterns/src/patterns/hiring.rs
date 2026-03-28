use crate::client::GhClient;
use crate::types::{GhRepo, HiringSignal};
use chrono::Utc;
use tracing::warn;

/// Repos created within this window are "new" for hiring purposes.
const NEW_REPO_DAYS: i64 = 60;
/// Repos with this many contributors (from a sample) look like active teams.
const GROWING_CONTRIBUTOR_MIN: u32 = 5;
/// Monthly release rate above this suggests active product delivery.
const RELEASE_RATE_THRESHOLD: f32 = 1.5;

pub async fn detect(client: &GhClient, org: &str, repos: &[GhRepo]) -> Vec<HiringSignal> {
    let mut signals: Vec<HiringSignal> = Vec::new();
    let now = Utc::now();
    let new_cutoff = now - chrono::Duration::days(NEW_REPO_DAYS);
    let cutoff_90d = now - chrono::Duration::days(90);

    for repo in repos.iter().filter(|r| !r.fork) {
        // 1. New repo (recently created)
        let days_ago = (now - repo.created_at).num_days() as u32;
        if repo.created_at > new_cutoff {
            signals.push(HiringSignal::NewRepo {
                name: repo.name.clone(),
                days_ago,
            });
        }

        // 2. Tech migration: new repo with a primary language that isn't the
        //    org's historical norm (detected as Rust/Go where org was Python)
        if repo.created_at > new_cutoff {
            if let Some(lang) = &repo.language {
                if matches!(lang.as_str(), "Rust" | "Go" | "Zig") {
                    signals.push(HiringSignal::TechMigration {
                        new_language: lang.clone(),
                        repo: repo.name.clone(),
                    });
                }
            }
        }

        // 3. Contributor count (only for recently active repos, top 10 limit)
        if repo.pushed_at.map_or(false, |p| p > cutoff_90d) {
            match client.repo_contributors(org, &repo.name).await {
                Ok(contribs) if contribs.len() as u32 >= GROWING_CONTRIBUTOR_MIN => {
                    signals.push(HiringSignal::GrowingContributors {
                        repo: repo.name.clone(),
                        contributor_count: contribs.len() as u32,
                    });
                }
                Err(e) => warn!("contributor fetch failed {}/{}: {e}", org, repo.name),
                _ => {}
            }
        }

        // 4. Frequent release cadence
        match client.repo_releases(org, &repo.name).await {
            Ok(releases) if !releases.is_empty() => {
                let recent: usize = releases
                    .iter()
                    .filter(|r| r.published_at.map_or(false, |p| p > cutoff_90d))
                    .count();
                // releases per month over 90 day window
                let rate = recent as f32 / 3.0;
                if rate >= RELEASE_RATE_THRESHOLD {
                    signals.push(HiringSignal::FrequentReleases {
                        repo: repo.name.clone(),
                        releases_per_month: rate,
                    });
                }
            }
            Err(e) => warn!("release fetch failed {}/{}: {e}", org, repo.name),
            _ => {}
        }
    }

    signals
}

/// Score 0.0–1.0 from hiring signals.
pub fn score(signals: &[HiringSignal]) -> f32 {
    let mut pts = 0.0_f32;
    for sig in signals {
        pts += match sig {
            HiringSignal::FrequentReleases { releases_per_month, .. } => {
                (releases_per_month / 4.0).min(0.25)
            }
            HiringSignal::GrowingContributors { contributor_count, .. } => {
                (*contributor_count as f32 / 20.0).min(0.20)
            }
            HiringSignal::NewRepo { .. } => 0.15,
            HiringSignal::TechMigration { .. } => 0.10,
        };
    }
    pts.min(1.0)
}
