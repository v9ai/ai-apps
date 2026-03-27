/// ICP matching criteria — defines what signals to look for in contact records.
pub struct IcpMatcher {
    /// Target industries (lowercase). A contact's industry matches if any substring matches.
    pub target_industries: Vec<String>,
    /// Target seniorities (e.g., "VP", "Director", "C-level").
    pub target_seniorities: Vec<String>,
    /// Target departments (e.g., "Engineering", "AI", "ML").
    pub target_departments: Vec<String>,
    /// Target tech stack keywords.
    pub target_tech: Vec<String>,
    /// Employee range (min, max).
    pub employee_range: (u32, u32),
}

impl IcpMatcher {
    /// Check if a value matches any target (case-insensitive substring).
    fn matches_any(value: &str, targets: &[String]) -> bool {
        let lower = value.to_lowercase();
        targets.iter().any(|t| lower.contains(t.as_str()))
    }

    /// Score a contact's tech overlap (0-10 scale).
    pub fn tech_overlap(&self, tech_stack: &str) -> u8 {
        if self.target_tech.is_empty() { return 0; }
        let lower = tech_stack.to_lowercase();
        let hits = self.target_tech.iter().filter(|t| lower.contains(t.as_str())).count();
        ((hits as f32 / self.target_tech.len() as f32) * 10.0).min(10.0) as u8
    }

    /// Populate a single slot in a ContactBatch from contact/company fields.
    #[allow(clippy::too_many_arguments)]
    pub fn populate_slot(
        &self,
        batch: &mut ContactBatch,
        idx: usize,
        industry: &str,
        employee_count: u32,
        seniority: &str,
        title: &str,
        tech_stack: &str,
        email_status: &str,
        days_since_update: u16,
    ) {
        batch.industry_match[idx] = Self::matches_any(industry, &self.target_industries) as u8;
        batch.employee_in_range[idx] = (employee_count >= self.employee_range.0
            && employee_count <= self.employee_range.1) as u8;
        batch.seniority_match[idx] = Self::matches_any(seniority, &self.target_seniorities) as u8;
        batch.department_match[idx] = Self::matches_any(title, &self.target_departments) as u8;
        batch.tech_overlap[idx] = self.tech_overlap(tech_stack);
        batch.email_verified[idx] = match email_status {
            "verified" => 2,
            "catch-all" | "catchall" => 1,
            _ => 0,
        };
        batch.recency_days[idx] = days_since_update;
    }
}

impl Default for IcpMatcher {
    fn default() -> Self {
        Self {
            target_industries: vec!["ai".into(), "ml".into(), "saas".into(), "infrastructure".into()],
            target_seniorities: vec!["vp".into(), "director".into(), "head".into(), "chief".into(), "cto".into(), "ceo".into()],
            target_departments: vec!["engineering".into(), "ai".into(), "ml".into(), "data".into(), "platform".into()],
            target_tech: vec!["rust".into(), "python".into(), "kubernetes".into(), "pytorch".into(), "tensorflow".into()],
            employee_range: (20, 500),
        }
    }
}

/// ICP (Ideal Customer Profile) weight configuration for scoring.
pub struct IcpProfile {
    pub industry_weight: f32,    // default 25
    pub employee_weight: f32,    // default 15
    pub seniority_weight: f32,   // default 25
    pub department_weight: f32,  // default 15
    pub tech_weight: f32,        // default 10 (0-10 scale input)
    pub email_weight: f32,       // default 5
}

impl Default for IcpProfile {
    fn default() -> Self {
        Self {
            industry_weight: 25.0,
            employee_weight: 15.0,
            seniority_weight: 25.0,
            department_weight: 15.0,
            tech_weight: 10.0,
            email_weight: 5.0,
        }
    }
}

