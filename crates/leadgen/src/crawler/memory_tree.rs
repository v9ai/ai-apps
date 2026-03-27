//! Hierarchical Memory Tree for web-agent task-specific memory separation.
//!
//! Implements the multi-level memory scheme from agent-02-novelty-crawler-2026.
//! The crawler remembers which actions worked on which types of sites, organized
//! in a three-level hierarchy:
//!
//! - **Level 0 — Global:** patterns learned across every domain visited.
//! - **Level 1 — Industry:** patterns specific to a sector (saas, fintech, …).
//! - **Level 2 — Site:** patterns for an individual domain (acme.com).
//!
//! ## Lookup fallback chain
//!
//! When querying best actions for a domain, the tree first checks site-specific
//! memories. If none exist (or fewer than `k` are available), it falls back to
//! industry memories, then to the global pool. This mirrors the "task-specific
//! memory" concept: precise local knowledge beats broad generalizations, but
//! generalizations fill the gap when local data is sparse.
//!
//! ## Incremental average update
//!
//! `avg_yield` is updated online using the recurrence:
//! ```text
//! avg_yield_new = avg_yield_old + (contacts - avg_yield_old) / times_tried
//! ```
//! This avoids storing all historical yields and runs in O(1) per record call.

use std::collections::HashMap;

// ── ActionMemory ──────────────────────────────────────────────────────────────

/// The crawl outcome for a specific URL path pattern.
///
/// `path_pattern` is the normalized URL path (e.g., `/team`, `/about/*/leadership`).
/// `avg_yield` is the mean number of contacts found across all `times_tried` visits.
#[derive(Debug, Clone)]
pub struct ActionMemory {
    /// Normalized URL path pattern, e.g. `/team` or `/about/leadership`.
    pub path_pattern: String,
    /// Total contacts discovered across all visits matching this pattern.
    pub contacts_found: u32,
    /// How many times this path was attempted.
    pub times_tried: u32,
    /// Running mean of contacts found per visit (updated incrementally).
    pub avg_yield: f64,
}

impl ActionMemory {
    fn new(path_pattern: &str) -> Self {
        Self {
            path_pattern: path_pattern.to_string(),
            contacts_found: 0,
            times_tried: 0,
            avg_yield: 0.0,
        }
    }

    /// Update the running average with a new observation using Welford's method.
    fn update(&mut self, contacts: u32) {
        self.contacts_found += contacts;
        self.times_tried += 1;
        // Incremental mean: avg += (x - avg) / n
        self.avg_yield +=
            (contacts as f64 - self.avg_yield) / self.times_tried as f64;
    }
}

// ── MemoryNode ────────────────────────────────────────────────────────────────

/// A named memory node grouping actions for a specific site pattern.
///
/// Used for richer future extensions (e.g., per-company metadata). The core
/// tree operates on `Vec<ActionMemory>` slices directly, but `MemoryNode` is
/// the public-facing type for inspection and serialization.
#[derive(Debug, Clone)]
pub struct MemoryNode {
    /// Label for this pattern, e.g. `"saas-startup"` or `"enterprise-leadership"`.
    pub pattern: String,
    /// Recorded actions for this pattern.
    pub actions: Vec<ActionMemory>,
    /// Number of times any URL under this pattern was visited.
    pub visit_count: u32,
    /// Mean success rate across all actions in this node.
    pub success_rate: f64,
}

// ── MemoryTree ────────────────────────────────────────────────────────────────

/// Hierarchical memory tree for RL-driven crawler learning.
///
/// # Example
/// ```rust
/// use leadgen::crawler::memory_tree::MemoryTree;
///
/// let mut tree = MemoryTree::new();
/// tree.record("acme.com", Some("saas"), "/team", 3);
/// tree.record("acme.com", Some("saas"), "/about", 1);
///
/// let best = tree.best_actions("acme.com", Some("saas"), 2);
/// assert!(!best.is_empty());
/// assert!(best[0].avg_yield >= best.last().unwrap().avg_yield);
/// ```
pub struct MemoryTree {
    /// Level 0: global path patterns across all domains.
    global: Vec<ActionMemory>,
    /// Level 1: industry-specific path patterns.
    industry: HashMap<String, Vec<ActionMemory>>,
    /// Level 2: per-domain path patterns (keyed by domain string).
    site: HashMap<String, Vec<ActionMemory>>,
}

impl MemoryTree {
    /// Create an empty memory tree.
    pub fn new() -> Self {
        Self {
            global: Vec::new(),
            industry: HashMap::new(),
            site: HashMap::new(),
        }
    }

    // ── Core operations ───────────────────────────────────────────────────────

