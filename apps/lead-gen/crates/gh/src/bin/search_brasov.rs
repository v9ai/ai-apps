/// search_brasov — Deep GitHub user search for AI/ML experts in Brașov, Romania.
///
/// Full 6-channel parity with search_candidates.rs, but strictly scoped to
/// Brașov-dwelling users (all diacritic variants). **No DB writes** — results
/// are printed to stdout and written to a local JSON file.
///
/// Channels:
///   1. Bio/keyword search (12 passes, all `location:Brasov`)
///   2. Stargazer mining  (same global AI repos, post-filtered by location)
///   3. Contributor mining (same global AI repos, post-filtered by location)
///   4. Org member mining  (Romanian tech orgs)
///   5. Network expansion  (followers of top Brașov seeds)
///   6. GraphQL batch hydration
///
/// Environment variables:
///   GITHUB_TOKEN / GH_TOKEN  GitHub PAT (required)
///   TOP_N                    Top candidates to display (default 50)
///   OUTPUT_JSON              Output path (default ./brasov_experts.json)
use std::collections::{HashMap, HashSet};
use std::time::Duration;

use regex::Regex;
use tracing::{info, warn};

use github_patterns::contributors::{
    compute_opp_skill_match, compute_rising_score, compute_strength_score, infer_position,
    is_bot, Candidate, ContributorRecord, RepoContrib,
};
use github_patterns::skills::{contributor_skills_text, extract_skills};
use github_patterns::GhClient;

// ── Location filter (strict Brașov) ──────────────────────────────────────────

fn brasov_regex() -> Regex {
    // Matches Brasov / Brașov (s-comma) / Braşov (s-cedilla), case-insensitive.
    Regex::new(r"(?i)\bbra[sșş]ov\b").unwrap()
}

fn is_brasov(location: Option<&str>) -> bool {
    location.map_or(false, |l| brasov_regex().is_match(l))
}

// ── Search queries ───────────────────────────────────────────────────────────

fn search_queries() -> Vec<(&'static str, &'static str)> {
    vec![
        ("A: AI engineer",      "location:Brasov AI engineer type:user"),
        ("B: ML engineer",      "location:Brasov machine learning type:user"),
        ("C: LLM / RAG",        "location:Brasov LLM RAG type:user"),
        ("D: deep learning",    "location:Brasov deep learning pytorch type:user"),
        ("E: frameworks",       "location:Brasov langchain langgraph type:user"),
        ("F: agentic",          "location:Brasov agent agentic type:user"),
        ("G: vector DB",        "location:Brasov pinecone weaviate qdrant type:user"),
        ("H: MLOps",            "location:Brasov MLOps type:user"),
        ("I: data science",     "location:Brasov data scientist python type:user"),
        ("J: fine-tuning",      "location:Brasov fine-tuning transformers type:user"),
        ("K: Anthropic/Claude", "location:Brasov anthropic claude type:user"),
        ("L: followers>10",     "location:Brasov AI followers:>10 type:user"),
    ]
}

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
        "stanfordnlp/dspy",
        "jxnl/instructor",
        "outlines-dev/outlines",
        "run-llama/llama_index",
    ]
}

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
        "stanfordnlp/dspy",
        "jxnl/instructor",
        "microsoft/semantic-kernel",
        "BerriAI/litellm",
    ]
}

/// Romanian tech/AI orgs whose public members may include Brașov-based engineers.
/// Brașov yield is expected to be low — most hits will come from channels 1–3.
fn romanian_ai_orgs() -> Vec<&'static str> {
    vec![
        "bitdefender",
        "UiPath",
        "endava",
        "fortech",
        "softvision",
        "3Pillar-Labs",
    ]
}

fn add_source(sources: &mut HashMap<String, Vec<String>>, login: &str, tag: String) {
    sources.entry(login.to_string()).or_default().push(tag);
}

