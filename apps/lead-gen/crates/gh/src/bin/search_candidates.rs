/// search_candidates v2 — Deep GitHub user search for sourcing candidates
/// matching a specific opportunity. Six discovery channels:
///   1. Bio/keyword search (passes A–K)
///   2. Stargazer mining (9 repos)
///   3. Contributor mining — actual code committers to key AI repos
///   4. Org member mining — public members of London AI companies
///   5. Network expansion — followers of top-scoring candidates
///   6. GraphQL batch hydration with enriched fields
///
/// Environment variables:
///   GITHUB_TOKEN           GitHub PAT (required)
///   NEON_DATABASE_URL      Neon connection string (required unless DRY_RUN=1)
///   LANCE_DB_PATH          LanceDB directory (default: ./candidates.lance)
///   OPP_ID                 Opportunity ID for contact tags
///                          (default: opp_20260415_principal_ai_eng_ob)
///   EXPORT_THRESHOLD       Minimum rising_score to export (default: 0.3)
///   TOP_N                  Top candidates to display (default: 50)
///   DRY_RUN                Set to "1" to skip all DB writes
use std::collections::{HashMap, HashSet};
use std::time::Duration;

use regex::Regex;
use tracing::{info, warn};

use github_patterns::contributors::{
    compute_opp_skill_match, compute_rising_score, compute_strength_score,
    infer_position, is_bot, ContributorRecord, ContributorsDb, RepoContrib, Candidate,
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
        ("H: agentic AI",         "location:London agentic agent framework type:user"),
        ("I: fine-tuning",        "location:London fine-tuning LoRA type:user"),
        ("J: MLOps",              "location:London MLOps deployment type:user"),
        ("K: principal/staff",    "location:London principal staff AI engineer type:user"),
        // v3: expanded passes
        ("L: DSPy/instructor",    "location:London dspy instructor outlines type:user"),
        ("M: retrieval expert",   "location:London retrieval vector search embedding type:user"),
        ("N: UK principal",       "location:\"United Kingdom\" principal AI staff engineer type:user"),
        ("O: vector DB",          "location:London pinecone weaviate qdrant lancedb type:user"),
    ]
}

/// Repos whose stargazers are high-signal for this opportunity.
fn stargazer_repos() -> Vec<&'static str> {
    vec![
        "langchain-ai/langgraph",
        "crewAIInc/crewAI",
        "anthropics/anthropic-cookbook",
        "anthropics/anthropic-sdk-python",
        "vllm-project/vllm",
        "openai/evals",
        "microsoft/autogen",
        "huggingface/transformers",
        "chroma-core/chroma",
        // v3: expanded
        "stanfordnlp/dspy",
        "jxnl/instructor",
        "outlines-dev/outlines",
        "run-llama/llama_index",
    ]
}

/// Repos whose actual code contributors are highest-signal.
fn contributor_repos() -> Vec<&'static str> {
    vec![
        "langchain-ai/langchain",
        "langchain-ai/langgraph",
        "run-llama/llama_index",
        "crewAIInc/crewAI",
        "microsoft/autogen",
        "vllm-project/vllm",
        "chroma-core/chroma",
        "anthropics/anthropic-sdk-python",
        // v3: expanded
        "stanfordnlp/dspy",
        "jxnl/instructor",
        "microsoft/semantic-kernel",
        "BerriAI/litellm",
    ]
}

/// London AI companies/labs whose public members are high-signal.
fn london_ai_orgs() -> Vec<&'static str> {
    vec![
        "deepmind",
        "alan-turing-institute",
        "stability-ai",
        "faculty-ai",
        "benevolentai",
        // v3: expanded
        "huggingface",
        "cohere-ai",
        "google-deepmind",
    ]
}

// ── Source tracking ──────────────────────────────────────────────────────────

/// Track where each login was discovered (for provenance tags).
fn add_source(sources: &mut HashMap<String, Vec<String>>, login: &str, tag: String) {
    sources
        .entry(login.to_string())
        .or_default()
        .push(tag);
}

