use serde::{Deserialize, Serialize};
use std::fmt;

use super::error::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArxivPaper {
    pub arxiv_id: String,
    pub title: String,
    pub summary: String,
    pub authors: Vec<String>,
    pub published: String,
    pub updated: Option<String>,
    pub categories: Vec<String>,
    pub pdf_url: Option<String>,
    pub doi: Option<String>,
    pub comment: Option<String>,
    pub journal_ref: Option<String>,
    pub link_url: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ArxivSearchResponse {
    pub total_results: u64,
    pub start_index: u64,
    pub items_per_page: u64,
    pub papers: Vec<ArxivPaper>,
}

/// Sorting criteria for arXiv search results.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SortBy {
    Relevance,
    LastUpdatedDate,
    SubmittedDate,
}

impl fmt::Display for SortBy {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SortBy::Relevance => write!(f, "relevance"),
            SortBy::LastUpdatedDate => write!(f, "lastUpdatedDate"),
            SortBy::SubmittedDate => write!(f, "submittedDate"),
        }
    }
}

/// Sort order for arXiv search results.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SortOrder {
    Ascending,
    Descending,
}

impl fmt::Display for SortOrder {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SortOrder::Ascending => write!(f, "ascending"),
            SortOrder::Descending => write!(f, "descending"),
        }
    }
}

/// Well-known arXiv categories.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ArxivCategory {
    CsAI,
    CsCL,
    CsLG,
    CsCV,
    CsNE,
    CsIR,
    CsSE,
    CsRO,
    CsCR,
    CsDS,
    StatML,
    MathOC,
    QuantPhysics,
    EessSP,
}

impl ArxivCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            ArxivCategory::CsAI => "cs.AI",
            ArxivCategory::CsCL => "cs.CL",
            ArxivCategory::CsLG => "cs.LG",
            ArxivCategory::CsCV => "cs.CV",
            ArxivCategory::CsNE => "cs.NE",
            ArxivCategory::CsIR => "cs.IR",
            ArxivCategory::CsSE => "cs.SE",
            ArxivCategory::CsRO => "cs.RO",
            ArxivCategory::CsCR => "cs.CR",
            ArxivCategory::CsDS => "cs.DS",
            ArxivCategory::StatML => "stat.ML",
            ArxivCategory::MathOC => "math.OC",
            ArxivCategory::QuantPhysics => "quant-ph",
            ArxivCategory::EessSP => "eess.SP",
        }
    }
}

