/// search_partners — Deep GitHub search for Claude Partner Network candidates.
///
/// Four passes, ordered by signal strength:
///   1. **Stargazers** — people who starred Anthropic repos (highest intent signal)
///   2. **Org members** — public members of consulting/SI/AI orgs (right company profile)
///   3. **Repo search** — repos mentioning claude/anthropic/langchain → owner profiles
///   4. **User bio search** — supplementary keyword search (lowest signal, broadest net)
///
/// All passes filter to EU + UK locations and score via partner_fitness.
///
/// Environment variables:
///   GITHUB_TOKEN              GitHub PAT (required)
///   LANCE_DB_PATH             LanceDB directory (default: ./contributors.lance)
///   PARTNER_THRESHOLD         Min fitness score to store (default: 0.20)
///   TOP_N                     Top candidates to display (default: 100)
///   MAX_PAGES                 Max pages per paginated call (default: 5)
use std::collections::HashSet;
use std::time::Duration;

use tracing::{info, warn};

use github_patterns::{
    contributors::{is_bot, ContributorRecord, ContributorsDb, RepoContrib, RisingStar},
    partner_fitness::{compute_partner_fitness, PartnerFitness},
    skills::extract_skills,
    GhClient, GhError,
};

// ── EU + UK locations (substring matched, case-insensitive) ──────────────────

static EU_LOCATIONS: &[&str] = &[
    "germany",
    "united kingdom",
    "uk",
    "england",
    "scotland",
    "london",
    "berlin",
    "munich",
    "amsterdam",
    "netherlands",
    "holland",
    "france",
    "paris",
    "sweden",
    "stockholm",
    "ireland",
    "dublin",
    "spain",
    "madrid",
    "barcelona",
    "poland",
    "warsaw",
    "krakow",
    "wroclaw",
    "romania",
    "bucharest",
    "switzerland",
    "zurich",
    "geneva",
    "austria",
    "vienna",
    "belgium",
    "brussels",
    "denmark",
    "copenhagen",
    "finland",
    "helsinki",
    "portugal",
    "lisbon",
    "norway",
    "oslo",
    "czech",
    "prague",
    "italy",
    "milan",
    "rome",
    "greece",
    "athens",
    "estonia",
    "tallinn",
    "lithuania",
    "vilnius",
    "latvia",
    "riga",
    "croatia",
    "zagreb",
    "bulgaria",
    "sofia",
    "hungary",
    "budapest",
    "luxembourg",
    "düsseldorf",
    "hamburg",
    "frankfurt",
    "cologne",
    "stuttgart",
    "dortmund",
    "leeds",
    "manchester",
    "bristol",
    "edinburgh",
    "cambridge",
    "oxford",
    "lyon",
    "toulouse",
    "rotterdam",
    "utrecht",
    "eindhoven",
    "gothenburg",
    "malmö",
    "helsinki",
    "porto",
    "lisbon",
];

fn is_eu_location(location: Option<&str>) -> bool {
    let loc = match location {
        Some(l) if !l.is_empty() => l.to_lowercase(),
        _ => return false,
    };
    EU_LOCATIONS.iter().any(|eu| loc.contains(eu))
}

// ── Pass 1: Stargazer repos (highest intent) ────────────────────────────────

static STARGAZER_REPOS: &[&str] = &[
    // Anthropic — direct Claude interest
    "anthropics/anthropic-sdk-python",
    "anthropics/anthropic-sdk-typescript",
    "anthropics/anthropic-cookbook",
    "anthropics/courses",
    "anthropics/claude-code",
    "anthropics/prompt-eng-interactive-tutorial",
    // Claude ecosystem
    "modelcontextprotocol/servers",
    "modelcontextprotocol/typescript-sdk",
    "modelcontextprotocol/python-sdk",
    // Key AI frameworks (practitioners)
    "langchain-ai/langchain",
    "langchain-ai/langgraph",
    "run-llama/llama_index",
    "BerriAI/litellm",
    "instructor-ai/instructor",
    "dspy-ai/dspy",
    "crewAIInc/crewAI",
];

