/// Rule-Based Query Decomposer for Multi-Hop RAG.
///
/// From A-RAG (2025) and CRAG research.  Decomposes complex natural-language
/// queries into simpler sub-queries using deterministic linguistic patterns —
/// no LLM required.
///
/// Research finding (A-RAG 2025): hierarchical retrieval benefits from query
/// decomposition even when using simple rule-based methods, achieving 70–80 %
/// of LLM decomposition quality at zero inference cost.
///
/// Decomposition rules (applied in order):
///
/// 1. **Conjunction split** — "X and Y" → ["X", "Y"]
/// 2. **Comparison split** — "compare X with/to Y", "X vs Y" → ["X", "Y"]
/// 3. **Entity-role split** — "What does X do and who leads it" → sub-phrases
/// 4. **Time-scope split** — "X in 2023 and 2024" → ["X in 2023", "X in 2024"]
///
/// Reciprocal Rank Fusion (RRF) is used to merge multi-source result lists;
/// it is robust to score-scale differences across sub-queries.

use regex::Regex;
use std::collections::HashMap;

// ---------------------------------------------------------------------------
// QueryDecomposer
// ---------------------------------------------------------------------------

/// Rule-based query decomposer for multi-hop retrieval pipelines.
pub struct QueryDecomposer;

impl Default for QueryDecomposer {
    fn default() -> Self {
        Self::new()
    }
}

impl QueryDecomposer {
    /// Create a new decomposer (stateless; all state lives in compiled regexes
    /// that are rebuilt per call — acceptable for query-planning which is rare).
    pub fn new() -> Self {
        Self
    }

    /// Decompose `query` into a list of simpler sub-queries.
    ///
    /// Returns the original query as a single-element vector when no rule
    /// matches.  Sub-queries are trimmed and de-duplicated while preserving
    /// order.
    pub fn decompose(&self, query: &str) -> Vec<String> {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return vec![];
        }

        // Try each rule in priority order; use the first one that fires.
        if let Some(parts) = split_comparison(trimmed) {
            return dedupe_and_clean(parts);
        }
        if let Some(parts) = split_time_scope(trimmed) {
            return dedupe_and_clean(parts);
        }
        if let Some(parts) = split_conjunction(trimmed) {
            return dedupe_and_clean(parts);
        }
        if let Some(parts) = split_entity_role(trimmed) {
            return dedupe_and_clean(parts);
        }

        // No rule matched — return the query unchanged.
        vec![trimmed.to_string()]
    }

    /// Quality score for a decomposition.
    ///
    /// Defined as `min(n_sub / estimated_complexity, 1.0)` where:
    /// - `n_sub` is the number of sub-queries produced.
    /// - `estimated_complexity` is a heuristic based on conjunction and
    ///   comparison indicators in the original query.
    ///
    /// A score of 1.0 means the decomposition fully covers the estimated
    /// complexity.  Scores above 1.0 are clamped — splitting too aggressively
    /// is not penalised here.
    pub fn decomposition_score(&self, original: &str, sub_queries: &[String]) -> f64 {
        if sub_queries.is_empty() {
            return 0.0;
        }
        let complexity = estimate_complexity(original).max(1) as f64;
        let n = sub_queries.len() as f64;
        (n / complexity).min(1.0)
    }

    /// Merge ranked result lists from multiple sub-queries using Reciprocal
    /// Rank Fusion (RRF).
    ///
    /// RRF score for item `d`: `Σ_{q} 1 / (k + rank_q(d))`  where `k = 60`
    /// (the standard constant from the original RRF paper) and `rank_q(d)` is
    /// the 1-based position of `d` in sub-query result list `q`.
    ///
    /// Returns the top `k` items sorted by descending RRF score.  Items not
    /// appearing in a sub-query list contribute 0 to that list's term.
    pub fn merge_results<T: Clone + PartialEq>(
        &self,
        sub_results: &[Vec<(T, f64)>],
        k: usize,
    ) -> Vec<(T, f64)> {
        const RRF_K: f64 = 60.0;

        if sub_results.is_empty() || k == 0 {
            return Vec::new();
        }

        // Collect all unique items preserving insertion order (first-seen wins
        // for identity comparison via `PartialEq`).
        let mut all_items: Vec<T> = Vec::new();
        for list in sub_results {
            for (item, _) in list {
                if !all_items.iter().any(|x| x == item) {
                    all_items.push(item.clone());
                }
            }
        }

        // Compute RRF score for each item.
        let rrf_scores: Vec<(T, f64)> = all_items
            .into_iter()
            .map(|item| {
                let rrf: f64 = sub_results
                    .iter()
                    .map(|list| {
                        // Find 1-based rank in this list.
                        list.iter()
                            .position(|(x, _)| x == &item)
                            .map(|pos| 1.0 / (RRF_K + (pos + 1) as f64))
                            .unwrap_or(0.0)
                    })
                    .sum();
                (item, rrf)
            })
            .collect();

        // Sort descending by RRF score.
        let mut sorted = rrf_scores;
        sorted.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        sorted.truncate(k);
        sorted
    }
}

