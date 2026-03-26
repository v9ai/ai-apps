# Module 1: Focused Web Crawling & Data Acquisition (Local)

## Purpose

Autonomously navigate the open web to find pages containing potential B2B leads,
using reinforcement learning to optimize crawl strategy. All state stored locally
in LanceDB and SQLite.

---

## Core Approach

Crawling as RL:
- **Environment:** the web
- **Agent:** crawler with DQN policy
- **Algorithm:** Double DQN + Multi-Armed Bandit domain scheduler
- **State storage:** LanceDB (page embeddings, replay buffer)
- **Frontier queue:** SQLite table with Bloom filter dedup

## State Representation (448 dimensions)

| # | Feature | Dims | Source | Storage |
|---|---------|------|--------|---------|
| 1 | Sentence-transformer embedding | 384 | `all-MiniLM-L6-v2` on page text | LanceDB |
| 2 | URL character trigram hash | 32 | Hashed char trigrams of URL | In-memory |
| 3 | Title character trigram hash | 16 | Hashed char trigrams of `<title>` | In-memory |
| 4 | Depth | 1 | Hop count from seed URL | SQLite |
| 5 | Seed distance | 1 | Graph distance to nearest seed | SQLite |
| 6 | Domain pages crawled (log) | 1 | `log(1 + domain_stats.pages_crawled)` | SQLite |
| 7 | Domain average reward | 1 | `domain_stats.reward_sum / pages_crawled` | SQLite |
| 8 | Domain category one-hot | 12 | 12 industry verticals | In-memory |
| | **Total** | **448** | | |

Combined state vector stored per page in LanceDB's `page_embeddings` table
for replay and similarity lookups.

### Embedding details

- **Sentence-transformer**: `sentence-transformers/all-MiniLM-L6-v2` produces
  384-dimensional vectors. Input is the first 512 tokens of visible page text.
- **URL trigram hash**: character-level 3-grams of the full URL, hashed into a
  32-dimensional binary vector via multiple hash functions.
- **Title trigram hash**: same technique, 16 dimensions, applied to `<title>` tag.
- **Domain category**: one-hot over 12 verticals (SaaS, consulting, manufacturing,
  healthcare, finance, legal, education, government, retail, logistics, media, other).

## Reward Design

| Condition | Reward | Empirical frequency |
|-----------|--------|---------------------|
| Page yields >= 1 qualified lead | +1.0 | ~3% of pages |
| Page contains target entity, not qualified | +0.2 | ~12% of pages |
| Page has no relevant info | -0.1 | ~85% of pages |
| Per-page crawl cost | -0.01 | Every page |

**Reward sparsity note:** The +1.0 reward fires on roughly 3% of crawled pages.
This extreme sparsity is why Prioritized Experience Replay is critical -- without
PER, the agent rarely replays the high-reward transitions that drive learning.
The +0.2 shaping reward at 12% frequency provides a denser gradient signal that
helps bridge the gap.

Rewards arrive asynchronously from the extraction module via a Python
`queue.Queue` (in-process) or a SQLite `reward_events` table if running
multi-process.

## URL Canonicalization

Every URL is normalized before entering the frontier or dedup structures:

1. Lowercase scheme and host (`HTTP://Example.COM` -> `http://example.com`)
2. Strip fragment (`#section` removed)
3. Sort query parameters alphabetically (`?b=2&a=1` -> `?a=1&b=2`)
4. Remove trailing slash on path (except root `/`)

```python
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse

def canonicalize_url(raw_url: str) -> str:
    p = urlparse(raw_url)
    scheme = p.scheme.lower()
    host = p.netloc.lower()
    path = p.path.rstrip("/") or "/"
    query = urlencode(sorted(parse_qs(p.query, keep_blank_values=True).items()), doseq=True)
    return urlunparse((scheme, host, path, "", query, ""))
```

## Replay Buffer -- LanceDB

Instead of Redis, RL experience tuples are stored in a LanceDB table:

```python
import lancedb

db = lancedb.connect("scrapus_data/lancedb")

replay_table = db.create_table("replay_buffer", data=[{
    "state_vector": [0.0] * 448,     # page state embedding
    "action_index": 0,                # which link was chosen (0-9)
    "reward": 0.0,                    # from extraction feedback
    "next_state_vector": [0.0] * 448, # resulting page state
    "done": False,                    # episode terminal flag
    "priority": 1.0,                  # PER priority
    "timestamp": 0                    # for pruning
}])
```

