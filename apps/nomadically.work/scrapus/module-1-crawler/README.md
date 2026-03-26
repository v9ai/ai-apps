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
- **Algorithm:** DQN + Multi-Armed Bandit domain scheduler
- **State storage:** LanceDB (page embeddings, replay buffer)
- **Frontier queue:** SQLite table or in-memory priority queue

## State Representation

| Feature                       | Source                        | Storage          |
|-------------------------------|-------------------------------|------------------|
| Sentence transformer embedding| Page content (384-dim)        | LanceDB          |
| Target keyword flags          | Binary indicators             | In-memory        |
| Page metadata                 | Depth, domain, seed distance  | SQLite            |
| URL/title embedding           | Character-level (64-dim)      | LanceDB          |

Combined state vector (~448 dimensions) stored per page in LanceDB's
`page_embeddings` table for replay and similarity lookups.

## Reward Design

| Condition                              | Reward |
|----------------------------------------|--------|
| Page yields >=1 qualified lead         | +1.0   |
| Page contains target entity, not qual. | +0.2   |
| Page has no relevant info              | -0.1   |
| Per-page crawl cost                    | -0.01  |

Rewards arrive asynchronously from the extraction module via a Python
`queue.Queue` (in-process) or a SQLite `reward_events` table if running
multi-process.

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
    "timestamp": 0                    # for priority sampling
}])
```

The DQN learner samples batches from this table. LanceDB's Arrow-native
format makes batch reads fast without serialization overhead. Old
experiences are pruned by timestamp when the table exceeds a size limit
(e.g., 100K tuples).

## Entity Existence Check -- LanceDB ANN

Before following a link, the crawler checks if the target page likely
discusses an already-known entity:

```python
# Embed the link's anchor text + URL
candidate_vec = embed(anchor_text + " " + url_snippet)

# ANN search against known entity embeddings
results = entity_embeddings_table.search(candidate_vec).limit(3).to_list()

if results and results[0]["_distance"] < 0.15:
    # Very similar to known entity -- deprioritize
    q_value *= 0.3  # soft penalty, not hard block
```

This replaces the Neo4j read-cache pattern. LanceDB's HNSW index makes
this sub-millisecond even with 100K+ entities.

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

## DQN Training Loop

```python
# Actor (crawler thread)
experience = (state, action, reward, next_state, done)
replay_table.add([experience])

# Learner (separate thread or process)
batch = replay_table.search(random_vector).limit(64).to_list()  # random sampling
loss = compute_td_loss(batch, q_network, target_network)
optimizer.step()

# Periodic weight sync
if step % 1000 == 0:
    target_network.load_state_dict(q_network.state_dict())
    torch.save(q_network.state_dict(), "scrapus_data/models/dqn/policy.pt")
```

All crawler threads reload `policy.pt` every N steps. No Redis pub/sub
needed -- file-based weight sharing via the local filesystem.

## Infrastructure

- **Threading:** `concurrent.futures.ThreadPoolExecutor` (10-50 threads)
- **Headless browser:** Selenium for JS-heavy sites
- **Seed init:** Bing/Google search API -> initial frontier URLs
- **Rate limiting:** per-domain delay stored in `domain_stats` table

## Results

| Metric                    | RL Crawler | Baseline |
|---------------------------|------------|----------|
| Harvest rate              | ~15%       | ~5%      |
| Relevant pages (50K)      | ~7,500     | ~2,500   |
| Distinct domains          | ~820       | ~560     |