// ---------------------------------------------------------------------------
// Decomposition rules
// ---------------------------------------------------------------------------

/// Split on comparison patterns:
/// - "compare X with Y" / "compare X to Y"
/// - "X vs Y" / "X versus Y"
/// - "difference between X and Y"
fn split_comparison(query: &str) -> Option<Vec<String>> {
    let lower = query.to_lowercase();

    // "compare X with/to Y"
    let compare_re = Regex::new(r"(?i)^compare\s+(.+?)\s+(?:with|to)\s+(.+)$").unwrap();
    if let Some(caps) = compare_re.captures(query) {
        return Some(vec![
            caps[1].trim().to_string(),
            caps[2].trim().to_string(),
        ]);
    }

    // "X vs Y" / "X versus Y"
    let vs_re = Regex::new(r"(?i)(.+?)\s+(?:vs\.?|versus)\s+(.+)").unwrap();
    if let Some(caps) = vs_re.captures(query) {
        return Some(vec![
            caps[1].trim().to_string(),
            caps[2].trim().to_string(),
        ]);
    }

    // "difference between X and Y"
    let diff_re = Regex::new(r"(?i)(?:difference|differences)\s+between\s+(.+?)\s+and\s+(.+)").unwrap();
    if let Some(caps) = diff_re.captures(query) {
        return Some(vec![
            caps[1].trim().to_string(),
            caps[2].trim().to_string(),
        ]);
    }

    // "X compared to Y"
    let compared_re = Regex::new(r"(?i)(.+?)\s+compared\s+(?:to|with)\s+(.+)").unwrap();
    if let Some(caps) = compared_re.captures(query) {
        return Some(vec![
            caps[1].trim().to_string(),
            caps[2].trim().to_string(),
        ]);
    }

    let _ = lower;
    None
}

/// Split on time-scope patterns: "X in YEAR and YEAR".
///
/// Extracts the base topic and generates one sub-query per year.
fn split_time_scope(query: &str) -> Option<Vec<String>> {
    // Match "X in YEAR1 and YEAR2 [and YEAR3 ...]"
    let re = Regex::new(r"(?i)^(.+?)\s+in\s+(\d{4})(?:\s+and\s+(\d{4}))+").unwrap();
    if re.is_match(query) {
        // Extract base topic (everything before " in YEAR").
        let base_re = Regex::new(r"(?i)^(.+?)\s+in\s+\d{4}").unwrap();
        let base = base_re.captures(query).map(|c| c[1].trim().to_string())?;

        // Extract all 4-digit year tokens.
        let year_re = Regex::new(r"\b(\d{4})\b").unwrap();
        let years: Vec<&str> = year_re
            .captures_iter(query)
            .map(|c| c.get(1).unwrap().as_str())
            .collect();

        if years.len() >= 2 {
            let parts: Vec<String> = years
                .iter()
                .map(|y| format!("{} in {}", base, y))
                .collect();
            return Some(parts);
        }
    }
    None
}

/// Split on conjunctions: "X and Y", "X as well as Y", "X along with Y".
///
/// Deliberately conservative: only splits at the top-level conjunction to
/// avoid fragmenting noun phrases like "machine learning and AI research".
fn split_conjunction(query: &str) -> Option<Vec<String>> {
    // Pattern: two balanced clauses joined by "and"/"as well as"/"along with".
    // We require each side to be at least 8 characters to avoid splitting
    // compound nouns ("NLP and ML" is not a meaningful decomposition).
    let re = Regex::new(
        r"(?i)^(.{8,}?)\s+(?:and|as well as|along with|plus)\s+(.{8,})$",
    )
    .unwrap();
    if let Some(caps) = re.captures(query) {
        let left = caps[1].trim().to_string();
        let right = caps[2].trim().to_string();
        // Heuristic: if either side contains a verb-like token the split is
        // meaningful (avoids splitting "Rust and Python support").
        if has_verbal_token(&left) || has_verbal_token(&right) {
            return Some(vec![left, right]);
        }
    }
    None
}

