# LARL Latent Auto-Regressive Bandits -- Deep Dive

> **Paper:** Non-Stationary Latent Auto-Regressive Bandits
> **Authors:** Anna L. Trella, Walter H. Dempsey, Asim H. Gazi, Ziping Xu, Finale Doshi-Velez, Susan A. Murphy
> **Venue:** Reinforcement Learning Conference (RLC) 2025 / Reinforcement Learning Journal, vol. 6, pp. 765--789
> **arXiv:** [2402.03110](https://arxiv.org/abs/2402.03110) (v1 Feb 2024, v3 Feb 2025)
> **Code:** [github.com/annatrella/latent-auto-bandits](https://github.com/annatrella/latent-auto-bandits) (GPL-3.0)

---

## Paper Summary

LARL addresses non-stationary multi-armed bandits where reward distributions shift over time due to a **latent autoregressive (AR) state** that is never directly observed. Most prior non-stationary bandit algorithms require a "non-stationarity budget" -- a bound on the total variation in reward means that must be sub-linear in the horizon T. LARL removes this requirement entirely by exploiting the structural assumption that non-stationarity is driven by a latent AR process.

The core insight: if the hidden state evolves as an AR(k) process, then past rewards and actions contain enough information to implicitly predict the current latent state. LARL reformulates this as a **linear contextual bandit** problem where the "context" is constructed from recent history. This reduction connects to classical control theory -- LARL approximates a **steady-state Kalman filter** that tracks the latent state online while simultaneously learning the system parameters.

The paper was motivated by **mobile health (mHealth)** applications where user fatigue/burden is an unobserved latent process with temporal dependencies that causes intervention effectiveness to drift. The framework generalizes to any domain where reward drift is governed by smooth latent dynamics rather than abrupt regime changes.

---

## Algorithm & Theory

### Reward Model

For each action a in the action set A, the reward at time t is:

```
r_t(a) = mu_a + beta_a * z_t + epsilon_t(a)
```

where:
- `mu_a` is an action-specific baseline reward
- `beta_a` is the action-specific sensitivity to the latent state
- `z_t` is the scalar latent state (never observed)
- `epsilon_t(a) ~ N(0, beta_a^2 * sigma_r^2)` is i.i.d. observation noise

### Latent State AR(k) Process

The hidden state evolves as:

```
z_t = gamma_0 + sum_{j=1}^{k} gamma_j * z_{t-j} + xi_t
```

where:
- `gamma_0` is an intercept
- `gamma_1, ..., gamma_k` are AR coefficients
- `xi_t ~ N(0, sigma_z^2)` is i.i.d. process noise
- **Stability assumption (3.4):** |sum_{j=1}^{k} gamma_j| < 1, ensuring bounded state

The parameter `sigma_z^2` controls the level of non-stationarity. When sigma_z = 0, the problem is stationary. As sigma_z grows, the latent state becomes more volatile.

### Augmented Context Construction

LARL constructs an augmented context vector from the **s most recent time steps**:

```
Phi_t(s) = [R_t, A_t, 1]^T  in  R^{2s|A|+1}
```

where:
- `R_t` concatenates recent rewards weighted by action indicators
- `A_t` concatenates action one-hot encodings
- `1` is a bias term

The window parameter s controls the history depth used to implicitly reconstruct the latent state.

### Reduction to Linear Contextual Bandits (Lemma 3.3)

The key theoretical contribution shows the reward decomposes as:

```
r_t(a) = Phi_t(s)^T * theta_a + b_t(a,s) + epsilon_{a;t}
```

where:
- `theta_a` in R^{2s|A|+1} encodes the underlying system parameters
- `b_t(a,s)` is a bias term that decays as s increases
- `epsilon_{a;t}` is mean-zero noise

This converts the latent-state tracking problem into a standard linear contextual bandit, solvable by LinUCB/OFUL.

### LARL Algorithm (Latent AR LinUCB)

1. **Exploration phase** (t = 1 to T/5): Play actions uniformly at random. At the end, select window size s via **Bayesian Information Criterion (BIC)**: `BIC = n * log(residual_variance) + num_params * log(n)`, choosing the s that minimizes BIC.

2. **Exploitation phase** (t = T/5 to T): Run standard LinUCB with the augmented context Phi_t(s):
   - Maintain per-action design matrix `V_a` (regularized, initialized with lambda*I)
   - Maintain per-action reward-weighted features `b_a`
   - Compute `theta_hat_a = V_a^{-1} * b_a`
   - Select action: `a_t = argmax_a [Phi_t(s)^T * theta_hat_a + alpha * sqrt(Phi_t(s)^T * V_a^{-1} * Phi_t(s))]`
   - Update V_a and b_a via **recursive least squares (RLS)**

### Connection to Steady-State Kalman Filter

If one had access to ground-truth parameters theta_a and set s -> infinity, LARL's reward prediction equals the steady-state Kalman filter prediction with ground-truth system parameters. Finite s introduces bias (truncation error) but reduces variance (fewer parameters to estimate). This bias-variance trade-off, controlled by s, is central to both practical performance and the regret bound.

### Regret Bound (Theorem 4.2)

With probability >= 1 - delta, LARL achieves:

```
Regret(T) <= 8 * max_a ||c_a|| * sqrt(sigma_z^2 / (1 - sigma_max(Gamma)^2)) * sqrt(2(k + log(3/delta))) * T
           + 2 * beta_T(2*delta/3) * sqrt(sum ||Phi_t(s)||^2_{V_{a_t,t-1}^{-1}}) * sqrt(T)
           + 2 * sum max_a |b_t(a,s)|
```

Three terms:
1. **Non-stationarity cost** -- proportional to sigma_z (latent process noise). This is the price of drift.
2. **Learning cost** -- standard LinUCB regret for estimating theta_a. Grows with context dimension (2s|A|+1).
3. **Truncation bias** -- accumulated bias from using finite window s instead of full history.

**Sub-linear regret condition:** If `sigma_z^2 = T^{c-2}` with c < 2, then regret is sub-linear. For example:
- `sigma_z^2 = 1/T` yields O(sqrt(T)) regret
- `sigma_z^2 = constant` yields O(T) regret (linear -- the drift is too fast to track)
- `sigma_z^2 >= T` means the problem is hopeless

This is an important interpretability property: the regret bound directly tells you whether your environment is "learnable" based on the noise-to-horizon ratio.

---

## Benchmarks & Results

### Experimental Setup

- **Time horizon:** T = 200 (relatively short)
- **Monte Carlo trials:** 100 seeds
- **AR orders tested:** k = 1, 5, 10
- **Noise levels:** Varied sigma_z across experiments
- **Actions:** Multi-armed bandit setup (number of actions varies)

### Baselines Compared

| Algorithm | Category | Key Assumption |
|---|---|---|
| **Stationary UCB** | Standard MAB | Rewards are i.i.d. (ignores drift) |
| **AR-UCB** (Bacchiocchi et al., 2022) | Autoregressive | Rewards are *directly* AR (no latent state) |
| **Sliding Window UCB** (Garivier & Moulines, 2008) | Non-stationary | Constant means within fixed-length epochs |
| **Rexp3** (Besbes et al., 2014) | Non-stationary | Bounded total variation budget |
| **Kalman Filter (oracle)** | Oracle baseline | Ground-truth parameters known |

### Key Results

1. **LARL consistently achieves lower cumulative regret** across all AR order variants (k=1, 5, 10) and outperforms all baselines in pairwise comparisons.

2. **Why baselines fail:**
   - **Stationary UCB** ignores drift entirely, accumulates linear regret as the latent state moves.
   - **AR-UCB** assumes rewards are directly autoregressive (no latent mediator), so it mis-specifies the model when the AR structure is latent.
   - **Sliding Window UCB** discards information that is still relevant (the latent state changes smoothly, not in discrete epochs).
   - **Rexp3** requires a non-stationarity budget V_T as input; in latent AR settings, total variation accumulates linearly so the budget is O(T), leading Rexp3 to degenerate.

3. **Ablation on s (window size):** Mis-specifying the AR order k (and thus implicitly s) degrades performance but not catastrophically. BIC selection during the exploration phase recovers near-optimal s in practice.

4. **Closeness to Kalman oracle:** LARL approaches oracle Kalman filter performance as T grows, confirming the steady-state approximation is effective.

### Notable Absence: NeuralUCB, Thompson Sampling

The paper does **not** compare against NeuralUCB or Thompson Sampling variants. This is a significant gap for our evaluation. The baselines are classical MAB algorithms, not neural or Bayesian methods.

---

## Code Availability

### Repository: [annatrella/latent-auto-bandits](https://github.com/annatrella/latent-auto-bandits)

**License:** GPL-3.0 (open source, copyleft -- integration requires releasing derivative works under GPL)

**Structure:**

| File | Purpose |
|---|---|
| `ucb_agents.py` | All agent implementations (parent UCB class + LARL, LARL_ETC, StationaryAgent, ARUCB, KalmanFilterAgent, SWUCB) |
| `baseline_non_stat_agents.py` | Rexp3 and PredictiveSampling (incomplete) agents |
| `environment.py` | Non-stationary environment with latent AR dynamics |
| `stat_environment.py` | Stationary environment variant |
| `lds.py` | Linear dynamical system implementation |
| `rls.py` | Recursive least squares solver |
| `simulations.py` | Experiment runner with ground-truth oracle computation |
| `run_simulations_exp1.py` | Main experiments (varying AR order, noise) |
| `run_simulations_exp2.py` | Ablation with mis-specified k |
| `global_params.py` | Config: MAX_SEED=100, NUM_TIME_STEPS=200 |
| `bias_variance.ipynb` | Analysis notebook |

**Dependencies:** numpy, scipy, scikit-learn, statsmodels, matplotlib, seaborn, cvxpy. Also includes Flask/MySQL dependencies (likely from author's broader project, not needed for bandit experiments).

**Code quality:** Research-grade Python. Clean separation of agents, environments, and experiment scripts. The RLS implementation is standalone and reusable. The code is well-organized but **not production-ready** -- no packaging, no API, no TypeScript/JavaScript port.

**Reproducibility:** `python3 run_simulations_exp1.py` reproduces main results. Parameters configurable in `global_params.py`. T=200 means experiments run in seconds.

---

## Integration as Domain Scheduler

### The B2B Lead-Gen Crawler Use Case

In our RL-based web crawler, the domain scheduler decides which job board domains to crawl next. Each domain is an "arm." The reward is a function of job yield (number of relevant remote-EU AI jobs discovered per crawl). Domain yields drift over time because:

1. **Hiring cycles:** Companies post in waves (Q1 planning, post-summer, etc.)
2. **Domain freshness decay:** A domain's unscraped job inventory depletes between crawls
3. **Market shifts:** New companies appear, others freeze hiring

### Mapping LARL to the Domain Scheduler

| LARL Concept | Domain Scheduler Mapping |
|---|---|
| Action a | Domain to crawl |
| Reward r_t(a) | Normalized job yield from domain a at time t |
| Latent state z_t | Aggregate market hiring activity (unobserved) |
| mu_a | Domain's baseline yield |
| beta_a | Domain's sensitivity to market conditions |
| AR(k) process | Temporal autocorrelation in hiring activity |
| sigma_z | Volatility of the job market |

### Advantages Over NeuralUCB

| Dimension | LARL | NeuralUCB |
|---|---|---|
| **Non-stationarity** | Explicitly models temporal drift via latent AR state | Assumes stationarity; suffers loss of plasticity over time |
| **Temporal structure** | Exploits autocorrelation in drift | Treats each round independently |
| **Regret guarantees** | Interpretable sub-linear bound parameterized by drift rate | O(sqrt(T)) under stationarity only |
| **Computational cost** | O(d^2) per step (RLS update, d = 2s|A|+1) | O(p) per step where p = neural network parameters; much heavier |
| **Interpretability** | Linear model; can inspect theta_a coefficients | Black-box neural network |
| **Sample efficiency** | Strong with small action sets (< 50 domains) | Better with high-dimensional contexts and many actions |
| **Non-linear rewards** | Cannot capture (assumes linear reward in latent state) | Can capture arbitrary reward functions |

### Advantages Over Thompson Sampling

| Dimension | LARL | Thompson Sampling |
|---|---|---|
| **Temporal drift** | Structurally modeled | Requires discounting or sliding window heuristics |
| **Regret bound** | Explicit and interpretable | Discounted TS achieves O(sqrt(T * B_T)) but requires knowing variation budget B_T |
| **Posterior maintenance** | Not needed (frequentist) | Requires maintaining and sampling from posteriors |
| **Computational cost** | Lightweight RLS | Posterior sampling can be expensive for complex models |

### Practical Integration Path

1. **Define the action set:** Each unique domain (Greenhouse board, Lever board, Ashby board) is an arm. With ~30-100 active boards, this is within LARL's sweet spot.

2. **Define the reward signal:** Normalized yield = (relevant_jobs_found / pages_crawled) for each domain per crawl session. Scale to [0, 1].

3. **Choose AR order k:** Start with k=1 (weekly autocorrelation). The BIC model selection during exploration will tune this automatically.

4. **Set window size s:** Let LARL_ETC handle this via BIC after an exploration phase of T/5 time steps.

5. **Port to TypeScript:** The core algorithm is simple:
   - Augmented context construction (concatenate recent rewards/actions)
   - RLS parameter update (matrix operations: V <- V + phi*phi^T, b <- b + phi*r)
   - UCB action selection (argmax of mean + confidence)
   - Total: ~150 lines of TypeScript with a matrix library

6. **Integrate with existing crawler:** Replace NeuralUCB's domain selection with LARL's `select_action()`. Feed back crawl yields as rewards. The latent state will implicitly track market conditions.

### TypeScript Implementation Sketch

```typescript
interface LARLAgent {
  // Per-action state
  V: Map<string, number[][]>;     // Design matrices (d x d)
  b: Map<string, number[]>;       // Reward-weighted features (d)
  theta: Map<string, number[]>;   // Parameter estimates (d)

  // History
  recentRewards: number[];        // Last s rewards
  recentActions: string[];        // Last s actions

  // Config
  s: number;                      // Window size
  alpha: number;                  // Exploration parameter
  lambda: number;                 // Regularization
  actions: string[];              // Domain list
}

function selectDomain(agent: LARLAgent): string {
  const phi = buildContext(agent);  // R^{2s|A|+1}
  let bestAction = '';
  let bestUCB = -Infinity;
  for (const a of agent.actions) {
    const mean = dot(phi, agent.theta.get(a)!);
    const bonus = agent.alpha * Math.sqrt(quadForm(phi, invert(agent.V.get(a)!)));
    if (mean + bonus > bestUCB) {
      bestUCB = mean + bonus;
      bestAction = a;
    }
  }
  return bestAction;
}
```

---

## Risks & Limitations

### Fundamental Limitations

1. **Linear reward assumption.** LARL assumes rewards are linear in the latent state (`r = mu_a + beta_a * z_t + noise`). If domain yields depend non-linearly on market conditions (e.g., threshold effects where a domain suddenly becomes productive), LARL will mis-specify and underperform. NeuralUCB handles non-linearity better.

2. **Scalar latent state.** The current formulation assumes a single scalar z_t drives all reward drift. In practice, multiple latent factors may affect different domains independently (e.g., AI hiring vs. general hiring vs. EU regulatory changes). Multi-dimensional latent state extensions are mentioned as future work but are not developed.

3. **Stationarity of AR parameters.** The AR coefficients gamma_j and reward parameters mu_a, beta_a are assumed time-invariant. If the structure of hiring cycles changes (not just the level), LARL cannot adapt.

4. **Sub-linear regret condition.** Sub-linear regret requires `sigma_z^2 = o(T)`. If the job market is genuinely volatile (sigma_z^2 = O(1) or worse), LARL's regret is linear -- no better than random. For hiring cycles, sigma_z^2 is likely moderate and roughly constant, which means the bound is O(T) for long horizons. In practice, performance may still be reasonable, but the theoretical guarantee is lost.

5. **Small action set assumption.** Context dimension is 2s|A|+1. With |A| = 100 domains and s = 10, that is 2001-dimensional. RLS on 2001-dimensional matrices per action per step is O(|A| * d^2) = O(100 * 2001^2) ~ 400M operations per step. This is feasible but not cheap, and the parameter estimation quality degrades with high dimensionality.

### Practical Risks for Domain Scheduler

6. **Short horizon experiments (T=200).** The paper only validates at T=200. Crawler schedules run for thousands to tens of thousands of steps. Long-horizon behavior is untested.

7. **GPL-3.0 license.** The reference implementation is GPL-3.0 (copyleft). Cannot embed directly into a proprietary codebase. Must reimplement from the paper's algorithm description.

8. **No seasonal modeling.** LARL's AR process captures smooth temporal autocorrelation but **not explicit periodicity**. Hiring cycles are periodic (quarterly, annually). An AR(k) process can approximate periodicity if k is large enough (e.g., k=52 for weekly data with annual cycles), but this drastically increases the parameter count and context dimension. A Fourier feature or seasonal AR (SAR) extension would be more natural but does not exist in the current framework.

9. **Exploration phase cost.** LARL_ETC spends T/5 time steps on pure random exploration for BIC model selection. For a crawler with T=1000, that is 200 wasted crawl sessions. A warm-start or transfer learning mechanism would be needed.

10. **No contextual features.** LARL is a multi-armed bandit, not a contextual bandit (despite using LinUCB internally -- the "context" is constructed history, not exogenous features). You cannot condition on features like "day of week," "is it Q1," or "domain has posted new jobs recently." This is a significant limitation versus NeuralUCB which naturally incorporates contextual features.

### Missing Comparisons

11. **No comparison with NeuralUCB or Neural-LinUCB.** The paper only benchmarks against classical methods. Whether LARL outperforms neural bandits in realistic non-stationary settings is unknown.

12. **No comparison with Discounted Thompson Sampling.** DS-TS (Baudry et al., 2023) achieves near-optimal O(sqrt(T * B_T)) regret for abruptly changing environments and would be a strong baseline.

---

## Verdict (1-5 Applicability Score)

### Score: 3 / 5 -- Promising structural idea, significant practical gaps

**Justification:**

LARL introduces a genuinely novel and theoretically elegant approach to non-stationary bandits. The latent AR model is a natural fit for environments where drift is driven by smooth hidden processes -- which is arguably the case for hiring cycle-driven domain yields. The Kalman filter connection provides both intuition and a path to efficient online learning. The algorithm itself is simple, computationally lightweight, and interpretable.

However, several factors prevent a higher score:

- **No exogenous context support** (day-of-week, domain metadata, recent crawl signals) severely limits the scheduler's ability to make informed decisions. NeuralUCB's main advantage is exactly this.
- **No explicit seasonal/periodic modeling** means hiring cycles must be approximated by high-order AR processes, which is wasteful and may require impractically large k and s values.
- **Scalar latent state** is likely too restrictive for multi-factor market dynamics.
- **Untested at scale** (T=200 only) and no neural baselines leave the practical value uncertain.
- **GPL-3.0 code** means we must reimplement from scratch.

**Recommendation:** LARL is worth implementing as a **lightweight baseline** alongside NeuralUCB, not as a replacement. The best approach would be a **hybrid architecture**:
- Use LARL's latent AR tracking idea to model temporal drift in domain yields
- Embed it within a contextual framework (e.g., as a temporal feature generator feeding into a contextual bandit)
- Add Fourier features for seasonal components

Alternatively, consider the related work by Chen et al. (2022, arXiv:2210.16386) on "Non-Stationary Bandits with Auto-Regressive Temporal Dependency" which directly models AR reward structure with restart mechanisms -- potentially more practical for handling hiring cycle regime changes.

---

## References

- Trella, A.L., Dempsey, W.H., Gazi, A.H., Xu, Z., Doshi-Velez, F., Murphy, S.A. (2025). Non-Stationary Latent Auto-Regressive Bandits. RLJ, vol. 6, pp. 765-789. [arXiv:2402.03110](https://arxiv.org/abs/2402.03110)
- Bacchiocchi, F., Genalti, G., et al. (2022). Autoregressive Bandits. [arXiv:2212.06251](https://arxiv.org/abs/2212.06251)
- Chen, Q., Golrezaei, N., Bouneffouf, D. (2022). Non-Stationary Bandits with Auto-Regressive Temporal Dependency. [arXiv:2210.16386](https://arxiv.org/abs/2210.16386)
- Zhou, D., Li, L., Gu, Q. (2020). Neural Contextual Bandits with UCB-based Exploration. ICML 2020. [arXiv:1911.04462](https://arxiv.org/abs/1911.04462)
- Garivier, A., Moulines, E. (2008). On Upper-Confidence Bound Policies for Non-Stationary Bandit Problems.
- Besbes, O., Gur, Y., Zeevi, A. (2014). Stochastic Multi-Armed Bandit Problem with Non-Stationary Rewards.
- Baudry, D., et al. (2023). Discounted Thompson Sampling for Non-Stationary Bandit Problems. [arXiv:2305.10718](https://arxiv.org/abs/2305.10718)
