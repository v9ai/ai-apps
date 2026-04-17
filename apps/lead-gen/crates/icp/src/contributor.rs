pub const FEATURE_NAMES: [&str; 13] = [
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
    "contribution_quality",
];

pub trait ContributorFeatureSource {
    fn rising_score(&self) -> f32;
    fn contribution_density(&self) -> f32;
    fn novelty(&self) -> f32;
    fn breadth(&self) -> f32;
    fn realness(&self) -> f32;
    fn followers(&self) -> u32;
    fn public_repos(&self) -> u32;
    fn ai_repos_count(&self) -> usize;
    fn days_since_last_active(&self) -> Option<u32>;
    fn contributions_90d(&self) -> Option<u32>;
    fn strength_score(&self) -> f32;
    fn opp_skill_match(&self) -> f32;
    fn contribution_quality(&self) -> Option<f32>;
}

pub fn contributor_to_features<T: ContributorFeatureSource>(candidate: &T) -> Vec<f32> {
    let log_followers = (candidate.followers() as f32 + 1.0).ln() / 15.0;
    let log_repos = (candidate.public_repos() as f32 + 1.0).ln() / 6.0;
    let log_ai_repos = (candidate.ai_repos_count() as f32 + 1.0).ln() / 6.0_f32.ln();

    let recency = candidate.days_since_last_active()
        .map(|d| (1.0 - d as f32 / 180.0).max(0.0))
        .unwrap_or(0.0);
    let log_contrib_90d = candidate.contributions_90d()
        .map(|c| (c as f32 + 1.0).ln() / 6.0)
        .unwrap_or(0.0)
        .clamp(0.0, 1.0);

    let contribution_quality = candidate.contribution_quality().unwrap_or(0.0);

    vec![
        candidate.rising_score(),
        candidate.contribution_density(),
        candidate.novelty(),
        candidate.breadth(),
        candidate.realness(),
        log_followers.clamp(0.0, 1.0),
        log_repos.clamp(0.0, 1.0),
        log_ai_repos.clamp(0.0, 1.0),
        recency,
        log_contrib_90d,
        candidate.strength_score().clamp(0.0, 1.0),
        candidate.opp_skill_match().clamp(0.0, 1.0),
        contribution_quality.clamp(0.0, 1.0),
    ]
}

pub fn to_hash_features<T: ContributorFeatureSource>(candidate: &T) -> Vec<(String, String)> {
    contributor_to_features(candidate)
        .into_iter()
        .zip(FEATURE_NAMES)
        .map(|(v, name)| (name.to_string(), format!("{v:.6}")))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TestCandidate {
        rising: f32,
        density: f32,
        novelty: f32,
        breadth: f32,
        realness: f32,
        followers: u32,
        repos: u32,
        ai_repos: usize,
        days_active: Option<u32>,
        c90: Option<u32>,
        strength: f32,
        skill_match: f32,
        quality: Option<f32>,
    }

    impl ContributorFeatureSource for TestCandidate {
        fn rising_score(&self) -> f32 { self.rising }
        fn contribution_density(&self) -> f32 { self.density }
        fn novelty(&self) -> f32 { self.novelty }
        fn breadth(&self) -> f32 { self.breadth }
        fn realness(&self) -> f32 { self.realness }
        fn followers(&self) -> u32 { self.followers }
        fn public_repos(&self) -> u32 { self.repos }
        fn ai_repos_count(&self) -> usize { self.ai_repos }
        fn days_since_last_active(&self) -> Option<u32> { self.days_active }
        fn contributions_90d(&self) -> Option<u32> { self.c90 }
        fn strength_score(&self) -> f32 { self.strength }
        fn opp_skill_match(&self) -> f32 { self.skill_match }
        fn contribution_quality(&self) -> Option<f32> { self.quality }
    }

    fn make(rising: f32, followers: u32, repos: u32, ai: usize) -> TestCandidate {
        TestCandidate {
            rising, density: 0.5, novelty: 0.5, breadth: 0.4, realness: 0.8,
            followers, repos, ai_repos: ai,
            days_active: Some(5), c90: Some(80), strength: rising * 0.8,
            skill_match: 0.6, quality: Some(0.4),
        }
    }

    #[test]
    fn feature_vector_has_13_elements() {
        assert_eq!(contributor_to_features(&make(0.5, 100, 20, 3)).len(), 13);
    }

    #[test]
    fn all_features_in_unit_range() {
        for (f, r, ai) in [(0u32, 0u32, 0usize), (50_000, 200, 50), (100, 30, 3)] {
            let c = make(0.7, f, r, ai);
            for (i, v) in contributor_to_features(&c).iter().enumerate() {
                assert!(
                    (0.0..=1.0).contains(v),
                    "feature[{i}] ({}) = {v} out of range",
                    FEATURE_NAMES[i],
                );
            }
        }
    }

    #[test]
    fn hash_features_parse_as_f64() {
        let c = make(0.6, 50, 10, 2);
        for (name, val) in to_hash_features(&c) {
            val.parse::<f64>()
                .unwrap_or_else(|_| panic!("feature {name}={val} must parse as f64"));
        }
    }
}