// ── Pass 2: Consulting / SI / AI org GitHub logins ──────────────────────────

static ORG_MEMBERS: &[&str] = &[
    // Consulting / SI firms with public GitHub orgs
    "thoughtworks",
    "epam",
    "globant",
    "capgemini",
    "publicissapient",
    "cognizant",
    "Accenture",
    "avanade",
    "slalom",
    "xebia",
    "futurice",
    "nordcloud",
    "quantiphi",
    "datatonic",
    "deloitte",
    "mckinsey",
    "KPMG",
];

// ── Pass 3: Repo search queries ─────────────────────────────────────────────
// Free-form GitHub repo search — then hydrate owner profiles.

static REPO_SEARCH_QUERIES: &[&str] = &[
    "anthropic claude language:python",
    "anthropic claude language:typescript",
    "claude API language:python",
    "claude MCP server",
    "anthropic sdk",
    "claude agent",
    "langchain anthropic",
    "llamaindex anthropic",
    "claude tool use",
    "claude computer use",
    "model context protocol",
];

// ── Pass 4: User bio search (minor supplement) ──────────────────────────────
// Only queries that returned results in prior runs. ~15 queries.

static BIO_SEARCH: &[(&str, &str)] = &[
    // "solution architect" — the one archetype that actually appears in GitHub bios
    ("\"solution architect\"", "Germany"),
    ("\"solution architect\"", "United Kingdom"),
    ("\"solution architect\"", "Netherlands"),
    ("\"solution architect\"", "France"),
    ("\"solution architect\"", "Switzerland"),
    ("\"solutions architect\"", "Germany"),
    ("\"solutions architect\"", "United Kingdom"),
    // Senior AI roles
    ("\"staff engineer\" AI", "Germany"),
    ("\"staff engineer\" AI", "United Kingdom"),
    ("\"principal engineer\" AI", "Germany"),
    ("\"principal engineer\" AI", "United Kingdom"),
    ("CTO AI", "Germany"),
    ("CTO AI", "United Kingdom"),
    ("CTO AI", "Netherlands"),
];

// ── Batch insert config ─────────────────────────────────────────────────────

const BATCH_SIZE: usize = 50;

