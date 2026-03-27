//! URL scoring and discovery for focused crawling.
//!
//! Replaces the hardcoded URL list with a scoring heuristic that ranks
//! discovered URLs by their likelihood of containing useful contact/company
//! information. High-value paths like /team, /about, /leadership get priority.
//!
//! Includes an **extraction feedback loop** (recommended by all 4 research
//! agents): when LLM extraction succeeds on a path, similar path patterns
//! get boosted. This is a lightweight form of reward shaping without requiring
//! a neural network — closer to the CLARS-DQN adaptive reward concept (2026)
//! but using simple frequency counting.

use std::collections::{HashMap, HashSet};

/// Scores a URL path for lead-generation relevance.
///
/// Returns a score in 0.0..1.0 where higher = more likely to contain
/// useful contact or company information.
pub fn score_url(path: &str) -> f64 {
    let p = path.to_lowercase();

    // Strip query params and anchors for scoring
    let p = p.split('?').next().unwrap_or(&p);
    let p = p.split('#').next().unwrap_or(p);

    // Exact high-value paths
    for (pattern, score) in HIGH_VALUE_PATHS {
        if p == *pattern || p == format!("{}/", pattern) {
            return *score;
        }
    }

    // Partial matches — path contains keyword
    for (keyword, score) in KEYWORD_SCORES {
        if p.contains(keyword) {
            return *score;
        }
    }

    // Penalize clearly non-useful paths
    for ext in LOW_VALUE_EXTENSIONS {
        if p.ends_with(ext) {
            return 0.0;
        }
    }

    for prefix in LOW_VALUE_PREFIXES {
        if p.starts_with(prefix) {
            return 0.05;
        }
    }

    // Default: moderate score for unknown paths
    // Shorter paths are generally more informative
    let depth = p.matches('/').count();
    match depth {
        0..=1 => 0.3,
        2 => 0.2,
        3 => 0.1,
        _ => 0.05,
    }
}

const HIGH_VALUE_PATHS: &[(&str, f64)] = &[
    ("/about", 0.95),
    ("/about-us", 0.95),
    ("/team", 0.95),
    ("/our-team", 0.95),
    ("/leadership", 0.95),
    ("/people", 0.90),
    ("/management", 0.90),
    ("/founders", 0.90),
    ("/executives", 0.90),
    ("/contact", 0.85),
    ("/contact-us", 0.85),
    ("/careers", 0.80),
    ("/jobs", 0.80),
    ("/company", 0.80),
    ("/who-we-are", 0.80),
    ("/customers", 0.70),
    ("/case-studies", 0.65),
    ("/partners", 0.60),
    ("/investors", 0.60),
    ("/press", 0.55),
    ("/newsroom", 0.55),
    ("/pricing", 0.50),
    ("/", 0.50),
];

const KEYWORD_SCORES: &[(&str, f64)] = &[
    ("team", 0.85),
    ("leadership", 0.85),
    ("about", 0.80),
    ("people", 0.80),
    ("staff", 0.80),
    ("founder", 0.75),
    ("executive", 0.75),
    ("management", 0.75),
    ("contact", 0.70),
    ("career", 0.65),
    ("job", 0.60),
    ("customer", 0.55),
    ("case-stud", 0.50),
    ("partner", 0.50),
    ("investor", 0.50),
];

const LOW_VALUE_EXTENSIONS: &[&str] = &[
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico",
    ".css", ".js", ".woff", ".woff2", ".ttf", ".eot",
    ".pdf", ".zip", ".gz", ".tar", ".mp4", ".mp3",
    ".xml", ".json", ".txt", ".csv",
];

const LOW_VALUE_PREFIXES: &[&str] = &[
    "/blog/", "/docs/", "/help/", "/support/", "/faq/",
    "/legal/", "/privacy", "/terms", "/cookie",
    "/cdn-cgi/", "/wp-content/", "/wp-includes/",
    "/static/", "/assets/", "/images/",
    "/api/", "/auth/", "/login", "/signup", "/register",
];

