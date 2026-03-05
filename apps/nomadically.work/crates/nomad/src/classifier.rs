use anyhow::{Context, Result};
use regex::Regex;
use serde_json::json;
use tracing::info;

use crate::d1::D1Client;
use crate::heuristic::keyword_eu_classify;
use crate::signals::{extract_eu_signals, format_signals};
use crate::{Confidence, JobClassification, JobRow, status};

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

/// Classify a single job using the 2-tier pipeline (heuristic -> DeepSeek).
/// Workers AI tier is skipped in native Rust — only available in CF Workers.
pub async fn classify_single_job(
    job: &JobRow,
    deepseek: &deepseek::DeepSeekClient<deepseek::ReqwestClient>,
) -> Result<(JobClassification, &'static str)> {
    let signals = extract_eu_signals(job);
    let signals_text = format_signals(&signals);

    // Tier 0 — Keyword heuristic
    if let Some(result) = keyword_eu_classify(job, &signals) {
        return Ok((result, "heuristic"));
    }

    // Tier 1 — DeepSeek LLM
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

    Ok((classification, "deepseek"))
}

/// Classify a single job and persist the result to D1.
pub async fn classify_job_and_persist(
    db: &D1Client,
    job: &JobRow,
    deepseek: &deepseek::DeepSeekClient<deepseek::ReqwestClient>,
) -> Result<ClassifyResult> {
    let (classification, source) = classify_single_job(job, deepseek).await?;

    let evidence = format!(
        "title:{} | loc:{}",
        job.title.as_deref().unwrap_or("")[..job.title.as_deref().unwrap_or("").len().min(100)].to_string(),
        job.location.as_deref().unwrap_or("N/A")[..job.location.as_deref().unwrap_or("N/A").len().min(80)].to_string(),
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

    Ok(ClassifyResult {
        is_remote_eu: classification.is_remote_eu,
        confidence: classification.confidence,
        source: source.to_string(),
    })
}

/// Batch classify all jobs at status='role-match'.
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

    for job in &jobs {
        info!("Classifying job {}: {:?}", job.id, job.title);

        match classify_job_and_persist(db, job, deepseek).await {
            Ok(result) => {
                stats.processed += 1;
                if result.is_remote_eu {
                    stats.eu_remote += 1;
                } else {
                    stats.non_eu += 1;
                }
                match result.source.as_str() {
                    "heuristic" => stats.heuristic += 1,
                    "deepseek" => stats.deepseek += 1,
                    _ => {}
                }
                info!(
                    "  {} ({}) [{}]",
                    if result.is_remote_eu { "EU Remote" } else { "Non-EU" },
                    result.confidence,
                    result.source
                );

                // Rate limit for DeepSeek
                if result.source == "deepseek" {
                    tokio::time::sleep(std::time::Duration::from_millis(200)).await;
                }
            }
            Err(e) => {
                tracing::error!("Error classifying job {}: {e}", job.id);
                stats.errors += 1;
            }
        }
    }

    Ok(stats)
}

/// Batch classify jobs from any non-terminal status, enhancing first if needed.
pub async fn classify_batch_all(
    db: &D1Client,
    deepseek: &deepseek::DeepSeekClient<deepseek::ReqwestClient>,
    limit: u32,
) -> Result<BatchStats> {
    info!("Fetching jobs ready for enhance+classify pipeline...");

    let jobs: Vec<JobRow> = db
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

    let mut stats = BatchStats::default();

    for job in &jobs {
        info!("Processing job {}: {:?}", job.id, job.title);

        // Enhance first if description is missing/short and source is ATS
        let job = {
            let desc_len = job.description.as_deref().map(|d| d.len()).unwrap_or(0);
            let is_ats = matches!(
                job.source_kind.as_deref(),
                Some("greenhouse") | Some("lever") | Some("ashby")
            );

            if desc_len < 100 && is_ats {
                info!("  Enhancing job {} (desc len: {})", job.id, desc_len);
                match crate::ats_enhance::enhance_single_by_id(db, job.id).await {
                    Ok(enhanced) => enhanced,
                    Err(e) => {
                        tracing::warn!("Enhancement failed for job {}, using existing data: {e}", job.id);
                        job.clone()
                    }
                }
            } else {
                job.clone()
            }
        };

        match classify_job_and_persist(db, &job, deepseek).await {
            Ok(result) => {
                stats.processed += 1;
                if result.is_remote_eu {
                    stats.eu_remote += 1;
                } else {
                    stats.non_eu += 1;
                }
                match result.source.as_str() {
                    "heuristic" => stats.heuristic += 1,
                    "deepseek" => stats.deepseek += 1,
                    _ => {}
                }
                info!(
                    "  {} ({}) [{}]",
                    if result.is_remote_eu { "EU Remote" } else { "Non-EU" },
                    result.confidence,
                    result.source
                );

                if result.source == "deepseek" {
                    tokio::time::sleep(std::time::Duration::from_millis(200)).await;
                }
            }
            Err(e) => {
                tracing::error!("Error classifying job {}: {e}", job.id);
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
