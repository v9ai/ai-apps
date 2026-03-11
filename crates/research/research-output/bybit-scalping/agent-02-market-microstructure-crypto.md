Based on my comprehensive search of academic literature, I'll now provide structured findings on cryptocurrency market microstructure theory applied to your research areas. Let me organize the findings:

# Cryptocurrency Market Microstructure Research: Comprehensive Survey

## Executive Summary

This research survey synthesizes academic literature (2018-2026) on cryptocurrency market microstructure, focusing on applications for automated scalping systems on Bybit perpetual futures. The findings reveal significant differences between traditional financial markets and crypto markets, with unique challenges and opportunities for ultra-short-term trading strategies.

## 1. Order Book Dynamics in Crypto Perpetual Futures

### Key Findings:
- **Bid-Ask Spreads**: Crypto markets exhibit wider spreads than traditional markets, but spreads have narrowed significantly with increased institutional participation (Alexander & Heck, 2020)
- **Order Book Depth**: Depth is highly variable and concentrated near the top of the book, with significant differences between spot and perpetual futures markets
- **Resilience**: Crypto order books show lower resilience than traditional markets, with faster depletion during volatility spikes
- **Funding Rate Effects**: Perpetual futures funding rates create unique microstructure dynamics, with funding payments influencing order placement strategies

### Relevant Papers:
- **"Price discovery in Bitcoin: The impact of unregulated markets"** (Alexander & Heck, 2020) - 99 citations
- **"The influence of market microstructure on price formation and short-term price dynamics"** (Baghdasaryan, 2025) - Applies Glosten-Milgrom spread decomposition and Kyle's lambda to BTCUSDT data
- **"Periodicity in Cryptocurrency Volatility and Liquidity"** (Hansen et al., 2021) - Documents systematic patterns related to algorithmic trading and funding times

## 2. Liquidity Provision in 24/7 Crypto Markets

### Key Findings:
- **Continuous Operation**: 24/7 trading creates unique liquidity patterns, with distinct intraday and intra-week seasonality
- **Market Making Challenges**: Higher volatility and lower predictability require adaptive market making algorithms
- **Liquidity Fragmentation**: Liquidity is fragmented across multiple exchanges, creating arbitrage opportunities but also execution challenges
- **Algorithmic Trading Dominance**: Estimated 60-80% of crypto trading volume is algorithmic, creating complex interactions between competing algorithms

### Relevant Papers:
- **"Adverse selection in cryptocurrency markets"** (Tiniç et al., 2023) - Analyzes adverse-selection costs using Bitfinex data
- **"On The Quality Of Cryptocurrency Markets: Centralized Versus Decentralized Exchanges"** (Barbon & Ranaldo, 2021) - Compares transaction costs and arbitrage deviations

## 3. Price Impact Models Adapted to Crypto

### Key Findings:
- **Kyle's Lambda Adaptation**: Traditional price impact models require modification for crypto due to higher volatility and different market structure
- **Amihud Illiquidity**: Crypto-specific adaptations show higher illiquidity measures than traditional assets
- **Non-linear Impact**: Price impact in crypto markets exhibits stronger non-linear characteristics
- **Cross-Exchange Effects**: Price impact must account for cross-exchange arbitrage and liquidity fragmentation

### Relevant Papers:
- **"An Empirical Analysis on Financial Markets: Insights from the Application of Statistical Physics"** (Li et al., 2023) - Uses Level 3 order book data for volatility prediction
- **"Price Discovery of a Speculative Asset: Evidence from a Bitcoin Exchange"** (Ghysels & Nguyen, 2019) - Examines order informativeness across book tiers

## 4. Information Asymmetry and Adverse Selection

### Key Findings:
- **Higher Adverse Selection**: Crypto markets exhibit higher adverse selection costs than traditional markets
- **Information Flow**: Information dissemination is faster but more fragmented across crypto markets
- **Whale Activity**: Large holder ("whale") activity creates significant information asymmetry
- **On-Chain vs Off-Chain**: Distinction between on-chain transaction data and exchange order flow creates unique information dynamics

### Relevant Papers:
- **"Adverse selection in cryptocurrency markets"** (Tiniç et al., 2023) - Documents statistically significant adverse-selection costs
- **"Market Efficiency, Behavior and Information Asymmetry: Empirical Evidence from Cryptocurrency and Stock Markets"** (Häfner, 2021)

