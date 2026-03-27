//! Contact discovery stage — find + verify decision-maker emails.
//!
//! Input:  enrichment report (companies with domains + emails)
//! Output: contacts report + contacts ingested into Pipeline storage
//!
//! Uses existing leadgen-metal infrastructure:
//!   - email_metal::pattern_fsm  — email pattern generation
//!   - dns                        — MX record resolution
//!   - email_metal::smtp_fsm    — SMTP verification

use anyhow::Result;
use serde::{Deserialize, Serialize};

use super::enrich::EnrichmentReport;
use super::{state, StageReport, StageStatus, TeamContext};

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

pub async fn run(ctx: &TeamContext) -> Result<StageReport> {
    let enrichment: EnrichmentReport = state::load_report(&ctx.data_dir, "enrichment")
        .ok_or_else(|| anyhow::anyhow!("no enrichment report — run enrich first"))?;

    let limit = ctx.batch.contacts.min(enrichment.companies.len());
    // Sort by enrichment score descending
    let mut candidates = enrichment.companies.clone();
    candidates.sort_by(|a, b| {
        b.enrichment_score
            .partial_cmp(&a.enrichment_score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let candidates = &candidates[..limit];

    let mut report = ContactsReport {
        contacts: Vec::new(),
        verification_stats: VerificationStats::default(),
        errors: Vec::new(),
    };

    let patterns = crate::email_metal::pattern_fsm::all_patterns();

    for company in candidates {
        let domain = &company.domain;

        // Step 1: Resolve MX records
        let mx_records = match crate::dns::resolve_mx_async(domain).await {
            Ok(records) if !records.is_empty() => {
                report.verification_stats.mx_checked += 1;
                records
            }
            Ok(_) => {
                report.verification_stats.no_mx_count += 1;
                report.errors.push(format!("{domain}: no MX records"));
                continue;
            }
            Err(e) => {
                report.verification_stats.no_mx_count += 1;
                report.errors.push(format!("{domain}: MX resolve: {e}"));
                continue;
            }
        };
        let mx_host = &mx_records[0].exchange;

        // Step 2: If we have known emails, infer pattern
        let inferred_pattern = if !company.emails_found.is_empty() {
            // Try to build (first, last, email) tuples for pattern inference
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
                crate::email_metal::pattern_fsm::infer_pattern(&known, &patterns)
            } else {
                None
            }
        } else {
            None
        };

        // Step 3: Generate candidate emails for common names
        // Use discovered emails directly + generate from common patterns
        let mut candidates_to_verify: Vec<(String, String)> = Vec::new();

        // Add discovered emails first
        for email in &company.emails_found {
            candidates_to_verify.push((email.clone(), "discovered".into()));
        }

        // Generate from pattern if inferred, otherwise try top patterns
        let target_patterns: Vec<&(& str, crate::email_metal::pattern_fsm::CompiledPattern)> =
            if let Some((ref name, _confidence)) = inferred_pattern {
                patterns.iter().filter(|(n, _)| *n == &**name).collect()
            } else {
                patterns.iter().take(3).collect()
            };

        // Generate emails for placeholder names (real contact names would come from LinkedIn)
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

        // Step 4: SMTP verification
        for (email, pattern_name) in &candidates_to_verify {
            // Skip obvious non-personal emails for scoring
            let is_generic = email.starts_with("info@")
                || email.starts_with("hello@")
                || email.starts_with("contact@")
                || email.starts_with("support@");

            let verify_result = crate::email_metal::smtp_fsm::verify_email_fsm(
                email,
                mx_host,
                "verify.leadgen.local",
            )
            .await;

            report.verification_stats.smtp_checked += 1;

            let verified = matches!(
                verify_result,
                crate::email_metal::smtp_fsm::VerifyResult::Valid
            );
            if verified {
                report.verification_stats.verified_count += 1;
            } else {
                report.verification_stats.failed_count += 1;
            }

            let score = if verified && !is_generic { 0.8 } else if verified { 0.5 } else { 0.1 };

            // Ingest into Pipeline storage
            let id = format!("ct-{}", crc32fast::hash(email.as_bytes()));
            let company_id = format!("d-{}", crc32fast::hash(domain.as_bytes()));
            let status_str = if verified { "verified" } else { "unverified" };
            ctx.pipeline.ingest_contact(
                &id,
                &company_id,
                email.split('@').next().unwrap_or(""),
                "",
                "",
                "",
                email,
                status_str,
            )?;

            report.contacts.push(FoundContact {
                email: email.clone(),
                domain: domain.clone(),
                company_name: company.name.clone(),
                pattern_name: pattern_name.clone(),
                verified,
                verification_tier: if verified { 2 } else { 1 },
                mx_host: mx_host.clone(),
                score,
            });
        }
    }

    state::save_report(&ctx.data_dir, "contacts", &report)?;

    // Update state
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
