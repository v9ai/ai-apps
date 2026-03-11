Based on my comprehensive search of academic literature, I'll now provide structured findings on risk management frameworks for leveraged crypto scalping. Let me organize the findings into a comprehensive report.

# Comprehensive Survey: Risk Management Frameworks for Leveraged Crypto Scalping

## Executive Summary

This research synthesizes academic literature (2018-2026) on risk management for ultra-short-term leveraged crypto trading on platforms like Bybit. The survey covers position sizing, stop-loss strategies, risk-reward optimization, tail risk management, and system architecture for automated scalping systems.

## 1. Position Sizing Methodologies

### 1.1 Kelly Criterion & Fractional Kelly
**Key Papers:**
- **Carta & Conversano (2020)**: "Practical Implementation of the Kelly Criterion: Optimal Growth Rate, Number of Trades, and Rebalancing Frequency for Equity Portfolios" - Demonstrates Kelly criterion maximizes expected growth rate and median terminal wealth under normal return distributions.
- **O'Brien et al. (2020)**: "A Generalization of the Classical Kelly Betting Formula to the Case of Temporal Correlation" - Extends Kelly to account for temporal correlation among bets.
- **Wójtowicz & Serwa (2024)**: "Application of Fractional Kelly Criterion to Enhance Profits in Emerging Markets" - Recent application to crypto markets.

**Practical Implementation:**
- **Full Kelly**: f* = (bp - q)/b, where b = odds, p = win probability, q = loss probability
- **Fractional Kelly**: Typically 25-50% of full Kelly for risk reduction
- **Crypto-specific adjustments**: Account for higher volatility (3-5x traditional markets)

### 1.2 Fixed Fractional Position Sizing
**Key Insights:**
- **Scholz (2012)**: "Size matters! How position sizing determines risk and return of technical timing strategies" - Systematic analysis of position sizing impact
- **Risk-per-trade**: 0.5-2% of portfolio per trade for scalping
- **Volatility-adjusted sizing**: Position size ∝ 1/σ (inverse volatility)

## 2. Stop-Loss Placement Strategies

### 2.1 ATR-Based Stops
**Academic Foundation:**
- **Average True Range (ATR)**: Wilder's volatility measure
- **Scalping applications**: 1-2x ATR for tight stops, 2-3x ATR for wider stops
- **Dynamic adjustment**: ATR-based stops adapt to changing volatility regimes

### 2.2 Structure-Based Stops
**Technical Approaches:**
- Support/resistance levels
- Fibonacci retracement levels
- Market structure breaks (higher highs/lower lows)

### 2.3 Time-Based Stops
**Scalping Considerations:**
- Maximum holding period: 1-5 minutes for ultra-short-term scalping
- Time decay in options/perpetuals
- Opportunity cost of capital

## 3. Risk-Reward Ratios Optimization

### 3.1 Optimal R:R for Different Scalping Styles
**Empirical Findings:**
- **1:1 R:R**: High win rate required (>60%)
- **1:2 R:R**: Balanced approach, win rate >40% profitable
- **1:3 R:R**: Lower win rate acceptable (>30%)
- **Crypto-specific**: Higher volatility allows for wider stops, potentially improving R:R

### 3.2 Win Rate vs. Risk-Reward Tradeoff
**Mathematical Framework:**
- Minimum win rate = 1/(1 + R:R)
- Example: 1:2 R:R requires >33.3% win rate
- Expected value = (Win% × Reward) - (Loss% × Risk)

## 4. Maximum Daily Drawdown Limits & Circuit Breakers

### 4.1 Daily Loss Limits
**Industry Standards:**
- **Conservative**: 2-3% maximum daily loss
- **Aggressive**: 5-6% maximum daily loss
- **Circuit breakers**: Automatic shutdown at 2-3% intraday loss

### 4.2 Implementation Strategies
- **Tiered shutdown**: Reduce position sizes at 50% of daily limit
- **Complete shutdown**: Stop all trading at daily limit
- **Cooling periods**: 1-24 hour mandatory breaks after limit breaches

## 5. Correlation Risk in Leveraged Perpetual Futures

### 5.1 Funding Rate Risk
**Key Research:**
- **Soska et al. (2021)**: "Towards Understanding Cryptocurrency Derivatives: A Case Study of BitMEX" - Comprehensive analysis of perpetual futures mechanics
- **Funding rate dynamics**: Typically 8-hour intervals, can reach 0.1-0.3% per interval
- **Carry cost**: Long positions pay shorts when funding positive, vice versa

### 5.2 Basis Risk
- Spot-futures price divergence
- Convergence at expiration (for dated futures)
- Perpetual basis = Futures price - Spot price

### 5.3 Liquidation Cascades
**Recent Research:**
- **Ali (2025)**: "Anatomy of the Oct 10–11, 2025 Crypto Liquidation Cascade" - Analysis of systemic risk events
- **Cascade mechanics**: Forced liquidations → price pressure → more liquidations
- **Bybit-specific**: Auto-deleveraging (ADL) mechanisms

## 6. Portfolio Heat & Exposure Management

### 6.1 Maximum Simultaneous Exposure
**Risk Management Principles:**
- **Total portfolio heat**: Sum of position risks
- **Maximum exposure**: Typically 20-40% of portfolio at risk
- **Correlation-adjusted**: Reduce exposure for highly correlated positions

### 6.2 Margin Utilization Targets
**Optimal Levels:**
- **Conservative**: 20-30% margin utilization
- **Moderate**: 30-50% margin utilization
- **Aggressive**: 50-70% margin utilization (high risk)

