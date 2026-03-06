use anyhow::{Context, Result};
use rayon::prelude::*;
use regex::Regex;
use serde_json::json;
use tracing::info;

use crate::d1::D1Client;
use crate::heuristic::keyword_eu_classify;
use crate::signals::{extract_eu_signals, format_signals};
use crate::{Confidence, JobClassification, JobRow, SignalSet, status};

/// Classification prompt — system message.
const SYSTEM_PROMPT: &str = "\
You are an expert at classifying job postings for Remote EU eligibility. \
A Remote EU position must be FULLY REMOTE and allow work from EU member countries. \
Return structured JSON output with clear reasoning.";

/// Classification prompt — user message template.
/// Placeholders: {title}, {location}, {description}, {structured_signals}
const USER_PROMPT_TEMPLATE: &str = r#"Classify this job posting as Remote EU or not.

JOB DETAILS:
- Title: {title}
- Location: {location}
- Description: {description}

STRUCTURED SIGNALS (from ATS metadata -- trust these over raw text):
{structured_signals}

CLASSIFICATION RULES (apply in order):

0. NEGATIVE SIGNALS (highest priority -- override all other rules):
   - "US only", "must be based in US", "US work authorization required" -> isRemoteEU: false (high confidence)
   - "No EU applicants", "cannot accept from EU" -> isRemoteEU: false (high confidence)
   - Swiss-only work permit in DACH context -> isRemoteEU: false (high confidence)

1. FULLY REMOTE REQUIREMENT: Must explicitly state "remote", "fully remote", or similar.
   - Hybrid, office-based, or on-site positions -> isRemoteEU: false

2. ATS METADATA SHORTCUTS:
   - EU country code + ATS remote flag -> isRemoteEU: true (high confidence)
   - ATS workplace_type = "not remote" -> isRemoteEU: false (high confidence)

3. EXPLICIT EU MENTIONS: "Remote - EU", "EU only" -> isRemoteEU: true (high confidence)

4. WORK AUTHORIZATION: "EU work authorization", "EU passport" -> isRemoteEU: true

5. REGIONAL SHORTHANDS:
   - "DACH" -> true (medium), "Nordics" -> true (medium), "Benelux" -> true (high)

6. BROADER REGIONS:
   - "EMEA" + EU work auth -> true (high), "EMEA" alone -> true (medium)
   - "Europe" -> true (medium)

7. TIMEZONE SIGNALS:
   - "EU Timezone" -> true (medium), "CET +/- N hours" -> true (medium)

8. WORLDWIDE / GLOBAL:
   - Worldwide + negative signals -> false (high)
   - Worldwide + EU signals -> true (medium)
   - Worldwide + no EU specifics -> true (LOW confidence)

9. UK only (post-Brexit) -> false. Switzerland only -> false.

10. CONFIDENCE: HIGH (explicit EU, clear remote), MEDIUM (mixed regions, EMEA, EU timezone), LOW (vague, worldwide)

RESPOND ONLY WITH VALID JSON:
{{"isRemoteEU": true/false, "confidence": "high" | "medium" | "low", "reason": "Brief explanation"}}"#;

/// Extract JSON object from LLM response (handles markdown fences, preamble).
pub fn extract_json_object(raw: &str) -> Result<&str> {
    let cleaned = Regex::new(r"```(?:json)?")
        .unwrap()
        .replace_all(raw, "");
    let cleaned = cleaned.trim();
    let start = cleaned
        .find('{')
        .context("No JSON object found in LLM output")?;
    let end = cleaned
        .rfind('}')
        .context("No closing brace in LLM output")?;
    if end <= start {
        anyhow::bail!("Invalid JSON object bounds");
    }
    // Return slice of original cleaned string
    Ok(&raw[raw.find('{').unwrap()..=raw.rfind('}').unwrap()])
}

