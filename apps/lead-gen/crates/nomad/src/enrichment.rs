use anyhow::Result;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use tracing::info;

use crate::d1::D1Client;

// Salary patterns: "$120k-$180k", "€80,000 - €120,000", "120000-180000 USD", etc.
static SALARY_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)[\$€£]?\s*(\d{2,3})[,.]?(\d{3})?\s*[kK]?\s*[-–to]+\s*[\$€£]?\s*(\d{2,3})[,.]?(\d{3})?\s*[kK]?\s*(?:per\s+(?:year|annum|yr))?(?:\s*(?:USD|EUR|GBP|CHF))?").unwrap()
});

static CURRENCY_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)(USD|EUR|GBP|CHF|SEK|NOK|DKK|PLN|CZK)|\$|€|£").unwrap()
});

static VISA_POSITIVE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)visa\s+sponsor|relocation\s+(support|package|assistance)|work\s+permit\s+(support|assist)|immigration\s+support|sponsorship\s+available").unwrap()
});

static VISA_NEGATIVE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)no\s+visa\s+sponsor|must\s+have\s+(?:valid\s+)?work\s+(?:authorization|permit)|authorized\s+to\s+work|no\s+sponsorship|without\s+sponsorship").unwrap()
});

static CULTURE_PATTERNS: &[(&str, &str)] = &[
    (
        "remote-first",
        r"(?i)remote[\s-]first|fully\s+remote|100%\s+remote",
    ),
    (
        "async-first",
        r"(?i)async[\s-]first|async(?:hronous)?\s+(work|communication|culture)",
    ),
    (
        "4-day-week",
        r"(?i)4[\s-]day\s+w(?:ork\s*)?(?:eek|k)|four[\s-]day",
    ),
    (
        "flexible-hours",
        r"(?i)flexible\s+(?:hours|schedule|working)|flexitime",
    ),
    (
        "unlimited-pto",
        r"(?i)unlimited\s+(?:PTO|vacation|time[\s-]off|leave)",
    ),
    ("equity", r"(?i)stock\s+options|equity|RSU|ESOP"),
    (
        "learning-budget",
        r"(?i)learning\s+budget|education\s+(?:budget|allowance|stipend)|conference\s+budget",
    ),
];

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EnrichmentResult {
    pub salary_min: Option<i64>,
    pub salary_max: Option<i64>,
    pub salary_currency: Option<String>,
    pub visa_sponsorship: Option<bool>,
    pub culture_signals: Vec<String>,
    pub remote_quality_score: f64,
}

/// Extract enrichment signals from a job description.
pub fn extract_enrichment(description: &str) -> EnrichmentResult {
    let mut result = EnrichmentResult::default();

    // Salary extraction
    if let Some(caps) = SALARY_PATTERN.captures(description) {
        let parse_amount = |s1: &str, s2: Option<regex::Match>| -> Option<i64> {
            let num: i64 = s1.parse().ok()?;
            if let Some(s2m) = s2 {
                // Full number like 120000
                let full = format!("{}{}", s1, s2m.as_str());
                full.parse().ok()
            } else if num < 1000 {
                // Likely "120k" format
                Some(num * 1000)
            } else {
                Some(num)
            }
        };

        result.salary_min = parse_amount(caps.get(1).unwrap().as_str(), caps.get(2));
        result.salary_max = parse_amount(caps.get(3).unwrap().as_str(), caps.get(4));
    }

    // Currency detection
    if let Some(m) = CURRENCY_PATTERN.find(description) {
        result.salary_currency = Some(match m.as_str().to_uppercase().as_str() {
            "$" => "USD".to_string(),
            "€" => "EUR".to_string(),
            "£" => "GBP".to_string(),
            other => other.to_string(),
        });
    }

    // Visa sponsorship detection
    if VISA_POSITIVE.is_match(description) {
        result.visa_sponsorship = Some(true);
    } else if VISA_NEGATIVE.is_match(description) {
        result.visa_sponsorship = Some(false);
    }

    // Culture signal detection
    for (signal, pattern_str) in CULTURE_PATTERNS {
        if let Ok(re) = Regex::new(pattern_str) {
            if re.is_match(description) {
                result.culture_signals.push(signal.to_string());
            }
        }
    }

    // Remote quality score (0..1)
    let mut score = 0.0_f64;
    let desc_lower = description.to_lowercase();
    if desc_lower.contains("remote-first") || desc_lower.contains("fully remote") {
        score += 0.3;
    }
    if desc_lower.contains("async") {
        score += 0.2;
    }
    if desc_lower.contains("flexible") {
        score += 0.1;
    }
    if result
        .culture_signals
        .contains(&"4-day-week".to_string())
    {
        score += 0.1;
    }
    if result
        .culture_signals
        .contains(&"unlimited-pto".to_string())
    {
        score += 0.1;
    }
    if result.visa_sponsorship == Some(true) {
        score += 0.1;
    }
    if result.salary_min.is_some() {
        score += 0.1;
    }
    result.remote_quality_score = score.min(1.0);

    result
}

