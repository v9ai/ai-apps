# Module 3: Entity Resolution -- Implementation Guide

> Consolidated from agent-04-entity-resolution-research and agent-11-entity-resolution-impl.

---

## 1. Blocking Function Design

### Multi-Stage Blocking Strategy

Effective entity resolution requires multi-stage blocking to balance recall and
computational efficiency (Vatsalan et al., 2012).

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

For moderate-sized datasets (Kejriwal, 2021), sorted neighborhood reduces
pairwise comparisons to a sliding window over sorted blocking keys:

```python
def sorted_neighborhood_blocking(entities, window_size=5):
    blocking_keys = [(create_blocking_key(e), e) for e in entities]
    blocking_keys.sort(key=lambda x: x[0])

    candidates = []
    for i in range(len(blocking_keys)):
        for j in range(i + 1, min(i + window_size + 1, len(blocking_keys))):
            candidates.append((blocking_keys[i][1], blocking_keys[j][1]))
    return candidates
```

### Locality Sensitive Hashing (LSH)

For large-scale datasets, MinHash LSH keeps blocking sub-linear:

```python
from datasketch import MinHash, MinHashLSH

def lsh_blocking(entities, num_perm=128, threshold=0.5):
    lsh = MinHashLSH(threshold=threshold, num_perm=num_perm)

    for idx, entity in enumerate(entities):
        m = MinHash(num_perm=num_perm)
        for token in entity_tokens(entity):
            m.update(token.encode("utf8"))
        lsh.insert(f"entity_{idx}", m)

    candidates = []
    for idx, entity in enumerate(entities):
        m = MinHash(num_perm=num_perm)
        for token in entity_tokens(entity):
            m.update(token.encode("utf8"))
        similar = lsh.query(m)
        candidates.extend([(idx, int(s.split("_")[1])) for s in similar])
    return candidates
```

---

## 2. Siamese Network Training

### Contrastive vs Triplet Loss

Contrastive loss works better for binary match/non-match classification;
triplet loss excels at learning relative distances (Adjabi et al., 2020).

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class ContrastiveLoss(nn.Module):
    def __init__(self, margin=1.0):
        super().__init__()
        self.margin = margin

    def forward(self, output1, output2, label):
        d = F.pairwise_distance(output1, output2)
        loss = torch.mean(
            (1 - label) * torch.pow(d, 2)
            + label * torch.pow(torch.clamp(self.margin - d, min=0.0), 2)
        )
        return loss

class TripletLoss(nn.Module):
    def __init__(self, margin=1.0):
        super().__init__()
        self.margin = margin

    def forward(self, anchor, positive, negative):
        dp = F.pairwise_distance(anchor, positive)
        dn = F.pairwise_distance(anchor, negative)
        return F.relu(dp - dn + self.margin).mean()
```

### Hard Negative Mining

Online hard negative mining selects the closest non-matching entity within each
batch, forcing the model to learn finer-grained distinctions:

```python
def hard_negative_mining(batch_embeddings, labels, margin=0.5):
    batch_size = len(batch_embeddings)
    triplets = []

    for i in range(batch_size):
        anchor = batch_embeddings[i]
        pos_idx = [j for j in range(batch_size) if labels[i] == labels[j] and i != j]
        neg_idx = [j for j in range(batch_size) if labels[i] != labels[j]]

        if not pos_idx or not neg_idx:
            continue

        hardest_pos = max(pos_idx, key=lambda j: torch.dist(anchor, batch_embeddings[j]))
        hardest_neg = min(neg_idx, key=lambda j: torch.dist(anchor, batch_embeddings[j]))

        pos_dist = torch.dist(anchor, batch_embeddings[hardest_pos])
        neg_dist = torch.dist(anchor, batch_embeddings[hardest_neg])

        if neg_dist < pos_dist + margin:
            triplets.append((i, hardest_pos, hardest_neg))
    return triplets
