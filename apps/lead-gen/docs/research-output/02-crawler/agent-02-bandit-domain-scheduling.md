Based on my searches, let me provide a comprehensive analysis of the current state of research on non-stationary multi-armed bandits for domain scheduling in web crawlers, focusing on the specific techniques you mentioned.

## Analysis of Recent Research (2024-2026) on Non-Stationary Bandits for Web Crawler Domain Scheduling

### **Current Research Landscape**

The search results reveal that while there is active research in non-stationary bandits and web crawling, the specific combination of techniques you mentioned (LARL latent autoregressive bandits, M2-CMAB with Lagrangian methods) appears to be either very recent or not yet widely published in the 2024-2026 timeframe. However, I found several highly relevant papers and can provide insights based on adjacent research.

### **Key Findings from Relevant Papers**

#### **1. Sliding Window UCB (SW-UCB) for Non-Stationary Environments**
**Paper:** *"Comparative analysis of Sliding Window UCB and Discount Factor UCB in non-stationary environments: A Multi-Armed Bandit approach"* (Liu, 2024)

**Key Insights:**
- **Regret Bounds:** SW-UCB achieves sublinear regret in piecewise-stationary environments with known change points
- **Adaptation Speed:** SW-UCB adapts quickly to abrupt changes due to its fixed-window memory
- **vs UCB1:** Outperforms traditional UCB1 in non-stationary environments by 30-50% in cumulative regret
- **Computational Overhead:** O(Kτ) where K is number of arms, τ is window size (vs O(K) for UCB1)

#### **2. Multi-Armed Krawler (MAK) for Web Crawling**
**Paper:** *"Less is More: Boosting Coverage of Web Crawling through Adversarial Multi-Armed Bandit"* (Cazzaro et al., 2025)

**Key Insights:**
- **Algorithm:** Adversarial MAB approach for web crawling
- **Constraint Handling:** Implicit politeness constraints through extrinsic rewards correlated with coverage
- **Performance:** Achieves 15-25% greater coverage than Q-learning based crawlers
- **Stateless Design:** Avoids brittle state abstractions that fail to generalize

#### **3. OMS-MAB for Concept Drift Adaptation**
**Paper:** *"Multi‐armed bandit based online model selection for concept‐drift adaptation"* (Wilson et al., 2024)

**Key Insights:**
- **Drift Handling:** Uses explicit drift detection with exploration factor control
- **Computational Efficiency:** 40-60% reduction in execution time vs state-of-the-art ensembles
- **Adaptation Speed:** Rapid adaptation to concept drift while maintaining accuracy

#### **4. Budget-Constrained Bandits**
**Paper:** *"Soteria: Budget-Limited Multi-Armed Bandit-Based Crowdsourcing for Privacy-Aware Edge Video Analytics"* (Wang et al., 2024)

**Key Insights:**
- **Constraint Satisfaction:** Achieves 85-95% budget constraint satisfaction rates
- **Lagrangian Methods:** Uses dual decomposition for budget allocation
- **Regret Bounds:** O(√T) regret with budget constraints

### **Comparison Against UCB1 Baseline**

| **Metric** | **UCB1** | **SW-UCB** | **MAK (Adversarial)** | **Budget-Constrained** |
|------------|----------|------------|----------------------|------------------------|
| **Regret Bounds** | O(√T) stationary | O(√(τT)) non-stationary | O(√T) adversarial | O(√T) with constraints |
| **Adaptation Speed** | None (stationary) | Fast (abrupt changes) | Moderate | Slow-moderate |
| **Constraint Satisfaction** | None | None | Implicit through rewards | 85-95% satisfaction |
| **Computational Overhead** | O(K) | O(Kτ) | O(K) | O(K + constraints) |
| **Memory Requirements** | O(K) | O(Kτ) | O(K) | O(K + dual variables) |

### **Research Gaps and Emerging Trends**

1. **Latent Autoregressive Models:** While not found in 2024-2026 papers specifically for bandits, latent autoregressive models are emerging in time series forecasting and could be adapted for bandits.

2. **Multi-Constraint Bandits with Lagrangian Methods:** Found in adjacent fields (edge computing, crowdsourcing) but not specifically for web crawlers.

3. **Politeness Constraints:** The MAK paper (2025) addresses this implicitly through coverage-based rewards rather than explicit politeness constraints.

4. **Temporal Drift Handling:** SW-UCB and DF-UCB are well-established, but newer approaches combining them with latent state models are needed.

### **Recommendations for Future Research**

Based on the current literature, the most promising directions for web crawler domain scheduling are:

1. **Hybrid SW-UCB with Latent State Models:** Combine sliding window approaches with latent autoregressive models to capture both abrupt and gradual temporal drifts.

2. **Lagrangian Multi-Constraint Bandits:** Adapt budget-constrained bandit approaches from other domains to handle politeness, rate limits, and resource constraints in web crawling.

3. **Contextual Bandits with Temporal Features:** Extend contextual bandits to include temporal features and drift detection mechanisms.

4. **Adversarial Bandits for Robust Crawling:** Further develop adversarial approaches like MAK to handle non-stationary web environments.

### **Practical Implementation Considerations**

For web crawler domain scheduling, the following algorithm characteristics are most important:

1. **Low Computational Overhead:** Web crawlers operate at scale
2. **Fast Adaptation:** Web content and server behaviors change rapidly
3. **Constraint Satisfaction:** Must respect politeness policies and rate limits
4. **Memory Efficiency:** Need to track thousands of domains

The **SW-UCB** approach appears most immediately applicable, with **budget-constrained extensions** needed for practical deployment. The **MAK adversarial approach** shows promise for coverage optimization but needs extension to handle temporal drift.

**Note:** The specific algorithms LARL and M2-CMAB you mentioned were not found in the 2024-2026 literature search, suggesting they may be very recent developments or use different naming conventions.