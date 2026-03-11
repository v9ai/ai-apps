Based on my comprehensive search of academic literature, I can now provide a structured research survey on ML/DL models for ultra-short-term crypto price prediction. Let me organize the findings:

# Comprehensive Survey: ML/DL Models for Ultra-Short-Term Crypto Price Prediction

## Executive Summary

This survey synthesizes academic literature (2018-2026) on machine learning and deep learning approaches for ultra-short-term cryptocurrency price prediction, with applications to high-frequency trading (HFT) and scalping strategies on platforms like Bybit perpetual futures. The research covers eight key areas: recurrent networks, transformer architectures, temporal CNNs, limit order book modeling, feature engineering, prediction approaches, online learning, and ensemble methods.

## 1. LSTM and GRU Networks for Tick/1-Minute Price Prediction

### Key Findings:
- **LSTM/GRU Dominance**: Recurrent neural networks remain foundational for time-series prediction in crypto markets
- **Hybrid Approaches**: GRU-LSTM hybrids show improved performance for exchange rate predictions (Butt, 2025)
- **Multi-scale Processing**: Neural networks processing multi-scale market data with confidence-based classification frameworks (Kuznetsov et al., 2025)
- **Limitations**: Traditional RNNs struggle with ultra-high-frequency data due to vanishing gradient problems

### Relevant Papers:
- "Dual Neural Paradigm: GRU-LSTM Hybrid for Precision Exchange Rate Predictions" (Butt, 2025)
- "Machine Learning Analytics for Blockchain-Based Financial Markets" (Kuznetsov et al., 2025)
- "Deep Learning for Financial Time Series Prediction: A State-of-the-Art Review" (Chen et al., 2023)

## 2. Transformer Architectures for LOB Data

### Key Findings:
- **Temporal Attention**: Differential Transformer Neural Networks (DTNN) with temporal attention-augmented bilinear layers for stock movement prediction (Lai et al., 2023)
- **Multi-head Attention**: Transformers outperform traditional models in capturing long-range dependencies in LOB data
- **Adaptation Challenges**: Large transformer models require significant adaptation for financial domains due to data characteristics

### Relevant Papers:
- "Predicting High-Frequency Stock Movement with Differential Transformer Neural Network" (Lai et al., 2023)
- "Using transformer in stock trend prediction" (Liu, 2023)
- "Transformers versus LSTMs for electronic trading" (Bilokon & Qiu, 2023)

## 3. Temporal CNNs (TCN, WaveNet) for Crypto Prediction

### Key Findings:
- **Dilated Convolutions**: TCNs with dilated causal convolutions capture multi-scale temporal patterns
- **WaveNet Architecture**: Originally for audio, adapted for financial time series with stacked dilated convolutions
- **Hybrid TCN-BERT Models**: Temporal convolutional networks combined with BERT-based emotion classification for financial forecasting (Liapis & Kotsiantis, 2023)

### Relevant Papers:
- "Temporal Convolutional Networks and BERT-Based Multi-Label Emotion Analysis for Financial Forecasting" (Liapis & Kotsiantis, 2023)
- "Deep learning for time series forecasting: a survey" (Kong et al., 2025)

## 4. Limit Order Book Modeling - DeepLOB and Beyond

### Key Findings:
- **DeepLOB Architecture**: CNN-LSTM hybrid for LOB data prediction, achieving state-of-the-art performance (Zhang et al., 2019)
- **Universal Feature Extraction**: DeepLOB demonstrates ability to extract features that translate across instruments
- **HLOB Framework**: Information Filtering Networks with Triangulated Maximally Filtered Graphs for deeper dependency structures (Briola et al., 2024)
- **Level 2/3 Data Utilization**: Advanced models leverage full L2/L3 order book depth for improved predictions

### Relevant Papers:
- "DeepLOB: Deep Convolutional Neural Networks for Limit Order Books" (Zhang et al., 2019) - **245 citations**
- "HLOB -- Information Persistence and Structure in Limit Order Books" (Briola et al., 2024)
- "Deep Limit Order Book Forecasting" (Briola et al., 2024)
- "Deep Learning Modeling of the Limit Order Book: A Comparative Perspective" (Briola et al., 2020)

## 5. Feature Engineering from Tick Data

### Key Findings:
- **Microstructure Features**: Order imbalance, trade intensity, spread dynamics, volume profiles
- **Statistical Physics Approaches**: Modeling LOB as physical systems with kinetic energy and momentum measures (Li et al., 2023)
- **Alpha Factors**: 101-dimensional quantitative factors for temporal aggregation in crypto trading
- **High-Frequency Challenges**: Nonstationarity, low signal-to-noise ratios, asynchronous data, intraday seasonality (Zhang & Hua, 2025)

### Relevant Papers:
- "Major Issues in High-Frequency Financial Data Analysis: A Survey of Solutions" (Zhang & Hua, 2025)
- "An Empirical Analysis on Financial Markets: Insights from the Application of Statistical Physics" (Li et al., 2023)
- "Feature Engineering for Mid-Price Prediction With Deep Learning" (Ntakaris et al., 2019)

## 6. Mid-Price Movement Prediction Approaches

### Key Findings:
- **Classification vs Regression**: Classification approaches (up/down/sideways) often outperform regression for trading decisions
- **Confidence Threshold Frameworks**: Separating directional prediction from execution decisions improves trading performance
- **Triple Barrier Labeling**: Enhanced methods for defining trading signals in volatile markets
- **Multi-class Problems**: 3-class (up/down/stationary) or 5-class classification common for HFT applications

