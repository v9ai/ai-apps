# Novelty-Driven Exploration in an RL-Based Web Crawler

## What this codebase is

A production-grade RL-based web crawler for B2B lead generation, running entirely on Apple M1 (zero cloud dependency). The crawler navigates websites autonomously, learning to reach lead pages (contact info, team bios) from cold starts at homepages. The entire exploration problem is framed as a sparse-reward MDP.

The sparse reward problem is fundamental: in thousands of crawl steps, only a handful of pages ever yield a lead (+1 reward) or an entity (+0.2 reward). A naive DQN gets stuck. The codebase solves this with **three interlocking novelty mechanisms**.

---

## Mechanism 1: Intrinsic Curiosity Module (ICM)

**File**: `crawler_curiosity.py`
**Paper**: Pathak et al. 2017 "Curiosity-driven Exploration by Self-Supervised Prediction"

The ICM adds an intrinsic reward signal based on **prediction surprise**. When the crawler lands on a structurally novel page it hasn't seen before, the forward model fails to predict the next state accurately — and that prediction error *is* the reward.

Architecture (three small MLPs, ~2 MB total):
- **FeatureEncoder**: compresses 784-dim page state (768-dim Nomic embeddings + 16 scalar features) down to 256-dim latent phi(s)
- **ForwardModel**: given (phi(s_t), action), predicts phi(s_{t+1}). High MSE = the transition was surprising = explore more.
- **InverseModel**: given (phi(s_t), phi(s_{t+1})), predicts the action taken. This regularises the encoder to ignore noise (ad banners, timestamps, layout jitter) and focus only on action-relevant structure.

The augmented reward is:
```
r_total = r_extrinsic + 0.1 * min(curiosity_MSE, 5.0)
```

This gives the agent signal even when no lead is found, as long as the page structure was novel. Curiosity naturally decays as the forward model learns familiar patterns (e.g., "we've seen 50 homepages, they're no longer surprising").

The **CuriosityTracker** maintains per-domain rolling averages of curiosity scores (window=200). Domains with high mean curiosity = structurally diverse, unexplored territory. The scheduler uses these scores to prioritise which domains to revisit.

---

## Mechanism 2: World Model + Ensemble Uncertainty (WebDreamer)

**File**: `crawler_world_model.py`
**Paper**: WebDreamer (arXiv:2411.06559), Dyna-Q (Sutton 1991)

Where ICM measures novelty in observed transitions, the world model estimates **uncertainty about future transitions** — planning ahead to avoid known-bad paths and seek known-unknown regions.

Architecture:
- **EnsembleWorldModel**: 5 independent transition MLPs (794→256→256→786). Each predicts (next_state, reward, done). Ensemble disagreement = epistemic uncertainty.
- **TreeSearchPlanner**: forward simulation to depth=planning_horizon, width=planning_width. Branches with high ensemble uncertainty get pruned. Cumulative model reward + DQN Q-values score the leaves.
- **WebDreamerPlanner**: LLM look-ahead (local DeepSeek/Qwen 3B via MLX). Given URL patterns + anchor text, the LLM predicts page type and B2B lead quality before the crawler even fetches the page. Max 5 LLM simulations per decision (rate-limited). Falls back to DQN when LLM unavailable.
- **DynaTrainer**: generates synthetic transitions from the world model for DQN training. Sutton's Dyna-Q insight: every real experience spawns N synthetic ones, dramatically improving sample efficiency. Capped at 0.5 synthetic/real ratio to avoid model hallucination drift.

The **ModelBasedAgent** blends DQN epsilon-greedy with tree-search: planning weight ramps from 0.0 to 0.8 over a warmup period as the world model accumulates enough real transitions to be trusted.

Novelty here is **predictive uncertainty**: regions of the web graph the ensemble hasn't modelled well are implicitly valuable to visit — they reduce epistemic uncertainty and improve future planning quality.

---

## Mechanism 3: DISCOVER Auto-Curriculum

**File**: `crawler_discover.py`
**Paper**: Diaz-Bone et al., NeurIPS 2025

DISCOVER solves cold-start: a freshly initialised agent doesn't know how to reach a lead page from a homepage. Instead of trying the hardest goal immediately, DISCOVER builds a **curriculum of intermediate goals** ordered by difficulty.

Page type hierarchy (difficulty 0→6):
```
homepage → listing → company → team → about → contact → lead
```

Goal selection formula:
```
g = argmax_{g ∈ G_achieved} [
    alpha * (V(s0,g) + beta*sigma(s0,g))          # achievability + novelty
  + (1-alpha) * (V(g,g*) + beta*sigma(g,g*))       # relevance + uncertainty
]
```

- **V(s0,g)**: estimated value of reaching goal g from current start state
- **V(g,g*)**: estimated value of g as a stepping stone toward the ultimate goal g* (lead page)
- **sigma**: uncertainty (novelty bonus) — goals the agent hasn't visited much get explored more
- **alpha**: adaptive balance between achievability and relevance, self-regulating to maintain ~50% success rate

The **AchievedGoalSet** is SQLite-backed (goal embeddings for KNN novelty lookup). The **AdaptiveAlpha** module shifts alpha dynamically: if success rate drops below 50%, alpha increases (easier goals); if above 50%, alpha decreases (harder goals, more relevance-focused).

This produces a natural novelty drive: goals not yet in the achieved set have maximum novelty bonus, pulling the agent toward unexplored page types.

---

## How the three mechanisms interact

```
Real transition:
  ICM curiosity reward → augments r_extrinsic for DQN update
  World model learns the transition (real experience)
  DISCOVER records goal achievement if page type matches a goal

Planning phase:
  World model generates N synthetic transitions (Dyna-Q)
  Tree search + LLM look-ahead selects best action
  DISCOVER selects next intermediate goal based on uncertainty

Long-term:
  ICM curiosity decays on familiar domains (exploration settles)
  World model uncertainty decreases in well-visited regions
  DISCOVER curriculum advances toward harder goals as easy ones are mastered
```

The three mechanisms operate at different timescales:
- **ICM**: per-step (immediate curiosity reward)
- **World model**: per-episode (planning and synthetic experience)
- **DISCOVER**: across episodes (curriculum progression)

---

## Why this matters beyond crawling

The sparse-reward + novelty architecture is a general template. The same three-layer structure (intrinsic curiosity + ensemble uncertainty + curriculum) applies wherever an agent must explore a large graph with delayed rewards:
- Code navigation agents
- Scientific hypothesis generation
- Multi-step RAG pipelines with tool use
- Game-playing agents in procedurally generated worlds

The key engineering insight: none of these mechanisms requires a cloud model. The entire stack runs on a MacBook (M1, 16 GB RAM), using local embeddings, local LLM inference, and PyTorch on MPS. Novelty-driven RL at the edge.