/// Discover URLs from a page's extracted links, deduplicated against already-seen URLs.
///
/// Returns URLs sorted by score (highest first), filtered to same-domain only.
pub fn discover_urls(
    links: &[String],
    base_domain: &str,
    seen: &HashSet<String>,
    max_urls: usize,
) -> Vec<ScoredUrl> {
    let base = base_domain.to_lowercase();

    let mut scored: Vec<ScoredUrl> = links
        .iter()
        .filter(|url| {
            let u = url.to_lowercase();
            // Same domain only
            u.contains(&base)
                // Not already seen
                && !seen.contains(&u)
                // Not a mailto/tel/javascript link
                && !u.starts_with("mailto:")
                && !u.starts_with("tel:")
                && !u.starts_with("javascript:")
        })
        .map(|url| {
            let path = extract_path(url);
            let score = score_url(&path);
            ScoredUrl {
                url: url.clone(),
                path,
                score,
            }
        })
        .filter(|su| su.score > 0.05) // Skip very low value
        .collect();

    // Dedup by path (different query params → same page)
    scored.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    let mut seen_paths: HashSet<String> = HashSet::new();
    scored.retain(|su| seen_paths.insert(su.path.clone()));

    scored.truncate(max_urls);
    scored
}

#[derive(Debug, Clone)]
pub struct ScoredUrl {
    pub url: String,
    pub path: String,
    pub score: f64,
}

fn extract_path(url: &str) -> String {
    url.split("://")
        .nth(1)
        .and_then(|s| s.find('/').map(|i| &s[i..]))
        .unwrap_or("/")
        .split('?')
        .next()
        .unwrap_or("/")
        .split('#')
        .next()
        .unwrap_or("/")
        .to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn team_page_scores_high() {
        assert!(score_url("/team") > 0.9);
        assert!(score_url("/our-team") > 0.9);
        assert!(score_url("/leadership") > 0.9);
    }

    #[test]
    fn about_page_scores_high() {
        assert!(score_url("/about") > 0.9);
        assert!(score_url("/about-us") > 0.9);
    }

    #[test]
    fn blog_scores_low() {
        assert!(score_url("/blog/some-article") < 0.1);
    }

    #[test]
    fn image_scores_zero() {
        assert_eq!(score_url("/logo.png"), 0.0);
        assert_eq!(score_url("/photo.jpg"), 0.0);
    }

    #[test]
    fn deep_paths_score_lower() {
        let shallow = score_url("/company");
        let deep = score_url("/a/b/c/d/e");
        assert!(shallow > deep);
    }

    #[test]
    fn discover_deduplicates_and_sorts() {
        let links = vec![
            "https://acme.com/team".into(),
            "https://acme.com/blog/post".into(),
            "https://acme.com/about".into(),
            "https://acme.com/logo.png".into(),
            "https://other.com/team".into(), // different domain
        ];
        let seen = HashSet::new();
        let discovered = discover_urls(&links, "acme.com", &seen, 10);

        // Should include team and about, exclude blog (low), png (zero), other domain
        assert!(discovered.len() >= 2);
        assert_eq!(discovered[0].path, "/team");
    }

    #[test]
    fn discover_skips_seen_urls() {
        let links = vec!["https://acme.com/team".into()];
        let mut seen = HashSet::new();
        seen.insert("https://acme.com/team".to_string());

        let discovered = discover_urls(&links, "acme.com", &seen, 10);
        assert!(discovered.is_empty());
    }

    #[test]
    fn adaptive_scorer_boosts_successful_patterns() {
        let mut scorer = AdaptiveUrlScorer::new();

        // Record that /team pages yield contacts
        scorer.record_extraction("/team", 3);
        scorer.record_extraction("/people", 2);
        scorer.record_extraction("/blog/post-1", 0);

        // /our-team should get boosted (matches "team" keyword from successful extractions)
        let boosted = scorer.score("/our-team");
        let unboosted = score_url("/our-team");
        assert!(
            boosted >= unboosted,
            "boosted {boosted} should be >= unboosted {unboosted}"
        );
    }

    #[test]
    fn adaptive_scorer_learns_new_patterns() {
        let mut scorer = AdaptiveUrlScorer::new();

        // A novel path that isn't in the static high-value list
        let base_score = score_url("/investors");
        scorer.record_extraction("/investors", 5);
        scorer.record_extraction("/investors/board", 3);

        let learned = scorer.score("/investors");
        assert!(
            learned > base_score,
            "learned {learned} should be > base {base_score}"
        );
    }
}

