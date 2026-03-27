# Research Prompt 2 — RL Crawler
## Reinforcement Learning for Focused Web Crawling

**Module**: `docs/01-crawler.md`
**Research Crate**: `crates/research`
**Focus**: New papers (2024–2026) on DQN-based URL selection, MAB domain scheduling, reward shaping, LLM-guided crawling

---

## Research Mission

The current crawler uses:
- **DQN** for URL selection: 448-dim state vector (384 sentence-transformer + 32 URL trigram + 16 title trigram + 4 scalars + 12 domain one-hot)
- **UCB1 bandit** for domain scheduling
- **Prioritized Experience Replay (PER)** via LanceDB (alpha=0.6, beta 0.4→1.0)
- **Result**: 15% harvest rate (3× baseline), 820 distinct domains (+46%)

**Gaps to close:**
- Sparse reward problem: only +1.0 on qualified lead, most transitions get −0.01
- Domain yield drift: UCB1 doesn't model temporal non-stationarity
- No world model: reactive URL selection without outcome prediction
- Multi-constraint scheduling: respecting robots.txt + politeness + budget simultaneously

---

## Primary Search Queries

```
"deep Q-network focused web crawling reinforcement learning"
"multi-armed bandit URL prioritization web"
"LLM web agent navigation reinforcement learning"
"prioritized experience replay focused crawler"
"reward shaping sparse reward web crawling"
"auto-curriculum reinforcement learning exploration"
"world model LLM web browsing prediction"
"contextual bandit domain scheduling temporal"
"online reinforcement learning web content quality"
"multi-constraint bandit Lagrangian web crawling"
"self-supervised reward dense signal crawling"
"adaptive replay buffer on-policy web agent"
```

---

## API Routing Guidance

| Client | Why | Filter |
|---|---|---|
| `ArxivClient` | RL + web agent papers appear first on arXiv | `sort_by: lastUpdatedDate`, `max_results: 100` |
| `SemanticScholarClient` | ACL/EMNLP/ICLR/NeurIPS papers with citations | `year: 2024`, `min_citations: 5`, `limit: 50` |
| `OpenAlexClient` | SIGIR/WWW/WSDM venue coverage | `from_publication_date: 2024-01-01`, `per_page: 50` |

**Priority**: arXiv first (most recent RL preprints), then S2 for citation-ranked results.

---

## TeamLead Configuration

```rust
use research::team::{TeamLead, TeamConfig, LlmProvider};
use std::time::Duration;

let config = TeamConfig {
    team_size: 4,
    provider: LlmProvider::DeepSeek {
        api_key: std::env::var("DEEPSEEK_API_KEY").unwrap(),
        base_url: "https://api.deepseek.com".into(),
    },
    scholar_key: std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok(),
    mailto: std::env::var("RESEARCH_MAILTO").ok(),
    output_dir: Some("docs/research-output/02-crawler".into()),
    scholar_concurrency: Some(3),
    synthesis_preamble: Some(
        "You are a reinforcement learning researcher specializing in web \
         information retrieval. Synthesize findings on DQN-based URL selection \
         and bandit-based domain scheduling. For each technique, compare against \
         the current DQN+UCB1+PER baseline (15% harvest rate, 448-dim state). \
         Identify which improvements can be adopted incrementally vs require \
         architectural changes. Rank by: expected harvest rate improvement, \
         implementation complexity, and compatibility with LanceDB PER store.".into()
    ),
    timeout_check_interval: Some(Duration::from_secs(60)),
    progress_report_interval: Some(Duration::from_secs(120)),
    ..Default::default()
};
```

---

## ResearchTask Definitions

