/// search_partners — Deep GitHub search for partner-staffable professionals across EU + UK.
///
/// Three search passes:
///   1. User search — bio/profile keyword matching across archetypes × locations
///   2. Consulting org members — scrape members of known SI/consulting GitHub orgs
///   3. AI repo contributors — find contributors to major AI/LLM repos, filter by EU location
///
/// Environment variables:
///   GITHUB_TOKEN              GitHub PAT (required)
///   LANCE_DB_PATH             LanceDB directory path (default: ./contributors.lance)
///   PARTNER_THRESHOLD         Minimum fitness score to store (default: 0.25)
///   MAX_RESULTS_PER_QUERY     Results per search query page (default: 100, max 100)
///   MAX_PAGES                 Max pages to paginate per query (default: 3)
///   TOP_N                     Top candidates to display (default: 100)
///   SEARCH_MODE               "search" | "orgs" | "repos" | "all" (default) | "top"
use std::collections::HashSet;
use std::time::Duration;

use tracing::{info, warn};

use github_patterns::{
    contributors::{ContributorRecord, ContributorsDb, RepoContrib, RisingStar},
    partner_fitness::{compute_partner_fitness, PartnerFitness},
    skills::extract_skills,
    GhClient,
};

// ── EU + UK locations ────────────────────────────────────────────────────────

static EU_LOCATIONS: &[&str] = &[
    "Germany",
    "United Kingdom",
    "Netherlands",
    "France",
    "Sweden",
    "Ireland",
    "Spain",
    "Poland",
    "Romania",
    "Switzerland",
    "Austria",
    "Belgium",
    "Denmark",
    "Finland",
    "Portugal",
    "Norway",
    "Czech Republic",
    "Italy",
    "Greece",
    "Estonia",
    "Lithuania",
    "Latvia",
    "Croatia",
    "Bulgaria",
    "Hungary",
    "Luxembourg",
];

// ── Pass 1: User search queries ──────────────────────────────────────────────
// (keywords, location) — GitHub matches keywords against login, name, bio, email.

