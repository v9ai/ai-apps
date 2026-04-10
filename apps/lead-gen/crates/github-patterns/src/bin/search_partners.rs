/// search_partners — Search GitHub for partner-staffable professionals (delivery leads,
/// solution architects, technical consultants) across EU + UK, score them for
/// Claude Partner Network fitness, and store results in LanceDB.
///
/// Environment variables:
///   GITHUB_TOKEN              GitHub PAT (required)
///   LANCE_DB_PATH             LanceDB directory path (default: ./contributors.lance)
///   PARTNER_THRESHOLD         Minimum fitness score to store (default: 0.3)
///   MAX_RESULTS_PER_QUERY     Results per search query page (default: 30, max 100)
///   TOP_N                     Top candidates to display (default: 50)
///   SEARCH_MODE               "search" (default) | "top" (just print existing top)
use std::collections::HashSet;
use std::time::Duration;

use tracing::{info, warn};

use github_patterns::{
    contributors::{ContributorRecord, ContributorsDb, RepoContrib, RisingStar},
    partner_fitness::{compute_partner_fitness, PartnerFitness},
    skills::extract_skills,
    GhClient,
};

/// Archetype queries × EU + UK locations.
/// Each tuple: (search keywords, GitHub location qualifier).
static SEARCH_MATRIX: &[(&str, &str)] = &[
    // Solution architects
    ("\"solution architect\" AI", "Germany"),
    ("\"solution architect\" AI", "United Kingdom"),
    ("\"solutions architect\" AI", "Netherlands"),
    ("\"solutions architect\" AI", "France"),
    ("\"enterprise architect\" AI", "Sweden"),
    ("\"cloud architect\" LLM", "Ireland"),
    ("\"technical architect\" AI", "Spain"),
    ("\"software architect\" AI", "Poland"),
    ("\"software architect\" AI", "Romania"),
    // Delivery leads / program managers
    ("\"delivery lead\" AI", "Germany"),
    ("\"delivery manager\" AI", "United Kingdom"),
    ("\"program manager\" AI", "Netherlands"),
    ("\"engagement manager\" AI", "France"),
    ("\"delivery lead\" AI", "Ireland"),
    // Technical consultants
    ("consultant AI LLM", "Germany"),
    ("consultant AI LLM", "United Kingdom"),
    ("\"professional services\" AI", "Netherlands"),
    ("\"technical consultant\" AI", "France"),
    ("consultant AI LLM", "Switzerland"),
    // AI engineers (senior)
    ("\"staff engineer\" AI LLM", "Germany"),
    ("\"principal engineer\" AI", "United Kingdom"),
    ("\"tech lead\" AI LLM", "Netherlands"),
    ("\"engineering manager\" AI", "France"),
    ("\"staff engineer\" AI", "Sweden"),
    // Partner signals
    ("anthropic partner AI", "Germany"),
    ("anthropic AI engineer", "United Kingdom"),
    ("claude AI engineer", "France"),
    ("anthropic AI", "Netherlands"),
    // Broader EU sweep for architects
    ("\"solution architect\" AI", "Austria"),
    ("\"solution architect\" AI", "Belgium"),
    ("\"solution architect\" AI", "Denmark"),
    ("\"solution architect\" AI", "Finland"),
    ("\"solution architect\" AI", "Portugal"),
    ("\"solution architect\" AI", "Switzerland"),
];

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "search_partners=info,github_patterns=info".into()),
        )
        .init();

    let db_path = std::env::var("LANCE_DB_PATH").unwrap_or_else(|_| "./contributors.lance".into());
    let mode = std::env::var("SEARCH_MODE").unwrap_or_else(|_| "search".into());
    let top_n: usize = std::env::var("TOP_N")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(50);
    let threshold: f32 = std::env::var("PARTNER_THRESHOLD")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.3);
    let per_page: u8 = std::env::var("MAX_RESULTS_PER_QUERY")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(30)
        .min(100);

    if mode == "top" {
        info!("opening LanceDB at {db_path}");
        let db = ContributorsDb::open(&db_path).await?;
        print_top_partners(&db, top_n).await?;
        return Ok(());
    }

    let gh = GhClient::from_env()?;
    info!("GitHub client ready");

    info!("opening LanceDB at {db_path}");
    let mut db = ContributorsDb::open(&db_path).await?;

    let mut seen_logins: HashSet<String> = HashSet::new();
    let mut stored_count = 0u32;
    let mut total_searched = 0u32;

    for (keywords, location) in SEARCH_MATRIX {
        let query = format!("{keywords} type:user location:{location}");
        info!("searching: {query}");

        let results = match gh
            .search_users(&query, Some("followers"), Some("desc"), per_page, 1)
            .await
        {
            Ok(r) => r,
            Err(e) => {
                warn!("search failed for \"{query}\": {e}");
                // Rate-limit cooldown
                tokio::time::sleep(Duration::from_secs(5)).await;
                continue;
            }
        };

        info!(
            "  → {total} results (fetched {n})",
            total = results.total_count,
            n = results.items.len()
        );
        total_searched += results.items.len() as u32;

        for item in &results.items {
            if !seen_logins.insert(item.login.clone()) {
                continue; // already processed
            }

            // Hydrate full profile
            let user = match gh.get_user(&item.login).await {
                Ok(u) => u,
                Err(e) => {
                    warn!("  skipping {}: {e}", item.login);
                    continue;
                }
            };

            // Build skill text and extract
            let skill_text = format!(
                "{} {} {}",
                user.bio.as_deref().unwrap_or(""),
                user.company.as_deref().unwrap_or(""),
                user.blog.as_deref().unwrap_or(""),
            );
            let skills = extract_skills(&skill_text);
            let fitness = compute_partner_fitness(&user, &skills);

            if fitness.score < threshold {
                continue;
            }

            info!(
                "  ✓ {} (score={:.2}, archetypes=[{}], company={}, location={})",
                user.login,
                fitness.score,
                fitness.archetypes.join(", "),
                user.company.as_deref().unwrap_or("?"),
                user.location.as_deref().unwrap_or("?"),
            );

            // Build ContributorRecord for LanceDB storage
            let record = ContributorRecord {
                user: user.clone(),
                repos: vec![RepoContrib {
                    repo: format!("cpn:partner-search/{location}"),
                    contributions: 0,
                }],
                total_contributions: 0,
            };

            match db.insert(std::slice::from_ref(&record)).await {
                Ok(_) => stored_count += 1,
                Err(e) => warn!("  LanceDB insert failed for {}: {e}", user.login),
            }

            // Rate limit: GitHub Search API allows 30 req/min for authenticated users
            tokio::time::sleep(Duration::from_millis(250)).await;
        }

        // Cooldown between search queries (search API: 30 req/min)
        tokio::time::sleep(Duration::from_secs(2)).await;
    }

    info!("search complete — searched {total_searched}, stored {stored_count} (threshold={threshold})");

    print_top_partners(&db, top_n).await?;

    Ok(())
}