```rust
use research::team::task::{ResearchTask, TaskStatus, TaskPriority};
use std::time::Duration;

let tasks = vec![
    ResearchTask {
        id: 1,
        subject: "dqn-url-selection-advances".into(),
        preamble: "You are an RL researcher specializing in deep Q-networks for \
                   information retrieval. Search for papers from 2024–2026 that \
                   improve on vanilla DQN for URL/link selection in focused web \
                   crawling. Focus on: state representation improvements, \
                   double DQN vs dueling DQN vs distributional RL, \
                   and LLM-augmented state encoders.".into(),
        description: "Search for: 'deep Q-network web crawling 2024', \
                      'dueling DQN focused crawler', \
                      'distributional reinforcement learning web', \
                      'LLM state encoder reinforcement learning navigation'. \
                      Find papers that benchmark against DQN baselines on \
                      focused crawling tasks. Extract: state dimensionality, \
                      network architecture, harvest rate improvement, \
                      training data requirements, and inference latency.".into(),
        priority: TaskPriority::Critical,
        timeout: Some(Duration::from_secs(2400)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 2,
        subject: "bandit-domain-scheduling".into(),
        preamble: "You are a bandit algorithms researcher. Search for papers from \
                   2024–2026 on non-stationary multi-armed bandits for domain \
                   scheduling in web crawlers. Focus on: temporal drift handling, \
                   latent autoregressive state models, sliding-window UCB, \
                   and multi-constraint bandits with politeness/budget constraints.".into(),
        description: "Search for: 'non-stationary multi-armed bandit web', \
                      'latent autoregressive bandit temporal drift', \
                      'UCB sliding window domain scheduling', \
                      'multi-constraint bandit Lagrangian crawling', \
                      'contextual bandit domain yield prediction'. \
                      Compare against UCB1 baseline. Extract: regret bounds, \
                      adaptation speed to drift, constraint satisfaction rate, \
                      and computational overhead vs UCB1.".into(),
        priority: TaskPriority::Critical,
        timeout: Some(Duration::from_secs(2400)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 3,
        subject: "llm-world-model-crawling".into(),
        preamble: "You are an AI researcher specializing in LLM-based web agents. \
                   Search for papers from 2024–2026 that use LLMs as world models \
                   or reward models for web navigation and focused crawling. \
                   Focus on: WebDreamer, OpAgent, WebRL, self-evolving curricula, \
                   and hybrid symbolic+neural web agents.".into(),
        description: "Search for: 'LLM world model web navigation', \
                      'WebRL self-evolving curriculum reinforcement learning', \
                      'WebDreamer LLM outcome prediction web', \
                      'web agent reward model LLM', \
                      'OpAgent hybrid reward web navigation'. \
                      Assess feasibility for a local-first pipeline (no cloud LLM). \
                      Extract: success rate on WebArena/Mind2Web, \
                      LLM size required, inference cost per page, \
                      and whether a local 3B–14B model suffices.".into(),
        priority: TaskPriority::Normal,
        timeout: Some(Duration::from_secs(2400)),
        ..Default::default()
    },

    ResearchTask {
        id: 4,
        subject: "reward-shaping-curriculum".into(),
        preamble: "You are an RL researcher specializing in sparse reward problems \
                   and curriculum learning. Search for papers from 2024–2026 on \
                   semi-supervised reward shaping, goal-conditioned curriculum \
                   generation, and adaptive experience replay for web crawlers \
                   with rare positive rewards.".into(),
        description: "Search for: 'semi-supervised reward shaping sparse reward', \
                      'DISCOVER auto-curriculum goal selection NeurIPS 2025', \
                      'adaptive replay buffer on-policy alignment', \
                      'prioritized experience replay improvements 2024', \
                      'dense reward generation from zero-reward transitions'. \
                      The current PER uses alpha=0.6, beta 0.4→1.0. \
                      Find papers proposing better sampling strategies or \
                      pseudo-reward generation for rare-event RL. \
                      Extract: improvement over PER baseline, \
                      implementation complexity, and sample efficiency gain.".into(),
        priority: TaskPriority::Normal,
        dependencies: vec![1],
        timeout: Some(Duration::from_secs(2400)),
        ..Default::default()
    },
];
```

---

## Key Research Sub-Topics

### 1. DQN Architecture Upgrades
- **Dueling DQN**: Separate value + advantage streams — better for URL selection
- **Rainbow DQN**: Combines PER, n-step, distributional — drop-in improvement
- **LLM-augmented state**: Replace sentence-transformer with instruction-tuned encoder
- Current 448-dim state: assess whether LLM embeddings improve harvest rate >20%

### 2. Non-Stationary Bandit Scheduling
- **LARL (RLC 2025)**: Latent AR bandits for temporal yield drift
- **Sliding-window UCB**: Forget old observations, adapt to domain yield changes
- **M2-CMAB (arXiv:2603.06403)**: Multi-constraint bandit with Lagrangian — directly applicable to politeness + budget + quality

### 3. LLM as Crawl Oracle
- **Craw4LLM (ACL 2025)**: Pre-filter URLs by LLM content quality signal — 21% of URLs achieves full performance
- **QMin (SIGIR ICTIR 2025)**: Propagate quality scores via minimum inlinking — no LLM needed
- **WebDreamer (TMLR 2025)**: LLM predicts click outcomes before visiting — 23–42% better than reactive

### 4. Reward Engineering
- **Semi-supervised reward shaping**: Use unsupervised signals (page similarity, link graph) to densify sparse rewards
- **ARB (arXiv:2512.10510)**: On-policy replay — adaptively resample buffer to match current policy distribution
- **DISCOVER (NeurIPS 2025)**: Auto-curriculum via achieved goal selection — eliminates manual reward engineering

---

## Expected Output Format

Save each task result to `docs/research-output/02-crawler/agent-{id:02}-{subject}.md`:

```markdown
# {subject}

## Top Papers Found (sorted by relevance)
| Title | Year | Venue | arXiv ID | Key Improvement |
|---|---|---|---|---|

## Comparison to Current Baseline
| Technique | vs DQN+UCB1 | vs PER | Implementation Effort |
|---|---|---|---|

## Quick Wins (drop-in to current code)
- ...

## Requires Architecture Change
- ...
```

Synthesis should produce a **prioritized upgrade roadmap** ordered by: harvest rate delta ÷ implementation days.
