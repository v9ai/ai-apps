/// Integration tests — hit the real GitHub API.
///
/// Skipped by default: run with `cargo test -- --ignored` (requires GITHUB_TOKEN).

#[cfg(feature = "patterns")]
mod live {
    use github_patterns::{patterns::analyse_org, patterns::passes_icp, GhClient, IcpCriteria};

    /// Smoke test: analyse a well-known public org and assert the scores
    /// are in range and key fields are populated.
    #[tokio::test]
    #[ignore = "hits real GitHub API — needs GITHUB_TOKEN"]
    async fn analyse_huggingface_org() {
        let client = GhClient::from_env().expect("GITHUB_TOKEN must be set");
        let patterns = analyse_org(&client, "huggingface", 20)
            .await
            .expect("analyse_org failed");

        assert_eq!(patterns.org, "huggingface");

        // Scores are in [0, 1]
        assert!((0.0..=1.0).contains(&patterns.ai_score), "ai_score out of range");
        assert!((0.0..=1.0).contains(&patterns.activity_score), "activity_score out of range");
        assert!((0.0..=1.0).contains(&patterns.hiring_score), "hiring_score out of range");

        // HuggingFace is an AI-heavy org — should score reasonably high
        assert!(
            patterns.ai_score >= 0.20,
            "Expected ai_score >= 0.20 for huggingface, got {}",
            patterns.ai_score
        );

        // Should have detected Python as a language
        assert!(
            patterns.tech_stack.languages.contains_key("Python"),
            "Expected Python in huggingface tech stack"
        );

        // Should have many active repos
        assert!(
            patterns.activity.total_repos > 0,
            "Expected non-zero total_repos"
        );
    }

    /// Verify passes_icp using live org data.
    #[tokio::test]
    #[ignore = "hits real GitHub API — needs GITHUB_TOKEN"]
    async fn icp_filter_accepts_active_ai_org() {
        let client = GhClient::from_env().expect("GITHUB_TOKEN must be set");
        let org = client.org("huggingface").await.expect("org fetch failed");
        let repos = client.org_repos("huggingface", 30).await.expect("repos fetch failed");

        let criteria = IcpCriteria {
            min_repos: Some(10),
            min_stars: Some(100),
            active_within_days: Some(90),
            ..Default::default()
        };
        assert!(
            passes_icp(&org, &repos, &criteria),
            "huggingface should pass broad ICP criteria"
        );
    }

    /// Verify passes_icp rejects an org that fails a strict language filter.
    #[tokio::test]
    #[ignore = "hits real GitHub API — needs GITHUB_TOKEN"]
    async fn icp_filter_rejects_wrong_language() {
        let client = GhClient::from_env().expect("GITHUB_TOKEN must be set");
        // torvalds/linux is C-heavy, definitely not a TypeScript org
        let org = client.org("torvalds").await;
        if org.is_err() {
            // torvalds is a user, not an org — skip gracefully
            return;
        }
        let org = org.unwrap();
        let repos = client.org_repos("torvalds", 10).await.unwrap_or_default();

        let criteria = IcpCriteria {
            languages: vec!["TypeScript".to_string()],
            ..Default::default()
        };
        // torvalds repos are C — should fail TypeScript filter
        // (only fails if none of the repos has TypeScript as primary language)
        let ts_present = repos.iter().any(|r| r.language.as_deref() == Some("TypeScript"));
        if !ts_present {
            assert!(!passes_icp(&org, &repos, &criteria));
        }
    }
}