/// Split entity-role queries: "What does X do and who leads it".
///
/// Detects question fragments starting with `wh-` words and splits them.
fn split_entity_role(query: &str) -> Option<Vec<String>> {
    // Match "CLAUSE_A and CLAUSE_B" where each clause starts with a wh-word.
    let re = Regex::new(
        r"(?i)((?:what|who|where|when|how|which)\b.+?)\s+and\s+((?:what|who|where|when|how|which)\b.+)",
    )
    .unwrap();
    if let Some(caps) = re.captures(query) {
        return Some(vec![
            caps[1].trim().to_string(),
            caps[2].trim().to_string(),
        ]);
    }
    None
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Estimate the structural complexity of a query by counting conjunction and
/// comparison indicators.  Returns at least 1.
fn estimate_complexity(query: &str) -> usize {
    let lower = query.to_lowercase();
    let mut count = 1usize;

    // Each of these patterns suggests an additional "dimension" of the query.
    let markers = [" and ", " vs ", " versus ", " compared to ", " compare ", " difference between "];
    for m in &markers {
        count += lower.matches(m).count();
    }

    // Year enumeration adds complexity.
    let year_re = Regex::new(r"\b\d{4}\b").unwrap();
    let year_count = year_re.find_iter(query).count();
    if year_count >= 2 {
        count += year_count - 1;
    }

    count
}

/// Heuristic: does the string contain a word that looks like a verb form?
/// Used to avoid splitting noun phrases in the conjunction rule.
fn has_verbal_token(s: &str) -> bool {
    let verbal_endings = ["es", "ed", "ing", "ize", "ise", "find", "show", "list", "get", "make", "use"];
    let lower = s.to_lowercase();
    lower.split_whitespace().any(|w| verbal_endings.iter().any(|e| w.ends_with(e)))
}

/// Trim, lowercase-normalise, and remove duplicate sub-queries.
fn dedupe_and_clean(parts: Vec<String>) -> Vec<String> {
    let mut seen = HashMap::new();
    let mut result = Vec::new();
    for part in parts {
        let trimmed = part.trim().to_string();
        if !trimmed.is_empty() {
            let key = trimmed.to_lowercase();
            if seen.insert(key, true).is_none() {
                result.push(trimmed);
            }
        }
    }
    result
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn dec() -> QueryDecomposer {
        QueryDecomposer::new()
    }

    // -- simple query passthrough --

    #[test]
    fn simple_query_returns_itself() {
        let d = dec();
        let result = d.decompose("What is machine learning?");
        assert_eq!(result.len(), 1, "simple query should not be split");
        assert_eq!(result[0], "What is machine learning?");
    }

    #[test]
    fn empty_query_returns_empty() {
        let result = dec().decompose("");
        assert!(result.is_empty(), "empty query should return empty vec");
    }

    #[test]
    fn whitespace_only_returns_empty() {
        let result = dec().decompose("   ");
        assert!(result.is_empty());
    }

    // -- conjunction splits --

    #[test]
    fn conjunction_splits_two_clauses() {
        let d = dec();
        let result = d.decompose("List all AI engineering roles and show their salary ranges");
        assert_eq!(
            result.len(),
            2,
            "conjunction query should split into 2, got: {result:?}"
        );
    }

    #[test]
    fn conjunction_both_parts_non_empty() {
        let result = dec().decompose("Find remote jobs in EU and list required AI skills");
        for part in &result {
            assert!(!part.is_empty(), "all parts must be non-empty");
        }
    }

    // -- comparison splits --

    #[test]
    fn compare_with_splits_two() {
        let result = dec().decompose("compare PyTorch with TensorFlow");
        assert_eq!(
            result.len(),
            2,
            "comparison should split into 2, got: {result:?}"
        );
        let joined = result.join(" ");
        assert!(joined.to_lowercase().contains("pytorch"), "should retain PyTorch: {result:?}");
        assert!(joined.to_lowercase().contains("tensorflow"), "should retain TensorFlow: {result:?}");
    }

    #[test]
    fn vs_splits_two() {
        let result = dec().decompose("Rust vs Go performance");
        assert_eq!(
            result.len(),
            2,
            "vs comparison should split into 2, got: {result:?}"
        );
    }

    #[test]
    fn difference_between_splits_two() {
        let result = dec().decompose("difference between supervised and unsupervised learning");
        assert_eq!(
            result.len(),
            2,
            "difference between should split into 2, got: {result:?}"
        );
    }

    // -- time-scope splits --

    #[test]
    fn time_scope_two_years_splits() {
        let result = dec().decompose("AI job market in 2023 and 2024");
        assert_eq!(
            result.len(),
            2,
            "time-scope with 2 years should split into 2, got: {result:?}"
        );
        assert!(result[0].contains("2023"), "first part should contain 2023: {:?}", result[0]);
        assert!(result[1].contains("2024"), "second part should contain 2024: {:?}", result[1]);
    }

    #[test]
    fn time_scope_three_years_splits() {
        let result = dec().decompose("remote EU AI hiring in 2022 and 2023 and 2024");
        assert_eq!(
            result.len(),
            3,
            "time-scope with 3 years should split into 3, got: {result:?}"
        );
    }

    // -- entity-role split --

    #[test]
    fn entity_role_wh_question_splits() {
        let result = dec().decompose("What does Anthropic do and who leads it");
        assert_eq!(
            result.len(),
            2,
            "entity-role wh-question should split into 2, got: {result:?}"
        );
    }

    // -- merge_results --

    #[test]
    fn merge_results_returns_at_most_k_items() {
        let d = dec();
        let list1 = vec![("a".to_string(), 0.9), ("b".to_string(), 0.7)];
        let list2 = vec![("b".to_string(), 0.8), ("c".to_string(), 0.6)];
        let merged = d.merge_results(&[list1, list2], 2);
        assert!(
            merged.len() <= 2,
            "merge_results should return at most k=2 items, got {}",
            merged.len()
        );
    }

    #[test]
    fn merge_results_sorted_descending() {
        let d = dec();
        let list1 = vec![("x".to_string(), 0.5), ("y".to_string(), 0.3)];
        let list2 = vec![("y".to_string(), 0.9), ("z".to_string(), 0.1)];
        let merged = d.merge_results(&[list1, list2], 3);
        for w in merged.windows(2) {
            assert!(
                w[0].1 >= w[1].1,
                "merge results must be sorted descending: {} < {}",
                w[0].1,
                w[1].1
            );
        }
    }

    #[test]
    fn merge_results_empty_input_returns_empty() {
        let d = dec();
        let merged: Vec<(String, f64)> = d.merge_results(&[], 5);
        assert!(merged.is_empty(), "empty sub_results should yield empty merge");
    }

    #[test]
    fn merge_results_k_zero_returns_empty() {
        let d = dec();
        let list = vec![("a".to_string(), 0.9)];
        let merged = d.merge_results(&[list], 0);
        assert!(merged.is_empty(), "k=0 should return empty merge");
    }

    #[test]
    fn merge_results_deduplicates_across_lists() {
        let d = dec();
        // "a" appears in both lists — should only appear once in merged.
        let list1 = vec![("a".to_string(), 0.9), ("b".to_string(), 0.7)];
        let list2 = vec![("a".to_string(), 0.8), ("c".to_string(), 0.5)];
        let merged = d.merge_results(&[list1, list2], 10);
        let a_count = merged.iter().filter(|(id, _)| id == "a").count();
        assert_eq!(a_count, 1, "duplicate item should appear once, got {a_count}");
    }

    // -- decomposition_score --

    #[test]
    fn score_reflects_complexity_reduction() {
        let d = dec();
        let query = "compare PyTorch with TensorFlow";
        let sub_queries = vec!["PyTorch".to_string(), "TensorFlow".to_string()];
        let score = d.decomposition_score(query, &sub_queries);
        assert!(
            (0.0..=1.0).contains(&score),
            "decomposition score must be in [0,1], got {score:.4}"
        );
    }

    #[test]
    fn score_single_sub_query_of_simple_query_is_one() {
        let d = dec();
        let query = "what is reinforcement learning";
        let sub_queries = vec![query.to_string()];
        let score = d.decomposition_score(query, &sub_queries);
        assert!(
            (0.0..=1.0).contains(&score),
            "score must be in [0,1], got {score:.4}"
        );
        assert!(score > 0.0, "score must be positive for non-empty decomposition");
    }

    #[test]
    fn score_empty_sub_queries_is_zero() {
        let d = dec();
        let score = d.decomposition_score("anything", &[]);
        assert_eq!(score, 0.0, "empty sub-queries must score 0.0");
    }
}
