# Semi-Supervised Reward Shaping -- Deep Dive

> **Paper:** "Shaping Sparse Rewards in Reinforcement Learning: A Semi-supervised Approach"
> **arXiv:** [2501.19128](https://arxiv.org/abs/2501.19128) (v4, Jan 2026)
> **Authors:** Wenyun Li, Wenjie Huang, Chen Sun
> **Domains:** cs.LG, cs.AI
> **Date reviewed:** 2026-03-26

---

## Paper Summary

The SSRS (Semi-Supervised Reward Shaping) framework addresses a fundamental bottleneck in sparse-reward RL: the vast majority of transitions carry zero reward, so supervised reward estimators trained only on non-zero-reward transitions are severely sample-starved.

**Core insight:** Treat zero-reward transitions as *unlabeled data* and non-zero-reward transitions as *labeled data*, then apply semi-supervised learning (consistency regularization + pseudo-labeling) over the trajectory space to learn a dense reward estimator. The SSL assumptions (smoothness, clustering) transfer to trajectory representations because transitions near successful outcomes form natural clusters in embedding space.

**Key contributions:**

1. First framework to apply SSL to reward shaping -- learns from the majority of data (zero-reward transitions) rather than discarding it.
2. Double entropy data augmentation for trajectory perturbation -- replaces image-based augmentations with a method suited to non-image state vectors.
3. Monotonicity constraint (L_QV) that penalizes negative advantages to stabilize training.
4. Up to 4x peak scores vs. supervised baselines (RCP) on extremely sparse Atari environments (Montezuma's Revenge).
5. 15.8% improvement in best scores vs. alternative augmentation methods.

**Evaluation domains:** Atari (RAM mode -- 128-byte state vectors), FetchReach robotic manipulation (binary -1/0 rewards).

---

## Algorithm & Architecture

### Framework Overview

SSRS wraps around a base RL algorithm (SAC for Atari, DDPG for robotics). It alternates between:

1. **Policy update** -- standard RL update using shaped rewards
2. **Reward estimator update** -- semi-supervised optimization of the reward network

### Reward Estimator Network

```
Input: state vector (128-dim for Atari RAM)
  -> FC(128) / ReLU / Dropout(0.2)
  -> FC(64)  / ReLU / Dropout(0.2)
  -> FC(32)  / ReLU / Dropout(0.2)
  -> FC(N_z) / ReLU / Softmax
Output: probability distribution over N_z=12 discrete reward bins
```

The network outputs a confidence distribution over a fixed reward set Z = {z_1, ..., z_{N_z}} initialized from observed true rewards and updated via interpolation when new reward values appear.

### Confidence Scoring

For each transition (s_t, a_t, s_{t+1}), the confidence vector is:

```
q_t = beta * Q(s_t, a_t) + (1 - beta) * V(s_{t+1})
```

Where beta = 0.5 (equal weighting of Q and V functions). The estimated reward is:

```
z_t = argmax(z_i)  if max(q_t) > lambda
z_t = 0            otherwise
```

### Dynamic Threshold Schedule

Lambda increases over training to become progressively more selective:

```
lambda = 0.6 + 0.3 * (1 - e^(-t/T))
```

This starts permissive (lambda ~ 0.6, accepting more pseudo-labels) and tightens (lambda -> 0.9) as the estimator improves.

### Loss Function

The total loss combines three terms:

```
L = L_QV + alpha * L_s + (1 - alpha) * L_r
```

| Component | What It Does | Formula |
|---|---|---|
| **L_r** (supervised) | MSE on non-zero-reward transitions | Standard regression loss with confidence thresholding |
| **L_s** (consistency regularization) | Cross-entropy between weak and strong augmentations on zero-reward transitions | Enforces smooth representations |
| **L_QV** (monotonicity) | Penalizes negative advantages | `sum((delta_t)^2) if delta_t > 0, else 0`, where delta_t = Q(s,a) - V(s) |

Alpha is dynamic: `0.2 -> 0.7` over training (increasing reliance on SSL as more zero-reward transitions are collected).

### Double Entropy Data Augmentation

For non-image state vectors, standard image augmentations (crop, flip) do not apply. SSRS introduces:

```
sigma(state | n) = [h_1 * s_1, h_2 * s_2, ..., h_n * s_n]
```

Where the state vector is partitioned into n=8 segments, and each segment s_i is scaled by h_i = Shannon entropy of that partition. This creates meaningful perturbations that preserve the information structure of the state while providing the diversity SSL needs for consistency regularization.

### Dynamic Shaping Probability p_u

Controls what fraction of zero-reward transitions receive shaped rewards:

- **Early training:** `p_u ~ log(N_r)` (conservative, few shaped rewards)
- **Mid training:** `p_u ~ N_r` (aggressive, many shaped rewards)
- **Late training:** `p_u ~ log(N_r)` again (conservative, trust the policy)

This follows an inverted-U schedule matching the exploration-exploitation tradeoff.

### Algorithm Pseudocode (from paper)

```
Initialize: theta, Q-function, replay buffer D, reward set Z
For each episode:
  For each step t:
    1. Collect transition (s_t, a_t, r_t, s_{t+1})
    2. If r_t != 0: update reward set Z
    3. For zero-reward transitions (probability p_u):
       a. Compute q_t under weak augmentation
       b. Compute q_t_strong under strong (double entropy) augmentation
       c. If max(q_t) > lambda: assign pseudo-reward z_t
    4. Shape reward: r_hat = z_t (or r_t if non-zero)
    5. Update Q-function: Q(s,a) <- Q(s,a) + alpha*(r_hat + gamma*max_a' Q(s',a') - Q(s,a))
    6. Minimize L = L_QV + alpha*L_s + (1-alpha)*L_r
```

---

## Benchmarks & Results

### Atari (RAM, 128-byte state vectors)

| Game | Sparsity | SSRS Best | RCP Best | Improvement |
|---|---|---|---|---|
| Montezuma's Revenge | Extreme | ~2x RCP score | Baseline | Nearly 4x vs. ICM |
| Venture | High | Improved | Baseline | Significant |
| Hero | Moderate | +1228.4 pts (with monotonicity) | Baseline | Strong |
| Seaquest | Moderate | Improved | Baseline | Moderate |

### FetchReach Robotics (binary -1/0 rewards)

SSRS outperforms SORS (Self-Supervised Online Reward Shaping) on convergence speed and final success rate.

### Ablation Results

| Component | Effect |
|---|---|
| Monotonicity constraint (L_QV) | +improvement in 3/4 Atari games; slight degradation in Venture |
| Double entropy augmentation | 15.8% better than alternative augmentations |
| SSL (L_s term) | Critical -- without it, performance collapses to RCP-level |
| Dynamic p_u | Better than fixed p_u in all environments |

### Baseline Comparisons

| Method | Type | SSRS Advantage |
|---|---|---|
| RCP (Reward-Conditioned Policy) | Supervised reward shaping | Up to 4x peak scores in sparse envs |
| SORS (Self-Supervised Online Reward Shaping) | Self-supervised | Better on FetchReach |
| ICM (Intrinsic Curiosity Module) | Curiosity-driven exploration | 4x in Montezuma's Revenge |
| SAC/DDPG (unmodified) | Base algorithms | Substantial improvement |

---

## Code Availability

**No official repository found.** The paper does not link to a code release. Searches across GitHub for "SSRS reward shaping", "semi-supervised reward shaping", and the paper ID yield no results. The paper references prior work implementations:

- SORS: [hiwonjoon/IROS2021_SORS](https://github.com/hiwonjoon/IROS2021_SORS)
- SASR (ICLR 2025, related but different): [mahaozhe/SASR](https://github.com/mahaozhe/SASR)

### Closest Available Implementations

| Project | What It Offers | Gap from SSRS |
|---|---|---|
| **SASR** (ICLR 2025) | Success-rate-based reward shaping with Beta distributions + KDE/RFF. PyTorch, SAC base. Open source. | No SSL, no double entropy augmentation, no consistency regularization |
| **SORS** (IROS 2021) | Classification-based reward inference alternating with policy updates. | Supervised only -- no zero-reward transition learning |
| **deep-deep** (Scrapinghub) | Q-learning focused web crawler with keyword/classifier rewards. | No reward shaping, basic Q-learning, no neural network |
| **TRES** | RL focused crawler with tree-based action space. | Domain-specific but no reward shaping component |

**Implementation effort estimate:** Medium. The reward estimator is a simple 4-layer MLP. The SSL components (consistency regularization, pseudo-labeling) are well-understood patterns. The double entropy augmentation is novel but straightforward. Total: ~500-800 lines of Python.

---

## Integration with DQN Crawler

### Current Architecture (from codebase)

The crawler already has a sophisticated reward pipeline:

| Component | File | What It Does |
|---|---|---|
| `RewardShaper` | `crawler_reward_shaping.py` | Potential-based shaping (Ng et al. 1999), page-type bonuses, depth penalties, z-score normalization |
| `HindsightRewardManager` | `crawler_reward_shaping.py` | Backward reward relabeling when leads are confirmed |
| `IntrinsicCuriosityModule` | `crawler_curiosity.py` | ICM (Pathak 2017) for exploration bonuses |
| `PrioritizedReplayBuffer` | `crawler_replay_buffer.py` | PER with mmap + SQLite, 100K capacity |
| `CrawlerDQN` | `crawler_dqn.py` | Double DQN, 784-dim state (768 nomic-embed + 16 scalar), 10 actions |

### Where SSRS Fits

SSRS would slot in as a **parallel reward estimator** alongside the existing `RewardShaper`:

```
Raw reward (+1 lead / -0.1 irrelevant / 0.0 most pages)
  |
  +-> RewardShaper (existing: potential-based + bonuses)
  |     -> shaped_reward_1
  |
  +-> SSRSEstimator (new: SSL on zero-reward transitions)
  |     -> shaped_reward_2
  |
  +-> combine: final_reward = w1 * shaped_1 + w2 * shaped_2
  |
  +-> RewardNormalizer (existing: z-score + clipping)
  |
  +-> PER Replay Buffer
```

### Concrete Integration Steps

**1. SSRSRewardEstimator class (~300 lines)**

```python
class SSRSRewardEstimator:
    """Semi-supervised reward estimator for zero-reward transitions."""

    def __init__(self, state_dim=784, n_z=12, n_partitions=8):
        # Reward network: FC(128) -> FC(64) -> FC(32) -> FC(n_z) -> Softmax
        # Reward set Z: initialized from first observed non-zero rewards
        # Confidence threshold lambda: 0.6 -> 0.9 schedule

    def estimate_reward(self, state, action, next_state) -> float:
        """Estimate dense reward for a zero-reward transition."""

    def update(self, batch) -> dict:
        """SSL update: L_r + L_s + L_QV on mixed labeled/unlabeled batch."""

    def double_entropy_augment(self, state) -> np.ndarray:
        """Partition state into n segments, scale each by Shannon entropy."""
```

**2. Adapt to 784-dim states (vs. paper's 128-dim Atari RAM)**

The paper uses 128-dim Atari RAM vectors. Our crawler uses 784-dim states (768 nomic-embed + 16 scalar). Key adjustments:

- Increase first hidden layer: `FC(128) -> FC(256)` to handle higher dimensionality
- Partition count: `n=8 -> n=16` for double entropy augmentation (784 / 16 = 49 per partition)
- The embedding portion (dims 0-767) is already normalized, which aligns well with SSL assumptions

**3. Integration with HindsightRewardManager**

The existing `HindsightRewardManager` already buffers trajectories per domain and relabels backward on lead confirmation. SSRS can consume the same trajectory buffer:

- Zero-reward transitions from the buffer feed into L_s (SSL loss)
- Lead-confirmed transitions feed into L_r (supervised loss)
- The backward relabeling and SSL pseudo-labeling are complementary -- HER relabels past transitions after lead confirmation, while SSRS estimates rewards *during* crawling

**4. Memory Budget**

| Component | Memory |
|---|---|
| Reward network (4-layer MLP, 784->256->64->32->12) | ~0.5 MB |
| Reward set Z (12 float32 values) | negligible |
| Training buffer (last 1000 transitions for SSL) | ~6 MB |
| **Total** | **~7 MB** |

Fits within the M1 16GB budget alongside existing components.

**5. Training Schedule**

- SSRS estimator trains on every DQN update step (piggybacks on existing training loop)
- Lambda and alpha schedules keyed to total steps (not episodes) for the crawling domain where "episodes" are less well-defined
- p_u schedule: start at 5% of zero-reward transitions, peak at 30% mid-training, decay to 10%

### Alignment with Existing Reward Components

| Existing Component | SSRS Relationship | Conflict? |
|---|---|---|
| Potential-based shaping (Ng 1999) | Complementary -- SSRS shapes rewards at the transition level, PBRS shapes at the state-value level | No -- additive |
| Page-type bonuses | SSRS may learn to replicate these, but hand-coded bonuses provide immediate signal | No -- SSRS learns from sparse signal, bonuses are dense |
| ICM curiosity | Both address sparse rewards but differently: ICM encourages novelty, SSRS estimates missing rewards | Low risk -- may want to disable ICM when SSRS is active to avoid double-counting |
| Hindsight relabeling | Complementary -- HER relabels after fact, SSRS estimates in real-time | No -- HER corrections feed into SSRS as labeled data |
| PER | SSRS-shaped rewards should update priorities in the PER buffer | No -- just pass shaped rewards through |

---

## Related Work Landscape

### Reward Shaping for Sparse-Reward RL

| Method | Year | Approach | Key Idea | Open Source |
|---|---|---|---|---|
| **PBRS** (Ng et al.) | 1999 | Potential-based | F = gamma*Phi(s') - Phi(s); preserves optimal policy | N/A (classical) |
| **ICM** (Pathak et al.) | 2017 | Curiosity | Prediction error as intrinsic reward | Yes |
| **HER** (Andrychowicz et al.) | 2017 | Hindsight relabeling | Relabel failed trajectories with achieved goals | Yes |
| **SORS** (Memarian et al.) | 2021 | Self-supervised | Classification-based reward inference from trajectory rankings | [Yes](https://github.com/hiwonjoon/IROS2021_SORS) |
| **ExploRS** (Devidze et al.) | 2022 | Exploration-guided | Intrinsic reward + exploration bonuses, self-supervised | NeurIPS 2022 |
| **RCP** | 2023 | Supervised | Condition policy on reward; non-expert trajectories as supervision | Referenced |
| **SSRS** (Li et al.) | 2025 | Semi-supervised | SSL on zero-reward transitions; double entropy augmentation | No |
| **SASR** (Ma et al.) | 2025 | Self-adaptive | Success rate via Beta distributions + KDE/RFF | [Yes](https://github.com/mahaozhe/SASR) |
| **PBRS-Improved** (2025) | 2025 | Potential-based | Constant bias + scaling for sparse terminal MDPs | AAMAS 2025 |

### RL Web Crawling Literature

| System | Year | RL Algo | Reward Design | Sparse Reward Handling |
|---|---|---|---|---|
| **deep-deep** (Scrapinghub) | 2017 | Q-learning | Keyword/classifier relevance scores | None -- dense classifier rewards |
| **Focused RL Crawler** (Auer 2018) | 2018 | Q-learning | Page relevance classifier | Epsilon-greedy exploration only |
| **TRES** (2021) | 2021 | Tree-frontier sampling | Harvest rate + domain diversity | Tree-based action space discretization |
| **Deep RL Crawler** (ICC 2021) | 2021 | DQN | BiLSTM page classifier | Reward shaping via page distance |
| **Our Crawler** | 2025 | Double DQN | +1 lead, +0.2 entity, -0.1 irrelevant | PBRS + ICM + HER + PER |

### AgentHER -- Relevant 2025 Development

[AgentHER](https://arxiv.org/html/2603.21357) (2025) extends HER to LLM agents on WebArena. It generates counterfactual goals for failed web navigation trajectories, enabling learning from failures. While designed for LLM agents rather than DQN crawlers, the principle of converting failed web navigation episodes into training signal is directly relevant.

---

## Risks & Limitations

### Technical Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **No code release** -- must implement from paper | Medium | Algorithm is well-described; reward estimator is simple MLP. SASR codebase provides structural reference. |
| **Hyperparameter sensitivity** -- p_u, lambda, alpha schedules | High | Paper acknowledges this. Start with paper defaults, add hyperparameter sweep. |
| **Monotonicity constraint hurts some envs** | Low | Ablation shows Venture degraded. Make L_QV toggleable. |
| **784-dim states vs. paper's 128-dim** | Medium | Larger state space may need wider hidden layers and more training. |
| **Non-stationary reward distribution** | Medium | Crawler reward distribution shifts as it discovers new domains. The dynamic p_u schedule partially addresses this. |

### Domain Gap Risks

| Gap | Paper Domain | Crawler Domain | Concern |
|---|---|---|---|
| **State space** | 128-dim Atari RAM | 784-dim embeddings + scalars | SSL clustering assumption may hold differently for high-dim semantic embeddings |
| **Action space** | Discrete (Atari: 4-18 actions) | Discrete (10 link candidates) | Compatible -- no adaptation needed |
| **Reward structure** | Atari: variable point rewards; FetchReach: binary | Crawler: +1/+0.2/0/-0.1 with long delays | Similar sparsity, but crawler rewards are asynchronous (extraction delay) |
| **Episode structure** | Fixed episodes | Continuous crawling with domain-scoped "episodes" | Need to define episode boundaries for p_u scheduling |
| **Clustering assumption** | Atari: state proximity implies reward proximity | Crawler: similar embeddings may yield different rewards (contact vs. blog page) | **Key risk** -- page embedding similarity does not perfectly correlate with lead potential |

### Practical Limitations

1. **Async reward confirmation.** The crawler gets +1 only after the extraction module confirms a lead, which may happen many steps later. SSRS assumes synchronous reward observation. The HindsightRewardManager bridges this gap, but SSRS will need to treat pending transitions as zero-reward until confirmation arrives.

2. **Cold start.** SSRS needs at least some non-zero rewards to initialize Z and train L_r. In the earliest crawl phase (before any leads are found), SSRS provides no benefit. The existing PBRS and ICM fill this gap.

3. **Double entropy augmentation on embeddings.** The paper partitions 128-dim Atari RAM vectors. For 768-dim semantic embeddings, entropy-based scaling may distort semantic relationships. May need to apply augmentation only to the 16 scalar features, or use embedding-aware augmentation (e.g., dropout on embedding dimensions).

4. **Computational overhead.** The reward estimator adds a forward pass per transition and an SSL training step per batch. On M1 with MPS, this is ~0.5ms per transition -- acceptable given the 0.3ms DQN inference budget.

---

## Verdict: 3.5/5 Applicability

### Score Justification

**What makes it promising (pushing toward 4):**

- Directly attacks the core problem: >95% of crawler transitions yield zero reward, and this is exactly the regime where SSRS excels.
- The framework is mathematically principled -- SSL on trajectory space is a genuine insight, not just heuristic bonus engineering.
- Up to 4x improvement over baselines in extreme sparsity (Montezuma's Revenge) suggests real potential for the crawler's similarly sparse reward landscape.
- Complements rather than replaces the existing reward pipeline (PBRS, HER, ICM).
- Memory footprint (~7 MB) fits the M1 budget.

**What holds it back (keeping it at 3.5):**

- **No code release** means ~1-2 weeks of implementation work with risk of subtle bugs in the SSL components.
- **Domain gap is significant.** The paper demonstrates on Atari RAM (low-dim, game-specific) and FetchReach (binary reward, simple state). A 784-dim embedding space with semantic structure is meaningfully different. The clustering assumption may not hold as cleanly for web page embeddings.
- **Async rewards** require non-trivial adaptation. The paper assumes synchronous reward observation; the crawler has extraction delays.
- **The existing reward pipeline already addresses sparse rewards** through PBRS + ICM + HER. SSRS would be the fourth layer -- diminishing returns are likely.
- **SASR (ICLR 2025)** is open-source, simpler, and achieves strong results on similar sparse-reward tasks. It may deliver 80% of SSRS's benefit at 30% of the implementation cost.

### Recommendation

**Implement SASR first** as the low-risk baseline (open source, simpler, proven at ICLR 2025). If the crawler's zero-reward transition problem remains after SASR + existing pipeline, implement SSRS's SSL components on top. The double entropy augmentation is the most novel and risky component -- test it in isolation before full integration.

### Priority vs. Other Research Directions

| Direction | Priority | Rationale |
|---|---|---|
| SASR integration | **High** | Open source, proven, low implementation cost |
| SSRS full implementation | **Medium** | Strong theory but no code, domain gap risk |
| Improve HindsightRewardManager | **High** | Already in codebase, directly addresses async reward delay |
| ICM tuning | **Low** | Already implemented, limited upside |
| AgentHER for failed trajectories | **Medium-Low** | Interesting but designed for LLM agents, not DQN |

---

## References

- Li, Huang, Sun. "Shaping Sparse Rewards in RL: A Semi-supervised Approach." [arXiv:2501.19128](https://arxiv.org/abs/2501.19128), 2025.
- Ma et al. "Highly Efficient Self-Adaptive Reward Shaping for RL (SASR)." [ICLR 2025](https://github.com/mahaozhe/SASR).
- Memarian et al. "Self-Supervised Online Reward Shaping in Sparse-Reward Environments (SORS)." [IROS 2021](https://github.com/hiwonjoon/IROS2021_SORS).
- Devidze et al. "Exploration-Guided Reward Shaping for RL under Sparse Rewards (ExploRS)." [NeurIPS 2022](https://proceedings.neurips.cc/paper_files/paper/2022/hash/266c0f191b04cbbbe529016d0edc847e-Abstract-Conference.html).
- Ng, Harada, Russell. "Policy Invariance Under Reward Transformations." ICML 1999.
- Pathak et al. "Curiosity-driven Exploration by Self-Supervised Prediction (ICM)." ICML 2017.
- Andrychowicz et al. "Hindsight Experience Replay." NeurIPS 2017.
- Kostrikov et al. "Tree-based Focused Web Crawling with RL (TRES)." [arXiv:2112.07620](https://arxiv.org/abs/2112.07620), 2021.
- TeamHG-Memex. "deep-deep: Adaptive RL Web Crawler." [GitHub](https://github.com/TeamHG-Memex/deep-deep).
- AgentHER. "Hindsight Experience Replay for LLM Agent Trajectory Relabeling." [arXiv:2603.21357](https://arxiv.org/html/2603.21357), 2025.
- "Improving the Effectiveness of Potential-Based Reward Shaping in RL." [AAMAS 2025](https://dl.acm.org/doi/10.5555/3709347.3743978).
