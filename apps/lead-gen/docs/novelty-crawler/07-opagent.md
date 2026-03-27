# OpAgent -- Hybrid Reward with Reflector -- Deep Dive

**Paper:** [arXiv:2602.13559](https://arxiv.org/abs/2602.13559) (February 14, 2026)
**Authors:** Yuyu Guo, Wenjie Yang, Siyuan Yang, Ziyang Liu, Cheng Chen, Yuan Wei, Yun Hu, Yang Huang, Guoliang Hao, Dongsheng Yuan, Jianming Wang, Xin Chen, Hang Yu, Lei Lei, Peng Di (CodeFuse / Ant Group)
**Code:** [github.com/codefuse-ai/OpAgent](https://github.com/codefuse-ai/OpAgent) (Apache-2.0, Python, 154 stars)
**Benchmark:** WebArena SOTA -- 71.6% resolve rate (#1 on leaderboard, January 2026)

---

## Paper Summary

OpAgent addresses the core failure mode of autonomous web agents: distributional shift between static training data and volatile, real-world websites. Supervised fine-tuning and offline RL produce agents that collapse when pages change layout, require authentication, or present unexpected UI patterns.

The paper contributes three interlocking innovations:

1. **Hierarchical Multi-Task SFT (MT-SFT)** -- A Vision-Language Model trained across three functional primitives (Planning, Acting, Grounding) with an effective-weight rebalancing scheme to handle dataset size imbalance.
2. **Online Agentic RL with Hybrid Reward** -- An interactive RL pipeline on live websites using Group Relative Policy Optimization (GRPO) with KL-Cov regularization. The reward signal combines an LLM-based WebJudge (outcome-level) with a Rule-based Decision Tree (process-level), providing dense credit assignment in long-horizon tasks.
3. **Collaborative Agentic Architecture** -- A modular inference framework of Planner, Grounder, Reflector, and Summarizer that enables error recovery, self-correction, and dead-end detection at test time.

The RL-enhanced single model achieves 38.1% (pass@5) on WebArena. The full multi-agent OpAgent system reaches 71.6%, outperforming GPT-5 and Claude Code-based competitors.

---

## Architecture & Algorithms

### Training Pipeline

#### Stage 1: Hierarchical Multi-Task SFT

The VLM (Qwen2.5-VL base) is fine-tuned across three primitives:

| Primitive | Dataset | Purpose |
|-----------|---------|---------|
| Planning | WebDreamer | State transition reasoning |
| Acting | Mind2Web + Aguvis | Low-level action execution trajectories |
| Grounding | UGround | Spatial element localization |

**Effective Weight Strategy** -- Dataset sizes vary by orders of magnitude (UGround has millions of samples, Mind2Web has thousands). To prevent large datasets from dominating gradients:

```
E_ni = (1 - beta^ni) / (1 - beta)      where beta = 1 - 10^-k
alpha_i = C * (1 - beta^ni)^-1 / SUM_j(1 - beta^nj)^-1
L_SFT = (1/B) * SUM_m [ alpha_dataset(m) * (1/T_m * SUM_t l_m,t) ]
```

This ensures balanced gradient contribution from heterogeneous tasks.

**MT-SFT Results (ScreenSpot v2 Grounding):**

| Model | Web-Text | Web-Icon | Avg |
|-------|----------|----------|-----|
| UI-TARS-72B | -- | -- | 90.3% |
| MFT Qwen2.5-VL-72B | 94.3% | 84.4% | **91.3%** |

#### Stage 2: Online Agentic RL with Hybrid Reward

**Infrastructure** -- Four-layer distributed system:
- Environment Layer: Playwright browser clusters
- Infrastructure Layer: Asynchronous thread management
- Execution Layer: VLM rollout coordination
- Decision Layer: Reward computation and policy updates

**Key design choice:** Only the current screenshot is provided as visual input each step. Historical actions and reasoning are preserved as text context only. This prevents visual hallucinations from accumulating across long trajectories.

**Training algorithm:** GRPO with KL-Cov regularization to prevent entropy collapse. The iterative refinement loop harvests high-reward trajectories from RL rollouts and reincorporates them into the SFT dataset for subsequent RL rounds.

### Hybrid Reward Architecture

The reward system is the paper's central contribution. It addresses the credit assignment problem in long-horizon web navigation (20+ step trajectories where a single terminal +1/-1 is uninformative).

#### Component 1: WebJudge (Outcome-Level, LLM-Based)

A VLM evaluates complete trajectories across three axes:

| Dimension | Scale | What it measures |
|-----------|-------|------------------|
| Task Completion | -1 to 5 | Final fulfillment of user goal |
| Action Validity | 1 to 5 | Precision of element targeting (visual diff between consecutive screenshots) |
| Trajectory Efficiency | 1 to 5 | Path conciseness; penalizes redundant steps and circular patterns |

**Critical design:** Score of -1 on Task Completion signals an insurmountable obstacle (authentication wall, network failure, CAPTCHA). These trajectories are **discarded from the training set** entirely, preventing the policy from learning noise.

**Ground-truth-agnostic:** WebJudge does not require oracle trajectories or manual annotations. It judges purely from visual evidence and task description. This enables scalable training on arbitrary live websites without human labeling.

#### Component 2: Rule-Based Decision Tree (Process-Level, Deterministic)

Algorithm 1 provides per-step feedback through a hierarchical decision cascade:

```
function RDT_Reward(action_result, s_{t-1}, s_t, accessibility_tree):
  1. IF execution_failed           -> RETURN penalty
  2. IF URL_changed(s_{t-1}, s_t)  -> RETURN 0    (meaningful state transition)
  3. IF coords_on_interactable(action, accessibility_tree)
                                   -> RETURN 0    (valid affordance targeting)
  4. IF SSIM(s_{t-1}, s_t) == 1.0  -> RETURN penalty (-0.001)
                                                    (pixel-identical = redundant action)
  5. IF VLM_judges_progress(s_{t-1}, s_t, instruction)
                                   -> RETURN 0    (semantic progress confirmed)
  6. ELSE                          -> RETURN penalty (visual noise, irrelevant change)
```

**Key mechanisms:**
- **SSIM-based cycle detection:** If the screenshot is pixel-identical before and after an action (SSIM == 1.0), the action is classified as redundant/invalid. This catches stuck loops.
- **Affordance validation:** Checks whether clicked coordinates fall within bounding boxes of interactable elements from the accessibility tree.
- **Semantic fallback:** When structural checks are inconclusive, a lightweight VLM compares pre/post screenshots against the instruction to judge whether meaningful progress was made.

#### Dense vs. Sparse: How This Solves Credit Assignment

Traditional web crawlers provide terminal-only reward: +1 if the task succeeded, -1 or 0 if not. For a 25-step trajectory, this provides zero learning signal about which of the 25 actions were good or bad.

OpAgent's hybrid approach provides:
- **Per-step signals** from the RDT (process reward): immediate feedback on whether each individual action was valid, redundant, or erroneous
- **Trajectory-level signals** from WebJudge (outcome reward): holistic assessment of whether the overall path was efficient and goal-aligned
- **Combined reward:** The final reward for RL training composes both signals -- format compliance reward + RDT process reward + WebJudge outcome reward

This transforms a sparse binary outcome into a dense, shaped reward landscape that GRPO can optimize effectively.

### Reflector Mechanism -- Error Recovery

The Reflector is the test-time error recovery module in the four-agent inference architecture. It runs after every action and before the next planning step.

#### Reflector Responsibilities

1. **Factual Verification** -- Confirms whether the last action achieved its intended effect by analyzing the visual evidence (current screenshot vs. expected state). Critically, it relies strictly on visual ground truth, preventing hallucination-driven false progress where the agent "thinks" it navigated somewhere but the page hasn't actually changed.

2. **Incremental Extraction** -- Identifies and records goal-relevant information discovered during navigation into structured `marked_notes`. For example, if the task is "find the price of item X," and the Reflector sees the price on screen, it extracts and stores it for later synthesis.

3. **Blocker Detection** -- Monitors for hard blockers that make task completion impossible:
   - Login/authentication walls
   - CAPTCHAs
   - Network failures / 404 pages
   - Permission denied states

   When a hard blocker is detected, the Reflector triggers **early termination**, preventing the agent from wasting remaining steps on an impossible path.

#### Dead-End Recovery Flow

```
LOOP:
  1. Grounder executes action on page
  2. Reflector observes new screenshot
  3. Reflector evaluates:
     a. Did the action succeed? (visual diff analysis)
     b. Is there a hard blocker? -> YES: early terminate
     c. Did we make progress toward the goal? -> NO: signal failure to Planner
     d. Is there extractable goal-relevant info? -> YES: append to marked_notes
  4. Planner receives Reflector's status signal
     - On FAILURE signal: Planner re-plans, potentially:
       * Trying alternative navigation path
       * Using browser back button
       * Searching for the target via a different route
     - On SUCCESS signal: Planner continues with next step
  5. Summarizer synthesizes marked_notes when task is complete or max steps reached
```

The key insight is that the Reflector creates an **adaptive feedback loop** between perception (what actually happened on the page) and planning (what to do next). Without the Reflector, the Planner operates open-loop and can compound errors across many steps. With it, every error is caught at the next step and triggers corrective re-planning.

#### State Maintained by the Agent

```
state = {
  steps: [],            # history of (action, observation) pairs
  marked_notes: [],     # goal-relevant extracted information
  last_screenshot: img  # current visual state
}
```

### Inference Architecture (Full OpAgent)

| Module | Model | Role |
|--------|-------|------|
| Planner | Gemini-3-Pro | Decomposes task into atomic steps, integrates historical context + expert tips, performs adaptive re-planning on failure signals |
| Grounder | Qwen2.5-VL-72B-MFT | Visual grounding -- identifies UI elements from screenshots, generates precise coordinates and tool calls |
| Reflector | Gemini-3-Pro | Post-action verification, information extraction, blocker detection |
| Summarizer | Gemini-3-Pro | Temporal fusion across full trajectory, synthesizes marked_notes into final answer |

The Grounder uses the RL-enhanced VLM (the model trained in Stages 1-2), while the reasoning modules (Planner, Reflector, Summarizer) use a frontier proprietary model (Gemini-3-Pro) for their higher-level reasoning demands.

---

## Benchmarks & Results

### WebArena Leaderboard (January 2026)

| Agent | Backbone | Success Rate |
|-------|----------|-------------|
| **OpAgent** | **Qwen2.5-VL-72B + Gemini-3-Pro** | **71.6%** |
| ColorBrowserAgent | GPT-5 | 71.2% |
| GBOX AI | Claude Code | 68.0% |
| DeepSky Agent | -- | 66.9% |
| Narada AI | -- | 64.2% |

### WebArena by Domain

| Domain | OpAgent |
|--------|---------|
| Shopping | 59.2% |
| CMS | 71.3% |
| Reddit | 86.0% |
| GitLab | 75.9% |
| Maps | 71.4% |

### Single-Model RL Results (WebArena, Qwen3-VL-32B-Thinking)

| Configuration | Success Rate |
|---------------|-------------|
| Baseline (no RL) | 27.4% |
| RL-HybridReward-Zero | 38.1% (pass@5) |
| Improvement | +10.7% absolute |

### Wild Website Evaluation (87 diverse test queries)

| Configuration | Average Score (0-5) |
|---------------|-------------------|
| Baseline Qwen2.5-VL-72B | 2.01 |
| RL-HybridReward-Zero | 3.09 |
| RL-HybridReward (full) | 3.56 |

Performance gains exceed 2 points across Automotive, News, Education, and Finance domains.

### Grounding Accuracy (GUIAct Web-Multi)

| Model | Type EM | Click Acc | Step SR |
|-------|---------|-----------|---------|
| MFT Qwen2.5-VL-7B | 83.3% | 64.4% | 71.9% |
| MFT Qwen2.5-VL-72B | 84.1% | 67.3% | 73.6% |

---

## Code Availability

**Repository:** [github.com/codefuse-ai/OpAgent](https://github.com/codefuse-ai/OpAgent)
**License:** Apache-2.0
**Language:** Python (96.2%)
**Stars/Forks:** 154 / 20 (as of March 2026)

### What is released:

| Component | Status |
|-----------|--------|
| Single-model mode (VLM direct navigation) | Released |
| Agentic framework (Planner/Grounder/Reflector/Summarizer) | Released |
| INT4-quantized model (24GB VRAM) | Released (March 2026) |
| HuggingFace + ModelScope demo | Released (March 2026) |
| WebArena evaluation harness | Released |
| RL training pipeline | **Not released** |
| MT-SFT training code | **Not released** |
| WebJudge implementation | **Not released** |
| RDT reward code | **Not released** |

### Project Structure

```
opagent/                    # Full agentic framework
opagent_single_model/       # Streamlined single-model mode
technical_report/           # Paper and supplementary
webarena_results/           # Benchmark evaluation results
```

### Key Implementation Details

- `LocalWebAgent` -- Main agent loop maintaining task state, orchestrating model calls
- `LocalModelCaller` -- Unified interface for MatrixLLM, Gemini, CodeBot, OpenAI SDK, HTTP backends
- `BrowserActor` -- Playwright browser automation with distributed execution support
- Four specialized prompt templates: `REFLECTION_PROMPT`, `PLANNER_PROMPT`, `GROUNDER_PROMPT`, `SUMMARY_PROMPT`

### Quickstart (Single Model)

```bash
cd opagent_single_model
pip install -r requirements.txt
python main.py
```

**Important caveat:** The RL training infrastructure (the most novel contribution) is not open-sourced. The released code is the inference-time agentic framework only.

---

## Integration with DQN Crawler

### Relevance to Our Architecture

Our DQN crawler uses a simpler architecture: a replay buffer stores (state, action, reward, next_state) transitions from crawl episodes, and a DQN learns to select optimal crawl actions. The reward signal is currently binary (found relevant job = +1, dead end = 0).

OpAgent's hybrid reward mechanism directly addresses our sparse-reward problem:

### What We Can Adopt

1. **Rule-Based Decision Tree for process reward** -- Adapt the RDT concept to crawl actions:
   - URL changed to new domain/path = 0 (neutral progress)
   - Page content SSIM identical to previous = penalty (stuck in loop)
   - Page contains job-related keywords = small positive reward
   - 404/403/timeout = penalty
   - This provides per-step signal without any LLM calls

2. **LLM judge for outcome reward** -- At episode end, use a cheap LLM (DeepSeek) to score the trajectory:
   - Did the crawl path discover new job listings? (0-5)
   - Was the path efficient (few redundant pages)? (0-5)
   - Combine into a shaped terminal reward

3. **Reflector pattern for dead-end recovery** -- Add a lightweight check after each crawl action:
   - Is the page a login wall / CAPTCHA / cookie consent blocker?
   - Has the crawler revisited this URL pattern before?
   - Is the page content entirely off-topic (no job-related signals)?
   - On detection: backtrack and try alternative link/path

4. **SSIM-based cycle detection** -- Our crawler can compute visual or content similarity between consecutive pages to detect loops without LLM calls.

### What Does NOT Transfer

- **Multi-agent architecture (Planner/Grounder/Reflector/Summarizer):** Overkill for crawling. We don't need visual grounding or complex task decomposition. A single DQN agent with shaped rewards is sufficient.
- **VLM-based visual reasoning:** We process HTML/text, not screenshots.
- **GRPO training:** Our DQN uses standard experience replay + target network. GRPO is designed for LLM policy optimization, not Q-learning.
- **Gemini-3-Pro dependency:** The inference framework depends on a frontier proprietary model. Not viable for high-volume crawling.

### Proposed Hybrid Reward for DQN Crawler

```python
def compute_crawl_reward(prev_page, curr_page, action, episode_complete=False):
    """OpAgent-inspired hybrid reward for crawl actions."""
    process_reward = 0.0

    # RDT-inspired per-step checks
    if action_failed(curr_page):                    # timeout, 4xx, 5xx
        process_reward = -0.01
    elif is_login_wall(curr_page):                  # hard blocker detection
        process_reward = -0.02
    elif content_similarity(prev_page, curr_page) > 0.95:  # SSIM-like cycle
        process_reward = -0.005
    elif has_job_signals(curr_page):                # keyword-based progress
        process_reward = 0.01
    else:
        process_reward = 0.0                        # neutral navigation

    if episode_complete:
        # WebJudge-inspired outcome reward (LLM or heuristic)
        outcome_reward = score_episode_quality(episode)  # 0.0 to 1.0
        return process_reward + outcome_reward

    return process_reward
```

---

## Risks & Limitations

### Paper Limitations

1. **No ablation study** -- The paper does not isolate the contribution of individual components (WebJudge alone, RDT alone, Reflector alone). It is impossible to know how much each piece contributes to the 71.6% result.

2. **Proprietary model dependency** -- The SOTA result requires Gemini-3-Pro for three of four modules. The open-source single-model achieves only 38.1%. The gap (33.5 percentage points) is primarily attributable to the proprietary reasoning model, not the hybrid reward.

3. **Training code not released** -- The RL pipeline, WebJudge, and RDT reward implementation are not open-sourced. Replication requires significant engineering effort.

4. **WebArena-specific** -- All benchmarks are on WebArena (5 domains). Generalization to arbitrary websites is demonstrated only on the 87-query "wild" evaluation, which is relatively small.

5. **Compute cost** -- Running Gemini-3-Pro for Planner + Reflector + Summarizer at every step of every trajectory is expensive. The paper does not report cost per task.

6. **No comparison with simpler baselines** -- How does a well-prompted Gemini-3-Pro monolithic agent compare? The multi-agent overhead may not justify the marginal gain over ColorBrowserAgent (71.6% vs 71.2%).

### Risks for Our Use Case

1. **Overhead vs. benefit** -- Adding LLM-based outcome scoring to every crawl episode will increase cost. For high-volume job crawling (thousands of pages/day), even cheap models add up. The RDT-style rule-based rewards are free and may capture 80% of the benefit.

2. **Content similarity is not visual similarity** -- Our crawler processes HTML, not screenshots. SSIM doesn't apply directly; we'd need text-based similarity (cosine similarity of TF-IDF vectors, or simpler: URL deduplication + content hash).

3. **Dead-end taxonomy differs** -- Web navigation dead-ends (login walls, CAPTCHAs) are different from crawl dead-ends (no more links, off-topic content, rate limiting). The Reflector pattern transfers conceptually but the specific checks need redesign.

4. **Training instability** -- GRPO with KL-Cov is designed to prevent entropy collapse in LLM policy optimization. Our DQN has different stability characteristics (target network lag, replay buffer staleness). The RL insights don't transfer directly.

---

## Verdict (1-5 applicability score with justification)

**Score: 3.5 / 5 -- Selectively Applicable**

### Justification

OpAgent's most transferable contribution is the **hybrid reward architecture** -- specifically the idea of combining cheap, deterministic per-step checks (Rule-Based Decision Tree) with an occasional holistic quality assessment (WebJudge). This directly solves our DQN crawler's sparse-reward problem without requiring the full multi-agent infrastructure.

**What to take:**
- The RDT pattern for per-step crawl rewards (free, deterministic, immediate)
- Content-similarity-based cycle detection (adapted from SSIM to text similarity)
- Hard blocker detection as early termination signal (login walls, CAPTCHAs, rate limits)
- Optional LLM judge for episode-level quality scoring (can run asynchronously, batched)

**What to leave:**
- The four-agent inference architecture (Planner/Grounder/Reflector/Summarizer) -- too heavy for crawling
- VLM-based visual reasoning -- irrelevant for HTML crawling
- GRPO training -- incompatible with DQN
- Gemini-3-Pro dependency -- cost-prohibitive at crawl scale

The deduction from 5 reflects: (a) the multi-agent framework doesn't fit our DQN architecture, (b) training code is not released so we can't replicate the RL pipeline, (c) the SOTA result is heavily dependent on a proprietary frontier model rather than the hybrid reward alone. However, the reward shaping ideas are directly actionable and can be implemented in our existing codebase within a few hours.

---

## Sources

- [OpAgent Paper (arXiv:2602.13559)](https://arxiv.org/abs/2602.13559)
- [OpAgent HTML Version](https://arxiv.org/html/2602.13559)
- [OpAgent GitHub Repository](https://github.com/codefuse-ai/OpAgent)
