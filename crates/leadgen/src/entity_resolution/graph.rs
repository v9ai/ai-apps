use petgraph::graph::{NodeIndex, UnGraph};
use petgraph::unionfind::UnionFind;
use std::collections::HashMap;

use super::signals::{self, MatchSignal};

/// A node in the entity resolution graph.
#[derive(Debug, Clone)]
pub struct EntityNode {
    pub contact_id: String,
    pub contact_index: usize,
}

/// An edge represents a potential match with its signals.
#[derive(Debug, Clone)]
pub struct MatchEdge {
    pub signals: Vec<MatchSignal>,
    pub composite_score: f64,
}

/// A resolved cluster of duplicate contact IDs with a chosen canonical ID.
#[derive(Debug, Clone)]
pub struct ResolvedCluster {
    pub canonical_id: String,
    pub member_ids: Vec<String>,
    pub confidence: f64,
}

/// The resolution graph: contacts are nodes, potential matches are edges.
pub struct ResolutionGraph {
    graph: UnGraph<EntityNode, MatchEdge>,
    id_to_node: HashMap<String, NodeIndex>,
}

impl ResolutionGraph {
    pub fn new() -> Self {
        Self {
            graph: UnGraph::new_undirected(),
            id_to_node: HashMap::new(),
        }
    }

    /// Add a contact as a node. Returns the node index.
    pub fn add_contact(&mut self, contact_id: &str, index: usize) -> NodeIndex {
        if let Some(&idx) = self.id_to_node.get(contact_id) {
            return idx;
        }
        let node = EntityNode {
            contact_id: contact_id.to_string(),
            contact_index: index,
        };
        let idx = self.graph.add_node(node);
        self.id_to_node.insert(contact_id.to_string(), idx);
        idx
    }

    /// Add a match edge between two contacts.
    pub fn add_match(&mut self, id_a: &str, id_b: &str, sigs: Vec<MatchSignal>) {
        let composite = signals::composite_match_score(&sigs);
        if let (Some(&na), Some(&nb)) = (self.id_to_node.get(id_a), self.id_to_node.get(id_b)) {
            self.graph.add_edge(
                na,
                nb,
                MatchEdge {
                    signals: sigs,
                    composite_score: composite,
                },
            );
        }
    }

    /// Compute transitive closure using union-find over edges above threshold.
    pub fn resolve_clusters(&self, threshold: f64) -> Vec<ResolvedCluster> {
        let node_count = self.graph.node_count();
        if node_count == 0 {
            return Vec::new();
        }

        let mut uf = UnionFind::<u32>::new(node_count);

        for edge in self.graph.edge_indices() {
            let (a, b) = self.graph.edge_endpoints(edge).unwrap();
            let weight = &self.graph[edge];
            if weight.composite_score >= threshold {
                uf.union(a.index() as u32, b.index() as u32);
            }
        }

        // Group nodes by their root
        let mut groups: HashMap<u32, Vec<NodeIndex>> = HashMap::new();
        for idx in self.graph.node_indices() {
            let root = uf.find(idx.index() as u32);
            groups.entry(root).or_default().push(idx);
        }

        groups
            .into_values()
            .filter(|g| g.len() > 1)
            .map(|group| {
                let member_ids: Vec<String> = group
                    .iter()
                    .map(|&idx| self.graph[idx].contact_id.clone())
                    .collect();
                // Average edge confidence within cluster
                let mut total_conf = 0.0;
                let mut edge_count = 0u32;
                for i in 0..group.len() {
                    for j in (i + 1)..group.len() {
                        if let Some(edge) = self.graph.find_edge(group[i], group[j]) {
                            total_conf += self.graph[edge].composite_score;
                            edge_count += 1;
                        }
                    }
                }
                let confidence = if edge_count > 0 {
                    total_conf / edge_count as f64
                } else {
                    0.0
                };
                ResolvedCluster {
                    canonical_id: member_ids[0].clone(),
                    member_ids,
                    confidence,
                }
            })
            .collect()
    }

    pub fn node_count(&self) -> usize {
        self.graph.node_count()
    }

    pub fn edge_count(&self) -> usize {
        self.graph.edge_count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entity_resolution::signals::{MatchSignal, SignalType};

    fn signal(score: f64) -> Vec<MatchSignal> {
        vec![MatchSignal {
            signal_type: SignalType::ExactEmail,
            score,
            weight: 1.0,
        }]
    }

    #[test]
    fn transitive_closure_merges_three_nodes() {
        let mut g = ResolutionGraph::new();
        g.add_contact("a", 0);
        g.add_contact("b", 1);
        g.add_contact("c", 2);
        g.add_match("a", "b", signal(0.9));
        g.add_match("b", "c", signal(0.9));
        // a-b and b-c connected => transitive closure: {a, b, c}

        let clusters = g.resolve_clusters(0.7);
        assert_eq!(clusters.len(), 1);
        assert_eq!(clusters[0].member_ids.len(), 3);
    }

    #[test]
    fn below_threshold_no_merge() {
        let mut g = ResolutionGraph::new();
        g.add_contact("a", 0);
        g.add_contact("b", 1);
        g.add_match("a", "b", signal(0.3));

        let clusters = g.resolve_clusters(0.7);
        assert!(clusters.is_empty());
    }

    #[test]
    fn two_separate_clusters() {
        let mut g = ResolutionGraph::new();
        g.add_contact("a", 0);
        g.add_contact("b", 1);
        g.add_contact("c", 2);
        g.add_contact("d", 3);
        g.add_match("a", "b", signal(0.9));
        g.add_match("c", "d", signal(0.9));

        let clusters = g.resolve_clusters(0.7);
        assert_eq!(clusters.len(), 2);
    }
}
