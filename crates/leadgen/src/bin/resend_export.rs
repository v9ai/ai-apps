//! Parallel Resend email exporter for MLX training data.
//!
//! Fetches all sent emails from the Resend API, filters for quality outreach
//! emails (≥80 words, no crypto/trading, no transactional), deduplicates,
//! and writes chat-format JSONL for LoRA fine-tuning.
//!
//! Usage:
//!   RESEND_API_KEY=re_xxx cargo run --bin resend_export
//!   RESEND_API_KEY=re_xxx cargo run --bin resend_export -- --stats
//!   RESEND_API_KEY=re_xxx cargo run --bin resend_export -- --limit 500 --concurrency 8

use anyhow::{bail, Context, Result};
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::io::Write;
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Semaphore;

// ── Config ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT: &str = "You write B2B outreach emails for Vadim Nicolai, \
    Senior Software Engineer (10+ years: React, TypeScript, AI/ML, Rust, Node.js, GraphQL). \
    Output ONLY valid JSON: {\"subject\": \"...\", \"body\": \"...\"}";

const OUT_DIR: &str = "mlx-training/data/outreach-email";

const USEFUL_EVENTS: &[&str] = &["delivered", "clicked", "opened", "sent"];

const SKIP_SUBJECTS: &[&str] = &[
    "verify", "password", "welcome", "confirm", "notification", "unsubscribe",
];

const SKIP_CONTENT: &[&str] = &[
    "ir35",
    "contract position",
    "contract roles",
    "contract availability",
    "contract inquiry",
    "contract opportunities",
    "crypto",
    "trading",
    "blockchain",
    "defi",
    "web3",
    "nft",
];

const FREE_EMAIL_DOMAINS: &[&str] = &["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];

const MAX_PER_SUBJECT: usize = 3;

// ── Resend API types ────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct ListResponse {
    data: Vec<EmailListItem>,
}

#[derive(Debug, Deserialize, Clone)]
struct EmailListItem {
    id: String,
    to: Option<serde_json::Value>,
    subject: Option<String>,
    created_at: Option<String>,
    last_event: Option<String>,
}

#[derive(Debug, Deserialize)]
struct EmailDetail {
    subject: Option<String>,
    to: Option<serde_json::Value>,
    text: Option<String>,
    html: Option<String>,
}

// ── Training data types ─────────────────────────────────────────────────────

#[derive(Serialize)]
struct TrainingRecord {
    messages: Vec<Message>,
}

#[derive(Serialize)]
struct Message {
    role: &'static str,
    content: String,
}

#[derive(Serialize)]
struct Meta {
    resend_id: String,
    to: Option<serde_json::Value>,
    created_at: Option<String>,
    subject: String,
    word_count: usize,
}

// ── Helpers ─────────────────────────────────────────────────────────────────

fn strip_html(html: &str) -> String {
    // Remove tags, decode entities, collapse whitespace
    let no_tags = regex::Regex::new(r"<[^>]+>").unwrap().replace_all(html, " ");
    let no_entities = regex::Regex::new(r"&(?:#\d+|#x[\da-fA-F]+|\w+);")
        .unwrap()
        .replace_all(&no_tags, " ");
    no_entities.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn word_count(text: &str) -> usize {
    text.split_whitespace().count()
}

fn extract_recipient_name(to: &serde_json::Value) -> Option<String> {
    let addr = if let Some(arr) = to.as_array() {
        arr.first()?.as_str()?
    } else {
        to.as_str()?
    };

    // "Vadim <v@x.com>" → "Vadim"
    if let Some(pos) = addr.find('<') {
        let name = addr[..pos].trim();
        if !name.is_empty() {
            return Some(name.to_string());
        }
    }
    // email local part
    if let Some(pos) = addr.find('@') {
        let local = &addr[..pos];
        let clean: String = local.chars().map(|c| if c == '.' || c == '_' || c == '-' { ' ' } else { c }).collect();
        return clean.split_whitespace().next().map(|s| s.to_string());
    }
    None
}

fn extract_domain(to: &serde_json::Value) -> Option<String> {
    let addr = if let Some(arr) = to.as_array() {
        arr.first()?.as_str()?.to_string()
    } else {
        to.as_str()?.to_string()
    };
    // Extract from "Name <email>" or plain email
    let email = if let Some(start) = addr.find('<') {
        let end = addr.find('>').unwrap_or(addr.len());
        &addr[start + 1..end]
    } else {
        &addr
    };
    email.split('@').nth(1).map(|d| d.to_string())
}

fn build_user_message(to: &Option<serde_json::Value>) -> String {
    let mut parts = vec!["Write an initial outreach email.".to_string(), String::new()];

    parts.push("RECIPIENT:".to_string());

    let name = to.as_ref().and_then(extract_recipient_name).unwrap_or_else(|| "there".to_string());
    parts.push(format!("- Name: {}", name));

    if let Some(ref to_val) = to {
        if let Some(domain) = extract_domain(to_val) {
            if !FREE_EMAIL_DOMAINS.contains(&domain.as_str()) {
                parts.push(format!("- Company domain: {}", domain));
            }
        }
    }
    parts.push(String::new());

    parts.push("INSTRUCTIONS:".to_string());
    parts.push("- Cold outreach to explore engineering opportunities".to_string());
    parts.push("- Highlight relevant experience only".to_string());
    parts.push("- 100-180 words, one clear CTA".to_string());
    parts.push("- Use {{name}} placeholder for recipient name".to_string());

    parts.join("\n")
}

fn build_assistant_message(subject: &str, body: &str) -> String {
    let content = serde_json::json!({ "subject": subject, "body": body });
    format!("<think>\n</think>\n{}", content)
}

// ── API client ──────────────────────────────────────────────────────────────

struct ResendClient {
    client: reqwest::Client,
    api_key: String,
}

impl ResendClient {
    fn new(api_key: String) -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("failed to build HTTP client");
        Self { client, api_key }
    }

    async fn list_emails(&self, after: Option<&str>) -> Result<ListResponse> {
        let mut url = "https://api.resend.com/emails?limit=100".to_string();
        if let Some(after_id) = after {
            url.push_str(&format!("&after={}", after_id));
        }

        let resp = self
            .client
            .get(&url)
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .header(CONTENT_TYPE, "application/json")
            .send()
            .await?;

        if resp.status() == 429 {
            bail!("rate limited");
        }
        resp.json::<ListResponse>()
            .await
            .context("failed to parse list response")
    }

    async fn get_email(&self, id: &str) -> Result<EmailDetail> {
        let url = format!("https://api.resend.com/emails/{}", id);

        let resp = self
            .client
            .get(&url)
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .header(CONTENT_TYPE, "application/json")
            .send()
            .await?;

        if resp.status() == 429 {
            bail!("rate limited");
        }
        resp.json::<EmailDetail>()
            .await
            .context("failed to parse email detail")
    }
}

// ── Core logic ──────────────────────────────────────────────────────────────

async fn fetch_all_email_ids(client: &ResendClient, limit: usize) -> Result<Vec<EmailListItem>> {
    let mut all = Vec::new();
    let mut after: Option<String> = None;
    let mut page = 0u32;

    loop {
        page += 1;
        if page % 10 == 1 {
            eprintln!("  Listing page {}...", page);
        }

        let mut retries = 0;
        let result = loop {
            match client.list_emails(after.as_deref()).await {
                Ok(r) => break r,
                Err(e) => {
                    retries += 1;
                    if retries > 3 {
                        return Err(e);
                    }
                    let backoff = 2000 * retries;
                    eprintln!("  Rate limited on list, waiting {}ms (retry {}/3)...", backoff, retries);
                    tokio::time::sleep(std::time::Duration::from_millis(backoff)).await;
                }
            }
        };

        if result.data.is_empty() {
            break;
        }

        let last_id = result.data.last().map(|e| e.id.clone());
        all.extend(result.data);

        if page % 10 == 0 {
            eprintln!("  Page {}: {} total", page, all.len());
        }

        if all.len() >= limit {
            break;
        }

        after = last_id;
        // 300ms between list calls to stay under rate limit
        tokio::time::sleep(std::time::Duration::from_millis(300)).await;
    }

    all.truncate(limit);
    eprintln!("  Listed: {} emails", all.len());

    // Filter to useful events
    let before = all.len();
    all.retain(|e| {
        e.last_event
            .as_deref()
            .map(|ev| USEFUL_EVENTS.contains(&ev))
            .unwrap_or(false)
    });
    eprintln!(
        "  Filtered: {} → {} (kept delivered/clicked/opened/sent)",
        before,
        all.len()
    );

    Ok(all)
}

async fn fetch_all_details(
    client: Arc<ResendClient>,
    emails: &[EmailListItem],
    concurrency: usize,
) -> Vec<Option<EmailDetail>> {
    let sem = Arc::new(Semaphore::new(concurrency));
    let completed = Arc::new(AtomicUsize::new(0));
    let total = emails.len();

    let mut handles = Vec::with_capacity(total);

    for email in emails {
        let id = email.id.clone();
        let client = Arc::clone(&client);
        let sem = Arc::clone(&sem);
        let completed = Arc::clone(&completed);

        let handle = tokio::spawn(async move {
            let _permit = sem.acquire().await.unwrap();

            // Retry with backoff
            let mut retries = 0u64;
            let result = loop {
                match client.get_email(&id).await {
                    Ok(detail) => break Some(detail),
                    Err(e) => {
                        retries += 1;
                        if retries > 3 {
                            eprintln!("  Failed to fetch {}: {}", id, e);
                            break None;
                        }
                        let backoff = 1000 * retries;
                        tokio::time::sleep(std::time::Duration::from_millis(backoff)).await;
                    }
                }
            };

            let done = completed.fetch_add(1, Ordering::Relaxed) + 1;
            if done % 200 == 0 || done == total {
                eprintln!("  Fetched: {}/{}", done, total);
            }

            // Small delay between requests to respect rate limits
            tokio::time::sleep(std::time::Duration::from_millis(150)).await;

            result
        });

        handles.push(handle);
    }

    let mut results = Vec::with_capacity(total);
    for handle in handles {
        results.push(handle.await.unwrap_or(None));
    }
    results
}

fn process_email(
    list_item: &EmailListItem,
    detail: &EmailDetail,
) -> Option<(TrainingRecord, Meta)> {
    let subject = detail
        .subject
        .as_deref()
        .or(list_item.subject.as_deref())
        .unwrap_or("")
        .trim()
        .to_string();

    let body = if let Some(ref text) = detail.text {
        text.trim().to_string()
    } else if let Some(ref html) = detail.html {
        strip_html(html)
    } else {
        return None;
    };

    if subject.is_empty() || body.is_empty() {
        return None;
    }

    let wc = word_count(&body);
    if wc < 40 || wc > 500 {
        return None;
    }
    if subject.len() < 5 {
        return None;
    }

    // Skip transactional
    let lower_subject = subject.to_lowercase();
    if SKIP_SUBJECTS.iter().any(|kw| lower_subject.contains(kw)) {
        return None;
    }

    // Skip crypto/trading/contractor
    let lower_body = body.to_lowercase();
    let combined = format!("{} {}", lower_subject, lower_body);
    if SKIP_CONTENT.iter().any(|kw| combined.contains(kw)) {
        return None;
    }

    let user_msg = build_user_message(&list_item.to);
    let assistant_msg = build_assistant_message(&subject, &body);

    let record = TrainingRecord {
        messages: vec![
            Message {
                role: "system",
                content: SYSTEM_PROMPT.to_string(),
            },
            Message {
                role: "user",
                content: user_msg,
            },
            Message {
                role: "assistant",
                content: assistant_msg,
            },
        ],
    };

    let meta = Meta {
        resend_id: list_item.id.clone(),
        to: list_item.to.clone(),
        created_at: list_item.created_at.clone(),
        subject,
        word_count: wc,
    };

    Some((record, meta))
}

fn dedup(records: Vec<(TrainingRecord, Meta)>) -> Vec<(TrainingRecord, Meta)> {
    let mut seen = HashSet::new();
    let mut subject_counts: HashMap<String, usize> = HashMap::new();
    let mut result = Vec::new();

    for (rec, meta) in records {
        let body_start = &rec.messages[2].content[..rec.messages[2].content.len().min(200)];
        let key = format!("{}|||{}", meta.subject, body_start);

        if seen.contains(&key) {
            continue;
        }
        seen.insert(key);

        let count = subject_counts.entry(meta.subject.clone()).or_insert(0);
        *count += 1;
        if *count > MAX_PER_SUBJECT {
            continue;
        }

        result.push((rec, meta));
    }

    result
}

// ── Main ────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<()> {
    let start = Instant::now();

    let api_key =
        std::env::var("RESEND_API_KEY").context("RESEND_API_KEY environment variable not set")?;

    let args: Vec<String> = std::env::args().collect();
    let stats_only = args.contains(&"--stats".to_string());

    let limit = args
        .iter()
        .position(|a| a == "--limit")
        .and_then(|i| args.get(i + 1))
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(usize::MAX);

    let concurrency = args
        .iter()
        .position(|a| a == "--concurrency")
        .and_then(|i| args.get(i + 1))
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(6); // 6 concurrent with 150ms delay ≈ ~6-7 req/sec (under 10/sec limit)

    let client = Arc::new(ResendClient::new(api_key));

    eprintln!("Fetching sent emails from Resend...");
    let emails = fetch_all_email_ids(&client, limit).await?;
    eprintln!("Total emails from Resend: {}", emails.len());

    if stats_only {
        let mut by_status: HashMap<String, usize> = HashMap::new();
        for e in &emails {
            let status = e.last_event.as_deref().unwrap_or("unknown");
            *by_status.entry(status.to_string()).or_insert(0) += 1;
        }
        println!("\nResend emails: {}", emails.len());
        println!("By last_event: {:?}", by_status);
        return Ok(());
    }

    eprintln!(
        "\nFetching full content for {} emails ({} concurrent)...",
        emails.len(),
        concurrency
    );
    let details = fetch_all_details(Arc::clone(&client), &emails, concurrency).await;

    let mut records = Vec::new();
    let mut skipped = 0usize;
    let mut fetch_errors = 0usize;

    for (i, detail) in details.iter().enumerate() {
        match detail {
            None => fetch_errors += 1,
            Some(d) => match process_email(&emails[i], d) {
                Some(rec) => records.push(rec),
                None => skipped += 1,
            },
        }
    }

    eprintln!(
        "\nBefore dedup: {} valid, {} skipped, {} fetch errors",
        records.len(),
        skipped,
        fetch_errors
    );

    let deduped = dedup(records);
    eprintln!(
        "After dedup: {} unique (max {}/subject)",
        deduped.len(),
        MAX_PER_SUBJECT
    );

    // Write JSONL
    std::fs::create_dir_all(OUT_DIR)?;

    let out_path = Path::new(OUT_DIR).join("resend.jsonl");
    let mut out_file = std::fs::File::create(&out_path)?;
    for (rec, _) in &deduped {
        serde_json::to_writer(&mut out_file, rec)?;
        out_file.write_all(b"\n")?;
    }

    let meta_path = Path::new(OUT_DIR).join("resend_meta.jsonl");
    let mut meta_file = std::fs::File::create(&meta_path)?;
    for (_, meta) in &deduped {
        serde_json::to_writer(&mut meta_file, meta)?;
        meta_file.write_all(b"\n")?;
    }

    let elapsed = start.elapsed();
    println!(
        "Written {} records to {} ({:.1}s, {} concurrent)",
        deduped.len(),
        out_path.display(),
        elapsed.as_secs_f64(),
        concurrency,
    );
    println!("Metadata written to {}", meta_path.display());

    Ok(())
}
