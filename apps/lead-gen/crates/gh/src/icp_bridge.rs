/// ICP Feature Bridge — map a `RisingStar` to ML-ready feature vectors.
///
/// Produces:
/// - `contributor_to_features`     → `Vec<f32>` (12 dims, all in 0..1) for
///   `AttentionScorer` and other f32-input scorers.
/// - `contributor_to_hash_features` → `Vec<(String, String)>` pairs for
///   `OnlineLearner::hash_features` (values formatted as f64 strings).
///
/// No dependency on `crates/leadgen` — this crate stays self-contained.
use crate::contributors::RisingStar;

/// Human-readable names for each feature dimension (matches vector index).
pub const FEATURE_NAMES: [&str; 12] = [
    "rising_score",
    "contribution_density",
    "novelty",
    "breadth",
    "realness",
    "log_followers",
    "log_public_repos",
    "log_ai_repos",
    "recency",
    "log_contributions_90d",
    "strength_score",
    "opp_skill_match",
];

/// Map a `RisingStar` to a 12-element feature vector, all values in `[0, 1]`.
///
/// | idx | field                | normalisation                                  |
/// |-----|----------------------|------------------------------------------------|
/// |   0 | rising_score         | already 0..1 (composite score)                 |
/// |   1 | contribution_density | already 0..1 (tanh-normalised density)         |
/// |   2 | novelty              | already 0..1 (linear decay over 5 years)       |
/// |   3 | breadth              | already 0..1 (multi-repo breadth, capped at 5) |
/// |   4 | realness             | already 0..1 (ghost-account penalty)           |
/// |   5 | followers            | `ln(followers + 1) / 15.0`, clamped to 0..1   |
/// |   6 | public_repos         | `ln(public_repos + 1) / 6.0`, clamped to 0..1 |
/// |   7 | ai_repos_count       | `ln(count + 1) / ln(6)`, clamped to 0..1      |
/// |   8 | recency              | days since last active, 180d decay to 0        |
/// |   9 | log_contributions_90d| `ln(c90 + 1) / 6.0`, clamped to 0..1          |
/// |  10 | strength_score       | already 0..1 (experience-weighted composite)   |
/// |  11 | opp_skill_match      | already 0..1 (skill overlap ratio)             |
pub fn contributor_to_features(star: &RisingStar) -> Vec<f32> {
    let log_followers = (star.followers as f32 + 1.0).ln() / 15.0;
    let log_repos = (star.public_repos as f32 + 1.0).ln() / 6.0;
    // ln(6) ≈ 1.7918 — normalises so that 5 AI repos → 1.0
    let log_ai_repos = (star.ai_repos_count as f32 + 1.0).ln() / 6.0_f32.ln();

    let recency = star.days_since_last_active
        .map(|d| (1.0 - d as f32 / 180.0).max(0.0))
        .unwrap_or(0.0);
    let log_contrib_90d = star.contributions_90d
        .map(|c| (c as f32 + 1.0).ln() / 6.0)
        .unwrap_or(0.0)
        .clamp(0.0, 1.0);

    vec![
        star.rising_score,
        star.contribution_density,
        star.novelty,
        star.breadth,
        star.realness,
        log_followers.clamp(0.0, 1.0),
        log_repos.clamp(0.0, 1.0),
        log_ai_repos.clamp(0.0, 1.0),
        recency,
        log_contrib_90d,
        star.strength_score.clamp(0.0, 1.0),
        star.opp_skill_match.clamp(0.0, 1.0),
    ]
}

