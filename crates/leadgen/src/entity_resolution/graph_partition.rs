/// Scalable graph partitioning for entity resolution.
///
/// Reference: Tarjan (1972), "Depth-First Search and Linear Graph Algorithms",
/// SIAM Journal on Computing.  Grounded in agent-03-graph-neural-network-er
/// research on scalable GNN-based entity resolution.
///
/// # Motivation
///
/// Na-ve O(n²) pairwise comparison across all contacts blows up as the contact
/// database grows.  Graph partitioning allows the full pipeline to be split into
/// independent sub-problems that can be processed in parallel:
///
///   1. Build a similarity graph (nodes = contacts, edges = candidate matches).
///   2. Find *connected components* — contacts in different components cannot
///      be the same entity.
///   3. Split components that exceed `max_partition_size` into balanced halves
///      using a degree-based bisection heuristic.
///   4. Process each partition independently.
///
/// # Algorithm
///
/// Connected components are found using iterative DFS (Tarjan-style) to avoid
/// stack overflow on large graphs.  Size-bounded splitting uses a degree-sorted
/// bisection: nodes are sorted by degree (descending) and split at the median.
/// This is a practical approximation of spectral bisection with O(n log n)
/// complexity versus O(n²) for exact spectral methods.

// ---------------------------------------------------------------------------
// Partition
// ---------------------------------------------------------------------------

/// A partition of the entity resolution graph.
#[derive(Debug, Clone)]
pub struct Partition {
    /// Node indices (into the original adjacency list) belonging to this
    /// partition.
    pub node_indices: Vec<usize>,
    /// Number of edges whose both endpoints lie within this partition.
    pub internal_edges: usize,
    /// Number of edges that cross the boundary to other partitions.
    /// After connected-component decomposition this is always 0 unless a
    /// large component was bisected.
    pub boundary_edges: usize,
}

impl Partition {
    /// Number of nodes in this partition.
    pub fn size(&self) -> usize {
        self.node_indices.len()
    }
}

// ---------------------------------------------------------------------------
// GraphPartitioner
// ---------------------------------------------------------------------------

/// Graph partitioner for large entity resolution contact graphs.
///
/// # Example
///
/// ```rust,ignore
/// // Build an adjacency list: node 0 — node 1, node 2 is isolated.
/// let adj = vec![vec![1], vec![0], vec![]];
/// let partitioner = GraphPartitioner::new(100);
/// let partitions = partitioner.partition(&adj);
/// assert_eq!(partitions.len(), 2); // {0,1} and {2}
/// ```
pub struct GraphPartitioner {
    /// Maximum number of nodes allowed in a single partition before it is
    /// split.
    max_partition_size: usize,
}

impl GraphPartitioner {
    /// Create a partitioner with the given maximum partition size.
    pub fn new(max_partition_size: usize) -> Self {
        Self { max_partition_size }
    }

    /// Find connected components of the graph using iterative DFS.
    ///
    /// `adjacency` is an adjacency list where `adjacency[i]` contains the
    /// indices of all neighbours of node `i`.
    ///
    /// Returns a `Vec` of components, each component being a sorted `Vec` of
    /// node indices.  Isolated nodes (no edges) are returned as single-element
    /// components.
    pub fn connected_components(&self, adjacency: &[Vec<usize>]) -> Vec<Vec<usize>> {
        let n = adjacency.len();
        if n == 0 {
            return Vec::new();
        }

        let mut visited = vec![false; n];
        let mut components: Vec<Vec<usize>> = Vec::new();

        for start in 0..n {
            if visited[start] {
                continue;
            }

            // Iterative DFS to avoid stack overflow on large graphs.
            let mut component: Vec<usize> = Vec::new();
            let mut stack: Vec<usize> = vec![start];

            while let Some(node) = stack.pop() {
                if visited[node] {
                    continue;
                }
                visited[node] = true;
                component.push(node);

                for &neighbour in &adjacency[node] {
                    if !visited[neighbour] {
                        stack.push(neighbour);
                    }
                }
            }

            component.sort_unstable();
            components.push(component);
        }

        components
    }