static SEARCH_MATRIX: &[(&str, &str)] = &[
    // ── Solution / enterprise / cloud architects ────────────────────────────
    ("\"solution architect\"", "Germany"),
    ("\"solution architect\"", "United Kingdom"),
    ("\"solution architect\"", "Netherlands"),
    ("\"solution architect\"", "France"),
    ("\"solution architect\"", "Sweden"),
    ("\"solution architect\"", "Ireland"),
    ("\"solution architect\"", "Spain"),
    ("\"solution architect\"", "Poland"),
    ("\"solution architect\"", "Romania"),
    ("\"solution architect\"", "Switzerland"),
    ("\"solution architect\"", "Austria"),
    ("\"solution architect\"", "Belgium"),
    ("\"solution architect\"", "Denmark"),
    ("\"solution architect\"", "Finland"),
    ("\"solution architect\"", "Portugal"),
    ("\"solution architect\"", "Norway"),
    ("\"solution architect\"", "Czech Republic"),
    ("\"solution architect\"", "Italy"),
    ("\"solutions architect\"", "Germany"),
    ("\"solutions architect\"", "United Kingdom"),
    ("\"solutions architect\"", "Netherlands"),
    ("\"solutions architect\"", "France"),
    ("\"enterprise architect\"", "Germany"),
    ("\"enterprise architect\"", "United Kingdom"),
    ("\"enterprise architect\"", "Netherlands"),
    ("\"enterprise architect\"", "France"),
    ("\"enterprise architect\"", "Switzerland"),
    ("\"cloud architect\"", "Germany"),
    ("\"cloud architect\"", "United Kingdom"),
    ("\"cloud architect\"", "Netherlands"),
    ("\"cloud architect\"", "France"),
    ("\"cloud architect\"", "Ireland"),
    ("\"cloud architect\"", "Sweden"),
    ("\"technical architect\"", "Germany"),
    ("\"technical architect\"", "United Kingdom"),
    ("\"technical architect\"", "Netherlands"),
    ("\"software architect\"", "Germany"),
    ("\"software architect\"", "United Kingdom"),
    ("\"software architect\"", "Netherlands"),
    ("\"software architect\"", "France"),
    ("\"software architect\"", "Poland"),
    ("\"software architect\"", "Romania"),
    ("\"software architect\"", "Sweden"),
    ("\"software architect\"", "Spain"),
    ("\"software architect\"", "Switzerland"),
    ("\"data architect\"", "Germany"),
    ("\"data architect\"", "United Kingdom"),
    ("\"data architect\"", "Netherlands"),
    ("\"AI architect\"", "Germany"),
    ("\"AI architect\"", "United Kingdom"),
    // ── Consultants / advisory ──────────────────────────────────────────────
    ("consultant AI", "Germany"),
    ("consultant AI", "United Kingdom"),
    ("consultant AI", "Netherlands"),
    ("consultant AI", "France"),
    ("consultant AI", "Switzerland"),
    ("consultant AI", "Sweden"),
    ("consultant AI", "Ireland"),
    ("consultant AI", "Spain"),
    ("consultant AI", "Belgium"),
    ("consultant AI", "Denmark"),
    ("consultant AI", "Norway"),
    ("consultant machine learning", "Germany"),
    ("consultant machine learning", "United Kingdom"),
    ("consultant machine learning", "Netherlands"),
    ("\"technical consultant\"", "Germany"),
    ("\"technical consultant\"", "United Kingdom"),
    ("\"technical consultant\"", "Netherlands"),
    ("\"technical consultant\"", "France"),
    ("consulting engineer", "Germany"),
    ("consulting engineer", "United Kingdom"),
    ("consulting LLM", "Germany"),
    ("consulting LLM", "United Kingdom"),
    ("\"professional services\"", "Germany"),
    ("\"professional services\"", "United Kingdom"),
    ("\"professional services\"", "Netherlands"),
    ("advisory AI", "Germany"),
    ("advisory AI", "United Kingdom"),
    ("advisory AI", "Switzerland"),
    // ── Delivery / program / engagement ─────────────────────────────────────
    ("\"delivery lead\"", "Germany"),
    ("\"delivery lead\"", "United Kingdom"),
    ("\"delivery lead\"", "Netherlands"),
    ("\"delivery manager\"", "Germany"),
    ("\"delivery manager\"", "United Kingdom"),
    ("\"delivery manager\"", "Netherlands"),
    ("\"delivery manager\"", "Ireland"),
    ("\"program manager\" AI", "Germany"),
    ("\"program manager\" AI", "United Kingdom"),
    ("\"program manager\" AI", "Netherlands"),
    ("\"program manager\" AI", "France"),
    ("\"engagement manager\"", "Germany"),
    ("\"engagement manager\"", "United Kingdom"),
    ("\"engagement manager\"", "Netherlands"),
    ("\"practice lead\"", "Germany"),
    ("\"practice lead\"", "United Kingdom"),
    ("\"practice lead\"", "Netherlands"),
    ("\"head of delivery\"", "Germany"),
    ("\"head of delivery\"", "United Kingdom"),
    // ── Senior AI/ML engineers ──────────────────────────────────────────────
    ("\"staff engineer\" AI", "Germany"),
    ("\"staff engineer\" AI", "United Kingdom"),
    ("\"staff engineer\" AI", "Netherlands"),
    ("\"staff engineer\" AI", "France"),
    ("\"staff engineer\" AI", "Sweden"),
    ("\"staff engineer\" machine learning", "Germany"),
    ("\"staff engineer\" machine learning", "United Kingdom"),
    ("\"principal engineer\" AI", "Germany"),
    ("\"principal engineer\" AI", "United Kingdom"),
    ("\"principal engineer\" AI", "Netherlands"),
    ("\"principal engineer\" AI", "France"),
    ("\"principal engineer\" machine learning", "Germany"),
    ("\"principal engineer\" machine learning", "United Kingdom"),
    ("\"tech lead\" AI", "Germany"),
    ("\"tech lead\" AI", "United Kingdom"),
    ("\"tech lead\" AI", "Netherlands"),
    ("\"tech lead\" AI", "France"),
    ("\"tech lead\" LLM", "Germany"),
    ("\"tech lead\" LLM", "United Kingdom"),
    ("\"engineering manager\" AI", "Germany"),
    ("\"engineering manager\" AI", "United Kingdom"),
    ("\"engineering manager\" AI", "Netherlands"),
    ("\"engineering manager\" AI", "France"),
    ("\"engineering manager\" machine learning", "Germany"),
    ("\"engineering manager\" machine learning", "United Kingdom"),
    ("\"head of engineering\" AI", "Germany"),
    ("\"head of engineering\" AI", "United Kingdom"),
    ("\"director of engineering\" AI", "Germany"),
    ("\"director of engineering\" AI", "United Kingdom"),
    ("\"VP engineering\"", "Germany"),
    ("\"VP engineering\"", "United Kingdom"),
    ("CTO AI", "Germany"),
    ("CTO AI", "United Kingdom"),
    ("CTO AI", "Netherlands"),
    ("CTO AI", "France"),
    ("CTO AI", "Switzerland"),
    ("CTO machine learning", "Germany"),
    ("CTO machine learning", "United Kingdom"),
    // ── AI/ML specific roles ────────────────────────────────────────────────
    ("\"AI engineer\"", "Germany"),
    ("\"AI engineer\"", "United Kingdom"),
    ("\"AI engineer\"", "Netherlands"),
    ("\"AI engineer\"", "France"),
    ("\"AI engineer\"", "Sweden"),
    ("\"AI engineer\"", "Ireland"),
    ("\"AI engineer\"", "Spain"),
    ("\"AI engineer\"", "Switzerland"),
    ("\"ML engineer\"", "Germany"),
    ("\"ML engineer\"", "United Kingdom"),
    ("\"ML engineer\"", "Netherlands"),
    ("\"ML engineer\"", "France"),
    ("\"machine learning engineer\"", "Germany"),
    ("\"machine learning engineer\"", "United Kingdom"),
    ("\"machine learning engineer\"", "Netherlands"),
    ("\"applied scientist\"", "Germany"),
    ("\"applied scientist\"", "United Kingdom"),
    ("\"NLP engineer\"", "Germany"),
    ("\"NLP engineer\"", "United Kingdom"),
    ("\"LLM engineer\"", "Germany"),
    ("\"LLM engineer\"", "United Kingdom"),
    ("\"deep learning\" engineer", "Germany"),
    ("\"deep learning\" engineer", "United Kingdom"),
    // ── Anthropic / Claude specific ─────────────────────────────────────────
    ("anthropic", "Germany"),
    ("anthropic", "United Kingdom"),
    ("anthropic", "Netherlands"),
    ("anthropic", "France"),
    ("anthropic", "Switzerland"),
    ("anthropic", "Sweden"),
    ("anthropic", "Ireland"),
    ("claude AI", "Germany"),
    ("claude AI", "United Kingdom"),
    ("claude AI", "France"),
    // ── Partner / ecosystem signals ─────────────────────────────────────────
    ("\"AWS partner\"", "Germany"),
    ("\"AWS partner\"", "United Kingdom"),
    ("\"GCP partner\"", "Germany"),
    ("\"GCP partner\"", "United Kingdom"),
    ("\"Azure partner\"", "Germany"),
    ("\"Azure partner\"", "United Kingdom"),
];