/// Map a `RisingStar` to `(feature_name, value_str)` pairs for
/// `OnlineLearner::hash_features`.
///
/// Values are formatted as 6-decimal float strings so
/// `value.parse::<f64>()` succeeds.
pub fn contributor_to_hash_features(star: &RisingStar) -> Vec<(String, String)> {
    contributor_to_features(star)
        .into_iter()
        .zip(FEATURE_NAMES)
        .map(|(v, name)| (name.to_string(), format!("{v:.6}")))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contributors::RisingStar;

    fn make_star(
        rising_score: f32,
        followers: u32,
        public_repos: u32,
        ai_repos: usize,
    ) -> RisingStar {
        RisingStar {
            login: "test".into(),
            html_url: "https://github.com/test".into(),
            name: None,
            email: None,
            company: None,
            location: None,
            bio: None,
            followers,
            public_repos,
            total_contributions: 100,
            ai_repos_count: ai_repos,
            rising_score,
            contribution_density: 0.5,
            novelty: 0.5,
            breadth: 0.4,
            realness: 0.8,
            gh_created_at: "2022-01-01T00:00:00Z".into(),
            skills: vec![],
            strength_score: rising_score * 0.8,
            opp_skill_match: 0.6,
            position_level: None,
            account_age_days: Some(1000),
            last_active_date: Some("2026-04-10".into()),
            days_since_last_active: Some(5),
            contributions_30d: Some(30),
            contributions_90d: Some(80),
            contributions_365d: Some(300),
            current_streak_days: Some(3),
            activity_trend: Some("stable".into()),
            recency: Some(0.5),
        }
    }

    #[test]
    fn feature_vector_has_12_elements() {
        let star = make_star(0.5, 100, 20, 3);
        assert_eq!(contributor_to_features(&star).len(), 12);
    }

    #[test]
    fn feature_names_matches_vector_length() {
        assert_eq!(FEATURE_NAMES.len(), 12);
    }

    #[test]
    fn all_features_in_unit_range() {
        for (followers, repos, ai_repos) in [(0u32, 0u32, 0usize), (50_000, 200, 50), (100, 30, 3)] {
            let star = make_star(0.7, followers, repos, ai_repos);
            for (i, v) in contributor_to_features(&star).iter().enumerate() {
                assert!(
                    (0.0..=1.0).contains(v),
                    "feature[{i}] ({}) = {v} out of range for followers={followers}",
                    FEATURE_NAMES[i],
                );
            }
        }
    }

    #[test]
    fn hash_features_values_parse_as_f64() {
        let star = make_star(0.6, 50, 10, 2);
        for (name, val) in contributor_to_hash_features(&star) {
            val.parse::<f64>()
                .unwrap_or_else(|_| panic!("feature {name}={val} must parse as f64"));
        }
    }

    #[test]
    fn hash_feature_names_match_feature_names_const() {
        let star = make_star(0.5, 10, 5, 2);
        let pairs = contributor_to_hash_features(&star);
        let names: Vec<&str> = pairs.iter().map(|(n, _)| n.as_str()).collect();
        assert_eq!(names, FEATURE_NAMES.as_slice());
    }

    #[test]
    fn zero_followers_log_feature_is_zero() {
        let star = make_star(0.5, 0, 5, 1);
        let features = contributor_to_features(&star);
        // ln(0+1) / 15 = 0/15 = 0
        assert!(
            (features[5] - 0.0).abs() < 1e-6,
            "log_followers should be 0 for 0 followers, got {}",
            features[5]
        );
    }

    #[test]
    fn five_ai_repos_saturates_ai_repos_feature() {
        let star = make_star(0.5, 0, 5, 5);
        let features = contributor_to_features(&star);
        // ln(5+1) / ln(6) = ln(6) / ln(6) = 1.0
        assert!(
            (features[7] - 1.0).abs() < 1e-5,
            "5 AI repos should give 1.0 for log_ai_repos, got {}",
            features[7]
        );
    }

    #[test]
    fn more_followers_gives_higher_log_followers() {
        let low = contributor_to_features(&make_star(0.5, 10, 5, 1));
        let high = contributor_to_features(&make_star(0.5, 10_000, 5, 1));
        assert!(
            high[5] > low[5],
            "10k followers ({}) should score higher than 10 ({}) on log_followers",
            high[5], low[5]
        );
    }
}
