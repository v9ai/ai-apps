//! QA audit stage — dedup, validate, score.
//!
//! Uses existing leadgen-metal infrastructure:
//!   - dedup                  — blocking-key entity resolution
//!   - similarity::simd       — Jaro-Winkler string similarity
//!   - Pipeline::find_duplicates

use anyhow::Result;
use serde::{Deserialize, Serialize};

use super::contacts::ContactsReport;
use super::enrich::EnrichmentReport;
use super::{state, StageReport, StageStatus, TeamContext};

#[derive(Debug, Serialize, Deserialize)]
pub struct QaReport {
    pub duplicates: DuplicateReport,
    pub completeness: CompletenessReport,
    pub quality_score: f64,
    pub recommendations: Vec<Recommendation>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DuplicateReport {
    pub company_dupes: Vec<DupePair>,
    pub contact_dupes: Vec<DupePair>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DupePair {
    pub a: String,
    pub b: String,
    pub similarity: f64,
    pub action: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompletenessReport {
    pub companies_audited: usize,
    pub contacts_audited: usize,
    pub companies_complete: usize,
    pub contacts_complete: usize,
    pub missing_fields: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Recommendation {
    pub priority: String,
    pub issue: String,
    pub affected_count: usize,
    pub action: String,
}

pub async fn run(ctx: &TeamContext) -> Result<StageReport> {
    let enrichment: Option<EnrichmentReport> = state::load_report(&ctx.data_dir, "enrichment");
    let contacts: Option<ContactsReport> = state::load_report(&ctx.data_dir, "contacts");

    let mut report = QaReport {
        duplicates: DuplicateReport {
            company_dupes: Vec::new(),
            contact_dupes: Vec::new(),
        },
        completeness: CompletenessReport {
            companies_audited: 0,
            contacts_audited: 0,
            companies_complete: 0,
            contacts_complete: 0,
            missing_fields: Vec::new(),
        },
        quality_score: 1.0,
        recommendations: Vec::new(),
    };

    let mut total_processed = 0;

    // ── Company dedup ─────────────────────────────────────────
    if let Some(ref enrichment) = enrichment {
        let companies = &enrichment.companies;
        report.completeness.companies_audited = companies.len();
        total_processed += companies.len();

        // Build tuples for dedup: (name_part1, name_part2, domain)
        let tuples: Vec<(String, String, String)> = companies
            .iter()
            .map(|c| {
                let parts: Vec<&str> = c.name.splitn(2, ' ').collect();
                let first = parts.first().unwrap_or(&"").to_string();
                let last = parts.get(1).unwrap_or(&"").to_string();
                (first, last, c.domain.clone())
            })
            .collect();

        let dupes = ctx.pipeline.find_duplicates(&tuples, 0.85);
        for (a, b, sim) in &dupes {
            let action = if *sim >= 0.90 { "auto_merge" } else { "review" };
            report.duplicates.company_dupes.push(DupePair {
                a: companies[*a].domain.clone(),
                b: companies[*b].domain.clone(),
                similarity: *sim,
                action: action.into(),
            });
        }

        // Completeness check
        for company in companies {
            let mut complete = true;
            if company.category.is_empty() {
                report.completeness.missing_fields.push(format!("{}: category", company.domain));
                complete = false;
            }
            if company.ai_tier.is_empty() {
                report.completeness.missing_fields.push(format!("{}: ai_tier", company.domain));
                complete = false;
            }
            if company.tech_stack.is_empty() {
                report.completeness.missing_fields.push(format!("{}: tech_stack", company.domain));
                complete = false;
            }
            if complete {
                report.completeness.companies_complete += 1;
            }
        }
    }

    // ── Contact dedup (Fellegi-Sunter probabilistic + exact email) ────
    if let Some(ref contacts) = contacts {
        let contact_list = &contacts.contacts;
        report.completeness.contacts_audited = contact_list.len();
        total_processed += contact_list.len();

        // Build company embedding lookup for semantic dedup feature
        let company_embeddings: std::collections::HashMap<&str, &[f32]> = enrichment
            .as_ref()
            .map(|e| {
                e.companies.iter()
                    .filter_map(|c| c.embedding.as_ref().map(|emb| (c.domain.as_str(), emb.as_slice())))
                    .collect()
            })
            .unwrap_or_default();

        let fs = crate::dedup::FellegiSunter::new();

        // Probabilistic dedup via blocking + Fellegi-Sunter
        let contact_tuples: Vec<(String, String, String)> = contact_list.iter().map(|c| {
            let (first, last) = split_pattern_name(&c.pattern_name);
            (first, last, c.email.clone())
        }).collect();

        let blocks = crate::dedup::build_blocks(&contact_tuples);

        for indices in blocks.values() {
            for i in 0..indices.len() {
                for j in (i + 1)..indices.len() {
                    let (a, b) = (indices[i], indices[j]);
                    let (ca, cb) = (&contact_list[a], &contact_list[b]);

                    // Semantic similarity from company embeddings (dot = cosine for L2-normalized)
                    let cosine_sim = company_embeddings.get(ca.domain.as_str())
                        .and_then(|emb_a| {
                            company_embeddings.get(cb.domain.as_str()).map(|emb_b| {
                                emb_a.iter().zip(emb_b.iter()).map(|(x, y)| x * y).sum::<f32>()
                            })
                        });

                    let (first_a, last_a) = split_pattern_name(&ca.pattern_name);
                    let (first_b, last_b) = split_pattern_name(&cb.pattern_name);

                    let agreements = crate::dedup::FellegiSunter::compare_contacts_semantic(
                        &first_a, &last_a, &ca.email, &ca.company_name,
                        &first_b, &last_b, &cb.email, &cb.company_name,
                        cosine_sim,
                    );
                    let prob = fs.match_probability(&agreements);

                    if prob >= 0.80 {
                        let action = if prob >= 0.95 { "auto_merge" } else { "review" };
                        report.duplicates.contact_dupes.push(DupePair {
                            a: ca.email.clone(),
                            b: cb.email.clone(),
                            similarity: prob,
                            action: action.into(),
                        });
                    }
                }
            }
        }

        // Exact email dupe check (catches 100% matches that blocking may miss)
        let mut seen_emails = std::collections::HashSet::new();
        for contact in contact_list {
            if !seen_emails.insert(contact.email.to_lowercase()) {
                if !report.duplicates.contact_dupes.iter().any(|d| d.a == contact.email && d.b == contact.email) {
                    report.duplicates.contact_dupes.push(DupePair {
                        a: contact.email.clone(),
                        b: contact.email.clone(),
                        similarity: 1.0,
                        action: "dedup".into(),
                    });
                }
            }

            if !contact.email.is_empty() && !contact.domain.is_empty() && !contact.company_name.is_empty() {
                report.completeness.contacts_complete += 1;
            }
        }

        // Verification rate analysis
        let verified = contacts.verification_stats.verified_count as f64;
        let total = contact_list.len() as f64;
        let verification_rate = if total > 0.0 { verified / total } else { 0.0 };

        if verification_rate < 0.10 {
            report.recommendations.push(Recommendation {
                priority: "HIGH".into(),
                issue: format!(
                    "Email verification rate {:.1}% — only {} of {} verified via SMTP",
                    verification_rate * 100.0,
                    contacts.verification_stats.verified_count,
                    contact_list.len()
                ),
                affected_count: contact_list.len() - contacts.verification_stats.verified_count,
                action: "Try additional email patterns or use catch-all detection.".into(),
            });
        }
    }

    // ── Quality score ─────────────────────────────────────────
    let mut quality = 1.0;

    // Penalize duplicates
    let dupe_count = report.duplicates.company_dupes.len() + report.duplicates.contact_dupes.len();
    if dupe_count > 0 {
        quality -= (dupe_count as f64 * 0.05).min(0.3);
    }

    // Penalize incomplete records
    let total_audited = report.completeness.companies_audited + report.completeness.contacts_audited;
    let total_complete = report.completeness.companies_complete + report.completeness.contacts_complete;
    if total_audited > 0 {
        let completeness_rate = total_complete as f64 / total_audited as f64;
        if completeness_rate < 0.8 {
            quality -= 0.2;
            report.recommendations.push(Recommendation {
                priority: "HIGH".into(),
                issue: format!(
                    "Completeness {:.0}% below 80% target",
                    completeness_rate * 100.0
                ),
                affected_count: total_audited - total_complete,
                action: "Re-enrich incomplete records.".into(),
            });
        }
    }

    // Penalize missing fields
    if !report.completeness.missing_fields.is_empty() {
        quality -= 0.1;
    }

    report.quality_score = quality.max(0.0);

    // Generate additional recommendations
    if report.duplicates.company_dupes.iter().any(|d| d.action == "auto_merge") {
        report.recommendations.push(Recommendation {
            priority: "MEDIUM".into(),
            issue: "Auto-mergeable company duplicates found".into(),
            affected_count: report
                .duplicates
                .company_dupes
                .iter()
                .filter(|d| d.action == "auto_merge")
                .count(),
            action: "Merge duplicate company records.".into(),
        });
    }

    if report.quality_score < 0.7 {
        report.recommendations.push(Recommendation {
            priority: "CRITICAL".into(),
            issue: format!("Overall quality {:.0}% below 70% threshold", report.quality_score * 100.0),
            affected_count: 0,
            action: "Halt outreach until quality improves.".into(),
        });
    }

    state::save_report(&ctx.data_dir, "qa", &report)?;

    // Update state with quality metrics
    // Bounce rate is only updated from actual outreach send/bounce data,
    // not from SMTP verification failures (which are expected for pattern discovery)
    let mut st = state::PipelineState::load(&ctx.data_dir);
    st.quality_score = report.quality_score;
    st.save(&ctx.data_dir)?;

    let created = report.recommendations.len();
    let status = if report.quality_score >= 0.7 {
        StageStatus::Success
    } else {
        StageStatus::Partial
    };

    Ok(StageReport {
        stage: "qa".into(),
        status,
        processed: total_processed,
        created,
        errors: vec![],
        duration_ms: 0,
    })
}

/// Split "john.smith" pattern name into (first, last).
fn split_pattern_name(pattern: &str) -> (String, String) {
    let parts: Vec<&str> = pattern.splitn(2, '.').collect();
    let first = parts.first().unwrap_or(&"").to_string();
    let last = parts.get(1).unwrap_or(&"").to_string();
    (first, last)
}
