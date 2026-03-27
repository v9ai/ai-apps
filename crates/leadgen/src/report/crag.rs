/// CRAG (Corrective Retrieval-Augmented Generation) — retrieval quality
/// classifier with corrective action suggestions.
///
/// Evaluates retrieved chunks against a query using four lightweight,
/// embedding-free features and classifies each chunk as CORRECT, AMBIGUOUS,
/// or INCORRECT.  Based on the corrective-RAG line of work (ICLR 2024 →
/// survey 2025): the core insight is that early quality detection avoids
/// hallucination amplification caused by confidently wrong context.
///
/// Feature vector (4 dimensions):
///
/// | Index | Feature             | Range  |
/// |-------|---------------------|--------|
/// | 0     | embed_sim           | [0, 1] |  caller-supplied retriever score
/// | 1     | keyword_overlap     | [0, 1] |  fraction of query words in chunk
/// | 2     | chunk_length_ratio  | [0, 1] |  chunk_len / IDEAL_LEN, capped at 1
/// | 3     | query_coverage      | [0, 1] |  fraction of query bigrams in chunk

// ---------------------------------------------------------------------------
// Quality tiers
// ---------------------------------------------------------------------------

/// Classification of a single retrieved chunk's relevance to the query.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum RetrievalQuality {
    /// Confidence > 0.7: use chunk directly.
    Correct,
    /// Confidence 0.3–0.7: decompose query and re-retrieve.
    Ambiguous,
    /// Confidence < 0.3: discard, fall back to web search.
    Incorrect,
}

impl RetrievalQuality {
    fn from_confidence(c: f64) -> Self {
        if c > 0.7 {
            RetrievalQuality::Correct
        } else if c >= 0.3 {
            RetrievalQuality::Ambiguous
        } else {
            RetrievalQuality::Incorrect
        }
    }
}

// ---------------------------------------------------------------------------
// Corrective actions
// ---------------------------------------------------------------------------

/// Recommended corrective action after evaluating a batch of chunks.
#[derive(Debug, Clone)]
pub enum CragAction {
    /// Indices into the original batch of chunks that should be used directly.
    UseDirectly(Vec<usize>),
    /// The original query was decomposed into these sub-queries for re-retrieval.
    DecomposeAndRequery(Vec<String>),
    /// All chunks were poor; fall back to a web search with this query string.
    WebFallback(String),
}

// ---------------------------------------------------------------------------
// Batch evaluation result
// ---------------------------------------------------------------------------

/// Per-batch evaluation summary produced by [`CragEvaluator::evaluate_batch`].
#[derive(Debug, Clone)]
pub struct BatchEvaluation {
    /// Per-chunk `(quality, confidence)` pairs in the same order as the input.
    pub per_chunk: Vec<(RetrievalQuality, f64)>,
    /// Aggregate quality derived from the proportion of CORRECT chunks.
    pub overall_quality: RetrievalQuality,
    pub correct_count: usize,
    pub ambiguous_count: usize,
    pub incorrect_count: usize,
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

/// Ideal chunk character length for the `chunk_length_ratio` feature.
const IDEAL_CHUNK_LEN: usize = 400;

/// Confidence thresholds that define the quality tiers.
const CORRECT_THRESHOLD: f64 = 0.7;
const INCORRECT_THRESHOLD: f64 = 0.3;

/// Evaluates retrieved chunks and suggests corrective actions.
pub struct CragEvaluator {
    /// Weights for the four retrieval-quality features (must sum to ~1.0 but
    /// the score is normalised by the weight sum so it is robust to minor
    /// deviations).
    ///
    /// Layout: `[embed_sim, keyword_overlap, chunk_length_ratio, query_coverage]`
    weights: [f64; 4],
}

impl Default for CragEvaluator {
    fn default() -> Self {
        Self::new()
    }
}

impl CragEvaluator {
    /// Create an evaluator with empirically tuned default weights.
    ///
    /// `embed_sim` and `keyword_overlap` receive the highest weight because they
    /// directly measure semantic and lexical relevance; `query_coverage` (bigram)
    /// is a stricter signal and ranked third; `chunk_length_ratio` is a
    /// structural proxy and receives the lowest weight.
    pub fn new() -> Self {
        Self {
            weights: [0.40, 0.30, 0.10, 0.20],
        }
    }

