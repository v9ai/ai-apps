//! RelV — Relational Vector Database.
//!
//! Implements graph-aware vector indexing from agent-01-novelty-infrastructure-2026.
//! Vectors carry relational metadata (typed, weighted edges to other entries)
//! that is exploited during search to boost contextually relevant results.
//!
//! ## Search modes
//!
//! ### Standard search (`search`)
//! Pure cosine-similarity ranking over all entries. Equivalent to a flat
//! in-memory HNSW-like brute-force scan.
//!
//! ### Contextual search (`contextual_search`)
//! Blends vector similarity with a **relational boost** derived from a
//! caller-supplied context set:
//!
//! ```text
//! score(e) = α · cosine(query, e.embedding)
//!          + (1 - α) · relational_boost(e, context_ids)
//! ```
//!
//! `relational_boost(e, C)` sums the weights of all edges from `e` into `C`.
//! When `e` shares many strong relations with the context set, it is surfaced
//! even if its raw vector similarity is modest.
//!
//! ### Graph walk (`walk`)
//! BFS from a start entry up to `max_hops` edges, returning all reachable
//! entries with their minimum hop distance.
//!
//! ## Complexity
//!
//! - Insert: O(1) amortized
//! - Search: O(N · D) where N = entry count, D = embedding dimension
//! - Walk: O(N + E) where E = total edge count

use std::collections::{HashMap, HashSet, VecDeque};

// ── RelationalEntry ───────────────────────────────────────────────────────────

/// A vector entry with relational metadata.
#[derive(Debug, Clone)]
pub struct RelationalEntry {
    /// Unique string identifier for this entry.
    pub id: String,
    /// Dense embedding vector (arbitrary dimension, must be consistent within a DB).
    pub embedding: Vec<f64>,
    /// Outgoing relations: `(target_id, relation_type, weight)`.
    ///
    /// `relation_type` is an open-ended label (e.g., `"similar_to"`,
    /// `"authored_by"`, `"requires_skill"`).
    pub relations: Vec<(String, String, f64)>,
    /// Arbitrary string key-value metadata.
    pub metadata: HashMap<String, String>,
}

// ── RelationalVectorDb ────────────────────────────────────────────────────────

/// Relational vector database: dense vectors with a typed, weighted graph overlay.
///
/// # Example
/// ```rust
/// use std::collections::HashMap;
/// use leadgen::vector::relv::{RelationalVectorDb, RelationalEntry};
///
/// let mut db = RelationalVectorDb::new();
/// db.insert(RelationalEntry {
///     id: "job-1".into(),
///     embedding: vec![0.6, 0.8],
///     relations: vec![("company-1".into(), "posted_by".into(), 1.0)],
///     metadata: HashMap::new(),
/// });
/// let results = db.search(&[0.6, 0.8], 1);
/// assert_eq!(results[0].0, "job-1");
/// ```
pub struct RelationalVectorDb {
    /// Ordered list of entries (insert order preserved).
    entries: Vec<RelationalEntry>,
    /// Mapping from id string to position in `entries`.
    id_index: HashMap<String, usize>,
}

