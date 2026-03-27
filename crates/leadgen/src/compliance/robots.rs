//! robots.txt compliance checker for ethical crawling.
//!
//! Parses the `User-agent: *` section of a robots.txt file and caches the
//! result per domain so the crawler can check permissions before fetching any
//! path.  Respects the `Crawl-delay` directive to avoid hammering servers.

use std::collections::HashMap;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/// Result of checking whether a path may be crawled.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CrawlPermission {
    /// The path is explicitly or implicitly allowed.
    Allowed,
    /// The path matches a `Disallow` directive and must not be fetched.
    Disallowed,
    /// Crawling is allowed but the agent must wait this many seconds between
    /// requests.  Carry this out of the permission check so callers can
    /// throttle without a separate lookup.
    CrawlDelay(u64),
}

// ---------------------------------------------------------------------------
// Internal rule set
// ---------------------------------------------------------------------------

/// Parsed rules that apply to our user-agent for a single domain.
#[derive(Debug, Default)]
struct RobotsRules {
    /// Path prefixes / patterns that are disallowed (from `Disallow:`).
    disallowed: Vec<String>,
    /// Optional crawl delay in seconds (from `Crawl-delay:`).
    crawl_delay: Option<u64>,
}

impl RobotsRules {
    /// Return `true` when `path` matches at least one `Disallow` directive.
    ///
    /// Matching rules (based on the robots.txt standard):
    /// - An empty `Disallow:` value means "allow everything" — we never store
    ///   those (filtered during parse).
    /// - `*` at the end of a pattern acts as a wildcard (match any suffix).
    /// - `$` at the end of a pattern anchors to the end of the path.
    /// - All other patterns are prefix-matched.
    fn is_disallowed(&self, path: &str) -> bool {
        for pattern in &self.disallowed {
            if matches_robots_pattern(pattern, path) {
                return true;
            }
        }
        false
    }
}

/// Evaluate a single robots.txt pattern against `path`.
fn matches_robots_pattern(pattern: &str, path: &str) -> bool {
    // Handle end-of-string anchor.
    if let Some(prefix) = pattern.strip_suffix('$') {
        // The path must match the prefix exactly (up to the anchor).
        if prefix.contains('*') {
            return wildcard_match(prefix, path) && path.len() == prefix.len();
        }
        return path == prefix;
    }

    // Handle wildcard patterns.
    if pattern.contains('*') {
        return wildcard_match(pattern, path);
    }

    // Plain prefix match.
    path.starts_with(pattern.as_ref() as &str)
}

/// Recursive wildcard matcher: `*` matches any sequence (including empty).
fn wildcard_match(pattern: &str, text: &str) -> bool {
    let mut pat_iter = pattern.splitn(2, '*');
    let head = pat_iter.next().unwrap_or("");

    if !text.starts_with(head) {
        return false;
    }

    match pat_iter.next() {
        None => text == head,
        Some(tail) => {
            // After consuming `head`, try to match `tail` against every
            // possible suffix of the remaining text.
            let rest = &text[head.len()..];
            if tail.is_empty() {
                return true; // trailing * — matches everything
            }
            for i in 0..=rest.len() {
                if wildcard_match(tail, &rest[i..]) {
                    return true;
                }
            }
            false
        }
    }
}

// ---------------------------------------------------------------------------
// Checker
// ---------------------------------------------------------------------------

/// Simple robots.txt parser and per-domain permission cache.
///
/// Designed for synchronous use inside a crawl loop.  Fetch the robots.txt
/// content over HTTP *before* constructing or populating this checker, then
/// call [`RobotsChecker::parse`] to register the rules for a domain.
pub struct RobotsChecker {
    /// domain (e.g. `"example.com"`) → parsed rules
    cache: HashMap<String, RobotsRules>,
}

impl RobotsChecker {
    /// Create an empty checker with no cached rules.
    pub fn new() -> Self {
        Self {
            cache: HashMap::new(),
        }
    }