```

### Siamese Architecture

```python
class SiameseEntityMatcher(nn.Module):
    def __init__(self, embedding_dim=128, hidden_dim=256):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(embedding_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, 128),
        )
        self.similarity = nn.Sequential(
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid(),
        )

    def forward_once(self, x):
        return self.encoder(x)

    def forward(self, input1, input2):
        o1 = self.forward_once(input1)
        o2 = self.forward_once(input2)
        combined = torch.cat((o1, o2), dim=1)
        return o1, o2, self.similarity(combined)
```

---

## 3. SQLite Graph Schema Optimization

### Enhanced Edges Table

Based on Simonini et al. (2018), add CHECK constraints, confidence scores,
and a UNIQUE constraint to prevent duplicate edges:

```sql
CREATE TABLE edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL CHECK(source_type IN ('company','person','product')),
    source_id   INTEGER NOT NULL,
    relation    TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK(target_type IN ('company','person','product')),
    target_id   INTEGER NOT NULL,
    properties  TEXT,
    source_url  TEXT,
    confidence  REAL DEFAULT 1.0,
    created_at  REAL,
    UNIQUE(source_type, source_id, relation, target_type, target_id)
);

CREATE INDEX idx_edges_composite ON edges(source_type, source_id, relation);
CREATE INDEX idx_edges_reverse   ON edges(target_type, target_id, relation);
```

### Materialized View for Company Relationships

```sql
CREATE VIEW company_relationships AS
SELECT
    c1.name AS source_company,
    c2.name AS target_company,
    e.relation,
    json_extract(e.properties, '$.date') AS relation_date,
    e.confidence
