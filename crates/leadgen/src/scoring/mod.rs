pub mod authority;
pub mod online_learner;

pub use authority::{classify_contact, ContactClassification};
pub use online_learner::OnlineLearner;

// Inlined from the formerly-separate lead-gen icp crate (now ported to
// Python at backend/leadgen_agent/icp_scoring.py). Kept here so this
// monorepo-root crate continues to build standalone.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct IcpProfile {
    pub target_industries: Vec<String>,
    pub min_employees: Option<i32>,
    pub max_employees: Option<i32>,
    pub target_seniorities: Vec<String>,
    pub target_departments: Vec<String>,
    pub target_tech_stack: Vec<String>,
    pub target_locations: Vec<String>,
    pub funding_stages: Vec<String>,
    #[serde(default)]
    pub topics: Vec<String>,
    #[serde(default)]
    pub min_stars: Option<u32>,
    #[serde(default)]
    pub min_repos: Option<u32>,
    #[serde(default)]
    pub required_languages: Vec<String>,
    #[serde(default)]
    pub active_within_days: Option<u32>,
}

impl Default for IcpProfile {
    fn default() -> Self {
        Self {
            target_industries: vec!["ai".into(), "ml".into(), "saas".into(), "infrastructure".into()],
            min_employees: Some(20),
            max_employees: Some(500),
            target_seniorities: vec!["vp".into(), "director".into(), "head".into(), "chief".into(), "cto".into(), "ceo".into()],
            target_departments: vec!["engineering".into(), "ai".into(), "ml".into(), "data".into(), "platform".into()],
            target_tech_stack: vec!["rust".into(), "python".into(), "kubernetes".into(), "pytorch".into(), "tensorflow".into()],
            target_locations: vec![],
            funding_stages: vec![],
            topics: vec![],
            min_stars: None,
            min_repos: None,
            required_languages: vec![],
            active_within_days: None,
        }
    }
}

const RECENCY_HALF_LIFE_DAYS: f64 = 28.0;
const RECENCY_K: f64 = std::f64::consts::LN_2 / RECENCY_HALF_LIFE_DAYS;

/// Score tech stack overlap using Jaccard similarity: |intersection| / |union|.
/// Both sets are normalised to lowercase before comparison.
fn jaccard_tech_stack(company_stack: &[String], icp_stack: &[String]) -> f64 {
    if icp_stack.is_empty() || company_stack.is_empty() {
        return 0.0;
    }

    let icp_set: std::collections::HashSet<String> =
        icp_stack.iter().map(|s| s.to_lowercase()).collect();
    let co_set: std::collections::HashSet<String> =
        company_stack.iter().map(|s| s.to_lowercase()).collect();

    let intersection = icp_set.intersection(&co_set).count();
    let union = icp_set.union(&co_set).count();

    if union == 0 { 0.0 } else { intersection as f64 / union as f64 }
}

/// Score funding stage fit. Returns 0.0–15.0.
/// High-value stages (Seed / Series A-C): companies with active investment cycles.
/// Low-value stages: Bootstrapped, Acquired, Unknown.
pub fn score_funding_stage(company: &crate::Company, icp: &IcpProfile) -> f64 {
    // If ICP has no filter, skip contribution entirely (return 0 with no max).
    if icp.funding_stages.is_empty() {
        return 0.0;
    }

    let stage = match company.funding_stage.as_deref() {
        Some(s) => s.to_lowercase(),
        None => return 0.0,
    };

    // Exact match against ICP filter list → full score.
    if icp.funding_stages.iter().any(|f| f.to_lowercase() == stage) {
        return 15.0;
    }

    // Partial credit by tier regardless of ICP list:
    // This path is reached when the stage is known but not in the ICP list → 0 pts.
    0.0
}

/// Score location fit. Returns 0.0–10.0.
/// "remote" in company.location is always a full-score pass-through.
/// Empty `icp.target_locations` → no contribution (returns 0.0).
pub fn score_location(company: &crate::Company, icp: &IcpProfile) -> f64 {
    if icp.target_locations.is_empty() {
        return 0.0;
    }

    let loc = match company.location.as_deref() {
        Some(l) => l.to_lowercase(),
        None => return 0.0,
    };

    // "remote" in company location → always passes.
    if loc.contains("remote") {
        return 10.0;
    }

    // Match against any target location substring (case-insensitive).
    if icp.target_locations.iter().any(|t| loc.contains(&t.to_lowercase())) {
        10.0
    } else {
        0.0
    }
}