    /// Record a crawl action outcome at every applicable memory level.
    ///
    /// If the path pattern already exists at a level its `avg_yield` is updated
    /// incrementally; otherwise a new `ActionMemory` is inserted.
    ///
    /// # Arguments
    /// * `domain`    — e.g. `"acme.com"`
    /// * `industry`  — optional industry label, e.g. `Some("saas")`
    /// * `path`      — URL path, e.g. `"/team"` (normalized to lowercase)
    /// * `contacts`  — number of contacts found on this visit
    pub fn record(
        &mut self,
        domain: &str,
        industry: Option<&str>,
        path: &str,
        contacts: u32,
    ) {
        let normalized = normalize_path(path);

        upsert_action(&mut self.global, &normalized, contacts);

        if let Some(ind) = industry {
            let bucket =
                self.industry.entry(ind.to_lowercase()).or_default();
            upsert_action(bucket, &normalized, contacts);
        }

        let site_bucket =
            self.site.entry(domain.to_lowercase()).or_default();
        upsert_action(site_bucket, &normalized, contacts);
    }

    /// Return the top `k` best-yielding actions for a domain.
    ///
    /// Lookup order: **site-specific → industry → global**.
    /// If a level provides fewer than `k` results, the remaining slots are
    /// filled from the next level (deduplicating by `path_pattern`).
    pub fn best_actions(
        &self,
        domain: &str,
        industry: Option<&str>,
        k: usize,
    ) -> Vec<&ActionMemory> {
        if k == 0 {
            return Vec::new();
        }

        let mut seen_paths: std::collections::HashSet<String> =
            std::collections::HashSet::new();
        let mut results: Vec<&ActionMemory> = Vec::with_capacity(k);

        // Level 2: site-specific
        if let Some(site_bucket) = self.site.get(&domain.to_lowercase()) {
            drain_sorted_into(site_bucket, &mut seen_paths, &mut results, k);
        }

        // Level 1: industry (fill remaining slots)
        if results.len() < k {
            if let Some(ind) = industry {
                if let Some(ind_bucket) =
                    self.industry.get(&ind.to_lowercase())
                {
                    let remaining = k - results.len();
                    drain_sorted_into(ind_bucket, &mut seen_paths, &mut results, remaining);
                }
            }
        }

        // Level 0: global (fill remaining slots)
        if results.len() < k {
            let remaining = k - results.len();
            drain_sorted_into(&self.global, &mut seen_paths, &mut results, remaining);
        }

        results
    }