impl RelationalVectorDb {
    /// Create an empty relational vector database.
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
            id_index: HashMap::new(),
        }
    }

    // ── Mutation ──────────────────────────────────────────────────────────────

    /// Insert a new entry.
    ///
    /// If an entry with the same `id` already exists, it is replaced in place.
    pub fn insert(&mut self, entry: RelationalEntry) {
        if let Some(&existing_idx) = self.id_index.get(&entry.id) {
            self.entries[existing_idx] = entry;
        } else {
            let idx = self.entries.len();
            self.id_index.insert(entry.id.clone(), idx);
            self.entries.push(entry);
        }
    }

    /// Add a directed relation between two existing entries.
    ///
    /// If `from` does not exist, the call is a no-op. If the identical
    /// `(target_id, rel_type)` pair already exists, its weight is updated to
    /// the new value rather than duplicated.
    pub fn add_relation(
        &mut self,
        from: &str,
        to: &str,
        rel_type: &str,
        weight: f64,
    ) {
        if let Some(&idx) = self.id_index.get(from) {
            let entry = &mut self.entries[idx];
            // Update if the same (target, type) pair already exists
            for rel in &mut entry.relations {
                if rel.0 == to && rel.1 == rel_type {
                    rel.2 = weight;
                    return;
                }
            }
            entry.relations.push((to.to_string(), rel_type.to_string(), weight));
        }
    }

    // ── Search ────────────────────────────────────────────────────────────────

    /// Standard vector search — cosine similarity only, ignoring relations.
    ///
    /// Returns up to `k` `(id, score)` pairs sorted descending by similarity.
    pub fn search(&self, query: &[f64], k: usize) -> Vec<(String, f64)> {
        if k == 0 || self.entries.is_empty() {
            return Vec::new();
        }

        let mut scored: Vec<(String, f64)> = self
            .entries
            .iter()
            .map(|e| {
                let sim = cosine_similarity_f64(query, &e.embedding);
                (e.id.clone(), sim)
            })
            .collect();

        scored.sort_by(|a, b| {
            b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal)
        });
        scored.truncate(k);
        scored
    }

    /// Contextual search combining vector similarity with relational proximity.
    ///
    /// `context_ids` is the set of entries that define the current context
    /// (e.g., already-retrieved relevant documents). Entries that are strongly
    /// connected to the context receive a relational boost.
    ///
    /// `alpha` ∈ [0, 1] controls the blend:
    /// - `alpha = 1.0` → pure vector search (same as `search`)
    /// - `alpha = 0.0` → pure relational boost
    ///
    /// Returns up to `k` `(id, score)` pairs sorted descending by combined score.
    pub fn contextual_search(
        &self,
        query: &[f64],
        context_ids: &[String],
        alpha: f64,
        k: usize,
    ) -> Vec<(String, f64)> {
        if k == 0 || self.entries.is_empty() {
            return Vec::new();
        }

        let alpha = alpha.clamp(0.0, 1.0);
        let context_set: HashSet<&str> =
            context_ids.iter().map(|s| s.as_str()).collect();

        let mut scored: Vec<(String, f64)> = self
            .entries
            .iter()
            .map(|e| {
                let vec_sim = cosine_similarity_f64(query, &e.embedding);
                let rel_boost = relational_boost(e, &context_set);
                let combined = alpha * vec_sim + (1.0 - alpha) * rel_boost;
                (e.id.clone(), combined)
            })
            .collect();

        scored.sort_by(|a, b| {
            b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal)
        });
        scored.truncate(k);
        scored
    }

    // ── Graph operations ──────────────────────────────────────────────────────

    /// Get all outgoing relations from an entry.
    ///
    /// Returns a clone of the `(target_id, relation_type, weight)` triples.
    /// Returns an empty vec if `id` is not found.
    pub fn related(&self, id: &str) -> Vec<(String, String, f64)> {
        self.id_index
            .get(id)
            .map(|&idx| self.entries[idx].relations.clone())
            .unwrap_or_default()
    }

    /// BFS graph walk from `start_id` up to `max_hops` edges.
    ///
    /// Returns all reachable entries (excluding the start) as
    /// `(id, min_hop_distance)` pairs in BFS order (closest first).
    /// Only follows outgoing edges (directed graph).
    ///
    /// Returns an empty vec if `start_id` is not found.
    pub fn walk(&self, start_id: &str, max_hops: usize) -> Vec<(String, usize)> {
        if !self.id_index.contains_key(start_id) {
            return Vec::new();
        }

        let mut visited: HashSet<&str> = HashSet::new();
        let mut queue: VecDeque<(&str, usize)> = VecDeque::new();
        let mut results: Vec<(String, usize)> = Vec::new();

        visited.insert(start_id);
        queue.push_back((start_id, 0));

        while let Some((current_id, hops)) = queue.pop_front() {
            if hops >= max_hops {
                continue;
            }

            if let Some(&idx) = self.id_index.get(current_id) {
                for (target_id, _rel_type, _weight) in &self.entries[idx].relations {
                    let target_str = target_id.as_str();
                    if !visited.contains(target_str) {
                        visited.insert(target_str);
                        let next_hops = hops + 1;
                        results.push((target_id.clone(), next_hops));
                        queue.push_back((target_str, next_hops));
                    }
                }
            }
        }

        results
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    /// Total number of entries in the database.
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Whether the database contains no entries.
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

impl Default for RelationalVectorDb {
    fn default() -> Self {
        Self::new()
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Cosine similarity between two f64 vectors.
///
/// Returns 0.0 for zero-norm vectors or mismatched dimensions (safe no-panic).
pub fn cosine_similarity_f64(a: &[f64], b: &[f64]) -> f64 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }

    let dot: f64 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let norm_b: f64 = b.iter().map(|x| x * x).sum::<f64>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        (dot / (norm_a * norm_b)).clamp(-1.0, 1.0)
    }
}