    /// Parse `robots_txt` content and cache the resulting rules for `domain`.
    ///
    /// Only the `User-agent: *` section is parsed.  Domain-specific
    /// `User-agent` overrides are not supported (conservative default: if the
    /// wildcard agent is restricted, we honour the restriction).
    ///
    /// Calling this method again for the same `domain` replaces the cached
    /// rules.
    pub fn parse(&mut self, domain: &str, robots_txt: &str) {
        let mut rules = RobotsRules::default();
        let mut in_wildcard_section = false;

        for line in robots_txt.lines() {
            let line = line.trim();

            // Strip inline comments.
            let line = match line.find('#') {
                Some(pos) => line[..pos].trim(),
                None => line,
            };

            if line.is_empty() {
                // A blank line closes the current User-agent block.
                if in_wildcard_section {
                    in_wildcard_section = false;
                }
                continue;
            }

            // Split on the first colon.
            let Some(colon) = line.find(':') else {
                continue;
            };
            let directive = line[..colon].trim().to_ascii_lowercase();
            let value = line[colon + 1..].trim();

            match directive.as_str() {
                "user-agent" => {
                    in_wildcard_section = value == "*";
                }
                "disallow" if in_wildcard_section => {
                    // Empty Disallow means "allow everything" — skip.
                    if !value.is_empty() {
                        rules.disallowed.push(value.to_string());
                    }
                }
                "crawl-delay" if in_wildcard_section => {
                    if let Ok(secs) = value.parse::<u64>() {
                        rules.crawl_delay = Some(secs);
                    }
                }
                _ => {}
            }
        }

        self.cache.insert(domain.to_string(), rules);
    }

    /// Check whether `path` may be fetched from `domain`.
    ///
    /// - If no rules are cached for the domain, returns [`CrawlPermission::Allowed`]
    ///   (open-world assumption: no robots.txt = unrestricted).
    /// - If the path is disallowed, returns [`CrawlPermission::Disallowed`].
    /// - If the path is allowed but a `Crawl-delay` is set, returns
    ///   [`CrawlPermission::CrawlDelay`].
    /// - Otherwise returns [`CrawlPermission::Allowed`].
    pub fn check(&self, domain: &str, path: &str) -> CrawlPermission {
        let Some(rules) = self.cache.get(domain) else {
            return CrawlPermission::Allowed;
        };

        if rules.is_disallowed(path) {
            return CrawlPermission::Disallowed;
        }

        if let Some(delay) = rules.crawl_delay {
            return CrawlPermission::CrawlDelay(delay);
        }

        CrawlPermission::Allowed
    }

    /// Return the crawl delay configured for `domain`, if any.
    pub fn crawl_delay(&self, domain: &str) -> Option<u64> {
        self.cache.get(domain)?.crawl_delay
    }
}

impl Default for RobotsChecker {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    const BASIC_ROBOTS: &str = "\
User-agent: *
Disallow: /private/
Disallow: /admin
Crawl-delay: 2

User-agent: Googlebot
Disallow: /nogoogle/
";

    fn checker_with_basic() -> RobotsChecker {
        let mut c = RobotsChecker::new();
        c.parse("example.com", BASIC_ROBOTS);
        c
    }

    // --- disallowed paths ---

    #[test]
    fn disallows_prefix_match() {
        let c = checker_with_basic();
        assert_eq!(c.check("example.com", "/private/data"), CrawlPermission::Disallowed);
    }

    #[test]
    fn disallows_exact_match() {
        let c = checker_with_basic();
        assert_eq!(c.check("example.com", "/admin"), CrawlPermission::Disallowed);
    }

    #[test]
    fn disallows_path_under_disallowed_prefix() {
        let c = checker_with_basic();
        assert_eq!(c.check("example.com", "/admin/settings"), CrawlPermission::Disallowed);
    }

    // --- allowed paths ---

    #[test]
    fn allows_public_path() {
        let c = checker_with_basic();
        assert_eq!(c.check("example.com", "/public/page"), CrawlPermission::CrawlDelay(2));
    }

    #[test]
    fn allows_root() {
        let c = checker_with_basic();
        assert_eq!(c.check("example.com", "/"), CrawlPermission::CrawlDelay(2));
    }

    // --- crawl delay ---