    /// Suggest seed URLs for an unknown domain based on industry patterns.
    ///
    /// Returns up to `k` path patterns sorted by `avg_yield`, drawn from the
    /// industry level first (if provided), falling back to global patterns.
    pub fn suggest_seeds(
        &self,
        industry: Option<&str>,
        k: usize,
    ) -> Vec<String> {
        if k == 0 {
            return Vec::new();
        }

        // Collect candidates from industry then global
        let mut candidates: Vec<&ActionMemory> = Vec::new();
        let mut seen: std::collections::HashSet<String> =
            std::collections::HashSet::new();

        if let Some(ind) = industry {
            if let Some(bucket) = self.industry.get(&ind.to_lowercase()) {
                for action in bucket {
                    if seen.insert(action.path_pattern.clone()) {
                        candidates.push(action);
                    }
                }
            }
        }

        for action in &self.global {
            if seen.insert(action.path_pattern.clone()) {
                candidates.push(action);
            }
        }

        candidates.sort_by(|a, b| {
            b.avg_yield
                .partial_cmp(&a.avg_yield)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        candidates
            .into_iter()
            .take(k)
            .map(|a| a.path_pattern.clone())
            .collect()
    }

    /// Remove path patterns that have been tried many times with low yield.
    ///
    /// An `ActionMemory` is pruned if `avg_yield < min_yield` AND
    /// `times_tried >= min_tries`. This prevents stale low-value patterns
    /// from polluting best_actions results.
    pub fn prune(&mut self, min_yield: f64, min_tries: u32) {
        let should_prune =
            |a: &ActionMemory| a.times_tried >= min_tries && a.avg_yield < min_yield;

        self.global.retain(|a| !should_prune(a));

        for bucket in self.industry.values_mut() {
            bucket.retain(|a| !should_prune(a));
        }

        for bucket in self.site.values_mut() {
            bucket.retain(|a| !should_prune(a));
        }
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    /// Number of globally recorded path patterns.
    pub fn global_patterns(&self) -> usize {
        self.global.len()
    }

    /// Number of distinct industry buckets.
    pub fn industry_count(&self) -> usize {
        self.industry.len()
    }

    /// Number of distinct site (domain) buckets.
    pub fn site_count(&self) -> usize {
        self.site.len()
    }
}

impl Default for MemoryTree {
    fn default() -> Self {
        Self::new()
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Normalize a URL path to lowercase with a leading `/`.
fn normalize_path(path: &str) -> String {
    let p = path.trim().to_lowercase();
    if p.starts_with('/') {
        p
    } else {
        format!("/{}", p)
    }
}

/// Drain up to `remaining` entries from `bucket` into `out`, sorted descending
/// by `avg_yield`, skipping paths already present in `seen`.
///
/// Uses owned `String` keys in `seen` to avoid cross-borrow lifetime issues when
/// the caller holds multiple immutable references into `self`.
fn drain_sorted_into<'a>(
    bucket: &'a [ActionMemory],
    seen: &mut std::collections::HashSet<String>,
    out: &mut Vec<&'a ActionMemory>,
    remaining: usize,
) {
    let mut sorted: Vec<&ActionMemory> = bucket
        .iter()
        .filter(|a| !seen.contains(&a.path_pattern))
        .collect();
    sorted.sort_by(|a, b| {
        b.avg_yield
            .partial_cmp(&a.avg_yield)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    for action in sorted.into_iter().take(remaining) {
        seen.insert(action.path_pattern.clone());
        out.push(action);
    }
}

/// Insert or update an `ActionMemory` entry for `path_pattern` in `bucket`.
fn upsert_action(bucket: &mut Vec<ActionMemory>, path_pattern: &str, contacts: u32) {
    if let Some(existing) = bucket
        .iter_mut()
        .find(|a| a.path_pattern == path_pattern)
    {
        existing.update(contacts);
    } else {
        let mut mem = ActionMemory::new(path_pattern);
        mem.update(contacts);
        bucket.push(mem);
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── record and retrieve ───────────────────────────────────────────────────

    #[test]
    fn record_creates_entries_at_all_levels() {
        let mut tree = MemoryTree::new();
        tree.record("acme.com", Some("saas"), "/team", 3);

        assert_eq!(tree.global_patterns(), 1);
        assert_eq!(tree.industry_count(), 1);
        assert_eq!(tree.site_count(), 1);
    }

    #[test]
    fn record_updates_avg_yield_incrementally() {
        let mut tree = MemoryTree::new();
        tree.record("acme.com", None, "/team", 2);
        tree.record("acme.com", None, "/team", 4);

        // avg_yield should be (2 + 4) / 2 = 3.0
        let best = tree.best_actions("acme.com", None, 1);
        assert_eq!(best.len(), 1);
        assert!((best[0].avg_yield - 3.0).abs() < 1e-9, "avg_yield should be 3.0, got {}", best[0].avg_yield);
    }

    #[test]
    fn best_actions_sorted_descending_by_avg_yield() {
        let mut tree = MemoryTree::new();
        tree.record("acme.com", None, "/blog", 0);
        tree.record("acme.com", None, "/team", 5);
        tree.record("acme.com", None, "/about", 2);

        let best = tree.best_actions("acme.com", None, 3);
        assert_eq!(best.len(), 3);
        assert_eq!(best[0].path_pattern, "/team");
        assert!(best[0].avg_yield >= best[1].avg_yield);
        assert!(best[1].avg_yield >= best[2].avg_yield);
    }

    #[test]
    fn best_actions_k_zero_returns_empty() {
        let mut tree = MemoryTree::new();
        tree.record("acme.com", None, "/team", 3);
        assert!(tree.best_actions("acme.com", None, 0).is_empty());
    }

    // ── hierarchical fallback ─────────────────────────────────────────────────

    #[test]
    fn hierarchical_fallback_site_then_industry_then_global() {
        let mut tree = MemoryTree::new();
        // Only global memory for /leadership
        tree.record("other.com", None, "/leadership", 4);
        // Industry memory for /people
        tree.record("other.com", Some("fintech"), "/people", 3);

        // Query a brand-new domain that has no site-level memory
        let best = tree.best_actions("brand-new.com", Some("fintech"), 5);

        // Should fall back to industry (/people) then global (/leadership)
        let paths: Vec<&str> =
            best.iter().map(|a| a.path_pattern.as_str()).collect();
        assert!(
            paths.contains(&"/people") || paths.contains(&"/leadership"),
            "fallback should include industry/global patterns: {:?}",
            paths
        );
    }

    #[test]
    fn site_specific_takes_precedence_over_global() {
        let mut tree = MemoryTree::new();
        // Global has /team with yield 1
        tree.record("other.com", None, "/team", 1);
        // Site-specific has /founders with yield 10
        tree.record("acme.com", None, "/founders", 10);

        let best = tree.best_actions("acme.com", None, 1);
        assert_eq!(best[0].path_pattern, "/founders");
    }

    #[test]
    fn fallback_deduplicates_across_levels() {
        let mut tree = MemoryTree::new();
        // Same path recorded at both industry and global levels via different domains
        tree.record("a.com", Some("saas"), "/team", 5);
        tree.record("b.com", None, "/team", 2);

        // For a new domain in "saas", /team should appear only once
        let best = tree.best_actions("new.com", Some("saas"), 10);
        let team_count = best
            .iter()
            .filter(|a| a.path_pattern == "/team")
            .count();
        assert_eq!(team_count, 1, "/team should not be duplicated across levels");
    }

    // ── industry-specific patterns ────────────────────────────────────────────

    #[test]
    fn industry_patterns_isolated_per_sector() {
        let mut tree = MemoryTree::new();
        tree.record("a.com", Some("saas"), "/pricing-team", 4);
        tree.record("b.com", Some("fintech"), "/compliance", 3);

        // SaaS query should not see fintech patterns in top results before global
        let saas_paths: Vec<String> = tree
            .best_actions("new.com", Some("saas"), 5)
            .iter()
            .map(|a| a.path_pattern.clone())
            .collect();

        // /pricing-team is in saas industry, /compliance is in fintech
        assert!(saas_paths.contains(&"/pricing-team".to_string()));
    }

    // ── pruning ───────────────────────────────────────────────────────────────

    #[test]
    fn prune_removes_low_yield_well_tried_patterns() {
        let mut tree = MemoryTree::new();
        // Low yield, many tries — should be pruned
        for _ in 0..5 {
            tree.record("acme.com", Some("saas"), "/blog", 0);
        }
        // High yield — should survive
        tree.record("acme.com", Some("saas"), "/team", 4);

        tree.prune(1.0, 3);

        assert_eq!(tree.global_patterns(), 1, "/blog should be pruned from global");
        let best = tree.best_actions("acme.com", Some("saas"), 10);
        assert!(
            best.iter().all(|a| a.path_pattern != "/blog"),
            "/blog should not appear after pruning"
        );
    }

    #[test]
    fn prune_keeps_patterns_below_min_tries() {
        let mut tree = MemoryTree::new();
        // Low yield but tried only once — not enough data to prune
        tree.record("acme.com", None, "/blog", 0);

        tree.prune(1.0, 3); // requires >= 3 tries before pruning
        assert_eq!(tree.global_patterns(), 1, "should keep pattern with too few tries");
    }

    #[test]
    fn prune_empty_tree_is_noop() {
        let mut tree = MemoryTree::new();
        tree.prune(1.0, 1); // should not panic
        assert_eq!(tree.global_patterns(), 0);
    }

    // ── suggest_seeds ─────────────────────────────────────────────────────────

    #[test]
    fn suggest_seeds_returns_top_k_sorted_by_yield() {
        let mut tree = MemoryTree::new();
        tree.record("a.com", Some("saas"), "/team", 5);
        tree.record("b.com", Some("saas"), "/about", 2);
        tree.record("c.com", Some("saas"), "/blog", 0);

        let seeds = tree.suggest_seeds(Some("saas"), 2);
        assert_eq!(seeds.len(), 2);
        assert_eq!(seeds[0], "/team", "highest-yield seed should come first");
    }

    #[test]
    fn suggest_seeds_falls_back_to_global_when_industry_sparse() {
        let mut tree = MemoryTree::new();
        tree.record("a.com", None, "/leadership", 6);

        // No industry-specific data; should fall back to global
        let seeds = tree.suggest_seeds(Some("biotech"), 3);
        assert!(seeds.contains(&"/leadership".to_string()));
    }

    #[test]
    fn suggest_seeds_k_zero_returns_empty() {
        let mut tree = MemoryTree::new();
        tree.record("a.com", None, "/team", 3);
        assert!(tree.suggest_seeds(None, 0).is_empty());
    }

    #[test]
    fn suggest_seeds_deduplicates_industry_and_global() {
        let mut tree = MemoryTree::new();
        // /team is in both industry (via industry domain) and global (via another domain)
        tree.record("a.com", Some("saas"), "/team", 4);
        tree.record("b.com", None, "/team", 2);

        let seeds = tree.suggest_seeds(Some("saas"), 10);
        let team_count = seeds.iter().filter(|s| *s == "/team").count();
        assert_eq!(team_count, 1, "/team must not appear twice in seeds");
    }

    // ── avg_yield correctness ─────────────────────────────────────────────────

    #[test]
    fn avg_yield_converges_correctly_over_many_updates() {
        let mut tree = MemoryTree::new();
        // Record 10 observations: 0, 1, 2, …, 9 → mean = 4.5
        for i in 0..10u32 {
            tree.record("acme.com", None, "/team", i);
        }

        let best = tree.best_actions("acme.com", None, 1);
        assert_eq!(best.len(), 1);
        assert!(
            (best[0].avg_yield - 4.5).abs() < 1e-6,
            "expected avg_yield 4.5, got {}",
            best[0].avg_yield
        );
    }
}
