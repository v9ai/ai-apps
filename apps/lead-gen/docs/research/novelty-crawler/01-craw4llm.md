# Craw4LLM -- Deep Dive

> **Paper:** Shi Yu, Zhiyuan Liu, Chenyan Xiong. "Craw4LLM: Efficient Web Crawling for LLM Pretraining." Findings of ACL 2025, pp. 13843--13851, Vienna, Austria.
> **arXiv:** [2502.13347](https://arxiv.org/abs/2502.13347) (submitted 2025-02-19, revised 2025-06-23)
> **Code:** [github.com/cxcscmu/Craw4LLM](https://github.com/cxcscmu/Craw4LLM) (MIT License)
> **Affiliations:** Tsinghua University + Carnegie Mellon University (Language Technologies Institute)

---

## Paper Summary

Craw4LLM replaces graph-connectivity-based URL prioritization (PageRank, indegree, harmonic centrality) with a **pretraining influence scorer** that estimates each page's downstream value for LLM training. The core finding: traditional crawlers waste over 90% of fetched pages because graph-popularity does not correlate with training quality (Spearman rho = -0.11 between DCLM fastText score and indegree). By integrating a content-quality signal directly into the crawl frontier, Craw4LLM achieves **95.3% of oracle performance while crawling only 21% of the URLs** required by indegree-based baselines.

The paper is narrow in scope but clean in execution: a single algorithmic change (swap the priority function) tested at scale (900M pages) with end-to-end LLM pretraining evaluation (411M-param Transformer, 32.9B tokens, 23 downstream tasks).

---

## Architecture & Algorithms

### Core Algorithm (Algorithm 1)

```
Input:  Seed URLs U_seed, target doc count N, batch size n, scorer M
Output: Crawled page set P

1.  Q <- empty priority queue
2.  P <- empty set
3.  V <- U_seed  (visited set)
4.  U_c <- U_seed  (current batch)
5.  while |P| <= N:
6.      P_c <- FetchPages(U_c)
7.      P <- P union P_c
8.      U_out <- ExtractURLs(P_c)         # outlinks from fetched pages
9.      for each v in U_out:
10.         if v not in V:
11.             score <- M(FetchPage(v))   # score the *content* of v
12.             Enqueue(Q, v, score)
13.             V <- V union {v}
14.     U_c <- Dequeue(Q, n)               # top-n by score
15. return P
```

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Priority function | Content-quality score from fastText/FineWeb-Edu classifier | Indegree has rho=-0.11 with training quality |
| Queue structure | Python `heapq` (min-heap with negated scores) | Simple, O(log n) push/pop |
| Batch size per iteration | 10,000 docs | Balances exploration/exploitation on 900M graph |
| Total crawl target | 20M docs (1x dataset) | Matches DCLM-baseline training recipe |
| Seed strategy | 10,000 random URLs from ClueWeb22 | Avoids seed bias |

### Scoring Mechanism

The URL scoring function is:

```
Score_URL(u; M) = M(FetchPage(u))
```

where `M` is one of:

1. **DCLM fastText classifier** -- binary fastText model (bigram features, 200K training examples per class) distinguishing OpenHermes 2.5 + Reddit ELI5 (positive) from RefinedWeb (negative). Top-10% selection threshold.
2. **FineWeb-Edu classifier** -- Snowflake-arctic-embed-m fine-tuned on 450K LLM-annotated samples (Llama-3-70B-Instruct scoring 0-5 educational quality). Threshold at score >= 3.

Critical observation: **the scorer requires fetching the page content** (line 11 in the algorithm). This means every outlink must be fetched to be scored, making "visited" documents (V) much larger than "selected" documents (P). The paper reports Craw4LLM visits ~48% of the pages an indegree crawler would need.

### Score Correlations Across Links

The paper demonstrates that pretraining influence scores propagate through the link graph:
- 1-hop outlink correlation: Spearman rho = 0.61
- 2-hop outlink correlation: Spearman rho = 0.60

This is the structural insight that makes the greedy priority-queue approach work: high-quality pages tend to link to other high-quality pages.

---

## Benchmarks & Results

### Experimental Setup

| Parameter | Value |
|---|---|
| Web graph | ClueWeb22-A English subset, 900M pages |
| Seed URLs | 10,000 (randomly sampled) |
| Target dataset | 20M documents |
| LLM architecture | 411M-param decoder-only Transformer |
| Training tokens | 32.9B (4x Chinchilla-optimal) |
| Training infra | 8x NVIDIA L40S, ~36 hours |
| Evaluation | 23 core tasks (DCLM recipe) |
| Metric | Centered accuracy (0 = random guess) |

### Main Results (Table 1)

#### DCLM fastText as Scorer

| Method | Pool Size | Core Score | % of Oracle |
|---|---|---|---|
| Oracle | 45x | 0.2239 | 100% |
| Craw4LLM | **1x** | **0.2133** | **95.3%** |
| Random + select | 2x | 0.1964 | 87.7% |
| Indegree + select | 2x | 0.1865 | 83.3% |
| Random (no select) | 1x | 0.1748 | 78.1% |
| Indegree (no select) | 1x | 0.1556 | 69.5% |

#### FineWeb-Edu as Scorer

| Method | Pool Size | Core Score | % of Oracle |
|---|---|---|---|
| Oracle | 45x | 0.2133 | 100% |
| Craw4LLM | **1x** | **0.2043** | **95.8%** |
| Random + select | 2x | 0.1807 | 84.7% |
| Indegree + select | 2x | 0.1724 | 80.8% |

### Efficiency Metrics

- Craw4LLM at 1x matches the estimated performance of indegree crawler at **4.8x** (96M docs)
- Crawled documents: **21%** of what indegree needs for same performance
- Visited documents: **48%** of what indegree needs
- Oracle precision saturates to 1.0 within first 13M docs crawled, then degrades due to graph disconnectedness

### Per-Category Breakdown (Craw4LLM with DCLM fastText, 1x)

| Category | Tasks | Score |
|---|---|---|
| Selection | 4 | 0.2116 |
| Commonsense Reasoning | 6 | 0.2311 |
| Language Understanding | 5 | 0.0826 (weakest) |
| Reading Comprehension | 3 | 0.1979 |
| Symbolic Problem Solving | 5 | 0.2486 (strongest) |
| World Knowledge | 5 | 0.2133 |

### Simulation Runtime

| Crawler | Time (on 16-core Xeon + SSD) |
|---|---|
| Craw4LLM | ~21 hours |
| Indegree | ~12.5 hours |
| Random | ~10.5 hours |

The 2x overhead of Craw4LLM comes from scoring every outlink with fastText (vs. simple indegree lookup).

---

## GitHub Repository

### Repository Metadata

| Field | Value |
|---|---|
| URL | https://github.com/cxcscmu/Craw4LLM |
| License | MIT |
| Stars | ~650 |
| Forks | ~60 |
| Open Issues | 4 |
| Total Commits | 8 |
| Last Commit | 2025-02-24 |
| Python | >= 3.10 |

### Code Structure

```
cxcscmu/Craw4LLM/
  crawl.py              # CLI entry point (crawl | rate modes)
  crawler.py            # Crawler class: priority queue, outlink expansion, scoring
  document_rater.py     # Plugin system: RandomRater, DocumentLengthRater,
                        #   InlinkCountRater, FasttextRater, EnsembleRater
  corpus_interface.py   # ClueWeb22 dataset access layer
  fetch_docs.py         # Bulk document text extraction
  normalizer.py         # Text normalization for fastText
  access_data.py        # Interactive data browser
  utils.py              # Logging, correlation analysis, visualization
  wandb_logger.py       # Weights & Biases experiment tracking
  seed.txt              # Default 10K seed document IDs
  configs/              # YAML config files
  fasttext_scorers/     # Directory for DCLM fastText model binaries
```

### Dependencies

```
numpy
tqdm
fasttext
pyyaml
wandb
scipy  (for analysis only)
```

### Key Configuration (YAML)

```yaml
cw22_root_path: /path/to/clueweb22
num_selected_docs_per_iter: 10000
num_workers: 16
max_num_docs: 20000000
selection_method: dclm_fasttext_score   # or: random_score, inlink_count
order: descending
rating_methods:
  - name: fasttext_score
    model: openhermes_reddit_eli5_vs_rw_v2_bigram_200k_train.bin
save_state_every: 400
wandb: true
```

### CLI Interface

```bash
# Main crawl
python crawl.py crawl --config configs/dclm_fasttext.yaml

# Rate existing documents
python crawl.py rate --config configs/rate_config.yaml

# Extract document texts
python fetch_docs.py --input_dir ids/ --output_dir texts/ --num_workers 16

# Browse individual documents
python access_data.py /path/to/clueweb22 clueweb22-en0000-00-00000
```

### Architecture of Document Raters

The `DocumentRater` abstract base class provides a plugin interface:

```python
class DocumentRater:
    _name: str
    _require_doc_text: bool

    def __call__(self, docs: list[Document]) -> list[Document]:
        # Append score to doc.annotations[self._name]
        ...
```

Concrete implementations:
- **`FasttextRater`**: Loads the DCLM model via `fasttext.load_model()`. Scores text; inverts probability when predicted label is `__label__cc` (low quality). Parallelizes via `multiprocessing.Pool` for batches > 100K docs.
- **`InlinkCountRater`**: Counts inlinks from `UnifiedGetter`. Multiprocessing for > 20K docs.
- **`EnsembleRater`**: Weighted average of multiple raters.
- **`RandomRater`**: Random float [0, 1] -- baseline.
- **`DocumentLengthRater`**: Character count -- ablation.

### Caveats

1. **Tightly coupled to ClueWeb22** -- the `corpus_interface.py` and `UnifiedGetter` are built around ClueWeb22's binary format. Adapting to live crawling requires replacing the entire data access layer.
2. **No live HTTP fetching** -- this is a crawl *simulator*, not a production crawler. All "fetches" are lookups into the ClueWeb22 snapshot on disk.
3. **Low commit activity** -- 8 commits total, last activity Feb 2025. Research-grade code, not maintained as a library.
4. **SSD required** -- random access to 900M documents demands SSD. README explicitly states this.

---

## Integration with DQN Crawler

### The Gap Between Craw4LLM and RL-Based Crawling

Craw4LLM uses **no reinforcement learning**. It is a greedy, static scoring approach: score each page with a fixed classifier, enqueue by score, dequeue top-n. There is no learning from crawl outcomes, no reward signal, no policy gradient, no exploration-exploitation tradeoff.

This is both its strength (simplicity, reproducibility) and its limitation (no adaptation to the evolving frontier).

### How a DQN Crawler Differs

Based on the RL-focused crawling literature (Avratchenkov et al. 2021, "Deep Reinforcement Learning for Web Crawling"; De Masi & Nematzadeh 2022, "Tree-based Focused Web Crawling with RL"):

| Aspect | Craw4LLM | DQN Crawler |
|---|---|---|
| Priority function | Fixed classifier (fastText) | Learned Q-function |
| Adaptation | None -- same scorer throughout | Learns from crawl rewards |
| Exploration | Greedy (always top-n) | Epsilon-greedy or Boltzmann |
| State representation | None (stateless scoring) | Graph structure + features |
| Reward signal | None | Page relevance / quality |
| Action space | All outlinks (scored independently) | Select next URL from frontier |
| Scalability | Excellent (fastText is O(1) per doc) | Challenging (state grows with graph) |

### Proposed Integration: fastText Pre-Filter + DQN Selector

The key insight from Craw4LLM applicable to a B2B lead-gen DQN crawler is the **two-stage architecture**:

```
Stage 1: fastText Pre-Filter (from Craw4LLM)
  - Score every discovered URL's page content with a domain-adapted fastText classifier
  - Discard URLs scoring below threshold (e.g., bottom 70%)
  - This reduces the DQN's action space by 3-10x

Stage 2: DQN URL Selector (existing lead-gen crawler)
  - State: graph features + page embeddings + crawl history
  - Action: select next URL from pre-filtered frontier
  - Reward: lead quality signal (company match, job relevance, contact found)
  - The DQN now operates on a curated frontier rather than raw outlinks
```

### Concrete Implementation Path

1. **Train a domain-specific fastText classifier** for B2B lead relevance:
   - Positive class: pages from known good lead sources (company career pages, job boards, company "About" pages with team info)
   - Negative class: random web pages, social media, news, forums
   - Training data: ~50K-100K labeled URLs from existing crawl history
   - Output: binary classifier with confidence score

2. **Integrate as a pre-filter in the DQN crawler's frontier management:**
   ```python
   # In the crawl loop, before adding to DQN's replay buffer:
   def expand_frontier(self, parent_url, outlinks):
       scored = self.fasttext_scorer.predict_batch(outlinks)
       filtered = [(url, score) for url, score in scored if score > THRESHOLD]
       for url, ft_score in filtered:
           state = self.build_state(url, parent_url, ft_score)
           self.frontier.add(url, state)
   ```

3. **Use the fastText score as a feature in the DQN state vector:**
   - Add `ft_relevance_score` as a continuous feature [0, 1] in the state representation
   - This gives the DQN a "prior" on URL quality without having to learn it from scratch
   - The DQN can then focus on learning sequential/strategic aspects (exploration patterns, domain diversity, politeness scheduling)

4. **Reward shaping with fastText scores:**
   - Immediate reward: `r_immediate = alpha * ft_score + (1 - alpha) * lead_quality_signal`
   - This provides denser rewards early in training when the DQN hasn't converged
   - Anneal alpha from 0.8 to 0.0 over training to shift toward pure lead quality

### Key Adaptations Needed

| Craw4LLM Component | Adaptation for B2B Lead-Gen |
|---|---|
| DCLM fastText (LLM quality) | Retrain on lead-relevance labels |
| ClueWeb22 data layer | Replace with live HTTP fetcher + HTML parser |
| Priority queue (greedy) | Feed into DQN action space |
| 10K batch size | Reduce to 50-200 (politeness constraints) |
| No robots.txt/politeness | Add full politeness stack |
| No deduplication | Add URL canonicalization + content dedup |
| Simulation only | Production crawl engine needed |

### Borrowable Code Components

From the Craw4LLM repo, directly reusable pieces:

1. **`document_rater.py`** -- the plugin architecture for scoring. The `DocumentRater` ABC and `FasttextRater` can be adapted almost directly.
2. **`normalizer.py`** -- text normalization pipeline for fastText input.
3. **`EnsembleRater`** -- weighted combination of multiple signals (fastText + domain heuristics + DQN confidence).
4. **Priority queue management** from `crawler.py` -- the heap-based queue with memory limits and checkpointing.

---

## Risks & Limitations

### Paper-Level Limitations

1. **Simulation only** -- all experiments run on a static ClueWeb22 snapshot, not live web. The paper explicitly acknowledges this: "further validation is required to assess effectiveness in real-world crawling scenarios."

2. **Missing real-world crawler policies** -- no re-visit policy, no politeness policy, no parallelization policy. The paper only implements the *selection* policy.

3. **Single dataset** -- all experiments on ClueWeb22-A (900M English pages from a Bing index snapshot). No cross-dataset validation.

4. **Single model scale** -- only 411M-param models evaluated. Unknown if the quality signal transfers to larger models.

5. **Scorer fetches every outlink** -- the algorithm requires fetching page content for every discovered URL to compute its score. In a live crawl, this means visiting (but not necessarily retaining) far more pages than a pure graph-based approach, potentially *increasing* server load despite reducing dataset waste.

6. **No handling of dynamic content** -- web pages change over time. A score computed at discovery time may not reflect the content at fetch time.

7. **Seed sensitivity** -- only tested with random seeds. For domain-specific crawling (like B2B lead gen), seed selection is critical and untested.

### Repository-Level Risks

1. **Research prototype** -- 8 commits, last active Feb 2025, 4 open issues. Not production-grade.
2. **ClueWeb22 dependency** -- requires a licensed dataset from CMU ($X,XXX for academic, more for commercial). Not usable out of the box for other data sources.
3. **No tests** -- zero test files in the repository.
4. **No CI/CD** -- no GitHub Actions, no automated checks.
5. **fastText dependency** -- the `fasttext` Python package is effectively abandonware (Facebook Research moved to other projects). Last PyPI release was 2024.

### Integration Risks for Lead-Gen Pipeline

1. **Domain transfer** -- DCLM fastText is trained for LLM pretraining quality, not B2B lead relevance. A new classifier must be trained.
2. **Latency** -- fastText inference is fast (~microseconds per doc) but HTML fetching + parsing for pre-scoring adds latency to the crawl loop.
3. **Label quality** -- training a good pre-filter requires labeled data. For B2B lead-gen, this means curating positive/negative URL examples.
4. **Threshold tuning** -- the paper uses top-10% selection. For lead-gen, the optimal threshold depends on the lead funnel and is a hyperparameter.

---

## Follow-Up Work & Citations

### Confirmed Citations (as of March 2026)

1. **"Neural Prioritisation for Web Crawling"** (Pezzuti, MacAvaney, Tonellotto, ICTIR 2025)
   - Cites Craw4LLM as a concurrent approach but distinguishes itself by targeting generic web search quality (not LLM pretraining)
   - Uses QT5-Small neural quality estimator with quality propagation through link neighborhoods
   - No RL -- supervised quality estimation
   - Results: +149% harvest rate, 1.6x speedup over BFS

2. **"Reinforcement Learning Meets Large Language Models: A Survey"** (arXiv:2509.16679, 2025)
   - Survey paper covering RL across the LLM lifecycle, references Craw4LLM in data collection context

3. **Multiple forks and mirrors** (devenc/Crawl4LLM, srsman/Crawl4LLM) -- community interest but no substantive extensions

### Related Prior Work (RL + Crawling)

- **Avratchenkov et al., "Deep Reinforcement Learning for Web Crawling"** (ICC 2021) -- DQN for multi-arm restless bandit formulation of crawling. Demonstrated DRL outperforms baselines but on small-scale experiments.
- **De Masi & Nematzadeh, "Tree-based Focused Web Crawling with RL"** (arXiv:2112.07620) -- DDQN with tree-frontier discretization to reduce action space. State: (parent reward, distance to relevant node, path relevance ratio). Pareto-dominates prior focused crawlers.
- **DCLM (Li et al., NeurIPS 2024)** -- the upstream project providing the fastText classifier that Craw4LLM builds upon.

---

## Verdict: 3.5 / 5 Applicability Score

### Justification

**What is directly useful (high value):**
- The core insight that content-quality pre-filtering dramatically reduces crawler waste is directly applicable to a B2B lead-gen pipeline. The specific idea of using a lightweight classifier (fastText) as a pre-filter before a more expensive decision process (DQN) is sound and well-validated.
- The `DocumentRater` plugin architecture and `FasttextRater` implementation are clean, reusable code.
- The empirical evidence that high-quality pages cluster in the link graph (rho=0.61 at 1-hop) validates the DQN strategy of expanding from known-good pages.

**What requires significant adaptation (medium value):**
- The DCLM fastText classifier must be retrained for B2B lead relevance -- the existing model is useless for our domain.
- The entire data access layer (ClueWeb22-specific) must be replaced with a live HTTP crawler.
- The greedy priority queue must be adapted to feed a DQN rather than operate standalone.

**What is not applicable (low value):**
- The specific LLM pretraining evaluation framework (411M models, DCLM recipe).
- The ClueWeb22 simulation setup.
- The crawl-then-select baselines (we need real-time selection, not post-hoc filtering).

**Why not higher:**
- No RL component means the core algorithm cannot be directly dropped into a DQN pipeline -- it is an adjacent technique to be composed with RL.
- Research prototype quality (8 commits, no tests, no live crawling).
- Single-dataset evaluation raises generalization concerns.

**Why not lower:**
- The fastText pre-filter idea is novel, well-validated, and directly reduces the hardest problem in RL-based crawling: action space explosion.
- MIT license enables unrestricted commercial use.
- The code is clean Python with minimal dependencies.
- The 0.61 link-quality correlation finding has direct implications for our DQN reward shaping.

### Bottom Line

Craw4LLM is not a drop-in component but a validated design pattern: **use a cheap, fast content classifier to prune the crawl frontier before applying expensive decision logic.** For a DQN-based lead-gen crawler, this translates to: train a domain-specific fastText model on lead-relevance labels, use it to filter 70-90% of discovered URLs, and let the DQN focus its limited capacity on strategic exploration within the pre-filtered frontier. The expected gain is faster DQN convergence and higher lead yield per crawled page.

---

## Sources

- [arXiv:2502.13347 -- Craw4LLM Paper](https://arxiv.org/abs/2502.13347)
- [ACL Anthology -- Findings of ACL 2025](https://aclanthology.org/2025.findings-acl.712/)
- [GitHub -- cxcscmu/Craw4LLM](https://github.com/cxcscmu/Craw4LLM)
- [HuggingFace -- DCLM fastText Model](https://huggingface.co/mlfoundations/fasttext-oh-eli5)
- [DCLM GitHub -- mlfoundations/dclm](https://github.com/mlfoundations/dclm)
- [Neural Prioritisation for Web Crawling (ICTIR 2025)](https://arxiv.org/html/2506.16146v2)
- [Tree-based Focused Web Crawling with RL](https://arxiv.org/abs/2112.07620)
- [Deep RL for Web Crawling (ICC 2021)](https://ieeexplore.ieee.org/document/9703160/)
- [Emergent Mind -- Craw4LLM Analysis](https://www.emergentmind.com/papers/2502.13347)
- [Moonlight Literature Review](https://www.themoonlight.io/en/review/craw4llm-efficient-web-crawling-for-llm-pretraining)