// ── Main ─────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env.local from lead-gen app (where GITHUB_TOKEN lives), then .env
    dotenvy::from_filename("../../apps/lead-gen/.env.local").ok();
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
    let opp_skills: Vec<String> = std::env::var("OPP_SKILLS")
        .unwrap_or_default()
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    if !opp_skills.is_empty() {
        info!("OPP_SKILLS: {:?}", opp_skills);
    }
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

    let mut seen_logins: HashSet<String> = HashSet::new();
    let mut sources: HashMap<String, Vec<String>> = HashMap::new();

    // Track contribution counts from contributor mining (keyed by login)
    let mut contrib_counts: HashMap<String, (String, u32)> = HashMap::new(); // login → (repo, count)

    // ── Channel 1: Bio/keyword search (passes A–K) ──────────────────────────
    for (label, query) in search_queries() {
        info!("search pass {label}");
        match gh.search_users(query, Some("followers"), Some("desc"), 100, 1).await {
            Ok(resp) => {
                let count = resp.items.len();
                for item in resp.items {
                    if !is_bot(&item.login) {
                        add_source(&mut sources, &item.login, format!("src:bio/{label}"));
                        seen_logins.insert(item.login);
                    }
                }
                info!("  {label}: {count} results, {} unique total", seen_logins.len());
            }
            Err(e) => warn!("  {label} failed: {e}"),
        }
        tokio::time::sleep(Duration::from_secs(2)).await;
    }
    info!("Channel 1 (bio search) done: {} logins", seen_logins.len());

    // ── Channel 2: Stargazer mining ─────────────────────────────────────────
    for repo_full in stargazer_repos() {
        let (owner, repo) = repo_full.split_once('/').unwrap();
        info!("mining stargazers: {repo_full}");

        for page in 1..=3 {
            match gh.repo_stargazers(owner, repo, 100, page).await {
                Ok(stargazers) => {
                    if stargazers.is_empty() {
                        break;
                    }
                    for sg in &stargazers {
                        if !is_bot(&sg.login) {
                            add_source(&mut sources, &sg.login, format!("src:star/{repo_full}"));
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
    info!("Channel 2 (stargazers) done: {} logins", seen_logins.len());

    // ── Channel 3: Contributor mining — actual code committers ──────────────
    for repo_full in contributor_repos() {
        let (owner, repo) = repo_full.split_once('/').unwrap();
        info!("mining contributors: {repo_full}");

        match gh.repo_contributors(owner, repo).await {
            Ok(contributors) => {
                let mut added = 0;
                for c in &contributors {
                    if c.contributions >= 3 && !is_bot(&c.login) {
                        add_source(&mut sources, &c.login, format!("src:contrib/{repo_full}"));
                        // Track actual contribution count — use the highest if seen in multiple repos
                        let entry = contrib_counts
                            .entry(c.login.clone())
                            .or_insert_with(|| (repo_full.to_string(), 0));
                        if c.contributions > entry.1 {
                            *entry = (repo_full.to_string(), c.contributions);
                        }
                        seen_logins.insert(c.login.clone());
                        added += 1;
                    }
                }
                info!(
                    "  {repo_full}: {} contributors (>= 3 commits), {added} new, {} unique total",
                    contributors.len(),
                    seen_logins.len()
                );
            }
            Err(e) => warn!("  contributors {repo_full} failed: {e}"),
        }
        tokio::time::sleep(Duration::from_secs(1)).await;
    }
    info!("Channel 3 (contributors) done: {} logins", seen_logins.len());

    // ── Channel 4: Org member mining ────────────────────────────────────────
    for org in london_ai_orgs() {
        info!("mining org members: {org}");
        match gh.get_org_members_graphql(org, 20).await {
            Ok(members) => {
                let mut added = 0;
                for m in &members {
                    if !is_bot(&m.login) {
                        add_source(&mut sources, &m.login, format!("src:org/{org}"));
                        if seen_logins.insert(m.login.clone()) {
                            added += 1;
                        }
                    }
                }
                info!(
                    "  {org}: {} members, {added} new, {} unique total",
                    members.len(),
                    seen_logins.len()
                );
            }
            Err(e) => warn!("  org {org} failed: {e}"),
        }
        tokio::time::sleep(Duration::from_secs(1)).await;
    }
    info!("Channel 4 (orgs) done: {} logins", seen_logins.len());

    info!("Discovery complete: {} unique logins to hydrate", seen_logins.len());

    // ── Phase 2: Hydrate profiles via GraphQL + location filter ─────────────
    info!("opening LanceDB at {lance_path}");
    let mut lance_db = ContributorsDb::open(&lance_path).await?;

    let mut candidates: Vec<(ContributorRecord, bool)> = Vec::new();
    let mut skipped_location = 0u32;
    let mut skipped_known = 0u32;

    let logins: Vec<String> = seen_logins
        .into_iter()
        .filter(|l| {
            if lance_db.is_known(l) {
                skipped_known += 1;
                false
            } else {
                true
            }
        })
        .collect();

    info!(
        "hydrating {} profiles via GraphQL (batches of 10), {} already known…",
        logins.len(),
        skipped_known,
    );

    let batch_size = 10; // Small batches — enriched GQL payload hits resource limits at ~18 users
    for (batch_idx, chunk) in logins.chunks(batch_size).enumerate() {
        let chunk_vec: Vec<String> = chunk.to_vec();
        match gh.get_users_graphql(&chunk_vec).await {
            Ok(users) => {
                for user in users {
                    let loc = user.location.as_deref();
                    let london = is_london(loc);
                    let uk = is_uk_wide(loc);

                    if !london && !uk {
                        skipped_location += 1;
                    } else {
                        // Use real contribution count from contributor mining if available
                        let (repo_source, contrib_count) = contrib_counts
                            .get(&user.login)
                            .cloned()
                            .unwrap_or_else(|| ("github-search".to_string(), user.public_repos));

                        candidates.push((
                            ContributorRecord {
                                total_contributions: contrib_count,
                                repos: vec![RepoContrib {
                                    repo: repo_source,
                                    contributions: contrib_count,
                                }],
                                user,
                            },
                            london,
                        ));
                    }
                }
            }
            Err(e) => warn!("  GraphQL batch {} failed: {e}", batch_idx + 1),
        }

        let fetched = (batch_idx + 1) * batch_size;
        info!(
            "  batch {}: hydrated {}/{} — {} candidates, {} location-filtered",
            batch_idx + 1,
            fetched.min(logins.len()),
            logins.len(),
            candidates.len(),
            skipped_location,
        );

        tokio::time::sleep(Duration::from_millis(500)).await;
    }

    info!(
        "Phase 2 complete: {} candidates pass location filter ({} filtered, {} already known)",
        candidates.len(),
        skipped_location,
        skipped_known,
    );

    // ── Phase 3: Score + insert into LanceDB ────────────────────────────────
    let records: Vec<&ContributorRecord> = candidates.iter().map(|(r, _)| r).collect();
    for chunk in records.chunks(10) {
        let chunk_vec: Vec<ContributorRecord> = chunk.iter().map(|r| (*r).clone()).collect();
        match lance_db.insert(&chunk_vec).await {
            Ok(n) => info!("  inserted {n} into LanceDB"),
            Err(e) => warn!("  LanceDB insert failed: {e}"),
        }
    }

    // ── Phase 4: Build Candidate entries ────────────────────────────────────
    let mut ranked: Vec<(Candidate, bool)> = Vec::new();
    for (record, london_verified) in &candidates {
        let repos_json = serde_json::to_string(&record.repos).unwrap_or_default();
        let skills_text = contributor_skills_text(
            record.user.bio.as_deref(),
            record.user.company.as_deref(),
            &repos_json,
            record.user.pinned_repos_json.as_deref(),
            record.user.contributed_repos_json.as_deref(),
        );
        let skills: Vec<String> = extract_skills(&skills_text)
            .into_iter()
            .map(String::from)
            .collect();
        let score = compute_rising_score(record, skills.len());

        let ap = record.user.activity_profile.as_ref();
        let strength = compute_strength_score(record, skills.len());
        let opp_match = compute_opp_skill_match(&skills, &opp_skills);
        let position_level = infer_position(record.user.bio.as_deref()).map(String::from);
        ranked.push((
            Candidate {
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
                strength_score: strength.score,
                opp_skill_match: opp_match,
                position_level,
                account_age_days: ap.map(|a| a.account_age_days),
                last_active_date: ap.and_then(|a| a.last_active_date.clone()),
                days_since_last_active: ap.and_then(|a| a.days_since_last_active),
                contributions_30d: ap.map(|a| a.contributions_30d),
                contributions_90d: ap.map(|a| a.contributions_90d),
                contributions_365d: ap.map(|a| a.contributions_365d),
                current_streak_days: ap.map(|a| a.current_streak_days),
                activity_trend: ap.map(|a| a.activity_trend.clone()),
                recency: Some(score.recency),
                contribution_quality: Some(score.contribution_quality),
            },
            *london_verified,
        ));
    }

    // Composite sort: strength-gated skill match + strength + rising + contribution quality
    // Low-credibility profiles (few followers/stars) get their skill match discounted
    let composite = |s: &Candidate| -> f32 {
        // Credibility: log(followers+1)/log(100) capped at 1.0, floored at 0.3
        let cred = 0.3 + 0.7 * ((s.followers as f32 + 1.0).ln() / 100_f32.ln()).min(1.0);
        let cq = s.contribution_quality.unwrap_or(0.0);
        if !opp_skills.is_empty() {
            0.30 * (s.opp_skill_match * cred) + 0.30 * s.strength_score + 0.25 * s.rising_score + 0.15 * cq
        } else {
            0.50 * s.strength_score + 0.30 * s.rising_score + 0.20 * cq
        }
    };
    ranked.sort_by(|a, b| composite(&b.0).partial_cmp(&composite(&a.0)).unwrap());

    // ── Channel 5: Network expansion — followers of top candidates ──────────
    // Take top 15 and mine their followers for more candidates
    let seed_logins: Vec<String> = ranked
        .iter()
        .take(15)
        .map(|(s, _)| s.login.clone())
        .collect();

    if !seed_logins.is_empty() {
        info!("Channel 5: network expansion from top {} seeds", seed_logins.len());
        let mut network_logins: HashSet<String> = HashSet::new();
        let existing_logins: HashSet<String> = ranked.iter().map(|(s, _)| s.login.clone()).collect();

        for seed in &seed_logins {
            match gh.get_user_followers_graphql(seed, 20).await {
                Ok(followers) => {
                    for f in &followers {
                        if !is_bot(&f.login)
                            && !existing_logins.contains(&f.login)
                            && !lance_db.is_known(&f.login)
                        {
                            let loc = f.location.as_deref();
                            if is_london(loc) || is_uk_wide(loc) {
                                add_source(&mut sources, &f.login, format!("src:net/{seed}"));
                                network_logins.insert(f.login.clone());
                            }
                        }
                    }
                    info!(
                        "  @{seed}: {} followers, {} new UK-based",
                        followers.len(),
                        network_logins.len()
                    );
                }
                Err(e) => warn!("  followers @{seed} failed: {e}"),
            }
            tokio::time::sleep(Duration::from_secs(1)).await;
        }

        // Network followers are already hydrated by get_user_followers_graphql
        // but we need to re-hydrate those not yet in our set to get full profiles.
        // Actually, get_user_followers_graphql already returns full GhUser profiles.
        // So we can directly build ContributorRecords from them.
        if !network_logins.is_empty() {
            info!("Network expansion: re-hydrating {} new logins", network_logins.len());
            let net_logins: Vec<String> = network_logins.into_iter().collect();

            for chunk in net_logins.chunks(10) {
                let chunk_vec: Vec<String> = chunk.to_vec();
                match gh.get_users_graphql(&chunk_vec).await {
                    Ok(users) => {
                        for user in users {
                            let loc = user.location.as_deref();
                            let london = is_london(loc);

                            let record = ContributorRecord {
                                total_contributions: user.public_repos,
                                repos: vec![RepoContrib {
                                    repo: "network-expansion".to_string(),
                                    contributions: user.public_repos,
                                }],
                                user,
                            };

                            let repos_json = serde_json::to_string(&record.repos).unwrap_or_default();
                            let skills_text = contributor_skills_text(
                                record.user.bio.as_deref(),
                                record.user.company.as_deref(),
                                &repos_json,
                                record.user.pinned_repos_json.as_deref(),
                                record.user.contributed_repos_json.as_deref(),
                            );
                            let skills: Vec<String> = extract_skills(&skills_text)
                                .into_iter()
                                .map(String::from)
                                .collect();
                            let score = compute_rising_score(&record, skills.len());

                            let ap = record.user.activity_profile.as_ref();
                            let strength = compute_strength_score(&record, skills.len());
                            let opp_match = compute_opp_skill_match(&skills, &opp_skills);
                            let position_level = infer_position(record.user.bio.as_deref()).map(String::from);
                            ranked.push((
                                Candidate {
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
                                    strength_score: strength.score,
                                    opp_skill_match: opp_match,
                                    position_level,
                                    account_age_days: ap.map(|a| a.account_age_days),
                                    last_active_date: ap.and_then(|a| a.last_active_date.clone()),
                                    days_since_last_active: ap.and_then(|a| a.days_since_last_active),
                                    contributions_30d: ap.map(|a| a.contributions_30d),
                                    contributions_90d: ap.map(|a| a.contributions_90d),
                                    contributions_365d: ap.map(|a| a.contributions_365d),
                                    current_streak_days: ap.map(|a| a.current_streak_days),
                                    activity_trend: ap.map(|a| a.activity_trend.clone()),
                                    recency: Some(score.recency),
                                    contribution_quality: Some(score.contribution_quality),
                                },
                                london,
                            ));

                            // Insert into LanceDB
                            if let Err(e) = lance_db.insert(&[record]).await {
                                warn!("  LanceDB insert (net) failed: {e}");
                            }
                        }
                    }
                    Err(e) => warn!("  network hydration batch failed: {e}"),
                }
                tokio::time::sleep(Duration::from_millis(500)).await;
            }
        }

        // Re-sort after network expansion (composite rank)
        ranked.sort_by(|a, b| composite(&b.0).partial_cmp(&composite(&a.0)).unwrap());
        info!("Channel 5 done: {} total candidates", ranked.len());
    }

    // ── Print summary ───────────────────────────────────────────────────────
    let display_n = ranked.len().min(top_n);
    println!("\n╔══ LONDON AI CANDIDATES v3 — {opp_id} ═══════════════════════╗");
    for (rank, (s, london)) in ranked.iter().take(display_n).enumerate() {
        let name = s.name.as_deref().unwrap_or(&s.login);
        let company = s.company.as_deref().unwrap_or("-");
        let location = s.location.as_deref().unwrap_or("-");
        let email = s.email.as_deref().unwrap_or("-");
        let loc_tag = if *london { "LONDON" } else { "UK-WIDE" };
        let src_tags = sources
            .get(&s.login)
            .map(|v| v.join(", "))
            .unwrap_or_default();
        let comp_score = composite(s);
        let pos_label = s.position_level.as_deref().unwrap_or("-");

        let age_str = match s.account_age_days {
            Some(d) => format!("{:.1}y", d as f32 / 365.0),
            None => "?".into(),
        };
        let last_active_str = match (&s.last_active_date, s.days_since_last_active) {
            (Some(date), Some(d)) => format!("{date} ({d}d ago)"),
            _ => "-".into(),
        };
        let trend = s.activity_trend.as_deref().unwrap_or("-");

        let cq = s.contribution_quality.unwrap_or(0.0);
        println!(
            "#{:<3} comp={:.3}  strength={:.3}  rising={:.3}  opp={:.0}%  cq={:.3}  {name} (@{})",
            rank + 1,
            comp_score,
            s.strength_score,
            s.rising_score,
            s.opp_skill_match * 100.0,
            cq,
            s.login,
        );
        println!("      [{loc_tag}] {location}  company={company}  position={pos_label}");
        println!("      email={email}  followers={}  repos={}", s.followers, s.public_repos);
        println!(
            "      account_age={age_str}  last_active={last_active_str}  trend={trend}",
        );
        if let (Some(c30), Some(c90), Some(c365)) = (s.contributions_30d, s.contributions_90d, s.contributions_365d) {
            let streak = s.current_streak_days.unwrap_or(0);
            println!("      30d={c30}  90d={c90}  365d={c365}  streak={streak}d");
        }
        if let Some(bio) = &s.bio {
            let truncated: String = bio.chars().take(120).collect();
            println!("      bio={truncated}");
        }
        if !s.skills.is_empty() {
            println!("      skills={}", s.skills.join(", "));
        }
        if !src_tags.is_empty() {
            println!("      sources={src_tags}");
        }
        println!();
    }
    println!("╚══════════════════════════════════════════════════════════════════╝");
    println!(
        "Summary: {} total candidates, {} London-verified, {} UK-wide",
        ranked.len(),
        ranked.iter().filter(|(_, l)| *l).count(),
        ranked.iter().filter(|(_, l)| !*l).count(),
    );
    let above_threshold = ranked.iter().filter(|(s, _)| s.rising_score >= threshold).count();
    println!("  {} above {threshold:.2} threshold", above_threshold);

    // ── Export to Neon ───────────────────────────────────────────────────────
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

        for (candidate, london_verified) in &ranked {
            let mut extra_tags = vec![
                format!("opp:{opp_id}"),
                "github:candidate-search-v2".to_string(),
            ];
            if *london_verified {
                extra_tags.push("location:london-verified".to_string());
            } else {
                extra_tags.push("location:uk-wide".to_string());
            }
            // Add source provenance tags
            if let Some(src) = sources.get(&candidate.login) {
                for s in src {
                    extra_tags.push(s.clone());
                }
            }

            match save_contributor_contact(&pool, candidate, threshold, &extra_tags).await {
                Ok(Some(id)) => {
                    exported += 1;
                    tracing::debug!("exported {} → contacts id={id}", candidate.login);
                }
                Ok(None) => {
                    skipped += 1;
                }
                Err(e) => {
                    warn!("failed to export {}: {e}", candidate.login);
                }
            }
        }

        info!("export complete — {exported} contacts upserted, {skipped} below threshold");
    }

    Ok(())
}
