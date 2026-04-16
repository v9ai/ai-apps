use anyhow::Result;
use futures::stream::{self, StreamExt};
use reqwest::Client;
use sqlx::PgPool;
use tracing::{info, warn};

use crate::{cdx, db, extract};

const WARC_CONCURRENCY: usize = 8;
const LIVE_CONCURRENCY: usize = 4;
/// How many CDX records to request per index (much larger than max_pages to maximise page variety).
const CDX_LIMIT: usize = 500;
/// Max additional live-fetched pages discovered via depth-1 link following.
const MAX_DEPTH1_PAGES: usize = 5;

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
    let (crawl_id, mut records) = cdx::query_domain_multi(client, domain, CDX_LIMIT).await?;

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

    // Build URL set for depth-1 dedup
    let cdx_urls: std::collections::HashSet<String> = records.iter().map(|r| r.url.clone()).collect();

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

    // Collect depth-1 link candidates from all processed pages
    let mut discovered_links: Vec<String> = Vec::new();

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

                // Collect links for depth-1 discovery
                discovered_links.extend(content.links.iter().cloned());

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
                    for e in &content.emails {
                        info!(email = %e, "  email");
                    }
                    // Check org facts in dry_run too
                    let org = extract::extract_org_facts(&html);
                    if org.description.is_some() || org.founded_year.is_some() {
                        info!(
                            description = ?org.description,
                            founded = ?org.founded_year,
                            location = ?org.location,
                            social_links = org.social_links.len(),
                            "  org_facts"
                        );
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

                // Organization-level facts from JSON-LD
                let org = extract::extract_org_facts(&html);
                if let Some(ref desc) = org.description {
                    let _ = db::upsert_fact(pool, cid, "description", desc, &record, 0.85).await;
                }
                if let Some(ref year) = org.founded_year {
                    let _ = db::upsert_fact(pool, cid, "founded_year", year, &record, 0.9).await;
                }
                if let Some(ref loc) = org.location {
                    let _ = db::upsert_fact(pool, cid, "location", loc, &record, 0.85).await;
                }
                for link in &org.social_links {
                    let _ = db::upsert_fact(pool, cid, "social_link", link, &record, 0.9).await;
                }

                // Write facts: description (from meta/og)
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

    // Depth-1: live-fetch high-value pages discovered via links but not in CC index
    if !dry_run {
        if let Some(cid) = company_id {
            let mut new_links: Vec<String> = discovered_links
                .into_iter()
                .filter(|u| !cdx_urls.contains(u))
                .filter(|u| cdx::page_score(u) >= 0.7)
                .collect();
            new_links.sort();
            new_links.dedup();
            new_links.truncate(MAX_DEPTH1_PAGES);

            if !new_links.is_empty() {
                info!(domain = %domain, links = new_links.len(), "depth-1 live fetch");
                let live_fetched: Vec<(String, Result<String>)> = stream::iter(new_links)
                    .map(|url| {
                        let client = client.clone();
                        async move {
                            let html = cdx::fetch_live_html(&client, &url).await;
                            (url, html)
                        }
                    })
                    .buffer_unordered(LIVE_CONCURRENCY)
                    .collect()
                    .await;

                for (url, html_result) in live_fetched {
                    let record = cdx::synthetic_record(&url, &crawl_id);
                    match html_result {
                        Err(e) => warn!(url = %url, error = %e, "live fetch failed"),
                        Ok(html) => {
                            stats.pages_fetched += 1;
                            let content = extract::extract(&html, &url);
                            stats.persons_found += content.persons.len();
                            stats.emails_found += content.emails.len();

                            match db::upsert_snapshot(pool, cid, &record, &content).await {
                                Ok(Some(_)) => { stats.snapshots_written += 1; }
                                Ok(None) => { stats.pages_skipped_dedup += 1; continue; }
                                Err(e) => warn!(url = %url, error = %e, "live snapshot failed"),
                            }

                            let org = extract::extract_org_facts(&html);
                            if let Some(ref desc) = org.description {
                                let _ = db::upsert_fact(pool, cid, "description", desc, &record, 0.85).await;
                            }
                            if let Some(ref year) = org.founded_year {
                                let _ = db::upsert_fact(pool, cid, "founded_year", year, &record, 0.9).await;
                            }
                            if let Some(ref loc) = org.location {
                                let _ = db::upsert_fact(pool, cid, "location", loc, &record, 0.85).await;
                            }
                            for link in &org.social_links {
                                let _ = db::upsert_fact(pool, cid, "social_link", link, &record, 0.9).await;
                            }
                            if let Some(ref desc) = content.description {
                                let _ = db::upsert_fact(pool, cid, "description", desc, &record, 0.7).await;
                            }
                            for email in &content.emails {
                                let _ = db::upsert_fact(pool, cid, "email", email, &record, 0.8).await;
                            }
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