    #[test]
    fn returns_crawl_delay_for_allowed_path() {
        let c = checker_with_basic();
        match c.check("example.com", "/about") {
            CrawlPermission::CrawlDelay(d) => assert_eq!(d, 2),
            other => panic!("expected CrawlDelay, got {:?}", other),
        }
    }

    #[test]
    fn crawl_delay_accessor() {
        let c = checker_with_basic();
        assert_eq!(c.crawl_delay("example.com"), Some(2));
        assert_eq!(c.crawl_delay("unknown.com"), None);
    }

    // --- wildcard patterns ---

    #[test]
    fn wildcard_disallow_matches_any_suffix() {
        let mut c = RobotsChecker::new();
        c.parse(
            "wc.com",
            "User-agent: *\nDisallow: /search?*\n",
        );
        assert_eq!(c.check("wc.com", "/search?q=test"), CrawlPermission::Disallowed);
        // Plain /search without query string should still be allowed.
        assert_eq!(c.check("wc.com", "/search"), CrawlPermission::Allowed);
    }

    #[test]
    fn wildcard_disallow_star_only() {
        let mut c = RobotsChecker::new();
        c.parse("all.com", "User-agent: *\nDisallow: /*\n");
        assert_eq!(c.check("all.com", "/anything"), CrawlPermission::Disallowed);
    }

    #[test]
    fn dollar_anchor_disallows_exact_path_only() {
        let mut c = RobotsChecker::new();
        c.parse("anchor.com", "User-agent: *\nDisallow: /page$\n");
        assert_eq!(c.check("anchor.com", "/page"), CrawlPermission::Disallowed);
        // Sub-path should NOT be disallowed (anchor prevents prefix match).
        assert_eq!(c.check("anchor.com", "/page/sub"), CrawlPermission::Allowed);
    }

    // --- empty robots.txt ---

    #[test]
    fn empty_robots_allows_all() {
        let mut c = RobotsChecker::new();
        c.parse("empty.com", "");
        assert_eq!(c.check("empty.com", "/anything"), CrawlPermission::Allowed);
    }

    // --- unknown domain ---

    #[test]
    fn unknown_domain_allows_all() {
        let c = RobotsChecker::new();
        assert_eq!(c.check("never-parsed.com", "/path"), CrawlPermission::Allowed);
    }

    // --- googlebot-only rule is ignored for wildcard check ---

    #[test]
    fn googlebot_section_not_applied_to_wildcard() {
        let c = checker_with_basic();
        // /nogoogle/ is only in the Googlebot section — should be allowed for us.
        assert_eq!(c.check("example.com", "/nogoogle/page"), CrawlPermission::CrawlDelay(2));
    }

    // --- inline comments ---

    #[test]
    fn inline_comments_stripped() {
        let mut c = RobotsChecker::new();
        c.parse(
            "comments.com",
            "User-agent: * # all bots\nDisallow: /secret # keep out\n",
        );
        assert_eq!(c.check("comments.com", "/secret/data"), CrawlPermission::Disallowed);
    }

    // --- re-parsing replaces rules ---

    #[test]
    fn reparsing_domain_replaces_rules() {
        let mut c = RobotsChecker::new();
        c.parse("update.com", "User-agent: *\nDisallow: /old\n");
        assert_eq!(c.check("update.com", "/old"), CrawlPermission::Disallowed);

        c.parse("update.com", "User-agent: *\nDisallow: /new\n");
        // Old rule should be gone.
        assert_eq!(c.check("update.com", "/old"), CrawlPermission::Allowed);
        assert_eq!(c.check("update.com", "/new"), CrawlPermission::Disallowed);
    }

    // --- matches_robots_pattern unit tests ---

    #[test]
    fn pattern_plain_prefix() {
        assert!(matches_robots_pattern("/admin", "/admin/panel"));
        assert!(!matches_robots_pattern("/admin", "/other"));
    }

    #[test]
    fn pattern_wildcard_mid() {
        assert!(matches_robots_pattern("/search*", "/search?q=hello"));
        assert!(matches_robots_pattern("/search*", "/search"));
    }

    #[test]
    fn pattern_anchor() {
        assert!(matches_robots_pattern("/exact$", "/exact"));
        assert!(!matches_robots_pattern("/exact$", "/exact/more"));
    }
}