/// Exponential recency decay: score = 100 * exp(-k * days).
/// Uses `RECENCY_HALF_LIFE_DAYS = 28.0` (k ≈ 0.02475).
fn recency_score(company: &crate::Company) -> f64 {
    let days = company.updated_at.as_deref()
        .and_then(|s| chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S").ok())
        .map(|dt| (chrono::Utc::now() - dt.and_utc()).num_days())
        .unwrap_or(365) as f64;

    100.0 * (-RECENCY_K * days).exp()
}

/// Score a single contact+company pair against an ICP.
///
/// `intent_boost` (0.0–100.0) is an external intent signal (e.g. page-visit score).
/// Pass `0.0` for backward-compatible behaviour — when it is 0 the formula reduces to
/// `fit * 0.85 + recency * 0.15`, identical to the previous implementation.
pub fn score_lead(
    contact: &crate::Contact,
    company: &crate::Company,
    icp: &IcpProfile,
    intent_boost: f64,
) -> crate::LeadScore {
    let mut pts = 0.0f64;
    let mut max = 0.0f64;

    // Industry (25 pts)
    max += 25.0;
    if let Some(ref ind) = company.industry {
        if icp.target_industries.iter().any(|t| ind.to_lowercase().contains(&t.to_lowercase())) {
            pts += 25.0;
        }
    }

    // Employee count (15 pts, partial credit for one-sided match)
    max += 15.0;
    if let Some(count) = company.employee_count {
        let ok_min = icp.min_employees.map_or(true, |m| count >= m);
        let ok_max = icp.max_employees.map_or(true, |m| count <= m);
        if ok_min && ok_max { pts += 15.0; } else if ok_min || ok_max { pts += 7.0; }
    }

    // Seniority (25 pts)
    max += 25.0;
    if let Some(ref s) = contact.seniority {
        if icp.target_seniorities.iter().any(|t| t == s) { pts += 25.0; }
    }

    // Department (15 pts)
    max += 15.0;
    if let Some(ref d) = contact.department {
        if icp.target_departments.iter().any(|t| d.to_lowercase().contains(&t.to_lowercase())) {
            pts += 15.0;
        }
    }

    // Tech stack — Jaccard similarity (10 pts)
    if !icp.target_tech_stack.is_empty() {
        max += 10.0;
        if let Some(ref stack_json) = company.tech_stack {
            if let Ok(stack) = serde_json::from_str::<Vec<String>>(stack_json) {
                let jaccard = jaccard_tech_stack(&stack, &icp.target_tech_stack);
                pts += 10.0 * jaccard;
            }
        }
    }

    // Email status (5 pts)
    max += 5.0;
    match contact.email_status.as_deref() {
        Some("verified") => pts += 5.0,
        Some("catch-all") => pts += 2.0,
        _ => {}
    }

    // Funding stage (15 pts, only when ICP filter is set)
    if !icp.funding_stages.is_empty() {
        max += 15.0;
        pts += score_funding_stage(company, icp);
    }

    // Location (10 pts, only when ICP filter is set)
    if !icp.target_locations.is_empty() {
        max += 10.0;
        pts += score_location(company, icp);
    }

    let fit = if max > 0.0 { (pts / max) * 100.0 } else { 0.0 };
    let recency = recency_score(company);

    // Composite: when intent_boost == 0 this reduces to fit*0.85 + recency*0.15
    let intent_norm = intent_boost.clamp(0.0, 100.0);
    let composite = fit * 0.70 + recency * 0.15 + intent_norm * 0.15;

    crate::LeadScore {
        contact_id: contact.id.clone(),
        icp_fit_score: fit,
        intent_score: intent_norm,
        recency_score: recency,
        composite_score: composite,
    }
}

/// Score all contacts for a company. Passes `intent_boost = 0.0` for backward compat.
pub fn score_company_contacts(
    contacts: &[crate::Contact],
    company: &crate::Company,
    icp: &IcpProfile,
) -> Vec<crate::LeadScore> {
    contacts.iter().map(|c| score_lead(c, company, icp, 0.0)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── helpers ──────────────────────────────────────────────────────────────

    fn make_company(
        funding_stage: Option<&str>,
        location: Option<&str>,
        tech_stack: Option<&str>,
        updated_at: Option<&str>,
    ) -> crate::Company {
        crate::Company {
            id: "co1".into(),
            name: "TestCo".into(),
            domain: None,
            industry: None,
            employee_count: None,
            funding_stage: funding_stage.map(str::to_owned),
            tech_stack: tech_stack.map(str::to_owned),
            location: location.map(str::to_owned),
            description: None,
            source: None,
            created_at: None,
            updated_at: updated_at.map(str::to_owned),
        }
    }

    // ── funding stage ────────────────────────────────────────────────────────

    #[test]
    fn funding_stage_high_value_match() {
        let icp = IcpProfile { funding_stages: vec!["Series A".into(), "Series B".into()], ..Default::default() };
        let co = make_company(Some("Series A"), None, None, None);
        assert_eq!(score_funding_stage(&co, &icp), 15.0);
    }

    #[test]
    fn funding_stage_low_value_no_match() {
        let icp = IcpProfile { funding_stages: vec!["Series A".into()], ..Default::default() };
        let co = make_company(Some("Bootstrapped"), None, None, None);
        assert_eq!(score_funding_stage(&co, &icp), 0.0);
    }

    #[test]
    fn funding_stage_empty_filter_skipped() {
        let icp = IcpProfile::default(); // funding_stages: vec![]
        let co = make_company(Some("Series B"), None, None, None);
        assert_eq!(score_funding_stage(&co, &icp), 0.0);
    }

    // ── Jaccard tech stack ───────────────────────────────────────────────────

    #[test]
    fn jaccard_full_overlap() {
        let company_stack = vec!["Rust".into(), "PostgreSQL".into()];
        let icp_stack = vec!["rust".into(), "postgresql".into()];
        let score = jaccard_tech_stack(&company_stack, &icp_stack);
        assert!((score - 1.0).abs() < 1e-9, "expected 1.0, got {score}");
    }

    #[test]
    fn jaccard_partial_overlap() {
        // intersection = {rust}, union = {rust, go, python} → 1/3
        let company_stack = vec!["Rust".into(), "Go".into()];
        let icp_stack = vec!["rust".into(), "python".into()];
        let score = jaccard_tech_stack(&company_stack, &icp_stack);
        let expected = 1.0 / 3.0;
        assert!((score - expected).abs() < 1e-9, "expected {expected}, got {score}");
    }

    #[test]
    fn jaccard_no_overlap() {
        let company_stack = vec!["Go".into()];
        let icp_stack = vec!["Rust".into()];
        let score = jaccard_tech_stack(&company_stack, &icp_stack);
        assert_eq!(score, 0.0);
    }

    #[test]
    fn jaccard_empty_icp() {
        let company_stack = vec!["Rust".into()];
        let icp_stack: Vec<String> = vec![];
        assert_eq!(jaccard_tech_stack(&company_stack, &icp_stack), 0.0);
    }

    // ── exponential recency ──────────────────────────────────────────────────

    fn recency_at_days(days: i64) -> f64 {
        // Build a fake updated_at that is `days` days in the past.
        let dt = chrono::Utc::now() - chrono::Duration::days(days);
        let s = dt.format("%Y-%m-%d %H:%M:%S").to_string();
        let co = make_company(None, None, None, Some(&s));
        recency_score(&co)
    }

    #[test]
    fn recency_at_zero_days() {
        let score = recency_at_days(0);
        // exp(0) = 1 → 100.0
        assert!((score - 100.0).abs() < 1.0, "expected ~100, got {score}");
    }

    #[test]
    fn recency_at_half_life() {
        let score = recency_at_days(RECENCY_HALF_LIFE_DAYS as i64);
        // exp(-ln2) = 0.5 → ~50.0
        assert!((score - 50.0).abs() < 2.0, "expected ~50, got {score}");
    }

    #[test]
    fn recency_at_90_days() {
        let score = recency_at_days(90);
        // 100 * exp(-0.02475 * 90) ≈ 10.9
        assert!(score > 5.0 && score < 20.0, "expected 5–20, got {score}");
    }

    #[test]
    fn recency_monotone_decreasing() {
        let s0 = recency_at_days(0);
        let s28 = recency_at_days(28);
        let s90 = recency_at_days(90);
        assert!(s0 > s28 && s28 > s90, "recency should decrease: {s0} > {s28} > {s90}");
    }

    // ── location ─────────────────────────────────────────────────────────────

    #[test]
    fn location_exact_match() {
        let icp = IcpProfile { target_locations: vec!["Berlin".into()], ..Default::default() };
        let co = make_company(None, Some("Berlin, Germany"), None, None);
        assert_eq!(score_location(&co, &icp), 10.0);
    }

    #[test]
    fn location_no_match() {
        let icp = IcpProfile { target_locations: vec!["Berlin".into()], ..Default::default() };
        let co = make_company(None, Some("São Paulo, Brazil"), None, None);
        assert_eq!(score_location(&co, &icp), 0.0);
    }

    #[test]
    fn location_remote_bypass() {
        let icp = IcpProfile { target_locations: vec!["Berlin".into()], ..Default::default() };
        // Company says "Remote" — should pass regardless of target list.
        let co = make_company(None, Some("Remote / Worldwide"), None, None);
        assert_eq!(score_location(&co, &icp), 10.0);
    }

    #[test]
    fn location_empty_icp_no_contribution() {
        let icp = IcpProfile::default(); // target_locations: vec![]
        let co = make_company(None, Some("New York"), None, None);
        assert_eq!(score_location(&co, &icp), 0.0);
    }
}
