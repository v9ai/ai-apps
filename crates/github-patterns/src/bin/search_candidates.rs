/// search_candidates — Multi-pass GitHub user search for sourcing candidates
/// matching a specific opportunity. Combines user bio search with stargazer
/// mining of relevant repos, filters by location, scores via rising-star
/// model, and exports to Neon PostgreSQL contacts.
///
/// Environment variables:
///   GITHUB_TOKEN           GitHub PAT (required)
///   NEON_DATABASE_URL      Neon connection string (required unless DRY_RUN=1)
///   LANCE_DB_PATH          LanceDB directory (default: ./candidates.lance)
///   OPP_ID                 Opportunity ID for contact tags
///                          (default: opp_20260415_principal_ai_eng_ob)
///   EXPORT_THRESHOLD       Minimum rising_score to export (default: 0.3)
///   TOP_N                  Rising stars to display (default: 50)
///   DRY_RUN                Set to "1" to skip all DB writes
use std::collections::HashSet;
use std::time::Duration;

use regex::Regex;
use tracing::{info, warn};

use github_patterns::contributors::{
    compute_rising_score, is_bot, ContributorRecord, ContributorsDb, RepoContrib, RisingStar,
};
use github_patterns::skills::{contributor_skills_text, extract_skills};
use github_patterns::GhClient;

// ── Location filters ─────────────────────────────────────────────────────────

fn london_regex() -> Regex {
    Regex::new(r"(?i)\b(london|greater london)\b").unwrap()
}

fn uk_wide_regex() -> Regex {
    Regex::new(r"(?i)\b(uk|united kingdom|england|cambridge|oxford|brighton|reading|bristol|manchester)\b").unwrap()
}

fn is_london(location: Option<&str>) -> bool {
    location.map_or(false, |l| london_regex().is_match(l))
}

fn is_uk_wide(location: Option<&str>) -> bool {
    location.map_or(false, |l| uk_wide_regex().is_match(l))
}

// ── Search queries ───────────────────────────────────────────────────────────

/// Multi-pass user search queries. Each targets a different angle.
fn search_queries() -> Vec<(&'static str, &'static str)> {
    vec![
        ("A: bio AI engineer",     "location:London AI engineer language:python type:user"),
        ("B: RAG + LLM",          "location:London RAG LLM type:user"),
        ("C: frameworks",         "location:London langchain langgraph crewai type:user"),
        ("D: senior ML",          "location:London machine learning followers:>20 type:user"),
        ("E: UK-wide RAG",        "location:\"United Kingdom\" RAG LLM type:user"),
        ("F: Claude/Anthropic",   "location:London anthropic claude type:user"),
        ("G: deep learning",      "location:London deep learning pytorch type:user"),
    ]
}

/// Repos whose stargazers are high-signal for this opportunity.
fn stargazer_repos() -> Vec<&'static str> {
    vec![
        "langchain-ai/langgraph",
        "crewAIInc/crewAI",
        "anthropics/anthropic-cookbook",
        "anthropics/anthropic-sdk-python",
    ]
}