/// Classify a single job via LLM only (signals already extracted).
async fn classify_with_llm(
    job: &JobRow,
    signals: &SignalSet,
    deepseek: &deepseek::DeepSeekClient<deepseek::ReqwestClient>,
) -> Result<JobClassification> {
    let signals_text = format_signals(signals);
    let title = job.title.as_deref().unwrap_or("N/A");
    let location = job.location.as_deref().unwrap_or("Not specified");
    let desc = job.description.as_deref().unwrap_or("");
    let desc_truncated = &desc[..desc.len().min(6000)];

    let user_prompt = USER_PROMPT_TEMPLATE
        .replace("{title}", title)
        .replace("{location}", location)
        .replace("{description}", desc_truncated)
        .replace("{structured_signals}", &signals_text);

    let request = deepseek::ChatRequest {
        model: crate::DEFAULT_MODEL.to_string(),
        messages: vec![
            deepseek::system_msg(SYSTEM_PROMPT),
            deepseek::user_msg(&user_prompt),
        ],
        tools: None,
        tool_choice: None,
        temperature: Some(0.3),
        max_tokens: Some(500),
        stream: Some(false),
    };

    let response = deepseek.chat(&request).await?;
    let content = response
        .choices
        .first()
        .map(|c| c.message.content.as_str())
        .unwrap_or("");

    if content.is_empty() {
        anyhow::bail!("Empty content in DeepSeek classify response");
    }

    let json_str = extract_json_object(content)?;
    let classification: JobClassification =
        serde_json::from_str(json_str).context("Failed to parse classification JSON")?;

    Ok(classification)
}

/// Persist a classification result to D1.
async fn persist_classification(
    db: &D1Client,
    job: &JobRow,
    classification: &JobClassification,
    source: &str,
) -> Result<()> {
    let title = job.title.as_deref().unwrap_or("");
    let loc = job.location.as_deref().unwrap_or("N/A");
    let evidence = format!(
        "title:{} | loc:{}",
        &title[..title.len().min(100)],
        &loc[..loc.len().min(80)],
    );
    let reason = format!("[{source}] {} | evidence:{evidence}", classification.reason);
    let score = classification.confidence.score();
    let job_status = if classification.is_remote_eu {
        status::EU_REMOTE
    } else {
        status::NON_EU
    };

    db.execute(
        "UPDATE jobs SET score = ?, score_reason = ?, status = ?, \
         is_remote_eu = ?, remote_eu_confidence = ?, remote_eu_reason = ?, \
         updated_at = datetime('now') WHERE id = ?",
        Some(vec![
            json!(score),
            json!(reason),
            json!(job_status),
            json!(if classification.is_remote_eu { 1 } else { 0 }),
            json!(classification.confidence.as_str()),
            json!(classification.reason),
            json!(job.id),
        ]),
    )
    .await?;

    Ok(())
}

/// Classify a single job using the 2-tier pipeline (heuristic -> DeepSeek).
/// Workers AI tier is skipped in native Rust — only available in CF Workers.
pub async fn classify_single_job(
    job: &JobRow,
    deepseek: &deepseek::DeepSeekClient<deepseek::ReqwestClient>,
) -> Result<(JobClassification, &'static str)> {
    let signals = extract_eu_signals(job);

    // Tier 0 — Keyword heuristic
    if let Some(result) = keyword_eu_classify(job, &signals) {
        return Ok((result, "heuristic"));
    }

    // Tier 1 — DeepSeek LLM
    let classification = classify_with_llm(job, &signals, deepseek).await?;
    Ok((classification, "deepseek"))
}

/// Classify a single job and persist the result to D1.
pub async fn classify_job_and_persist(
    db: &D1Client,
    job: &JobRow,
    deepseek: &deepseek::DeepSeekClient<deepseek::ReqwestClient>,
) -> Result<ClassifyResult> {
    let (classification, source) = classify_single_job(job, deepseek).await?;

    persist_classification(db, job, &classification, source).await?;

    Ok(ClassifyResult {
        is_remote_eu: classification.is_remote_eu,
        confidence: classification.confidence,
        source: source.to_string(),
    })
}

/// Result of the parallel heuristic pass — either resolved or needs LLM.
enum HeuristicOutcome {
    Resolved(JobClassification),
    NeedsLlm(SignalSet),
}

/// Run heuristic classification on all jobs in parallel using rayon.
/// Returns (job, outcome) pairs preserving original order.
fn parallel_heuristic_pass(jobs: &[JobRow]) -> Vec<(&JobRow, HeuristicOutcome)> {
    jobs.par_iter()
        .map(|job| {
            let signals = extract_eu_signals(job);
            match keyword_eu_classify(job, &signals) {
                Some(result) => (job, HeuristicOutcome::Resolved(result)),
                None => (job, HeuristicOutcome::NeedsLlm(signals)),
            }
        })
        .collect()
}

