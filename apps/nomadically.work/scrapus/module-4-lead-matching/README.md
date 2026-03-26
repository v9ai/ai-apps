# Module 4: Lead Profile Matching & Candidate Classification (Local)

## Purpose

Score candidates against the user's Ideal Customer Profile (ICP) using a
Siamese network for semantic similarity and an XGBoost ensemble for final
classification. All vectors stored in LanceDB, all scores written to SQLite.

---

## Two-Stage Architecture

```
Enriched Company Profile (SQLite) + ICP Definition
         │
         ▼
┌──────────────────────────┐
│  Stage 1: Siamese Net     │  Query LanceDB for similarity
│  (128-dim embeddings)     │  Cosine distance -> similarity score
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Stage 2: XGBoost +       │  Features from SQLite + LanceDB + ChromaDB
│  Logistic Reg + RF        │  Soft voting -> probability
│  Ensemble                 │  High threshold (~95% precision)
└──────────┬───────────────┘
           │
           ▼
     Qualified leads -> SQLite (score writeback)
```

## Stage 1: Siamese Network with LanceDB

### ICP Profile Encoding

```python
db = lancedb.connect("scrapus_data/lancedb")

icp_vector = siamese_encoder.encode({
    "industry_keywords": "AI cybersecurity threat detection",
    "company_size": "mid-size 50-500",
    "location": "Europe",
    "must_haves": "AI-driven software product"
})

lead_profiles = db.create_table("lead_profiles", data=[{
    "vector": icp_vector,
    "profile_id": "icp_001",
    "profile_type": "target",
    "profile_json": json.dumps(icp_definition)
}])
```

### Candidate Scoring

```python
candidate = get_company_profile(company_id)  # from SQLite
candidate_vec = siamese_encoder.encode({
    "industry_keywords": candidate["industry"],
    "company_size": str(candidate["employee_count"]),
    "location": candidate["location"],
    "description": candidate["description"][:500]
})

# Store candidate embedding
lead_profiles.add([{
    "vector": candidate_vec,
    "profile_id": f"candidate_{company_id}",
    "profile_type": "candidate",
    "profile_json": json.dumps(candidate)
}])

# Compute similarity against ICP
results = lead_profiles.search(icp_vector) \
    .where("profile_type = 'candidate'") \
    .limit(1000) \
    .to_list()

similarity_score = 1.0 - result["_distance"]  # convert to 0-1 similarity
```

### Semantic Matching Examples

| Target ICP                      | Candidate                                    | Similarity |
|---------------------------------|----------------------------------------------|------------|
| "AI-driven healthcare startups" | "ML platform for medical image analysis"     | 0.91       |
| "logistics software providers"  | "fleet management SaaS"                      | 0.88       |
| "AI security solutions"         | "organic food delivery"                      | 0.12       |

---

## Stage 2: Ensemble Classifier

### Feature Assembly

```python
def build_feature_vector(company_id, siamese_score):
    company = get_company(company_id)              # SQLite
    facts = get_company_facts(company_id)           # SQLite
    page_topics = get_page_topics(company_id)       # ChromaDB

    return {
        "siamese_similarity": siamese_score,
        "keyword_count": count_icp_keywords(company["description"]),
        "topic_cosine": cosine_sim(page_topics, icp_topics),
        "has_required_location": int(location_matches(company)),
        "has_required_size": int(size_matches(company)),
        "funding_amount": extract_funding(company["funding_info"]),
        "employee_count": company["employee_count"] or 0,
        "fact_count": len(facts),
        "domain_authority": company.get("domain_authority", 0),
    }
```

### Models (all local, loaded from disk)

| Model               | File                                     |
|----------------------|------------------------------------------|
| XGBoost (primary)    | `scrapus_data/models/xgboost/model.json` |
| Logistic Regression  | `scrapus_data/models/logreg/model.pkl`   |
| Random Forest        | `scrapus_data/models/rf/model.pkl`       |

Soft voting: `prob = 0.5 * xgb_prob + 0.25 * lr_prob + 0.25 * rf_prob`

Threshold: `prob > 0.85` -> qualified lead.

### Score Writeback -- SQLite

```sql
UPDATE companies
SET lead_score = ?,
    lead_confidence = ?,
    is_qualified = CASE WHEN ? > 0.85 THEN 1 ELSE 0 END,
    updated_at = ?
WHERE id = ?;
```

## Explainability Log -- SQLite

```sql
CREATE TABLE lead_explanations (
    company_id INTEGER REFERENCES companies(id),
    siamese_score REAL,
    ensemble_prob REAL,
    top_factors TEXT,      -- JSON: [{"factor": "industry_match", "value": 0.95}, ...]
    xgb_feature_importance TEXT,  -- JSON from XGBoost
    created_at REAL
);
```

## Results

| Metric   | Scrapus | Baseline |
|----------|---------|----------|
| Precision| 89.7%   | 80%      |
| Recall   | 86.5%   | 78%      |
| F1       | 0.88    | 0.79     |
| PR-AUC   | 0.92    | 0.79     |

Pipeline compression: 50K pages -> 7,500 relevant -> 300 qualified leads.
