use anyhow::Result;
use futures::stream::{self, StreamExt};
use reqwest::Client;
use sqlx::PgPool;
use tracing::{info, warn};

use crate::{cdx, db, extract};

const WARC_CONCURRENCY: usize = 8;

pub struct RunStats {
    pub domain: String,
    pub pages_fetched: usize,
    pub pages_skipped_dedup: usize,
    pub persons_found: usize,
    pub emails_found: usize,
    pub contacts_upserted: usize,
    pub snapshots_written: usize,
    pub crawl_id: String,
}

pub async fn run_domain(
    client: &Client,
    pool: &PgPool,
    domain: &str,
    max_pages: usize,
    dry_run: bool,
) -> Result<RunStats> {
    let (crawl_id, mut records) = cdx::query_domain_multi(client, domain, max_pages * 4).await?;

    if records.is_empty() {
        info!(domain = %domain, "no CC records found");
        return Ok(RunStats {
            domain: domain.to_string(),
            pages_fetched: 0,
            pages_skipped_dedup: 0,
            persons_found: 0,
            emails_found: 0,
            contacts_upserted: 0,
            snapshots_written: 0,
            crawl_id,
        });
    }

    // Sort by page score descending, then take up to max_pages
    records.sort_by(|a, b| {
        cdx::page_score(&b.url).partial_cmp(&cdx::page_score(&a.url)).unwrap_or(std::cmp::Ordering::Equal)
    });
    records.truncate(max_pages);

    info!(domain = %domain, pages = records.len(), crawl_id = %crawl_id, "fetching WARC snapshots");

    // Fetch WARC bodies concurrently
    let fetched: Vec<(cdx::CdxRecord, Result<String>)> = stream::iter(records.clone())
        .map(|record| {
            let client = client.clone();
            async move {
                let html = cdx::fetch_warc_html(&client, &record).await;
                (record, html)
            }
        })
        .buffer_unordered(WARC_CONCURRENCY)
        .collect()
        .await;

    let company_id = if !dry_run {
        db::company_id_by_domain(pool, domain).await?
    } else {
        None
    };

    let mut stats = RunStats {
        domain: domain.to_string(),
        pages_fetched: 0,
        pages_skipped_dedup: 0,
        persons_found: 0,
        emails_found: 0,
        contacts_upserted: 0,
        snapshots_written: 0,
        crawl_id: crawl_id.clone(),
    };

    // Track the freshest record for last_seen update
    let anchor = records.iter().max_by(|a, b| a.timestamp.cmp(&b.timestamp)).cloned();

    for (record, html_result) in fetched {
        match html_result {
            Err(e) => {
                warn!(url = %record.url, error = %e, "WARC fetch failed");
                continue;
            }
            Ok(html) => {
                stats.pages_fetched += 1;
                let content = extract::extract(&html, &record.url);
                stats.persons_found += content.persons.len();
                stats.emails_found += content.emails.len();

                if dry_run {
                    info!(
                        url = %record.url,
                        page_type = ?content.page_type,
                        persons = content.persons.len(),
                        emails = content.emails.len(),
                        title = ?content.title,
                        "dry_run"
                    );
                    for p in &content.persons {
                        info!(name = %p.name, title = ?p.title, source = ?p.source, "  person");
                    }
                    continue;
                }

                let Some(cid) = company_id else { continue };

                // Write snapshot (skips dedup by content hash)
                match db::upsert_snapshot(pool, cid, &record, &content).await {
                    Ok(Some(_)) => { stats.snapshots_written += 1; }
                    Ok(None) => { stats.pages_skipped_dedup += 1; continue; }
                    Err(e) => warn!(url = %record.url, error = %e, "snapshot write failed"),
                }

                // Write facts: description
                if let Some(ref desc) = content.description {
                    let _ = db::upsert_fact(pool, cid, "description", desc, &record, 0.7).await;
                }

                // Write facts: emails
                for email in &content.emails {
                    let _ = db::upsert_fact(pool, cid, "email", email, &record, 0.8).await;
                }

                // Upsert contacts
                for person in &content.persons {
                    match db::upsert_contact(pool, cid, person).await {
                        Ok(Some(_)) => { stats.contacts_upserted += 1; }
                        Ok(None) => {}
                        Err(e) => warn!(name = %person.name, error = %e, "contact upsert failed"),
                    }
                }
            }
        }
    }

    // Update last_seen on companies row
    if !dry_run {
        if let Some(ref anchor) = anchor {
            let rows = db::update_last_seen(pool, domain, anchor).await?;
            if rows > 0 {
                info!(domain = %domain, crawl_id = %anchor.crawl_id, ts = %anchor.timestamp, "last_seen updated");
            }
        }
    }

    info!(
        domain = %domain,
        pages = stats.pages_fetched,
        persons = stats.persons_found,
        contacts_upserted = stats.contacts_upserted,
        snapshots = stats.snapshots_written,
        "done"
    );

    Ok(stats)
}