/// Batch classify all jobs at status='role-match'.
///
/// Phase 1: Parallel heuristic pass (rayon) — resolves unambiguous jobs on all cores.
/// Phase 2: Sequential LLM pass — only ambiguous jobs hit DeepSeek (rate-limited).
pub async fn classify_batch(
    db: &D1Client,
    deepseek: &deepseek::DeepSeekClient<deepseek::ReqwestClient>,
    limit: u32,
) -> Result<BatchStats> {
    info!("Fetching jobs ready for EU classification...");

    let jobs: Vec<JobRow> = db
        .query_as(
            "SELECT id, title, location, description, country, workplace_type, \
             offices, categories, ashby_is_remote, ashby_secondary_locations, \
             ashby_address, source_kind, company_key \
             FROM jobs WHERE status = ? ORDER BY created_at DESC LIMIT ?",
            Some(vec![json!(status::ROLE_MATCH), json!(limit)]),
        )
        .await?;

    info!("Found {} jobs to classify", jobs.len());
    let mut stats = BatchStats::default();

    // Phase 1: Parallel heuristic classification (rayon)
    let outcomes = parallel_heuristic_pass(&jobs);

    let mut heuristic_updates: Vec<(&JobRow, &JobClassification)> = Vec::new();
    let mut llm_queue: Vec<(&JobRow, SignalSet)> = Vec::new();

    for (job, outcome) in &outcomes {
        match outcome {
            HeuristicOutcome::Resolved(result) => {
                heuristic_updates.push((job, result));
            }
            HeuristicOutcome::NeedsLlm(signals) => {
                llm_queue.push((job, signals.clone()));
            }
        }
    }

    info!(
        "Heuristic pass: {} resolved, {} need LLM",
        heuristic_updates.len(),
        llm_queue.len()
    );

    // Persist heuristic results
    for (job, result) in &heuristic_updates {
        match persist_classification(db, job, result, "heuristic").await {
            Ok(_) => {
                stats.processed += 1;
                stats.heuristic += 1;
                if result.is_remote_eu {
                    stats.eu_remote += 1;
                } else {
                    stats.non_eu += 1;
                }
                info!(
                    "Job {}: {} ({}) [heuristic]",
                    job.id,
                    if result.is_remote_eu { "EU Remote" } else { "Non-EU" },
                    result.confidence
                );
            }
            Err(e) => {
                tracing::error!("Error persisting heuristic result for job {}: {e}", job.id);
                stats.errors += 1;
            }
        }
    }

    // Phase 2: Sequential LLM classification for ambiguous jobs
    for (job, signals) in &llm_queue {
        info!("LLM classifying job {}: {:?}", job.id, job.title);

        match classify_with_llm(job, signals, deepseek).await {
            Ok(result) => {
                match persist_classification(db, job, &result, "deepseek").await {
                    Ok(_) => {
                        stats.processed += 1;
                        stats.deepseek += 1;
                        if result.is_remote_eu {
                            stats.eu_remote += 1;
                        } else {
                            stats.non_eu += 1;
                        }
                        info!(
                            "  {} ({}) [deepseek]",
                            if result.is_remote_eu { "EU Remote" } else { "Non-EU" },
                            result.confidence
                        );
                    }
                    Err(e) => {
                        tracing::error!("Error persisting LLM result for job {}: {e}", job.id);
                        stats.errors += 1;
                    }
                }
                // Rate limit
                tokio::time::sleep(std::time::Duration::from_millis(200)).await;
            }
            Err(e) => {
                tracing::error!("Error LLM classifying job {}: {e}", job.id);
                stats.errors += 1;
            }
        }
    }

    Ok(stats)
}

