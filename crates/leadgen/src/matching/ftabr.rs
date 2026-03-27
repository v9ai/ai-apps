/// FTabR (Faster Tabular Retrieval-Augmented) — K-Means pre-clustering for
/// fast ICP similarity retrieval.
///
/// Clusters company embedding vectors into k groups, enabling O(k) nearest-
/// centroid lookup followed by intra-cluster cosine ranking, instead of an
/// O(n) linear scan over the full corpus.
///
/// Algorithm:
/// 1. `KMeans::fit` — Lloyd's algorithm with index-based deterministic
///    centroid seeding, L2 assignment, and furthest-point re-initialisation
///    for empty clusters.
/// 2. `FTabR::retrieve` — nearest cluster → cosine ranking within cluster.
/// 3. `FTabR::retrieve_multi_cluster` — top-n clusters for higher recall.

// ---------------------------------------------------------------------------
// KMeans
// ---------------------------------------------------------------------------

/// K-Means cluster index over arbitrary float vectors.
pub struct KMeans {
    centroids: Vec<Vec<f64>>,
    assignments: Vec<usize>, // data_index -> cluster_index
    k: usize,
}

impl KMeans {
    /// Run Lloyd's K-Means on `data` for at most `max_iters` iterations.
    ///
    /// Centroid seeding is deterministic: centroids are chosen at evenly-spaced
    /// indices (`0, n/k, 2n/k, …`) so that results are reproducible without an
    /// RNG dependency.
    ///
    /// Empty clusters are handled by reinitialising the centroid to the data
    /// point that is furthest from its current centroid, preventing the common
    /// degenerate case where large k causes dead clusters.
    pub fn fit(data: &[Vec<f64>], k: usize, max_iters: usize) -> Self {
        let n = data.len();
        assert!(k > 0, "k must be at least 1");

        if n == 0 {
            return Self {
                centroids: Vec::new(),
                assignments: Vec::new(),
                k,
            };
        }

        let k = k.min(n);
        let dim = data[0].len();

        // Deterministic seeding: evenly-spaced indices.
        let mut centroids: Vec<Vec<f64>> = (0..k)
            .map(|i| {
                let idx = if k == 1 { 0 } else { i * (n - 1) / (k - 1) };
                data[idx.min(n - 1)].clone()
            })
            .collect();

        let mut assignments = vec![0usize; n];

        for _ in 0..max_iters {
            // --- Assignment step ---
            let mut changed = false;
            for (i, point) in data.iter().enumerate() {
                let nearest = nearest_centroid_index(point, &centroids);
                if nearest != assignments[i] {
                    assignments[i] = nearest;
                    changed = true;
                }
            }
            if !changed {
                break;
            }

            // --- Update step: recompute centroids ---
            let mut sums = vec![vec![0.0f64; dim]; k];
            let mut counts = vec![0usize; k];
            for (i, &c) in assignments.iter().enumerate() {
                for d in 0..dim {
                    sums[c][d] += data[i][d];
                }
                counts[c] += 1;
            }

            for c in 0..k {
                if counts[c] == 0 {
                    // Empty cluster: reinitialise to the point furthest from
                    // its currently assigned centroid.
                    let worst_idx = (0..n)
                        .max_by(|&a, &b| {
                            let da = l2_sq(&data[a], &centroids[assignments[a]]);
                            let db = l2_sq(&data[b], &centroids[assignments[b]]);
                            da.partial_cmp(&db).unwrap_or(std::cmp::Ordering::Equal)
                        })
                        .unwrap_or(0);
                    centroids[c] = data[worst_idx].clone();
                } else {
                    for d in 0..dim {
                        centroids[c][d] = sums[c][d] / counts[c] as f64;
                    }
                }
            }
        }

        Self {
            centroids,
            assignments,
            k,
        }
    }

    /// Find the nearest centroid for `query`.
    ///
    /// Returns `(cluster_index, l2_distance)`.
    pub fn nearest_cluster(&self, query: &[f64]) -> (usize, f64) {
        if self.centroids.is_empty() {
            return (0, f64::MAX);
        }
        let mut best_idx = 0;
        let mut best_dist = f64::MAX;
        for (i, centroid) in self.centroids.iter().enumerate() {
            let d = l2_sq(query, centroid).sqrt();
            if d < best_dist {
                best_dist = d;
                best_idx = i;
            }
        }
        (best_idx, best_dist)
    }

    /// Return the indices of all data points assigned to `cluster_id`.
    pub fn cluster_members(&self, cluster_id: usize) -> Vec<usize> {
        self.assignments
            .iter()
            .enumerate()
            .filter(|(_, &c)| c == cluster_id)
            .map(|(i, _)| i)
            .collect()
    }

    /// Return all centroids ordered by L2 distance to `query` (nearest first).
    fn nearest_clusters_ranked(&self, query: &[f64]) -> Vec<(usize, f64)> {
        let mut ranked: Vec<(usize, f64)> = self
            .centroids
            .iter()
            .enumerate()
            .map(|(i, c)| (i, l2_sq(query, c).sqrt()))
            .collect();
        ranked.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
        ranked
    }
}