impl fmt::Display for ArxivCategory {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Date range filter for arXiv queries (YYYYMMDD format, mapped to
/// `submittedDate:[from+TO+to]` in the API).
#[derive(Debug, Clone)]
pub struct DateRange {
    pub from: String,
    pub to: String,
}

impl DateRange {
    /// Create a date range. Both `from` and `to` must be YYYYMMDD (or
    /// YYYYMMDDHHmm for hour-level precision). An asterisk `*` means open-ended.
    pub fn new(from: &str, to: &str) -> Result<Self, Error> {
        fn valid(s: &str) -> bool {
            s == "*" || (s.len() == 8 && s.chars().all(|c| c.is_ascii_digit()))
                || (s.len() == 12 && s.chars().all(|c| c.is_ascii_digit()))
        }
        if !valid(from) || !valid(to) {
            return Err(Error::InvalidDateRange(format!(
                "Dates must be YYYYMMDD, YYYYMMDDHHmm, or '*'; got from={from}, to={to}"
            )));
        }
        Ok(Self {
            from: from.to_string(),
            to: to.to_string(),
        })
    }

    /// Format for the arXiv query string: `submittedDate:[from+TO+to]`
    pub fn to_query_fragment(&self) -> String {
        format!("submittedDate:[{}+TO+{}]", self.from, self.to)
    }
}

/// Builder for constructing arXiv search queries with optional category, date
/// range, sort, and pagination parameters.
#[derive(Debug, Clone)]
pub struct SearchQuery {
    pub terms: Option<String>,
    pub categories: Vec<String>,
    pub date_range: Option<DateRange>,
    pub sort_by: SortBy,
    pub sort_order: SortOrder,
    pub start: u32,
    pub max_results: u32,
}

impl Default for SearchQuery {
    fn default() -> Self {
        Self {
            terms: None,
            categories: Vec::new(),
            date_range: None,
            sort_by: SortBy::Relevance,
            sort_order: SortOrder::Descending,
            start: 0,
            max_results: 10,
        }
    }
}

impl SearchQuery {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn terms(mut self, terms: &str) -> Self {
        self.terms = Some(terms.to_string());
        self
    }

    pub fn category(mut self, cat: ArxivCategory) -> Self {
        self.categories.push(cat.as_str().to_string());
        self
    }

    /// Add a raw category string (e.g. "cs.AI"). Validated against the
    /// `prefix.suffix` or bare-prefix pattern.
    pub fn category_str(mut self, cat: &str) -> Result<Self, Error> {
        validate_category(cat)?;
        self.categories.push(cat.to_string());
        Ok(self)
    }

    pub fn date_range(mut self, range: DateRange) -> Self {
        self.date_range = Some(range);
        self
    }

    pub fn sort_by(mut self, sort: SortBy) -> Self {
        self.sort_by = sort;
        self
    }

    pub fn sort_order(mut self, order: SortOrder) -> Self {
        self.sort_order = order;
        self
    }

    pub fn start(mut self, start: u32) -> Self {
        self.start = start;
        self
    }

    pub fn max_results(mut self, max: u32) -> Self {
        self.max_results = max;
        self
    }

    /// Build the `search_query` parameter value for the arXiv API.
    pub fn build_query_string(&self) -> String {
        let mut parts: Vec<String> = Vec::new();

        if let Some(ref t) = self.terms {
            parts.push(format!("all:{}", urlencoded(t)));
        }

        for cat in &self.categories {
            parts.push(format!("cat:{}", cat));
        }

        let search_query = if parts.is_empty() {
            "all:*".to_string()
        } else {
            parts.join("+AND+")
        };

        let mut query = search_query;

        if let Some(ref dr) = self.date_range {
            query = format!("{}+AND+{}", query, dr.to_query_fragment());
        }

        query
    }
}

/// Validate an arXiv ID. Accepts:
/// - New format: YYMM.NNNNN (optionally vN), e.g. 2301.12345, 2301.12345v2
/// - Old format: archive/YYMMNNN (optionally vN), e.g. hep-th/9901001, hep-th/9901001v1
pub fn validate_arxiv_id(id: &str) -> Result<(), Error> {
    let new_format = id.len() >= 10
        && id.as_bytes()[4] == b'.'
        && id[..4].chars().all(|c| c.is_ascii_digit())
        && id[5..]
            .split('v')
            .next()
            .map(|d| d.len() >= 5 && d.chars().all(|c| c.is_ascii_digit()))
            .unwrap_or(false);

    let old_format = id.contains('/')
        && id
            .split('/')
            .last()
            .map(|d| {
                let base = d.split('v').next().unwrap_or("");
                base.len() == 7 && base.chars().all(|c| c.is_ascii_digit())
            })
            .unwrap_or(false);

    if new_format || old_format {
        Ok(())
    } else {
        Err(Error::InvalidId(id.to_string()))
    }
}

/// Validate a category string. Accepts patterns like `cs.AI`, `math.OC`,
/// `quant-ph`, `hep-th`, `stat.ML`, `eess.SP`.
pub fn validate_category(cat: &str) -> Result<(), Error> {
    let valid = if cat.contains('.') {
        let parts: Vec<&str> = cat.splitn(2, '.').collect();
        parts.len() == 2
            && !parts[0].is_empty()
            && !parts[1].is_empty()
            && parts[0]
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-')
            && parts[1]
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-')
    } else {
        // Bare prefix like "quant-ph", "hep-th"
        !cat.is_empty() && cat.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
    };

    if valid {
        Ok(())
    } else {
        Err(Error::InvalidCategory(cat.to_string()))
    }
}

fn urlencoded(s: &str) -> String {
    s.replace(' ', "+").replace('\"', "%22")
}