/// Batch classify jobs from any non-terminal status, enhancing first if needed.
///
/// Phase 1: Sequential ATS enhancement for jobs missing descriptions.
/// Phase 2: Parallel heuristic pass (rayon) — resolves unambiguous jobs on all cores.
/// Phase 3: Sequential LLM pass — only ambiguous jobs hit DeepSeek (rate-limited).
pub async fn classify_batch_all(
    db: &D1Client,
    deepseek: &deepseek::DeepSeekClient<deepseek::ReqwestClient>,
    limit: u32,
) -> Result<BatchStats> {
    info!("Fetching jobs ready for enhance+classify pipeline...");

    let mut jobs: Vec<JobRow> = db
        .query_as(
            &format!(
                "SELECT {} FROM jobs WHERE status NOT IN (?, ?) ORDER BY created_at DESC LIMIT ?",
                crate::CLASSIFY_SELECT
            ),
            Some(vec![
                json!(status::EU_REMOTE),
                json!(status::NON_EU),
                json!(limit),
            ]),
        )
        .await?;

    info!("Found {} jobs to process", jobs.len());

    // Phase 1: Sequential ATS enhancement for jobs missing descriptions
    for job in jobs.iter_mut() {
        let desc_len = job.description.as_deref().map(|d| d.len()).unwrap_or(0);
        let is_ats = matches!(
            job.source_kind.as_deref(),
            Some("greenhouse") | Some("lever") | Some("ashby")
        );
        if desc_len < 100 && is_ats {
            info!("  Enhancing job {} (desc len: {})", job.id, desc_len);
            match crate::ats_enhance::enhance_single_by_id(db, job.id).await {
                Ok(enhanced) => *job = enhanced,
                Err(e) => {
                    tracing::warn!(
                        "Enhancement failed for job {}, using existing data: {e}",
                        job.id
                    );
                }
            }
        }
    }

    let mut stats = BatchStats::default();

    // Phase 2: Parallel heuristic classification (rayon)
    let outcomes = parallel_heuristic_pass(&jobs);

    let mut heuristic_updates: Vec<(&JobRow, &JobClassification)> = Vec::new();
    let mut llm_queue: Vec<(&JobRow, SignalSet)> = Vec::new();

    for (job, outcome) in &outcomes {
        match outcome {
            HeuristicOutcome::Resolved(result) => {
                heuristic_updates.push((job, result));
            }
            HeuristicOutcome::NeedsLlm(signals) => {
                llm_queue.push((job, signals.clone()));
            }
        }
    }

    info!(
        "Heuristic pass: {} resolved, {} need LLM",
        heuristic_updates.len(),
        llm_queue.len()
    );

    // Persist heuristic results
    for (job, result) in &heuristic_updates {
        match persist_classification(db, job, result, "heuristic").await {
            Ok(_) => {
                stats.processed += 1;
                stats.heuristic += 1;
                if result.is_remote_eu {
                    stats.eu_remote += 1;
                } else {
                    stats.non_eu += 1;
                }
                info!(
                    "Job {}: {} ({}) [heuristic]",
                    job.id,
                    if result.is_remote_eu { "EU Remote" } else { "Non-EU" },
                    result.confidence
                );
            }
            Err(e) => {
                tracing::error!("Error persisting heuristic result for job {}: {e}", job.id);
                stats.errors += 1;
            }
        }
    }

    // Phase 3: Sequential LLM classification for ambiguous jobs
    for (job, signals) in &llm_queue {
        info!("LLM classifying job {}: {:?}", job.id, job.title);

        match classify_with_llm(job, signals, deepseek).await {
            Ok(result) => {
                match persist_classification(db, job, &result, "deepseek").await {
                    Ok(_) => {
                        stats.processed += 1;
                        stats.deepseek += 1;
                        if result.is_remote_eu {
                            stats.eu_remote += 1;
                        } else {
                            stats.non_eu += 1;
                        }
                        info!(
                            "  {} ({}) [deepseek]",
                            if result.is_remote_eu { "EU Remote" } else { "Non-EU" },
                            result.confidence
                        );
                    }
                    Err(e) => {
                        tracing::error!("Error persisting LLM result for job {}: {e}", job.id);
                        stats.errors += 1;
                    }
                }
                tokio::time::sleep(std::time::Duration::from_millis(200)).await;
            }
            Err(e) => {
                tracing::error!("Error LLM classifying job {}: {e}", job.id);
                stats.errors += 1;
            }
        }
    }

    Ok(stats)
}

#[derive(Debug)]
pub struct ClassifyResult {
    pub is_remote_eu: bool,
    pub confidence: Confidence,
    pub source: String,
}

#[derive(Debug, Default)]
pub struct BatchStats {
    pub processed: u32,
    pub eu_remote: u32,
    pub non_eu: u32,
    pub errors: u32,
    pub heuristic: u32,
    pub deepseek: u32,
}