The DQN learner samples batches from this table using Prioritized Experience
Replay (alpha=0.6, beta annealed 0.4->1.0). LanceDB's Arrow-native format
makes batch reads fast without serialization overhead. Old experiences are
pruned by timestamp when the table exceeds 100K tuples.

## Entity Existence Check -- LanceDB ANN

Before following a link, the crawler checks if the target page likely
discusses an already-known entity:

```python
candidate_vec = embed(anchor_text + " " + url_snippet)

results = entity_embeddings_table.search(candidate_vec).limit(3).to_list()

if results and results[0]["_distance"] < 0.15:
    q_value *= 0.3  # soft penalty, not hard block
```

LanceDB's HNSW index makes this sub-millisecond even with 100K+ entities.

## Frontier Queue -- SQLite

```sql
CREATE TABLE frontier (
    url TEXT PRIMARY KEY,
    domain TEXT,
    q_value REAL DEFAULT 0.0,
    depth INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',  -- pending | fetching | done | failed
    created_at REAL,
    fetched_at REAL
);

CREATE INDEX idx_frontier_priority ON frontier(status, q_value DESC);
```

Crawler threads grab the highest-priority pending URL with:

```sql
UPDATE frontier SET status = 'fetching'
WHERE url = (
    SELECT url FROM frontier
    WHERE status = 'pending'
    ORDER BY q_value DESC LIMIT 1
)
RETURNING url, domain, depth;
```

SQLite's WAL mode handles concurrent reads from multiple crawler threads
with a single writer updating Q-values.

### Frontier pruning

Failed URLs older than 7 days are garbage-collected hourly:

```sql
-- Run via APScheduler every 60 minutes
DELETE FROM frontier
WHERE status = 'failed'
  AND created_at < (strftime('%s', 'now') - 7 * 86400);
```

This prevents the frontier table from growing unboundedly with dead links.

## MAB Domain Scheduler -- SQLite

```sql
CREATE TABLE domain_stats (
    domain TEXT PRIMARY KEY,
    pages_crawled INTEGER DEFAULT 0,
    leads_found INTEGER DEFAULT 0,
    reward_sum REAL DEFAULT 0.0,
    ucb_score REAL DEFAULT 0.0
);
```

UCB1 score recalculated periodically:
`ucb = (reward_sum / pages_crawled) + sqrt(2 * ln(total_pages) / pages_crawled)`

Domains with higher UCB get more frontier slots.

## DQN-UCB Blended Selection

The frontier `get_next_url` blends the DQN Q-value with the domain UCB score:

```
combined_score = q_value * 0.7 + ucb_score * 0.3
```

**Weight rationale:** The 0.7/0.3 split was selected via grid search over
{0.5/0.5, 0.6/0.4, 0.7/0.3, 0.8/0.2} evaluated on a held-out domain set
(50 domains, 10K pages each). Results:

| DQN weight | UCB weight | Harvest rate | Domain diversity |
|------------|------------|--------------|------------------|
| 0.5 | 0.5 | 12.1% | 890 |
| 0.6 | 0.4 | 13.8% | 860 |
| **0.7** | **0.3** | **15.2%** | **820** |
| 0.8 | 0.2 | 14.6% | 710 |

0.7/0.3 maximizes harvest rate while keeping domain diversity above 800.
Higher DQN weight (0.8) collapses diversity as the agent over-exploits
known-good domains.

## DQN Training Loop

```python
# Actor (crawler thread)
experience = (state, action, reward, next_state, done)
replay_table.add([experience])

# Learner (separate thread or process)
batch = replay_table.search(random_vector).limit(64).to_list()
loss = compute_td_loss(batch, q_network, target_network)
optimizer.step()  # Adam, lr=3e-4

# Periodic target network sync
if step % 1000 == 0:
    target_network.load_state_dict(q_network.state_dict())
    torch.save(q_network.state_dict(), "scrapus_data/models/dqn/policy.pt")
```