// ── Pass 2: Consulting org GitHub logins to scrape members from ──────────────

static CONSULTING_ORGS: &[&str] = &[
    "thoughtworks",
    "epam",
    "slalom-consulting",
    "slalom",
    "globant",
    "accenture",
    "avaaborern",
    "capgemini",
    "publicissapient",
    "cognizant",
    "quantiphi",
    "datatonic",
    "nordcloud",
    "xebia",
    "futurice",
    "reaktor",
    "rovio",
    "elastic",
    "hashicorp",
    "databricks",
    "datadog",
    "snowflakedb",
    "huggingface",
    "mistralai",
    "cohere-ai",
    "deepmind",
    "stability-ai",
    "aleph-alpha",
];

// ── Pass 3: AI repos to scrape contributors from ────────────────────────────

static AI_REPOS: &[&str] = &[
    "anthropics/anthropic-cookbook",
    "anthropics/courses",
    "anthropics/anthropic-sdk-python",
    "anthropics/claude-code",
    "langchain-ai/langchain",
    "langchain-ai/langgraph",
    "run-llama/llama_index",
    "huggingface/transformers",
    "huggingface/peft",
    "vllm-project/vllm",
    "microsoft/autogen",
    "microsoft/semantic-kernel",
    "openai/openai-cookbook",
    "BerriAI/litellm",
    "instructor-ai/instructor",
    "mlflow/mlflow",
    "ray-project/ray",
    "qdrant/qdrant",
    "lancedb/lancedb",
    "chroma-core/chroma",
    "deepset-ai/haystack",
    "dspy-ai/dspy",
    "crewAIInc/crewAI",
];

