use anyhow::{Context, Result};
use tracing::info;

use crate::paper::ResearchPaper;

// ─── Ranker trait ────────────────────────────────────────────────────────────

/// Unified interface for semantic re-ranking of research papers.
///
/// Implementors embed a query and a set of papers, compute cosine similarity,
/// and return the papers sorted by descending relevance score.
#[async_trait::async_trait]
pub trait Ranker: Send + Sync {
    /// Re-rank `papers` by semantic similarity to `query`.
    ///
    /// Returns `(paper, score)` pairs sorted by descending score.
    async fn rank_papers(
        &self,
        query: &str,
        papers: Vec<ResearchPaper>,
    ) -> Result<Vec<(ResearchPaper, f32)>>;
}

// ─── API-based ranker (Qwen DashScope) ──────────────────────────────────────

/// Re-ranks papers by cosine similarity to a query embedding using Qwen's
/// `text-embedding-v4` model via DashScope.
pub struct EmbeddingRanker {
    client: qwen::Client,
}

impl EmbeddingRanker {
    pub fn new(api_key: &str) -> Self {
        Self {
            client: qwen::Client::new(api_key),
        }
    }

    /// Build with a pre-configured client (useful for testing or custom endpoints).
    pub fn with_client(client: qwen::Client) -> Self {
        Self { client }
    }
}

#[async_trait::async_trait]
impl Ranker for EmbeddingRanker {
    async fn rank_papers(
        &self,
        query: &str,
        papers: Vec<ResearchPaper>,
    ) -> Result<Vec<(ResearchPaper, f32)>> {
        if papers.is_empty() {
            return Ok(Vec::new());
        }

        // Build text representations for each paper.
        let texts: Vec<String> = papers
            .iter()
            .map(|p| {
                let abstract_text = p.abstract_text.as_deref().unwrap_or("");
                format!("{} {}", p.title, abstract_text)
            })
            .collect();

        // Embed query + all papers in a single batch.
        let mut all_inputs = Vec::with_capacity(1 + texts.len());
        all_inputs.push(query.to_string());
        all_inputs.extend(texts);

        let resp = self
            .client
            .embed(qwen::EmbeddingRequest::batch(all_inputs))
            .await
            .context("embedding batch request failed")?;

        // First embedding is the query; rest are papers.
        let embeddings: Vec<&[f32]> = resp.data.iter().map(|d| d.embedding.as_slice()).collect();
        let query_emb = embeddings
            .first()
            .context("empty embedding response")?;
        let paper_embs = &embeddings[1..];

        if paper_embs.len() != papers.len() {
            anyhow::bail!(
                "embedding count mismatch: got {} but expected {}",
                paper_embs.len(),
                papers.len()
            );
        }

        let mut scored: Vec<(ResearchPaper, f32)> = papers
            .into_iter()
            .zip(paper_embs.iter())
            .map(|(paper, emb)| {
                let sim = cosine_similarity(query_emb, emb);
                (paper, sim)
            })
            .collect();

        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        info!(
            count = scored.len(),
            top_score = scored.first().map(|(_, s)| *s).unwrap_or(0.0),
            "embedding re-rank complete (qwen)"
        );

        Ok(scored)
    }
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot / (norm_a * norm_b)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cosine_identical_vectors() {
        let v = vec![1.0, 2.0, 3.0];
        let sim = cosine_similarity(&v, &v);
        assert!((sim - 1.0).abs() < 1e-6);
    }

    #[test]
    fn cosine_orthogonal_vectors() {
        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        let sim = cosine_similarity(&a, &b);
        assert!(sim.abs() < 1e-6);
    }

    #[test]
    fn cosine_zero_vector() {
        let a = vec![1.0, 2.0];
        let b = vec![0.0, 0.0];
        let sim = cosine_similarity(&a, &b);
        assert_eq!(sim, 0.0);
    }
}
