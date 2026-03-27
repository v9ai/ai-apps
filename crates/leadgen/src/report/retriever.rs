use anyhow::Result;
use std::collections::HashMap;

use crate::search;

/// A single retrieved context fragment, annotated with its origin and retrieval method.
#[derive(Debug, Clone)]
pub struct RetrievalResult {
    /// The retrieved text fragment.
    pub text: String,
    /// Document / company identifier from which this result came.
    pub source: String,
    /// Relevance score (higher is better, scale depends on `method`).
    pub score: f64,
    /// How this result was retrieved: `"keyword"`, `"semantic"`, or `"hybrid"`.
    pub method: String,
}

/// Combines Tantivy keyword search with an optional semantic result set using
/// Reciprocal Rank Fusion (RRF), following the formula:
///
/// ```text
/// RRF(d) = Σ  1 / (k + rank_i(d))
/// ```
///
/// where `k = 60` (standard constant) and `rank_i` is the 1-based position of
/// document `d` in result list `i`.
pub struct HybridRetriever {
    search_index: tantivy::Index,
}

impl HybridRetriever {
    pub fn new(index: tantivy::Index) -> Self {
        Self { search_index: index }
    }

    /// Pure keyword search via Tantivy. Returns up to `limit` results ordered
    /// by BM25 score, each tagged with `method = "keyword"`.
    pub fn keyword_search(&self, query: &str, limit: usize) -> Result<Vec<RetrievalResult>> {
        let raw = search::search(&self.search_index, query, limit)?;
        Ok(raw
            .into_iter()
            .map(|r| RetrievalResult {
                text: build_snippet(&r),
                source: r.domain.clone(),
                score: r.score as f64,
                method: "keyword".to_string(),
            })
            .collect())
    }

    /// Hybrid search: merges `semantic_results` (pre-computed by the caller)
    /// with keyword results using Reciprocal Rank Fusion.
    ///
    /// # Arguments
    /// * `query`            - The natural-language query string.
    /// * `semantic_results` - Results from a vector/embedding index (caller-supplied).
    /// * `limit`            - Maximum number of results to return.
    ///
    /// Documents are identified by their `source` field; ties in the merged
    /// ranking are broken by combined RRF score (descending).
    pub fn hybrid_search(
        &self,
        query: &str,
        semantic_results: &[RetrievalResult],
        limit: usize,
    ) -> Result<Vec<RetrievalResult>> {
        // Fetch more keyword results than needed to give RRF enough material.
        let keyword_results = self.keyword_search(query, limit * 2)?;

        // RRF constant (60 is the value from the original Cormack et al. paper).
        const K: f64 = 60.0;

        // Accumulate RRF scores by source identifier.
        // We keep the highest-scoring text snippet per source.
        let mut rrf_scores: HashMap<String, f64> = HashMap::new();
        let mut best_text: HashMap<String, String> = HashMap::new();

        let accumulate = |results: &[RetrievalResult],
                          rrf_scores: &mut HashMap<String, f64>,
                          best_text: &mut HashMap<String, String>| {
            for (rank, result) in results.iter().enumerate() {
                let rrf_contribution = 1.0 / (K + (rank + 1) as f64);
                *rrf_scores.entry(result.source.clone()).or_insert(0.0) += rrf_contribution;
                best_text
                    .entry(result.source.clone())
                    .or_insert_with(|| result.text.clone());
            }
        };

        accumulate(&keyword_results, &mut rrf_scores, &mut best_text);
        accumulate(semantic_results, &mut rrf_scores, &mut best_text);

        // Build merged results, sorted by descending RRF score.
        let mut merged: Vec<RetrievalResult> = rrf_scores
            .into_iter()
            .filter_map(|(source, score)| {
                best_text.remove(&source).map(|text| RetrievalResult {
                    text,
                    source,
                    score,
                    method: "hybrid".to_string(),
                })
            })
            .collect();

        merged.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        merged.truncate(limit);
        Ok(merged)
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Build a text snippet from a raw Tantivy [`search::SearchResult`] so the
/// retrieval result carries human-readable content rather than just metadata.
fn build_snippet(r: &search::SearchResult) -> String {
    let mut parts = Vec::new();
    if !r.company_name.is_empty() {
        parts.push(format!("Company: {}", r.company_name));
    }
    if !r.industry.is_empty() {
        parts.push(format!("Industry: {}", r.industry));
    }
    if !r.location.is_empty() {
        parts.push(format!("Location: {}", r.location));
    }
    if parts.is_empty() {
        r.domain.clone()
    } else {
        parts.join(" | ")
    }
}