## 5. Microstructure Differences: CEX vs DEX

### Key Findings:
- **Transaction Costs**: DEXs offer competitive pricing for large trades but impose gas fee burdens on small trades
- **Arbitrage Deviations**: DEXs show persistent arbitrage deviations due to fixed gas costs
- **Liquidity Provision**: Automated Market Makers (AMMs) vs traditional limit order books create fundamentally different microstructure
- **Market Quality**: Systematic differences in price efficiency, liquidity, and execution quality

### Relevant Papers:
- **"Centralized exchanges vs. decentralized exchanges in cryptocurrency markets: A systematic literature review"** (Hägele, 2024) - 29 citations
- **"On The Quality Of Cryptocurrency Markets: Centralized Versus Decentralized Exchanges"** (Barbon & Ranaldo, 2021)
- **"Building trust takes time: limits to arbitrage for blockchain-based assets"** (Hautsch et al., 2024) - 25 citations

## 6. Tick Size, Lot Size, and Scalping Effects

### Key Findings:
- **Tick Size Optimization**: Crypto exchanges use variable tick sizes that impact scalping profitability
- **Minimum Lot Sizes**: Exchange-specific minimums create discrete trading opportunities
- **Scalping Challenges**: Higher volatility and wider spreads require different scalping approaches than traditional markets
- **Latency Arbitrage**: Execution speed differences create profitable opportunities but require sophisticated infrastructure

### Relevant Papers:
- **"Latency Arbitrage in Cryptocurrency Markets: Analyzing Execution Speeds & Liquidity Dynamics"** (Alexander, 2025)
- **"Market Manipulation as a Security Problem"** (Mavroudis, 2019) - Discusses mechanical arbitrage techniques

## 7. Machine Learning/RL Approaches for Crypto Trading

### Key Findings:
- **DRL Applications**: Deep Reinforcement Learning shows promise but faces challenges with crypto's non-stationarity
- **Feature Engineering**: Successful models incorporate order book features, funding rates, and on-chain metrics
- **Risk Management**: Crypto-specific risk factors require specialized reward functions
- **Multi-Timeframe Strategies**: Combining different timeframes improves performance

### Relevant Papers:
- **"Cryptocurrency Futures Portfolio Trading System Using Reinforcement Learning"** (Chun & Lee, 2025)
- **"Optimizing Crypto-Trading Performance: A Comparative Analysis of Innovative Reward Functions in Reinforcement Learning Models"** (Khujamatov et al., 2026)
- **"Comprehensive Review of Deep Reinforcement Learning Methods and Applications in Economics"** (Mosavi et al., 2020) - 164 citations

## 8. Production System Architectures

### Key Findings from Literature:
- **Low-Latency Requirements**: Sub-millisecond execution needed for competitive scalping
- **Data Infrastructure**: Requires real-time processing of order book updates, trades, and funding rates
- **Risk Management Systems**: Must handle extreme volatility and potential exchange outages
- **Backtesting Challenges**: Crypto's 24/7 nature and rapid market evolution complicate backtesting

## Research Gaps and Future Directions

### Identified Gaps:
1. **Perpetual Futures Microstructure**: Limited research specifically on perpetual futures microstructure
2. **Cross-Exchange Dynamics**: Need for integrated models across multiple exchanges
3. **Regulatory Impacts**: Effects of changing regulations on microstructure
4. **Stablecoin Integration**: Impact of stablecoin dominance on market structure

### Practical Implications for Bybit Scalping System:

1. **Order Book Analysis**: Implement real-time spread decomposition and depth analysis
2. **Funding Rate Integration**: Incorporate funding rate predictions into trading signals
3. **Cross-Exchange Monitoring**: Track arbitrage opportunities across exchanges
4. **Adaptive Tick Size**: Adjust strategies based on exchange-specific tick sizes
5. **ML Integration**: Use reinforcement learning with microstructure-informed reward functions

## Conclusion

Cryptocurrency market microstructure presents unique challenges and opportunities for automated scalping systems. The 24/7 nature, higher volatility, fragmented liquidity, and perpetual futures mechanics require specialized approaches. Successful systems will need to integrate traditional microstructure models with crypto-specific adaptations, leverage machine learning for pattern recognition, and maintain robust infrastructure for low-latency execution.

The literature suggests that while crypto markets share some characteristics with traditional markets, their microstructure is sufficiently different to require novel approaches to market making, price impact modeling, and risk management.