# WebDreamer -- LLM as World Model -- Deep Dive

**Paper:** Is Your LLM Secretly a World Model of the Internet? Model-Based Planning for Web Agents
**Authors:** Yu Gu, Kai Zhang, Yuting Ning, Boyuan Zheng, Boyu Gou, Tianci Xue, Cheng Chang, Sanjari Srivastava, Yanan Xie, Peng Qi, Huan Sun, Yu Su (Ohio State University + Orby AI)
**arXiv:** [2411.06559v2](https://arxiv.org/abs/2411.06559) (November 2024, updated April 2025)
**Venue:** TMLR 2025 (Transactions on Machine Learning Research)
**Repository:** [OSU-NLP-Group/WebDreamer](https://github.com/OSU-NLP-Group/WebDreamer)
**Models:** [HuggingFace Collection](https://huggingface.co/collections/osunlp/webdreamer-67ee17325839c8a02339dbfb) (Dreamer-7B, Dreamer-72B, domain variants)
**License:** Apache 2.0 (models), CC-BY-NC-SA-4.0 (training data)
**Context:** Evaluating WebDreamer as a "look-ahead" simulation layer before the DQN link selector in the B2B lead crawler.

---

## Paper Summary

WebDreamer addresses a fundamental limitation of search-based planning for web agents: real-world websites contain irreversible actions (submitting orders, changing settings, creating accounts), making backtracking -- the cornerstone of tree search -- infeasible or dangerous. The paper proposes **model-based planning** as an alternative, where an LLM simulates the outcomes of candidate actions *before* committing to any of them.

The core insight: LLMs pretrained on web-scale data have implicitly learned the structure and dynamics of websites. When prompted with a screenshot and a proposed action ("click Electronics"), they can predict the resulting state change in natural language ("The Electronics category will display three sub-categories: Computers & Accessories, Accessories & Supplies, and Car & Vehicle Electronics"). This turns the LLM into a **world model** for the internet.

WebDreamer achieves 23-42% relative improvement over reactive baselines across three benchmarks while being 4-5x more efficient than tree search. The trained Dreamer-7B model (fine-tuned Qwen2-VL-7B on 3.1M synthesized interactions) matches GPT-4o performance on two online benchmarks.

---

## Architecture & Algorithms

### Model Predictive Control (MPC) Framework

WebDreamer follows a classic MPC loop formalized as a POMDP: `(S, A, O, T, R, Omega)`. The agent only observes `o = Omega(s)` (screenshots), not the full state.

**Algorithm 1 -- WebDreamer (pseudocode from paper):**

```
Input: Instruction I; initial observation o_0
Output: Sequence of actions a_0, a_1, ..., a_T

t <- 0
while True do
    A_t <- get_candidate(I, o_t)        // Stage 1: Generate top-k actions
    A'_t <- self_refine(A_t)            // Stage 2: Filter irrelevant candidates
    a_t = argmax_{a in A'_t} score(sim(o_t, a))  // Stage 3: Simulate + score
    o_{t+1} <- execute(a_t)             // Stage 4: Execute best action
    t <- t + 1
    if termination_check() = True then break
end
```

### Four-Stage Pipeline (per step)

**Stage 1 -- Action Proposal (1 LLM call).** Given screenshot + task description + action history, the LLM generates top-k candidate actions. Uses Set-of-Mark prompting where interactable elements are numbered with colored bounding boxes. Available actions: `click [id]`, `type [id] [content]`, `hover [id]`, `press [key]`, `scroll`, `goto [url]`, `go_back`, `go_forward`, `stop [answer]`.

**Stage 2 -- Self-Refinement (1 LLM call).** A separate prompt asks the LLM to evaluate each candidate action and filter out clearly irrelevant ones. The prompt explicitly instructs: "filter out the actions that are very likely not relevant or helpful for the agent to accomplish the task." Returns semicolon-separated indices of selected actions. This is critical because different steps have different numbers of plausible actions -- some pages have 2 reasonable options, others have 8.

**Stage 3 -- Simulation + Scoring (N_candidates x (H simulation calls + M scoring calls)).**

For each surviving candidate action:
1. **World model call** (sim): Predict the state change as a natural language description. The prompt instructs: "predict the new changes that will occur on the webpage after the operation is performed, such as the appearance of new elements, the disappearance of existing elements, or changes in the content."
2. If planning horizon H > 1, the system also calls an **action imagination** module to propose the next action in the simulated trajectory, then another world model call to predict that state change, repeating H times.
3. **Scoring calls** (score): An LLM evaluates each simulated trajectory with a three-scale response: complete (1.0), on track (0.5), incorrect (0). Multiple scoring samples are averaged for robustness (default: `n=10` samples distributed across models, with `num_of_sim=3` simulations per action).

**Stage 4 -- Execution.** The action with the highest averaged score is executed on the real website.

### LLM Call Budget Per Step (Estimated)

With the default configuration from the codebase (`num_of_sim=3`, `n=10`, `steps=1`, top-k typically 5-8 candidates, self-refinement reducing to 3-5):

| Stage | Calls | Notes |
|---|---|---|
| Action proposal | 1 | Top-k generation |
| Self-refinement | 1 | Filter candidates |
| World model simulation | 3-5 | 1 per surviving candidate (H=1) |
| Scoring | 10 per candidate | Averaged for robustness |
| **Total per step** | **~32-52** | Dominated by scoring calls |

At H=1 (the recommended setting), total is approximately **2 + N_candidates + (10 x N_candidates)** LLM calls per step. With 4 candidates after refinement, that is ~46 calls.

### State Representation: Why Natural Language, Not HTML

The paper explicitly chose **concise natural language descriptions** of state changes over alternative representations (full HTML, accessibility trees):

> "predicting the entire page structure is unnecessarily wasteful" and "such concrete predictions are more prone to hallucination"

This is a critical design choice for our integration: the world model output is a short text paragraph, not a DOM tree.

---

## Benchmarks & Results

### Main Results (Table 1 from paper)

| Method | World Model | VisualWebArena | Online-Mind2Web | Mind2Web-Live |
|---|---|---|---|---|
| Reactive | - | 17.6% | 26.0% | 20.2% |
| Tree Search | - | 26.2% | - | - |
| **WebDreamer** | **GPT-4o** | **23.6%** | **37.0%** | **25.0%** |
| WebDreamer | Qwen2-VL-7B | 17.2% | 31.0% | 19.2% |
| WebDreamer | Qwen2-VL-72B | 21.0% | 31.0% | 18.3% |
| **WebDreamer** | **Dreamer-7B** | **21.9%** | **35.0%** | **24.0%** |

**Relative improvements over reactive baseline:**
- VisualWebArena: +34.1% (GPT-4o), +24.4% (Dreamer-7B)
- Online-Mind2Web: +42.3% (GPT-4o), +34.6% (Dreamer-7B)
- Mind2Web-Live: +23.8% (GPT-4o), +18.8% (Dreamer-7B)

### In-Domain Continual Training (Table 3)

With just 25K domain-specific interactions, Dreamer-7B matches or surpasses GPT-4o:

| Method | Classifieds | Reddit | Shopping | Total |
|---|---|---|---|---|
| Reactive | 17.9% | 14.3% | 19.3% | 17.6% |
| Tree Search | 26.8% | 20.6% | 28.9% | 26.2% |
| WebDreamer (GPT-4o) | 23.2% | 17.5% | 26.3% | 23.2% |
| WebDreamer (Dreamer-7B) | 21.4% | 15.9% | 25.4% | 21.9% |
| **WebDreamer (Dreamer-7B + In-Domain)** | **25.0%** | **15.9%** | **26.3%** | **23.2%** |

### Efficiency (Table 2 -- VWA, all GPT-4o)

| Metric | Reactive | Tree Search | WebDreamer |
|---|---|---|---|
| Steps (Classifieds) | 3.4 | 9.9 | 4.1 |
| Steps (Reddit) | 5.1 | 13.6 | 5.2 |
| Steps (Shopping) | 4.5 | 11.4 | 4.5 |
| Seconds (Classifieds) | 68.3 | 749.2 | 183.6 |
| Seconds (Reddit) | 83.5 | 972.1 | 233.7 |
| Seconds (Shopping) | 87.7 | 785.7 | 179.4 |

WebDreamer adds ~2.5x latency over reactive but is 4-5x faster than tree search. The overhead comes entirely from simulation LLM calls, not additional page loads.

### Planning Horizon Ablation

| Horizon H | Online-Mind2Web |
|---|---|
| Reactive | ~26% |
| H=1 | ~37% |
| H=2 | ~32% |
| H=3 | ~26% |

Performance degrades beyond H=1 due to **action proposal hallucinations** -- the simulated action imagination becomes biased toward "seemingly relevant" actions that don't actually exist on the predicted page. Error accumulates multiplicatively.

### Intrinsic Evaluation (Table D.1 -- World Model Quality)

| World Model | Pair-wise Acc | State-level Acc | Task-level Acc |
|---|---|---|---|
| GPT-4o-mini | 85.30% | 78.01% | 47.73% |
| GPT-4o | 87.10% | 80.85% | 52.27% |
| Qwen2-VL-7B | 86.38% | 80.85% | 50.00% |
| Qwen2-VL-72B | 87.10% | 80.14% | 47.73% |
| **Dreamer-7B** | **88.53%** | **82.98%** | **52.27%** |

Dreamer-7B outperforms GPT-4o on pair-wise and state-level accuracy. Pearson correlation between intrinsic task-level accuracy and downstream success rate: **0.8455**.

---

## GitHub Repository

### Structure

```
WebDreamer/
  world_model.py          # Core: WebWorldModel class (state change prediction)
  simulation_scoring.py   # evaluate_simulation(), reward model integration
  controller.py           # select_actions() -- self-refinement/filtering
  demo_data/              # Sample screenshots for testing
  llms/                   # LLM client wrappers (OpenAI + Anthropic)
  vwa/                    # VisualWebArena experiment reproduction (WIP)
  mind2web-live/          # Mind2Web-Live experiments (WIP)
```

### Key Implementation Details

**world_model.py -- `WebWorldModel` class:**
- `state_change_prediction_in_website()` -- Initial prediction from screenshot + action. Supports formats: `"change"` (text description), `"html"`, `"accessibility"`.
- `action_proposal_in_imagination()` -- Proposes next action within a simulated trajectory.
- `state_change_prediction_in_imagination()` -- Predicts state change for imagined actions (conditioned on prior simulation history).
- `multiple_step_change_prediction(screenshot, task, action_description, format, k)` -- Orchestrates k-step look-ahead simulation loop.

**simulation_scoring.py -- `evaluate_simulation()`:**
```python
evaluate_simulation(
    screenshots, actions, task, url,
    action_description_list,     # Candidate actions to evaluate
    models=["gpt-4o"],
    num_of_sim=3,                # Simulations per action
    steps=1,                     # Horizon depth (H)
    n=10,                        # Scoring samples
    num_workers=15               # Parallel ThreadPoolExecutor workers
)
```

**controller.py -- `select_actions()`:**
- Takes screenshots + action history + candidate actions
- Sends multimodal prompt (base64 images + text) to GPT-4o
- Parses response to extract selected action indices via regex
- Returns filtered action list

### Dependencies

- Python (no specific version pinned)
- `openai` (API client)
- `PIL/Pillow` (image processing)
- `base64` (screenshot encoding)
- `tqdm` (progress tracking)
- `concurrent.futures` (ThreadPoolExecutor for parallel scoring)

### Model Serving

Dreamer-7B served via vLLM:
```bash
vllm serve osunlp/Dreamer-7B --api-key token-abc123 --dtype float16
```

Uses OpenAI-compatible API format with base64 image payloads.

### Data Synthesis Pipeline (Section 3.3 + Appendix C)

**Step 1 -- Web Random Walking:**
- Sample starting URLs from October 2024 Common Crawl Index
- Perform random web actions: click, hover, type, select
- Action probabilities weighted to match human interaction distribution (click 84%, hover 7.6%, type 6.9%, select 1.5%)
- Prioritize actions on newly emerged elements (e.g., click dropdown item after hover)
- Generate contextually relevant search queries using GPT-3.5-turbo
- Capture visual snapshots before and after each action

**Step 2 -- Synthesis:**
- Prompt Qwen2-VL-72B to generate textual descriptions of state changes from before/after screenshot pairs
- Red bounding box drawn around target element for precise localization
- Referring expression generated for the element (e.g., "the button showing the text 'Make Appointment'")
- 7 prompt templates randomly selected for diversity

**Training data statistics:**
- 3,160,247 total interactions across 1,247,960 unique URLs
- Click: 2,653,704 (84%), Hover: 241,234 (7.6%), Type: 217,692 (6.9%), Select: 47,617 (1.5%)
- Average action position in trajectory: 4.4 steps deep
- Dataset size: 1.24 TB (Parquet format with images)

**Dreamer-7B training:**
- Base model: Qwen2-VL-7B-Instruct
- 64x H100 GPUs (80GB each)
- 2 epochs, global batch size 192
- DecoupledAdamW optimizer, LR 1e-6, beta1=0.9, beta2=0.95
- Cosine decay schedule, 1000 warmup steps, decay to 10% of base LR
- Mixed-precision training
- Checkpoint selection via intrinsic evaluation every 1000 steps

**In-domain continual training:**
- 25K domain-specific instances per environment
- 1 epoch from Dreamer-7B checkpoint
- Reduced LR: 5e-7, warmup: 100 steps

---

## Cost & Local Model Feasibility

### API Costs with GPT-4o

The paper reports **~$1 per task on VisualWebArena** using GPT-4o. Tasks average ~4.5 steps. So roughly **$0.22 per step**, or approximately **$0.005 per individual LLM call** (at ~45 calls/step).

With GPT-4o pricing (~$5/M input, $15/M output tokens as of 2024), each world model call processes a screenshot (~1000 tokens for image) plus prompt (~500 tokens) and generates ~100-200 tokens of state change description. Each scoring call is similar but with more context.

**Per-step token budget estimate (H=1, 4 candidates):**

| Component | Input tokens | Output tokens | Calls | Total tokens |
|---|---|---|---|---|
| Action proposal | ~2000 | ~200 | 1 | ~2200 |
| Self-refinement | ~2500 | ~500 | 1 | ~3000 |
| World model sim | ~1500 | ~200 | 4 | ~6800 |
| Scoring | ~2000 | ~100 | 40 | ~84000 |
| **Total per step** | | | **46** | **~96,000** |

Scoring dominates. The paper averages 10 scoring samples per candidate. Reducing to 3 samples would cut total tokens by ~60%.

### Dreamer-7B Local Deployment

**Base model:** Qwen2-VL-7B-Instruct (8B parameters, BF16)

**Hardware requirements:**
- **Full BF16:** ~16 GB VRAM/unified memory. Runs on M1/M2 16GB with tight margins.
- **INT8 quantized:** ~8 GB. Comfortable on M1 16GB.
- **INT4 quantized (Q4_K_M):** ~5 GB. Could fit alongside the DQN model and embedding model.

**Training compute (to reproduce):** 64x H100 GPUs (80GB each), 2 epochs over 3.1M instances. Not reproducible locally; use the released checkpoints.

**In-domain continual training:** Only 25K instances needed. Could potentially be done on a single GPU with LoRA, though the paper used full fine-tuning with reduced LR (5e-7).

### Feasibility with Small Local Models (Qwen 0.6B-3B)

**Hard no for sub-7B text-only models in the original screenshot-based pipeline.** WebDreamer requires a **vision-language model** -- the world model takes screenshots as input. The smallest viable Qwen2-VL model is 7B (the 2B variant exists but is far weaker at complex scene understanding).

Specific problems with Qwen 0.6B-3B (text-only):
1. **No vision capability.** WebDreamer's world model prompt includes `<image_token>` with a screenshot. Text-only models cannot process this.
2. **Insufficient reasoning for state prediction.** Even if fed HTML instead of screenshots, sub-3B models lack the world knowledge to predict "clicking Electronics will show sub-categories: Computers & Accessories, Accessories & Supplies, and Car & Vehicle Electronics."
3. **The paper's own evidence:** Vanilla Qwen2-VL-7B (before fine-tuning) scored only 17.2% on VWA -- barely above the reactive baseline (17.6%). This means even a capable 7B VLM needs task-specific fine-tuning to be useful as a world model.

**Minimum viable local setup for the original pipeline:**
- Dreamer-7B INT4 (~5 GB) via vLLM or MLX on M1 16GB
- Alternatively: Qwen2.5-VL-7B-Instruct (newer, better vision) fine-tuned with LoRA on Dreamer-V1-Data
- MLX quantized variants available via `mlx-community` for Apple Silicon

**But the scoring function is the bottleneck, not the world model.** Even with a fast local world model, you still need a capable LLM for scoring. The scoring prompt requires complex reasoning about task progress. This is where sub-7B models will catastrophically fail.

**However: for our text-only crawler adaptation (see Integration section), Qwen 3B is viable** -- predicting what's behind a URL pattern + anchor text is fundamentally simpler than predicting full page state transitions from screenshots.

---

## Integration with DQN Crawler

### Current Crawler Architecture

The existing DQN agent (`crawler_dqn.py`) operates as:

```
Page -> nomic-embed-text-v1.5 (768-dim) + scalar features -> DQN MLP (784->512->256->10)
     -> Q-values for top-K links -> epsilon-greedy selection -> follow link
```

State: 784-dim (768 embedding + 16 scalar features). Actions: top-K link indices. Rewards: async (+1.0 lead, +0.2 entity, -0.1 irrelevant). Inference: 0.3ms ONNX/CoreML.

### Where WebDreamer Could Fit

**Option A -- Pre-Filter Before DQN (Recommended for exploration):**

```
Page -> Extract top-K links (K=10)
     -> WebDreamer world model: simulate clicking each link
     -> Score simulated outcomes for B2B relevance
     -> Filter to top-M (M=3-5) promising links
     -> DQN selects from filtered set
```

This reduces the DQN's action space from 10 to 3-5 high-quality candidates. The DQN then handles exploitation/exploration tradeoff over the pre-filtered set.

**Option B -- Override DQN During Exploration (epsilon-greedy replacement):**

```
if random() < epsilon:
    # Instead of random exploration, use WebDreamer to pick the most promising unexplored link
    simulated_outcomes = [world_model.predict(page, link) for link in links]
    scores = [score_b2b_relevance(outcome) for outcome in simulated_outcomes]
    action = argmax(scores)
else:
    action = DQN.select(state)
```

This replaces random exploration with **informed exploration** -- the LLM predicts which unvisited page is most likely to contain B2B leads.

**Option C -- Auxiliary Reward Signal:**

```
Page -> Follow link selected by DQN
     -> WebDreamer world model: predict what the page would contain
     -> Compare prediction with actual page
     -> Prediction accuracy as auxiliary reward signal for DQN training
```

This would help the DQN learn faster by providing denser reward signals.

### Practical Integration Design

For the B2B lead crawler, the full WebDreamer pipeline is overkill. We don't need screenshot-based vision models for link-level decisions on company career pages. A **text-only simplification** is more appropriate:

```python
class CrawlerWorldModel:
    """Simplified WebDreamer for B2B crawling.

    Instead of screenshot + VLM, use:
    - Page HTML/text summary as state
    - Link anchor text + URL pattern as action
    - Text LLM to predict page content after following link
    """

    def simulate(self, page_context: dict, link: dict) -> str:
        """Predict what content we'd find after clicking this link.

        Args:
            page_context: Current page title, URL pattern, visible text summary
            link: {url, anchor_text, surrounding_context}

        Returns:
            Natural language prediction of target page content
        """
        prompt = f"""Given this B2B company webpage:
        URL: {page_context['url']}
        Title: {page_context['title']}
        Context: {page_context['summary'][:500]}

        If we follow this link:
        Anchor: {link['anchor_text']}
        URL pattern: {link['url_pattern']}

        Predict: What content will we find? Is it likely to contain:
        - Job listings (especially remote EU positions)
        - Company contact information
        - Team/about pages with decision-maker names
        - Technology stack information

        Response format: relevance_score (0-1), predicted_content, reasoning"""

        return self.llm.generate(prompt)

    def rank_links(self, page_context: dict, links: list) -> list:
        """Rank all links by predicted B2B lead relevance."""
        predictions = [self.simulate(page_context, link) for link in links]
        return sorted(zip(links, predictions),
                      key=lambda x: x[1].relevance_score, reverse=True)
```

### Key Adaptation: No Screenshots Needed

For B2B crawling, the WebDreamer insight translates to: **use LLM world knowledge to predict what's behind a link before following it.** This does NOT require a vision model:

- **Input:** URL pattern + anchor text + page context (text)
- **Output:** Predicted page content relevance (text)
- **Model:** Any capable text LLM -- Qwen 3B could work here since it is text-only prediction, not vision

This dramatically changes the feasibility analysis. A text-only world model for link prediction:
- Qwen2.5-3B-Instruct: ~3 GB INT4, runs easily on M1
- Can handle 50-100 link evaluations per second with batching
- No vision capability needed -- the "world model" is just "what's typically behind a /careers link on a SaaS company website?"

### Call Budget for Crawler Integration

**Minimal viable integration (text-only, no screenshots):**

| Operation | LLM calls | Latency (local 3B) | Notes |
|---|---|---|---|
| Predict outcomes for 10 links | 10 | ~2s batched | Simple prompt, short output |
| Score/rank predictions | 0 | 0 | Parse structured output |
| **Total per page** | **10** | **~2s** | vs 0.3ms for DQN alone |

**This adds ~2s per page** if using a local 3B model. For a focused crawler visiting ~100 pages/session, that is ~200s of overhead. Acceptable if it improves lead discovery by even 20%.

---

## Risks & Limitations

### From the Paper

1. **Horizon degradation.** Performance drops at H>1 due to compounding hallucinations in simulated trajectories. At H=3, WebDreamer matches the reactive baseline (no improvement). For our crawler this is fine -- we only need H=1 (predict one click ahead).

2. **Computational cost.** ~$1/task with GPT-4o. The paper explicitly acknowledges this as "non-trivial" and suggests fine-tuning specialist models as the solution.

3. **Scoring dominates cost.** 10 scoring samples per candidate action is expensive. The paper does not ablate this number, but reducing to 3 samples would cut costs ~70% with likely modest accuracy loss.

4. **Vision model dependency.** The original framework requires screenshots and a VLM. This is unnecessary for our text-based crawler application, but it means Dreamer-7B specifically cannot be used without adaptation.

### For Our Integration

5. **Latency budget conflict.** The DQN currently runs at 0.3ms per decision. Adding even a fast local LLM call (50-100ms per link) increases decision time by 100-300x. This is acceptable for a focused crawler (not a general web scraper), but changes the crawl profile from "fast breadth-first" to "slow deliberate."

6. **Diminishing returns on simple sites.** B2B company websites have predictable structure: `/careers`, `/about`, `/team`, `/contact`. A simple URL pattern matcher may capture 80% of the value that a world model provides. The LLM world model adds most value on unusual or dynamic sites.

7. **Cold start.** The world model has no memory of previous crawl sessions. Each page evaluation is independent. The DQN, by contrast, learns across sessions via its replay buffer.

8. **License restriction on training data.** Dreamer-V1-Data uses CC-BY-NC-SA-4.0, which restricts commercial use. Fine-tuning on this data for a commercial lead-gen tool may be problematic. The model weights (Apache 2.0) are fine.

9. **Hallucination risk for scoring.** If using a small local model for scoring predictions, it may systematically overrate certain link types (e.g., always predicting `/blog` pages contain leads when they rarely do). The DQN's replay buffer provides a corrective signal, but slowly.

---

## Verdict (1-5 Applicability Score with Justification)

### Score: 3.5 / 5 -- Conditionally Applicable

**The core insight is highly relevant, but the specific implementation is not directly transferable.**

**What transfers well (score: 4.5):**
- The idea of "simulate before you click" is directly applicable to focused web crawling
- Using LLM world knowledge to predict page content from URL patterns + anchor text is cheap and effective
- The text-only simplification (no screenshots needed for B2B crawling) makes this feasible on M1 16GB with a local 3B model
- The self-refinement stage (filter candidates before expensive simulation) is a smart optimization we should adopt
- H=1 is optimal -- we only need single-step look-ahead, which is the easiest to implement

**What does NOT transfer (score: 2):**
- The vision-language model pipeline (Dreamer-7B) is irrelevant for our use case -- we parse HTML, not screenshots
- The expensive scoring function (10 LLM samples per candidate) is prohibitive for a crawler visiting 100+ pages
- The full MPC framework with formal trajectory simulation is overengineered for link-following on structured B2B sites
- The 3.1M training instances and 64x H100 training pipeline are not reproducible

**Recommended implementation path:**

1. **Phase 1 (Low effort, high impact):** Add a text-only "link prediction" prompt to the crawler's exploration phase. When epsilon-greedy would select a random link, instead query a local Qwen 3B model: "Given this company careers page, which of these 10 links is most likely to lead to AI/ML engineering roles in the EU?" Use the prediction to replace random exploration with informed exploration. Estimated improvement: 15-25% better lead discovery during exploration.

2. **Phase 2 (Medium effort):** Build a simple scoring cache. After following a predicted link, compare the actual page content with the prediction. Use prediction accuracy as an auxiliary reward signal for the DQN, enabling faster convergence.

3. **Phase 3 (High effort, diminishing returns):** Fine-tune a small VLM (Qwen2.5-VL-3B if it exists, or Qwen2-VL-7B INT4) on crawl trajectories from your own data to build a domain-specific "B2B web world model." Only worth it if Phase 1-2 show significant improvement.

**Bottom line:** The WebDreamer paper validates that LLMs can predict web navigation outcomes accurately enough to guide action selection. For our crawler, this means replacing random epsilon-greedy exploration with LLM-guided exploration. The text-only version is cheap (2s overhead per page with local 3B model), requires no vision models, and could meaningfully improve the DQN's sample efficiency during early training when exploration matters most.

---

## Sources

- [arXiv:2411.06559 -- WebDreamer paper](https://arxiv.org/abs/2411.06559)
- [Full HTML paper (v1)](https://arxiv.org/html/2411.06559v1)
- [GitHub -- OSU-NLP-Group/WebDreamer](https://github.com/OSU-NLP-Group/WebDreamer)
- [HuggingFace -- Dreamer-7B](https://huggingface.co/osunlp/Dreamer-7B)
- [HuggingFace -- Dreamer-V1-Data (3.1M instances)](https://huggingface.co/datasets/osunlp/Dreamer-V1-Data)
- [HuggingFace -- WebDreamer Collection](https://huggingface.co/collections/osunlp/webdreamer-67ee17325839c8a02339dbfb)
- [OpenReview -- TMLR submission](https://openreview.net/forum?id=c6l7yA0HSq)
- [HuggingFace Papers -- Discussion](https://huggingface.co/papers/2411.06559)
- [Moonlight -- Literature Review](https://www.themoonlight.io/en/review/is-your-llm-secretly-a-world-model-of-the-internet-model-based-planning-for-web-agents)
