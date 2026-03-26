Based on the literature research, I'll now provide evidence-based implementation best practices for your Scrapus entity resolution pipeline.

# Module 3: Entity Resolution & Graph Store - Implementation Best Practices

Based on literature research, here are evidence-based best practices for your Scrapus pipeline:

## 1. Blocking Function Design

### Multi-Stage Blocking Strategy
Research shows that effective entity resolution requires multi-stage blocking to balance recall and computational efficiency **Vatsalan et al. (2012)** [A taxonomy of privacy-preserving record linkage techniques](https://doi.org/10.1016/j.is.2012.11.005). Implement a hierarchical approach:

```python
def hierarchical_blocking(entity, db_connection):
    """Three-stage blocking strategy"""
    # Stage 1: Exact normalization blocking
    candidates = exact_normalization_block(entity, db_connection)
    if candidates:
        return candidates
    
    # Stage 2: Phonetic blocking (Soundex, Metaphone)
    candidates = phonetic_blocking(entity, db_connection)
    if candidates:
        return candidates
    
    # Stage 3: TF-IDF based blocking for partial matches
    return tfidf_blocking(entity, db_connection)
```

### Sorted Neighborhood Method
**Kejriwal (2021)** [Unsupervised DNF Blocking for Efficient Linking of Knowledge Graphs and Tables](https://doi.org/10.3390/info12030134) recommends sorted neighborhood for moderate-sized datasets:

```python
def sorted_neighborhood_blocking(entities, window_size=5):
    """Sorted neighborhood blocking implementation"""
    # 1. Create blocking keys
    blocking_keys = []
    for entity in entities:
        key = create_blocking_key(entity)
        blocking_keys.append((key, entity))
    
    # 2. Sort by blocking key
    blocking_keys.sort(key=lambda x: x[0])
    
    # 3. Compare within sliding window
    candidates = []
    for i in range(len(blocking_keys)):
        for j in range(i+1, min(i+window_size+1, len(blocking_keys))):
            candidates.append((blocking_keys[i][1], blocking_keys[j][1]))
    
    return candidates
```

### Locality Sensitive Hashing (LSH)
For large-scale datasets, implement LSH-based blocking:

```python
import hashlib
from datasketch import MinHash, MinHashLSH

def lsh_blocking(entities, num_perm=128, threshold=0.5):
    """LSH blocking for scalable entity resolution"""
    lsh = MinHashLSH(threshold=threshold, num_perm=num_perm)
    
    # Create MinHash signatures
    for idx, entity in enumerate(entities):
        m = MinHash(num_perm=num_perm)
        for token in entity_tokens(entity):
            m.update(token.encode('utf8'))
        lsh.insert(f"entity_{idx}", m)
    
    # Query for similar entities
    candidates = []
    for idx, entity in enumerate(entities):
        m = MinHash(num_perm=num_perm)
        for token in entity_tokens(entity):
            m.update(token.encode('utf8'))
        similar = lsh.query(m)
        candidates.extend([(idx, int(s.split('_')[1])) for s in similar])
    
    return candidates
```

## 2. Siamese Network Training

### Contrastive vs Triplet Loss Selection
Research indicates that contrastive loss works better for binary classification tasks, while triplet loss excels at learning relative distances **Adjabi et al. (2020)** [Past, Present, and Future of Face Recognition: A Review](https://doi.org/10.3390/electronics9081188). For entity resolution:

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class ContrastiveLoss(nn.Module):
    """Contrastive loss for binary matching"""
    def __init__(self, margin=1.0):
        super().__init__()
        self.margin = margin
    
    def forward(self, output1, output2, label):
        euclidean_distance = F.pairwise_distance(output1, output2)
        loss_contrastive = torch.mean(
            (1-label) * torch.pow(euclidean_distance, 2) +
            label * torch.pow(torch.clamp(self.margin - euclidean_distance, min=0.0), 2)
        )
        return loss_contrastive

class TripletLoss(nn.Module):
    """Triplet loss for relative distance learning"""
    def __init__(self, margin=1.0):
        super().__init__()
        self.margin = margin
    
    def forward(self, anchor, positive, negative):
        distance_positive = F.pairwise_distance(anchor, positive)
        distance_negative = F.pairwise_distance(anchor, negative)
        losses = F.relu(distance_positive - distance_negative + self.margin)
        return losses.mean()
```

### Hard Negative Mining Strategy
Implement online hard negative mining as recommended by recent literature:

```python
def hard_negative_mining(batch_embeddings, labels, margin=0.5):
    """Online hard negative mining for triplet loss"""
    batch_size = len(batch_embeddings)
    hardest_negatives = []
    
    for i in range(batch_size):
        anchor = batch_embeddings[i]
        positive_indices = [j for j in range(batch_size) 
                          if labels[i] == labels[j] and i != j]
        negative_indices = [j for j in range(batch_size) 
                          if labels[i] != labels[j]]
        
        if not positive_indices or not negative_indices:
            continue
        
        # Find hardest positive (furthest matching)
        hardest_positive = max(positive_indices, 
                             key=lambda j: torch.dist(anchor, batch_embeddings[j]))
        
        # Find hardest negative (closest non-matching)
        hardest_negative = min(negative_indices,
                             key=lambda j: torch.dist(anchor, batch_embeddings[j]))
        
        # Check if it's a valid hard negative
        pos_dist = torch.dist(anchor, batch_embeddings[hardest_positive])
        neg_dist = torch.dist(anchor, batch_embeddings[hardest_negative])
        
        if neg_dist < pos_dist + margin:
            hardest_negatives.append((i, hardest_positive, hardest_negative))
    
    return hardest_negatives
```

### Siamese Network Architecture
```python
class SiameseEntityMatcher(nn.Module):
    """Siamese network for entity matching"""
    def __init__(self, embedding_dim=128, hidden_dim=256):
        super().__init__()
        # Shared encoder
        self.encoder = nn.Sequential(
            nn.Linear(embedding_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, 128)  # Final embedding
        )
        
        # Similarity head
        self.similarity = nn.Sequential(
            nn.Linear(256, 128),  # Concatenated embeddings
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )
    
    def forward_once(self, x):
        return self.encoder(x)
    
    def forward(self, input1, input2):
        output1 = self.forward_once(input1)
        output2 = self.forward_once(input2)
        
        # Concatenate for similarity scoring
        combined = torch.cat((output1, output2), dim=1)
        similarity_score = self.similarity(combined)
        
        return output1, output2, similarity_score
```

## 3. SQLite Graph Schema Optimization

### Enhanced Adjacency Tables
Based on **Simonini et al. (2018)** [Schema-Agnostic Progressive Entity Resolution](https://doi.org/10.1109/icde.2018.00015), implement optimized adjacency tables:

```sql
-- Enhanced edges table with materialized paths
CREATE TABLE edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL CHECK(source_type IN ('company', 'person', 'product')),
    source_id INTEGER NOT NULL,
    relation TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK(target_type IN ('company', 'person', 'product')),
    target_id INTEGER NOT NULL,
    properties TEXT,  -- JSON for extra attributes
    source_url TEXT,
    confidence REAL DEFAULT 1.0,
    created_at REAL,
    
    -- Materialized path for 2-hop queries
    path_hash TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN source_type = 'company' AND target_type = 'company' 
            THEN hex(substr(md5(source_type || source_id || relation || target_type || target_id), 1, 16))
            ELSE NULL
        END
    ) STORED,
    
    -- Composite indexes for common traversal patterns
    UNIQUE(source_type, source_id, relation, target_type, target_id)
);

-- Materialized view for company relationships
CREATE VIEW company_relationships AS
SELECT 
    c1.name AS source_company,
    c2.name AS target_company,
    e.relation,
    json_extract(e.properties, '$.date') AS relation_date,
    e.confidence
FROM edges e
JOIN companies c1 ON e.source_id = c1.id AND e.source_type = 'company'
JOIN companies c2 ON e.target_id = c2.id AND e.target_type = 'company'
WHERE e.source_type = 'company' AND e.target_type = 'company';

-- Index optimization
CREATE INDEX idx_edges_composite ON edges(source_type, source_id, relation);
CREATE INDEX idx_edges_reverse ON edges(target_type, target_id, relation);
CREATE INDEX idx_edges_path ON edges(path_hash) WHERE path_hash IS NOT NULL;
```

### Recursive CTE for Transitive Closure
Implement efficient graph traversal using recursive CTEs:

```sql
-- Materialized transitive closure for common relationships
CREATE TABLE transitive_closure (
    source_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    distance INTEGER NOT NULL,
    path TEXT,  -- JSON array of intermediate nodes
    PRIMARY KEY (source_id, target_id)
);

-- Recursive CTE for on-demand transitive closure
WITH RECURSIVE company_graph AS (
    -- Base case: direct relationships
    SELECT 
        source_id, 
        target_id, 
        1 as distance,
        json_array(source_id, target_id) as path
    FROM edges 
    WHERE source_type = 'company' AND target_type = 'company'
        AND relation IN ('acquired', 'partner', 'invested_in')
    
    UNION ALL
    
    -- Recursive case: follow relationships
    SELECT 
        cg.source_id,
        e.target_id,
        cg.distance + 1,
        json_insert(cg.path, '$[#]', e.target_id)
    FROM company_graph cg
    JOIN edges e ON cg.target_id = e.source_id
        AND e.source_type = 'company' 
        AND e.target_type = 'company'
        AND e.relation IN ('acquired', 'partner', 'invested_in')
    WHERE cg.distance < 3  -- Limit depth for performance
        AND NOT EXISTS (
            SELECT 1 FROM json_each(cg.path) 
            WHERE value = e.target_id
        )  -- Avoid cycles
)
SELECT * FROM company_graph WHERE distance <= 2;
```

### Incremental Graph Updates
```python
def incremental_graph_update(new_edges, db_connection):
    """Incremental update of transitive closure"""
    with db_connection:
        # Insert new edges
        cursor = db_connection.cursor()
        for edge in new_edges:
            cursor.execute("""
                INSERT OR IGNORE INTO edges 
                (source_type, source_id, relation, target_type, target_id, properties, source_url)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, edge)
        
        # Update transitive closure incrementally
        cursor.execute("""
            INSERT OR REPLACE INTO transitive_closure
            WITH RECURSIVE new_paths AS (
                SELECT source_id, target_id, 1 as distance, 
                       json_array(source_id, target_id) as path
                FROM edges 
                WHERE rowid IN (SELECT last_insert_rowid() FROM edges)
                
                UNION ALL
                
                SELECT np.source_id, e.target_id, np.distance + 1,
                       json_insert(np.path, '$[#]', e.target_id)
                FROM new_paths np
                JOIN edges e ON np.target_id = e.source_id
                WHERE np.distance < 3
                    AND NOT EXISTS (
                        SELECT 1 FROM json_each(np.path) WHERE value = e.target_id
                    )
            )
            SELECT * FROM new_paths
            ON CONFLICT(source_id, target_id) 
            DO UPDATE SET 
                distance = CASE WHEN excluded.distance < transitive_closure.distance 
                               THEN excluded.distance 
                               ELSE transitive_closure.distance END,
                path = excluded.path;
        """)
```

## 4. Threshold Selection & Cost-Sensitive Tuning

### Precision-Recall Curve Analysis
Implement dynamic threshold selection based on validation data:

```python
import numpy as np
from sklearn.metrics import precision_recall_curve, f1_score

class AdaptiveThresholdSelector:
    """Adaptive threshold selection based on precision-recall tradeoff"""
    
    def __init__(self, target_precision=0.95, min_recall=0.8):
        self.target_precision = target_precision
        self.min_recall = min_recall
        self.threshold_history = []
    
    def find_optimal_threshold(self, similarities, labels):
        """Find optimal threshold using precision-recall analysis"""
        precisions, recalls, thresholds = precision_recall_curve(labels, similarities)
        
        # Find thresholds that meet precision target
        valid_indices = np.where(precisions[:-1] >= self.target_precision)[0]
        
        if len(valid_indices) > 0:
            # Among valid thresholds, maximize recall
            best_idx = valid_indices[np.argmax(recalls[valid_indices])]
            optimal_threshold = thresholds[best_idx]
            
            # Calculate F1 score for validation
            predictions = (similarities >= optimal_threshold).astype(int)
            f1 = f1_score(labels, predictions)
            
            # Store history for adaptive learning
            self.threshold_history.append({
                'threshold': optimal_threshold,
                'precision': precisions[best_idx],
                'recall': recalls[best_idx],
                'f1': f1
            })
            
            return optimal_threshold, f1
        
        # Fallback to maximize F1 score
        f1_scores = 2 * (precisions[:-1] * recalls[:-1]) / (precisions[:-1] + recalls[:-1] + 1e-8)
        best_idx = np.argmax(f1_scores)
        return thresholds[best_idx], f1_scores[best_idx]
    
    def get_adaptive_threshold(self):
        """Get adaptive threshold based on historical performance"""
        if not self.threshold_history:
            return 0.05  # Default threshold
        
        # Weight recent thresholds more heavily
        weights = np.exp(np.arange(len(self.threshold_history)) * 0.5)
        weights = weights / weights.sum()
        
        thresholds = [h['threshold'] for h in self.threshold_history]
        return np.average(thresholds, weights=weights)
```

### Cost-Sensitive Threshold Tuning
```python
class CostSensitiveThreshold:
    """Cost-sensitive threshold tuning for entity resolution"""
    
    def __init__(self, false_positive_cost=1.0, false_negative_cost=5.0):
        """
        Args:
            false_positive_cost: Cost of merging different entities
            false_negative_cost: Cost of missing a true match
        """
        self.fp_cost = false_positive_cost
        self.fn_cost = false_negative_cost
    
    def optimize_threshold(self, similarities, labels, candidate_thresholds):
        """Find threshold that minimizes total cost"""
        min_cost = float('inf')
        optimal_threshold = 0.05
        
        for threshold in candidate_thresholds:
            predictions = (similarities >= threshold).astype(int)
            
            # Calculate confusion matrix
            tp = np.sum((predictions == 1) & (labels == 1))
            fp = np.sum((predictions == 1) & (labels == 0))
            fn = np.sum((predictions == 0) & (labels == 1))
            
            # Calculate total cost
            total_cost = (fp * self.fp_cost) + (fn * self.fn_cost)
            
            if total_cost < min_cost:
                min_cost = total_cost
                optimal_threshold = threshold
        
        return optimal_threshold, min_cost
    
    def dynamic_threshold_adjustment(self, recent_performance):
        """Adjust threshold based on recent performance"""
        # Calculate error rates
        fp_rate = recent_performance.get('false_positives', 0) / max(recent_performance.get('total', 1), 1)
        fn_rate = recent_performance.get('false_negatives', 0) / max(recent_performance.get('total', 1), 1)
        
        # Adjust threshold based on error balance
        if fp_rate > 0.1 and fn_rate < 0.05:
            # Too many false positives, increase threshold
            adjustment = min(0.1, fp_rate * 0.5)
            return 0.05 + adjustment
        elif fn_rate > 0.1 and fp_rate < 0.05:
            # Too many false negatives, decrease threshold
            adjustment = min(0.05, fn_rate * 0.3)
            return max(0.01, 0.05 - adjustment)
        
        return 0.05  # Default threshold
```

## 5. Incremental Entity Resolution

### Streaming ER Architecture
Based on **Hofer et al. (2024)** [Construction of Knowledge Graphs: Current State and Challenges](https://doi.org/10.3390/info15080509), implement incremental ER:

```python
class IncrementalEntityResolver:
    """Incremental entity resolution for streaming data"""
    
    def __init__(self, db_connection, lancedb_connection):
        self.db = db_connection
        self.lancedb = lancedb_connection
        self.candidate_cache = {}  # Cache for recent matches
        self.blocking_index = self.build_blocking_index()
    
    def build_blocking_index(self):
        """Build blocking index from existing entities"""
        cursor = self.db.cursor()
        cursor.execute