// ── Adaptive URL Scorer with Extraction Feedback ────────────────────────────

/// Adaptive URL scorer that learns from extraction outcomes.
///
/// Implements the research recommendation for a "reward signal from LLM
/// extraction quality to update scoring model" — without requiring a neural
/// network. Uses simple path-pattern frequency counting:
///
/// 1. When extraction finds N contacts on path P, record (path_pattern, N)
/// 2. Extract keywords from successful paths (split on / and -)
/// 3. Boost future URLs whose paths share keywords with high-yield patterns
///
/// This is a lightweight version of the CLARS-DQN adaptive reward shaping
/// concept (2026 paper) applied to URL selection.
pub struct AdaptiveUrlScorer {
    /// Path pattern → (total_contacts_found, times_seen).
    pattern_rewards: HashMap<String, (u32, u32)>,
    /// Keyword → total contacts found on pages containing this keyword.
    keyword_rewards: HashMap<String, u32>,
}

impl AdaptiveUrlScorer {
    pub fn new() -> Self {
        Self {
            pattern_rewards: HashMap::new(),
            keyword_rewards: HashMap::new(),
        }
    }

    /// Record extraction outcome for a path.
    ///
    /// Call after LLM extraction: `contacts_found` = number of people extracted.
    pub fn record_extraction(&mut self, path: &str, contacts_found: u32) {
        let normalized = path.to_lowercase();

        // Track exact path pattern
        let entry = self
            .pattern_rewards
            .entry(normalized.clone())
            .or_insert((0, 0));
        entry.0 += contacts_found;
        entry.1 += 1;

        // Extract and track keywords from the path
        for keyword in extract_path_keywords(&normalized) {
            *self.keyword_rewards.entry(keyword).or_insert(0) += contacts_found;
        }
    }

    /// Score a URL path using static heuristic + learned boost.
    ///
    /// Final score = max(static_score, static_score + learned_boost * 0.3)
    /// The 0.3 weight prevents learned patterns from overwhelming the static
    /// heuristic while still influencing frontier ordering.
    pub fn score(&self, path: &str) -> f64 {
        let static_score = score_url(path);
        let learned_boost = self.learned_boost(path);

        // Blend: static score + 30% learned influence, capped at 1.0
        (static_score + learned_boost * 0.3).min(1.0)
    }

    /// Compute learned boost ∈ [0, 1] based on extraction feedback.
    fn learned_boost(&self, path: &str) -> f64 {
        let normalized = path.to_lowercase();

        // Direct pattern match bonus
        if let Some(&(contacts, times)) = self.pattern_rewards.get(&normalized) {
            if times > 0 {
                return (contacts as f64 / times as f64).min(1.0);
            }
        }

        // Keyword similarity bonus
        let keywords = extract_path_keywords(&normalized);
        if keywords.is_empty() {
            return 0.0;
        }

        let mut keyword_score = 0.0;
        let mut matched = 0u32;
        for kw in &keywords {
            if let Some(&contacts) = self.keyword_rewards.get(kw) {
                keyword_score += (contacts as f64).min(10.0) / 10.0; // normalize per-keyword
                matched += 1;
            }
        }

        if matched > 0 {
            (keyword_score / keywords.len() as f64).min(1.0)
        } else {
            0.0
        }
    }

    /// Get the learned reward for a specific path pattern.
    pub fn pattern_stats(&self, path: &str) -> Option<(u32, u32)> {
        self.pattern_rewards.get(&path.to_lowercase()).copied()
    }

    /// Number of unique path patterns learned.
    pub fn patterns_learned(&self) -> usize {
        self.pattern_rewards.len()
    }
}

/// Extract meaningful keywords from a URL path.
///
/// "/about-us/leadership" → ["about", "us", "leadership"]
fn extract_path_keywords(path: &str) -> Vec<String> {
    path.split('/')
        .flat_map(|segment| segment.split('-'))
        .flat_map(|segment| segment.split('_'))
        .filter(|s| s.len() >= 3) // skip short fragments
        .map(|s| s.to_lowercase())
        .collect()
}
