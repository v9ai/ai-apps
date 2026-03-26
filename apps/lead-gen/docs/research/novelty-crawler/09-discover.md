# DISCOVER Auto-Curriculum -- Deep Dive

> **Paper:** Diaz-Bone, Bagatella, Hubotter, Krause. "DISCOVER: Automated Curricula for Sparse-Reward Reinforcement Learning." NeurIPS 2025. [arXiv:2505.19850](https://arxiv.org/abs/2505.19850)
>
> **Affiliations:** ETH Zurich; Max Planck Institute for Intelligent Systems
>
> **Code:** [github.com/LeanderDiazBone/discover](https://github.com/LeanderDiazBone/discover) (Python/JAX, 8 stars, 11 commits)
>
> **Generated:** 2026-03-26 | **Context:** Novelty-crawler cold-start learning

---

## Paper Summary

DISCOVER addresses the fundamental bottleneck in sparse-reward goal-conditioned RL: when the only reward signal is binary success/failure on a distant target goal, random exploration fails catastrophically in high-dimensional spaces because the probability of stumbling onto useful states decays exponentially with dimensionality.

The core insight is that **solving a hard target task requires first solving simpler intermediate tasks that lie on the path toward it**. DISCOVER automatically generates a curriculum of such intermediate goals by selecting from previously achieved states, balancing three criteria:

1. **Achievability** -- the agent can actually reach the goal from its start state
2. **Novelty** -- the goal is uncertain enough that attempting it yields new information
3. **Relevance** -- the goal is directionally useful toward the ultimate target

The method requires zero prior information about the environment structure, distance metrics, or reward shaping. All estimates are bootstrapped from the agent's own value function ensemble. DISCOVER is the first method to demonstrate effective test-time reinforcement learning (TTRL) with millions of self-supervised exploration steps.

---

## Algorithm & Architecture

### High-Level Loop (Algorithm 1)

```
Initialize: replay buffer B = {}, achieved goals G_ach = {s_0}, params theta
For episode t = 1, 2, ...:
    g_t  <-  SelectGoal(B, theta, g*)           # curriculum step
    B    <-  B  U  {Rollout(pi_theta, g_t)}     # execute & collect
    theta <-  Update(RelabelGoals(Sample(B)), theta)  # HER + train
```

The key innovation is **SelectGoal**. Everything else is standard goal-conditioned RL with Hindsight Experience Replay (HER).

### SelectGoal: The DISCOVER Objective (Equation 3)

```
g_t = argmax_{g in G_ach}  [
    alpha_t * (V(s_0, g) + beta_t * sigma(s_0, g))     # achievability + novelty
  + (1 - alpha_t) * (V(g, g*) + beta_t * sigma(g, g*)) # relevance + uncertainty
]
```

Where:
- **V(s_0, g)** = mean critic ensemble estimate of reaching g from start state (achievability)
- **sigma(s_0, g)** = standard deviation across critic ensemble (novelty/epistemic uncertainty)
- **V(g, g*)** = mean critic ensemble estimate of reaching target g* from g (relevance)
- **sigma(g, g*)** = uncertainty about relevance direction
- **alpha_t** in [0,1] = adaptive weighting between explore-nearby vs exploit-toward-target
- **beta_t** = uncertainty bonus weight (fixed at 1.0 in practice)

**Intuition:** The first term finds goals the agent can almost-but-not-quite reach (zone of proximal development). The second term ensures those goals lie in the direction of the target, not off in irrelevant corners of state space.

### Adaptive Alpha Mechanism (Equation 4)

```
alpha_{t+1} = clip_{[0,1]}( alpha_t + eta * (p_t - p*) )
```

- **p_t** = average goal achievement rate over last k_adapt episodes
- **p*** = target achievement rate (set to 50% -- optimal per ablation)
- **eta** = 0.01 (step size)

When the agent achieves goals too easily (p_t > 50%), alpha decreases, pushing toward harder, more target-relevant goals. When it fails too often (p_t < 50%), alpha increases, retreating to easier nearby goals. This self-regulates difficulty throughout training.

### Uncertainty Quantification

DISCOVER uses a **bootstrapped ensemble of critic networks** (standard in many deep RL implementations):

- Each critic in the ensemble is trained on the same replay data
- **Mean** across ensemble = value estimate V
- **Standard deviation** across ensemble = epistemic uncertainty sigma
- No separate uncertainty model needed; reuses infrastructure already present in SAC/TD3

### Cold-Start Initialization

At episode 0, the achieved goal set is initialized as G_ach = {s_0} (just the starting state). The critic ensemble is randomly initialized, producing high uncertainty everywhere. In the first few episodes:

1. High sigma terms dominate (everything is novel)
2. Alpha starts near 1.0 (focus on achievability since nothing is known about relevance)
3. The agent explores locally around s_0, gradually expanding G_ach
4. As the value function starts generalizing, the relevance term V(g, g*) becomes informative
5. Alpha adapts downward, steering exploration toward the target direction

The paper notes DISCOVER undergoes "an initial exploration phase" before "quickly identifying the correct direction" -- the transition from undirected to directed happens organically.

---

## Benchmarks & Results

### Environments

| Environment | State Dim | Action Dim | Challenge |
|---|---|---|---|
| Pointmaze (2D-6D) | 2-6 | 2-6 | Scalable dimensionality test |
| Antmaze | 27 | 8 | Locomotion + navigation |
| Arm manipulation | 23 | 5 | Robotic control |

Each environment has "simple" and "hard" variants (longer horizons, more obstacles).

### Baselines

| Method | Strategy |
|---|---|
| HER (target only) | Always set g_t = g* (the final target) |
| DISCERN (uniform) | Sample uniformly from achieved goals |
| MEGA | Select lowest-likelihood achieved goals (max entropy gain) |
| Achievability+Novelty | DISCOVER without the relevance term (ablation) |
| RND / ICM | Non-goal-conditioned curiosity-driven exploration |

### Key Results

1. **DISCOVER consistently and significantly outperforms all baselines** across all environments, with the gap widening on harder variants.

2. **Dimensionality scaling:** Undirected methods (DISCERN, MEGA) fail completely beyond 3D pointmazes. DISCOVER succeeds up to 6D because it avoids exponential blowup by directing exploration along 1D target-relevant paths.

3. **50M step budget:** In pointmaze experiments, baselines that fail show no 10% success rate even after 50M environment steps. DISCOVER reaches the threshold substantially faster.

4. **Ablation -- relevance is critical:** Removing the relevance term (Achievability+Novelty only) collapses performance to baseline levels, proving undirected exploration is insufficient regardless of how well novelty is estimated.

5. **Ablation -- adaptive alpha:** Optimal target achievement rate p* = 50% matches theoretical predictions. The learned alpha converges to approximately 0.1 empirically.

6. **Pre-trained priors:** Providing a pre-trained value function offers only marginal acceleration, and only when the prior is obstacle-aware. DISCOVER's self-bootstrapping is already effective.

7. **Non-goal-conditioned methods fail entirely:** RND and ICM (curiosity-driven) cannot solve these tasks at all. Goal selection -- not just reward bonuses -- is what enables "deep exploration."

### Theoretical Bound (Theorem 4.2, informal)

Under linear value function assumptions with geodesic convexity:

```
N <= O~(D * d^2 / kappa^3)
```

- **D** = optimal-policy distance from start to target (1D path length)
- **d** = feature dimensionality of the value function
- **kappa** = expansion rate of achievable goals per episode

The bound depends on **path distance D**, not on the **volume of the full goal space**. This is why DISCOVER scales where undirected methods cannot -- it converts an exponential-in-dimension search problem into a linear-in-distance one.

---

## Code Availability

**Repository:** [github.com/LeanderDiazBone/discover](https://github.com/LeanderDiazBone/discover)

| Aspect | Details |
|---|---|
| Language | Python (99.1%), Shell (0.9%) |
| Framework | JAX (JaxGCRL base) |
| GPU support | CUDA >= 12.3 (Linux); CPU-only on Mac |
| Entry point | `training.py` via `scripts/train.sh` |
| Environments | Built-in pointmaze, antmaze, arm |
| Install | `pip install -e .` |
| Stars/Forks | 8 / 2 (as of March 2026) |
| Commits | 11 (low activity post-publication) |
| License | Not specified |

### Structure

```
discover/
  envs/              # Evaluation environments (pointmaze, antmaze, arm)
  maze_layouts/      # Maze configuration files
  prior_critic/      # Pre-trained critic implementation
  scripts/           # train.sh launcher
  src/               # Core algorithm (SelectGoal, ensemble critics, adaptation)
  training.py        # Main entry point
  utils.py           # Utilities
  pyproject.toml     # Dependencies
```

The codebase derives from JaxGCRL, a JAX-based goal-conditioned RL framework. The DISCOVER-specific addition is the goal selection step at the beginning of each episode. This is relatively self-contained.

---

## Integration for Crawler Cold-Start

### The Mapping

DISCOVER's goal-conditioned framework maps onto the web crawler problem as follows:

| DISCOVER Concept | Crawler Equivalent |
|---|---|
| State s | Current page URL + DOM features |
| Goal g | Target page type (homepage, team page, contact page, lead record) |
| Target goal g* | Extract a qualified lead (name + email + role) |
| Achieved goals G_ach | Set of page types successfully reached and extracted from |
| Action a | Click link / fill form / navigate URL |
| Episode | Single crawl session on one company domain |
| Sparse reward | +1 only when a lead is fully extracted, 0 otherwise |
| Value V(s,g) | Estimated probability of reaching page type g from current page s |
| Critic ensemble | Multiple Q-networks estimating crawl path success |

### Progressive Curriculum (homepage -> team -> contact -> lead)

DISCOVER's three-criteria goal selection naturally generates the desired progression:

1. **Cold start (episodes 1-N):** Agent can only reach homepages. G_ach = {homepage}. High uncertainty everywhere. Agent explores links from homepage, gradually discovering /about, /team, /careers pages.

2. **Early curriculum:** G_ach expands to {homepage, about, team}. The relevance term V(g, g*) starts favoring team/people pages over blog posts or product pages because team pages are closer (in crawl-path distance) to actual lead records.

3. **Mid curriculum:** Agent consistently reaches team pages. Alpha adapts downward, pushing toward harder goals. The curriculum shifts to extracting structured data: finding email patterns, identifying role titles, locating contact forms.

4. **Convergence:** Agent reliably completes the full chain: homepage -> team/about -> individual profile -> extract lead. The relevance term ensures it does not waste episodes exploring documentation pages, changelog pages, or other dead ends.

### What Would Need to Change

1. **State representation:** DISCOVER uses continuous state vectors. Web pages need encoding -- DOM embeddings, URL features, page-type classifiers. A pre-trained page encoder (e.g., from a small BERT or the existing GLiNER/AXE models) would provide the feature vector.

2. **Goal space definition:** DISCOVER selects from previously achieved states. For the crawler, this means defining a goal taxonomy: page types (homepage, team, about, contact, individual profile, job posting) rather than arbitrary continuous coordinates.

3. **Discrete actions:** DISCOVER operates in continuous action spaces. Web crawling has discrete actions (click link N, navigate URL, fill form). This requires swapping the continuous policy for a discrete one (DQN-style), but the goal selection mechanism is action-space agnostic.

4. **Value function generalization:** The theoretical guarantee assumes the value function generalizes from nearby goals to distant ones. For web pages, this means the encoder must capture semantic similarity (team pages on different websites should look "close" in embedding space). This is plausible with modern encoders but not guaranteed.

5. **Episode structure:** DISCOVER assumes episodic resets. Web crawling is naturally episodic per domain (start at homepage, crawl, extract or fail, move to next domain).

### Concrete Implementation Sketch

```
# Pseudo-code for DISCOVER-augmented crawler

class DiscoverCrawler:
    def __init__(self):
        self.page_encoder = PretrainedPageEncoder()  # DOM -> R^d
        self.critic_ensemble = [QNetwork() for _ in range(5)]
        self.goal_taxonomy = PageTypeGoals()  # homepage, team, contact, lead
        self.achieved_goals = {encode("homepage")}
        self.alpha = 1.0  # start explore-heavy
        self.target_goal = encode("qualified_lead")
        self.replay_buffer = HERBuffer()

    def select_goal(self):
        scores = {}
        for g in self.achieved_goals:
            achievability = mean([Q(s0, g) for Q in self.critic_ensemble])
            novelty = std([Q(s0, g) for Q in self.critic_ensemble])
            relevance = mean([Q(g, self.target_goal) for Q in self.critic_ensemble])
            rel_uncertainty = std([Q(g, self.target_goal) for Q in self.critic_ensemble])
            scores[g] = (self.alpha * (achievability + novelty)
                       + (1 - self.alpha) * (relevance + rel_uncertainty))
        return max(scores, key=scores.get)

    def run_episode(self, domain):
        goal = self.select_goal()
        trajectory = self.crawl(domain, goal)
        self.replay_buffer.add(trajectory)
        self.achieved_goals |= {encode(page) for page in trajectory.visited}
        # HER relabeling: re-label failed episodes with actually-reached goals
        self.replay_buffer.relabel(trajectory)
        self.update_critics()
        self.adapt_alpha(trajectory.achieved_goal == goal)
```

### Synergy with Other Novelty-Crawler Components

- **Craw4LLM (item 1 in 08-novelty.md):** Pre-filters frontier URLs before DISCOVER's goal selection. DISCOVER picks the page TYPE to aim for; Craw4LLM filters which URLs are plausible paths to that type.
- **QMin quality propagation (item 2):** Provides a complementary signal for the relevance term -- propagating known lead-quality scores backward through the link graph.
- **Semi-supervised reward shaping (item 4):** Fills the gap between DISCOVER's sparse +1 reward and the dense signal needed for fast learning. DISCOVER handles goal selection; reward shaping handles within-episode credit assignment.
- **ARB replay prioritization (item 5):** Replaces uniform replay sampling with on-policyness-weighted sampling, directly improving DISCOVER's critic ensemble training.

---

## Risks & Limitations

### Fundamental Concerns for Crawler Application

1. **Continuous-to-discrete gap.** DISCOVER is designed and validated entirely in continuous state-action spaces (robotics). Web crawling is fundamentally discrete (click link A vs B). The goal selection mechanism is action-agnostic, but the critic ensemble and HER relabeling need adaptation for discrete domains.

2. **Goal space structure assumption.** The theoretical bound assumes geodesic convexity -- that optimal paths between goals pass through intermediate achievable goals. Web navigation violates this: a direct link from homepage to contact page can skip the "team page" intermediate entirely. The curriculum may not form the clean progression assumed.

3. **Value function generalization.** DISCOVER's entire mechanism depends on the critic V(g, g*) generalizing to unseen goals. For robotics, physical continuity provides this for free. For web pages, generalization requires a good page encoder. A poorly trained encoder will make DISCOVER degenerate to random goal selection.

4. **Ensemble computational overhead.** Training 5+ critic networks increases memory and compute by 5x. For a web crawler running on M1 Mac with 8GB, this is significant. The paper itself notes this "potentially limits applicability to implementations involving large critic networks."

5. **No wall-clock benchmarks.** The paper provides zero information about computational cost or wall-clock time. JAX on GPU may be fast; PyTorch on M1 CPU will be substantially slower.

6. **Small, inactive codebase.** 11 commits, 8 stars, no license declared. Not production-grade. Would need significant adaptation.

### Mitigations

- The goal taxonomy can be made small (5-10 page types), reducing the "continuous goal space" problem to a tractable discrete set.
- Page encoders from existing models (BERT, AXE, etc.) provide reasonable generalization priors.
- Ensemble size can be reduced to 2-3 critics with minor accuracy loss.
- HER is well-studied in discrete action spaces (Atari, text games) and transfers readily.

### What DISCOVER Does NOT Solve

- **Cross-domain transfer:** Each domain starts cold. DISCOVER does not address how to transfer a curriculum learned on company-A.com to company-B.com. Meta-learning or pre-training would be needed.
- **Multi-step extraction:** DISCOVER selects a single goal per episode. Complex lead extraction (find person -> find email -> verify -> extract) may need hierarchical goal decomposition, which the authors list as future work.
- **Dynamic websites:** DISCOVER assumes a stationary environment. Websites that change between visits (A/B tests, login walls, CAPTCHAs) violate stationarity.

---

## Verdict (1-5 applicability score with justification)

### Score: 3 / 5 -- Interesting conceptual framework, but high adaptation cost for marginal gain

**Why not higher (4-5):**

- DISCOVER is validated exclusively in continuous robotics domains. Zero evidence it works for discrete web navigation.
- The theoretical guarantees (linear value functions, geodesic convexity) are unlikely to hold in web graph topology.
- The cold-start problem it solves (agent in a continuous maze with no reward) is only loosely analogous to the crawler's cold-start problem (agent on a website with some structural priors about HTML/link structure).
- Simpler curriculum approaches (hardcoded page-type progression, or Craw4LLM's fastText pre-filter) achieve the "homepage -> team -> contact -> lead" progression without requiring an ensemble of critic networks.
- The existing novelty-crawler already has stronger candidates for the same niche: semi-supervised reward shaping (item 4, score 5/5) directly solves sparse rewards, and Craw4LLM (item 1, score 5/5) provides URL-level curriculum for free.

**Why not lower (1-2):**

- The three-criteria framework (achievability + novelty + relevance) is a genuinely useful mental model for crawler goal selection, even if implemented heuristically rather than via DISCOVER's full machinery.
- The adaptive alpha mechanism (self-regulating difficulty) is a clean, portable idea that could be grafted onto any curriculum system in ~50 lines of code.
- The connection to UCB bandits provides theoretical justification for the explore-exploit tradeoff that any crawler faces.
- If the crawler eventually moves to a learned policy (DQN or Decision Transformer), DISCOVER's goal selection could be layered on top as the curriculum controller.

**Recommendation:** Extract the design principles (achievability-novelty-relevance tradeoff, adaptive difficulty via alpha) and implement them as lightweight heuristics in the crawler's existing architecture. Do not port the full DISCOVER algorithm -- the JAX/continuous-space infrastructure is too far from the web crawling stack, and the benefit over simpler curriculum methods is unproven in this domain.

---

## References

- [arXiv:2505.19850](https://arxiv.org/abs/2505.19850) -- DISCOVER paper (v2, Oct 2025)
- [arXiv HTML](https://arxiv.org/html/2505.19850v1) -- Full text with figures
- [GitHub: LeanderDiazBone/discover](https://github.com/LeanderDiazBone/discover) -- Reference implementation
- [ETH Research Collection](https://www.research-collection.ethz.ch/entities/publication/d877b41e-5bb0-45a2-8b78-d8e306a10745) -- Institutional record
- [OpenReview](https://openreview.net/forum?id=0kjOajnJQM) -- NeurIPS 2025 submission
- [Literature Review (TheMoonlight)](https://www.themoonlight.io/en/review/discover-automated-curricula-for-sparse-reward-reinforcement-learning) -- Third-party analysis
- [ResearchGate](https://www.researchgate.net/publication/392134422_DISCOVER_Automated_Curricula_for_Sparse-Reward_Reinforcement_Learning) -- PDF access