// ---------------------------------------------------------------------------
// FTabR
// ---------------------------------------------------------------------------

/// FTabR retrieval index: pre-cluster → nearest-cluster lookup → cosine rank.
pub struct FTabR {
    kmeans: KMeans,
    embeddings: Vec<Vec<f64>>,
    ids: Vec<String>,
}

impl FTabR {
    /// Build the index from `(id, embedding)` pairs.
    ///
    /// `num_clusters` controls the trade-off between retrieval speed and recall:
    /// fewer clusters = more items per cluster = slower but higher recall;
    /// more clusters = fewer items per cluster = faster but potentially lower recall.
    /// A good default is `sqrt(n)`.
    pub fn build(items: Vec<(String, Vec<f64>)>, num_clusters: usize) -> Self {
        let (ids, embeddings): (Vec<String>, Vec<Vec<f64>>) = items.into_iter().unzip();
        let kmeans = KMeans::fit(&embeddings, num_clusters.max(1), 100);
        Self {
            kmeans,
            embeddings,
            ids,
        }
    }

    /// Retrieve the top-`k` most similar items to `query` by searching only
    /// the nearest cluster.
    ///
    /// Returns `(id, cosine_similarity)` pairs sorted descending by similarity.
    pub fn retrieve(&self, query: &[f64], k: usize) -> Vec<(String, f64)> {
        if self.embeddings.is_empty() {
            return Vec::new();
        }
        let (cluster_id, _) = self.kmeans.nearest_cluster(query);
        let members = self.kmeans.cluster_members(cluster_id);
        self.rank_members(query, &members, k)
    }