/// Compute the relational boost for an entry given the current context set.
///
/// For each context member that `entry` has an outgoing relation to, add the
/// relation weight. The raw sum is then clamped to [0, 1].
///
/// If the entry has no relations into the context, returns 0.0.
fn relational_boost(entry: &RelationalEntry, context: &HashSet<&str>) -> f64 {
    if context.is_empty() {
        return 0.0;
    }

    let raw: f64 = entry
        .relations
        .iter()
        .filter(|(target, _rel, _w)| context.contains(target.as_str()))
        .map(|(_target, _rel, weight)| *weight)
        .sum();

    raw.clamp(0.0, 1.0)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(id: &str, emb: Vec<f64>) -> RelationalEntry {
        RelationalEntry {
            id: id.into(),
            embedding: emb,
            relations: Vec::new(),
            metadata: HashMap::new(),
        }
    }

    fn entry_with_rel(
        id: &str,
        emb: Vec<f64>,
        target: &str,
        rel: &str,
        w: f64,
    ) -> RelationalEntry {
        RelationalEntry {
            id: id.into(),
            embedding: emb,
            relations: vec![(target.into(), rel.into(), w)],
            metadata: HashMap::new(),
        }
    }

    // ── cosine_similarity_f64 ─────────────────────────────────────────────────

    #[test]
    fn cosine_identical_vectors_is_one() {
        let v = vec![1.0, 2.0, 3.0];
        let sim = cosine_similarity_f64(&v, &v);
        assert!((sim - 1.0).abs() < 1e-9, "identical vectors → cosine 1.0, got {sim}");
    }

    #[test]
    fn cosine_orthogonal_vectors_is_zero() {
        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        let sim = cosine_similarity_f64(&a, &b);
        assert!((sim).abs() < 1e-9, "orthogonal vectors → cosine 0.0, got {sim}");
    }

    #[test]
    fn cosine_opposite_vectors_is_minus_one() {
        let a = vec![1.0, 0.0];
        let b = vec![-1.0, 0.0];
        let sim = cosine_similarity_f64(&a, &b);
        assert!((sim + 1.0).abs() < 1e-9, "opposite vectors → cosine -1.0, got {sim}");
    }

    #[test]
    fn cosine_zero_vector_returns_zero() {
        let a = vec![0.0, 0.0];
        let b = vec![1.0, 2.0];
        assert_eq!(cosine_similarity_f64(&a, &b), 0.0);
        assert_eq!(cosine_similarity_f64(&b, &a), 0.0);
    }

    #[test]
    fn cosine_dimension_mismatch_returns_zero() {
        let a = vec![1.0, 2.0];
        let b = vec![1.0, 2.0, 3.0];
        assert_eq!(cosine_similarity_f64(&a, &b), 0.0);
    }

    // ── insert and search ─────────────────────────────────────────────────────

    #[test]
    fn insert_and_search_finds_identical_vector() {
        let mut db = RelationalVectorDb::new();
        db.insert(entry("a", vec![1.0, 0.0]));
        db.insert(entry("b", vec![0.0, 1.0]));

        let results = db.search(&[1.0, 0.0], 1);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, "a");
    }

    #[test]
    fn search_returns_top_k_sorted_descending() {
        let mut db = RelationalVectorDb::new();
        db.insert(entry("far", vec![0.0, 1.0]));
        db.insert(entry("close", vec![0.9, 0.1]));
        db.insert(entry("mid", vec![0.7, 0.3]));

        let results = db.search(&[1.0, 0.0], 3);
        assert_eq!(results.len(), 3);
        assert!(results[0].1 >= results[1].1);
        assert!(results[1].1 >= results[2].1);
    }

    #[test]
    fn search_k_zero_returns_empty() {
        let mut db = RelationalVectorDb::new();
        db.insert(entry("a", vec![1.0, 0.0]));
        assert!(db.search(&[1.0, 0.0], 0).is_empty());
    }

    #[test]
    fn insert_replaces_existing_entry() {
        let mut db = RelationalVectorDb::new();
        db.insert(entry("a", vec![1.0, 0.0]));
        db.insert(entry("a", vec![0.0, 1.0])); // replace

        assert_eq!(db.len(), 1);
        let results = db.search(&[0.0, 1.0], 1);
        assert_eq!(results[0].0, "a");
        assert!((results[0].1 - 1.0).abs() < 1e-9);
    }

    // ── contextual search boosts related entries ──────────────────────────────

    #[test]
    fn contextual_search_boosts_related_entries() {
        let mut db = RelationalVectorDb::new();

        // "ctx" is in the context set
        db.insert(entry("ctx", vec![0.0, 1.0]));

        // "related" has moderate similarity but is strongly connected to "ctx"
        db.insert(entry_with_rel("related", vec![0.5, 0.5], "ctx", "linked", 1.0));

        // "unrelated" has the same vector similarity as "related" but no edge to ctx
        db.insert(entry("unrelated", vec![0.5, 0.5]));

        let context = vec!["ctx".to_string()];
        let results = db.contextual_search(&[1.0, 0.0], &context, 0.5, 3);

        let related_score = results
            .iter()
            .find(|(id, _)| id == "related")
            .map(|(_, s)| *s)
            .unwrap_or(0.0);
        let unrelated_score = results
            .iter()
            .find(|(id, _)| id == "unrelated")
            .map(|(_, s)| *s)
            .unwrap_or(0.0);

        assert!(
            related_score > unrelated_score,
            "related entry should outscore unrelated: {related_score} vs {unrelated_score}"
        );
    }

    #[test]
    fn contextual_search_alpha_one_equals_plain_search() {
        let mut db = RelationalVectorDb::new();
        db.insert(entry("a", vec![1.0, 0.0]));
        db.insert(entry_with_rel("b", vec![0.0, 1.0], "a", "rel", 1.0));

        let context = vec!["a".to_string()];
        let plain = db.search(&[1.0, 0.0], 2);
        let ctx = db.contextual_search(&[1.0, 0.0], &context, 1.0, 2);

        assert_eq!(plain[0].0, ctx[0].0, "alpha=1.0 contextual search must match plain search");
    }

    #[test]
    fn contextual_search_empty_context_equals_plain_search() {
        let mut db = RelationalVectorDb::new();
        db.insert(entry("a", vec![1.0, 0.0]));
        db.insert(entry("b", vec![0.0, 1.0]));

        let plain = db.search(&[1.0, 0.0], 2);
        let ctx = db.contextual_search(&[1.0, 0.0], &[], 0.5, 2);

        // With empty context, relational_boost = 0 everywhere, so ranking
        // reverts to pure vector similarity.
        assert_eq!(plain[0].0, ctx[0].0);
    }

    // ── add_relation ──────────────────────────────────────────────────────────

    #[test]
    fn add_relation_creates_new_edge() {
        let mut db = RelationalVectorDb::new();
        db.insert(entry("a", vec![1.0, 0.0]));
        db.insert(entry("b", vec![0.0, 1.0]));

        db.add_relation("a", "b", "similar", 0.9);
        let rels = db.related("a");
        assert_eq!(rels.len(), 1);
        assert_eq!(rels[0].0, "b");
        assert_eq!(rels[0].1, "similar");
        assert!((rels[0].2 - 0.9).abs() < 1e-9);
    }

    #[test]
    fn add_relation_updates_existing_edge_weight() {
        let mut db = RelationalVectorDb::new();
        db.insert(entry("a", vec![1.0, 0.0]));
        db.insert(entry("b", vec![0.0, 1.0]));

        db.add_relation("a", "b", "similar", 0.5);
        db.add_relation("a", "b", "similar", 0.9); // update

        let rels = db.related("a");
        assert_eq!(rels.len(), 1, "should not duplicate the edge");
        assert!((rels[0].2 - 0.9).abs() < 1e-9, "weight should be updated to 0.9");
    }

    #[test]
    fn add_relation_nonexistent_from_is_noop() {
        let mut db = RelationalVectorDb::new();
        db.add_relation("ghost", "b", "rel", 1.0); // should not panic
        assert_eq!(db.len(), 0);
    }

    // ── graph walk ────────────────────────────────────────────────────────────

    #[test]
    fn walk_finds_direct_neighbors() {
        let mut db = RelationalVectorDb::new();
        db.insert(entry("a", vec![1.0, 0.0]));
        db.insert(entry("b", vec![0.0, 1.0]));
        db.add_relation("a", "b", "links_to", 1.0);

        let reached = db.walk("a", 1);
        assert_eq!(reached.len(), 1);
        assert_eq!(reached[0].0, "b");
        assert_eq!(reached[0].1, 1); // 1 hop
    }

    #[test]
    fn walk_finds_transitive_relations() {
        let mut db = RelationalVectorDb::new();
        db.insert(entry("a", vec![1.0, 0.0]));
        db.insert(entry("b", vec![0.5, 0.5]));
        db.insert(entry("c", vec![0.0, 1.0]));
        db.add_relation("a", "b", "rel", 1.0);
        db.add_relation("b", "c", "rel", 1.0);

        let reached = db.walk("a", 2);
        let ids: Vec<&str> = reached.iter().map(|(id, _)| id.as_str()).collect();
        assert!(ids.contains(&"b"), "should reach b at hop 1");
        assert!(ids.contains(&"c"), "should reach c at hop 2 (transitive)");
    }

    #[test]
    fn walk_respects_max_hops() {
        let mut db = RelationalVectorDb::new();
        // Chain: a → b → c → d
        for id in ["a", "b", "c", "d"] {
            db.insert(entry(id, vec![1.0, 0.0]));
        }
        db.add_relation("a", "b", "r", 1.0);
        db.add_relation("b", "c", "r", 1.0);
        db.add_relation("c", "d", "r", 1.0);

        let reached_1 = db.walk("a", 1);
        let reached_2 = db.walk("a", 2);

        assert_eq!(reached_1.len(), 1, "max_hops=1 should only reach b");
        assert_eq!(reached_2.len(), 2, "max_hops=2 should reach b and c");
    }

    #[test]
    fn walk_does_not_revisit_nodes() {
        let mut db = RelationalVectorDb::new();
        db.insert(entry("a", vec![1.0, 0.0]));
        db.insert(entry("b", vec![0.5, 0.5]));
        // Bidirectional cycle: a ↔ b
        db.add_relation("a", "b", "r", 1.0);
        db.add_relation("b", "a", "r", 1.0);

        let reached = db.walk("a", 5);
        let b_count = reached.iter().filter(|(id, _)| id == "b").count();
        assert_eq!(b_count, 1, "b should appear exactly once despite cycle");
    }

    #[test]
    fn walk_nonexistent_start_returns_empty() {
        let db = RelationalVectorDb::new();
        assert!(db.walk("ghost", 3).is_empty());
    }

    #[test]
    fn walk_max_hops_zero_returns_empty() {
        let mut db = RelationalVectorDb::new();
        db.insert(entry("a", vec![1.0, 0.0]));
        db.insert(entry("b", vec![0.0, 1.0]));
        db.add_relation("a", "b", "r", 1.0);

        // max_hops=0 means we never leave the start node
        let reached = db.walk("a", 0);
        assert!(reached.is_empty(), "max_hops=0 should return empty");
    }

    // ── empty db handling ─────────────────────────────────────────────────────

    #[test]
    fn empty_db_search_returns_empty() {
        let db = RelationalVectorDb::new();
        assert!(db.search(&[1.0, 0.0], 5).is_empty());
    }

    #[test]
    fn empty_db_contextual_search_returns_empty() {
        let db = RelationalVectorDb::new();
        assert!(db
            .contextual_search(&[1.0, 0.0], &["ctx".to_string()], 0.5, 5)
            .is_empty());
    }

    #[test]
    fn empty_db_related_returns_empty() {
        let db = RelationalVectorDb::new();
        assert!(db.related("anything").is_empty());
    }

    #[test]
    fn empty_db_walk_returns_empty() {
        let db = RelationalVectorDb::new();
        assert!(db.walk("anything", 3).is_empty());
    }

    #[test]
    fn len_tracks_insertions_correctly() {
        let mut db = RelationalVectorDb::new();
        assert_eq!(db.len(), 0);
        db.insert(entry("a", vec![1.0, 0.0]));
        assert_eq!(db.len(), 1);
        db.insert(entry("b", vec![0.0, 1.0]));
        assert_eq!(db.len(), 2);
        // Re-insert existing id — should not increase count
        db.insert(entry("a", vec![0.5, 0.5]));
        assert_eq!(db.len(), 2);
    }
}