#[derive(Debug, Default)]
pub struct EnrichmentStats {
    pub processed: u32,
    pub enriched: u32,
    pub skipped: u32,
    pub errors: u32,
}

/// Batch-enrich jobs with status 'eu-remote' that haven't been enriched yet.
pub async fn enrich_batch(db: &D1Client, limit: u32) -> Result<EnrichmentStats> {
    let mut stats = EnrichmentStats::default();

    let jobs: Vec<crate::JobRow> = db
        .query_as(
            &format!(
                "SELECT {select} FROM jobs \
                 WHERE status = 'eu-remote' \
                 AND (enrichment_status IS NULL OR enrichment_status = 'pending') \
                 LIMIT {limit}",
                select = crate::CLASSIFY_SELECT,
            ),
            None,
        )
        .await?;

    info!("Enrichment: {} candidates", jobs.len());

    for job in &jobs {
        stats.processed += 1;
        let desc = job.description.as_deref().unwrap_or("");
        if desc.is_empty() {
            // Mark as skipped
            let _ = db
                .execute(
                    &format!(
                        "UPDATE jobs SET enrichment_status = 'skipped' WHERE id = {}",
                        job.id
                    ),
                    None,
                )
                .await;
            stats.skipped += 1;
            continue;
        }

        let result = extract_enrichment(desc);

        let salary_min = result
            .salary_min
            .map(|v| v.to_string())
            .unwrap_or("NULL".to_string());
        let salary_max = result
            .salary_max
            .map(|v| v.to_string())
            .unwrap_or("NULL".to_string());
        let salary_currency = result
            .salary_currency
            .as_deref()
            .map(|s| format!("'{s}'"))
            .unwrap_or("NULL".to_string());
        let visa = match result.visa_sponsorship {
            Some(true) => "1",
            Some(false) => "0",
            None => "NULL",
        };

        let sql = format!(
            "UPDATE jobs SET salary_min = {salary_min}, salary_max = {salary_max}, \
             salary_currency = {salary_currency}, visa_sponsorship = {visa}, \
             enrichment_status = 'enriched', \
             updated_at = datetime('now') \
             WHERE id = {}",
            job.id
        );

        match db.execute(&sql, None).await {
            Ok(_) => stats.enriched += 1,
            Err(e) => {
                tracing::warn!("Enrichment failed for job {}: {e}", job.id);
                stats.errors += 1;
            }
        }
    }

    Ok(stats)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_salary_extraction() {
        let r = extract_enrichment("Salary: $120k-$180k per year");
        assert_eq!(r.salary_min, Some(120000));
        assert_eq!(r.salary_max, Some(180000));
        assert_eq!(r.salary_currency.as_deref(), Some("USD"));
    }

    #[test]
    fn test_visa_detection() {
        let r = extract_enrichment("We offer visa sponsorship for qualified candidates");
        assert_eq!(r.visa_sponsorship, Some(true));

        let r2 = extract_enrichment("Must be authorized to work in the US. No sponsorship.");
        assert_eq!(r2.visa_sponsorship, Some(false));
    }

    #[test]
    fn test_culture_signals() {
        let r = extract_enrichment(
            "We are a remote-first company with async communication and flexible hours",
        );
        assert!(r.culture_signals.contains(&"remote-first".to_string()));
        assert!(r.culture_signals.contains(&"async-first".to_string()));
        assert!(r
            .culture_signals
            .contains(&"flexible-hours".to_string()));
    }
}
