Based on my research, let me provide structured findings on entity resolution approaches relevant to the Scrapus pipeline module. I'll organize this based on the key areas you mentioned:

# Entity Resolution Research Findings for Scrapus Pipeline

## 1. Entity Resolution / Record Linkage Approaches

### Blocking Strategies
The Scrapus module implements a **two-stage hybrid approach** combining rule-based blocking with deep learning matching, which aligns with modern entity resolution best practices:

**Rule-Based Blocking (SQLite):**
- **Normalization techniques**: Stripping legal suffixes (Inc., LLC, Ltd., GmbH), lowercasing, whitespace collapsing
- **SQL-based candidate retrieval**: Using LIKE operators and exact matching on normalized names
- **Purpose**: Drastically reduces candidate pairs from O(n²) to manageable subsets

**Research Context:**
- **Papadakis et al. (2013)** proposed a blocking framework for entity resolution in highly heterogeneous information spaces, emphasizing redundancy reduction while maintaining effectiveness
- **Simonini et al. (2016)** introduced BLAST, a blocking technique that partitions records into blocks and limits comparisons to records co-occurring in blocks
- **Canopy clustering** (mentioned in your query) is an established blocking method that uses inexpensive similarity measures to create overlapping clusters

### Deep Matching (LanceDB + Siamese Networks)
The module uses **Siamese neural networks** for entity matching, which is a well-established approach:

**Siamese Network Architecture:**
- Twin networks sharing weights that learn similarity metrics
- Encodes entity profiles (name + location + industry keywords) into dense vector representations
- Uses cosine distance for similarity measurement (threshold: 0.05 ~ 0.95 similarity)

**Research Context:**
- Siamese networks have been widely used for entity matching since their adaptation from signature verification tasks
- The approach learns a similarity space where similar entities are closer together
- **Threshold tuning** (0.05 in your module) is critical and typically requires validation on labeled data

## 2. Graph-Based Entity Resolution

### Connected Components & Transitive Closure
The module's approach to entity resolution implicitly handles transitive relationships through the graph structure:

**Research Context:**
- **Zhang et al. (2018)** proposed "A Graph-Theoretic Fusion Framework for Unsupervised Entity Resolution" using ITER and CliqueRank algorithms
- Graph-based methods construct record graphs and estimate likelihood of records belonging to the same clique
- **Kirielle et al. (2023)** presented "Unsupervised Graph-Based Entity Resolution for Complex Entities" combining relationships between records with attribute similarities
- **ModER (2022)** uses graph-based unsupervised entity resolution with composite modularity optimization and locality-sensitive hashing

### SQLite as Graph Store Implementation
Your module's use of SQLite for graph storage is innovative and practical:

**Adjacency List Pattern:**
```sql
CREATE TABLE edges (
    source_type TEXT, source_id INTEGER,
    relation TEXT,
    target_type TEXT, target_id INTEGER
)
```

**Recursive CTEs for Graph Traversal:**
```sql
WITH RECURSIVE graph_path AS (...)
```

**Research Context:**
- **Scabora (2021)** studied "Storage and Navigation Operations on Graphs in Relational DBMS" showing SQLite can effectively handle graph operations
- The adjacency list pattern is a classic approach for representing graphs in relational databases
- Recursive CTEs enable efficient traversal of shallow-depth graphs (typically 2-3 hops)

## 3. Hybrid Approaches & Scalable ER

### Blocking + Deep Matching Hybrid
Your module's architecture follows established best practices:

1. **First stage**: Rule-based blocking (high recall, low precision)
2. **Second stage**: Deep learning matching (high precision)
3. **Fallback**: Create new entities when no matches found

**Research Context:**
- Hybrid approaches are standard in production ER systems
- The combination addresses the trade-off between computational efficiency and matching accuracy
- **Threshold-based approaches** (like your 0.05 cosine distance) are common but require careful tuning

### Scalability Considerations
- **Shallow depth** (≤2 hops) makes SQLite viable
- **Read-heavy workload** aligns with SQLite's strengths
- **Moderate scale** (10K-100K entities) is within SQLite's capabilities
- **WAL mode** enables concurrent reads with single writer

## 4. External Enrichment & Data Fusion

### DBpedia/Wikidata Integration
Your module's ~60% hit rate for mid-size+ companies aligns with research findings:

**Research Context:**
- **Papadakis et al. (2021)** chapter on "Leveraging External Knowledge" discusses incorporating external sources
- External enrichment improves entity resolution by providing additional attributes for matching
- Knowledge graphs (DBpedia, Wikidata) provide structured data that can resolve ambiguities

### Data Fusion Challenges
- Handling conflicting information from multiple sources
- Determining source reliability and freshness
- Merging complementary information while avoiding contradictions

## 5. Implementation-Specific Insights

### LanceDB for Vector Similarity Search
- **Approximate Nearest Neighbor (ANN)** search enables efficient similarity matching
- **Vector embeddings** capture semantic similarity beyond exact string matching
- **Cosine distance threshold** of 0.05 provides high precision (near-perfect as noted)

### SQLite Graph Schema Design
**Strengths of your design:**
1. **Polymorphic edges**: Single table handles company-person, company-company, company-product relationships
2. **JSON fields**: Flexible storage for funding info, external data, edge properties
3. **Full-text search**: FTS5 integration for efficient text search
4. **Denormalized facts**: Company_facts table optimized for LLM prompt building

**Performance optimizations:**
- Indexes on source/target columns
- Recursive CTEs for 2-hop traversal
- WAL mode for concurrent access

## 6. Research Gaps & Opportunities

### Current Limitations in Literature
1. **SQLite as primary graph store**: Limited research on production-scale implementations
2. **Hybrid SQLite+LanceDB architectures**: Novel approach not extensively covered
3. **Fully local, file-based systems**: Most research assumes distributed/cloud infrastructure

### Future Research Directions
1. **Adaptive threshold tuning**: Dynamic thresholds based on entity type/context
2. **Incremental entity resolution**: Continuous updating as new data arrives
3. **Explainable entity matching**: Understanding why matches were made/rejected
4. **Privacy-preserving ER**: Techniques for sensitive B2B data

## 7. Recommendations for Scrapus Pipeline

### Based on Research Findings:
1. **Consider canopy clustering** as an alternative/additional blocking method
2. **Implement active learning** for threshold tuning and model improvement
3. **Explore graph neural networks** for more sophisticated relationship-based matching
4. **Add provenance tracking** for external enrichment sources
5. **Consider incremental blocking** strategies for streaming data scenarios

### Performance Optimization:
1. **Batch processing** for LanceDB updates to maintain sync with SQLite
2. **Caching layer** for frequent entity lookups
3. **Parallel processing** of independent entity resolution tasks
4. **Compression techniques** for vector storage in LanceDB

## References

**Key Papers Identified:**

1. **Zhang et al. (2018)** [A Graph-Theoretic Fusion Framework for Unsupervised Entity Resolution](https://doi.org/10.1109/icde.2018.00070)
2. **Papadakis et al. (2013)** A Blocking Framework for Entity Resolution in Highly Heterogeneous Information Spaces
3. **Simonini et al. (2016)** [BLAST: A blocking approach for entity resolution in highly heterogeneous data](https://doi.org/10.14778/2994509.2994533)
4. **Kirielle et al. (2023)** [Unsupervised Graph-Based Entity Resolution for Complex Entities](https://doi.org/10.1145/3533016)
5. **Scabora (2021)** [Storage and Navigation Operations on Graphs in Relational DBMS](https://doi.org/10.11606/t.55.2021.tde-26052021-125443)
6. **ModER (2022)** [Graph-based Unsupervised Entity Resolution using Composite Modularity Optimization](https://doi.org/10.14569/ijacsa.2022.0130901)
7. **Papadakis et al. (2021)** [Leveraging External Knowledge](https://doi.org/10.1007/978-3-031-01878-7_7)

**Additional Relevant Work:**
8. **Köpcke & Rahm (2009)** Frameworks for entity matching: A comparison
9. **Christen & Gayler (2008)** Towards scalable real-time entity resolution
10. **Azzalini et al. (2020)** [Blocking Techniques for Entity Linkage: A Semantics-Based Approach](https://doi.org/10.1007/s41019-020-00146-w)

The Scrapus module's architecture represents a pragmatic, production-ready implementation that incorporates established research principles while making innovative use of SQLite as a graph store. The hybrid approach of rule-based blocking followed by deep learning matching, combined with external knowledge enrichment, provides a robust foundation for B2B entity resolution at moderate scales.