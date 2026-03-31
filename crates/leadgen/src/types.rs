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