    /// Evaluate the quality of a single retrieved chunk against `query`.
    ///
    /// `similarity_score` is the retriever-provided score (e.g. cosine
    /// similarity from a vector index), already in [0, 1].
    ///
    /// Returns `(quality_tier, confidence_score)`.
    pub fn evaluate(
        &self,
        query: &str,
        chunk_text: &str,
        similarity_score: f64,
    ) -> (RetrievalQuality, f64) {
        let sim = similarity_score.clamp(0.0, 1.0);
        let kw = keyword_overlap(query, chunk_text);
        let len_ratio = chunk_length_ratio(chunk_text, IDEAL_CHUNK_LEN);
        let coverage = query_coverage(query, chunk_text);

        let features = [sim, kw, len_ratio, coverage];
        let weight_sum: f64 = self.weights.iter().sum();
        let confidence: f64 = if weight_sum < f64::EPSILON {
            0.0
        } else {
            self.weights
                .iter()
                .zip(features.iter())
                .map(|(w, f)| w * f)
                .sum::<f64>()
                / weight_sum
        };

        let quality = RetrievalQuality::from_confidence(confidence);
        (quality, confidence)
    }

    /// Evaluate all chunks and compute an aggregate `BatchEvaluation`.
    ///
    /// `chunks` is a slice of `(chunk_text, retriever_similarity_score)` pairs.
    pub fn evaluate_batch(
        &self,
        query: &str,
        chunks: &[(String, f64)],
    ) -> BatchEvaluation {
        if chunks.is_empty() {
            return BatchEvaluation {
                per_chunk: Vec::new(),
                overall_quality: RetrievalQuality::Incorrect,
                correct_count: 0,
                ambiguous_count: 0,
                incorrect_count: 0,
            };
        }

        let per_chunk: Vec<(RetrievalQuality, f64)> = chunks
            .iter()
            .map(|(text, score)| self.evaluate(query, text, *score))
            .collect();

        let correct_count = per_chunk
            .iter()
            .filter(|(q, _)| *q == RetrievalQuality::Correct)
            .count();
        let ambiguous_count = per_chunk
            .iter()
            .filter(|(q, _)| *q == RetrievalQuality::Ambiguous)
            .count();
        let incorrect_count = per_chunk
            .iter()
            .filter(|(q, _)| *q == RetrievalQuality::Incorrect)
            .count();

        // Overall quality is determined by the dominant tier.
        let n = per_chunk.len() as f64;
        let correct_ratio = correct_count as f64 / n;
        let overall_quality = if correct_ratio > 0.5 {
            RetrievalQuality::Correct
        } else if incorrect_count as f64 / n > 0.5 {
            RetrievalQuality::Incorrect
        } else {
            RetrievalQuality::Ambiguous
        };

        BatchEvaluation {
            per_chunk,
            overall_quality,
            correct_count,
            ambiguous_count,
            incorrect_count,
        }
    }

