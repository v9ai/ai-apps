use serde::{Deserialize, Serialize};

// ─── FundingStage ─────────────────────────────────────────────────────────────

/// Structured representation of a company's funding stage, separate from the
/// raw DB string stored in `Company::funding_stage`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum FundingStage {
    PreSeed,
    Seed,
    SeriesA,
    SeriesB,
    SeriesC,
    SeriesD,
    SeriesE,
    Growth,
    IPO,
    Bootstrapped,
    Acquired,
    Unknown,
}

impl FundingStage {
    /// Parse a funding stage from a string.  Case-insensitive; handles common
    /// abbreviations and variants ("series a", "Series A", "seriesA", etc.).
    pub fn from_str(s: &str) -> Self {
        let s = s.trim().to_ascii_lowercase();
        let s = s.as_str();
        match s {
            "pre-seed" | "preseed" | "pre_seed" | "pre seed" => FundingStage::PreSeed,
            "seed" => FundingStage::Seed,
            "series a" | "seriesa" | "series_a" | "series-a" => FundingStage::SeriesA,
            "series b" | "seriesb" | "series_b" | "series-b" => FundingStage::SeriesB,
            "series c" | "seriesc" | "series_c" | "series-c" => FundingStage::SeriesC,
            "series d" | "seriesd" | "series_d" | "series-d" => FundingStage::SeriesD,
            "series e" | "seriese" | "series_e" | "series-e" => FundingStage::SeriesE,
            "growth" | "growth stage" | "growth equity" => FundingStage::Growth,
            "ipo" | "public" | "listed" => FundingStage::IPO,
            "bootstrapped" | "self-funded" | "self funded" | "profitable" => {
                FundingStage::Bootstrapped
            }
            "acquired" | "acquisition" | "merged" => FundingStage::Acquired,
            _ => FundingStage::Unknown,
        }
    }

    /// Returns `true` for stages where external capital is actively flowing
    /// (PreSeed through Growth) or the company has gone public (IPO).
    pub fn is_actively_funded(&self) -> bool {
        matches!(
            self,
            FundingStage::PreSeed
                | FundingStage::Seed
                | FundingStage::SeriesA
                | FundingStage::SeriesB
                | FundingStage::SeriesC
                | FundingStage::SeriesD
                | FundingStage::SeriesE
                | FundingStage::Growth
                | FundingStage::IPO
        )
    }

    /// A 0–1 growth-potential score for the stage.
    ///
    /// Bootstrapped is 0.5 (cash-flow positive but no external capital).
    /// Unknown is 0.0.  Acquired is 0.3 (momentum uncertain post-acquisition).
    pub fn growth_score(&self) -> f64 {
        match self {
            FundingStage::Unknown => 0.0,
            FundingStage::Acquired => 0.3,
            FundingStage::Bootstrapped => 0.5,
            FundingStage::PreSeed => 0.6,
            FundingStage::Seed => 0.7,
            FundingStage::SeriesA => 0.8,
            FundingStage::SeriesB => 0.85,
            FundingStage::SeriesC => 0.9,
            FundingStage::SeriesD => 0.9,
            FundingStage::SeriesE => 0.9,
            FundingStage::Growth => 0.95,
            FundingStage::IPO => 1.0,
        }
    }
}

// ─── CompanyTier ──────────────────────────────────────────────────────────────

/// Qualitative tier derived from a company's composite enrichment score.
///
/// Thresholds:
///   - `Priority` : composite >= 80
///   - `Hot`      : composite 60–79
///   - `Warm`     : composite 30–59
///   - `Cold`     : composite < 30
///   - `Unknown`  : not yet scored (default)
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, PartialOrd, Ord)]
pub enum CompanyTier {
    #[default]
    Unknown,
    Cold,
    Warm,
    Hot,
    Priority,
}

impl CompanyTier {
    /// Derive a `CompanyTier` from a composite 0–100 score.
    pub fn from_score(score: f64) -> Self {
        if score >= 80.0 {
            CompanyTier::Priority
        } else if score >= 60.0 {
            CompanyTier::Hot
        } else if score >= 30.0 {
            CompanyTier::Warm
        } else {
            CompanyTier::Cold
        }
    }
}

// ─── CompanyEnrichmentScore ───────────────────────────────────────────────────

/// Computed enrichment quality and ICP-fit scores for a company.
///
/// Intentionally **not** embedded in `Company` to avoid a DB migration.
/// Stored and queried separately (e.g. in LanceDB or a side table).
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CompanyEnrichmentScore {
    pub company_id: String,
    /// ICP fit: 0–100 (how well the company matches the ideal customer profile).
    pub icp_fit_score: f64,
    /// Buying-intent signal: 0–100.
    pub intent_score: f64,
    /// Fraction of optional fields populated: 0–100.
    pub data_completeness: f64,
    /// Weighted combination of the three component scores.
    pub composite_score: f64,
    /// Qualitative tier derived from `composite_score`.
    pub tier: CompanyTier,
    /// ISO-8601 timestamp of when this score was calculated, if known.
    pub scored_at: Option<String>,
}

