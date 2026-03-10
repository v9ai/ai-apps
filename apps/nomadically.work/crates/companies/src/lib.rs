pub mod audit;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;

/// Raw company row from D1.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CompanyRow {
    pub id: i64,
    #[serde(default)]
    pub key: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub website: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub industry: Option<String>,
    #[serde(default)]
    pub tags: Option<String>,
    #[serde(default)]
    pub score: Option<f64>,
    #[serde(default)]
    pub score_reasons: Option<String>,
    #[serde(default)]
    pub ashby_enriched_at: Option<String>,
    #[serde(default)]
    pub deep_analysis: Option<String>,
    #[serde(default)]
    pub logo_url: Option<String>,
    #[serde(default)]
    pub linkedin_url: Option<String>,
}

/// Why a company is considered broken.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize)]
pub enum BrokenReason {
    HashKey,
    GarbageKey,
    EmptyName,
    NameMatchesKey,
    NoWebsite,
    JobBoardWebsite,
    NoJobs,
    CategoryUnknown,
    NeverEnriched,
}

impl fmt::Display for BrokenReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::HashKey => write!(f, "hash/UUID key"),
            Self::GarbageKey => write!(f, "garbage key (?error, %encoded)"),
            Self::EmptyName => write!(f, "empty name"),
            Self::NameMatchesKey => write!(f, "name matches key"),
            Self::NoWebsite => write!(f, "no website"),
            Self::JobBoardWebsite => write!(f, "website is job board URL"),
            Self::NoJobs => write!(f, "no jobs"),
            Self::CategoryUnknown => write!(f, "category UNKNOWN"),
            Self::NeverEnriched => write!(f, "never enriched"),
        }
    }
}

/// Audit result for a single company.
#[derive(Debug, Clone, Serialize)]
pub struct CompanyAuditResult {
    pub company_id: i64,
    pub company_key: String,
    pub company_name: String,
    pub is_broken: bool,
    pub reasons: Vec<BrokenReason>,
    pub broken_score: usize,
}

/// Summary statistics from an audit run.
#[derive(Debug, Default)]
pub struct AuditStats {
    pub total: usize,
    pub already_hidden: usize,
    pub audited: usize,
    pub broken: usize,
    pub healthy: usize,
    pub newly_hidden: usize,
    pub reason_counts: HashMap<BrokenReason, usize>,
}

impl fmt::Display for AuditStats {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "Companies audit summary:")?;
        writeln!(f, "  total:          {}", self.total)?;
        writeln!(f, "  already hidden: {}", self.already_hidden)?;
        writeln!(f, "  audited:        {}", self.audited)?;
        writeln!(f, "  broken:         {}", self.broken)?;
        writeln!(f, "  healthy:        {}", self.healthy)?;
        writeln!(f, "  newly hidden:   {}", self.newly_hidden)?;
        if !self.reason_counts.is_empty() {
            writeln!(f, "  reason breakdown:")?;
            let mut sorted: Vec<_> = self.reason_counts.iter().collect();
            sorted.sort_by(|a, b| b.1.cmp(a.1));
            for (reason, count) in sorted {
                writeln!(f, "    {reason}: {count}")?;
            }
        }
        Ok(())
    }
}