// ── Main ─────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "search_candidates=info,github_patterns=info".into()),
        )
        .init();

    let dry_run = std::env::var("DRY_RUN").unwrap_or_default() == "1";
    let opp_id = std::env::var("OPP_ID")
        .unwrap_or_else(|_| "opp_20260415_principal_ai_eng_ob".into());
    let lance_path = std::env::var("LANCE_DB_PATH")
        .unwrap_or_else(|_| "./candidates.lance".into());
    let threshold: f32 = std::env::var("EXPORT_THRESHOLD")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.3);
    let top_n: usize = std::env::var("TOP_N")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(50);

    let gh = GhClient::from_env()?;
    info!("GitHub client ready — opp_id={opp_id} dry_run={dry_run}");

    // ── Phase 1: Multi-pass user search ─────────────────────────────────────
    let mut seen_logins: HashSet<String> = HashSet::new();

    // Pass A-G: bio/keyword search
    for (label, query) in search_queries() {
        info!("search pass {label}");
        match gh.search_users(query, Some("followers"), Some("desc"), 100, 1).await {
            Ok(resp) => {
                let count = resp.items.len();
                for item in resp.items {
                    if !is_bot(&item.login) {
                        seen_logins.insert(item.login);
                    }
                }
                info!("  {label}: {count} results, {} unique total", seen_logins.len());
            }
            Err(e) => warn!("  {label} failed: {e}"),
        }
        // Respect search API rate limit (30 req/min)
        tokio::time::sleep(Duration::from_secs(2)).await;
    }

    // Stargazer mining
    for repo_full in stargazer_repos() {
        let (owner, repo) = repo_full.split_once('/').unwrap();
        info!("mining stargazers: {repo_full}");

        // Fetch up to 3 pages (300 stargazers) per repo
        for page in 1..=3 {
            match gh.repo_stargazers(owner, repo, 100, page).await {
                Ok(stargazers) => {
                    if stargazers.is_empty() {
                        break;
                    }
                    for sg in &stargazers {
                        if !is_bot(&sg.login) {
                            seen_logins.insert(sg.login.clone());
                        }
                    }
                    info!(
                        "  {repo_full} page {page}: {} stargazers, {} unique total",
                        stargazers.len(),
                        seen_logins.len()
                    );
                    if stargazers.len() < 100 {
                        break;
                    }
                }
                Err(e) => {
                    warn!("  stargazers {repo_full} page {page} failed: {e}");
                    break;
                }
            }
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
        tokio::time::sleep(Duration::from_secs(1)).await;
    }

    info!("Phase 1 complete: {} unique logins to hydrate", seen_logins.len());

    // ── Phase 2: Hydrate profiles + location filter ─────────────────────────
    info!("opening LanceDB at {lance_path}");
    let mut lance_db = ContributorsDb::open(&lance_path).await?;

    let mut candidates: Vec<(ContributorRecord, bool)> = Vec::new(); // (record, london_verified)
    let mut skipped_location = 0u32;
    let mut skipped_known = 0u32;

    let logins: Vec<String> = seen_logins.into_iter().collect();
    info!("hydrating {} profiles…", logins.len());

    for (idx, login) in logins.iter().enumerate() {
        if lance_db.is_known(login) {
            skipped_known += 1;
            continue;
        }

        match gh.get_user(login).await {
            Ok(user) => {
                let loc = user.location.as_deref();
                let london = is_london(loc);
                let uk = is_uk_wide(loc);

                if !london && !uk {
                    skipped_location += 1;
                } else {
                    candidates.push((
                        ContributorRecord {
                            total_contributions: user.public_repos, // proxy: repos as contribution signal
                            repos: vec![RepoContrib {
                                repo: "github-search".to_string(),
                                contributions: user.public_repos,
                            }],
                            user,
                        },
                        london,
                    ));
                }
            }
            Err(e) => warn!("failed to fetch {login}: {e}"),
        }

        // ~6 req/s to stay within secondary rate limit
        tokio::time::sleep(Duration::from_millis(170)).await;

        if (idx + 1) % 50 == 0 {
            info!(
                "  hydrated {}/{} — {} candidates, {} location-filtered, {} already-known",
                idx + 1,
                logins.len(),
                candidates.len(),
                skipped_location,
                skipped_known,
            );
        }
    }

    info!(
        "Phase 2 complete: {} candidates pass location filter ({} filtered, {} already known)",
        candidates.len(),
        skipped_location,
        skipped_known,
    );

    // ── Phase 3: Score + insert into LanceDB ────────────────────────────────
    // Insert in batches of 10
    let records: Vec<&ContributorRecord> = candidates.iter().map(|(r, _)| r).collect();
    for chunk in records.chunks(10) {
        let chunk_vec: Vec<ContributorRecord> = chunk.iter().map(|r| (*r).clone()).collect();
        match lance_db.insert(&chunk_vec).await {
            Ok(n) => info!("  inserted {n} into LanceDB"),
            Err(e) => warn!("  LanceDB insert failed: {e}"),
        }
    }

    // ── Phase 4: Build RisingStar entries + export to Neon ──────────────────
    let mut stars: Vec<(RisingStar, bool)> = Vec::new(); // (star, london_verified)
    for (record, london_verified) in &candidates {
        let score = compute_rising_score(record);
        let repos_json = serde_json::to_string(&record.repos).unwrap_or_default();
        let skills_text = contributor_skills_text(
            record.user.bio.as_deref(),
            record.user.company.as_deref(),
            &repos_json,
        );
        let skills: Vec<String> = extract_skills(&skills_text)
            .into_iter()
            .map(String::from)
            .collect();

        stars.push((
            RisingStar {
                login: record.user.login.clone(),
                html_url: record.user.html_url.clone(),
                name: record.user.name.clone(),
                email: record.user.email.clone(),
                company: record.user.company.clone(),
                location: record.user.location.clone(),
                bio: record.user.bio.clone(),
                followers: record.user.followers,
                public_repos: record.user.public_repos,
                total_contributions: record.total_contributions,
                ai_repos_count: record.repos.len(),
                rising_score: score.score,
                contribution_density: score.contribution_density,
                novelty: score.novelty,
                breadth: score.breadth,
                realness: score.realness,
                gh_created_at: record.user.created_at.to_rfc3339(),
                skills,
            },
            *london_verified,
        ));
    }

    // Sort by score descending
    stars.sort_by(|a, b| b.0.rising_score.partial_cmp(&a.0.rising_score).unwrap());

    // Print summary
    let display_n = stars.len().min(top_n);
    println!("\n╔══ LONDON AI CANDIDATES — {opp_id} ══════════════════════════╗");
    for (rank, (s, london)) in stars.iter().take(display_n).enumerate() {
        let name = s.name.as_deref().unwrap_or(&s.login);
        let company = s.company.as_deref().unwrap_or("-");
        let location = s.location.as_deref().unwrap_or("-");
        let email = s.email.as_deref().unwrap_or("-");
        let loc_tag = if *london { "LONDON" } else { "UK-WIDE" };

        println!(
            "#{:<3} {:>5.3}  {name} (@{})",
            rank + 1,
            s.rising_score,
            s.login,
        );
        println!("      [{loc_tag}] {location}  company={company}");
        println!("      email={email}  followers={}  repos={}", s.followers, s.public_repos);
        if let Some(bio) = &s.bio {
            let truncated: String = bio.chars().take(120).collect();
            println!("      bio={truncated}");
        }
        if !s.skills.is_empty() {
            println!("      skills={}", s.skills.join(", "));
        }
        println!();
    }
    println!("╚══════════════════════════════════════════════════════════════════╝");
    println!(
        "Summary: {} total candidates, {} London-verified, {} UK-wide",
        stars.len(),
        stars.iter().filter(|(_, l)| *l).count(),
        stars.iter().filter(|(_, l)| !*l).count(),
    );

    // Export to Neon
    if dry_run {
        info!("DRY_RUN=1 — skipping Neon export");
    } else {
        use github_patterns::contrib_store::save_contributor_contact;
        use sqlx::postgres::PgPoolOptions;

        let db_url = std::env::var("NEON_DATABASE_URL")
            .or_else(|_| std::env::var("DATABASE_URL"))
            .expect("NEON_DATABASE_URL is required for export (set DRY_RUN=1 to skip)");

        info!("connecting to Neon…");
        let pool = PgPoolOptions::new()
            .max_connections(3)
            .acquire_timeout(Duration::from_secs(10))
            .connect(&db_url)
            .await?;
        info!("Neon connection ready — exporting with threshold={threshold:.2}");

        let mut exported = 0u32;
        let mut skipped = 0u32;

        for (star, london_verified) in &stars {
            let mut extra_tags = vec![
                format!("opp:{opp_id}"),
                "github:candidate-search".to_string(),
            ];
            if *london_verified {
                extra_tags.push("location:london-verified".to_string());
            } else {
                extra_tags.push("location:uk-wide".to_string());
            }

            match save_contributor_contact(&pool, star, threshold, &extra_tags).await {
                Ok(Some(id)) => {
                    exported += 1;
                    tracing::debug!("exported {} → contacts id={id}", star.login);
                }
                Ok(None) => {
                    skipped += 1;
                }
                Err(e) => {
                    warn!("failed to export {}: {e}", star.login);
                }
            }
        }

        info!("export complete — {exported} contacts upserted, {skipped} below threshold");
    }

    Ok(())
}
