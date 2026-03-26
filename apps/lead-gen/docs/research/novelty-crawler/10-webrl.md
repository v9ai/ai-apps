# WebRL -- Outcome Reward Model -- Deep Dive

> **Paper:** Qi et al., "WebRL: Training LLM Web Agents via Self-Evolving Online Curriculum Reinforcement Learning" (ICLR 2025, arXiv:2411.02337)
> **GitHub:** [THUDM/WebRL](https://github.com/THUDM/WebRL) -- 514 stars, MIT license
> **Authors:** Zehan Qi, Xiao Liu, Iat Long Iong, Hanyu Lai, Xueqiao Sun, Wenyi Zhao, Yu Yang, Xinyue Yang, Jiadai Sun, Shuntian Yao, Tianjie Zhang, Wei Xu, Jie Tang, Yuxiao Dong (Tsinghua / Zhipu AI)
> **Models:** [webrl-llama-3.1-8b](https://huggingface.co/THUDM/webrl-llama-3.1-8b), [webrl-llama-3.1-70b](https://huggingface.co/THUDM/webrl-llama-3.1-70b), [webrl-glm-4-9b](https://huggingface.co/THUDM/webrl-glm-4-9b), [ORM-Llama-3.1-8B](https://huggingface.co/THUDM/orm-llama-3.1-8b)

---

## Paper Summary

WebRL is a self-evolving online curriculum reinforcement learning framework that trains open-weight LLMs to navigate real websites. It tackles three core problems that cripple standard RL approaches on the web: (1) scarcity of diverse training tasks, (2) sparse binary rewards (success/failure only, no intermediate signal), and (3) policy distribution drift during online learning.

The key insight is a tightly coupled feedback loop: failed trajectories seed a curriculum that generates new tasks matched to the agent's current skill level, an outcome-supervised reward model (ORM) provides the training signal without human annotation, and a KL-constrained policy update with experience replay prevents catastrophic forgetting between training phases.

Results are dramatic. Llama-3.1-8B goes from 4.8% to 42.4% success rate on WebArena-Lite (5 real websites). The 70B variant hits 49.1%, almost tripling GPT-4-Turbo (17.6%) and nearly tripling the previous open-source SOTA AutoWebGLM (18.2%). All with a single training run on open-weight models.

---

## Architecture & Algorithms

### End-to-End Training Pipeline

```
Phase 0: SFT warm-start
  Base LLM (Llama-3.1-8B or GLM-4-9B)
    --> supervised fine-tune on ~1K WebArena-Lite trajectories
    --> initialize actor (policy) and critic (value network) from SFT weights
    --> train ORM separately on 12,200 labeled samples

Phase i (iterative, 5+ phases):
  1. CURRICULUM GENERATION
     - Select instructions agent FAILED in phase i-1 as seeds
     - GPT-4o generates new instructions via "in-breadth evolving"
       (similar task requirements, varied parameters)
     - Filter by critic score: keep only tasks where V(s0, I) in [0.05, 0.75]
       (not trivially easy, not impossibly hard)
     - Manual check to remove unreasonable tasks
     - Result: 500 new instructions per phase

  2. ROLLOUT COLLECTION
     - Agent interacts with live WebArena environments on 500 instructions
     - Each trajectory: (instruction, action_1..action_T, final HTML)
     - ORM labels each trajectory: success (r=1) or failure (r=0)

  3. ADVANTAGE ESTIMATION
     - Value network V(s_t, I) trained with cross-entropy loss
       (binary classification: will this state lead to success?)
     - Generalized Advantage Estimation with lambda=0.5:
       A(s_t, a_t, I) = lambda * (r + V(s_{t+1}) - V(s_t))
                       + (1-lambda) * (r(s_T) - V(s_t))

  4. ACTOR UPDATE (KL-constrained)
     - Loss: L(pi_theta) = E[ (beta * log(pi_theta/pi_ref) - A*)^2 ]
     - beta controls KL constraint strength (optimal: 0.1-1.0)
     - pi_ref = policy from previous phase (prevents drift)

  5. EXPERIENCE REPLAY
     - Successful trajectories stored in replay buffer
     - Perplexity filtering: keep actions where PPL in [1/0.95, 1/0.5]
       (excludes over-familiar AND too-challenging data)
     - Replay data <= 2x current interaction data per phase

  6. CRITIC UPDATE
     - Cross-entropy loss on value predictions
     - Hyperparams: lr=1e-6, batch=128, gamma=0.9, 1 epoch
```

### Outcome-Supervised Reward Model (ORM)

The ORM is the critical component that replaces expensive human evaluation with a trained binary classifier.

**Architecture:** GLM-4-8B fine-tuned as a sequence classifier. Leverages the language model's existing knowledge about web tasks by framing reward as a YES/NO generation task.

**Input format:**
```
[Instruction] Navigate to the GitLab settings page and enable 2FA
[Actions] click[45] # Settings menu | type[67] "security" | click[89] # 2FA toggle
[Final HTML] <html>... simplified DOM with element IDs ...</html>
```

**Output:** Probabilities P("YES") and P("NO"). If P("YES") > P("NO"), reward = 1; else reward = 0. Binary, sparse.

**Training details:**
- 12,200 samples from augmented WebArena-Lite + rollouts from all baseline methods
- Instruction rewriting + variable modification (place names, product names)
- Cross-entropy loss, lr=5e-6, cosine scheduler, 4 epochs, batch=128, cutoff=16384 tokens
- Accuracy: 80.8% (vs GPT-4-Turbo 71.9%, GPT-4V 71.2%, Captioner+GPT-4 72.6%)

**Why it matters for us:** The ORM architecture is transferable. Any domain where you can define binary success/failure on a final page state can train an ORM. For lead-gen crawling, "did we find a team/careers page with contact info?" is a clean binary signal.

### Self-Evolving Curriculum: Learning From Failures

This is the most novel contribution. Standard RL web agents train on a fixed task pool, which causes two problems: (1) easy tasks waste compute, (2) hard tasks produce only zero-reward trajectories that teach nothing.

**The failure-to-curriculum loop:**

```
Phase i failures --> seed instructions
                      |
                      v
              GPT-4o in-breadth generation
              (new tasks with similar structure,
               different parameters/targets)
                      |
                      v
              Critic filter: V(s_0, I) in [0.05, 0.75]
              (Goldilocks zone of difficulty)
                      |
                      v
              Manual sanity check (remove impossible tasks)
                      |
                      v
              500 selected instructions for phase i+1
```

**In-breadth evolving:** Failed tasks are used as seeds to generate *related but different* tasks. Example: if the agent failed "Find Italian restaurants near Central Park on the map", the curriculum might generate "Find Vietnamese restaurants near Times Square on the map" -- same skill requirement, different parameters. This lets the agent practice the underlying capability without memorizing specific task instances.

**Difficulty filtering via critic scores:** The value network V(s_0, I) estimates success probability from the initial state. Tasks with V < 0.05 are nearly impossible (waste of rollouts). Tasks with V > 0.75 are too easy (little learning signal). The sweet spot [0.05, 0.75] ensures maximum learning per rollout.

**Case study from paper:** Two augmentation patterns observed:
1. Clarified versions that enable previously failed task completion (scaffolding)
2. Increased complexity to push performance boundaries (challenge)

### KL-Constrained Policy Update

Unlike standard PPO (clipping ratio) or DPO (offline preference), WebRL uses a squared-loss KL-constrained objective:

```
L(pi_theta) = E_v[ (beta * log(pi_theta(a|s,I) / pi_ref(a|s,I)) - A*(s,a,I))^2 ]
```

Key properties:
- **pi_ref updates each phase** (not frozen from SFT), so the constraint adapts
- **beta in [0.1, 1.0]** -- too low (0.01) causes policy collapse; replay buffer enables larger beta by providing stabilizing data
- Combined with experience replay, this prevents the catastrophic forgetting that plagues online RL on sequential phase-based curricula

---

## Benchmarks & Results

### Main Results: WebArena-Lite (165 test cases, 5 websites)

| Model | Params | Reddit | GitLab | CMS | Map | OSS | Avg SR |
|-------|--------|--------|--------|-----|-----|-----|--------|
| GPT-4-Turbo | -- | 10.5% | 16.7% | 14.3% | 36.7% | 13.3% | **17.6%** |
| GPT-4o | -- | 10.5% | 10.0% | 20.0% | 20.0% | 11.1% | **13.9%** |
| AutoWebGLM | 6B | 9.4% | 15.0% | 28.6% | 24.8% | 17.1% | **18.2%** |
| GLM-4 + SFT | 9B | 47.4% | 13.3% | 31.4% | 23.3% | 13.3% | **22.4%** |
| GLM-4 + Filtered BC | 9B | 52.6% | 10.0% | 31.4% | 26.7% | 20.0% | **24.8%** |
| GLM-4 + AWR | 9B | 52.6% | 16.7% | 34.3% | 30.0% | 22.2% | **27.9%** |
| GLM-4 + DigiRL | 9B | 63.2% | 30.0% | 34.3% | 26.7% | 26.7% | **31.5%** |
| **GLM-4 + WebRL** | **9B** | **57.9%** | **50.0%** | **48.6%** | **36.7%** | **37.8%** | **43.0%** |
| Llama-3.1 + SFT | 8B | 36.8% | 6.7% | 20.0% | 33.3% | 17.8% | **20.6%** |
| Llama-3.1 + Filtered BC | 8B | 52.6% | 20.0% | 31.4% | 23.3% | 8.9% | **23.0%** |
| Llama-3.1 + AWR | 8B | 57.9% | 26.7% | 31.4% | 26.7% | 17.8% | **28.5%** |
| Llama-3.1 + DigiRL | 8B | 57.9% | 26.7% | 37.1% | 33.3% | 17.8% | **30.3%** |
| **Llama-3.1 + WebRL** | **8B** | **63.2%** | **46.7%** | **54.3%** | **36.7%** | **31.1%** | **42.4%** |
| **Llama-3.1 + WebRL** | **70B** | **78.9%** | **50.0%** | **54.3%** | **40.0%** | **44.4%** | **49.1%** |

### Key Comparative Insights

**vs DigiRL (closest baseline):** WebRL beats DigiRL by +12 pp (42.4% vs 30.3% on Llama-8B). The gap widens on complex tasks: DigiRL plateaus and degrades on tasks requiring >10 steps, while WebRL maintains 40-50% success. DigiRL trains on a fixed task pool, so it converges to suboptimal solutions on hard tasks.

**vs Proprietary APIs:** 8B open model (42.4%) outperforms GPT-4-Turbo (17.6%) by 2.4x. The 70B model (49.1%) nearly triples GPT-4-Turbo.

**Task complexity scaling:** WebRL excels on high-complexity tasks (4+ requirements). Other methods plateau or decline at complexity >3. The curriculum specifically generates harder tasks as the agent improves, which no baseline does.

**Error analysis:** WebRL minimizes "Get Stuck Midway" errors (the most common failure mode for SFT/BC agents). It has the lowest rates of "Stop at Wrong Page" and "Fail to Make Reasonable Attempt."

### Ablation Results (Figure 5)

| Removed Component | Effect |
|---|---|
| Replay buffer | Performance degrades over time -- knowledge erasure from forgetting earlier experiences |
| KL constraint | Worse retention of past knowledge; larger policy oscillations between phases |
| Curriculum (use fixed DigiRL tasks) | Slower progress, lower ceiling -- agent wastes rollouts on mismatched-difficulty tasks |
| KL + replay (both) | Rapid collapse below initial SFT baseline |

Every component is load-bearing. The system degrades when any single piece is removed.

---

## GitHub Repository

**URL:** https://github.com/THUDM/WebRL
**License:** MIT
**Stars:** 514 | **Forks:** 35 | **Commits:** 48
**Language:** Python 99.3%

### Repository Structure

```
WebRL/
  LLaMA-Factory/          # SFT training framework (submodule/fork)
  webrl/                   # Core RL training loop
  scripts/
    gen_task.py            # GPT-4o curriculum task generation
    process_data.py        # Trajectory processing + ORM labeling + replay
  hparams/                 # Hyperparameter YAML configs
  extras/                  # Additional resources
  assets/                  # Documentation assets
  WebArena-Lite_info.json  # Benchmark task definitions
  requirements.txt         # 84 Python dependencies
  setup.py                 # MIT, Python >= 3.9
  run_multinode.sh         # Multi-node distributed training
```

### Key Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| torch | 2.3.1 | Core ML framework |
| transformers | 4.44.2 | LLM loading/inference |
| deepspeed | 0.15.1 | Distributed training |
| accelerate | 0.32.1 | HuggingFace multi-GPU |
| spacy | 3.7.2 | NLP processing |
| datasets | 2.20.0 | HuggingFace datasets |
| peft | latest | LoRA/adapter training |
| openai | latest | GPT-4o for curriculum generation |
| wandb | latest | Experiment tracking |
| beautifulsoup4 | latest | HTML parsing |
| gradio | latest | UI/demo |

**Total:** 84 pip packages. Heavy footprint. Requires CUDA GPUs for training (sponsored by Zhipu AI; exact compute not disclosed).

### Training Commands

```bash
# Step 1: SFT baseline
cd LLaMA-Factory
bash run.sh examples/train_full/llama3_full_policy_web.yaml

# Step 2: WebRL training loop
bash run_multinode.sh

# Step 3: Task generation for next phase
python scripts/gen_task.py

# Step 4: Process trajectories + replay
python scripts/process_data.py \
  --stage 1 2 \
  --add_reward \
  --rollout_path <trajectories> \
  --experience_paths "path1","path2" \
  --orm_path <orm_model_path> \
  --actor_path <actor_model_path> \
  --output_path <output>
```

### Pre-trained Models on HuggingFace

| Model | Params | Format | Downloads |
|---|---|---|---|
| webrl-llama-3.1-8b | 8B | safetensors (F32) | Low |
| webrl-llama-3.1-70b | 71B | safetensors (F32) | ~10/month |
| webrl-glm-4-9b | 9B | safetensors | Low |
| ORM-Llama-3.1-8B | 8B | safetensors | Low |

---

## Integration with DQN Crawler

The Scrapus DQN crawler (`crawler_replay_buffer.py`, `crawler_nstep.py`, etc.) operates at a fundamentally different abstraction level than WebRL, but three specific ideas are directly transferable.

### Idea 1: Outcome Reward Model for Crawl Pages (HIGH VALUE)

**Current state:** The DQN crawler uses hand-crafted reward signals (lead relevance scores, link quality heuristics). Reward engineering is brittle and requires manual tuning per domain.

**WebRL transfer:** Train a small binary classifier (not 8B -- think 100M-300M or even a fine-tuned fastText/BERT) that takes:
- Input: (crawl target description, final page HTML)
- Output: P("useful lead page") vs P("dead end")

This is the ORM pattern simplified for our domain. The "outcome" is "did this crawl path terminate at a page containing actionable lead information (team page, contact info, job listings)?"

**Implementation sketch:**
1. Collect 2-5K crawl trajectories with binary labels (lead found / no lead)
2. Fine-tune a small model (nomic-embed-text or a BERT variant) as binary classifier
3. Use as dense reward signal: replace hand-crafted heuristics with learned ORM score
4. The existing PER replay buffer already supports priority updates -- ORM confidence can feed directly into priority weights

**Effort:** Medium. Requires labeled crawl data collection (can bootstrap from existing successful/failed crawls in the replay buffer).

### Idea 2: Self-Evolving URL Frontier from Failures (HIGH VALUE)

**Current state:** The crawler's URL frontier is populated by link extraction and fixed seed lists. Failed crawl paths (pages with no lead info) are discarded.

**WebRL transfer:** Use failed crawl paths as seeds for generating new crawl targets, analogous to the failure-to-curriculum loop:

```
Failed crawl: company.com/about --> no leads found
                |
                v
Generate related targets:
  - company.com/team
  - company.com/careers
  - company.com/people
  - company.com/contact
  - Similar companies from the same ATS board
```

**Difficulty filtering analog:** Use the DQN's Q-value predictions as the "critic score." Prioritize URLs where Q(s, a) is in a Goldilocks zone -- not obviously worthless (Q near 0) and not trivially easy (Q near 1). This focuses crawl budget on the highest-learning-potential pages.

**Effort:** Low-Medium. The Q-network already produces these scores. The curriculum generation is just URL pattern expansion, which can be rule-based or use a small LM.

### Idea 3: KL-Constrained Policy Updates for Online Adaptation (MEDIUM VALUE)

**Current state:** The DQN uses standard experience replay with PER (Schaul et al. 2015) and n-step returns. No explicit constraint prevents the policy from drifting when the crawl target distribution shifts (e.g., new ATS boards added, seasonal hiring changes).

**WebRL transfer:** Add a KL penalty between the current Q-network's action distribution and a "reference" snapshot taken at the start of each crawl campaign:

```
L_total = L_DQN + beta * KL(pi_current || pi_reference)
```

This is less critical than Ideas 1-2 because the DQN already has PER-based stabilization, but it would help when the crawler encounters domain shifts (new website layouts, new ATS providers).

**Effort:** Low. Requires saving a reference network snapshot and adding a KL term to the loss. The existing n-step infrastructure in `crawler_nstep.py` does not need modification.

### What Does NOT Transfer

- **LLM-as-actor:** WebRL trains 8B-70B LLMs as the policy. Our crawler uses a lightweight DQN with 784-dim embeddings. We cannot and should not swap in an LLM actor -- the inference cost per URL decision would be 1000x higher than needed.
- **HTML action space:** WebRL's action space (click element ID, type text, scroll) is for interactive web navigation. Our crawler's action space is URL selection from a frontier -- a fundamentally different MDP.
- **GPT-4o curriculum generation:** Using GPT-4o to generate crawl targets is overkill. Rule-based URL pattern expansion + Q-value filtering achieves the same effect at zero API cost.
- **WebArena environment:** The WebArena benchmark is a closed set of 5 websites with scripted evaluation. Our crawler operates on the open web with unbounded target domains.

---

## Risks & Limitations

### Paper-Level Limitations

1. **Single benchmark:** All results are on WebArena-Lite (5 websites, 165 test cases). No evaluation on other web navigation benchmarks (MiniWoB++, Mind2Web, WebShop). Generalization to unseen website types is unproven.

2. **GPT-4o dependency for curriculum:** The self-evolving curriculum requires GPT-4o to generate new task instructions. This creates a dependency on a proprietary API during training (not inference). Removing this would require an alternative instruction generation method.

3. **Manual filtering step:** The curriculum pipeline includes "manually check the instructions to eliminate instructions that are clearly unreasonable." This human-in-the-loop step limits full automation and raises questions about scalability.

4. **Compute opacity:** The paper discloses no training compute requirements. Training an 8B model with online RL rollouts on live WebArena instances likely requires substantial GPU hours. The 70B variant's compute is presumably very large.

5. **Map task regression:** Performance on the Map (OpenStreetMap) domain shows "initial upward trend followed by a decline" -- improvements in other domains trade off against Map performance. This suggests the curriculum may over-specialize.

6. **No broader impact or limitations section:** The paper contains neither a dedicated limitations section nor a broader impact statement -- unusual for an ICLR 2025 paper.

7. **ORM accuracy ceiling:** The ORM achieves 80.8% accuracy. The remaining ~19% of mislabeled trajectories inject noise into training. On our smaller lead-gen domain, ORM errors could compound.

### Integration-Level Risks

1. **Domain gap:** WebRL is designed for interactive web navigation (clicking, typing, scrolling). Our crawler performs URL-level decisions (which page to fetch next). The MDP structures are fundamentally different, so the framework cannot be applied wholesale.

2. **Scale mismatch:** WebRL trains 8B+ parameter models. Our DQN is a small network (~784-dim input, a few hidden layers). The algorithmic ideas transfer, but the infrastructure (DeepSpeed, multi-node, LLaMA-Factory) is irrelevant.

3. **Reward density:** WebRL solves a sparse reward problem (binary success/failure per episode). Our crawler already has denser signals (lead relevance scores per page). The ORM idea adds value but is not as critical as in the original WebRL setting.

4. **Curriculum cold start:** The self-evolving curriculum needs a critical mass of failures to seed new tasks. With a small initial URL pool, there may not be enough failure diversity to generate useful curriculum variations.

---

## Verdict: 4/5 Applicability Score

**Score: 4 out of 5 -- High applicability of specific ideas, not the full framework.**

### Justification

WebRL is one of the strongest papers in the RL-for-web-agents space (ICLR 2025, 49.1% success rate destroying GPT-4-Turbo by 2.8x). However, it solves a different problem than ours: interactive web navigation with an LLM actor vs. URL frontier selection with a lightweight DQN.

**What earns the 4:**
- The ORM concept (binary outcome classifier replacing hand-crafted rewards) is directly transferable and would likely improve crawl quality. This alone justifies the score.
- The failure-to-curriculum loop is a genuinely novel idea that maps cleanly to "failed crawl paths seed new URL targets in the Goldilocks difficulty zone."
- The ablation evidence is convincing -- every component is load-bearing, and the KL-constrained update is a cheap addition to any RL pipeline.

**Why not 5:**
- The full WebRL framework (LLM actor, WebArena environment, GPT-4o curriculum, DeepSpeed training) is not applicable. We extract algorithmic principles, not code.
- The 84-dependency Python stack is incompatible with our local-first M1 pipeline.
- The benchmark is narrow (5 websites) and the paper lacks generalization evidence.

**Recommended adoption order:**
1. **ORM for crawl outcome classification** -- highest ROI, directly plugs into existing PER priority weighting
2. **Q-value Goldilocks filtering for URL frontier** -- essentially free, uses existing Q-network
3. **KL-constrained DQN updates** -- low effort, marginal but measurable stability improvement

---

## References

- Qi et al., "WebRL: Training LLM Web Agents via Self-Evolving Online Curriculum Reinforcement Learning," ICLR 2025. [arXiv:2411.02337](https://arxiv.org/abs/2411.02337)
- [THUDM/WebRL GitHub](https://github.com/THUDM/WebRL)
- [WebRL-Llama-3.1-70B on HuggingFace](https://huggingface.co/THUDM/webrl-llama-3.1-70b)
- [WebRL-Llama-3.1-8B on HuggingFace](https://huggingface.co/THUDM/webrl-llama-3.1-8b)
- [WebRL-GLM-4-9B on HuggingFace](https://huggingface.co/THUDM/webrl-glm-4-9b)
- [OpenReview page](https://openreview.net/forum?id=oVKEAFjEqv)
- [HF Paper Review](https://deep-diver.github.io/ai-paper-reviewer/paper-reviews/2411.02337/)
