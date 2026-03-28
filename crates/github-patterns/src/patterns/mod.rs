pub mod ai_adoption;
pub mod activity;
pub mod hiring;
pub mod tech_stack;

use crate::client::GhClient;
use crate::error::Result;
use crate::types::*;
use chrono::Utc;
use tracing::info;

/// Analyse a GitHub org and return a scored `OrgPatterns`.
///
/// Fetches up to `max_repos` repos (sorted by last push) and runs
/// all four pattern detectors in sequence.  Slower repos (no commit
/// stats, no releases) are skipped gracefully.
pub async fn analyse_org(client: &GhClient, org: &str, max_repos: u8) -> Result<OrgPatterns> {
    info!("analysing org: {org}");

    let repos = client.org_repos(org, max_repos).await?;

    // -- tech stack (aggregate language bytes across all repos)
    let tech_stack = tech_stack::aggregate(client, org, &repos).await;

    // -- AI signals
    let ai_signals = ai_adoption::detect(&tech_stack, &repos);
    let ai_score = ai_adoption::score(&ai_signals, &tech_stack);

    // -- activity
    let activity = activity::summarise(client, org, &repos).await;
    let activity_score = activity::score(&activity);

    // -- hiring
    let hiring_signals = hiring::detect(client, org, &repos).await;
    let hiring_score = hiring::score(&hiring_signals);

    Ok(OrgPatterns {
        org: org.to_string(),
        ai_score,
        activity_score,
        hiring_score,
        tech_stack,
        ai_signals,
        hiring_signals,
        activity,
    })
}

/// Quick ICP pre-filter: does the org meet minimum thresholds before
/// spending API calls on full analysis?
pub fn passes_icp(org: &GhOrg, repos: &[GhRepo], criteria: &IcpCriteria) -> bool {
    if let Some(min) = criteria.min_repos {
        if org.public_repos < min {
            return false;
        }
    }
    if let Some(min_stars) = criteria.min_stars {
        if repos.iter().all(|r| r.stargazers_count < min_stars) {
            return false;
        }
    }
    if let Some(days) = criteria.active_within_days {
        let cutoff = Utc::now() - chrono::Duration::days(days as i64);
        let any_active = repos.iter().any(|r| r.pushed_at.map_or(false, |p| p > cutoff));
        if !any_active {
            return false;
        }
    }
    if !criteria.languages.is_empty() {
        let repo_langs: Vec<_> = repos.iter().filter_map(|r| r.language.as_deref()).collect();
        let any_lang = criteria
            .languages
            .iter()
            .any(|l| repo_langs.contains(&l.as_str()));
        if !any_lang {
            return false;
        }
    }
    true
}
