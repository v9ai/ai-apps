//! Outreach stage — draft personalized emails with approval gate.
//!
//! NEVER sends emails without explicit user approval via stdin.
//!
//! Input:  contacts report + enrichment report
//! Output: outreach report (drafts only until approved)

use anyhow::Result;
use serde::{Deserialize, Serialize};

use super::contacts::ContactsReport;
use super::enrich::EnrichmentReport;
use super::{llm, state, StageReport, StageStatus, TeamContext};

#[derive(Debug, Serialize, Deserialize)]
pub struct OutreachReport {
    pub status: OutreachStatus,
    pub drafts: Vec<OutreachDraft>,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OutreachStatus {
    DraftPending,
    Approved,
    Rejected,
}

impl std::fmt::Display for OutreachStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::DraftPending => write!(f, "DRAFT_PENDING"),
            Self::Approved => write!(f, "APPROVED"),
            Self::Rejected => write!(f, "REJECTED"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutreachDraft {
    pub contact_email: String,
    pub company_name: String,
    pub company_domain: String,
    pub subject: String,
    pub body: String,
    pub personalization_score: f64,
    pub quality_checks: QualityChecks,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityChecks {
    pub subject_length_ok: bool,
    pub body_word_count: usize,
    pub body_length_ok: bool,
    pub has_cta: bool,
    pub spam_score: f64,
}

pub async fn run(ctx: &TeamContext) -> Result<StageReport> {
    let contacts: ContactsReport = state::load_report(&ctx.data_dir, "contacts")
        .ok_or_else(|| anyhow::anyhow!("no contacts report — run contacts first"))?;

    let enrichment: Option<EnrichmentReport> = state::load_report(&ctx.data_dir, "enrichment");

    // Check QA quality gate
    if let Some(qa) = state::load_report::<super::qa::QaReport>(&ctx.data_dir, "qa") {
        if qa.quality_score < 0.7 {
            eprintln!("  OUTREACH BLOCKED: QA quality {:.0}% < 70% threshold", qa.quality_score * 100.0);
            return Ok(StageReport {
                stage: "outreach".into(),
                status: StageStatus::Skipped,
                processed: 0,
                created: 0,
                errors: vec!["QA quality gate failed".into()],
                duration_ms: 0,
            });
        }
    }

    // Build company lookup from enrichment (needed before reranking)
    let company_map: std::collections::HashMap<&str, &super::enrich::EnrichedCompany> =
        enrichment
            .as_ref()
            .map(|e| e.companies.iter().map(|c| (c.domain.as_str(), c)).collect())
            .unwrap_or_default();

    // Stage 1: sort verified contacts by score (fast recall)
    let mut verified: Vec<_> = contacts.contacts.iter().filter(|c| c.verified).collect();
    verified.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));

    // Stage 2: when reranker is available, rerank top-50 by cross-encoder relevance.
    // Scores (ICP query, "contact at company: tech_stack") pairs for precision.
    #[cfg(feature = "kernel-reranker")]
    let reranker: Option<crate::similarity::reranker::Reranker> = {
        match crate::similarity::reranker::Reranker::load_default() {
            Ok(r) => { eprintln!("  Reranker loaded (ms-marco-MiniLM-L6-v2)"); Some(r) }
            Err(e) => { eprintln!("  Reranker unavailable: {e}"); None }
        }
    };

    let limit = ctx.batch.outreach.min(verified.len());

    // Rerank top-50 → top-K when cross-encoder is available
    #[cfg(feature = "kernel-reranker")]
    let reranked_indices: Option<Vec<usize>> = reranker.as_ref().and_then(|rr| {
        let recall_n = 50.min(verified.len());
        if recall_n == 0 { return None; }

        let icp_query = format!(
            "B2B {} company hiring AI/ML engineers, remote-friendly, strong tech stack",
            ctx.icp_vertical
        );

        let docs: Vec<String> = verified[..recall_n].iter().map(|c| {
            let tech = company_map.get(c.domain.as_str())
                .map(|co| co.tech_stack.join(", "))
                .unwrap_or_default();
            format!("{} at {} ({}): {}", c.pattern_name, c.company_name, c.domain, tech)
        }).collect();
        let doc_refs: Vec<&str> = docs.iter().map(|d| d.as_str()).collect();

        match rr.rerank_top_k(&icp_query, &doc_refs, limit) {
            Ok(results) => {
                eprintln!("  Reranked {} → {} targets", recall_n, results.len());
                Some(results.iter().map(|r| r.index).collect())
            }
            Err(e) => {
                eprintln!("  Rerank failed: {e}, falling back to score-sort");
                None
            }
        }
    });

    // Build final target list: reranked order if available, else score-sorted
    #[cfg(feature = "kernel-reranker")]
    let targets: Vec<&super::contacts::FoundContact> = if let Some(ref indices) = reranked_indices {
        indices.iter().map(|&i| verified[i]).collect()
    } else {
        verified[..limit].to_vec()
    };
    #[cfg(not(feature = "kernel-reranker"))]
    let targets: Vec<&super::contacts::FoundContact> = verified[..limit].to_vec();

    let mut report = OutreachReport {
        status: OutreachStatus::DraftPending,
        drafts: Vec::new(),
        errors: Vec::new(),
    };

    for contact in &targets {
        let company = company_map.get(contact.domain.as_str());
        let tech_stack = company
            .map(|c| c.tech_stack.join(", "))
            .unwrap_or_default();

        match llm::draft_email(
            &ctx.http,
            &ctx.llm_base_url,
            ctx.llm_api_key.as_deref(),
            &ctx.llm_model,
            &contact.email.split('@').next().unwrap_or(""),
            "",
            &contact.company_name,
            &contact.domain,
            &tech_stack,
        )
        .await
        {
            Ok(draft) => {
                let quality = check_quality(&draft.subject, &draft.body);
                report.drafts.push(OutreachDraft {
                    contact_email: contact.email.clone(),
                    company_name: contact.company_name.clone(),
                    company_domain: contact.domain.clone(),
                    subject: draft.subject,
                    body: draft.body,
                    personalization_score: draft.personalization_score,
                    quality_checks: quality,
                });
            }
            Err(e) => {
                report.errors.push(format!("{}: {e}", contact.email));
            }
        }
    }

    // ── Approval gate ─────────────────────────────────────────
    eprintln!();
    eprintln!("  ── Outreach Drafts ──────────────────────────────");
    for (i, draft) in report.drafts.iter().enumerate() {
        eprintln!("  #{} {} -> {} ({})", i + 1, draft.contact_email, draft.company_name, draft.company_domain);
        eprintln!("     Subject: {}", draft.subject);
        eprintln!("     Words: {} | Personalization: {:.0}%",
            draft.quality_checks.body_word_count,
            draft.personalization_score * 100.0,
        );
        eprintln!();
    }
    eprintln!("  ──────────────────────────────────────────────────");

    report.status = if ctx.auto_confirm {
        eprintln!("  Auto-approved (--yes)");
        OutreachStatus::Approved
    } else {
        eprintln!("  APPROVAL REQUIRED: Type 'approve' to mark ready, or 'reject':");
        eprintln!();
        let mut input = String::new();
        std::io::stdin().read_line(&mut input)?;
        let input = input.trim().to_lowercase();
        if input == "approve" || input == "y" || input == "yes" {
            OutreachStatus::Approved
        } else {
            OutreachStatus::Rejected
        }
    };

    eprintln!("  Outreach status: {}", report.status);

    state::save_report(&ctx.data_dir, "outreach", &report)?;

    // Update state
    let mut st = state::PipelineState::load(&ctx.data_dir);
    st.counts.outreach_drafted += report.drafts.len();
    st.cycle_count += 1;
    st.phase = Some(st.detect_phase());
    st.save(&ctx.data_dir)?;

    let created = report.drafts.len();
    let errors = report.errors.clone();
    let status = match report.status {
        OutreachStatus::Approved => StageStatus::Success,
        OutreachStatus::Rejected => StageStatus::Partial,
        OutreachStatus::DraftPending => StageStatus::Partial,
    };

    Ok(StageReport {
        stage: "outreach".into(),
        status,
        processed: targets.len(),
        created,
        errors,
        duration_ms: 0,
    })
}

fn check_quality(subject: &str, body: &str) -> QualityChecks {
    let word_count = body.split_whitespace().count();
    let subject_len = subject.len();

    // Spam score heuristic
    let mut spam = 0.0;
    let lower_subj = subject.to_lowercase();
    let spam_triggers = [
        "free", "urgent", "act now", "limited time", "winner",
        "click here", "buy now", "!!!",
    ];
    for trigger in &spam_triggers {
        if lower_subj.contains(trigger) {
            spam += 0.15;
        }
    }
    if subject.chars().filter(|c| c.is_uppercase()).count() > subject.len() / 2 {
        spam += 0.2;
    }

    // CTA detection
    let lower_body = body.to_lowercase();
    let has_cta = lower_body.contains("call")
        || lower_body.contains("chat")
        || lower_body.contains("meet")
        || lower_body.contains("connect")
        || lower_body.contains("schedule");

    QualityChecks {
        subject_length_ok: subject_len > 0 && subject_len <= 60,
        body_word_count: word_count,
        body_length_ok: (100..=250).contains(&word_count),
        has_cta,
        spam_score: f64::min(spam, 1.0),
    }
}