/// Batch of contacts in Structure-of-Arrays layout for vectorized scoring.
/// Cache-line aligned (64 bytes) for optimal NEON/SSE auto-vectorization.
/// Process up to 256 contacts per batch.
#[repr(C, align(64))]
pub struct ContactBatch {
    // Input columns (parallel arrays — same index = same contact)
    pub industry_match: [u8; 256],    // 1 if matches ICP industry
    pub employee_in_range: [u8; 256], // 1 if in ICP employee range
    pub seniority_match: [u8; 256],   // 1 if matches target seniority
    pub department_match: [u8; 256],  // 1 if matches target department
    pub tech_overlap: [u8; 256],      // 0-10 scale of tech stack overlap
    pub email_verified: [u8; 256],    // 2=verified, 1=catch-all, 0=unknown
    pub recency_days: [u16; 256],     // days since last update

    // Output
    pub scores: [f32; 256],

    pub count: usize,
}

impl ContactBatch {
    pub fn new() -> Self {
        // Safety: all-zeros is valid for this struct
        unsafe { std::mem::zeroed() }
    }

    /// Compute ICP fit scores for the entire batch using default weights.
    pub fn compute_scores(&mut self) {
        self.compute_scores_with(&IcpProfile::default());
    }

    /// Compute ICP fit scores with custom weight profile.
    /// The loop structure is auto-vectorizable by LLVM with -C opt-level=3.
    pub fn compute_scores_with(&mut self, icp: &IcpProfile) {
        let n = self.count;
        let max = icp.industry_weight
            + icp.employee_weight
            + icp.seniority_weight
            + icp.department_weight
            + icp.tech_weight
            + icp.email_weight;

        for i in 0..n {
            let mut score: f32 = 0.0;

            score += self.industry_match[i] as f32 * icp.industry_weight;
            score += self.employee_in_range[i] as f32 * icp.employee_weight;
            score += self.seniority_match[i] as f32 * icp.seniority_weight;
            score += self.department_match[i] as f32 * icp.department_weight;
            score += self.tech_overlap[i] as f32; // already 0-10, maps to tech_weight range
            score += match self.email_verified[i] {
                2 => icp.email_weight,
                1 => icp.email_weight * 0.4,
                _ => 0.0,
            };

            // Normalize to 0-100
            let icp_fit = (score / max) * 100.0;

            // Recency bonus (0-15 points)
            let recency = match self.recency_days[i] {
                0..=7 => 15.0f32,
                8..=14 => 12.0,
                15..=30 => 9.0,
                31..=90 => 5.0,
                91..=180 => 2.0,
                _ => 0.0,
            };

            self.scores[i] = icp_fit * 0.85 + recency;
        }
    }

