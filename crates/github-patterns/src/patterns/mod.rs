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

#[cfg(test)]
mod tests {
    use super::passes_icp;
    use crate::types::{GhOrg, GhRepo, IcpCriteria};
    use chrono::Utc;

    fn make_org(public_repos: u32) -> GhOrg {
        GhOrg {
            login: "test-org".to_string(),
            name: Some("Test Org".to_string()),
            description: None,
            blog: None,
            location: None,
            email: None,
            public_repos,
            followers: 0,
            following: 0,
            created_at: Utc::now() - chrono::Duration::days(1000),
            updated_at: Utc::now(),
        }
    }

    fn make_repo(name: &str) -> GhRepo {
        GhRepo {
            id: 1,
            name: name.to_string(),
            full_name: format!("org/{name}"),
            description: None,
            language: None,
            stargazers_count: 0,
            forks_count: 0,
            open_issues_count: 0,
            topics: None,
            pushed_at: None,
            created_at: Utc::now() - chrono::Duration::days(365),
            updated_at: Utc::now(),
            archived: false,
            fork: false,
            size: 1000,
            default_branch: "main".to_string(),
        }
    }

    #[test]
    fn empty_criteria_always_passes() {
        let org = make_org(5);
        let repos = vec![make_repo("repo-a")];
        assert!(passes_icp(&org, &repos, &IcpCriteria::default()));
    }

    #[test]
    fn min_repos_too_few_fails() {
        let org = make_org(3);
        let criteria = IcpCriteria { min_repos: Some(5), ..Default::default() };
        assert!(!passes_icp(&org, &[], &criteria));
    }

    #[test]
    fn min_repos_enough_passes() {
        let org = make_org(10);
        let criteria = IcpCriteria { min_repos: Some(5), ..Default::default() };
        assert!(passes_icp(&org, &[], &criteria));
    }

    #[test]
    fn min_stars_no_repo_qualifies_fails() {
        let org = make_org(5);
        let mut repo = make_repo("tiny");
        repo.stargazers_count = 50;
        let criteria = IcpCriteria { min_stars: Some(100), ..Default::default() };
        assert!(!passes_icp(&org, &[repo], &criteria));
    }

    #[test]
    fn min_stars_one_repo_qualifies_passes() {
        let org = make_org(5);
        let mut repo = make_repo("popular");
        repo.stargazers_count = 500;
        let criteria = IcpCriteria { min_stars: Some(100), ..Default::default() };
        assert!(passes_icp(&org, &[repo], &criteria));
    }

    #[test]
    fn active_within_days_stale_repo_fails() {
        let org = make_org(5);
        let mut repo = make_repo("old");
        repo.pushed_at = Some(Utc::now() - chrono::Duration::days(200));
        let criteria = IcpCriteria { active_within_days: Some(30), ..Default::default() };
        assert!(!passes_icp(&org, &[repo], &criteria));
    }

    #[test]
    fn active_within_days_recent_repo_passes() {
        let org = make_org(5);
        let mut repo = make_repo("active");
        repo.pushed_at = Some(Utc::now() - chrono::Duration::days(5));
        let criteria = IcpCriteria { active_within_days: Some(30), ..Default::default() };
        assert!(passes_icp(&org, &[repo], &criteria));
    }

    #[test]
    fn active_within_days_null_pushed_at_fails() {
        let org = make_org(5);
        let repo = make_repo("no-push-date"); // pushed_at = None
        let criteria = IcpCriteria { active_within_days: Some(30), ..Default::default() };
        assert!(!passes_icp(&org, &[repo], &criteria));
    }

    #[test]
    fn language_filter_no_match_fails() {
        let org = make_org(5);
        let mut repo = make_repo("ts-project");
        repo.language = Some("TypeScript".to_string());
        let criteria = IcpCriteria {
            languages: vec!["Rust".to_string()],
            ..Default::default()
        };
        assert!(!passes_icp(&org, &[repo], &criteria));
    }

    #[test]
    fn language_filter_match_passes() {
        let org = make_org(5);
        let mut repo = make_repo("rust-project");
        repo.language = Some("Rust".to_string());
        let criteria = IcpCriteria {
            languages: vec!["Rust".to_string(), "Go".to_string()],
            ..Default::default()
        };
        assert!(passes_icp(&org, &[repo], &criteria));
    }

    #[test]
    fn all_criteria_must_pass() {
        // Passes min_repos but fails language filter
        let org = make_org(10);
        let mut repo = make_repo("py-project");
        repo.language = Some("Python".to_string());
        let criteria = IcpCriteria {
            min_repos: Some(5),
            languages: vec!["Rust".to_string()],
            ..Default::default()
        };
        assert!(!passes_icp(&org, &[repo], &criteria));
    }
}