    /// Retrieve the top-`k` items by searching across the `n_clusters` closest
    /// clusters, improving recall at the cost of more comparisons.
    pub fn retrieve_multi_cluster(
        &self,
        query: &[f64],
        k: usize,
        n_clusters: usize,
    ) -> Vec<(String, f64)> {
        if self.embeddings.is_empty() {
            return Vec::new();
        }
        let ranked_clusters = self.kmeans.nearest_clusters_ranked(query);
        let top_n = ranked_clusters
            .into_iter()
            .take(n_clusters)
            .map(|(c, _)| c);

        let mut candidate_indices: Vec<usize> = Vec::new();
        let mut seen = std::collections::HashSet::new();
        for c in top_n {
            for idx in self.kmeans.cluster_members(c) {
                if seen.insert(idx) {
                    candidate_indices.push(idx);
                }
            }
        }

        self.rank_members(query, &candidate_indices, k)
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /// Cosine-rank `members` against `query`, return top `k`.
    fn rank_members(&self, query: &[f64], members: &[usize], k: usize) -> Vec<(String, f64)> {
        let mut scored: Vec<(String, f64)> = members
            .iter()
            .map(|&idx| {
                let sim = cosine_similarity(query, &self.embeddings[idx]);
                (self.ids[idx].clone(), sim)
            })
            .collect();
        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        scored.truncate(k);
        scored
    }
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

/// Squared L2 distance between two equal-length vectors.
fn l2_sq(a: &[f64], b: &[f64]) -> f64 {
    a.iter()
        .zip(b.iter())
        .map(|(x, y)| (x - y) * (x - y))
        .sum()
}

/// Index of the centroid with minimum L2 distance to `point`.
fn nearest_centroid_index(point: &[f64], centroids: &[Vec<f64>]) -> usize {
    centroids
        .iter()
        .enumerate()
        .map(|(i, c)| (i, l2_sq(point, c)))
        .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(i, _)| i)
        .unwrap_or(0)
}

/// Cosine similarity in [−1, 1], clamped to [0, 1] for retrieval ranking.
fn cosine_similarity(a: &[f64], b: &[f64]) -> f64 {
    let dot: f64 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let norm_b: f64 = b.iter().map(|x| x * x).sum::<f64>().sqrt();
    if norm_a < f64::EPSILON || norm_b < f64::EPSILON {
        return 0.0;
    }
    (dot / (norm_a * norm_b)).clamp(0.0, 1.0)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn make_vec(vals: &[f64]) -> Vec<f64> {
        vals.to_vec()
    }

    // -- KMeans --

    #[test]
    fn fit_produces_k_centroids() {
        let data: Vec<Vec<f64>> = (0..20).map(|i| vec![i as f64, 0.0]).collect();
        let km = KMeans::fit(&data, 4, 50);
        assert_eq!(km.centroids.len(), 4, "should have exactly 4 centroids");
    }

    #[test]
    fn fit_k_larger_than_n_is_clamped() {
        let data: Vec<Vec<f64>> = (0..3).map(|i| vec![i as f64]).collect();
        let km = KMeans::fit(&data, 10, 50);
        // k is clamped to n=3
        assert!(km.centroids.len() <= 3);
    }

    #[test]
    fn nearest_cluster_returns_valid_index() {
        let data: Vec<Vec<f64>> = vec![
            vec![0.0, 0.0],
            vec![10.0, 0.0],
            vec![0.0, 10.0],
            vec![10.0, 10.0],
        ];
        let km = KMeans::fit(&data, 2, 50);
        let (idx, dist) = km.nearest_cluster(&[0.1, 0.1]);
        assert!(idx < km.k, "cluster index must be < k, got {idx}");
        assert!(dist >= 0.0, "distance must be non-negative, got {dist}");
    }

    #[test]
    fn cluster_members_covers_all_data_points() {
        let data: Vec<Vec<f64>> = (0..15).map(|i| vec![i as f64]).collect();
        let km = KMeans::fit(&data, 3, 50);
        let all_members: Vec<usize> = (0..km.k)
            .flat_map(|c| km.cluster_members(c))
            .collect();
        assert_eq!(all_members.len(), 15, "every point must be in exactly one cluster");
    }

    #[test]
    fn empty_data_does_not_panic() {
        let km = KMeans::fit(&[], 3, 50);
        assert!(km.centroids.is_empty());
        assert!(km.assignments.is_empty());
    }

    #[test]
    fn single_point_single_cluster() {
        let km = KMeans::fit(&[vec![1.0, 2.0]], 1, 10);
        assert_eq!(km.centroids.len(), 1);
        assert_eq!(km.assignments[0], 0);
    }

    // -- FTabR --

    fn build_index(n: usize, clusters: usize) -> FTabR {
        let items: Vec<(String, Vec<f64>)> = (0..n)
            .map(|i| {
                let angle = (i as f64) * std::f64::consts::TAU / n as f64;
                (format!("item-{i}"), vec![angle.cos(), angle.sin()])
            })
            .collect();
        FTabR::build(items, clusters)
    }

    #[test]
    fn retrieve_returns_at_most_k_items() {
        let index = build_index(20, 4);
        let query = vec![1.0, 0.0];
        let results = index.retrieve(&query, 5);
        assert!(results.len() <= 5, "retrieve must return at most k={} items, got {}", 5, results.len());
    }

    #[test]
    fn retrieve_results_are_sorted_descending() {
        let index = build_index(20, 4);
        let query = vec![1.0, 0.0];
        let results = index.retrieve(&query, 10);
        for w in results.windows(2) {
            assert!(
                w[0].1 >= w[1].1,
                "results must be sorted by descending similarity: {} < {}",
                w[0].1,
                w[1].1
            );
        }
    }

    #[test]
    fn multi_cluster_has_at_least_as_many_results_as_single_cluster() {
        let index = build_index(40, 5);
        let query = vec![1.0, 0.0];
        let single = index.retrieve(&query, 10);
        let multi = index.retrieve_multi_cluster(&query, 10, 3);
        assert!(
            multi.len() >= single.len(),
            "multi-cluster retrieve should produce at least as many results: {} vs {}",
            multi.len(),
            single.len()
        );
    }

    #[test]
    fn multi_cluster_better_recall_for_spread_data() {
        // Two tight clusters far apart; query near the second cluster.
        // With only the nearest cluster, the correct item from the far cluster
        // should NOT appear; with multi-cluster it should.
        let mut items: Vec<(String, Vec<f64>)> = Vec::new();
        for i in 0..5 {
            items.push((format!("close-{i}"), vec![0.0 + i as f64 * 0.01, 0.0]));
        }
        for i in 0..5 {
            items.push((format!("far-{i}"), vec![100.0 + i as f64 * 0.01, 0.0]));
        }
        let index = FTabR::build(items, 2);

        let query = vec![50.0, 0.0]; // equidistant

        let multi = index.retrieve_multi_cluster(&query, 10, 2);
        let ids: Vec<&str> = multi.iter().map(|(id, _)| id.as_str()).collect();
        // With 2 clusters searched we should reach items from both groups.
        let has_close = ids.iter().any(|id| id.starts_with("close-"));
        let has_far = ids.iter().any(|id| id.starts_with("far-"));
        assert!(has_close && has_far, "multi-cluster should span both groups");
    }

    #[test]
    fn retrieve_empty_index_returns_empty() {
        let index = FTabR::build(vec![], 3);
        let results = index.retrieve(&[1.0, 0.0], 5);
        assert!(results.is_empty());
        let results2 = index.retrieve_multi_cluster(&[1.0, 0.0], 5, 2);
        assert!(results2.is_empty());
    }

    #[test]
    fn cosine_similarity_identical_vectors_is_one() {
        let v = vec![0.6, 0.8];
        assert!((cosine_similarity(&v, &v) - 1.0).abs() < 1e-10);
    }

    #[test]
    fn cosine_similarity_zero_vector_is_zero() {
        let zero = vec![0.0, 0.0];
        let v = vec![1.0, 0.0];
        assert_eq!(cosine_similarity(&zero, &v), 0.0);
    }
}
