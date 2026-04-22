use crate::embed::cosine;
use crate::types::{GhCandidate, ScoreBreakdown};
use strsim::jaro_winkler;
use unicode_normalization::UnicodeNormalization;

pub struct ScoreWeights {
    pub name: f32,
    pub affil: f32,
    pub topic: f32,
    pub signal: f32,
}

impl Default for ScoreWeights {
    fn default() -> Self {
        Self { name: 0.35, affil: 0.25, topic: 0.30, signal: 0.10 }
    }
}

pub fn score_candidate(
    author_name: &str,
    author_affil: Option<&str>,
    author_email: Option<&str>,
    author_topic_emb: &[f32],
    cand: &GhCandidate,
    cand_topic_emb: &[f32],
    w: &ScoreWeights,
) -> ScoreBreakdown {
    let name_sim = name_similarity(author_name, cand);
    let affil_overlap = affil_similarity(author_affil, cand);
    let topic_cos = if author_topic_emb.is_empty() || cand_topic_emb.is_empty() {
        0.0
    } else {
        (cosine(author_topic_emb, cand_topic_emb) + 1.0) / 2.0
    };
    let signal_match = signal_similarity(author_email, cand);

    let total = w.name * name_sim
        + w.affil * affil_overlap
        + w.topic * topic_cos
        + w.signal * signal_match;

    ScoreBreakdown { name_sim, affil_overlap, topic_cos, signal_match, total }
}

fn norm(s: &str) -> String {
    s.nfkd()
        .filter(|c| !unicode_normalization::char::is_combining_mark(*c))
        .collect::<String>()
        .to_lowercase()
}

fn name_similarity(author: &str, cand: &GhCandidate) -> f32 {
    let a = norm(author);
    let mut best: f32 = 0.0;
    let mut try_against = |t: &str| {
        let s = jaro_winkler(&a, &norm(t)) as f32;
        if s > best { best = s; }
    };
    try_against(&cand.login);
    if let Some(n) = &cand.name { try_against(n); }
    if let Some((first, last)) = author.split_once(' ') {
        let compact = format!("{}{}", first.chars().next().unwrap_or(' '), last);
        try_against(&compact);
    }
    best
}

fn tokens(s: &str) -> Vec<String> {
    s.split(|c: char| !c.is_alphanumeric())
        .filter(|t| t.len() > 2)
        .map(|t| t.to_lowercase())
        .collect()
}

fn affil_similarity(author_affil: Option<&str>, cand: &GhCandidate) -> f32 {
    let a = match author_affil {
        Some(s) if !s.is_empty() => s,
        _ => return 0.0,
    };
    let haystack = [
        cand.company.as_deref().unwrap_or(""),
        cand.bio.as_deref().unwrap_or(""),
        cand.location.as_deref().unwrap_or(""),
        cand.email.as_deref().unwrap_or(""),
        cand.website_url.as_deref().unwrap_or(""),
    ]
    .join(" ");
    let atoks: std::collections::HashSet<_> = tokens(a).into_iter().collect();
    let htoks: std::collections::HashSet<_> = tokens(&haystack).into_iter().collect();
    if atoks.is_empty() { return 0.0; }
    let inter = atoks.intersection(&htoks).count() as f32;
    inter / atoks.len() as f32
}

fn signal_similarity(author_email: Option<&str>, cand: &GhCandidate) -> f32 {
    let mut hits = 0.0;
    let mut max = 0.0;
    if let Some(e) = author_email {
        max += 1.0;
        if let Some(dom) = e.split('@').nth(1) {
            let blob = [
                cand.email.as_deref().unwrap_or(""),
                cand.website_url.as_deref().unwrap_or(""),
                cand.bio.as_deref().unwrap_or(""),
            ].join(" ").to_lowercase();
            if blob.contains(&dom.to_lowercase()) { hits += 1.0; }
        }
    }
    max += 1.0;
    if cand.website_url.is_some() || cand.twitter.is_some() { hits += 0.5; }
    if max == 0.0 { 0.0 } else { hits / max }
}

pub fn candidate_topic_text(cand: &GhCandidate) -> String {
    let mut parts: Vec<String> = vec![];
    if let Some(b) = &cand.bio { parts.push(b.clone()); }
    for r in cand.pinned_repos.iter().chain(cand.top_repos.iter()).take(10) {
        if let Some(d) = &r.description { parts.push(d.clone()); }
        if !r.topics.is_empty() { parts.push(r.topics.join(" ")); }
    }
    parts.join(". ")
}
