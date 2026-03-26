# Implementation Guide -- Lead Profile Matching & Candidate Classification

Consolidated from `research-output/agent-05-lead-scoring-research.md` and
`research-output/agent-12-lead-scoring-impl.md`.

---

## 1. Siamese Network Architecture

### Shared Encoder

```python
class SiameseEncoder(nn.Module):
    def __init__(self, input_dim=768, hidden_dims=[512, 256], output_dim=128):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dims[0]),
            nn.BatchNorm1d(hidden_dims[0]),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dims[0], hidden_dims[1]),
            nn.BatchNorm1d(hidden_dims[1]),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dims[1], output_dim),
            nn.LayerNorm(output_dim),
        )

    def forward(self, x):
        return F.normalize(self.encoder(x), p=2, dim=1)
```

**Literature**: Sung et al. (2018) -- shared-weight encoders learn effective
distance metrics for few-shot similarity tasks.

### Embedding Dimensions

128 dimensions balances discriminative power with inference cost (Chen & Shi,
2020). Always L2-normalize before cosine similarity.

### Training Loss

```python
class ContrastiveLoss(nn.Module):
    def __init__(self, margin=0.5):
        super().__init__()
        self.margin = margin

    def forward(self, output1, output2, label):
        d = F.pairwise_distance(output1, output2)
        loss = torch.mean(
            (1 - label) * torch.pow(d, 2)
            + label * torch.pow(torch.clamp(self.margin - d, min=0.0), 2)
        )
        return loss
```

### Location Embedding

Location strings are encoded via a learned 16-dimensional embedding trained
alongside the Siamese network:

```
location_string -> char trigrams -> Linear(300, 16)
```

The 300-dim input comes from hashing each trigram into a 300-bin vocabulary and
summing the one-hot vectors. The `Linear(300, 16)` layer is trained end-to-end
during contrastive learning and frozen at inference time.

---

## 2. Feature Engineering

### Enhanced Feature Vector

```python
def build_enhanced_feature_vector(company_id, siamese_score):
    company = get_company(company_id)

    industry_onehot = one_hot_encode(company["industry"], industry_vocab)
    location_emb    = location_encoder(company["location"])  # 16-dim

    employee_count = company.get("employee_count", -1)
    funding_amount = company.get("funding_info", {}).get("amount", -1)

    return {
        # Semantic
        "siamese_similarity": siamese_score,
        "topic_cosine": cosine_sim(page_topics, icp_topics),

        # Company attributes (log-transformed)
        "employee_count_log": np.log1p(max(employee_count, 0)),
        "funding_amount_log": np.log1p(max(funding_amount, 0)),
        "size_funding_interaction": np.log1p(max(employee_count, 0))
                                    * np.log1p(max(funding_amount, 0)),

        # Text
        "keyword_density": count_icp_keywords(company["description"])
                           / max(len(company["description"].split()), 1),
        "tech_term_count": count_tech_terms(company["description"]),

        # Domain / social
        "domain_authority": min(company.get("domain_authority", -1), 100),
        "social_presence": sum([
            int(bool(company.get("linkedin_url"))),
            int(bool(company.get("twitter_url"))),
            int(bool(company.get("github_url"))),
            int(bool(company.get("crunchbase_url"))),
        ]),

        # Categorical / embedding
        **industry_onehot,       # 47 one-hot columns
        **location_emb,          # 16 float columns
    }
```

### Missing Value Strategy

All numeric features use `-1` as the sentinel for missing data. XGBoost
handles this natively via its default-direction splits; LogReg and RF receive
an imputed value during preprocessing (median impute on train set, cached).

### Industry Vocabulary

47 categories derived from NAICS 2-digit codes plus an "Other" bucket.

### Domain Authority Source

CommonCrawl host-level PageRank approximation, cached in a local SQLite table
(`domain_authority_cache`). Updated monthly from the latest CC-MAIN release.

### Social Presence

```python
social_presence = has_linkedin + has_twitter + has_github + has_crunchbase
# range [0, 4]
```

---

## 3. Ensemble Design

### Model Hyperparameters

**XGBoost** (primary, weight 0.50):

| Parameter          | Value             |
|--------------------|-------------------|
| max_depth          | 6                 |
| n_estimators       | 200               |
| learning_rate      | 0.05              |
| subsample          | 0.8               |
| colsample_bytree   | 0.8               |
| reg_lambda         | 1.0               |
| min_child_weight   | 3                 |
| objective          | binary:logistic   |
| eval_metric        | logloss           |
| tree_method        | hist              |

**Logistic Regression** (weight 0.25):

