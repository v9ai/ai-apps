/// match_paper_authors — given contacts tagged with their papers, pick the most
/// likely GitHub login for each author via deterministic scoring on enriched
/// GraphQL profile data. No LLM in the loop.
///
/// Stdin:
///   {"contacts":[{"id":"c1","name":"Jane Doe","affiliation":"Stanford",
///                 "email":"jane@stanford.edu",
///                 "paper_titles":["Neural Intent Scoring for B2B Lead Prioritization"]}]}
///
/// Stdout:
///   {"results":[{"contact_id":"c1","github_login":"janed","github_confidence":0.83,
///                "github_evidence":"name=strong affiliation=match topical=rag,llm",
///                "candidates_considered":5}]}
///
/// Env:
///   GITHUB_TOKEN / GH_TOKEN   (required)
///   MATCH_THRESHOLD           (default: 0.7)
use std::collections::{HashMap, HashSet};
use std::io::{self, Read, Write};
use std::time::Duration;

use serde::{Deserialize, Serialize};

use github_patterns::skills::{contributor_skills_text, extract_skills};
use github_patterns::types::GhUser;
use github_patterns::GhClient;

#[derive(Debug, Deserialize)]
struct InputContact {
    id: serde_json::Value,
    name: String,
    #[serde(default)]
    affiliation: Option<String>,
    #[serde(default)]
    email: Option<String>,
    #[serde(default)]
    paper_titles: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct Input {
    contacts: Vec<InputContact>,
}

#[derive(Debug, Serialize)]
struct ResultRecord {
    contact_id: serde_json::Value,
    github_login: Option<String>,
    github_confidence: f32,
    github_evidence: String,
    candidates_considered: usize,
}

#[derive(Debug, Serialize)]
struct Output {
    results: Vec<ResultRecord>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let mut raw = String::new();
    io::stdin().read_to_string(&mut raw)?;
    let input: Input = serde_json::from_str(&raw)?;

    let threshold: f32 = std::env::var("MATCH_THRESHOLD")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.7);

    let gh = GhClient::from_env()?;

    let mut results = Vec::with_capacity(input.contacts.len());
    for contact in input.contacts {
        let record = process_contact(&gh, &contact, threshold).await;
        results.push(record);
        // Light pacing between contacts — the crate already retries on 429,
        // this just keeps steady-state point consumption gentle.
        tokio::time::sleep(Duration::from_millis(150)).await;
    }

    let mut stdout = io::stdout().lock();
    serde_json::to_writer(&mut stdout, &Output { results })?;
    stdout.write_all(b"\n")?;
    Ok(())
}

async fn process_contact(gh: &GhClient, c: &InputContact, threshold: f32) -> ResultRecord {
    let (first, last) = split_name(&c.name);
    let logins = match find_candidates(gh, &c.name, c.affiliation.as_deref(), c.email.as_deref()).await {
        Ok(v) => v,
        Err(_) => Vec::new(),
    };

    if logins.is_empty() {
        return ResultRecord {
            contact_id: c.id.clone(),
            github_login: None,
            github_confidence: 0.0,
            github_evidence: "no candidates returned".into(),
            candidates_considered: 0,
        };
    }

    // Hydrate up to 5 — more than that is wasted budget for the long tail of
    // unrelated matches GitHub's fuzzy search returns.
    let top: Vec<String> = logins.iter().take(5).cloned().collect();
    let users = match gh.get_users_graphql(&top).await {
        Ok(v) => v,
        Err(_) => Vec::new(),
    };

    if users.is_empty() {
        return ResultRecord {
            contact_id: c.id.clone(),
            github_login: None,
            github_confidence: 0.0,
            github_evidence: "hydrate failed".into(),
            candidates_considered: top.len(),
        };
    }

    // Pre-compute paper skills once; reused across candidates.
    let paper_text = c.paper_titles.join(" ");
    let paper_skills: HashSet<&'static str> = extract_skills(&paper_text).into_iter().collect();

    let email_domain = c
        .email
        .as_deref()
        .and_then(|e| e.split_once('@').map(|(_, d)| d.to_lowercase()));

    let mut best: Option<(f32, String, String)> = None;
    for u in &users {
        let (score, why) = score_user(u, &first, &last, c.affiliation.as_deref(), email_domain.as_deref(), &paper_skills);
        if best.as_ref().map_or(true, |(s, _, _)| score > *s) {
            best = Some((score, u.login.clone(), why));
        }
    }

    let (score, login, evidence) = best.unwrap_or((0.0, String::new(), "no scoreable candidate".into()));
    let matched = score >= threshold && !login.is_empty();
    ResultRecord {
        contact_id: c.id.clone(),
        github_login: if matched { Some(login) } else { None },
        github_confidence: score,
        github_evidence: evidence,
        candidates_considered: users.len(),
    }
}

fn split_name(full: &str) -> (String, String) {
    let tokens: Vec<&str> = full.split_whitespace().collect();
    match tokens.as_slice() {
        [] => (String::new(), String::new()),
        [only] => (String::new(), (*only).to_string()),
        [first, .., last] => ((*first).to_string(), (*last).to_string()),
    }
}