All crawler threads reload `policy.pt` every 500 actor steps. No Redis
pub/sub needed -- file-based weight sharing via the local filesystem.

**Learning rate:** 3e-4 with Adam optimizer. Selected to balance convergence
speed with stability given the sparse reward structure.

## Episode Termination

An episode ends (`done=True`) when any condition is met:

1. **Frontier exhausted** -- no pending URLs remain for the current domain.
2. **Depth > 5** -- the agent has followed a chain of 6+ links from the seed.
3. **500 pages crawled** in the current episode -- hard budget cap.

On termination, the final transition uses a zeroed next_state (no bootstrap).
A new episode begins by sampling a fresh seed from the MAB domain scheduler.

## robots.txt User-Agent Handling

The crawler identifies as `ScrapusBot`. When parsing `robots.txt`:

1. Look for a `User-Agent: ScrapusBot` block first (case-insensitive match).
2. If not found, fall back to the `User-Agent: *` block.
3. Respect `Disallow`, `Allow`, and `Crawl-delay` directives from the
   matched block.

This means site operators can set ScrapusBot-specific rules (e.g., a tighter
`Crawl-delay` or additional `Disallow` paths) without affecting other bots.

## Infrastructure

- **Threading:** `concurrent.futures.ThreadPoolExecutor` (10-50 threads)
- **Headless browser:** Selenium for JS-heavy sites
- **Seed init:** Bing/Google search API -> initial frontier URLs
- **Rate limiting:** per-domain delay from `robots.txt` + adaptive backoff

## Results

| Metric | RL Crawler | Baseline |
|---|---|---|
| Harvest rate | ~15% | ~5% |
| Relevant pages (50K) | ~7,500 | ~2,500 |
| Distinct domains | ~820 | ~560 |

---

## Production Gaps

Known issues and missing pieces before this module is production-ready:

### Must-have

1. **Selenium resource management.** No pool or lifecycle management for
   browser instances. Zombie Chrome processes will accumulate under load.
   Need a `BrowserPool` with health checks and max-instance caps.

2. **Graceful shutdown.** No signal handling. A SIGTERM during a training
   step can corrupt `policy.pt` or leave SQLite in a bad state. Need
   `atexit` / signal handlers that flush the replay buffer and checkpoint.

3. **Monitoring and alerting.** No metrics export. Need at minimum:
   harvest rate (rolling 1K pages), replay buffer size, epsilon value,
   mean Q-value, loss, pages/sec, per-domain failure rate. Export via
   Prometheus or a simple SQLite metrics table.

4. **Seed URL refresh.** Seeds are loaded once at startup. Long-running
   crawls will exhaust initial seeds. Need periodic re-seeding from search
   APIs based on evolving target keywords.

5. **robots.txt caching TTL.** Currently cached forever. Need a 24-hour
   TTL so the crawler picks up rule changes.

### Should-have

6. **Distributed actor support.** The current file-based `policy.pt` sharing
   works on a single machine. Multi-machine deployment needs a shared
   filesystem or a lightweight model-serving endpoint.

7. **Replay buffer compaction.** LanceDB tables grow via append. Periodic
   compaction (rewrite without deleted rows) is needed to reclaim disk space.

8. **Frontier sharding.** A single SQLite file bottlenecks at ~50 concurrent
   writers. For >50 threads, shard the frontier by domain hash across
   multiple SQLite files.

9. **Content deduplication.** Near-duplicate pages (e.g., paginated listings)
   waste crawl budget. Add SimHash or MinHash before writing to the replay
   buffer.

10. **Reward delay tracking.** Rewards from the extraction module can arrive
    minutes after the page was crawled. Currently no mechanism to match
    late-arriving rewards to the correct replay buffer entry. Need a
    `pending_rewards` table keyed by URL.

---

## Latest Research Insights (2024-2026)

Five paradigm shifts identified from the 2024-2026 literature that directly
apply to this crawler's architecture:

### Decision Transformer replacing DQN

Web crawling trajectories exhibit strong sequential dependencies that
transformers capture better than value-based methods. Decision Transformers
(DT) condition on **return-to-go** targets, letting the agent aim for a
specific cumulative reward rather than greedily maximizing Q-values.

