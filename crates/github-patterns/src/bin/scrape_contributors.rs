/// scrape_contributors — Scrape contributors of AI GitHub projects into LanceDB.
///
/// Two modes (SCRAPE_MODE env var):
///
///   discover (default) — search GitHub for AI repos by topic and scrape
///                         their top contributors.
///
///   repo               — scrape a single repo given by GH_REPO
///                         (e.g. "huggingface/transformers").
///
/// Environment variables:
///   GITHUB_TOKEN              GitHub PAT with public repo read access (required)
///   LANCE_DB_PATH             LanceDB directory path (default: ./contributors.lance)
///   SCRAPE_MODE               "discover" | "repo"  (default: discover)
///   GH_TOPICS                 Comma-separated topics for discover mode
///                             (default: "llm,machine-learning,generative-ai,deep-learning")
///   GH_MIN_STARS              Minimum stars for repo search (default: 200)
///   GH_REPO                   Specific "owner/repo" for repo mode
///   MAX_REPOS                 Max repos to scrape in discover mode (default: 20)
///   MAX_CONTRIBUTORS_PER_REPO Max contributors fetched per repo (default: 100)
use std::collections::HashMap;
use std::time::Duration;

use tracing::{error, info, warn};

use github_patterns::{
    contributors::{ContributorRecord, ContributorsDb, RepoContrib},
    GhClient,
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "scrape_contributors=info,github_patterns=info".into()),
        )
        .init();

    let gh_token = std::env::var("GITHUB_TOKEN")
        .or_else(|_| std::env::var("GH_TOKEN"))
        .expect("GITHUB_TOKEN / GH_TOKEN env var is required");

    let db_path = std::env::var("LANCE_DB_PATH")
        .unwrap_or_else(|_| "./contributors.lance".into());

    let scrape_mode = std::env::var("SCRAPE_MODE").unwrap_or_else(|_| "discover".into());

    let gh = GhClient::new(gh_token)?;
    info!("GitHub client ready");

    info!("opening LanceDB at {db_path}");
    let mut db = ContributorsDb::open(&db_path).await?;

    match scrape_mode.as_str() {
        "repo" => {
            let repo = std::env::var("GH_REPO")
                .expect("GH_REPO is required in repo mode (e.g. huggingface/transformers)");
            scrape_single_repo(&gh, &mut db, &repo).await?;
        }
        _ => {
            discover_mode(&gh, &mut db).await?;
        }
    }

    info!("done — {} total contributors in DB", db.count().await);
    Ok(())
}

// ── Discover mode ─────────────────────────────────────────────────────────────

async fn discover_mode(gh: &GhClient, db: &mut ContributorsDb) -> anyhow::Result<()> {
    let topics = std::env::var("GH_TOPICS")
        .unwrap_or_else(|_| "llm,machine-learning,generative-ai,deep-learning".into());
    let min_stars: u32 = std::env::var("GH_MIN_STARS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(200);
    let max_repos: usize = std::env::var("MAX_REPOS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(20);

    let mut repos_seen: Vec<String> = Vec::new();

    for topic in topics.split(',').map(str::trim).filter(|s| !s.is_empty()) {
        if repos_seen.len() >= max_repos {
            break;
        }

        info!("searching topic={topic} min_stars={min_stars}");
        let results = match gh.search_repos(topic, None, min_stars, 30).await {
            Ok(r) => r,
            Err(e) => {
                warn!("search failed for topic={topic}: {e}");
                continue;
            }
        };

        for repo in results.items {
            if repos_seen.len() >= max_repos {
                break;
            }
            if repos_seen.contains(&repo.full_name) {
                continue;
            }
            repos_seen.push(repo.full_name.clone());
            scrape_single_repo(gh, db, &repo.full_name).await?;
            tokio::time::sleep(Duration::from_millis(400)).await;
        }
    }

    Ok(())
}

// ── Per-repo scrape ───────────────────────────────────────────────────────────

async fn scrape_single_repo(
    gh: &GhClient,
    db: &mut ContributorsDb,
    full_name: &str,
) -> anyhow::Result<()> {
    let max_per_repo: usize = std::env::var("MAX_CONTRIBUTORS_PER_REPO")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(100);

    let (owner, repo) = match full_name.split_once('/') {
        Some(pair) => pair,
        None => {
            warn!("invalid repo format: {full_name}");
            return Ok(());
        }
    };

    info!("scraping contributors for {full_name}");
    let contributors = match gh.repo_contributors(owner, repo).await {
        Ok(c) => c,
        Err(e) => {
            warn!("failed to get contributors for {full_name}: {e}");
            return Ok(());
        }
    };

    // Collect (login → contributions) for top contributors
    let to_fetch: Vec<_> = contributors
        .into_iter()
        .take(max_per_repo)
        .filter(|c| !db.is_known(&c.login))
        .collect();

    info!(
        "{full_name}: {} contributors to fetch (skipping already-known)",
        to_fetch.len()
    );

    // Batch user profile fetches — but stay within rate limits
    let mut records: Vec<ContributorRecord> = Vec::new();
    let mut contrib_map: HashMap<String, u32> = HashMap::new();
    for c in &to_fetch {
        contrib_map.insert(c.login.clone(), c.contributions);
    }

    for chunk in to_fetch.chunks(10) {
        for c in chunk {
            match gh.get_user(&c.login).await {
                Ok(user) => {
                    let repo_contrib = RepoContrib {
                        repo: full_name.to_string(),
                        contributions: c.contributions,
                    };
                    records.push(ContributorRecord {
                        total_contributions: c.contributions,
                        repos: vec![repo_contrib],
                        user,
                    });
                }
                Err(e) => {
                    warn!("failed to fetch user {}: {e}", c.login);
                }
            }
            // Avoid secondary rate limit — ~6 req/s
            tokio::time::sleep(Duration::from_millis(170)).await;
        }

        if !records.is_empty() {
            match db.insert(&records).await {
                Ok(n) => info!("  inserted {n} contributors from {full_name}"),
                Err(e) => error!("  insert failed for {full_name}: {e}"),
            }
            records.clear();
        }
    }

    Ok(())
}