    /// Split components that exceed `max_partition_size` using degree-based
    /// bisection.
    ///
    /// For each component whose size exceeds `max_partition_size`, nodes are
    /// sorted by degree (descending — high-degree nodes are likely hubs and
    /// are split first).  The sorted list is bisected at the midpoint to
    /// produce two balanced halves.  The procedure recurses until all partitions
    /// satisfy the size constraint.
    pub fn split_large_components(
        &self,
        adjacency: &[Vec<usize>],
        components: Vec<Vec<usize>>,
    ) -> Vec<Vec<usize>> {
        let mut result: Vec<Vec<usize>> = Vec::new();

        for component in components {
            self.split_recursive(adjacency, component, &mut result);
        }

        result
    }

    /// Full partitioning pipeline.
    ///
    /// 1. Find connected components via DFS.
    /// 2. Split large components into size-bounded halves.
    /// 3. Compute internal/boundary edge counts for each partition.
    /// 4. Return the `Vec<Partition>`.
    pub fn partition(&self, adjacency: &[Vec<usize>]) -> Vec<Partition> {
        let components = self.connected_components(adjacency);
        let split = self.split_large_components(adjacency, components);
        self.build_partitions(adjacency, split)
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /// Recursively split a component until it fits within `max_partition_size`.
    fn split_recursive(
        &self,
        adjacency: &[Vec<usize>],
        mut component: Vec<usize>,
        result: &mut Vec<Vec<usize>>,
    ) {
        if component.len() <= self.max_partition_size {
            result.push(component);
            return;
        }

        // Sort by degree descending: high-degree nodes are hubs; bisecting on
        // degree produces more balanced partitions than arbitrary ordering.
        component.sort_unstable_by(|&a, &b| {
            adjacency[b]
                .len()
                .cmp(&adjacency[a].len())
                .then_with(|| a.cmp(&b)) // tie-break for determinism
        });

        let mid = component.len() / 2;
        let right = component.split_off(mid);
        let left = component;

        // Re-sort by index for stable downstream processing.
        let mut left_sorted = left;
        left_sorted.sort_unstable();
        let mut right_sorted = right;
        right_sorted.sort_unstable();

        self.split_recursive(adjacency, left_sorted, result);
        self.split_recursive(adjacency, right_sorted, result);
    }

    /// Given a list of node-index groups, compute internal and boundary edge
    /// counts and wrap each group into a [`Partition`].
    fn build_partitions(
        &self,
        adjacency: &[Vec<usize>],
        groups: Vec<Vec<usize>>,
    ) -> Vec<Partition> {
        // Build a lookup: node_index → partition_index.
        let total_nodes: usize = adjacency.len();
        let mut node_to_partition = vec![usize::MAX; total_nodes];
        for (pid, group) in groups.iter().enumerate() {
            for &node in group {
                if node < total_nodes {
                    node_to_partition[node] = pid;
                }
            }
        }

        groups
            .into_iter()
            .enumerate()
            .map(|(pid, nodes)| {
                let mut internal = 0usize;
                let mut boundary = 0usize;

                for &node in &nodes {
                    if node >= adjacency.len() {
                        continue;
                    }
                    for &neighbour in &adjacency[node] {
                        if neighbour >= total_nodes {
                            continue;
                        }
                        if node_to_partition[neighbour] == pid {
                            // Each undirected edge is counted from both endpoints;
                            // divide by 2 at the end.
                            internal += 1;
                        } else {
                            boundary += 1;
                        }
                    }
                }

                Partition {
                    node_indices: nodes,
                    internal_edges: internal / 2, // undirected: each edge seen twice
                    boundary_edges: boundary,
                }
            })
            .collect()
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // Helper: build undirected adjacency list from edge pairs.
    fn adj_from_edges(n: usize, edges: &[(usize, usize)]) -> Vec<Vec<usize>> {
        let mut adj = vec![vec![]; n];
        for &(a, b) in edges {
            adj[a].push(b);
            adj[b].push(a);
        }
        adj
    }

    // -----------------------------------------------------------------------
    // connected_components tests
    // -----------------------------------------------------------------------

    /// A fully connected graph should be a single component.
    #[test]
    fn single_component_stays_together() {
        let adj = adj_from_edges(4, &[(0, 1), (1, 2), (2, 3)]);
        let gp = GraphPartitioner::new(100);
        let comps = gp.connected_components(&adj);
        assert_eq!(comps.len(), 1, "linear chain should be one component");
        assert_eq!(comps[0].len(), 4);
    }

    /// Disconnected nodes must land in separate components.
    #[test]
    fn disconnected_components_are_separated() {
        // Two disjoint edges: 0-1 and 2-3.
        let adj = adj_from_edges(4, &[(0, 1), (2, 3)]);
        let gp = GraphPartitioner::new(100);
        let comps = gp.connected_components(&adj);
        assert_eq!(comps.len(), 2, "two disconnected pairs must yield 2 components");
        // Each component has exactly 2 nodes.
        for c in &comps {
            assert_eq!(c.len(), 2);
        }
    }

    /// An empty graph (no nodes) returns no components.
    #[test]
    fn empty_graph_returns_empty() {
        let gp = GraphPartitioner::new(10);
        let comps = gp.connected_components(&[]);
        assert!(comps.is_empty(), "empty graph should produce no components");
    }

    /// A single isolated node must become a one-element component.
    #[test]
    fn single_node_is_one_partition() {
        let adj = vec![vec![]]; // node 0 with no edges
        let gp = GraphPartitioner::new(10);
        let partitions = gp.partition(&adj);
        assert_eq!(partitions.len(), 1);
        assert_eq!(partitions[0].size(), 1);
    }

    /// A mix of connected and isolated nodes.
    #[test]
    fn mixed_graph_components_count() {
        // Nodes 0-1-2 connected; node 3 isolated; nodes 4-5 connected.
        let adj = adj_from_edges(6, &[(0, 1), (1, 2), (4, 5)]);
        let gp = GraphPartitioner::new(100);
        let comps = gp.connected_components(&adj);
        assert_eq!(comps.len(), 3, "expected 3 components, got {}", comps.len());
    }

    // -----------------------------------------------------------------------
    // split_large_components tests
    // -----------------------------------------------------------------------

    /// A component larger than `max_partition_size` must be split.
    #[test]
    fn large_component_gets_split() {
        // Star graph: node 0 connects to nodes 1..=9 (10 nodes total).
        let adj = adj_from_edges(10, &[
            (0, 1), (0, 2), (0, 3), (0, 4), (0, 5),
            (0, 6), (0, 7), (0, 8), (0, 9),
        ]);
        let gp = GraphPartitioner::new(5); // max 5 nodes per partition
        let comps = gp.connected_components(&adj);
        assert_eq!(comps.len(), 1, "star is a single component");
        let split = gp.split_large_components(&adj, comps);
        assert!(
            split.len() >= 2,
            "10-node component with max=5 must be split into >=2 parts"
        );
        for part in &split {
            assert!(
                part.len() <= 5,
                "each part must have <= 5 nodes, got {}",
                part.len()
            );
        }
    }

    /// A component exactly at the size limit must not be split.
    #[test]
    fn component_at_limit_not_split() {
        let adj = adj_from_edges(5, &[(0, 1), (1, 2), (2, 3), (3, 4)]);
        let gp = GraphPartitioner::new(5);
        let comps = gp.connected_components(&adj);
        let split = gp.split_large_components(&adj, comps);
        assert_eq!(split.len(), 1, "component at exact limit should not be split");
    }

    // -----------------------------------------------------------------------
    // partition tests
    // -----------------------------------------------------------------------

    /// All node indices must appear in exactly one partition.
    #[test]
    fn partition_covers_all_nodes_exactly_once() {
        let adj = adj_from_edges(8, &[(0, 1), (1, 2), (3, 4), (5, 6), (6, 7)]);
        let gp = GraphPartitioner::new(10);
        let partitions = gp.partition(&adj);

        let mut seen = vec![0u32; 8];
        for p in &partitions {
            for &node in &p.node_indices {
                seen[node] += 1;
            }
        }
        for (node, &count) in seen.iter().enumerate() {
            assert_eq!(count, 1, "node {node} appears in {count} partitions (expected 1)");
        }
    }

    /// Internal edge count is consistent with the adjacency structure.
    ///
    /// For a pair of nodes connected by a single edge in the same partition,
    /// internal_edges should be 1.
    #[test]
    fn internal_edge_count_is_correct() {
        // Two isolated edges: 0-1 and 2-3.
        let adj = adj_from_edges(4, &[(0, 1), (2, 3)]);
        let gp = GraphPartitioner::new(100);
        let partitions = gp.partition(&adj);
        // Two connected components => two partitions, each with 1 internal edge.
        assert_eq!(partitions.len(), 2);
        for p in &partitions {
            assert_eq!(
                p.internal_edges, 1,
                "each pair should have exactly 1 internal edge, got {}",
                p.internal_edges
            );
            assert_eq!(
                p.boundary_edges, 0,
                "no boundary edges after connected-component split"
            );
        }
    }
}