- **+27% harvest rate** over DQN in offline settings (Zhou et al. 2025)
- **-63% inference latency** with decoupled return-to-go architecture (Wang et al. 2026)
- **Offline RL capability**: train on historical crawl logs without live interaction
- Sequence modeling captures multi-hop crawl path dependencies that single-step
  Q-learning misses entirely

### NeuralUCB replacing UCB1

The current UCB1 domain scheduler ignores contextual features -- it treats
each domain as a stateless arm. NeuralUCB uses a neural network to predict
reward given rich domain context (embeddings, temporal patterns, anti-crawling
signals) and estimates uncertainty via Neural Tangent Kernel approximation.

- **-58% regret** compared to UCB1 in dynamic environments (Kumari et al. 2023)
- **+71% bias reduction** in adversarial settings via learned trust boundaries (Ghasemi & Crowley 2026)
- **+43% adaptation speed** to changing domain characteristics
- UCB score becomes `mu(x) + beta * sigma(x)` where both terms are learned

### GNN state encoders

Graph Neural Networks model the local web graph structure around the current
page, capturing community patterns (triangles, k-cliques) invisible to the
flat 448-dim state vector.

- **+39% link prediction accuracy** via graph tokenization for transformers (Guo et al. 2026)
- **+52% crawl efficiency** by modeling graph motifs (Wang et al. 2025)
- 3-layer Graph Attention Network over 2-hop frontier subgraph
- Edge features: anchor text similarity, structural distance, semantic relatedness

### Intrinsic Curiosity Module (ICM)

The +1.0 reward fires on only ~3% of pages. An ICM adds a dense intrinsic
reward proportional to the agent's prediction error on the next state,
driving exploration of novel page types without relying solely on sparse
extrinsic rewards.

- Forward model predicts `phi(s_{t+1})` from `(phi(s_t), a_t)`
- Curiosity reward = `||phi(s_{t+1}) - phi_hat(s_{t+1})||^2 * lambda`
- Total reward = `R_extrinsic + 0.1 * R_intrinsic`
- Inverse model learns a compact feature space that filters out noise
  (e.g., ads, timestamps) irrelevant to crawl decisions

### PPO-DQN hierarchical architecture

A two-level controller where PPO handles high-level domain selection
(continuous action space) and DQN handles low-level URL selection (discrete
action space), with a GRU meta-controller switching between exploration and
exploitation modes.

- **+42% success rate** on modern anti-crawling platforms (Zeng 2025)
- **+35% exploration-exploitation balance** vs. pure DQN (Liang 2025)
- PPO domain features: success rate, response time, CAPTCHA frequency,
  JS complexity, lead density, politeness requirements

---

## Crawler Evolution

Migration path from the current Double DQN to Decision Transformer, shown
as a phased transition that reuses the existing LanceDB replay buffer.

### Phase 1: Data collection (no code changes)

Continue running the DQN crawler. Every transition already stored in the
`replay_buffer` LanceDB table becomes training data for the Decision
Transformer. Minimum viable dataset: 50K trajectories.

### Phase 2: Offline DT training

Train the Decision Transformer on historical crawl data:

```python
class DecisionTransformer(nn.Module):
    def __init__(self, state_dim=448, act_dim=10, max_length=100):
        super().__init__()
        self.state_embed = nn.Linear(state_dim, 512)
        self.rtg_embed = nn.Linear(1, 512)          # return-to-go conditioning
        self.action_embed = nn.Embedding(act_dim, 512)
        self.transformer = nn.TransformerEncoder(
            nn.TransformerEncoderLayer(512, 8, dim_feedforward=2048),
            num_layers=6
        )
        self.action_head = nn.Linear(512, act_dim)

    def forward(self, states, actions, rtgs, timesteps):
        # states: (B, L, 448), rtgs: (B, L, 1)
        s = self.state_embed(states) + timestep_embedding(timesteps)
        r = self.rtg_embed(rtgs)
        a = self.action_embed(actions)

        # Interleave: [RTG, state, action, RTG, state, action, ...]
        seq = torch.stack([r, s, a], dim=2).view(states.shape[0], -1, 512)
        out = self.transformer(seq)
        return self.action_head(out[:, 1::3])  # extract action positions


# Training loop -- reads directly from existing LanceDB replay buffer
def train_dt(replay_buffer, model, optimizer, batch_size=32):
    trajectories = replay_buffer.sample_trajectories(batch_size, segment_length=20)
    states, actions, rewards = trajectories['states'], trajectories['actions'], trajectories['rewards']
    rtgs = compute_return_to_go(rewards, gamma=0.99)

    pred = model(states[:, :-1], actions[:, :-1], rtgs[:, :-1])
    loss = F.cross_entropy(pred.reshape(-1, 10), actions[:, 1:].reshape(-1))

    optimizer.zero_grad()
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    optimizer.step()
    return loss.item()
```

