# QMin Neural Quality Propagation --- Deep Dive

> **Paper:** "Neural Prioritisation for Web Crawling"
> **Authors:** Francesca Pezzuti, Sean MacAvaney, Nicola Tonellotto
> **Venue:** ACM SIGIR ICTIR 2025 (Padua, Italy, July 18 2025)
> **arXiv:** [2506.16146v2](https://arxiv.org/abs/2506.16146) (submitted June 19, revised July 2 2025)
> **DOI:** [10.1145/3731120.3744597](https://dl.acm.org/doi/10.1145/3731120.3744597)
> **Code:** [fpezzuti/neural_crawling](https://github.com/fpezzuti/neural_crawling) (Apache-2.0)

---

## Paper Summary

The paper proposes replacing link-structure heuristics (BFS, PageRank) with **neural semantic quality estimation** as the frontier priority signal in focused web crawling. The core insight: if you can score each fetched page's "quality" cheaply via a small language model, you can propagate that score to unseen outlinked URLs, so the crawler preferentially follows paths through high-quality neighborhoods.

Three prioritization policies are introduced --- QOracle, QFirst, and **QMin** --- all built on top of QT5-Small, a T5-based quality estimator trained to predict whether a document is likely relevant to *any* user query, in a query-independent way.

The key result: on natural-language queries (Researchy Questions dataset), **QMin achieves 1.6x mean speedup over BFS** --- meaning BFS must crawl and store ~60% more pages to surface the same number of relevant documents. On keyword queries (MS MARCO Web Search), improvements are more modest.

---

## Algorithm & Architecture

### Quality Estimator: QT5-Small

The quality scoring function `M_theta(p)` is provided by **QT5-Small** (Chang et al., SIGIR 2024, arXiv:2407.12170):

| Property | Value |
|---|---|
| Backbone | T5-Small encoder-decoder |
| Input format | `"Document: [page_text] Relevant:"` |
| Output | Real-valued quality score (log-probability of relevance to any query) |
| Training data | 9.1M documents with positive relevance labels from MS MARCO Web Search |
| Negatives | All remaining documents treated as negative |
| Convergence | After 1.6M training instances |
| Optimizer | Adam, lr = 5e-5, batch size 16, 10K iterations |
| Inference latency | 0.45 ms/passage on NVIDIA 3090 (2,205 pages/sec) |
| Property | Query-independent (no query needed at inference time) |

The model is deliberately **query-agnostic**: it estimates an inherent document quality rather than query-specific relevance. This makes it suitable as a crawl-time signal where the future query distribution is unknown.

### Three Crawling Policies

All policies share the same crawl loop. The crawler maintains a frontier `F` of `(url, priority)` pairs, always dequeuing the highest-priority URL next (best-first traversal). After fetching and processing a page `p`, outlinks `O_p` are discovered. The policies differ only in how priorities are assigned and updated:

#### 1. QOracle (theoretical upper bound)

```
for each url u~ in outlinks O_p:
    P_u~ = M_theta(p~)    # score the TARGET page (requires its text)
    insert (u~, P_u~) into F
```

QOracle has **oracle access** to page text before download --- impossible in practice but useful as a ceiling benchmark. It scores the destination page directly.

#### 2. QFirst (quality of first discoverer)

```
for each url u~ in outlinks O_p:
    if u~ is NEW (not in F):
        P_u~ = M_theta(p)     # score of the PARENT page
        insert (u~, P_u~) into F
    else:
        skip (never update)
```

QFirst uses the quality of the **first page that links to** `u~` as a proxy for `u~`'s own quality. Priority is set once and never revised. Simple, cheap, no frontier updates.

#### 3. QMin (minimum quality propagation) --- the main contribution

```
for each url u~ in outlinks O_p:
    if u~ is NEW (not in F):
        P_u~ = M_theta(p)           # initial: parent quality
        insert (u~, P_u~) into F
    else:
        P_u~ <- min(P_u~, M_theta(p))  # DECREASE priority if new ancestor is worse
        update u~ in F
```

**Key insight:** QMin makes the conservative assumption that pages linked from low-quality ancestors are unlikely to be high-quality themselves. When a URL `u~` is rediscovered from a different parent page:

- If the new parent has **lower** quality than the current priority, the priority is **decreased** (via `min`).
- If the new parent has **higher** quality, the priority stays unchanged.
- Priority can only go **down**, never up.

This is a monotone-decreasing quality propagation. It progressively penalizes URLs that appear in low-quality neighborhoods, even if they were initially found via a high-quality path. The `min` operator acts as a pessimistic aggregation over the inlinking neighborhood.

### Why Min, Not Mean or Max?

The paper's assumption is asymmetric: one low-quality inlink is a stronger negative signal than one high-quality inlink is a positive signal. This mirrors the intuition that link farms and content mills interlink heavily, so appearing in a low-quality cluster is damning.

A `max` operator would be vulnerable to a single high-quality page linking to spam. A `mean` would be diluted. The `min` is the most conservative --- it only preserves high priority for URLs whose **entire observed neighborhood** is high-quality.

### Complexity

| Aspect | Neural (QFirst/QMin) | PageRank |
|---|---|---|
| Time per page | O(1) model inference | O(n^2) periodic recomputation |
| Total time | O(n) for n pages | O(n^2) or iterative convergence |
| Space per page | O(1) (just the score) | O(n + e) where e >> n |
| External dependency | Quality model weights | Full link graph in memory |

The authors argue inference latency is "unlikely to become a bottleneck" since lightweight models (4-layer transformers) suffice and each page is scored independently.

---

## Benchmarks & Results

### Experimental Setup

| Parameter | Value |
|---|---|
| Corpus | ClueWeb22-B English subset (87M head pages) |
| Seed URLs | 100K randomly selected |
| Total pages crawled | 29M |
| Measurement interval | Every 2.5M pages |
| Simulation | Single-threaded, constant per-page crawl time assumed |
| Environment | Simulated (not live web) --- replayed from ClueWeb22 link graph |

### Query Sets

| Query Set | Queries | Relevant Docs | Avg Query Length | Type |
|---|---|---|---|---|
| MS MARCO Web Search (MSM-WS) | 896 | 894 | 3.8 +/- 2.3 words | Keyword |
| Researchy Questions (RQ) | 2,122 | 1,973 | 7.6 +/- 2.8 words | Natural language |

### Evaluation Metrics

- **Harvest Rate (HR):** Fraction of crawled pages that are relevant: `HR(Q, t) = |R_t^Q| / t`
- **maxNDCG:** Ideal nDCG achievable given the set of crawled relevant pages: `maxNDCG(q, t) = sum_i 1/log2(i+1)`
- **nDCG@10:** End-to-end retrieval effectiveness after BM25 indexing + MonoElectra neural re-ranking
- **Speedup:** `s_A,B(n) = tau_B(n) / tau_A(n)` --- how many pages baseline B needs to match approach A's relevant page count

### Mean Speedup vs BFS (Table 2)

| Policy | MSM-WS (keyword) | RQ (natural language) |
|---|---|---|
| QOracle | 1.302x | 1.514x |
| QFirst | 1.100x | 1.405x |
| **QMin** | **0.967x** | **1.601x** |

### Interpretation

- **On natural language queries (RQ):** QMin is the clear winner at **1.6x speedup**. It even outperforms QOracle (1.514x), which is remarkable since QOracle has access to page text before downloading. The authors note QMin is "slightly more effective than QOracle" on NL queries and "attains almost the same harvest rate as QOracle."

- **On keyword queries (MSM-WS):** QMin actually underperforms BFS slightly (0.967x). QFirst (1.1x) and QOracle (1.3x) do better. The authors explain that keyword-query relevance correlates less with semantic quality, so the quality signal is weaker for keyword search.

- **Improvement magnitudes (RQ):** Compared to BFS, QMin shows +149% harvest rate, +152% maxNDCG, +139% nDCG@10 improvements at early crawl stages.

### Why PageRank Was Excluded

The authors cite prior work showing PageRank scores are "unreliable page importance estimates" on partial/small-scale web graphs. Since crawling experiments operate on an evolving subgraph, PageRank would need periodic recomputation on incomplete data and would not be a fair comparison. BFS better approximates PageRank behavior at limited scale.

---

## Code Availability

**Repository:** [github.com/fpezzuti/neural_crawling](https://github.com/fpezzuti/neural_crawling)

| Property | Value |
|---|---|
| License | Apache-2.0 |
| Languages | Python (36.1%), Jupyter Notebook (63.9%) |
| Dependencies | `requirements.txt` (crawling), `requirements_qual.txt` (evaluation) |
| GPU | MonoElectra re-ranking requires CUDA |

### Key Files

```
neural_crawling/
  code/
    crawl.py              # Main crawler entry point
    preproc_cw22b.py      # ClueWeb22-B preprocessing
    preproc_querysets.py   # Query set preparation
    index.py              # BM25 indexing
    rerank.py             # MonoElectra neural re-ranking (CUDA)
    plot-metrics.ipynb    # Evaluation and visualization
  requirements.txt
  requirements_qual.txt
  LICENSE
  README.md
```

### Command-Line Interface

```bash
# BFS baseline
python code/crawl.py --frontier_type bfs --max_pages -1 --exp_name bfs_baseline

# QFirst (quality-based, no updates)
python code/crawl.py --frontier_type quality --updates_enabled 0 --exp_name qfirst

# QMin (quality-based, with min-update propagation)
python code/crawl.py --frontier_type quality --updates_enabled 1 --exp_name qmin

# QOracle (oracle access to page text)
python code/crawl.py --frontier_type oracle-quality --exp_name qoracle

# Periodic indexing for time-series evaluation
python code/crawl.py --frontier_type quality --updates_enabled 1 --periodic 1 \
    --limit 2500000 --benchmark rq --exp_name qmin_rq
```

### Reusability Assessment

The code is a **research reproduction package** tied to ClueWeb22-B, not a general-purpose library. Extracting the QMin logic would require:

1. Replacing the ClueWeb22 graph reader with a live HTTP frontier
2. Replacing QT5-Small with a locally-deployable quality model (the paper uses a GPU-based T5 model)
3. Adapting the priority queue to support in-place `min` updates efficiently

---

## Integration with DQN Crawler

The existing Scrapus crawler stack has components that map directly to QMin's architecture:

### Current Stack (from codebase)

| Component | File | Role |
|---|---|---|
| DQN Agent | `crawler_dqn.py` | Double DQN, 784-dim state, top-K link selection |
| GNN Encoder | `crawler_gnn_encoder.py` | 2-layer GAT, 2-hop neighborhood, 784-dim state vectors |
| Frontier | `crawler_frontier_optimizer.py` | Priority heap (top 10K) + SQLite cold storage |
| Content Quality | `crawler_content_quality.py` | Multi-signal quality scorer (0-1), pure Python |
| Link Scorer | `crawler_link_scorer.py` | Rule-based pre-filter, `parent_page_quality` field |
| Engine | `crawler_engine.py` | UCB1 domain scheduler, SQLite-backed URL frontier |

### Proposed Integration: QMin as Graph-Level Prior, DQN as Page-Level Selector

QMin and DQN operate at **different abstraction levels** and are naturally complementary:

```
                QMin Layer (graph structure)
                    |
                    v
    Frontier URLs ranked by min-quality propagation
                    |
                    v
            Top-K candidates extracted
                    |
                    v
                DQN Layer (page features)
                    |
                    v
    DQN selects final action from K candidates
    using 784-dim state (embed + scalar + GNN features)
```

#### Layer 1: QMin Frontier Scoring

- After each page fetch, compute quality score via a local model (see below for M1-compatible options).
- For each outlink: if new, insert with parent quality as priority. If existing, update via `P = min(P, quality)`.
- This replaces or augments the existing `parent_page_quality` field in `LinkFeatures`.

#### Layer 2: DQN Action Selection

- The DQN already operates on top-K candidates per page (action_dim = 10).
- The `crawler_link_scorer.py` pre-filters ~50 links down to 10-15 candidates.
- QMin scores become an additional feature in the 784-dim state vector (or replace/augment the UCB1 domain priority).

#### Concrete Integration Points

1. **`crawler_content_quality.py` --- add neural quality score.** The existing `ContentQualityScorer` uses rule-based signals (text length, boilerplate ratio, readability, etc.). Add a QT5-like neural quality score as an additional signal. On M1, options include:
   - **QT5-Tiny via ONNX** (0.13ms/page on GPU; estimate ~1-2ms on M1 CPU via ONNX CoreML EP)
   - **Distilled quality classifier** --- train a small MLP on nomic-embed-text embeddings (already computed for DQN state) to predict quality. This avoids adding a second transformer.
   - **Reuse the existing `overall_quality` score** as a QMin-compatible signal --- already 0-1 range, already computed.

2. **`crawler_frontier_optimizer.py` --- add min-update to `FrontierPriorityHeap`.** The heap currently supports insert and pop-max. QMin requires **decrease-key** operations. Options:
   - **Lazy deletion:** Mark old entries as stale, insert new `(url, min_priority)`. The heap naturally defers stale entries. Space overhead: ~2x in worst case.
   - **Indexed priority queue:** Maintain a hash map from URL to heap index for O(log n) decrease-key. More complex but exact.
   - **SQLite approach:** The existing cold-storage SQLite already supports `UPDATE SET priority = MIN(priority, ?)`.

3. **`crawler_link_scorer.py` --- propagate quality through `parent_page_quality`.** The `LinkFeatures` dataclass already has a `parent_page_quality: float` field. QMin's contribution is making this a **monotone-decreasing aggregate** over all observed ancestors rather than just the immediate parent.

4. **`crawler_gnn_encoder.py` --- QMin as edge weight.** The GNN already processes 2-hop neighborhoods with edge features. QMin quality scores could serve as edge weights or node features in the GAT, letting the GNN learn to combine structural and quality signals.

5. **DQN state augmentation.** Add the QMin frontier priority as one of the 16 scalar features in the 784-dim state vector. The DQN then learns to weight graph-propagated quality alongside page-level embeddings.

### Architecture Diagram

```
Page Fetched
    |
    +---> QT5/Quality Model ---> quality_score (0-1)
    |
    +---> Content Extractor ---> outlinks[]
    |
    +---> For each outlink:
    |         |
    |         +---> Bloom filter check (dedup)
    |         |
    |         +---> If new: insert(url, quality_score) into frontier
    |         |
    |         +---> If exists: frontier.decrease_key(url, min(current, quality_score))
    |
    +---> Link Scorer pre-filters top-K from frontier
    |
    +---> GNN encodes 2-hop neighborhood (with QMin scores as node features)
    |
    +---> DQN selects action from top-K candidates
    |
    +---> Selected URL fetched ---> loop
```

### M1-Compatible Quality Model Options

| Model | Size | Latency (est. M1) | Approach |
|---|---|---|---|
| QT5-Tiny (ONNX) | ~30 MB | ~1-2 ms | Direct port, CoreML EP |
| Distilled MLP on nomic embeddings | ~1 MB | ~0.1 ms | Train on crawled pages with quality labels |
| Existing ContentQualityScorer | 0 MB | ~0.05 ms | Already computed, rule-based, no model needed |
| TinyBERT quality classifier | ~60 MB | ~3-5 ms | Fine-tune on MS MARCO quality labels |

**Recommendation:** Start with the existing `ContentQualityScorer.overall_quality` as the QMin signal. It is already computed, costs nothing, and the `min`-propagation logic is the novel part. If harvest rate improves, invest in a neural quality model later.

---

## Risks & Limitations

### From the Paper

1. **Simulated-only evaluation.** All experiments ran on a replayed ClueWeb22 link graph, not live web crawling. Real-world factors --- DNS latency, robots.txt delays, host failures, politeness constraints --- are not modeled. The 1.6x speedup may not translate directly to wall-clock savings.

2. **Keyword query weakness.** QMin actually underperforms BFS on keyword queries (0.967x speedup). The quality signal is more aligned with semantic/NL search than exact keyword matching. For B2B lead gen, this is likely acceptable since our queries are semantic ("AI engineering remote EU").

3. **No adversarial robustness.** The authors explicitly acknowledge "our proposed policies may be vulnerable to adversarial manipulation." Link farms could game QMin by ensuring one high-quality inlink to each spam page (though the `min` operator provides some defense).

4. **Quality estimator bias.** QT5 was trained on MS MARCO, which skews toward informational web queries. B2B company pages (careers, team, pricing) may not align with MS MARCO's quality distribution. A domain-specific quality model would be needed.

5. **Single seed strategy.** 100K random seeds on ClueWeb22-B. The paper does not study sensitivity to seed quality or seed selection strategy.

6. **Scale questions.** 29M pages crawled from 87M available. Behavior at smaller scales (our target: thousands of B2B pages) is untested. Quality propagation needs sufficient graph density to be meaningful.

### Integration-Specific Risks

7. **Frontier update cost.** QMin requires decrease-key operations on the priority queue. The current `FrontierPriorityHeap` uses a Python `heapq` which does not support efficient decrease-key. Lazy deletion doubles space; an indexed heap adds code complexity.

8. **Cold start.** QMin's quality propagation requires multiple pages to be crawled before meaningful scores accumulate. In early crawling stages, it degrades to QFirst (single-parent quality).

9. **Domain mismatch.** QT5-Small is trained on general web quality. B2B lead pages (pricing pages, team pages, contact forms) have different quality characteristics than informational content. The quality model may need domain adaptation.

10. **Memory overhead.** Maintaining min-quality for every URL in the frontier adds ~8 bytes per URL. At 1M frontier URLs, this is only ~8 MB --- negligible on M1 16 GB.

---

## Verdict: 4/5 Applicability

### Score Justification

**Why 4 (strong fit, not perfect):**

**Strong positives:**
- The `min`-propagation idea is **directly implementable** on top of the existing frontier infrastructure with minimal changes. The `FrontierPriorityHeap` + SQLite cold storage already manages priorities; adding a `min`-update is a focused modification.
- The existing `ContentQualityScorer` already produces a 0-1 quality signal that can serve as the QMin input, meaning **zero additional model overhead** for a first implementation.
- The `parent_page_quality` field in `LinkFeatures` proves the codebase already models this relationship --- QMin is a principled upgrade from "parent quality" to "minimum ancestor quality."
- Natural fit with the two-layer architecture: QMin handles **graph-level** frontier ordering while DQN handles **page-level** action selection. They operate on orthogonal signal types.
- Apache-2.0 reference implementation available for algorithm verification.
- O(1) per-page complexity, no external dependencies for the propagation logic itself.

**Deductions:**
- The 1.6x speedup was measured on a **general web corpus** (ClueWeb22-B) with general queries. B2B lead generation operates on a narrow domain with specialized quality criteria. The speedup may be smaller or require a domain-adapted quality model.
- Simulated-only evaluation --- no evidence the approach works under real-world crawling constraints (politeness, failures, timeouts) already handled by the Scrapus engine.
- The `min` operator is aggressive --- a single low-quality page linking to a valuable B2B target (e.g., a directory site linking to a startup's careers page) would permanently depress that URL's priority. A **softmin** or **percentile** variant might be more appropriate for B2B lead gen.

### Recommended Implementation Path

1. **Week 1:** Add `min`-propagation to `FrontierPriorityHeap` using the existing `overall_quality` score from `ContentQualityScorer`. Use lazy-deletion approach for simplicity.
2. **Week 2:** Add QMin frontier priority as a scalar feature in the DQN state vector. Retrain DQN with quality-propagation signal.
3. **Week 3:** A/B test against current UCB1-only frontier ordering. Measure harvest rate (leads found / pages crawled) on live B2B crawls.
4. **If positive:** Investigate replacing the rule-based quality scorer with a distilled neural model (MLP on nomic embeddings) trained on accumulated crawl data with lead-quality labels.

---

## References

- Pezzuti, F., MacAvaney, S., & Tonellotto, N. (2025). Neural Prioritisation for Web Crawling. *ACM ICTIR 2025*. [arXiv:2506.16146](https://arxiv.org/abs/2506.16146)
- Chang, X., MacAvaney, S., & Tonellotto, N. (2024). Neural Passage Quality Estimation for Static Pruning. *ACM SIGIR 2024*. [arXiv:2407.12170](https://arxiv.org/abs/2407.12170)
- McCallum, A., Nigam, K., Rennie, J., & Seymore, K. (2000). Automating the Construction of Internet Portals with Machine Learning. *Information Retrieval, 3*(2), 127--163.
- Avratchenkov, K. et al. (2021). Deep Reinforcement Learning for Web Crawling. *IEEE ICC 2021*.