### 6.3 Position Concentration Limits
- Maximum 10-20% of portfolio in single instrument
- Maximum 30-40% in single sector (e.g., DeFi, Layer 1s)
- Geographic/regulatory risk diversification

## 7. Tail Risk Management

### 7.1 Flash Crash Protection
**Academic Insights:**
- **Madhavan (2011)**: "Exchange-Traded Funds, Market Structure and the Flash Crash" - Classic study of flash crash dynamics
- **Crypto-specific factors**: Lower liquidity, fragmented exchanges, algorithmic trading

### 7.2 Exchange Outage Risk
**Mitigation Strategies:**
- Multi-exchange diversification
- Redundant connectivity
- Local data storage and backup systems

### 7.3 Bybit-Specific Risks
**Platform Characteristics:**
- Order book depth variations
- API rate limits and reliability
- Maintenance schedules and downtime

## 8. Variance Drain & High-Frequency Mathematics

### 8.1 Volatility Drag Mathematics
**Key Research:**
- **Andersson & Grahm (2025)**: "Mitigating Volatility Drag Using Machine Learning Models" - Recent work on volatility drag mitigation
- **Mathematical formulation**: Geometric mean < Arithmetic mean due to variance
- **Leverage amplification**: Variance drain magnified with leverage

### 8.2 High-Frequency Trading Mathematics
**Theoretical Foundations:**
- **Kirilenko & Lo (2013)**: "Moore's Law versus Murphy's Law: Algorithmic Trading and Its Discontents" - Algorithmic trading risks
- **Latency arbitrage**: Sub-millisecond advantages
- **Market impact models**: Optimal execution strategies

### 8.3 Scalping-Specific Considerations
- **Transaction cost drag**: Bid-ask spread, fees, slippage
- **Optimal frequency**: Balance between signal quality and costs
- **Statistical arbitrage**: Mean reversion vs. momentum strategies

## 9. Machine Learning & Reinforcement Learning Approaches

### 9.1 RL for Crypto Trading
**Recent Advances:**
- **Wilkman (2020)**: "Feasibility of a Reinforcement Learning Based Stock Trader" - RL applications to trading
- **State representation**: Price, volume, order book, technical indicators
- **Reward functions**: Sharpe ratio, Sortino ratio, maximum drawdown

### 9.2 Risk-Aware RL
**Key Techniques:**
- Constrained RL with risk limits
- Distributional RL for tail risk
- Multi-objective optimization (return vs. risk)

## 10. Production System Architecture

### 10.1 System Design Principles
**Scalping Requirements:**
- **Latency**: <100ms round-trip for competitive advantage
- **Reliability**: 99.9%+ uptime requirements
- **Monitoring**: Real-time risk metrics and alerts

### 10.2 Risk Management Module Architecture
**Core Components:**
1. **Position sizing engine**: Kelly/fractional Kelly calculations
2. **Stop-loss manager**: Dynamic stop adjustment
3. **Exposure monitor**: Portfolio heat calculations
4. **Circuit breaker**: Automatic shutdown triggers
5. **Risk reporting**: Real-time dashboards and alerts

### 10.3 Bybit API Integration
**Technical Considerations:**
- WebSocket for real-time data
- REST API for order management
- Rate limit management and backoff strategies
- Error handling and retry logic

## 11. Regulatory & Compliance Considerations

### 11.1 Emerging Regulations
**Global Trends:**
- MiCA (EU Markets in Crypto-Assets Regulation)
- SEC guidance on crypto derivatives
- Tax reporting requirements

### 11.2 Best Practices
- Transaction record keeping
- Audit trails for algorithmic decisions
- Compliance with exchange terms of service

## 12. Future Research Directions

### 12.1 Open Research Questions
1. **Crypto-specific Kelly adjustments**: Accounting for non-normal return distributions
2. **Liquidation cascade prediction**: Early warning systems
3. **Cross-exchange arbitrage risk**: Managing fragmented liquidity
4. **Decentralized exchange integration**: Smart contract execution risks

### 12.2 Emerging Technologies
- **Quantum-resistant cryptography**: Future-proofing systems
- **Zero-knowledge proofs**: Privacy-preserving trading
- **Cross-chain interoperability**: Multi-chain risk management

## Conclusion

This comprehensive survey reveals that effective risk management for leveraged crypto scalping requires integration of classical financial mathematics (Kelly criterion, volatility models) with crypto-specific considerations (funding rates, liquidation cascades, exchange risks). The optimal framework combines:

1. **Conservative position sizing** (fractional Kelly, 0.5-2% risk per trade)
2. **Dynamic stop-loss strategies** (ATR-based, structure-aware)
3. **Multi-layered risk limits** (daily drawdown, portfolio heat, margin utilization)
4. **Tail risk protection** (flash crash detection, exchange redundancy)
5. **Automated monitoring** (real-time alerts, circuit breakers)

The academic literature suggests that while crypto markets present unique challenges (higher volatility, 24/7 trading, regulatory uncertainty), established risk management principles remain applicable when properly adapted to market microstructure characteristics.

**Critical Success Factors:**
- Continuous model validation and backtesting
- Stress testing against historical flash crashes
- Multi-exchange diversification
- Robust system architecture with fail-safes
- Ongoing adaptation to evolving market conditions

This research provides the foundation for building a production-grade automated scalping system for Bybit perpetual futures that balances profit potential with robust risk management.