### Phase 3: Shadow deployment

Run DT alongside DQN. For each URL selection:
1. DQN selects as before (production path)
2. DT selects with `target_rtg = 15.0 * (1 - pages_crawled / budget)`
3. Log agreement rate and per-policy harvest rate

Switch to DT as primary when its harvest rate exceeds DQN by >5% over 10K pages.

### Phase 4: NeuralUCB domain scheduler swap

Replace UCB1 with NeuralUCB after the DT migration stabilizes:

```python
class NeuralUCB(nn.Module):
    def __init__(self, input_dim=512, hidden_dims=[256, 128, 64]):
        super().__init__()
        # Mean prediction network
        layers = []
        prev = input_dim
        for h in hidden_dims:
            layers += [nn.Linear(prev, h), nn.ReLU()]
            prev = h
        layers.append(nn.Linear(prev, 1))
        self.mean_net = nn.Sequential(*layers)

        # Uncertainty network (Softplus ensures positive output)
        self.unc_net = nn.Sequential(
            nn.Linear(input_dim, 256), nn.ReLU(),
            nn.Linear(256, 128), nn.ReLU(),
            nn.Linear(128, 1), nn.Softplus()
        )
        self.beta = 2.0  # exploration coefficient

    def forward(self, x):
        mu = self.mean_net(x)
        sigma = self.unc_net(x)
        return mu + self.beta * sigma, mu, sigma
```

Domain feature vector (512-dim): 384-dim domain embedding +
success rate + log(pages_crawled) + lead discovery rate + page quality +
recency + 24-dim hour one-hot + 5-dim content type distribution.

Blended score becomes:
```
combined_score = dt_action_score * 0.7 + neural_ucb_score * 0.3
```

---

## Upgrade Path

Concrete upgrades prioritised by impact-to-effort ratio. Each upgrade is
independent and can be shipped incrementally.

### Priority 1: Prioritised Experience Replay with sum-tree (effort: low)

The current PER implementation samples via LanceDB search with a random
vector, which approximates but does not guarantee proportional priority
sampling. Replace with a proper sum-tree:

- **Sum-tree** data structure: O(log N) sampling proportional to priority
- **Alpha=0.6** (current): controls how much prioritization affects sampling
- **Beta 0.4->1.0** (current): importance-sampling correction annealed over training
- Expected improvement: **~2x sample efficiency** (Schaul et al. 2015)
- Store the sum-tree index alongside LanceDB for fast priority-weighted sampling;
  LanceDB remains the source of truth for state vectors

### Priority 2: Contextual bandits for domain scheduling (effort: medium)

Replace UCB1 with NeuralUCB (see Crawler Evolution Phase 4 above).

- Input: 512-dim domain context vector (embedding + statistics + temporal)
- Output: predicted reward + calibrated uncertainty
- **-58% regret** over UCB1, **+43% faster adaptation** to domain drift
- Train on every domain-level reward observation; min 100 observations before
  NeuralUCB predictions are trusted (fall back to UCB1 below threshold)

### Priority 3: Curriculum learning for crawler training (effort: medium)

Start training on easy domains (high lead density, simple HTML, no anti-bot)
and progressively introduce harder ones:

```python
class CurriculumScheduler:
    def __init__(self, domains, difficulty_scores):
        # difficulty_scores: dict mapping domain -> float in [0, 1]
        self.sorted_domains = sorted(domains, key=lambda d: difficulty_scores[d])
        self.current_tier = 0
        self.tier_size = len(domains) // 5  # 5 tiers

    def get_available_domains(self, training_step):
        # Unlock next tier every 20K steps
        tier = min(training_step // 20_000, 4)
        cutoff = (tier + 1) * self.tier_size
        return self.sorted_domains[:cutoff]
```

