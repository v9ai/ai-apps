//! Headless Chrome Resend email scraper.
//!
//! Launches headless Chrome, lists email IDs via Resend API, then opens
//! parallel browser tabs to render each email's HTML and extract clean
//! body text via `innerText`. This gives far better text extraction than
//! regex HTML stripping, and leverages Chrome's HTTP/2 connection pool
//! for parallel fetches.
//!
//! Usage:
//!   RESEND_API_KEY=re_xxx cargo run --bin resend_scrape
//!   RESEND_API_KEY=re_xxx cargo run --bin resend_scrape -- --tabs 10 --limit 500

use anyhow::{bail, Context, Result};
use chromiumoxide::browser::{Browser, BrowserConfig};
use chromiumoxide::Page;
use futures::StreamExt;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::io::Write;
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Instant;

// ── Config ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT: &str = "You write B2B outreach emails for Vadim Nicolai, \
    Senior Software Engineer (10+ years: React, TypeScript, AI/ML, Rust, Node.js, GraphQL). \
    Output ONLY valid JSON: {\"subject\": \"...\", \"body\": \"...\"}";

const OUT_DIR: &str = "mlx-training/data/outreach-email";
const USEFUL_EVENTS: &[&str] = &["delivered", "clicked", "opened", "sent"];
const MAX_PER_SUBJECT: usize = 5;

const SKIP_SUBJECTS: &[&str] = &[
    "verify", "password", "welcome", "confirm", "notification", "unsubscribe",
];

const SKIP_CONTENT: &[&str] = &[
    "ir35", "contract position", "contract roles", "contract availability",
    "contract inquiry", "contract opportunities",
    "crypto", "trading", "blockchain", "defi", "web3", "nft",
];

const FREE_EMAIL_DOMAINS: &[&str] = &["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];

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

fn word_count(text: &str) -> usize {
    text.split_whitespace().count()
}

fn extract_recipient_name(to: &serde_json::Value) -> Option<String> {
    let addr = if let Some(arr) = to.as_array() {
        arr.first()?.as_str()?
    } else {
        to.as_str()?
    };
    if let Some(pos) = addr.find('<') {
        let name = addr[..pos].trim();
        if !name.is_empty() {
            return Some(name.to_string());
        }
    }
    if let Some(pos) = addr.find('@') {
        let local = &addr[..pos];
        let clean: String = local
            .chars()
            .map(|c| if c == '.' || c == '_' || c == '-' { ' ' } else { c })
            .collect();
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
    let name = to
        .as_ref()
        .and_then(extract_recipient_name)
        .unwrap_or_else(|| "there".to_string());
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

// ── API listing (reuse from resend_export) ──────────────────────────────────

async fn list_all_emails(api_key: &str, limit: usize) -> Result<Vec<EmailListItem>> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let mut all = Vec::new();
    let mut after: Option<String> = None;
    let mut page = 0u32;

    loop {
        page += 1;
        if page % 10 == 1 {
            eprintln!("  Listing page {}...", page);
        }

        let mut url = "https://api.resend.com/emails?limit=100".to_string();
        if let Some(ref after_id) = after {
            url.push_str(&format!("&after={}", after_id));
        }

        let mut retries = 0u64;
        let result: ListResponse = loop {
            let resp = client
                .get(&url)
                .header(AUTHORIZATION, format!("Bearer {}", api_key))
                .header(CONTENT_TYPE, "application/json")
                .send()
                .await;

            match resp {
                Ok(r) if r.status().is_success() => {
                    break r.json().await.context("parse list response")?;
                }
                Ok(r) if r.status() == 429 => {
                    retries += 1;
                    if retries > 5 {
                        bail!("rate limited too many times on list");
                    }
                    let backoff = 2000 * retries;
                    eprintln!("  Rate limited, waiting {}ms...", backoff);
                    tokio::time::sleep(std::time::Duration::from_millis(backoff)).await;
                }
                Ok(r) => bail!("list failed: {}", r.status()),
                Err(e) => {
                    retries += 1;
                    if retries > 3 {
                        return Err(e.into());
                    }
                    tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
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
        tokio::time::sleep(std::time::Duration::from_millis(300)).await;
    }

    all.truncate(limit);
    eprintln!("  Listed: {} emails", all.len());

    let before = all.len();
    all.retain(|e| {
        e.last_event
            .as_deref()
            .map(|ev| USEFUL_EVENTS.contains(&ev))
            .unwrap_or(false)
    });
    eprintln!("  Filtered: {} → {} (useful events)", before, all.len());

    Ok(all)
}

// ── Headless Chrome rendering ───────────────────────────────────────────────

/// Render an email's HTML in a headless Chrome tab and extract innerText.
/// Falls back to the plain text field if available.
async fn render_email_in_tab(
    page: &Page,
    api_key: &str,
    email_id: &str,
) -> Result<EmailDetail> {
    // Use page.evaluate to fetch the email via the Resend API from within Chrome.
    // This leverages Chrome's HTTP/2 connection pooling and avoids external rate limits
    // being applied per-connection (browser shares a single connection).
    let js = format!(
        r#"
        async function() {{
            const resp = await fetch("https://api.resend.com/emails/{email_id}", {{
                headers: {{
                    "Authorization": "Bearer {api_key}",
                    "Content-Type": "application/json"
                }}
            }});
            if (!resp.ok) {{
                if (resp.status === 429) throw new Error("RATE_LIMITED");
                throw new Error("HTTP " + resp.status);
            }}
            const data = await resp.json();

            // If we have HTML but no text, render it and extract innerText
            if (data.html && !data.text) {{
                const div = document.createElement('div');
                div.innerHTML = data.html;
                data.rendered_text = div.innerText || div.textContent || '';
            }}

            return JSON.stringify({{
                subject: data.subject || null,
                text: data.text || data.rendered_text || null,
                html: data.html || null
            }});
        }}
        "#,
    );

    let result = page.evaluate(js).await?;
    let json_str = result
        .into_value::<String>()
        .context("evaluate returned non-string")?;

    serde_json::from_str::<EmailDetail>(&json_str).context("parse email detail JSON")
}

/// Process emails through dedicated worker tasks — one per Chrome tab.
/// Each worker owns its tab exclusively and pulls work from a shared queue.
async fn fetch_with_chrome_workers(
    browser: &Browser,
    api_key: &str,
    emails: &[EmailListItem],
    num_tabs: usize,
) -> Vec<Option<EmailDetail>> {
    let total = emails.len();

    // Work queue: (index, email_id)
    let (work_tx, work_rx) = async_channel::bounded::<(usize, String)>(num_tabs * 2);

    // Results collected via channel
    let (result_tx, mut result_rx) =
        tokio::sync::mpsc::channel::<(usize, Option<EmailDetail>)>(num_tabs * 2);

    let completed = Arc::new(AtomicUsize::new(0));
    let rate_limited = Arc::new(AtomicUsize::new(0));

    // Spawn one worker per tab — each owns its page exclusively
    let mut workers = Vec::new();
    for tab_id in 0..num_tabs {
        let page = match browser.new_page("about:blank").await {
            Ok(p) => p,
            Err(e) => {
                eprintln!("  Tab {} failed to create: {}", tab_id, e);
                continue;
            }
        };
        let work_rx = work_rx.clone();
        let result_tx = result_tx.clone();
        let api_key = api_key.to_string();
        let completed = Arc::clone(&completed);
        let rate_limited = Arc::clone(&rate_limited);

        workers.push(tokio::spawn(async move {
            while let Ok((idx, email_id)) = work_rx.recv().await {
                let mut retries = 0u64;
                let detail = loop {
                    match render_email_in_tab(&page, &api_key, &email_id).await {
                        Ok(d) => break Some(d),
                        Err(e) => {
                            let msg = format!("{}", e);
                            if msg.contains("RATE_LIMITED") {
                                retries += 1;
                                rate_limited.fetch_add(1, Ordering::Relaxed);
                                if retries > 4 {
                                    break None;
                                }
                                tokio::time::sleep(
                                    std::time::Duration::from_millis(1500 * retries),
                                )
                                .await;
                            } else {
                                retries += 1;
                                if retries > 2 {
                                    eprintln!("  [tab {}] {} failed: {}", tab_id, email_id, e);
                                    break None;
                                }
                                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                            }
                        }
                    }
                };

                result_tx.send((idx, detail)).await.ok();

                let done = completed.fetch_add(1, Ordering::Relaxed) + 1;
                if done % 200 == 0 || done == total {
                    let rl = rate_limited.load(Ordering::Relaxed);
                    eprintln!("  Fetched: {}/{} (rate_limited: {})", done, total, rl);
                }

                // Small delay between requests per worker
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            }
        }));
    }
    eprintln!("  Started {} worker tabs", workers.len());
    drop(result_tx); // Drop sender so result_rx closes when all workers finish

    // Feed work queue
    let feeder = tokio::spawn(async move {
        for (idx, email) in emails.iter().enumerate() {
            if work_tx.send((idx, email.id.clone())).await.is_err() {
                break;
            }
        }
    });

    // Collect results
    let mut results: Vec<Option<EmailDetail>> = (0..total).map(|_| None).collect();
    while let Some((idx, detail)) = result_rx.recv().await {
        results[idx] = detail;
    }

    feeder.await.ok();
    for w in workers {
        w.await.ok();
    }

    results
}

// ── Filtering and output ────────────────────────────────────────────────────

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

    // Prefer text, then rendered HTML text
    let body = if let Some(ref text) = detail.text {
        text.trim().to_string()
    } else {
        return None; // HTML-only emails should have rendered_text set by Chrome
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

    let lower_subject = subject.to_lowercase();
    if SKIP_SUBJECTS.iter().any(|kw| lower_subject.contains(kw)) {
        return None;
    }

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

    let limit = args
        .iter()
        .position(|a| a == "--limit")
        .and_then(|i| args.get(i + 1))
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(usize::MAX);

    let num_tabs = args
        .iter()
        .position(|a| a == "--tabs")
        .and_then(|i| args.get(i + 1))
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(8);

    // Step 1: List emails via API
    eprintln!("Step 1: Listing emails via Resend API...");
    let emails = list_all_emails(&api_key, limit).await?;
    eprintln!("Total to fetch: {}", emails.len());

    // Step 2: Launch headless Chrome
    eprintln!("\nStep 2: Launching headless Chrome ({} tabs)...", num_tabs);

    let (browser, mut handler) = Browser::launch(
        BrowserConfig::builder()
            .chrome_executable(
                std::path::PathBuf::from("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
            )
            .arg("--disable-gpu")
            .arg("--no-sandbox")
            .arg("--disable-dev-shm-usage")
            .arg("--disable-extensions")
            .arg("--disable-background-networking")
            .build()
            .map_err(|e| anyhow::anyhow!("{}", e))?,
    )
    .await
    .context("failed to launch Chrome")?;

    // Drive the CDP event loop in background
    let event_handle = tokio::spawn(async move {
        while let Some(h) = handler.next().await {
            if h.is_err() {
                break;
            }
        }
    });

    eprintln!("  Chrome launched");

    // Step 3: Fetch email details through Chrome tabs
    eprintln!(
        "\nStep 3: Fetching {} email details via {} Chrome tabs...",
        emails.len(),
        num_tabs
    );
    let details = fetch_with_chrome_workers(&browser, &api_key, &emails, num_tabs).await;

    // Step 4: Process, filter, dedup
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

    // Step 5: Write output
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

    // Cleanup
    drop(browser);
    event_handle.abort();

    let elapsed = start.elapsed();
    println!(
        "Written {} records to {} ({:.1}s, {} tabs)",
        deduped.len(),
        out_path.display(),
        elapsed.as_secs_f64(),
        num_tabs,
    );
    println!("Metadata written to {}", meta_path.display());

    Ok(())
}