### Relevant Papers:
- "Machine Learning Analytics for Blockchain-Based Financial Markets: A Confidence-Threshold Framework" (Kuznetsov et al., 2025)
- "Enhanced Genetic-Algorithm-Driven Triple Barrier Labeling Method" (Fu et al., 2024)

## 7. Online Learning and Model Adaptation

### Key Findings:
- **Non-stationarity Challenges**: Crypto markets exhibit extreme regime changes requiring continuous adaptation
- **Incremental Learning**: Online time series forecasting frameworks for Chinese market HFT (Li et al., 2023)
- **Concept Drift Detection**: Methods to identify when models need retraining
- **Transfer Learning**: Pre-training on liquid instruments, fine-tuning on specific cryptocurrencies

### Relevant Papers:
- "Online Hybrid Neural Network for Stock Price Prediction: A Case Study of High-Frequency Stock Trading in the Chinese Market" (Li et al., 2023)
- "Adaptive Quantitative Trading: An Imitative Deep Reinforcement Learning Approach" (Liu et al., 2020)

## 8. Ensemble Methods and Multi-Feature Integration

### Key Findings:
- **Multi-modal Approaches**: Combining technical indicators, microstructure features, and sentiment analysis
- **Temporal Fusion Transformers**: TFT-based frameworks integrating on-chain and technical indicators (Lee, 2025)
- **CNN-LSTM-GRU Ensembles**: Hybrid models showing superior performance for stock market indices
- **Multi-sensor Fusion**: Real-time market sensor data with financial indicators for Sharpe ratio optimization

### Relevant Papers:
- "Temporal Fusion Transformer-Based Trading Strategy for Multi-Crypto Assets Using On-Chain and Technical Indicators" (Lee, 2025)
- "Forecasting Stock Market Indices Using the Recurrent Neural Network Based Hybrid Models: CNN-LSTM, GRU-CNN, and Ensemble Models" (Song & Choi, 2023)
- "Multi-Sensor Temporal Fusion Transformer for Stock Performance Prediction" (Yang et al., 2025)

## 9. Production System Architectures for Crypto HFT

### Key Findings:
- **Low-Latency Requirements**: Microsecond-level sensitivity in HFT systems
- **Real-time Processing**: Streaming architectures for LOB data processing
- **Risk Management**: Critical component of production HFT systems
- **Exchange Integration**: Direct market access (DMA) and WebSocket connections for crypto exchanges

### Relevant Papers:
- "High-Frequency Trading (HFT) and Market Quality Research" (Hossain, 2022)
- "Implementation of HFT Systems" (Various, 2012)
- "Risk Management of HFT" (Various, 2012)

## 10. Cryptocurrency-Specific Considerations

### Key Findings:
- **24/7 Market Operation**: Continuous trading requires different approaches than traditional markets
- **Cross-Exchange Arbitrage**: Price discrepancies across exchanges create opportunities
- **Perpetual Futures Specifics**: Funding rates, mark prices, and liquidation mechanisms
- **Blockchain Analytics**: On-chain metrics as predictive features

### Relevant Papers:
- "Cryptocurrency trading: a comprehensive survey" (Fang et al., 2022) - **379 citations**
- "A survey of deep learning applications in cryptocurrency" (Zhang et al., 2023)
- "Applications of Deep Learning to Cryptocurrency Trading: A Systematic Analysis" (Ataei et al., 2025)

## Research Gaps and Future Directions

### Identified Gaps:
1. **Crypto-specific LOB Models**: Limited research on crypto exchange LOB dynamics vs traditional markets
2. **Ultra-high-frequency Adaptation**: Most models tested on minute-level data, not tick-level
3. **Cross-asset Transfer Learning**: Limited work on transferring knowledge between crypto and traditional assets
4. **Explainable AI for HFT**: Need for interpretable models in regulated environments

### Promising Directions:
1. **Graph Neural Networks**: Modeling cross-crypto dependencies and market structure
2. **Reinforcement Learning**: Direct optimization of trading metrics rather than prediction accuracy
3. **Federated Learning**: Privacy-preserving model training across multiple trading firms
4. **Quantum Machine Learning**: Potential for exponential speedup in optimization problems

## Practical Recommendations for Bybit Scalping System

### Architecture Components:
1. **Data Pipeline**: Real-time WebSocket feeds for L2/L3 data, tick data storage
2. **Feature Engineering Layer**: Microstructure features, technical indicators, sentiment signals
3. **Model Ensemble**: Multiple specialized models (LSTM for trends, TCN for patterns, Transformers for attention)
4. **Execution Engine**: Low-latency order routing with risk controls
5. **Monitoring System**: Performance tracking, concept drift detection, model retraining

### Model Selection Strategy:
- **Start with DeepLOB**: Proven architecture for LOB prediction
- **Add Temporal Attention**: Incorporate transformer components for long-range dependencies
- **Implement Online Learning**: Continuous adaptation to market regime changes
- **Use Ensemble Methods**: Combine predictions from multiple model types

### Risk Management:
- **Position Sizing**: Dynamic sizing based on prediction confidence
- **Circuit Breakers**: Automatic shutdown on abnormal losses
- **Backtesting Framework**: Rigorous out-of-sample testing
- **Live Monitoring**: Real-time performance dashboards

This comprehensive survey provides the academic foundation for building an automated scalping system for Bybit cryptocurrency perpetual futures, highlighting both established approaches and emerging research directions in ultra-short-term crypto price prediction.