    /// Return top-k indices by score (partial sort via quickselect).
    pub fn top_k(&self, k: usize) -> Vec<usize> {
        let k = k.min(self.count);
        if k == 0 {
            return Vec::new();
        }

        let mut indices: Vec<usize> = (0..self.count).collect();

        indices.select_nth_unstable_by(k.saturating_sub(1), |&a, &b| {
            self.scores[b]
                .partial_cmp(&self.scores[a])
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        indices.truncate(k);
        indices.sort_by(|&a, &b| {
            self.scores[b]
                .partial_cmp(&self.scores[a])
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        indices
    }

    /// Get a scored result as (index, score) pairs, sorted descending.
    pub fn top_k_scored(&self, k: usize) -> Vec<(usize, f32)> {
        self.top_k(k)
            .into_iter()
            .map(|i| (i, self.scores[i]))
            .collect()
    }

    /// Serialize top-K results as JSON for Python pipeline consumption.
    /// Format: [{"index": N, "score": F}, ...]
    pub fn top_k_json(&self, k: usize) -> String {
        let results = self.top_k_scored(k);
        let mut json = String::from("[");
        for (i, (idx, score)) in results.iter().enumerate() {
            if i > 0 {
                json.push(',');
            }
            json.push_str(&format!(r#"{{"index":{},"score":{:.2}}}"#, idx, score));
        }
        json.push(']');
        json
    }
}

impl Default for ContactBatch {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_scoring() {
        let mut batch = ContactBatch::new();
        batch.count = 3;

        // Perfect candidate
        batch.industry_match[0] = 1;
        batch.employee_in_range[0] = 1;
        batch.seniority_match[0] = 1;
        batch.department_match[0] = 1;
        batch.tech_overlap[0] = 10;
        batch.email_verified[0] = 2;
        batch.recency_days[0] = 1;

        // Partial candidate
        batch.industry_match[1] = 1;
        batch.seniority_match[1] = 1;
        batch.tech_overlap[1] = 5;
        batch.email_verified[1] = 1;
        batch.recency_days[1] = 30;

        // Weak candidate
        batch.tech_overlap[2] = 2;
        batch.recency_days[2] = 365;

        batch.compute_scores();

        assert!(batch.scores[0] > batch.scores[1]);
        assert!(batch.scores[1] > batch.scores[2]);
        assert!(batch.scores[0] > 90.0); // near-perfect
        assert!(batch.scores[2] < 20.0); // weak
    }

    #[test]
    fn test_top_k() {
        let mut batch = ContactBatch::new();
        batch.count = 5;
        batch.scores[0] = 50.0;
        batch.scores[1] = 90.0;
        batch.scores[2] = 30.0;
        batch.scores[3] = 70.0;
        batch.scores[4] = 10.0;

        let top3 = batch.top_k(3);
        assert_eq!(top3.len(), 3);
        assert_eq!(top3[0], 1); // 90
        assert_eq!(top3[1], 3); // 70
        assert_eq!(top3[2], 0); // 50
    }

    #[test]
    fn test_top_k_empty() {
        let batch = ContactBatch::new();
        assert!(batch.top_k(5).is_empty());
    }

    #[test]
    fn test_top_k_exceeds_count() {
        let mut batch = ContactBatch::new();
        batch.count = 2;
        batch.scores[0] = 10.0;
        batch.scores[1] = 20.0;

        let top = batch.top_k(100);
        assert_eq!(top.len(), 2);
        assert_eq!(top[0], 1);
        assert_eq!(top[1], 0);
    }

    #[test]
    fn test_custom_weights() {
        let mut batch = ContactBatch::new();
        batch.count = 1;
        batch.industry_match[0] = 1;
        batch.recency_days[0] = 1;

        // Only industry matters
        let icp = IcpProfile {
            industry_weight: 100.0,
            employee_weight: 0.0,
            seniority_weight: 0.0,
            department_weight: 0.0,
            tech_weight: 0.0,
            email_weight: 0.0,
        };

        batch.compute_scores_with(&icp);
        assert!(batch.scores[0] > 95.0); // 100% ICP fit * 0.85 + 15 recency
    }

    #[test]
    fn test_json_output() {
        let mut batch = ContactBatch::new();
        batch.count = 2;
        batch.scores[0] = 50.0;
        batch.scores[1] = 90.0;

        let json = batch.top_k_json(2);
        assert!(json.contains("90.00"));
        assert!(json.contains("50.00"));
        assert!(json.starts_with('['));
        assert!(json.ends_with(']'));
    }

    #[test]
    fn test_recency_bonus() {
        let mut batch = ContactBatch::new();
        batch.count = 6;

        // All same ICP fit, vary only recency
        for i in 0..6 {
            batch.industry_match[i] = 1;
            batch.seniority_match[i] = 1;
        }

        batch.recency_days[0] = 1;   // 15 bonus
        batch.recency_days[1] = 10;  // 12 bonus
        batch.recency_days[2] = 20;  // 9 bonus
        batch.recency_days[3] = 60;  // 5 bonus
        batch.recency_days[4] = 120; // 2 bonus
        batch.recency_days[5] = 365; // 0 bonus

        batch.compute_scores();

        for i in 0..5 {
            assert!(
                batch.scores[i] > batch.scores[i + 1],
                "score[{}]={} should > score[{}]={}",
                i, batch.scores[i], i + 1, batch.scores[i + 1]
            );
        }
    }
}
