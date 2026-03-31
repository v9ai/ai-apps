/// SHAP-lite feature importance for lead scoring explanations.
///
/// Uses leave-one-out (LOO) importance: for each ICP dimension, we re-score
/// the lead with that dimension disabled and attribute `score - loo_score` as
/// the feature's contribution.  This is a practical approximation of Shapley
/// values for additive scoring functions, and is exact for linear models.
///
/// References:
/// - Lundberg & Lee (2017) "A Unified Approach to Interpreting Model Predictions"
/// - Strumbelj & Kononenko (2014) — Shapley explanation for linear models
use serde::{Deserialize, Serialize};

use crate::scoring::{score_lead, IcpProfile};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/// Per-feature contribution to the final composite lead score.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureImportance {
    /// Dimension name (e.g. `"industry_fit"`, `"seniority_match"`).
    pub feature_name: String,
    /// Score delta caused by this feature.
    /// Positive = increases the score; negative = decreases it.
    pub contribution: f64,
    /// The actual value observed for this feature (stringified for display).
    pub value: String,
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Explain a lead score by computing the per-feature contribution of each ICP
/// dimension via leave-one-out re-scoring.
///
/// The returned `Vec<FeatureImportance>` is sorted by absolute contribution
/// (most influential feature first).
pub fn explain_score(
    contact: &crate::Contact,
    company: &crate::Company,
    icp: &IcpProfile,
    score: &crate::LeadScore,
) -> Vec<FeatureImportance> {
    let baseline = score.composite_score;
    let mut importances: Vec<FeatureImportance> = Vec::new();

    // Helper: re-score with a modified ICP and return composite delta.
    let delta = |modified_icp: IcpProfile| -> f64 {
        let loo_score = score_lead(contact, company, &modified_icp, 0.0);
        baseline - loo_score.composite_score
    };

    // --- 1. Industry fit ---------------------------------------------------
    {
        let value = company.industry.clone().unwrap_or_else(|| "unknown".into());
        let modified = IcpProfile {
            target_industries: vec![],
            ..icp.clone()
        };
        importances.push(FeatureImportance {
            feature_name: "industry_fit".into(),
            contribution: delta(modified),
            value,
        });
    }

    // --- 2. Company size fit -----------------------------------------------
    {
        let value = company
            .employee_count
            .map(|n| n.to_string())
            .unwrap_or_else(|| "unknown".into());
        let modified = IcpProfile {
            min_employees: None,
            max_employees: None,
            ..icp.clone()
        };
        importances.push(FeatureImportance {
            feature_name: "company_size_fit".into(),
            contribution: delta(modified),
            value,
        });
    }

    // --- 3. Seniority match -----------------------------------------------
    {
        let value = contact
            .seniority
            .clone()
            .unwrap_or_else(|| "unknown".into());
        let modified = IcpProfile {
            target_seniorities: vec![],
            ..icp.clone()
        };
        importances.push(FeatureImportance {
            feature_name: "seniority_match".into(),
            contribution: delta(modified),
            value,
        });
    }

    // --- 4. Department match -----------------------------------------------
    {
        let value = contact
            .department
            .clone()
            .unwrap_or_else(|| "unknown".into());
        let modified = IcpProfile {
            target_departments: vec![],
            ..icp.clone()
        };
        importances.push(FeatureImportance {
            feature_name: "department_match".into(),
            contribution: delta(modified),
            value,
        });
    }

    // --- 5. Tech stack overlap --------------------------------------------
    {
        let value = company
            .tech_stack
            .as_deref()
            .unwrap_or("[]")
            .to_string();
        let modified = IcpProfile {
            target_tech_stack: vec![],
            ..icp.clone()
        };
        importances.push(FeatureImportance {
            feature_name: "tech_stack_overlap".into(),
            contribution: delta(modified),
            value,
        });
    }

    // --- 6. Email quality -------------------------------------------------
    {
        let value = contact
            .email_status
            .clone()
            .unwrap_or_else(|| "unknown".into());
        // Email quality is encoded in the contact, not the ICP.  We simulate
        // its removal by creating a synthetic contact with a blank email status
        // and scoring it directly, then computing the delta against baseline.
        let contact_no_email = crate::Contact {
            email_status: None,
            ..contact.clone()
        };
        let loo = score_lead(&contact_no_email, company, icp);
        importances.push(FeatureImportance {
            feature_name: "email_quality".into(),
            contribution: baseline - loo.composite_score,
            value,
        });
    }

    // --- 7. Recency -------------------------------------------------------
    {
        let value = company
            .updated_at
            .clone()
            .unwrap_or_else(|| "unknown".into());
        // Recency lives in the 15 % recency_score component.  We estimate its
        // contribution as `baseline - (baseline recomputed with icp_fit only)`.
        // Since score_lead already returns icp_fit_score separately, we can
        // derive the recency contribution analytically without a second call.
        let recency_contribution = score.recency_score * 0.15;
        importances.push(FeatureImportance {
            feature_name: "recency".into(),
            contribution: recency_contribution,
            value,
        });
    }

    // Sort by absolute contribution descending (most influential first).
    importances.sort_by(|a, b| {
        b.contribution
            .abs()
            .partial_cmp(&a.contribution.abs())
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    importances
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scoring::IcpProfile;

    fn make_icp() -> IcpProfile {
        IcpProfile {
            target_industries: vec!["SaaS".into()],
            min_employees: Some(10),
            max_employees: Some(500),
            target_seniorities: vec!["VP".into()],
            target_departments: vec!["Engineering".into()],
            target_tech_stack: vec!["Rust".into(), "Python".into()],
            target_locations: vec![],
            funding_stages: vec![],
        }
    }

    fn make_contact(seniority: &str, department: &str) -> crate::Contact {
        crate::Contact {
            id: "c1".into(),
            company_id: Some("co1".into()),
            first_name: "Ada".into(),
            last_name: "Lovelace".into(),
            title: Some(format!("{seniority} of {department}")),
            seniority: Some(seniority.into()),
            department: Some(department.into()),
            email: Some("ada@example.com".into()),
            email_status: Some("verified".into()),
            linkedin_url: None,
            phone: None,
            source: None,
            created_at: None,
        }
    }

    fn make_company(industry: &str, employees: i32) -> crate::Company {
        crate::Company {
            id: "co1".into(),
            name: "Acme".into(),
            domain: Some("acme.io".into()),
            industry: Some(industry.into()),
            employee_count: Some(employees),
            funding_stage: Some("Series B".into()),
            tech_stack: Some(r#"["Rust","Python","Go"]"#.into()),
            location: Some("Berlin".into()),
            description: None,
            source: None,
            created_at: None,
            updated_at: Some("2026-03-01 00:00:00".into()),
        }
    }

    /// For a perfectly matching lead all contributions should be non-negative.
    #[test]
    fn test_perfect_lead_all_contributions_non_negative() {
        let icp = make_icp();
        let contact = make_contact("VP", "Engineering");
        let company = make_company("SaaS", 150);
        let score = score_lead(&contact, &company, &icp);

        let importances = explain_score(&contact, &company, &icp, &score);

        for imp in &importances {
            assert!(
                imp.contribution >= -f64::EPSILON,
                "feature '{}' should not have negative contribution for a perfect lead, got {:.4}",
                imp.feature_name,
                imp.contribution
            );
        }
    }

    /// The total number of features returned should equal the number of ICP
    /// dimensions we track (7 in the current implementation).
    #[test]
    fn test_returns_expected_number_of_features() {
        let icp = make_icp();
        let contact = make_contact("VP", "Engineering");
        let company = make_company("SaaS", 150);
        let score = score_lead(&contact, &company, &icp);

        let importances = explain_score(&contact, &company, &icp, &score);
        assert_eq!(
            importances.len(),
            7,
            "expected exactly 7 feature importances"
        );
    }

    /// Results should be sorted by |contribution| descending.
    #[test]
    fn test_sorted_by_absolute_contribution_descending() {
        let icp = make_icp();
        let contact = make_contact("VP", "Engineering");
        let company = make_company("SaaS", 150);
        let score = score_lead(&contact, &company, &icp);

        let importances = explain_score(&contact, &company, &icp, &score);

        for window in importances.windows(2) {
            assert!(
                window[0].contribution.abs() >= window[1].contribution.abs(),
                "importances must be sorted descending by |contribution|: {:?} vs {:?}",
                window[0],
                window[1]
            );
        }
    }

    /// Mismatched seniority should yield zero (or close to zero) seniority contribution.
    #[test]
    fn test_mismatched_seniority_has_low_contribution() {
        let icp = make_icp(); // targets VP
        let contact = make_contact("Individual Contributor", "Engineering");
        let company = make_company("SaaS", 150);
        let score = score_lead(&contact, &company, &icp);

        let importances = explain_score(&contact, &company, &icp, &score);
        let seniority_imp = importances
            .iter()
            .find(|i| i.feature_name == "seniority_match")
            .expect("seniority_match should always be present");

        // When seniority does not match, removing it from ICP does not change
        // the score (it was already zero), so contribution should be ~0.
        assert!(
            seniority_imp.contribution.abs() < 1.0,
            "mismatched seniority should have near-zero contribution, got {:.4}",
            seniority_imp.contribution
        );
    }

    /// Industry mismatch should yield zero industry contribution.
    #[test]
    fn test_mismatched_industry_has_zero_contribution() {
        let icp = make_icp(); // targets SaaS
        let contact = make_contact("VP", "Engineering");
        let company = make_company("Manufacturing", 150);
        let score = score_lead(&contact, &company, &icp);

        let importances = explain_score(&contact, &company, &icp, &score);
        let industry_imp = importances
            .iter()
            .find(|i| i.feature_name == "industry_fit")
            .expect("industry_fit should always be present");

        assert!(
            industry_imp.contribution.abs() < 1.0,
            "industry mismatch should give ~0 contribution, got {:.4}",
            industry_imp.contribution
        );
    }

    /// Feature values should reflect the actual data in the contact/company.
    #[test]
    fn test_feature_values_match_input_data() {
        let icp = make_icp();
        let contact = make_contact("VP", "Engineering");
        let company = make_company("SaaS", 150);
        let score = score_lead(&contact, &company, &icp);

        let importances = explain_score(&contact, &company, &icp, &score);

        let seniority = importances
            .iter()
            .find(|i| i.feature_name == "seniority_match")
            .unwrap();
        assert_eq!(seniority.value, "VP");

        let industry = importances
            .iter()
            .find(|i| i.feature_name == "industry_fit")
            .unwrap();
        assert_eq!(industry.value, "SaaS");

        let size = importances
            .iter()
            .find(|i| i.feature_name == "company_size_fit")
            .unwrap();
        assert_eq!(size.value, "150");
    }
}
