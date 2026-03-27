//! Contact discovery stage — find + verify decision-maker emails.
//!
//! Input:  enrichment report (companies with domains + emails)
//! Output: contacts report + contacts ingested into Pipeline storage
//!
//! Uses existing leadgen-metal infrastructure:
//!   - email_metal::pattern_fsm  — email pattern generation
//!   - dns                        — MX record resolution
//!   - email_metal::smtp_fsm    — SMTP verification
//!
//! Parallelism: companies processed concurrently (semaphore-bounded),
//! SMTP verifications within each company also concurrent.

use std::sync::Arc;

use anyhow::Result;
use serde::{Deserialize, Serialize};
use tokio::sync::Semaphore;

use super::enrich::EnrichmentReport;
use super::{state, StageReport, StageStatus, TeamContext};

/// Max companies verified concurrently (each opens TCP connections).
const COMPANY_CONCURRENCY: usize = 8;
/// Max SMTP connections per company (emails share the same MX host).
const SMTP_CONCURRENCY_PER_COMPANY: usize = 4;

#[derive(Debug, Serialize, Deserialize)]
pub struct ContactsReport {
    pub contacts: Vec<FoundContact>,
    pub verification_stats: VerificationStats,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FoundContact {
    pub email: String,
    pub domain: String,
    pub company_name: String,
    pub pattern_name: String,
    pub verified: bool,
    pub verification_tier: u8,
    pub mx_host: String,
    pub score: f64,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct VerificationStats {
    pub mx_checked: usize,
    pub smtp_checked: usize,
    pub verified_count: usize,
    pub failed_count: usize,
    pub no_mx_count: usize,
}

/// Result of processing a single company (collected from spawned tasks).
struct CompanyResult {
    contacts: Vec<FoundContact>,
    mx_checked: usize,
    smtp_checked: usize,
    verified_count: usize,
    failed_count: usize,
    no_mx_count: usize,
    errors: Vec<String>,
}

pub async fn run(ctx: &TeamContext) -> Result<StageReport> {
    let enrichment: EnrichmentReport = state::load_report(&ctx.data_dir, "enrichment")
        .ok_or_else(|| anyhow::anyhow!("no enrichment report — run enrich first"))?;

    let limit = ctx.batch.contacts.min(enrichment.companies.len());
    let mut candidates = enrichment.companies.clone();
    candidates.sort_by(|a, b| {
        b.enrichment_score
            .partial_cmp(&a.enrichment_score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let candidates = candidates[..limit].to_vec();

    let patterns: Arc<Vec<(&'static str, crate::email_metal::pattern_fsm::CompiledPattern)>> =
        Arc::new(crate::email_metal::pattern_fsm::all_patterns());
    let pipeline = Arc::clone(&ctx.pipeline);
    let sem = Arc::new(Semaphore::new(COMPANY_CONCURRENCY));

    // Spawn one task per company, bounded by semaphore
    let mut handles = Vec::with_capacity(candidates.len());

    for company in candidates {
        let sem = Arc::clone(&sem);
        let pipeline = Arc::clone(&pipeline);
        let patterns = Arc::clone(&patterns);

        handles.push(tokio::spawn(async move {
            let _permit = sem.acquire().await.unwrap();
            process_company(&company, &patterns, &pipeline).await
        }));
    }

    // Collect results
    let mut report = ContactsReport {
        contacts: Vec::new(),
        verification_stats: VerificationStats::default(),
        errors: Vec::new(),
    };

    for handle in handles {
        match handle.await {
            Ok(cr) => {
                report.verification_stats.mx_checked += cr.mx_checked;
                report.verification_stats.smtp_checked += cr.smtp_checked;
                report.verification_stats.verified_count += cr.verified_count;
                report.verification_stats.failed_count += cr.failed_count;
                report.verification_stats.no_mx_count += cr.no_mx_count;
                report.contacts.extend(cr.contacts);
                report.errors.extend(cr.errors);
            }
            Err(e) => {
                report.errors.push(format!("task panic: {e}"));
            }
        }
    }

    state::save_report(&ctx.data_dir, "contacts", &report)?;

    let mut st = state::PipelineState::load(&ctx.data_dir);
    st.counts.contacts_found += report.contacts.iter().filter(|c| c.verified).count();
    st.save(&ctx.data_dir)?;

    let verified = report.verification_stats.verified_count;
    let total = report.contacts.len();
    let errors = report.errors.clone();
    let status = if errors.is_empty() { StageStatus::Success } else { StageStatus::Partial };

    Ok(StageReport {
        stage: "contacts".into(),
        status,
        processed: total,
        created: verified,
        errors,
        duration_ms: 0,
    })
}

/// Process a single company: MX lookup → pattern generation → parallel SMTP verification.
async fn process_company(
    company: &super::enrich::EnrichedCompany,
    patterns: &[(&'static str, crate::email_metal::pattern_fsm::CompiledPattern)],
    pipeline: &crate::Pipeline,
) -> CompanyResult {
    let domain = &company.domain;
    let mut result = CompanyResult {
        contacts: Vec::new(),
        mx_checked: 0,
        smtp_checked: 0,
        verified_count: 0,
        failed_count: 0,
        no_mx_count: 0,
        errors: Vec::new(),
    };

    // Step 1: Resolve MX records
    let mx_records = match crate::dns::resolve_mx_async(domain).await {
        Ok(records) if !records.is_empty() => {
            result.mx_checked = 1;
            records
        }
        Ok(_) => {
            result.no_mx_count = 1;
            result.errors.push(format!("{domain}: no MX records"));
            return result;
        }
        Err(e) => {
            result.no_mx_count = 1;
            result.errors.push(format!("{domain}: MX resolve: {e}"));
            return result;
        }
    };
    let mx_host = mx_records[0].exchange.clone();

    // Step 2: Infer pattern from known emails
    let inferred_pattern = if !company.emails_found.is_empty() {
        let known: Vec<(String, String, String)> = company
            .emails_found
            .iter()
            .filter_map(|e| {
                let local = e.split('@').next()?;
                let parts: Vec<&str> = local.split('.').collect();
                if parts.len() == 2 {
                    Some((parts[0].to_string(), parts[1].to_string(), e.clone()))
                } else {
                    None
                }
            })
            .collect();

        if !known.is_empty() {
            crate::email_metal::pattern_fsm::infer_pattern(&known, patterns)
        } else {
            None
        }
    } else {
        None
    };

    // Step 3: Build candidate list
    let mut candidates_to_verify: Vec<(String, String)> = Vec::new();

    for email in &company.emails_found {
        candidates_to_verify.push((email.clone(), "discovered".into()));
    }

    let target_patterns: Vec<&(&str, crate::email_metal::pattern_fsm::CompiledPattern)> =
        if let Some((ref name, _confidence)) = inferred_pattern {
            patterns.iter().filter(|(n, _)| *n == &**name).collect()
        } else {
            patterns.iter().take(3).collect()
        };

    let sample_names = [("info", ""), ("hello", ""), ("contact", "")];
    for (first, last) in &sample_names {
        if first.is_empty() { continue; }
        let mut buf = [0u8; 256];
        for (pat_name, pattern) in &target_patterns {
            if let Some(email) = pattern.generate_into(first, last, domain, &mut buf) {
                candidates_to_verify.push((email.to_string(), pat_name.to_string()));
            }
        }
    }

    // Step 4: Parallel SMTP verification (bounded per company)
    let smtp_sem = Arc::new(Semaphore::new(SMTP_CONCURRENCY_PER_COMPANY));
    let mx_host = Arc::new(mx_host);

    let mut smtp_handles = Vec::with_capacity(candidates_to_verify.len());

    for (email, pattern_name) in candidates_to_verify {
        let smtp_sem = Arc::clone(&smtp_sem);
        let mx_host = Arc::clone(&mx_host);

        smtp_handles.push(tokio::spawn(async move {
            let _permit = smtp_sem.acquire().await.unwrap();
            let verify_result = crate::email_metal::smtp_fsm::verify_email_fsm(
                &email,
                &mx_host,
                "verify.leadgen.local",
            )
            .await;
            (email, pattern_name, verify_result)
        }));
    }

    let domain_str = domain.clone();
    let company_name = company.name.clone();

    for handle in smtp_handles {
        let (email, pattern_name, verify_result) = match handle.await {
            Ok(v) => v,
            Err(_) => continue,
        };

        result.smtp_checked += 1;

        let is_generic = email.starts_with("info@")
            || email.starts_with("hello@")
            || email.starts_with("contact@")
            || email.starts_with("support@");

        let verified = matches!(
            verify_result,
            crate::email_metal::smtp_fsm::VerifyResult::Valid
        );
        if verified {
            result.verified_count += 1;
        } else {
            result.failed_count += 1;
        }

        let score = if verified && !is_generic { 0.8 } else if verified { 0.5 } else { 0.1 };

        let id = format!("ct-{}", crc32fast::hash(email.as_bytes()));
        let company_id = format!("d-{}", crc32fast::hash(domain_str.as_bytes()));
        let status_str = if verified { "verified" } else { "unverified" };
        let _ = pipeline.ingest_contact(
            &id,
            &company_id,
            email.split('@').next().unwrap_or(""),
            "",
            "",
            "",
            &email,
            status_str,
        );

        result.contacts.push(FoundContact {
            email,
            domain: domain_str.clone(),
            company_name: company_name.clone(),
            pattern_name,
            verified,
            verification_tier: if verified { 2 } else { 1 },
            mx_host: mx_host.to_string(),
            score,
        });
    }

    result
}