/// Check if a location string matches any EU/UK location (case-insensitive substring).
fn is_eu_location(location: Option<&str>) -> bool {
    let loc = match location {
        Some(l) if !l.is_empty() => l.to_lowercase(),
        _ => return false,
    };
    EU_LOCATIONS
        .iter()
        .any(|eu| loc.contains(&eu.to_lowercase()))
}

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
    let mode = std::env::var("SEARCH_MODE").unwrap_or_else(|_| "all".into());
    let top_n: usize = std::env::var("TOP_N")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(100);
    let threshold: f32 = std::env::var("PARTNER_THRESHOLD")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.25);
    let per_page: u8 = std::env::var("MAX_RESULTS_PER_QUERY")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(100)
        .min(100);
    let max_pages: u32 = std::env::var("MAX_PAGES")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(3);

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

    // ── Pass 1: User search ─────────────────────────────────────────────────
    if matches!(mode.as_str(), "all" | "search") {
        info!(
            "═══ PASS 1: User bio/profile search ({} queries) ═══",
            SEARCH_MATRIX.len()
        );

        for (keywords, location) in SEARCH_MATRIX {
            let query = format!("{keywords} type:user location:{location}");

            for page in 1..=max_pages {
                if page > 1 {
                    info!("  page {page} for: {query}");
                } else {
                    info!("searching: {query}");
                }

                let results = match gh
                    .search_users(&query, Some("followers"), Some("desc"), per_page, page)
                    .await
                {
                    Ok(r) => r,
                    Err(e) => {
                        warn!("search failed for \"{query}\" page {page}: {e}");
                        tokio::time::sleep(Duration::from_secs(5)).await;
                        break; // stop paginating on error
                    }
                };

                let fetched = results.items.len();
                if page == 1 {
                    info!(
                        "  → {total} total (fetched {fetched})",
                        total = results.total_count
                    );
                }

                if fetched == 0 {
                    break; // no more pages
                }

                for item in &results.items {
                    total_searched += 1;
                    if let Some(count) = process_user(
                        &gh,
                        &mut db,
                        &mut seen_logins,
                        &item.login,
                        threshold,
                        &format!("cpn:search/{location}"),
                    )
                    .await
                    {
                        stored_count += count;
                    }
                }

                // Stop paginating if we got fewer than a full page
                if fetched < per_page as usize {
                    break;
                }

                // Rate limit between pages
                tokio::time::sleep(Duration::from_secs(2)).await;
            }

            // Cooldown between queries (search API: 30 req/min)
            tokio::time::sleep(Duration::from_millis(2200)).await;
        }

        info!("pass 1 done — searched {total_searched}, stored {stored_count}");
    }

    // ── Pass 2: Consulting org members ──────────────────────────────────────
    if matches!(mode.as_str(), "all" | "orgs") {
        info!(
            "═══ PASS 2: Consulting org member scrape ({} orgs) ═══",
            CONSULTING_ORGS.len()
        );
        let pass2_start = stored_count;

        for org_login in CONSULTING_ORGS {
            info!("scraping org: {org_login}");

            // Get org members (public) — paginate
            for page in 1..=5u32 {
                let members: Vec<github_patterns::SearchUserItem> = match gh
                    .search_users(
                        &format!("org:{org_login} type:user"),
                        Some("followers"),
                        Some("desc"),
                        100,
                        page,
                    )
                    .await
                {
                    Ok(r) => r.items,
                    Err(e) => {
                        warn!("  org search failed for {org_login}: {e}");
                        tokio::time::sleep(Duration::from_secs(3)).await;
                        break;
                    }
                };

                if members.is_empty() {
                    break;
                }

                info!("  page {page}: {} members", members.len());

                for member in &members {
                    total_searched += 1;
                    if let Some(count) = process_user(
                        &gh,
                        &mut db,
                        &mut seen_logins,
                        &member.login,
                        threshold,
                        &format!("cpn:org/{org_login}"),
                    )
                    .await
                    {
                        stored_count += count;
                    }
                }

                if members.len() < 100 {
                    break;
                }
                tokio::time::sleep(Duration::from_secs(2)).await;
            }

            tokio::time::sleep(Duration::from_secs(2)).await;
        }

        info!(
            "pass 2 done — {} new from org scrape",
            stored_count - pass2_start
        );
    }

    // ── Pass 3: AI repo contributors ────────────────────────────────────────
    if matches!(mode.as_str(), "all" | "repos") {
        info!(
            "═══ PASS 3: AI repo contributor scrape ({} repos) ═══",
            AI_REPOS.len()
        );
        let pass3_start = stored_count;

        for repo_full in AI_REPOS {
            let (owner, repo) = match repo_full.split_once('/') {
                Some(pair) => pair,
                None => continue,
            };

            info!("scraping contributors: {repo_full}");

            let contributors = match gh.repo_contributors(owner, repo).await {
                Ok(c) => c,
                Err(e) => {
                    warn!("  failed for {repo_full}: {e}");
                    tokio::time::sleep(Duration::from_secs(3)).await;
                    continue;
                }
            };

            info!("  {} contributors", contributors.len());

            // Only process top contributors (by commit count)
            let top_contribs: Vec<_> = contributors.into_iter().take(50).collect();

            for contrib in &top_contribs {
                if github_patterns::contributors::is_bot(&contrib.login) {
                    continue;
                }

                total_searched += 1;

                // Process — but for repo contributors we do an EU filter after hydration
                if seen_logins.contains(&contrib.login) {
                    continue;
                }

                let user = match gh.get_user(&contrib.login).await {
                    Ok(u) => u,
                    Err(e) => {
                        warn!("  skipping {}: {e}", contrib.login);
                        continue;
                    }
                };

                // EU/UK location filter for repo contributors
                if !is_eu_location(user.location.as_deref()) {
                    seen_logins.insert(contrib.login.clone());
                    continue;
                }

                seen_logins.insert(contrib.login.clone());

                let skill_text = format!(
                    "{} {} {} {}",
                    user.bio.as_deref().unwrap_or(""),
                    user.company.as_deref().unwrap_or(""),
                    user.blog.as_deref().unwrap_or(""),
                    repo_full,
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

                let record = ContributorRecord {
                    user,
                    repos: vec![RepoContrib {
                        repo: repo_full.to_string(),
                        contributions: contrib.contributions,
                    }],
                    total_contributions: contrib.contributions,
                };

                match db.insert(std::slice::from_ref(&record)).await {
                    Ok(_) => stored_count += 1,
                    Err(e) => warn!("  LanceDB insert failed for {}: {e}", contrib.login),
                }

                tokio::time::sleep(Duration::from_millis(170)).await;
            }

            tokio::time::sleep(Duration::from_secs(1)).await;
        }

        info!(
            "pass 3 done — {} new from repo contributors",
            stored_count - pass3_start
        );
    }

    info!(
        "══ ALL DONE — searched {total_searched}, stored {stored_count} (threshold={threshold}) ══"
    );

    print_top_partners(&db, top_n).await?;

    Ok(())
}