impl CompanyEnrichmentScore {
    /// Compute `data_completeness` for a `Company`.
    ///
    /// Checks 8 optional fields: `domain`, `industry`, `employee_count`,
    /// `funding_stage`, `tech_stack`, `location`, `description`, `source`.
    /// Returns `populated_count / 8 * 100.0`.
    pub fn data_completeness(company: &Company) -> f64 {
        let populated = [
            company.domain.is_some(),
            company.industry.is_some(),
            company.employee_count.is_some(),
            company.funding_stage.is_some(),
            company.tech_stack.is_some(),
            company.location.is_some(),
            company.description.is_some(),
            company.source.is_some(),
        ]
        .iter()
        .filter(|&&v| v)
        .count();

        populated as f64 / 8.0 * 100.0
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Company {
    pub id: String,
    pub name: String,
    pub domain: Option<String>,
    pub industry: Option<String>,
    pub employee_count: Option<i32>,
    pub funding_stage: Option<String>,
    pub tech_stack: Option<String>,
    pub location: Option<String>,
    pub description: Option<String>,
    pub source: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Contact {
    pub id: String,
    pub company_id: Option<String>,
    pub first_name: String,
    pub last_name: String,
    pub title: Option<String>,
    pub seniority: Option<String>,
    pub department: Option<String>,
    pub email: Option<String>,
    pub email_status: Option<String>,
    pub linkedin_url: Option<String>,
    pub phone: Option<String>,
    pub source: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeadScore {
    pub contact_id: String,
    pub icp_fit_score: f64,
    pub intent_score: f64,
    pub recency_score: f64,
    pub composite_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ScoredLead {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub title: String,
    pub email: String,
    pub email_status: String,
    pub company_name: String,
    pub domain: String,
    pub industry: String,
    pub icp_fit_score: f64,
    pub composite_score: f64,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── CompanyTier::from_score — boundary tests ──────────────────────────────

    #[test]
    fn test_tier_cold_below_30() {
        assert_eq!(CompanyTier::from_score(0.0), CompanyTier::Cold);
        assert_eq!(CompanyTier::from_score(29.9), CompanyTier::Cold);
    }

    #[test]
    fn test_tier_warm_30_to_59() {
        assert_eq!(CompanyTier::from_score(30.0), CompanyTier::Warm);
        assert_eq!(CompanyTier::from_score(45.0), CompanyTier::Warm);
        assert_eq!(CompanyTier::from_score(59.9), CompanyTier::Warm);
    }

    #[test]
    fn test_tier_hot_60_to_79() {
        assert_eq!(CompanyTier::from_score(60.0), CompanyTier::Hot);
        assert_eq!(CompanyTier::from_score(70.0), CompanyTier::Hot);
        assert_eq!(CompanyTier::from_score(79.9), CompanyTier::Hot);
    }

    #[test]
    fn test_tier_priority_80_and_above() {
        assert_eq!(CompanyTier::from_score(80.0), CompanyTier::Priority);
        assert_eq!(CompanyTier::from_score(100.0), CompanyTier::Priority);
    }

    #[test]
    fn test_tier_ordering() {
        // Unknown is lowest because it has the lowest discriminant in the Ord
        // derive order: Unknown < Cold < Warm < Hot < Priority.
        assert!(CompanyTier::Unknown < CompanyTier::Cold);
        assert!(CompanyTier::Cold < CompanyTier::Warm);
        assert!(CompanyTier::Warm < CompanyTier::Hot);
        assert!(CompanyTier::Hot < CompanyTier::Priority);
    }

    // ── FundingStage::from_str — all variants ─────────────────────────────────

    #[test]
    fn test_funding_stage_from_str_all_variants() {
        assert_eq!(FundingStage::from_str("pre-seed"), FundingStage::PreSeed);
        assert_eq!(FundingStage::from_str("PreSeed"), FundingStage::PreSeed);
        assert_eq!(FundingStage::from_str("pre seed"), FundingStage::PreSeed);
        assert_eq!(FundingStage::from_str("seed"), FundingStage::Seed);
        assert_eq!(FundingStage::from_str("Series A"), FundingStage::SeriesA);
        assert_eq!(FundingStage::from_str("series-a"), FundingStage::SeriesA);
        assert_eq!(FundingStage::from_str("Series B"), FundingStage::SeriesB);
        assert_eq!(FundingStage::from_str("SERIES_C"), FundingStage::SeriesC);
        assert_eq!(FundingStage::from_str("series d"), FundingStage::SeriesD);
        assert_eq!(FundingStage::from_str("Series E"), FundingStage::SeriesE);
        assert_eq!(FundingStage::from_str("growth"), FundingStage::Growth);
        assert_eq!(FundingStage::from_str("Growth Stage"), FundingStage::Growth);
        assert_eq!(FundingStage::from_str("ipo"), FundingStage::IPO);
        assert_eq!(FundingStage::from_str("public"), FundingStage::IPO);
        assert_eq!(FundingStage::from_str("bootstrapped"), FundingStage::Bootstrapped);
        assert_eq!(FundingStage::from_str("self-funded"), FundingStage::Bootstrapped);
        assert_eq!(FundingStage::from_str("acquired"), FundingStage::Acquired);
        assert_eq!(FundingStage::from_str("unknown_xyz"), FundingStage::Unknown);
        assert_eq!(FundingStage::from_str(""), FundingStage::Unknown);
    }

    #[test]
    fn test_funding_stage_is_actively_funded() {
        assert!(FundingStage::PreSeed.is_actively_funded());
        assert!(FundingStage::Seed.is_actively_funded());
        assert!(FundingStage::SeriesA.is_actively_funded());
        assert!(FundingStage::SeriesB.is_actively_funded());
        assert!(FundingStage::SeriesC.is_actively_funded());
        assert!(FundingStage::SeriesD.is_actively_funded());
        assert!(FundingStage::SeriesE.is_actively_funded());
        assert!(FundingStage::Growth.is_actively_funded());
        assert!(FundingStage::IPO.is_actively_funded());

        assert!(!FundingStage::Bootstrapped.is_actively_funded());
        assert!(!FundingStage::Acquired.is_actively_funded());
        assert!(!FundingStage::Unknown.is_actively_funded());
    }

    #[test]
    fn test_funding_stage_growth_score() {
        assert_eq!(FundingStage::Unknown.growth_score(), 0.0);
        assert_eq!(FundingStage::Acquired.growth_score(), 0.3);
        assert_eq!(FundingStage::Bootstrapped.growth_score(), 0.5);
        assert_eq!(FundingStage::PreSeed.growth_score(), 0.6);
        assert_eq!(FundingStage::Seed.growth_score(), 0.7);
        assert_eq!(FundingStage::SeriesA.growth_score(), 0.8);
        assert_eq!(FundingStage::SeriesB.growth_score(), 0.85);
        assert_eq!(FundingStage::SeriesC.growth_score(), 0.9);
        assert_eq!(FundingStage::Growth.growth_score(), 0.95);
        assert_eq!(FundingStage::IPO.growth_score(), 1.0);
    }

    // ── CompanyEnrichmentScore::data_completeness ─────────────────────────────

    fn bare_company() -> Company {
        Company {
            id: "c1".to_string(),
            name: "Acme".to_string(),
            domain: None,
            industry: None,
            employee_count: None,
            funding_stage: None,
            tech_stack: None,
            location: None,
            description: None,
            source: None,
            created_at: None,
            updated_at: None,
        }
    }

    #[test]
    fn test_data_completeness_zero_fields() {
        let c = bare_company();
        assert_eq!(CompanyEnrichmentScore::data_completeness(&c), 0.0);
    }

    #[test]
    fn test_data_completeness_all_fields() {
        let c = Company {
            domain: Some("acme.com".to_string()),
            industry: Some("SaaS".to_string()),
            employee_count: Some(100),
            funding_stage: Some("Series A".to_string()),
            tech_stack: Some("Rust".to_string()),
            location: Some("San Francisco".to_string()),
            description: Some("Leading SaaS company".to_string()),
            source: Some("web".to_string()),
            ..bare_company()
        };
        assert_eq!(CompanyEnrichmentScore::data_completeness(&c), 100.0);
    }

    #[test]
    fn test_data_completeness_partial_fields() {
        let c = Company {
            domain: Some("acme.com".to_string()),
            industry: Some("SaaS".to_string()),
            employee_count: Some(50),
            funding_stage: Some("Seed".to_string()),
            ..bare_company()
        };
        // 4 out of 8 = 50.0
        assert_eq!(CompanyEnrichmentScore::data_completeness(&c), 50.0);
    }

    // ── CompanyEnrichmentScore construction ───────────────────────────────────

    #[test]
    fn test_enrichment_score_construction_and_tier() {
        let c = Company {
            domain: Some("widget.io".to_string()),
            industry: Some("AI".to_string()),
            employee_count: Some(250),
            funding_stage: Some("Series B".to_string()),
            tech_stack: Some("Rust,Python".to_string()),
            location: Some("Remote".to_string()),
            ..bare_company()
        };

        let completeness = CompanyEnrichmentScore::data_completeness(&c);
        // 6/8 = 75.0
        assert_eq!(completeness, 75.0);

        let composite = (50.0_f64 * 0.4) + (40.0_f64 * 0.3) + (completeness * 0.3);
        let score = CompanyEnrichmentScore {
            company_id: c.id.clone(),
            icp_fit_score: 50.0,
            intent_score: 40.0,
            data_completeness: completeness,
            composite_score: composite,
            tier: CompanyTier::from_score(composite),
            scored_at: Some("2026-03-31T00:00:00Z".to_string()),
        };

        assert_eq!(score.company_id, "c1");
        assert!(score.composite_score > 0.0);
        assert_ne!(score.tier, CompanyTier::Unknown);
    }

    #[test]
    fn test_enrichment_score_default() {
        let score = CompanyEnrichmentScore::default();
        assert_eq!(score.icp_fit_score, 0.0);
        assert_eq!(score.tier, CompanyTier::Unknown);
        assert!(score.scored_at.is_none());
    }
}