fn star_to_user(star: &RisingStar) -> github_patterns::GhUser {
    let created_at = chrono::DateTime::parse_from_rfc3339(&star.gh_created_at)
        .map(|dt| dt.with_timezone(&chrono::Utc))
        .unwrap_or_else(|_| chrono::Utc::now());

    github_patterns::GhUser {
        login: star.login.clone(),
        id: 0,
        html_url: star.html_url.clone(),
        avatar_url: String::new(),
        name: star.name.clone(),
        email: star.email.clone(),
        bio: star.bio.clone(),
        company: star.company.clone(),
        location: star.location.clone(),
        blog: None,
        twitter_username: None,
        public_repos: star.public_repos,
        public_gists: 0,
        followers: star.followers,
        following: 0,
        hireable: None,
        created_at,
        updated_at: chrono::Utc::now(),
    }
}

async fn print_top_partners(db: &ContributorsDb, n: usize) -> anyhow::Result<()> {
    // Use the existing top_rising method to get candidates,
    // then re-score them with partner fitness.
    let stars = db.top_rising(n * 3).await?; // fetch more, then re-rank

    if stars.is_empty() {
        info!("no partner candidates in database yet");
        return Ok(());
    }

    let mut scored: Vec<(String, PartnerFitness, String, String, String)> = Vec::new();

    for star in &stars {
        let user = star_to_user(star);

        let skill_text = format!(
            "{} {}",
            user.bio.as_deref().unwrap_or(""),
            user.company.as_deref().unwrap_or(""),
        );
        let skills = extract_skills(&skill_text);
        let fitness = compute_partner_fitness(&user, &skills);

        if fitness.archetypes.is_empty() && fitness.score < 0.2 {
            continue;
        }

        scored.push((
            star.login.clone(),
            fitness,
            star.name.clone().unwrap_or_default(),
            star.company.clone().unwrap_or_default(),
            star.location.clone().unwrap_or_default(),
        ));
    }

    // Sort by partner fitness score descending
    scored.sort_by(|a, b| b.1.score.partial_cmp(&a.1.score).unwrap());
    scored.truncate(n);

    println!("\n╔══════════════════════════════════════════════════════════════════════════════╗");
    println!("║  TOP {n} PARTNER CANDIDATES — Claude Partner Network");
    println!("╠══════════════════════════════════════════════════════════════════════════════╣");
    println!(
        "║ {:<4} {:<20} {:<8} {:<24} {:<20} ║",
        "#", "Login", "Score", "Archetypes", "Company"
    );
    println!("╠══════════════════════════════════════════════════════════════════════════════╣");

    for (i, (login, fitness, name, company, location)) in scored.iter().enumerate() {
        let archetypes_str = if fitness.archetypes.is_empty() {
            "—".to_string()
        } else {
            fitness.archetypes.join(", ")
        };
        let display_name = if name.is_empty() {
            login.as_str()
        } else {
            name.as_str()
        };
        let display_company = if company.is_empty() {
            "—"
        } else {
            company.as_str()
        };

        println!(
            "║ {:<4} {:<20} {:<8.2} {:<24} {:<20} ║",
            i + 1,
            &display_name[..display_name.len().min(20)],
            fitness.score,
            &archetypes_str[..archetypes_str.len().min(24)],
            &display_company[..display_company.len().min(20)],
        );
        if !location.is_empty() {
            println!("║      └─ {} ║", location);
        }
    }

    println!("╚══════════════════════════════════════════════════════════════════════════════╝");

    Ok(())
}