FROM edges e
JOIN companies c1 ON e.source_id = c1.id AND e.source_type = 'company'
JOIN companies c2 ON e.target_id = c2.id AND e.target_type = 'company';
```

### Recursive CTE for Transitive Closure

```sql
WITH RECURSIVE company_graph AS (
    SELECT source_id, target_id, 1 AS distance,
           json_array(source_id, target_id) AS path
    FROM edges
    WHERE source_type = 'company' AND target_type = 'company'
      AND relation IN ('acquired','partner','invested_in')

    UNION ALL

    SELECT cg.source_id, e.target_id, cg.distance + 1,
           json_insert(cg.path, '$[#]', e.target_id)
    FROM company_graph cg
    JOIN edges e ON cg.target_id = e.source_id
        AND e.source_type = 'company'
        AND e.target_type = 'company'
        AND e.relation IN ('acquired','partner','invested_in')
    WHERE cg.distance < 3
      AND NOT EXISTS (
          SELECT 1 FROM json_each(cg.path) WHERE value = e.target_id
      )
)
SELECT * FROM company_graph WHERE distance <= 2;
```

### Incremental Graph Updates

```python
def incremental_graph_update(new_edges, db_connection):
    with db_connection:
        cursor = db_connection.cursor()
        for edge in new_edges:
            cursor.execute("""
                INSERT OR IGNORE INTO edges
                (source_type, source_id, relation, target_type,
                 target_id, properties, source_url)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, edge)
```

---

## 4. Threshold Selection and Cost-Sensitive Tuning

### Adaptive Threshold Selector

```python
import numpy as np
from sklearn.metrics import precision_recall_curve, f1_score

class AdaptiveThresholdSelector:
    def __init__(self, target_precision=0.95, min_recall=0.8):
        self.target_precision = target_precision
        self.min_recall = min_recall
        self.threshold_history = []

    def find_optimal_threshold(self, similarities, labels):
        precisions, recalls, thresholds = precision_recall_curve(labels, similarities)
        valid = np.where(precisions[:-1] >= self.target_precision)[0]

        if len(valid) > 0:
            best = valid[np.argmax(recalls[valid])]
            t = thresholds[best]
            preds = (similarities >= t).astype(int)
            f1 = f1_score(labels, preds)
            self.threshold_history.append({
                "threshold": t, "precision": precisions[best],
                "recall": recalls[best], "f1": f1,
            })
            return t, f1

        f1s = 2 * (precisions[:-1] * recalls[:-1]) / (precisions[:-1] + recalls[:-1] + 1e-8)
        best = np.argmax(f1s)
        return thresholds[best], f1s[best]

    def get_adaptive_threshold(self):
        if not self.threshold_history:
            return 0.05
        weights = np.exp(np.arange(len(self.threshold_history)) * 0.5)
        weights /= weights.sum()
        return np.average([h["threshold"] for h in self.threshold_history], weights=weights)
```

### Cost-Sensitive Threshold Tuning

```python
class CostSensitiveThreshold:
    def __init__(self, false_positive_cost=1.0, false_negative_cost=5.0):
        self.fp_cost = false_positive_cost
        self.fn_cost = false_negative_cost

    def optimize_threshold(self, similarities, labels, candidate_thresholds):
        min_cost = float("inf")
        best_t = 0.05
        for t in candidate_thresholds:
            preds = (similarities >= t).astype(int)
            fp = np.sum((preds == 1) & (labels == 0))
            fn = np.sum((preds == 0) & (labels == 1))
            cost = fp * self.fp_cost + fn * self.fn_cost
            if cost < min_cost:
                min_cost = cost
                best_t = t
        return best_t, min_cost
```

---

## 5. Incremental Entity Resolution

### Streaming ER Architecture

Based on Hofer et al. (2024), the incremental resolver maintains a blocking
index that is rebuilt every 1,000 new entities, with a candidate cache (TTL
1 hour) to avoid redundant lookups:

```python
class IncrementalEntityResolver:
    def __init__(self, db_connection, lancedb_connection):
        self.db = db_connection
        self.lancedb = lancedb_connection
        self.candidate_cache = {}          # key -> (result, timestamp)
        self.blocking_index = self._build_blocking_index()
        self.entities_since_rebuild = 0

    def _build_blocking_index(self):
        cursor = self.db.cursor()
        cursor.execute("SELECT id, normalized_name FROM companies")
        index = {}
        for row in cursor.fetchall():
            key = row[1][:4]               # prefix blocking key
            index.setdefault(key, []).append(row[0])
        return index

    def resolve(self, entity):
        # Check cache first (TTL 1 hour)
        cache_key = entity["normalized_name"]
        if cache_key in self.candidate_cache:
            result, ts = self.candidate_cache[cache_key]
            if time.time() - ts < 3600:
                return result

        # Blocking -> deep match -> merge or create
        candidates = self._block(entity)
        match = self._deep_match(entity, candidates)

        if match:
            self._merge_into(match["id"], entity)
        else:
            self._create_entity(entity)
            self.entities_since_rebuild += 1
            if self.entities_since_rebuild >= 1000:
                self.blocking_index = self._build_blocking_index()
                self.entities_since_rebuild = 0

        self.candidate_cache[cache_key] = (match, time.time())
        return match
```

---

## References

| # | Paper | Year |
|---|-------|------|
| 1 | Zhang et al. -- A Graph-Theoretic Fusion Framework for Unsupervised ER | 2018 |
| 2 | Papadakis et al. -- Blocking Framework for ER in Heterogeneous Spaces | 2013 |
| 3 | Simonini et al. -- BLAST: Blocking for Heterogeneous Data | 2016 |
| 4 | Kirielle et al. -- Unsupervised Graph-Based ER for Complex Entities | 2023 |
| 5 | Scabora -- Storage and Navigation on Graphs in Relational DBMS | 2021 |
| 6 | ModER -- Graph-based Unsupervised ER using Composite Modularity | 2022 |
| 7 | Papadakis et al. -- Leveraging External Knowledge | 2021 |
| 8 | Vatsalan et al. -- Taxonomy of Privacy-Preserving Record Linkage | 2012 |
| 9 | Adjabi et al. -- Past, Present, and Future of Face Recognition | 2020 |
| 10 | Simonini et al. -- Schema-Agnostic Progressive ER | 2018 |
| 11 | Hofer et al. -- Construction of Knowledge Graphs: State and Challenges | 2024 |
| 12 | Kejriwal -- Unsupervised DNF Blocking for KG and Tables | 2021 |
| 13 | Azzalini et al. -- Blocking Techniques: A Semantics-Based Approach | 2020 |
| 14 | Kopcke & Rahm -- Frameworks for Entity Matching: A Comparison | 2009 |
| 15 | Christen & Gayler -- Towards Scalable Real-Time ER | 2008 |