async fn flush_batch(db: &mut ContributorsDb, batch: &mut Vec<ContributorRecord>) -> u32 {
    if batch.is_empty() {
        return 0;
    }
    let n = batch.len();
    match db.insert(batch).await {
        Ok(inserted) => {
            info!("  flushed batch: {inserted} of {n} inserted");
            batch.clear();
            inserted as u32
        }
        Err(e) => {
            warn!("  batch insert failed ({n} records): {e}");
            batch.clear();
            0
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────

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
    let top_n: usize = std::env::var("TOP_N")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(100);
    let threshold: f32 = std::env::var("PARTNER_THRESHOLD")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.20);
    let max_pages: u32 = std::env::var("MAX_PAGES")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(5);

    let gh = GhClient::from_env()?;
    info!("GitHub client ready");

    info!("opening LanceDB at {db_path}");
    let mut db = ContributorsDb::open(&db_path).await?;

    let mut seen: HashSet<String> = HashSet::new();
    let mut stored = 0u32;
    let mut searched = 0u32;

    // ═══════════════════════════════════════════════════════════════════════
    // PASS 1: Stargazers of Anthropic & key AI repos
    // ═══════════════════════════════════════════════════════════════════════
    info!(
        "═══ PASS 1: Stargazers ({} repos, up to {} pages each) ═══",
        STARGAZER_REPOS.len(),
        max_pages
    );
    {
        let pass_start = stored;
        let mut batch: Vec<ContributorRecord> = Vec::with_capacity(BATCH_SIZE);

        for repo_full in STARGAZER_REPOS {
            let (owner, repo) = match repo_full.split_once('/') {
                Some(p) => p,
                None => continue,
            };

            info!("stargazers: {repo_full}");

            for page in 1..=max_pages {
                let stars = match gh.repo_stargazers(owner, repo, 100, page).await {
                    Ok(s) => s,
                    Err(e) => {
                        warn!("  stargazers failed for {repo_full} page {page}: {e}");
                        tokio::time::sleep(Duration::from_secs(5)).await;
                        break;
                    }
                };

                if stars.is_empty() {
                    break;
                }

                info!("  page {page}: {} stargazers", stars.len());

                for star in &stars {
                    if is_bot(&star.login) {
                        continue;
                    }
                    searched += 1;

                    if let Some(record) = hydrate_user(
                        &gh,
                        &mut seen,
                        &star.login,
                        threshold,
                        &format!("cpn:star/{repo_full}"),
                        true,
                    )
                    .await
                    {
                        batch.push(record);
                        if batch.len() >= BATCH_SIZE {
                            stored += flush_batch(&mut db, &mut batch).await;
                        }
                    }
                }

                if stars.len() < 100 {
                    break;
                }

                tokio::time::sleep(Duration::from_millis(500)).await;
            }

            tokio::time::sleep(Duration::from_secs(1)).await;
        }

        stored += flush_batch(&mut db, &mut batch).await;
        info!(
            "pass 1 done — {} new from stargazers (searched {searched})",
            stored - pass_start
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PASS 2: Org members of consulting / SI / AI companies
    // ═══════════════════════════════════════════════════════════════════════
    info!("═══ PASS 2: Org members ({} orgs) ═══", ORG_MEMBERS.len());
    {
        let pass_start = stored;
        let mut batch: Vec<ContributorRecord> = Vec::with_capacity(BATCH_SIZE);

        for org in ORG_MEMBERS {
            info!("org members: {org}");

            for page in 1..=max_pages {
                let members = match gh.org_members(org, 100, page).await {
                    Ok(m) => m,
                    Err(e) => {
                        if format!("{e}").contains("404") || format!("{e}").contains("NotFound") {
                            info!("  {org}: members not public, skipping");
                        } else {
                            warn!("  org_members failed for {org} page {page}: {e}");
                        }
                        break;
                    }
                };

                if members.is_empty() {
                    break;
                }

                info!("  page {page}: {} members", members.len());

                for member in &members {
                    if is_bot(&member.login) {
                        continue;
                    }
                    searched += 1;

                    if let Some(record) = hydrate_user(
                        &gh,
                        &mut seen,
                        &member.login,
                        threshold,
                        &format!("cpn:org/{org}"),
                        false,
                    )
                    .await
                    {
                        batch.push(record);
                        if batch.len() >= BATCH_SIZE {
                            stored += flush_batch(&mut db, &mut batch).await;
                        }
                    }
                }

                if members.len() < 100 {
                    break;
                }

                tokio::time::sleep(Duration::from_millis(500)).await;
            }

            tokio::time::sleep(Duration::from_secs(1)).await;
        }

        stored += flush_batch(&mut db, &mut batch).await;
        info!("pass 2 done — {} new from org members", stored - pass_start);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PASS 3: Repo search → owner profiles
    // ═══════════════════════════════════════════════════════════════════════
    info!(
        "═══ PASS 3: Repo search ({} queries) ═══",
        REPO_SEARCH_QUERIES.len()
    );
    {
        let pass_start = stored;
        let mut batch: Vec<ContributorRecord> = Vec::with_capacity(BATCH_SIZE);

        for query in REPO_SEARCH_QUERIES {
            info!("repo search: {query}");

            for page in 1..=max_pages.min(3) {
                let results = match gh.search_repos_query(query, Some("stars"), 100, page).await {
                    Ok(r) => r,
                    Err(e) => {
                        warn!("  repo search failed for \"{query}\" page {page}: {e}");
                        tokio::time::sleep(Duration::from_secs(5)).await;
                        break;
                    }
                };

                if page == 1 {
                    info!("  → {} total repos", results.total_count);
                }

                if results.items.is_empty() {
                    break;
                }

                let mut repo_owners: Vec<String> = Vec::new();
                for repo in &results.items {
                    let owner = repo.full_name.split('/').next().unwrap_or("").to_string();
                    if !owner.is_empty() && !repo_owners.contains(&owner) {
                        repo_owners.push(owner);
                    }
                }

                info!(
                    "  page {page}: {} repos, {} unique owners",
                    results.items.len(),
                    repo_owners.len()
                );

                for owner_login in &repo_owners {
                    searched += 1;

                    if let Some(record) = hydrate_user(
                        &gh,
                        &mut seen,
                        owner_login,
                        threshold,
                        &format!("cpn:repo-search/{query}"),
                        false,
                    )
                    .await
                    {
                        batch.push(record);
                        if batch.len() >= BATCH_SIZE {
                            stored += flush_batch(&mut db, &mut batch).await;
                        }
                    }
                }

                if results.items.len() < 100 {
                    break;
                }

                tokio::time::sleep(Duration::from_secs(2)).await;
            }

            tokio::time::sleep(Duration::from_secs(2)).await;
        }

        stored += flush_batch(&mut db, &mut batch).await;
        info!("pass 3 done — {} new from repo search", stored - pass_start);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PASS 4: User bio search (supplementary)
    // ═══════════════════════════════════════════════════════════════════════
    info!(
        "═══ PASS 4: User bio search ({} queries) ═══",
        BIO_SEARCH.len()
    );
    {
        let pass_start = stored;
        let mut batch: Vec<ContributorRecord> = Vec::with_capacity(BATCH_SIZE);

        for (keywords, location) in BIO_SEARCH {
            let query = format!("{keywords} type:user location:{location}");
            info!("bio search: {query}");

            let results = match gh
                .search_users(&query, Some("followers"), Some("desc"), 100, 1)
                .await
            {
                Ok(r) => r,
                Err(e) => {
                    warn!("  bio search failed for \"{query}\": {e}");
                    tokio::time::sleep(Duration::from_secs(5)).await;
                    continue;
                }
            };

            info!("  → {} total", results.total_count);

            for item in &results.items {
                searched += 1;

                if let Some(record) = hydrate_user(
                    &gh,
                    &mut seen,
                    &item.login,
                    threshold,
                    &format!("cpn:bio/{location}"),
                    false,
                )
                .await
                {
                    batch.push(record);
                    if batch.len() >= BATCH_SIZE {
                        stored += flush_batch(&mut db, &mut batch).await;
                    }
                }
            }

            tokio::time::sleep(Duration::from_secs(2)).await;
        }

        stored += flush_batch(&mut db, &mut batch).await;
        info!("pass 4 done — {} new from bio search", stored - pass_start);
    }

    // ═══════════════════════════════════════════════════════════════════════
    info!("══ ALL DONE — searched {searched}, stored {stored} (threshold={threshold}) ══");

    print_top_partners(&db, top_n).await?;

    Ok(())
}

// ── Shared: hydrate and score ────────────────────────────────────────────────

/// Hydrate a GitHub user, apply EU filter, score partner fitness.
/// Returns `Some(record)` if above threshold, `None` if filtered/below threshold/already seen/error.
///
/// On rate-limit errors: waits until the GitHub reset time and retries once,
/// instead of silently skipping the user.
async fn hydrate_user(
    gh: &GhClient,
    seen: &mut HashSet<String>,
    login: &str,
    threshold: f32,
    source_tag: &str,
    starred_anthropic: bool,
) -> Option<ContributorRecord> {
    if !seen.insert(login.to_string()) {
        return None;
    }

    let user = match gh.get_user(login).await {
        Ok(u) => u,
        Err(GhError::RateLimit { reset_at }) => {
            // Wait until the GitHub rate limit resets instead of skipping
            if let Ok(reset_ts) = reset_at.parse::<i64>() {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs() as i64;
                let wait_secs = (reset_ts - now + 2).max(1) as u64;
                warn!("  rate-limited on {login}, waiting {wait_secs}s until reset");
                tokio::time::sleep(Duration::from_secs(wait_secs)).await;
            } else {
                warn!("  rate-limited on {login}, unparseable reset={reset_at}, waiting 60s");
                tokio::time::sleep(Duration::from_secs(60)).await;
            }
            // Retry once
            match gh.get_user(login).await {
                Ok(u) => u,
                Err(e) => {
                    warn!("  skip {login} after rate-limit retry: {e}");
                    seen.remove(login);
                    return None;
                }
            }
        }
        Err(e) => {
            warn!("  skip {login}: {e}");
            return None;
        }
    };

    // EU/UK location filter
    if !is_eu_location(user.location.as_deref()) {
        return None;
    }

    let skill_text = format!(
        "{} {} {}",
        user.bio.as_deref().unwrap_or(""),
        user.company.as_deref().unwrap_or(""),
        user.blog.as_deref().unwrap_or(""),
    );
    let skills = extract_skills(&skill_text);
    let fitness = compute_partner_fitness(&user, &skills, starred_anthropic);

    if fitness.score < threshold {
        return None;
    }

    info!(
        "  ✓ {} ({:.2}) [{}] @ {} — {}",
        user.login,
        fitness.score,
        if fitness.archetypes.is_empty() {
            "general"
        } else {
            fitness.archetypes[0]
        },
        user.company.as_deref().unwrap_or("—"),
        user.location.as_deref().unwrap_or("?"),
    );

    Some(ContributorRecord {
        user,
        repos: vec![RepoContrib {
            repo: source_tag.to_string(),
            contributions: 0,
        }],
        total_contributions: 0,
        extra_tags: if starred_anthropic {
            vec!["cpn:starred".into()]
        } else {
            vec![]
        },
    })
}

// ── Display ──────────────────────────────────────────────────────────────────

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
    let stars = db.top_rising(n * 3).await?;

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
        let starred = star.skills.iter().any(|s| s == "cpn:starred");
        let fitness = compute_partner_fitness(&user, &skills, starred);

        scored.push((
            star.login.clone(),
            fitness,
            star.name.clone().unwrap_or_default(),
            star.company.clone().unwrap_or_default(),
            star.location.clone().unwrap_or_default(),
        ));
    }

    scored.sort_by(|a, b| b.1.score.partial_cmp(&a.1.score).unwrap());
    scored.truncate(n);

    println!(
        "\n╔════════════════════════════════════════════════════════════════════════════════════╗"
    );
    println!(
        "║  TOP {} PARTNER CANDIDATES — Claude Partner Network                               ║",
        n
    );
    println!(
        "╠════════════════════════════════════════════════════════════════════════════════════╣"
    );
    println!(
        "║ {:<4} {:<22} {:<6} {:<26} {:<22} ║",
        "#", "Name", "Score", "Archetypes", "Company"
    );
    println!(
        "╠════════════════════════════════════════════════════════════════════════════════════╣"
    );

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
            "║ {:<4} {:<22} {:<6.2} {:<26} {:<22} ║",
            i + 1,
            &display_name[..display_name.len().min(22)],
            fitness.score,
            &archetypes_str[..archetypes_str.len().min(26)],
            &display_company[..display_company.len().min(22)],
        );
        if !location.is_empty() {
            println!("║      └─ {:<71} ║", &location[..location.len().min(71)]);
        }
    }

    println!(
        "╚════════════════════════════════════════════════════════════════════════════════════╝"
    );

    Ok(())
}