| Parameter    | Value     |
|--------------|-----------|
| C            | 1.0       |
| penalty      | l2        |
| solver       | lbfgs     |
| class_weight | balanced  |
| max_iter     | 1000      |

**Random Forest** (weight 0.25):

| Parameter         | Value  |
|-------------------|--------|
| n_estimators      | 100    |
| max_depth         | 8      |
| min_samples_split | 5      |
| min_samples_leaf  | 2      |
| max_features      | sqrt   |
| bootstrap         | True   |

### Ensemble Weight Derivation

5-fold cross-validation grid search over all weight triplets
`(w_xgb, w_lr, w_rf)` with step 0.05, constrained to sum = 1.0.

Best configuration: **50 / 25 / 25** -- mean F1 = 0.883 +/- 0.012.

### Calibration

```python
class CalibratedEnsemble:
    def __init__(self, models, calibration_method="isotonic"):
        self.models = models
        self.calibration_method = calibration_method
        self.calibrators = {}

    def fit_calibration(self, X_val, y_val):
        for name, model in self.models.items():
            proba = model.predict_proba(X_val)[:, 1]
            if self.calibration_method == "platt":
                cal = PlattScaling()
            else:
                cal = IsotonicRegression(out_of_bounds="clip")
            cal.fit(proba.reshape(-1, 1), y_val)
            self.calibrators[name] = cal

    def predict_proba(self, X):
        weights = {"xgboost": 0.50, "logreg": 0.25, "rf": 0.25}
        calibrated = []
        for name, model in self.models.items():
            raw = model.predict_proba(X)[:, 1]
            if name in self.calibrators:
                raw = self.calibrators[name].predict(raw.reshape(-1, 1))
            calibrated.append(raw)
        return sum(w * p for w, p in zip(weights.values(), calibrated))
```

### Threshold Selection

| Threshold | Precision | Recall | F1    |
|-----------|-----------|--------|-------|
| 0.80      | 85.2%     | 91.3%  | 0.882 |
| **0.85**  | **89.7%** | **86.5%** | **0.881** |
| 0.90      | 94.1%     | 78.2%  | 0.854 |
| 0.95      | 97.3%     | 62.8%  | 0.764 |

0.85 was chosen as the operating point for best F1 while keeping precision
near 90%.

---

## 4. Training Data

| Split      | Count | Positive Rate |
|------------|-------|---------------|
| Train      | 1,800 | 35%           |
| Validation | 300   | 35%           |
| Test       | 300   | 35%           |
| **Total**  | **2,400** | **35%**   |

---

## 5. Feature Importance (XGBoost, top 5)

| Rank | Feature              | Gain  |
|------|----------------------|-------|
| 1    | siamese_similarity   | 0.31  |
| 2    | keyword_density      | 0.14  |
| 3    | employee_count_log   | 0.11  |
| 4    | topic_cosine         | 0.09  |
| 5    | funding_amount_log   | 0.08  |

---

## 6. LanceDB ANN Index Tuning

```python
def optimize_lancedb_index(table_size, dimension=128):
    if table_size < 10_000:
        return {"metric": "cosine", "num_partitions": 1,
                "num_sub_vectors": dimension // 2, "use_exact_search": True}
    elif table_size < 100_000:
        return {"metric": "cosine",
                "num_partitions": min(256, table_size // 39),
                "num_sub_vectors": 64, "nprobe": 10}
    else:
        return {"metric": "cosine",
                "num_partitions": min(1024, table_size // 1000),
                "num_sub_vectors": 32, "nprobe": 20}
```

Distance metric: **cosine** (best for L2-normalized embeddings).

---

## 7. Online Learning Framework

```python
class OnlineLeadMatcher:
    def __init__(self, base_models, buffer_size=1000):
        self.models = base_models
        self.label_buffer = []
        self.feature_buffer = []
        self.buffer_size = buffer_size

    def ingest_label(self, features, is_qualified):
        self.label_buffer.append(is_qualified)
        self.feature_buffer.append(features)
        if len(self.label_buffer) > self.buffer_size:
            self.label_buffer.pop(0)
            self.feature_buffer.pop(0)
        if len(self.label_buffer) >= 100:
            self._retrain_window()

    def _retrain_window(self):
        X = np.array(self.feature_buffer)
        y = np.array(self.label_buffer)
        for name, model in self.models.items():
            if hasattr(model, "partial_fit"):
                model.partial_fit(X, y)
            else:
                model.fit(X, y)
        self.label_buffer.clear()
        self.feature_buffer.clear()

    def detect_drift(self, baseline_f1):
        if len(self.label_buffer) < 50:
            return False
        recent_f1 = f1_score(self.label_buffer[-50:],
                             [self.predict(f) for f in self.feature_buffer[-50:]])
        return recent_f1 < baseline_f1 * 0.80
```

