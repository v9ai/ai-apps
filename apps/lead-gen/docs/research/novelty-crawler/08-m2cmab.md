# M2-CMAB Constraint-Aware Bandits -- Deep Dive

> **Paper:** "Adapter-Augmented Bandits for Online Multi-Constrained Multi-Modal Inference Scheduling"
> **arXiv:** [2603.06403](https://arxiv.org/abs/2603.06403) (March 6, 2026)
> **Authors:** Xianzhi Zhang, Yue Xu, Yinlin Zhu, Di Wu, Yipeng Zhou, Miao Hu, Guocong Quan
> **Code:** [anonymous.4open.science/r/M2CMAB](https://anonymous.4open.science/r/M2CMAB/) (anonymous review repo)

---

## Paper Summary

M2-CMAB (Multi-modal Multi-constraint Contextual Multi-Armed Bandit) addresses the problem of scheduling heterogeneous tasks across multiple execution backends under **simultaneous, irreversible budget constraints**. The original domain is MLLM inference scheduling -- routing multimodal queries to local or cloud backends while respecting monetary cost, latency, and energy budgets -- but the algorithm's design is domain-agnostic.

The core contribution is a three-component online framework:

1. **Predictor** -- frozen backbone with lightweight adapters that estimate per-action reward and per-dimension cost from contextual features.
2. **Constrainer** -- online primal-dual mechanism maintaining Lagrange multipliers via Online Mirror Descent (OMD) to enforce long-horizon multi-dimensional knapsack constraints.
3. **Scheduler** -- two-phase exploration-exploitation loop with softmax sampling biased toward the Lagrangian-optimal action.

Key results: up to **14.18% higher reward** than baselines on a composite multimodal benchmark, with the gap to an oracle upper bound shrinking to **<1.2%** under tight budgets.

---

## Algorithm & Theory

### Problem Formulation: Multi-Constraint CBwK

M2-CMAB extends the classic Contextual Bandits with Knapsacks (CBwK) framework. At each round t = 1,...,T:

- The agent observes context x^t (in the paper, a multimodal query; in our crawler, a frontier domain + system state).
- The agent selects action a^t from A arms (backends; for us, domains to crawl).
- The agent receives reward r_a^t and incurs a C-dimensional cost vector phi_a^t.
- Cumulative costs must satisfy the knapsack constraint: sum_{t=1}^{T} phi_a^t / Phi <= 1 (component-wise), where Phi is the per-dimension budget vector.

### Per-Round Lagrangian

The primal-dual formulation converts long-horizon budget constraints into per-round penalties:

```
L^t(a, lambda^t) = -r_a^t + < phi_a^t / Phi - 1/T, lambda^t >
```

where lambda^t in R_+^C are dual multipliers. The agent selects the action minimizing L^t (equivalently, maximizing the Lagrangian score S^t(a)):

```
S^t(a) = r_hat_a^t - < phi_hat_a^t / Phi - 1/T, lambda^t >
```

This elegantly decomposes the multi-constraint problem: when a resource is scarce (high lambda^c), actions consuming that resource are penalized more heavily, naturally steering the agent toward cheaper alternatives.

### Dual Variable Update (Online Mirror Descent)

```
lambda^{t+1} = arg min_{lambda in V} ( < grad_D^t(lambda^t), lambda > + B(lambda, lambda^t) / rho_t )
```

where:
- V = { lambda in R_+^C : ||lambda||_1 <= Lambda } is the feasible set
- B is Bregman divergence (ensuring stability)
- rho_t is the step size
- Lambda = (T / Phi_min)(OPT_hat + M(T_0)) is the dual radius, estimated from initial exploration

### Two-Phase Scheduler

**Phase 1 -- Initial Exploration** (Algorithm 1):
- Execute each of A actions exactly T_0 times to gather baseline data.
- Train reward and cost adapters on collected data.
- Solve a linear program to estimate the offline optimum OPT:

```
maximize   (1/T_0) sum_t sum_a o_a^t * R_hat(a, x^t; Theta_r)
subject to sum_a o_a^t * C_hat(a, x^t; Theta_phi) / (T_0 * Phi) <= 1/T + 2*M(T_0)/Phi
           sum_a o_a^t = 1  for each t
```

- Compute dual radius Lambda from OPT estimate.

**Phase 2 -- Exploitation with Exploration** (Algorithm 2):
For each remaining round t:
1. Compute action scores S^t(a) using predicted rewards/costs and current multipliers.
2. Sample action from softmax distribution:
   ```
   P^t(a) = 1 / (A + rho * (S^t(a_max) - S^t(a)))    for a != a_max
   P^t(a_max) = 1 - sum_{a != a_max} P^t(a)
   ```
   Parameter rho controls exploration intensity -- higher rho concentrates probability on the best action.
3. Execute action, observe reward and cost vector.
4. Update adapters via regularized least-squares.
5. Update dual variables via OMD.

### Predictor Architecture

- **Frozen backbone:** Qwen3-VL-2B-Instruct (weights frozen, preserving generative capability).
- **CLS-attentive pooling:** Explicit [CLS] token extracts a global semantic anchor via attention-based aggregation over hidden states, producing context embedding z_x^t.
- **Action embedding:** Qwen3-Embedding-0.6B produces z_a.
- **Lightweight adapters:** Separate MLPs for reward (theta_r) and each cost dimension {theta_phi^(c)}, trained online via regularized least-squares.

### Regret Bound (Theorem 4.1)

Under the condition Phi_min > max{(A+2)*T_0, T*M(T_0)}:

```
Reg(T) <= O( (T*OPT/Phi_min + 1) * (A*T_0 + sqrt(A*T*(Reg^r(T) + Reg^c(T) + log(C*T)))) )
```

where Reg^r(T) and Reg^c(T) are cumulative estimation regrets of the reward and cost predictors respectively. The bound is **modular** -- it works with any estimator achieving sublinear estimation regret:
- GP-based estimators yield O(T^{3/4} * (log T)^{1/4}) overall regret.
- Neural estimators work under standard neural tangent kernel assumptions.

### Constraint Types Tracked

The paper tracks three simultaneous cost dimensions:

| Dimension | What It Measures | Crawler Analogy |
|-----------|-----------------|-----------------|
| **Monetary cost (phi_COST)** | Token billing + modality charges (cloud) or energy cost (local) | API costs, compute budget |
| **Latency (phi_LATENCY)** | End-to-end delay: computation + network transmission | Crawl time, response latency |
| **Inference quality (reward)** | Normalized accuracy on [1,5] scale | Lead yield, page relevance |

---

## Benchmarks & Results

### Evaluation Setup

- **5 backends (arms):** Qwen3-VL-2B (local) + 4 cloud APIs (Qwen, LLaVA variants with MoE/reasoning modes)
- **6 datasets:** InfoVQA, GSM8K, SimpleVQA, CoQA, AI2D, plus merged COMPOSITE trace
- **3 budget regimes:** Restricted (minimum observed costs), Normal (second-smallest), Generous (median aggregated costs)
- **Metric:** Average inference reward per executed round (normalized 1-5 scale)

### Key Results on COMPOSITE Benchmark

| Budget Regime | Improvement vs. 2nd Best | Gap to Oracle |
|---------------|--------------------------|---------------|
| Restricted | +6.79% | <1.2% |
| Normal | +13.08% | negligible |
| Generous | +14.18% | negligible |

### Baselines Compared

| Baseline | Strategy | Limitation |
|----------|----------|------------|
| **Random** | Uniform arm selection | No learning |
| **Latency-first** | Greedy: minimize latency | Ignores reward quality |
| **Money-first** | Greedy: minimize monetary cost | Ignores reward quality |
| **Threshold-based** | Utility-to-cost ratio with averaged cost | Collapses multi-dimensional constraints into one |
| **BGT-planner** | CMAB-based budget allocation (Zhang et al., 2025) | No multi-modal context encoding |
| **Optimal (oracle)** | Perfect per-round information | Upper bound, not achievable |

### Ablation Study

- Removing the **reward adapter** causes substantial performance degradation (largest single-component drop).
- Removing **latency or cost adapters** causes smaller but measurable drops; other adapters partially compensate.
- All three adapter components are necessary for optimal performance.

---

## Code Availability

The anonymous review repository is at [anonymous.4open.science/r/M2CMAB](https://anonymous.4open.science/r/M2CMAB/). As of March 2026, the repository is behind authentication (HTTP 403 for anonymous fetching), likely gated for the review period.

**Practical status:** No public GitHub mirror exists yet. Given the paper is under review (anonymous submission), a public release is expected upon acceptance. The algorithm itself is reproducible from the paper's pseudocode -- the core logic (OMD dual update + softmax sampling + adapter training) is straightforward to implement independently.

**Key dependencies** (inferred from the architecture):
- PyTorch (adapter training via regularized least-squares)
- Qwen3-VL-2B-Instruct (frozen backbone for context encoding)
- Qwen3-Embedding-0.6B (action embeddings)
- Standard LP solver for initial OPT estimation

---

## Integration as Domain Scheduler

### Current System: UCB1

The existing crawler uses UCB1 for domain scheduling. UCB1 selects the domain with the highest upper confidence bound:

```
UCB1(a) = r_bar_a + sqrt(2 * ln(t) / N_a)
```

UCB1 is **constraint-oblivious**: it maximizes expected reward with no mechanism to respect rate limits, bandwidth caps, or CPU budgets. When a domain's rate limit is hit, the system must fall back to ad-hoc logic (sleep/skip), wasting budget on blocked requests.

### How M2-CMAB Adds Constraint Awareness

**Mapping crawler resources to M2-CMAB cost dimensions:**

| M2-CMAB Dimension | Crawler Resource | Budget (Phi) |
|--------------------|-----------------|--------------|
| phi^(1): Rate limit | Requests per domain per minute | Domain-specific (e.g., 60 req/min for robots.txt compliant crawling) |
| phi^(2): Bandwidth | Bytes transferred per domain | Global bandwidth cap (e.g., 100 MB/min) |
| phi^(3): CPU/latency | Parse + extract time per page | Total compute budget per crawl epoch |

**Mapping crawler actions to M2-CMAB arms:**

Each arm a corresponds to a (domain, crawl-depth) pair. The context x^t encodes:
- Domain features: historical yield, last-crawl timestamp, estimated page count
- System state: current bandwidth usage, CPU load, per-domain request counters

**What changes in the scheduler:**

1. **Rate-limit awareness:** When domain d is near its rate limit, the dual multiplier lambda^(rate) increases, reducing the Lagrangian score for domain d. The scheduler naturally shifts to other domains without hard-coded sleep logic.

2. **Bandwidth budgeting:** Heavy domains (large pages, many assets) consume more phi^(bandwidth). The dual variable penalizes bandwidth-heavy domains when the budget is depleted, favoring lightweight domains.

3. **CPU-aware scheduling:** Extract-heavy domains (complex DOM, many entities) consume more phi^(cpu). Under CPU pressure, the scheduler favors domains with simpler pages.

4. **Graceful degradation:** Unlike UCB1 + ad-hoc rate limiting, M2-CMAB continuously balances all constraints simultaneously. It never hard-blocks a domain -- it smoothly reduces selection probability as constraints tighten.

### Minimal Implementation Sketch

```python
class M2CMABScheduler:
    """Drop-in replacement for UCB1 domain scheduler."""

    def __init__(self, domains: list[str], constraint_dims: int = 3):
        self.A = len(domains)
        self.C = constraint_dims  # rate, bandwidth, cpu
        self.lam = np.zeros(self.C)  # dual multipliers
        self.Lambda = 100.0  # dual radius (tuned from initial phase)
        self.rho = 10.0  # exploration parameter

        # Lightweight adapters (replace with MLPs for production)
        self.reward_model = LinearRegressor(feature_dim)
        self.cost_models = [LinearRegressor(feature_dim) for _ in range(self.C)]

    def select_domain(self, context: np.ndarray, budgets: np.ndarray) -> int:
        scores = []
        for a in range(self.A):
            r_hat = self.reward_model.predict(context, a)
            phi_hat = np.array([m.predict(context, a) for m in self.cost_models])
            score = r_hat - np.dot(phi_hat / budgets - 1/self.T, self.lam)
            scores.append(score)

        # Softmax sampling biased toward best action
        a_max = np.argmax(scores)
        probs = np.array([
            1.0 / (self.A + self.rho * (scores[a_max] - scores[a]))
            if a != a_max else 0.0
            for a in range(self.A)
        ])
        probs[a_max] = 1.0 - probs.sum()
        return np.random.choice(self.A, p=probs)

    def update(self, action: int, reward: float, costs: np.ndarray, budgets: np.ndarray):
        # Update adapters
        self.reward_model.update(action, reward)
        for c in range(self.C):
            self.cost_models[c].update(action, costs[c])

        # OMD dual update
        grad = costs / budgets - 1/self.T
        self.lam = self._omd_step(self.lam, grad)

    def _omd_step(self, lam: np.ndarray, grad: np.ndarray) -> np.ndarray:
        lam_new = lam + self.step_size * grad
        lam_new = np.maximum(lam_new, 0)  # project to R_+^C
        if np.sum(lam_new) > self.Lambda:
            lam_new *= self.Lambda / np.sum(lam_new)  # project to L1 ball
        return lam_new
```

### Integration Steps

1. **Replace UCB1 arm selection** with M2-CMAB's Lagrangian-score + softmax sampling.
2. **Instrument cost signals:** Hook into the crawler's HTTP layer to measure per-request latency, bytes transferred, and CPU time.
3. **Define budgets:** Set per-epoch budgets for rate limits (per-domain), bandwidth (global), and CPU (global).
4. **Initial exploration phase:** Run T_0 requests per domain to bootstrap the LP-based OPT estimate. For a crawler with ~50 active domains, T_0 = 5 gives 250 initial requests -- a small overhead.
5. **Adapter training:** Linear regressors suffice for the crawler domain (no need for a frozen Qwen backbone). Replace the paper's VLM-based Predictor with domain-feature embeddings (historical yield, page size stats, response time distribution).
6. **Dual variable persistence:** Save lambda across crawl epochs for warm-starting. The OMD update naturally adapts to changing conditions.

---

## Comparison: UCB1 vs NeuralUCB vs M2-CMAB

| Property | UCB1 | NeuralUCB | M2-CMAB |
|----------|------|-----------|---------|
| **Context awareness** | None (context-free) | Yes (neural features) | Yes (adapter-based) |
| **Constraint handling** | None | None | Native (primal-dual, C dimensions) |
| **Rate-limit respect** | External logic required | External logic required | Built into arm scoring |
| **Bandwidth budgeting** | Not supported | Not supported | Native cost dimension |
| **CPU-aware scheduling** | Not supported | Not supported | Native cost dimension |
| **Regret bound** | O(sqrt(A*T*log(T))) | O_tilde(sqrt(T)) | O_tilde(sqrt(A*T) * (1 + T*OPT/Phi_min)) |
| **Non-stationary adaptation** | Poor (fixed confidence) | Moderate (neural retraining) | Moderate (OMD adapts duals; adapters retrain) |
| **Implementation complexity** | Trivial (~20 LOC) | Moderate (neural training loop) | Moderate (OMD + adapters + LP init) |
| **Per-round overhead** | O(A) | O(A * neural_forward) | O(A * adapter_forward + C) |
| **Exploration mechanism** | Optimism (confidence bound) | Optimism (neural UCB) | Softmax with rho parameter |
| **Multi-resource tradeoff** | Manual (separate logic per resource) | Manual | Automatic (Lagrange multipliers) |

### When UCB1 Is Sufficient

- Single objective (maximize yield) with no binding resource constraints.
- Homogeneous domains (similar page sizes, similar rate limits).
- Low domain count (<10 arms) where constraint violations are rare.

### When M2-CMAB Is Needed

- Crawling 50+ domains with heterogeneous rate limits (1 req/s to 10 req/s).
- Hard bandwidth caps (metered connections, cloud egress limits).
- CPU-bound extraction pipeline where some domains require heavy parsing.
- Need to maximize total lead yield per crawl epoch under a fixed time/cost budget.

---

## Risks & Limitations

### Paper-Specific Concerns

1. **No web crawling evaluation.** The paper targets MLLM inference scheduling with 5 backends. Crawling involves 50-200+ domains (arms), potentially exceeding the regime tested. The regret bound scales with sqrt(A), so large arm counts increase regret.

2. **Frozen backbone overhead.** The paper's Predictor uses a 2B-parameter VLM for context encoding. This is unnecessary for crawling -- simpler feature engineering (historical yield, page size, robots.txt delay) with linear adapters should suffice.

3. **Initial exploration cost.** The LP-based initialization requires T_0 requests per domain. With 100 domains and T_0 = 5, that is 500 "exploration" requests before the scheduler learns. This is acceptable for a multi-hour crawl but costly for short bursts.

4. **Stationarity assumption.** The regret bound assumes stochastic (not adversarial) cost/reward distributions. Domain behavior can shift abruptly (site goes down, rate limit changes). The OMD update provides some robustness, but adversarial bandits-with-knapsacks theory (Immorlica et al., 2019) may be needed for worst-case guarantees.

5. **Anonymous repo.** The code is behind authentication during review. Implementation must be done from the paper's pseudocode.

### Integration Risks

1. **Constraint dimension scaling.** The paper tracks C = 2 cost dimensions (latency + monetary). Adding more (rate limit per-domain, global bandwidth, CPU, memory) increases the dual variable space. Convergence speed of OMD may degrade with many constraints.

2. **Per-domain rate limits are heterogeneous.** Unlike the paper's uniform budget Phi, each domain has its own rate limit. This requires either (a) treating each domain's rate limit as a separate constraint dimension (blowing up C to O(A)), or (b) encoding rate-limit headroom into the context vector and learning it via the cost adapter. Option (b) is preferred but requires careful feature engineering.

3. **Cold start.** New domains have no historical data. The initial exploration phase handles this, but dynamically discovered domains mid-crawl require a fallback (e.g., optimistic initialization of dual variables).

4. **Interaction with DQN/Decision Transformer.** The existing crawler architecture includes a DQN for page-level decisions. M2-CMAB operates at the domain-scheduling level (which domain to crawl next). These two layers must be coordinated -- M2-CMAB selects the domain, then the DQN/DT decides what to do within that domain.

---

## Verdict (4/5 Applicability Score)

**Score: 4 out of 5 -- High applicability, recommended for implementation.**

### Justification

**Why 4 (not 5):**
- The paper's domain (MLLM inference with 5 backends) does not directly validate the algorithm at crawler scale (50-200 domains). The sqrt(A) factor in the regret bound means performance guarantees weaken with many arms.
- The frozen VLM backbone is overengineered for crawling -- we only need the primal-dual Constrainer + lightweight adapters, not the full Predictor architecture.
- Per-domain heterogeneous rate limits require adaptation beyond the paper's uniform-budget formulation.

**Why not 3 (lower):**
- The primal-dual Lagrangian formulation is **exactly** the right abstraction for multi-constraint crawling. It replaces ad-hoc rate-limit logic with a principled, theoretically-grounded mechanism.
- The OMD dual update is trivial to implement (~15 lines of code) and adds negligible overhead.
- The modular regret bound means we can use simple linear adapters (not neural networks) and still get theoretical guarantees.
- The 14.18% improvement over baselines demonstrates that constraint-aware scheduling materially improves resource utilization -- directly relevant to maximizing leads-per-crawl-budget.

**Recommended integration path:**
1. Extract the Constrainer (OMD dual update) and softmax Scheduler from M2-CMAB.
2. Replace the Predictor with domain-feature-based linear adapters (no VLM needed).
3. Define 3 constraint dimensions: per-domain rate limit headroom, global bandwidth, CPU budget.
4. Encode per-domain rate limits into the context vector (not as separate constraint dimensions) to avoid blowing up C.
5. Layer M2-CMAB on top of the existing UCB1 slot: domain selection is M2-CMAB, within-domain page selection remains DQN/DT.
6. Benchmark against UCB1 + ad-hoc rate limiting on a 50-domain crawl to validate the 6-14% improvement carries over.

---

## References

- Zhang et al., "Adapter-Augmented Bandits for Online Multi-Constrained Multi-Modal Inference Scheduling," arXiv:2603.06403, March 2026. [Paper](https://arxiv.org/abs/2603.06403) | [HTML](https://arxiv.org/html/2603.06403)
- Agrawal & Devanur, "Bandits with Knapsacks," JACM 2018. [Paper](https://arxiv.org/abs/1305.2545)
- Agrawal & Devanur, "An Efficient Algorithm for Contextual Bandits with Knapsacks," ICML 2016. [Paper](https://arxiv.org/abs/1506.03374)
- Slivkins et al., "Contextual Bandits with Packing and Covering Constraints," JMLR 2025. [Paper](https://arxiv.org/abs/2211.07484)
- Immorlica et al., "Adversarial Bandits with Knapsacks," FOCS 2019. [Paper](https://arxiv.org/abs/1811.11881)
- Zhou et al., "Neural Contextual Bandits with UCB-based Exploration," ICML 2020. [Paper](https://arxiv.org/abs/1911.04462)
