use std::time::Instant;

use anyhow::Result;

use crate::entity_resolution::ensemble::EnsembleMatchScorer;
use crate::entity_resolution::graph_partition::GraphPartitioner;
use crate::entity_resolution::{EntityResolver, ResolverConfig};
use crate::pipeline::stage::*;
use crate::db;

pub struct EntityResolutionStage {
    config: ResolverConfig,
}

impl EntityResolutionStage {
    pub fn new() -> Self {
        Self {
            config: ResolverConfig::default(),
        }
    }

    pub fn with_config(config: ResolverConfig) -> Self {
        Self { config }
    }
}

impl PipelineStage for EntityResolutionStage {
    fn name(&self) -> &str {
        "entity_resolution"
    }

    fn execute<'a>(
        &'a self,
        ctx: &'a PipelineContext,
        input: StageInput,
    ) -> BoxFuture<'a, Result<StageOutput>> {
        Box::pin(async move {
            let start = Instant::now();
            let now = chrono::Utc::now().to_rfc3339();

            // Load contacts — either from input IDs or all contacts
            let contacts = match input {
                StageInput::ContactIds(ref ids) if !ids.is_empty() => {
                    let mut result = Vec::with_capacity(ids.len());
                    for id in ids {
                        if let Ok(rows) = sqlx::query_as::<_, crate::Contact>(
                            "SELECT * FROM contacts WHERE id = ?1",
                        )
                        .bind(id)
                        .fetch_all(&ctx.db)
                        .await
                        {
                            result.extend(rows);
                        }
                    }
                    result
                }
                _ => db::all_contacts(&ctx.db).await.unwrap_or_default(),
            };

            let input_count = contacts.len();
            if contacts.is_empty() {
                return Ok(StageOutput {
                    input_count: 0,
                    output_count: 0,
                    error_count: 0,
                    signals: vec![],
                    next_input: StageInput::Empty,
                    duration: start.elapsed(),
                });
            }

            let resolver = EntityResolver::new(ResolverConfig {
                match_threshold: self.config.match_threshold,
                resolution_threshold: self.config.resolution_threshold,
                blocking_key: self.config.blocking_key.clone(),
            });

            // Build resolution graph first so we can inspect its structure before
            // persisting clusters.
            let graph = resolver.build_graph(&contacts);
            let graph_node_count = graph.node_count();
            let graph_edge_count = graph.edge_count();

            // --- Graph partitioning -------------------------------------------
            // Build a simple adjacency list from the graph node indices so the
            // GraphPartitioner can find connected components.  We use contact
            // positions (0..n) as node identifiers, mirroring how the resolver
            // builds blocks internally.
            let n = contacts.len();
            let mut adjacency: Vec<Vec<usize>> = vec![vec![]; n];
            // Populate from the edge list: we re-use the blocking-key approach
            // (contacts within the same block share an edge if their composite
            // score exceeded the match threshold).  Here we approximate by
            // treating any two contacts whose IDs appear together in a cluster
            // edge as adjacent.  For the partitioner we only need connectivity,
            // not edge weights, so we derive it from graph_edge_count symmetry.
            //
            // Practical approach: re-run the same blocking logic used in the
            // resolver but only to collect (i, j) pairs that crossed the match
            // threshold — we do this by observing which pairs the resolver
            // already evaluated in `build_graph`.  Since `ResolutionGraph` does
            // not expose its edge list directly, we build the adjacency list from
            // the resolved clusters (connected components).
            let clusters = graph.resolve_clusters(self.config.resolution_threshold);

            // Map contact id → position index for adjacency construction.
            let id_to_idx: std::collections::HashMap<&str, usize> = contacts
                .iter()
                .enumerate()
                .map(|(i, c)| (c.id.as_str(), i))
                .collect();

            for cluster in &clusters {
                let member_indices: Vec<usize> = cluster
                    .member_ids
                    .iter()
                    .filter_map(|id| id_to_idx.get(id.as_str()).copied())
                    .collect();
                // Mark every pair within the cluster as adjacent.
                for i in 0..member_indices.len() {
                    for j in (i + 1)..member_indices.len() {
                        let a = member_indices[i];
                        let b = member_indices[j];
                        if !adjacency[a].contains(&b) {
                            adjacency[a].push(b);
                        }
                        if !adjacency[b].contains(&a) {
                            adjacency[b].push(a);
                        }
                    }
                }
            }

            let partitioner = GraphPartitioner::new(500);
            let partitions = partitioner.partition(&adjacency);
            let partitions_count = partitions.len();

            // --- Ensemble scorer — sample candidate pairs --------------------
            // Score every intra-cluster candidate pair with the ensemble scorer
            // and compute the mean score as a distribution signal.
            let scorer = EnsembleMatchScorer::new();
            let mut ensemble_scores: Vec<f64> = Vec::new();

            for cluster in &clusters {
                let member_contacts: Vec<&crate::Contact> = cluster
                    .member_ids
                    .iter()
                    .filter_map(|id| contacts.iter().find(|c| &c.id == id))
                    .collect();
                for i in 0..member_contacts.len() {
                    for j in (i + 1)..member_contacts.len() {
                        let features = EnsembleMatchScorer::extract_features(
                            member_contacts[i],
                            member_contacts[j],
                            None, // embeddings not available at this point
                        );
                        ensemble_scores.push(scorer.score(&features));
                    }
                }
            }

            let ensemble_avg_score = if ensemble_scores.is_empty() {
                0.0
            } else {
                ensemble_scores.iter().sum::<f64>() / ensemble_scores.len() as f64
            };

            // --- Persist entity links (mirrors resolve_and_persist) ----------
            let mut final_clusters = clusters;
            for cluster in &mut final_clusters {
                let indices: Vec<usize> = cluster
                    .member_ids
                    .iter()
                    .filter_map(|id| contacts.iter().position(|c| c.id == *id))
                    .collect();
                if !indices.is_empty() {
                    let primary_idx = crate::dedup::pick_primary(&contacts, &indices);
                    cluster.canonical_id = contacts[primary_idx].id.clone();
                }
            }

            for cluster in &final_clusters {
                for member_id in &cluster.member_ids {
                    if member_id != &cluster.canonical_id {
                        crate::entity_resolution::resolver::save_entity_link_pub(
                            &ctx.db,
                            &cluster.canonical_id,
                            member_id,
                            cluster.confidence,
                        )
                        .await?;
                    }
                }
            }

            let clusters = final_clusters;

            let total_duplicates: usize = clusters.iter().map(|c| c.member_ids.len() - 1).sum();
            let avg_confidence = if clusters.is_empty() {
                0.0
            } else {
                clusters.iter().map(|c| c.confidence).sum::<f64>() / clusters.len() as f64
            };

            let avg_cluster_size = if clusters.is_empty() {
                0.0
            } else {
                clusters.iter().map(|c| c.member_ids.len() as f64).sum::<f64>()
                    / clusters.len() as f64
            };

            let signals = vec![
                EvalSignal {
                    stage_name: "entity_resolution".into(),
                    metric_name: "clusters_found".into(),
                    value: clusters.len() as f64,
                    timestamp: now.clone(),
                },
                EvalSignal {
                    stage_name: "entity_resolution".into(),
                    metric_name: "duplicates_linked".into(),
                    value: total_duplicates as f64,
                    timestamp: now.clone(),
                },
                EvalSignal {
                    stage_name: "entity_resolution".into(),
                    metric_name: "avg_confidence".into(),
                    value: avg_confidence,
                    timestamp: now.clone(),
                },
                // Graph structure signals
                EvalSignal {
                    stage_name: "entity_resolution".into(),
                    metric_name: "graph_node_count".into(),
                    value: graph_node_count as f64,
                    timestamp: now.clone(),
                },
                EvalSignal {
                    stage_name: "entity_resolution".into(),
                    metric_name: "graph_edge_count".into(),
                    value: graph_edge_count as f64,
                    timestamp: now.clone(),
                },
                EvalSignal {
                    stage_name: "entity_resolution".into(),
                    metric_name: "avg_cluster_size".into(),
                    value: avg_cluster_size,
                    timestamp: now.clone(),
                },
                // Partitioning signal
                EvalSignal {
                    stage_name: "entity_resolution".into(),
                    metric_name: "partitions_count".into(),
                    value: partitions_count as f64,
                    timestamp: now.clone(),
                },
                // Ensemble scorer signal
                EvalSignal {
                    stage_name: "entity_resolution".into(),
                    metric_name: "ensemble_avg_score".into(),
                    value: ensemble_avg_score,
                    timestamp: now,
                },
            ];

            // Output canonical IDs only
            let canonical_ids: Vec<String> = clusters.iter().map(|c| c.canonical_id.clone()).collect();

            Ok(StageOutput {
                input_count,
                output_count: canonical_ids.len(),
                error_count: 0,
                signals,
                next_input: StageInput::ContactIds(canonical_ids),
                duration: start.elapsed(),
            })
        })
    }
}