/// Hydrate a GitHub login, score for partner fitness, and store if above threshold.
/// Returns Some(1) if stored, Some(0) if below threshold, None if skipped/error.
async fn process_user(
    gh: &GhClient,
    db: &mut ContributorsDb,
    seen: &mut HashSet<String>,
    login: &str,
    threshold: f32,
    source_tag: &str,
) -> Option<u32> {
    if !seen.insert(login.to_string()) {
        return None; // already processed
    }

    let user = match gh.get_user(login).await {
        Ok(u) => u,
        Err(e) => {
            warn!("  skipping {login}: {e}");
            return None;
        }
    };

    let skill_text = format!(
        "{} {} {}",
        user.bio.as_deref().unwrap_or(""),
        user.company.as_deref().unwrap_or(""),
        user.blog.as_deref().unwrap_or(""),
    );
    let skills = extract_skills(&skill_text);
    let fitness = compute_partner_fitness(&user, &skills);

    if fitness.score < threshold {
        return Some(0);
    }

    info!(
        "  ✓ {} (score={:.2}, archetypes=[{}], company={}, location={})",
        user.login,
        fitness.score,
        fitness.archetypes.join(", "),
        user.company.as_deref().unwrap_or("?"),
        user.location.as_deref().unwrap_or("?"),
    );

    let record = ContributorRecord {
        user: user.clone(),
        repos: vec![RepoContrib {
            repo: source_tag.to_string(),
            contributions: 0,
        }],
        total_contributions: 0,
    };

    match db.insert(std::slice::from_ref(&record)).await {
        Ok(_) => Some(1),
        Err(e) => {
            warn!("  LanceDB insert failed for {}: {e}", user.login);
            Some(0)
        }
    }
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