---

## 8. Model Registry & Rollback

```python
class ModelRegistry:
    def __init__(self, path="scrapus_data/models/registry"):
        self.path = path

    def save(self, models, metrics):
        vid = f"v{next_version()}_{datetime.now():%Y%m%d_%H%M%S}"
        for name, m in models.items():
            save_model(m, f"{self.path}/{vid}/{name}")
        save_json(f"{self.path}/{vid}/meta.json", {
            "version": vid, "metrics": metrics,
            "timestamp": datetime.now().isoformat()})
        return vid

    def rollback(self, vid):
        return {name: load_model(f"{self.path}/{vid}/{name}")
                for name in ["xgboost", "logreg", "rf"]}
```

---

## 9. Monitoring & Explainability

```python
class LeadMatchingMonitor:
    def log_prediction(self, company_id, data):
        self.db.execute("""
            INSERT INTO lead_explanations
            (company_id, siamese_score, ensemble_prob, top_factors,
             xgb_feature_importance, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (company_id, data["siamese_score"], data["ensemble_prob"],
              json.dumps(data["top_features"]),
              json.dumps(data.get("feature_importance", {})),
              datetime.now().timestamp()))

    def confidence_interval(self, model_probs):
        mu = np.mean(model_probs)
        sigma = np.std(model_probs)
        return {"mean": mu, "std": sigma,
                "ci_95": [mu - 1.96 * sigma, mu + 1.96 * sigma]}
```

---

## 10. Implementation Checklist

### Siamese Network
- [ ] Shared-weight encoder (768 -> 512 -> 256 -> 128)
- [ ] L2 normalization on output embeddings
- [ ] Contrastive loss, margin = 0.5
- [ ] Location embedding: char-trigram -> Linear(300, 16)
- [ ] Embedding cache in LanceDB

### Ensemble
- [ ] XGBoost: max_depth=6, n_estimators=200, lr=0.05
- [ ] LogReg: C=1.0, l2, lbfgs, balanced
- [ ] RF: n_estimators=100, max_depth=8
- [ ] Ensemble weights via 5-fold CV grid search
- [ ] Isotonic calibration on validation set
- [ ] Threshold = 0.85

### Feature Pipeline
- [ ] Industry one-hot (47 NAICS 2-digit + Other)
- [ ] Location embedding (16-dim from Siamese training)
- [ ] Missing numeric -> -1
- [ ] social_presence = sum of 4 boolean flags [0..4]
- [ ] domain_authority from CommonCrawl PageRank cache
- [ ] Log transforms on employee_count, funding_amount

### LanceDB
- [ ] Cosine metric for normalized embeddings
- [ ] IVF partitions scaled to dataset size
- [ ] Adaptive nprobe (10/20/40)

### Online Learning
- [ ] Label buffer (1,000 examples, retrain every 100)
- [ ] Concept drift detection (F1 drop > 20%)
- [ ] Model registry with rollback
- [ ] Version metadata (metrics + timestamp + sample count)

### Monitoring
- [ ] Prediction logging to lead_explanations table
- [ ] 95% confidence intervals from ensemble variance
- [ ] Weekly calibration quality check
- [ ] Performance dashboard

---

## References

1. Sung et al. (2018) [Learning to Compare](https://doi.org/10.1109/cvpr.2018.00131)
2. Chen & Shi (2020) [Spatial-Temporal Attention](https://doi.org/10.3390/rs12101662)
3. Elith et al. (2008) [Working guide to boosted regression trees](https://doi.org/10.1111/j.1365-2656.2008.01390.x)
4. Hullermeier & Waegeman (2021) [Aleatoric and epistemic uncertainty](https://doi.org/10.1007/s10994-021-05946-3)
5. Douze et al. (2024) [The Faiss library](https://arxiv.org/abs/2401.08281)
6. Singh et al. (2022) [Incremental learning for real-time prediction](https://doi.org/10.1007/s12530-022-09481-x)
7. Nigam et al. (2019) [Semantic Product Search](https://doi.org/10.1145/3292500.3330759)
8. Janssens et al. (2022) [B2Boost](https://doi.org/10.1007/s10479-022-04631-5)
9. Wu et al. (2023) [Lead scoring models](https://doi.org/10.1007/s10799-023-00388-w)
10. Kaplan et al. (2025) [AI-based business lead generation: Scrapus](https://doi.org/10.3389/frai.2025.1606431)
