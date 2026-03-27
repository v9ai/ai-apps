use anyhow::Result;
use std::collections::HashMap;
use tracing::info;

use super::graph::{ResolutionGraph, ResolvedCluster};
use super::signals;
use crate::db;
use crate::types::Contact;

/// Configuration for entity resolution.
pub struct ResolverConfig {
    pub match_threshold: f64,
    pub resolution_threshold: f64,
    pub blocking_key: BlockingStrategy,
}

#[derive(Debug, Clone)]
pub enum BlockingStrategy {
    /// Only compare contacts within the same email domain.
    Domain,
    /// Compare within domain + cross-domain name blocks.
    DomainAndName,
}

impl Default for ResolverConfig {
    fn default() -> Self {
        Self {
            match_threshold: 0.75,
            resolution_threshold: 0.70,
            blocking_key: BlockingStrategy::Domain,
        }
    }
}

pub struct EntityResolver {
    config: ResolverConfig,
    /// Pre-computed embeddings keyed by contact ID.  When present, cosine
    /// similarity is computed for each candidate pair and injected as an
    /// additional `EmbeddingSimilarity` signal.  Absent keys are silently
    /// skipped so the resolver stays backward-compatible.
    embeddings: Option<HashMap<String, Vec<f32>>>,
}

impl EntityResolver {
    pub fn new(config: ResolverConfig) -> Self {
        Self { config, embeddings: None }
    }

    /// Attach pre-computed embeddings (contact ID → vector).
    ///
    /// Call this before [`build_graph`] or [`resolve_and_persist`].  The
    /// embeddings are consumed by value so no extra clone is needed by the
    /// caller.
    pub fn with_embeddings(mut self, embeddings: HashMap<String, Vec<f32>>) -> Self {
        self.embeddings = Some(embeddings);
        self
    }

    /// Build the resolution graph from contacts using blocking.
    pub fn build_graph(&self, contacts: &[Contact]) -> ResolutionGraph {
        let mut graph = ResolutionGraph::new();

        for (i, c) in contacts.iter().enumerate() {
            graph.add_contact(&c.id, i);
        }

        let blocks = self.build_blocks(contacts);

        for indices in blocks.values() {
            for i in 0..indices.len() {
                for j in (i + 1)..indices.len() {
                    let a = &contacts[indices[i]];
                    let b = &contacts[indices[j]];
                    let mut sigs = signals::compute_signals(a, b);

                    // If embeddings were provided for both contacts, compute
                    // cosine similarity and add it as an additional signal.
                    // This is purely synchronous — embeddings are pre-computed.
                    if let Some(ref emb_map) = self.embeddings {
                        if let (Some(vec_a), Some(vec_b)) =
                            (emb_map.get(&a.id), emb_map.get(&b.id))
                        {
                            let sim = crate::vector::embedding::cosine_similarity(vec_a, vec_b);
                            if let Some(signal) =
                                signals::compute_embedding_signal(sim as f64)
                            {
                                sigs.push(signal);
                            }
                        }
                    }

                    let composite = signals::composite_match_score(&sigs);
                    if composite >= self.config.match_threshold {
                        graph.add_match(&a.id, &b.id, sigs);
                    }
                }
            }
        }

        graph
    }

    fn build_blocks(&self, contacts: &[Contact]) -> HashMap<String, Vec<usize>> {
        let mut blocks: HashMap<String, Vec<usize>> = HashMap::new();

        for (i, c) in contacts.iter().enumerate() {
            if let Some(ref email) = c.email {
                if let Some(domain) = email.split('@').nth(1) {
                    blocks
                        .entry(format!("domain:{}", domain.to_lowercase()))
                        .or_default()
                        .push(i);
                }
            }

            if matches!(self.config.blocking_key, BlockingStrategy::DomainAndName) {
                let key = c.last_name.to_lowercase();
                if key.len() >= 3 {
                    blocks
                        .entry(format!("name:{}", &key[..3]))
                        .or_default()
                        .push(i);
                }
            }
        }

        blocks
    }

    /// Resolve clusters and persist entity links.
    pub async fn resolve_and_persist(
        &self,
        contacts: &[Contact],
        database: &db::Db,
    ) -> Result<Vec<ResolvedCluster>> {
        let graph = self.build_graph(contacts);
        info!(
            nodes = graph.node_count(),
            edges = graph.edge_count(),
            "entity resolution graph built"
        );

        let mut clusters = graph.resolve_clusters(self.config.resolution_threshold);

        // Pick canonical for each cluster
        for cluster in &mut clusters {
            let indices: Vec<usize> = cluster
                .member_ids
                .iter()
                .filter_map(|id| contacts.iter().position(|c| c.id == *id))
                .collect();
            if !indices.is_empty() {
                let primary_idx = crate::dedup::pick_primary(contacts, &indices);
                cluster.canonical_id = contacts[primary_idx].id.clone();
            }
        }

        // Persist entity links
        for cluster in &clusters {
            for member_id in &cluster.member_ids {
                if member_id != &cluster.canonical_id {
                    save_entity_link(database, &cluster.canonical_id, member_id, cluster.confidence)
                        .await?;
                }
            }
        }

        info!(clusters = clusters.len(), "entity resolution completed");
        Ok(clusters)
    }
}

/// Public re-export of the link-persistence helper so that pipeline stages can
/// call it directly when they manage the resolve-and-persist loop themselves.
pub async fn save_entity_link_pub(
    db: &db::Db,
    canonical_id: &str,
    duplicate_id: &str,
    confidence: f64,
) -> Result<()> {
    save_entity_link(db, canonical_id, duplicate_id, confidence).await
}

async fn save_entity_link(
    db: &db::Db,
    canonical_id: &str,
    duplicate_id: &str,
    confidence: f64,
) -> Result<()> {
    sqlx::query(
        "INSERT INTO entity_links (canonical_id, duplicate_id, confidence, resolved_at)
         VALUES (?1, ?2, ?3, datetime('now'))
         ON CONFLICT(duplicate_id) DO UPDATE SET
           canonical_id = excluded.canonical_id,
           confidence = excluded.confidence,
           resolved_at = datetime('now')",
    )
    .bind(canonical_id)
    .bind(duplicate_id)
    .bind(confidence)
    .execute(db)
    .await?;
    Ok(())
}