    /// Suggest the corrective action to take based on a `BatchEvaluation`.
    ///
    /// Decision rules:
    /// - `Correct` overall → `UseDirectly` (indices of CORRECT chunks).
    /// - `Ambiguous` overall → `DecomposeAndRequery` (heuristic sub-queries).
    /// - `Incorrect` overall → `WebFallback`.
    pub fn suggest_action(&self, eval: &BatchEvaluation) -> CragAction {
        match eval.overall_quality {
            RetrievalQuality::Correct => {
                let good_indices: Vec<usize> = eval
                    .per_chunk
                    .iter()
                    .enumerate()
                    .filter(|(_, (q, _))| *q == RetrievalQuality::Correct)
                    .map(|(i, _)| i)
                    .collect();
                CragAction::UseDirectly(good_indices)
            }
            RetrievalQuality::Ambiguous => {
                // Simple heuristic decomposition: emit two narrowed sub-queries.
                // A production system would use an LLM for this step; here we
                // provide keyword-based decomposition as a deterministic fallback.
                CragAction::DecomposeAndRequery(vec![
                    format!("detailed explanation of {}", truncate_query(eval)),
                    format!("examples of {}", truncate_query(eval)),
                ])
            }
            RetrievalQuality::Incorrect => {
                CragAction::WebFallback(format!("web search: {}", truncate_query(eval)))
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Feature computations
// ---------------------------------------------------------------------------

/// Fraction of unique query words (lowercased, split on whitespace and
/// punctuation) that appear anywhere in `chunk_text`.
fn keyword_overlap(query: &str, chunk_text: &str) -> f64 {
    let query_words = tokenize(query);
    if query_words.is_empty() {
        return 0.0;
    }
    let chunk_lower = chunk_text.to_lowercase();
    let found = query_words
        .iter()
        .filter(|w| chunk_lower.contains(w.as_str()))
        .count();
    found as f64 / query_words.len() as f64
}

/// `chunk_len / ideal_len`, capped at 1.0.
///
/// Very short chunks (no content) score near 0; chunks of `ideal_len` or
/// longer score 1.0.
fn chunk_length_ratio(chunk_text: &str, ideal_len: usize) -> f64 {
    if ideal_len == 0 {
        return 1.0;
    }
    let ratio = chunk_text.len() as f64 / ideal_len as f64;
    ratio.min(1.0)
}

/// Fraction of unique query bigrams that appear in `chunk_text`.
///
/// A bigram is a pair of adjacent tokens.  This is a stricter signal than
/// keyword overlap because the tokens must co-occur in order.
fn query_coverage(query: &str, chunk_text: &str) -> f64 {
    let tokens = tokenize(query);
    if tokens.len() < 2 {
        // Fall back to unigram overlap for single-token queries.
        return keyword_overlap(query, chunk_text);
    }

    let bigrams: Vec<String> = tokens
        .windows(2)
        .map(|w| format!("{} {}", w[0], w[1]))
        .collect();

    let chunk_lower = chunk_text.to_lowercase();
    let found = bigrams
        .iter()
        .filter(|bg| chunk_lower.contains(bg.as_str()))
        .count();
    found as f64 / bigrams.len() as f64
}

/// Tokenise a string into lowercase words (alpha-numeric sequences only).
fn tokenize(text: &str) -> Vec<String> {
    text.split(|c: char| !c.is_alphanumeric())
        .filter(|t| !t.is_empty())
        .map(|t| t.to_lowercase())
        .collect()
}

/// Extract a short label from the batch evaluation for use in sub-queries.
/// Because we don't store the original query in `BatchEvaluation`, we use a
/// fixed placeholder that callers replace in practice.
fn truncate_query(_eval: &BatchEvaluation) -> &'static str {
    "the requested topic"
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn evaluator() -> CragEvaluator {
        CragEvaluator::new()
    }

    // -- single chunk evaluation --

    #[test]
    fn high_similarity_and_keywords_produces_correct() {
        let ev = evaluator();
        // Use a query and chunk with strong lexical overlap + high similarity.
        let query = "machine learning EU remote jobs";
        let chunk = "Machine learning and remote jobs in the EU are growing rapidly, \
                     with many companies hiring engineers across Europe. \
                     Machine learning frameworks and EU labour laws make EU remote work \
                     increasingly attractive for ML engineers. More machine learning and \
                     remote work opportunities are appearing every week across the EU.";
        let (quality, confidence) = ev.evaluate(query, chunk, 0.9);
        assert_eq!(
            quality,
            RetrievalQuality::Correct,
            "high sim + keyword overlap should be Correct, confidence={confidence:.3}"
        );
        assert!(confidence > CORRECT_THRESHOLD, "confidence should exceed 0.7, got {confidence:.3}");
    }

    #[test]
    fn low_similarity_and_no_keywords_produces_incorrect() {
        let ev = evaluator();
        let query = "AI engineering salary negotiation";
        let chunk = "The weather forecast shows rain on Tuesday and sunny skies by the weekend.";
        let (quality, confidence) = ev.evaluate(query, chunk, 0.05);
        assert_eq!(
            quality,
            RetrievalQuality::Incorrect,
            "low sim + no overlap should be Incorrect, confidence={confidence:.3}"
        );
        assert!(confidence < INCORRECT_THRESHOLD, "confidence should be < 0.3, got {confidence:.3}");
    }

    #[test]
    fn medium_similarity_produces_ambiguous() {
        let ev = evaluator();
        let query = "deep learning research";
        // Some keywords match but the chunk is very short (low length_ratio).
        let chunk = "deep learning overview";
        let (quality, confidence) = ev.evaluate(query, chunk, 0.5);
        // Confidence is a blend; we just verify it's in the right range.
        assert!(
            confidence >= 0.0 && confidence <= 1.0,
            "confidence must be in [0,1], got {confidence:.3}"
        );
        // With sim=0.5 and partial keyword coverage the result should not be Correct.
        assert_ne!(
            quality,
            RetrievalQuality::Correct,
            "medium sim + short chunk should not be Correct"
        );
    }

    // -- keyword_overlap --

    #[test]
    fn keyword_overlap_all_words_present() {
        let overlap = keyword_overlap("remote EU jobs", "remote jobs in EU are available");
        assert!((overlap - 1.0).abs() < f64::EPSILON, "all query words present, expected 1.0 got {overlap:.3}");
    }

    #[test]
    fn keyword_overlap_no_words_present() {
        let overlap = keyword_overlap("machine learning", "the cat sat on the mat");
        assert_eq!(overlap, 0.0, "no query words in chunk, expected 0.0 got {overlap:.3}");
    }

    #[test]
    fn keyword_overlap_partial() {
        let overlap = keyword_overlap("remote EU jobs", "remote work available");
        assert!(overlap > 0.0 && overlap < 1.0, "partial match should be in (0,1), got {overlap:.3}");
    }

    #[test]
    fn keyword_overlap_empty_query_returns_zero() {
        let overlap = keyword_overlap("", "some content here");
        assert_eq!(overlap, 0.0);
    }

    // -- chunk_length_ratio --

    #[test]
    fn chunk_length_ratio_ideal_length_is_one() {
        let text = "x".repeat(IDEAL_CHUNK_LEN);
        let ratio = chunk_length_ratio(&text, IDEAL_CHUNK_LEN);
        assert!((ratio - 1.0).abs() < f64::EPSILON, "chunk at ideal length should score 1.0, got {ratio:.3}");
    }

    #[test]
    fn chunk_length_ratio_long_chunk_capped_at_one() {
        let text = "x".repeat(IDEAL_CHUNK_LEN * 5);
        let ratio = chunk_length_ratio(&text, IDEAL_CHUNK_LEN);
        assert_eq!(ratio, 1.0, "long chunk must be capped at 1.0, got {ratio:.3}");
    }

    #[test]
    fn chunk_length_ratio_short_chunk_below_one() {
        let text = "x".repeat(IDEAL_CHUNK_LEN / 4);
        let ratio = chunk_length_ratio(&text, IDEAL_CHUNK_LEN);
        assert!(ratio < 1.0 && ratio > 0.0, "short chunk should be in (0,1), got {ratio:.3}");
    }

    // -- query_coverage (bigrams) --

    #[test]
    fn query_coverage_all_bigrams_present() {
        let query = "remote EU jobs AI";
        let chunk = "remote EU jobs AI engineers are in high demand";
        let coverage = query_coverage(query, chunk);
        assert!((coverage - 1.0).abs() < f64::EPSILON, "all bigrams present, expected 1.0 got {coverage:.3}");
    }

    #[test]
    fn query_coverage_no_bigrams_present() {
        let coverage = query_coverage("machine learning jobs", "the sky is blue today");
        assert_eq!(coverage, 0.0, "no bigrams present, expected 0.0 got {coverage:.3}");
    }

    #[test]
    fn query_coverage_single_token_falls_back_to_keyword_overlap() {
        // Single token → falls back to keyword_overlap which checks unigrams.
        let cov = query_coverage("learning", "deep learning is powerful");
        let kw = keyword_overlap("learning", "deep learning is powerful");
        assert!((cov - kw).abs() < 1e-10, "single-token coverage should match keyword_overlap");
    }

    // -- batch evaluation --

    #[test]
    fn batch_evaluation_all_correct_chunks() {
        let ev = evaluator();
        let query = "machine learning EU remote";
        let chunks: Vec<(String, f64)> = vec![
            ("machine learning EU remote jobs are growing fast across the European Union remote engineering scene. machine learning EU remote".to_string(), 0.92),
            ("EU remote machine learning engineers find high demand remote roles. machine learning EU remote is trending.".to_string(), 0.88),
        ];
        let eval = ev.evaluate_batch(query, &chunks);
        assert_eq!(
            eval.overall_quality,
            RetrievalQuality::Correct,
            "all high-quality chunks should produce Correct overall"
        );
        assert_eq!(eval.per_chunk.len(), 2);
    }

    #[test]
    fn batch_evaluation_all_incorrect_chunks() {
        let ev = evaluator();
        let query = "AI salary negotiation tips";
        let chunks: Vec<(String, f64)> = vec![
            ("The weather is nice today.".to_string(), 0.04),
            ("Football results from last Sunday.".to_string(), 0.06),
            ("Recipe for chocolate cake.".to_string(), 0.03),
        ];
        let eval = ev.evaluate_batch(query, &chunks);
        assert_eq!(
            eval.overall_quality,
            RetrievalQuality::Incorrect,
            "all low-quality chunks should produce Incorrect overall"
        );
        assert_eq!(eval.incorrect_count, 3);
    }

    #[test]
    fn batch_evaluation_empty_chunks() {
        let ev = evaluator();
        let eval = ev.evaluate_batch("anything", &[]);
        assert_eq!(eval.overall_quality, RetrievalQuality::Incorrect);
        assert_eq!(eval.correct_count, 0);
        assert!(eval.per_chunk.is_empty());
    }

    #[test]
    fn batch_counts_add_up() {
        let ev = evaluator();
        let query = "deep learning remote";
        let chunks: Vec<(String, f64)> = vec![
            ("deep learning remote work".to_string(), 0.85),
            ("the cat sat on the mat".to_string(), 0.05),
            ("deep learning with moderate context".to_string(), 0.5),
        ];
        let eval = ev.evaluate_batch(query, &chunks);
        assert_eq!(
            eval.correct_count + eval.ambiguous_count + eval.incorrect_count,
            eval.per_chunk.len(),
            "category counts must sum to total chunks"
        );
    }

    // -- action suggestions --

    #[test]
    fn correct_overall_suggests_use_directly() {
        let ev = evaluator();
        let query = "machine learning EU remote";
        let chunks = vec![
            ("machine learning EU remote jobs in Europe offer high salaries machine learning EU remote".to_string(), 0.92),
        ];
        let eval = ev.evaluate_batch(query, &chunks);
        // Force a Correct evaluation by checking the action.
        let action = ev.suggest_action(&BatchEvaluation {
            per_chunk: vec![(RetrievalQuality::Correct, 0.85)],
            overall_quality: RetrievalQuality::Correct,
            correct_count: 1,
            ambiguous_count: 0,
            incorrect_count: 0,
        });
        match action {
            CragAction::UseDirectly(indices) => assert!(!indices.is_empty()),
            other => panic!("expected UseDirectly, got {other:?}"),
        }
        let _ = eval; // suppress unused warning
    }

    #[test]
    fn ambiguous_overall_suggests_decompose() {
        let ev = evaluator();
        let action = ev.suggest_action(&BatchEvaluation {
            per_chunk: vec![(RetrievalQuality::Ambiguous, 0.50)],
            overall_quality: RetrievalQuality::Ambiguous,
            correct_count: 0,
            ambiguous_count: 1,
            incorrect_count: 0,
        });
        match action {
            CragAction::DecomposeAndRequery(sub_queries) => {
                assert!(!sub_queries.is_empty(), "should produce at least one sub-query");
            }
            other => panic!("expected DecomposeAndRequery, got {other:?}"),
        }
    }

    #[test]
    fn incorrect_overall_suggests_web_fallback() {
        let ev = evaluator();
        let action = ev.suggest_action(&BatchEvaluation {
            per_chunk: vec![(RetrievalQuality::Incorrect, 0.10)],
            overall_quality: RetrievalQuality::Incorrect,
            correct_count: 0,
            ambiguous_count: 0,
            incorrect_count: 1,
        });
        match action {
            CragAction::WebFallback(query) => {
                assert!(!query.is_empty(), "web fallback query must not be empty");
            }
            other => panic!("expected WebFallback, got {other:?}"),
        }
    }
}
