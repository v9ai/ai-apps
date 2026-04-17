use icp_crate::contributor::{
    ContributorFeatureSource, contributor_to_features, to_hash_features,
};

use crate::contributors::Candidate;

impl ContributorFeatureSource for Candidate {
    fn rising_score(&self) -> f32 { self.rising_score }
    fn contribution_density(&self) -> f32 { self.contribution_density }
    fn novelty(&self) -> f32 { self.novelty }
    fn breadth(&self) -> f32 { self.breadth }
    fn realness(&self) -> f32 { self.realness }
    fn followers(&self) -> u32 { self.followers }
    fn public_repos(&self) -> u32 { self.public_repos }
    fn ai_repos_count(&self) -> usize { self.ai_repos_count }
    fn days_since_last_active(&self) -> Option<u32> { self.days_since_last_active }
    fn contributions_90d(&self) -> Option<u32> { self.contributions_90d }
    fn strength_score(&self) -> f32 { self.strength_score }
    fn opp_skill_match(&self) -> f32 { self.opp_skill_match }
    fn contribution_quality(&self) -> Option<f32> { self.contribution_quality }
}

pub fn candidate_to_features(candidate: &Candidate) -> Vec<f32> {
    contributor_to_features(candidate)
}

pub fn candidate_to_hash_features(candidate: &Candidate) -> Vec<(String, String)> {
    to_hash_features(candidate)
}

pub use icp_crate::contributor::FEATURE_NAMES;

#[cfg(test)]
mod tests {
    use super::*;

    fn make_candidate(
        rising_score: f32,
        followers: u32,
        public_repos: u32,
        ai_repos: usize,
    ) -> Candidate {
        Candidate {
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
            contribution_quality: Some(0.4),
        }
    }

    #[test]
    fn feature_vector_has_13_elements() {
        assert_eq!(candidate_to_features(&make_candidate(0.5, 100, 20, 3)).len(), 13);
    }

    #[test]
    fn all_features_in_unit_range() {
        for (f, r, ai) in [(0u32, 0u32, 0usize), (50_000, 200, 50), (100, 30, 3)] {
            let c = make_candidate(0.7, f, r, ai);
            for (i, v) in candidate_to_features(&c).iter().enumerate() {
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
        let c = make_candidate(0.6, 50, 10, 2);
        for (name, val) in candidate_to_hash_features(&c) {
            val.parse::<f64>()
                .unwrap_or_else(|_| panic!("feature {name}={val} must parse as f64"));
        }
    }
}
