//! Candle embedding-based hotel deduplication.
//!
//! Uses pairwise cosine similarity (dot product of L2-normalized vectors)
//! to identify and merge duplicate hotel entries.

use anyhow::{Context, Result};
use tracing::info;

use crate::embeddings::EmbeddingEngine;
use crate::hotel::Hotel;

/// Deduplicate hotels using Candle embeddings.
///
/// 1. Fast pre-filter: case-insensitive name match after stripping common suffixes.
/// 2. Embed all hotels via `embed_text()` → Candle batch embedding.
/// 3. Pairwise cosine similarity (dot product of L2-normalized vecs).
/// 4. Merge pairs above `threshold` — keep the one with the richer description.
pub fn deduplicate(
    engine: &EmbeddingEngine,
    candidates: &[Hotel],
    existing: &[Hotel],
    threshold: f32,
) -> Result<Vec<Hotel>> {
    if candidates.is_empty() {
        return Ok(vec![]);
    }

    let all_hotels: Vec<&Hotel> = candidates.iter().chain(existing.iter()).collect();
    let n_candidates = candidates.len();
    let n_total = all_hotels.len();

    // Embed all hotels
    let texts: Vec<String> = all_hotels.iter().map(|h| h.embed_text()).collect();
    let text_refs: Vec<&str> = texts.iter().map(|s| s.as_str()).collect();
    let vecs = engine
        .embed_batch(&text_refs)
        .context("embedding hotels for dedup")?;

    // Track which candidates to keep (true = keep)
    let mut keep = vec![true; n_candidates];

    for i in 0..n_candidates {
        if !keep[i] {
            continue;
        }

        // Check against all other hotels (candidates + existing)
        for j in 0..n_total {
            if i == j {
                continue;
            }

            // Fast pre-filter: normalized name match
            let name_i = normalize_name(&all_hotels[i].name);
            let name_j = normalize_name(&all_hotels[j].name);
            let exact_name_match = name_i == name_j;

            // Cosine similarity (L2-normalized → dot product)
            let sim = dot_product(&vecs[i], &vecs[j]);

            if exact_name_match || sim >= threshold {
                if j < n_candidates {
                    // Both are candidates — keep the richer one
                    let desc_i = all_hotels[i].description.len() + all_hotels[i].amenities.len();
                    let desc_j = all_hotels[j].description.len() + all_hotels[j].amenities.len();
                    if desc_j > desc_i {
                        keep[i] = false;
                        break;
                    } else {
                        keep[j] = false;
                    }
                } else {
                    // j is an existing hotel — drop candidate i as duplicate
                    info!(
                        "Dropping '{}' — duplicate of existing '{}'  (sim={sim:.3})",
                        all_hotels[i].name, all_hotels[j].name
                    );
                    keep[i] = false;
                    break;
                }
            }
        }
    }

    let result: Vec<Hotel> = candidates
        .iter()
        .enumerate()
        .filter(|(i, _)| keep[*i])
        .map(|(_, h)| h.clone())
        .collect();

    info!(
        "Dedup: {} candidates → {} unique (threshold={:.2})",
        n_candidates,
        result.len(),
        threshold,
    );
    Ok(result)
}

/// Strip common hotel suffixes for name comparison.
fn normalize_name(name: &str) -> String {
    name.to_lowercase()
        .replace("hotel", "")
        .replace("resort", "")
        .replace("beach", "")
        .replace("suites", "")
        .replace("villas", "")
        .replace("palace", "")
        .replace("the ", "")
        .replace("  ", " ")
        .trim()
        .to_string()
}

/// Dot product of two L2-normalized vectors (= cosine similarity).
fn dot_product(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_strips_hotel_resort() {
        assert_eq!(normalize_name("Kiani Beach Resort"), "kiani");
    }

    #[test]
    fn normalize_strips_the_prefix() {
        assert_eq!(normalize_name("The Grand Hotel"), "grand");
    }

    #[test]
    fn normalize_preserves_unique_parts() {
        assert_eq!(
            normalize_name("Alexander House Hotel"),
            "alexander house"
        );
    }

    #[test]
    fn normalize_strips_all_suffixes() {
        assert_eq!(normalize_name("Royal Palace Suites"), "royal");
        assert_eq!(normalize_name("Sunset Villas"), "sunset");
    }

    #[test]
    fn dot_product_identical() {
        let v = vec![0.6, 0.8];
        assert!((dot_product(&v, &v) - 1.0).abs() < 1e-5);
    }

    #[test]
    fn dot_product_orthogonal() {
        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        assert!(dot_product(&a, &b).abs() < 1e-5);
    }
}