// ── Main ─────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Try several .env.local locations so the bin works from any CWD.
    dotenvy::from_filename("../../.env.local").ok();
    dotenvy::from_filename("../../apps/lead-gen/.env.local").ok();
    dotenvy::from_filename("apps/lead-gen/.env.local").ok();
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "search_brasov=info,github_patterns=info".into()),
        )
        .init();

    let top_n: usize = std::env::var("TOP_N")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(50);
    let output_json = std::env::var("OUTPUT_JSON")
        .unwrap_or_else(|_| "./brasov_experts.json".into());
    let opp_skills: Vec<String> = std::env::var("OPP_SKILLS")
        .unwrap_or_default()
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    let gh = GhClient::from_env()?;
    info!("GitHub client ready — Brașov-strict mode, no DB writes");

    let mut seen_logins: HashSet<String> = HashSet::new();
    let mut sources: HashMap<String, Vec<String>> = HashMap::new();
    let mut contrib_counts: HashMap<String, (String, u32)> = HashMap::new();

    // ── Channel 1: Bio/keyword search ───────────────────────────────────────
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

    // ── Channel 3: Contributor mining ───────────────────────────────────────
    for repo_full in contributor_repos() {
        let (owner, repo) = repo_full.split_once('/').unwrap();
        info!("mining contributors: {repo_full}");

        match gh.repo_contributors(owner, repo).await {
            Ok(contributors) => {
                let mut added = 0;
                for c in &contributors {
                    if c.contributions >= 3 && !is_bot(&c.login) {
                        add_source(&mut sources, &c.login, format!("src:contrib/{repo_full}"));
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
    for org in romanian_ai_orgs() {
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

    // ── Phase 2: Hydrate + Brașov filter ────────────────────────────────────
    let logins: Vec<String> = seen_logins.into_iter().collect();
    info!("hydrating {} profiles via GraphQL (batches of 10)…", logins.len());

    let mut candidates: Vec<ContributorRecord> = Vec::new();
    let mut skipped_location = 0u32;

    let batch_size = 10;
    let concurrency = 3;
    let total_batches = (logins.len() + batch_size - 1) / batch_size;

    for group_start in (0..total_batches).step_by(concurrency) {
        let group_end = (group_start + concurrency).min(total_batches);
        let mut handles = Vec::new();

        for batch_idx in group_start..group_end {
            let start = batch_idx * batch_size;
            let end = (start + batch_size).min(logins.len());
            let chunk_vec: Vec<String> = logins[start..end].to_vec();
            let gh_ref = &gh;
            handles.push(async move {
                (batch_idx, gh_ref.get_users_graphql(&chunk_vec).await)
            });
        }

        let results = futures::future::join_all(handles).await;

        for (batch_idx, result) in results {
            match result {
                Ok(users) => {
                    for user in users {
                        if !is_brasov(user.location.as_deref()) {
                            skipped_location += 1;
                            continue;
                        }
                        let (repo_source, contrib_count) = contrib_counts
                            .get(&user.login)
                            .cloned()
                            .unwrap_or_else(|| {
                                ("github-search".to_string(), user.public_repos)
                            });
                        candidates.push(ContributorRecord {
                            total_contributions: contrib_count,
                            repos: vec![RepoContrib {
                                repo: repo_source,
                                contributions: contrib_count,
                            }],
                            user,
                        });
                    }
                }
                Err(e) => warn!("  GraphQL batch {} failed: {e}", batch_idx + 1),
            }
        }

        let fetched = (group_end * batch_size).min(logins.len());
        info!(
            "  batch {}-{}/{}: hydrated {}/{} — {} Brașov candidates, {} filtered",
            group_start + 1,
            group_end,
            total_batches,
            fetched,
            logins.len(),
            candidates.len(),
            skipped_location,
        );

        tokio::time::sleep(Duration::from_millis(400)).await;
    }

    info!(
        "Phase 2 complete: {} Brașov candidates, {} filtered out",
        candidates.len(),
        skipped_location,
    );

    // ── Phase 3: Score + build Candidate entries ────────────────────────────
    let mut ranked: Vec<Candidate> = Vec::new();
    for record in &candidates {
        ranked.push(build_candidate(record, &opp_skills));
    }

    let composite = |s: &Candidate| -> f32 {
        let cred = 0.3 + 0.7 * ((s.followers as f32 + 1.0).ln() / 100_f32.ln()).min(1.0);
        let cq = s.contribution_quality.unwrap_or(0.0);
        if !opp_skills.is_empty() {
            0.30 * (s.opp_skill_match * cred)
                + 0.30 * s.strength_score
                + 0.25 * s.rising_score
                + 0.15 * cq
        } else {
            0.50 * s.strength_score + 0.30 * s.rising_score + 0.20 * cq
        }
    };
    ranked.sort_by(|a, b| composite(b).partial_cmp(&composite(a)).unwrap());

    // ── Channel 5: Network expansion ────────────────────────────────────────
    let seed_logins: Vec<String> = ranked.iter().take(15).map(|s| s.login.clone()).collect();

    if !seed_logins.is_empty() {
        info!("Channel 5: network expansion from top {} seeds", seed_logins.len());
        let mut network_logins: HashSet<String> = HashSet::new();
        let existing: HashSet<String> = ranked.iter().map(|s| s.login.clone()).collect();

        for seed in &seed_logins {
            match gh.get_user_followers_graphql(seed, 20).await {
                Ok(followers) => {
                    let mut new_here = 0;
                    for f in &followers {
                        if !is_bot(&f.login)
                            && !existing.contains(&f.login)
                            && is_brasov(f.location.as_deref())
                        {
                            add_source(&mut sources, &f.login, format!("src:net/{seed}"));
                            if network_logins.insert(f.login.clone()) {
                                new_here += 1;
                            }
                        }
                    }
                    info!(
                        "  @{seed}: {} followers, {new_here} new Brașov-based",
                        followers.len(),
                    );
                }
                Err(e) => warn!("  followers @{seed} failed: {e}"),
            }
            tokio::time::sleep(Duration::from_secs(1)).await;
        }

        if !network_logins.is_empty() {
            info!("Hydrating {} network candidates", network_logins.len());
            let net_logins: Vec<String> = network_logins.into_iter().collect();
            for chunk in net_logins.chunks(10) {
                let chunk_vec: Vec<String> = chunk.to_vec();
                match gh.get_users_graphql(&chunk_vec).await {
                    Ok(users) => {
                        for user in users {
                            if !is_brasov(user.location.as_deref()) {
                                continue;
                            }
                            let record = ContributorRecord {
                                total_contributions: user.public_repos,
                                repos: vec![RepoContrib {
                                    repo: "network-expansion".to_string(),
                                    contributions: user.public_repos,
                                }],
                                user,
                            };
                            ranked.push(build_candidate(&record, &opp_skills));
                        }
                    }
                    Err(e) => warn!("  network hydration batch failed: {e}"),
                }
                tokio::time::sleep(Duration::from_millis(500)).await;
            }
        }

        ranked.sort_by(|a, b| composite(b).partial_cmp(&composite(a)).unwrap());
        info!("Channel 5 done: {} total candidates", ranked.len());
    }

    // ── Stdout summary ──────────────────────────────────────────────────────
    let display_n = ranked.len().min(top_n);
    println!("\n╔══ BRAȘOV AI/ML EXPERTS ══════════════════════════════════════════╗");
    for (rank, s) in ranked.iter().take(display_n).enumerate() {
        let name = s.name.as_deref().unwrap_or(&s.login);
        let company = s.company.as_deref().unwrap_or("-");
        let location = s.location.as_deref().unwrap_or("-");
        let email = s.email.as_deref().unwrap_or("-");
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
        println!("      {location}  company={company}  position={pos_label}");
        println!(
            "      email={email}  followers={}  repos={}",
            s.followers, s.public_repos
        );
        println!(
            "      account_age={age_str}  last_active={last_active_str}  trend={trend}",
        );
        if let (Some(c30), Some(c90), Some(c365)) =
            (s.contributions_30d, s.contributions_90d, s.contributions_365d)
        {
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
    println!("Summary: {} Brașov candidates total", ranked.len());

    // ── Write JSON output ───────────────────────────────────────────────────
    let json_array: Vec<serde_json::Value> = ranked
        .iter()
        .map(|s| {
            serde_json::json!({
                "login": s.login,
                "html_url": s.html_url,
                "name": s.name,
                "email": s.email,
                "company": s.company,
                "location": s.location,
                "bio": s.bio,
                "followers": s.followers,
                "public_repos": s.public_repos,
                "total_contributions": s.total_contributions,
                "ai_repos_count": s.ai_repos_count,
                "rising_score": s.rising_score,
                "strength_score": s.strength_score,
                "opp_skill_match": s.opp_skill_match,
                "composite_score": composite(s),
                "position_level": s.position_level,
                "skills": s.skills,
                "account_age_days": s.account_age_days,
                "last_active_date": s.last_active_date,
                "days_since_last_active": s.days_since_last_active,
                "contributions_30d": s.contributions_30d,
                "contributions_90d": s.contributions_90d,
                "contributions_365d": s.contributions_365d,
                "current_streak_days": s.current_streak_days,
                "activity_trend": s.activity_trend,
                "contribution_quality": s.contribution_quality,
                "gh_created_at": s.gh_created_at,
                "sources": sources.get(&s.login).cloned().unwrap_or_default(),
            })
        })
        .collect();

    let file = std::fs::File::create(&output_json)?;
    serde_json::to_writer_pretty(file, &json_array)?;
    info!("wrote {} candidates to {}", json_array.len(), output_json);

    Ok(())
}

fn build_candidate(record: &ContributorRecord, opp_skills: &[String]) -> Candidate {
    let repos_json = serde_json::to_string(&record.repos).unwrap_or_default();
    let skills_text = contributor_skills_text(
        record.user.bio.as_deref(),
        record.user.company.as_deref(),
        &repos_json,
        record.user.pinned_repos_json.as_deref(),
        record.user.contributed_repos_json.as_deref(),
        record.user.top_repos_json.as_deref(),
    );
    let skills: Vec<String> = extract_skills(&skills_text)
        .into_iter()
        .map(String::from)
        .collect();
    let score = compute_rising_score(record, skills.len());
    let strength = compute_strength_score(record, skills.len());
    let opp_match = compute_opp_skill_match(&skills, opp_skills);
    let position_level = infer_position(record.user.bio.as_deref()).map(String::from);
    let ap = record.user.activity_profile.as_ref();

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
    }
}