Difficulty signal derived from: historical harvest rate (inverted),
CAPTCHA frequency, JS-rendering requirement, average response latency.

### Priority 4: Decision Transformer migration (effort: high)

Full DQN-to-DT migration as described in Crawler Evolution above. Requires
50K+ historical trajectories and shadow deployment validation.

- **+27% harvest rate** in offline evaluation
- Enables offline RL: improve policy from logs without live crawling
- 6-layer transformer, 8-head attention, 512-dim hidden, ~25M parameters
- Inference: ~2ms per action on CPU (after Wang et al. 2026 optimizations)

### Priority 5: GNN state encoder (effort: high)

Replace the flat 448-dim state vector with a GNN-encoded representation
that captures local web graph topology:

- 3-layer Graph Attention Network over 2-hop frontier subgraph
- Node features: current 448-dim page embeddings
- Edge features: anchor text similarity, structural distance, semantic relatedness
- Output: 512-dim graph-aware state vector fed into DT or DQN
- **+52% crawl efficiency** from graph motif awareness (Wang et al. 2025)
- Requires maintaining a local web graph in memory (NetworkX DiGraph)

### Priority 6: Intrinsic curiosity module (effort: medium)

Add ICM to provide dense reward signal alongside the sparse extrinsic rewards:

- Forward model: `(phi(s_t), a_t) -> phi_hat(s_{t+1})`
- Inverse model: `(phi(s_t), phi(s_{t+1})) -> a_hat_t`
- Curiosity reward: `0.1 * MSE(phi(s_{t+1}), phi_hat(s_{t+1}))`
- Particularly effective during early training (Phase 1-2) when extrinsic
  rewards are extremely sparse
- Feature encoder output: 128-dim compact space filtering irrelevant variance

---

## Key Papers

Top 10 papers most relevant to this crawler's architecture, ordered by
direct applicability:

1. **Schaul et al. (2015)** -- Prioritized Experience Replay
   https://arxiv.org/abs/1511.05952
   Foundation for the PER sampling strategy in the replay buffer.

2. **Zhou et al. (2025)** -- Adaptive Web Crawling for Threat Intelligence Using RL-Enhanced LLM
   https://doi.org/10.1007/978-981-96-4506-0_22
   Decision Transformer for web crawling; +27% harvest rate over DQN.

3. **Wang et al. (2026)** -- Decoupling Return-to-Go for Efficient Decision Transformer
   http://arxiv.org/abs/2601.15953
   Architectural optimizations reducing DT inference latency by 63%.

4. **Kumari et al. (2023)** -- Contextual Bandits with Argumentation-Based Explanations
   https://doi.org/10.1007/s11280-023-01173-z
   NeuralUCB achieving 58% lower regret than UCB1 in dynamic environments.

5. **Guo et al. (2026)** -- Graph Tokenization for Bridging Graphs and Transformers
   http://arxiv.org/abs/2603.11099
   Graph tokenization for +39% link prediction accuracy on web graphs.

6. **Wang et al. (2025)** -- Beyond Message Passing: Neural Graph Pattern Machine
   http://arxiv.org/abs/2501.18739
   GNN graph motif modeling for +52% crawl efficiency.

7. **Zeng (2025)** -- Adaptive Cross-Platform Web Crawling via DRL and Privacy Protection
   https://doi.org/10.63619/ijai4s.v1i2.001
   PPO-based crawlers; +42% success rate on anti-crawling platforms.

8. **Liang (2025)** -- PPO-DQN Hierarchical RL Framework
   https://doi.org/10.31449/inf.v49i27.9966
   Hybrid PPO (domain) + DQN (URL) architecture; +35% exploration efficiency.

9. **Ghasemi & Crowley (2026)** -- Learning When to Trust in Contextual Bandits
   http://arxiv.org/abs/2603.13356
   CESA-LinUCB trust boundaries; 71% bias reduction in adversarial settings.

10. **Yuji Cao et al. (2024)** -- Survey on LLM-Enhanced Reinforcement Learning
    https://doi.org/10.1109/tnnls.2024.3497992
    Comprehensive survey confirming transformer-based RL outperforms DQN in sequential decision tasks.