async fn find_candidates(
    gh: &GhClient,
    name: &str,
    affiliation: Option<&str>,
    email: Option<&str>,
) -> anyhow::Result<Vec<String>> {
    let mut queries: Vec<String> = Vec::new();
    // Primary: fullname qualifier (matches the display name field).
    queries.push(format!(r#"fullname:"{}""#, name));
    if let Some(a) = affiliation.filter(|s| !s.trim().is_empty()) {
        queries.push(format!(r#"fullname:"{}" {}"#, name, sanitize(a)));
    }
    if let Some(e) = email.and_then(|e| e.split_once('@').map(|(_, d)| d.to_string())) {
        queries.push(format!(r#"fullname:"{}" {}"#, name, e));
    }

    let mut seen: HashSet<String> = HashSet::new();
    let mut out: Vec<String> = Vec::new();
    for q in queries {
        let resp = match gh.search_users(&q, Some("followers"), Some("desc"), 10, 1).await {
            Ok(r) => r,
            Err(_) => continue,
        };
        for item in resp.items {
            if seen.insert(item.login.clone()) {
                out.push(item.login);
                if out.len() >= 8 {
                    return Ok(out);
                }
            }
        }
    }
    Ok(out)
}

/// Drop characters GitHub search doesn't want in qualifier values.
fn sanitize(s: &str) -> String {
    s.chars().filter(|c| !matches!(c, '"' | ':' | '\\')).collect::<String>().trim().to_string()
}

fn score_user(
    u: &GhUser,
    first: &str,
    last: &str,
    affiliation: Option<&str>,
    email_domain: Option<&str>,
    paper_skills: &HashSet<&'static str>,
) -> (f32, String) {
    // ── Name overlap: exact last-name word + first-name or initial match ──
    let name_score = score_name(u, first, last);

    // ── Topical overlap: user's skill bag vs paper skill bag ──────────────
    let user_skill_text = contributor_skills_text(
        u.bio.as_deref(),
        u.company.as_deref(),
        "[]",
        u.pinned_repos_json.as_deref(),
        u.contributed_repos_json.as_deref(),
        u.top_repos_json.as_deref(),
    );
    let user_skills: HashSet<&'static str> = extract_skills(&user_skill_text).into_iter().collect();
    let topical_score = if paper_skills.is_empty() {
        0.0
    } else {
        let overlap = user_skills.intersection(paper_skills).count() as f32;
        (overlap / paper_skills.len() as f32).min(1.0)
    };

    // ── Affiliation match: substring in company/bio/location ──────────────
    let affil_score = match affiliation {
        Some(a) if !a.trim().is_empty() => {
            let needle = a.to_lowercase();
            let haystack = format!(
                "{} {} {}",
                u.company.as_deref().unwrap_or("").to_lowercase(),
                u.bio.as_deref().unwrap_or("").to_lowercase(),
                u.location.as_deref().unwrap_or("").to_lowercase(),
            );
            // Match on any significant token of the affiliation (2+ chars) —
            // "Stanford University" hits "stanford" in company.
            needle
                .split_whitespace()
                .filter(|t| t.len() >= 4)
                .any(|t| haystack.contains(t))
                .then_some(1.0)
                .unwrap_or(0.0)
        }
        _ => 0.0,
    };

    // ── Homepage/social presence: weak but useful tiebreaker ──────────────
    let mut homepage_score: f32 = 0.0;
    if u.blog.as_deref().map_or(false, |b| !b.is_empty()) {
        homepage_score += 0.5;
    }
    if u.twitter_username.as_deref().map_or(false, |t| !t.is_empty()) {
        homepage_score += 0.25;
    }
    // Email domain match is a strong signal — promote it into homepage bucket.
    if let (Some(ed), Some(user_email)) = (email_domain, u.email.as_deref()) {
        if user_email.to_lowercase().ends_with(ed) {
            homepage_score = 1.0;
        }
    }
    homepage_score = homepage_score.min(1.0);

    let combined = 0.45 * name_score + 0.30 * topical_score + 0.15 * affil_score + 0.10 * homepage_score;

    let evidence = format!(
        "name={:.2} topical={:.2} affil={:.2} home={:.2} overlap=[{}]",
        name_score,
        topical_score,
        affil_score,
        homepage_score,
        user_skills
            .intersection(paper_skills)
            .copied()
            .collect::<Vec<_>>()
            .join(","),
    );
    (combined.clamp(0.0, 1.0), evidence)
}

/// Strict name-token match ported from contact_enrich_paper_author_graph.py
/// `_score_name_match`. Last name must appear as a whole token; first name
/// (or single-letter initial) boosts the floor.
fn score_name(u: &GhUser, first: &str, last: &str) -> f32 {
    let display = u.name.as_deref().unwrap_or(&u.login);
    let tokens: Vec<String> = display
        .split(|c: char| !c.is_alphabetic())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_lowercase())
        .collect();
    if tokens.is_empty() {
        return 0.0;
    }

    let last_lc = last.to_lowercase();
    let first_lc = first.to_lowercase();
    if last_lc.is_empty() || !tokens.iter().any(|t| t == &last_lc) {
        return 0.0;
    }
    if first_lc.is_empty() {
        return 0.5;
    }
    if tokens.iter().any(|t| t == &first_lc) {
        return 0.9;
    }
    // First initial match: target first = "A" and display starts with "Anil"
    if first_lc.len() == 1 && tokens[0].starts_with(&first_lc) {
        return 0.75;
    }
    // Partial login match as a weak signal when display name didn't pass —
    // "janed" for "Jane Doe" → login contains both tokens.
    let login_lc = u.login.to_lowercase();
    if login_lc.contains(&first_lc) && login_lc.contains(&last_lc) {
        return 0.7;
    }
    0.5 // last matched but first didn't — floor preserved
}

// Silence dead_code when only some helpers are used in a given build.
#[allow(dead_code)]
fn _touch_hashmap(_h: &HashMap<String, String>) {}
