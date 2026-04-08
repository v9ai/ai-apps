/// scan_orgs — GitHub org pattern scanner for the lead-gen pipeline.
///
/// Two modes (set `SCAN_MODE` env var):
///
///   enrich  (default) — scan companies already in Neon that have a
///                        `github_url` but no `github_analyzed_at`.
///
///   discover          — search GitHub for AI orgs not yet in Neon
///                        (driven by `GH_TOPICS`, comma-separated).
///
/// Environment variables:
///   NEON_DATABASE_URL   Neon connection string (required)
///   GITHUB_TOKEN        GitHub PAT (required)
///   SCAN_MODE           "enrich" | "discover"  (default: enrich)
///   SCAN_LIMIT          Max orgs to process per run (default: 50)
///   GH_TOPICS           Comma-separated topics for discover mode
///                       (default: "llm,machine-learning,langchain")
///   GH_MIN_STARS        Minimum stars for discover mode (default: 50)
///   RESCAN              "1" to re-analyse already-analysed orgs (enrich mode)
use std::collections::HashSet;
use std::time::Duration;

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use tracing::{error, info, warn};

use github_patterns::{
    patterns::analyse_org,
    store::{derive_tags, extract_org_from_url, save_org_patterns},
    GhClient,
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "scan_orgs=info,github_patterns=info".into()),
        )
        .init();

    let db_url = std::env::var("NEON_DATABASE_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .expect("NEON_DATABASE_URL env var is required");

    let gh_token = std::env::var("GITHUB_TOKEN")
        .or_else(|_| std::env::var("GH_TOKEN"))
        .expect("GITHUB_TOKEN env var is required");

    let scan_mode = std::env::var("SCAN_MODE").unwrap_or_else(|_| "enrich".into());
    let scan_limit: i64 = std::env::var("SCAN_LIMIT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(50);

    info!("connecting to Neon…");
    let pool = PgPoolOptions::new()
        .max_connections(3)
        .acquire_timeout(Duration::from_secs(10))
        .connect(&db_url)
        .await?;

    let gh = GhClient::new(gh_token)?;
    info!("GitHub client ready");

    match scan_mode.as_str() {
        "discover" => discover_mode(&pool, &gh, scan_limit).await?,
        _          => enrich_mode(&pool, &gh, scan_limit).await?,
    }

    info!("scan complete");
    Ok(())
}

// ── Enrich mode ───────────────────────────────────────────────────────────────

/// Scan companies already in Neon that have a `github_url`.
async fn enrich_mode(pool: &PgPool, gh: &GhClient, limit: i64) -> anyhow::Result<()> {
    let rescan = std::env::var("RESCAN").as_deref() == Ok("1");

    let where_clause = if rescan {
        "WHERE github_url IS NOT NULL"
    } else {
        "WHERE github_url IS NOT NULL AND github_analyzed_at IS NULL"
    };

    let query = format!(
        "SELECT id, key, name, github_url, tags
           FROM companies
           {where_clause}
           ORDER BY score DESC NULLS LAST
           LIMIT $1"
    );

    let rows = sqlx::query(&query)
        .bind(limit)
        .fetch_all(pool)
        .await?;

    info!("enrich: {} companies to scan", rows.len());

    for row in rows {
        use sqlx::Row;
        let id: i32            = row.try_get("id")?;
        let key: String        = row.try_get("key")?;
        let name: String       = row.try_get("name")?;
        let github_url: String = row.try_get("github_url")?;
        let tags: Option<String> = row.try_get("tags")?;

        let Some(org) = extract_org_from_url(&github_url) else {
            warn!("cannot extract org from url={github_url} company={name}");
            continue;
        };

        info!("analysing org={org} company={name}");

        match analyse_org(gh, &org, 30).await {
            Ok(patterns) => {
                if let Err(e) = save_org_patterns(pool, Some(id), &key, &github_url, &patterns, tags.as_deref()).await {
                    error!("save failed for org={org}: {e}");
                } else {
                    log_result(&org, &patterns);
                }
            }
            Err(e) => warn!("analyse_org failed for org={org}: {e}"),
        }

        // Small pause between orgs to stay within secondary rate limits
        tokio::time::sleep(Duration::from_millis(300)).await;
    }

    Ok(())
}

// ── Discover mode ─────────────────────────────────────────────────────────────

/// Search GitHub for AI orgs not yet in Neon.
async fn discover_mode(pool: &PgPool, gh: &GhClient, limit: i64) -> anyhow::Result<()> {
    let topics_str = std::env::var("GH_TOPICS")
        .unwrap_or_else(|_| "llm,machine-learning,langchain,generative-ai".into());
    let min_stars: u32 = std::env::var("GH_MIN_STARS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(50);

    // Fetch existing github orgs to avoid duplicates
    let existing: HashSet<String> = sqlx::query("SELECT github_org FROM companies WHERE github_org IS NOT NULL")
        .fetch_all(pool)
        .await?
        .iter()
        .filter_map(|r| {
            use sqlx::Row;
            r.try_get::<String, _>("github_org").ok()
        })
        .collect();

    info!("discover: {} orgs already in DB", existing.len());

    let mut seen_orgs: HashSet<String> = HashSet::new();
    let mut processed: i64 = 0;

    for topic in topics_str.split(',').map(str::trim).filter(|s| !s.is_empty()) {
        if processed >= limit { break; }

        info!("searching topic={topic} min_stars={min_stars}");

        let results = match gh.search_repos(topic, None, min_stars, 30).await {
            Ok(r) => r,
            Err(e) => { warn!("search failed for topic={topic}: {e}"); continue; }
        };

        for repo in results.items {
            if processed >= limit { break; }

            // Derive org login from full_name ("openai/gpt-4" → "openai")
            let org = repo.full_name
                .split('/')
                .next()
                .unwrap_or("")
                .to_string();

            if org.is_empty() || existing.contains(&org) || seen_orgs.contains(&org) {
                continue;
            }
            seen_orgs.insert(org.clone());

            // Verify it's an org (not a personal account) — skip gracefully on failure
            if let Err(e) = gh.org(&org).await {
                info!("skip {org}: not an org ({e})");
                continue;
            }

            let github_url = format!("https://github.com/{org}");
            let company_key = org.to_lowercase().replace(['.', ' '], "-");

            info!("analysing discovered org={org}");

            match analyse_org(gh, &org, 30).await {
                Ok(patterns) => {
                    if let Err(e) = save_org_patterns(pool, None, &company_key, &github_url, &patterns, None).await {
                        error!("save failed for org={org}: {e}");
                    } else {
                        log_result(&org, &patterns);
                        processed += 1;
                    }
                }
                Err(e) => warn!("analyse_org failed for org={org}: {e}"),
            }

            tokio::time::sleep(Duration::from_millis(300)).await;
        }
    }

    info!("discover: inserted/updated {processed} orgs");
    Ok(())
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn log_result(org: &str, p: &github_patterns::OrgPatterns) {
    let tags = derive_tags(p);
    info!(
        "  {org} → ai={:.2} hiring={:.2} activity={:.2} tags=[{}]",
        p.ai_score,
        p.hiring_score,
        p.activity_score,
        tags.join(", "),
    );
}
