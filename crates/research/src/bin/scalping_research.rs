use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskStatus, TeamConfig, TeamLead};
use research::tools::SearchToolConfig;

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";
const OUT_DIR: &str = "research-output/bybit-scalping";

fn research_tasks() -> Vec<ResearchTask> {
    let ctx = "This research supports building an automated scalping system for Bybit \
        cryptocurrency perpetual futures. The goal is a comprehensive survey of academic \
        literature, quantitative methods, market microstructure theory, ML/RL approaches, \
        and production system architectures relevant to ultra-short-term (sub-1-minute to \
        5-minute) trading strategies on crypto derivatives exchanges.";

    vec![
        // ══════════════════════════════════════════════════════════════════════
        // Tier 1 — Foundations (7 tasks, no deps)
        // ══════════════════════════════════════════════════════════════════════
        ResearchTask {
            id: 1,
            subject: "scalping-fundamentals".into(),
            description: format!(
                "Research the fundamentals of scalping as a trading strategy. Focus on: \
                (1) definition and taxonomy — tick scalping, momentum scalping, spread scalping, \
                (2) sub-1-minute to 5-minute timeframe mechanics, entry/exit triggers, \
                (3) historical context — scalping from pit trading to electronic markets, \
                (4) academic literature on ultra-short-term trading profitability, \
                (5) key differences between scalping equities, forex, and crypto derivatives, \
                (6) psychological and behavioral aspects of high-frequency manual vs automated scalping. \
                Find seminal and recent papers on scalping strategies, microstructure-based \
                short-term trading, and intraday return predictability (2018-2026). {ctx}"
            ),
            preamble: "You are a quantitative trading researcher specialising in ultra-short-term \
                trading strategies. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            ..Default::default()
        },
        ResearchTask {
            id: 2,
            subject: "market-microstructure-crypto".into(),
            description: format!(
                "Research market microstructure theory applied to cryptocurrency markets. Focus on: \
                (1) order book dynamics — bid-ask spreads, depth, resilience in crypto perpetual futures, \
                (2) liquidity provision and market making in 24/7 crypto markets, \
                (3) price impact models — Kyle's lambda, Amihud illiquidity adapted to crypto, \
                (4) information asymmetry and adverse selection in crypto order flow, \
                (5) microstructure differences between centralized exchanges (CEX) and DEX, \
                (6) tick size, lot size, and price discreteness effects on crypto scalping. \
                Find papers on crypto market microstructure, order book modeling, \
                and liquidity dynamics (2018-2026). {ctx}"
            ),
            preamble: "You are a market microstructure researcher specialising in cryptocurrency \
                derivatives markets. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            ..Default::default()
        },
        ResearchTask {
            id: 3,
            subject: "bybit-platform-architecture".into(),
            description: format!(
                "Research Bybit exchange platform specifics relevant to scalping. Focus on: \
                (1) USDT perpetual contracts vs inverse contracts — margin, settlement, funding, \
                (2) order types — limit, market, conditional, trailing stop, and their execution semantics, \
                (3) fee structure — maker rebate (-0.025%), taker fee (0.075%), VIP tiers, \
                (4) leverage mechanics — up to 100x, cross vs isolated margin, liquidation engine, \
                (5) funding rate mechanics — 8-hour intervals, calculation formula, historical patterns, \
                (6) API capabilities — REST endpoints, WebSocket feeds (orderbook, trades, kline), \
                    rate limits, order placement latency, \
                (7) matching engine architecture and known latency characteristics. \
                Find documentation, technical papers, and community analysis on Bybit's \
                trading infrastructure and its implications for scalping (2020-2026). {ctx}"
            ),
            preamble: "You are a crypto exchange infrastructure analyst. Produce structured \
                findings in Markdown covering Bybit's technical architecture for scalpers."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            ..Default::default()
        },
        ResearchTask {
            id: 4,
            subject: "technical-indicators-scalping".into(),
            description: format!(
                "Research technical indicators optimized for scalping on 1m/5m crypto charts. Focus on: \
                (1) RSI — period tuning for ultra-short timeframes, divergence detection, \
                (2) MACD — signal line crossovers, histogram momentum on 1m charts, \
                (3) Bollinger Bands — squeeze detection, band-walk, mean reversion signals, \
                (4) VWAP — anchored VWAP, VWAP bands, institutional vs retail flow detection, \
                (5) EMA crossovers — 9/21, 5/13/34 ribbon systems for crypto scalping, \
                (6) Stochastic oscillator — %K/%D settings for crypto volatility, \
                (7) ATR — volatility filtering, dynamic stop placement, position sizing, \
                (8) volume indicators — OBV, volume profile, VPOC for crypto. \
                Find papers on technical indicator effectiveness in crypto, parameter \
                optimization for short timeframes (2018-2026). {ctx}"
            ),
            preamble: "You are a technical analysis researcher specialising in indicator \
                optimization for crypto scalping. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            ..Default::default()
        },
        ResearchTask {
            id: 5,
            subject: "order-flow-analysis".into(),
            description: format!(
                "Research order flow analysis techniques for crypto scalping. Focus on: \
                (1) tape reading — time & sales analysis, trade classification (Lee-Ready), \
                (2) volume profile — value area, POC, volume nodes for intraday levels, \
                (3) cumulative volume delta (CVD) — buy/sell pressure divergence, \
                (4) footprint charts — bid/ask volume at each price level, imbalance detection, \
                (5) absorption and exhaustion patterns — large orders absorbing momentum, \
                (6) DOM (depth of market) analysis — order book heatmaps, spoofing detection, \
                (7) trade flow toxicity metrics — VPIN (Volume-Synchronized PIN). \
                Find papers on order flow analysis, informed trading detection, \
                and volume-based crypto signals (2018-2026). {ctx}"
            ),
            preamble: "You are an order flow analysis researcher specialising in crypto \
                derivatives markets. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            ..Default::default()
        },
        ResearchTask {
            id: 6,
            subject: "risk-management-scalping".into(),
            description: format!(
                "Research risk management frameworks for leveraged crypto scalping. Focus on: \
                (1) position sizing — Kelly criterion, fractional Kelly, fixed fractional for scalping, \
                (2) stop-loss placement — ATR-based, structure-based, time-based stops, \
                (3) risk-reward ratios — optimal R:R for different scalping styles (1:1 to 1:3), \
                (4) max daily drawdown limits and circuit breakers, \
                (5) correlation risk in leveraged perpetual futures — funding, basis, liquidation cascades, \
                (6) portfolio heat — maximum simultaneous exposure, margin utilization targets, \
                (7) tail risk — flash crashes, exchange outages, liquidation cascades on Bybit, \
                (8) variance drain and the mathematics of high-frequency leveraged trading. \
                Find papers on risk management for HFT/scalping, Kelly criterion in practice, \
                and crypto-specific risk (2018-2026). {ctx}"
            ),
            preamble: "You are a quantitative risk management researcher specialising in \
                leveraged crypto trading. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            ..Default::default()
        },
        ResearchTask {
            id: 7,
            subject: "ml-price-prediction-hft".into(),
            description: format!(
                "Research ML/DL models for ultra-short-term crypto price prediction. Focus on: \
                (1) LSTM and GRU networks for tick/1m price prediction, \
                (2) Transformer architectures — temporal attention for LOB data, \
                (3) temporal CNNs (TCN, WaveNet) for time-series crypto prediction, \
                (4) limit order book (LOB) modeling — DeepLOB, deep learning on L2/L3 data, \
                (5) feature engineering from tick data — microstructure features, order imbalance, \
                (6) mid-price movement prediction — classification vs regression approaches, \
                (7) online learning and model adaptation for non-stationary crypto markets, \
                (8) ensemble methods combining technical, microstructure, and sentiment features. \
                Find papers on ML for HFT, LOB prediction, and crypto price forecasting \
                at ultra-short horizons (2018-2026). {ctx}"
            ),
            preamble: "You are a machine learning researcher specialising in financial time-series \
                prediction and high-frequency trading. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            ..Default::default()
        },

        // ══════════════════════════════════════════════════════════════════════
        // Tier 2 — Applied Strategies (5 tasks, depend on Tier 1)
        // ══════════════════════════════════════════════════════════════════════
        ResearchTask {
            id: 8,
            subject: "momentum-scalping-strategies".into(),
            description: format!(
                "Research momentum-based scalping strategies for crypto perpetual futures. Focus on: \
                (1) momentum ignition — detecting and trading institutional momentum bursts, \
                (2) breakout scalping — range compression detection, volume confirmation, false breakout filters, \
                (3) EMA ribbon strategies — 5/8/13/21 EMA systems for 1m/5m crypto, \
                (4) VWAP reclaim trades — price reclaiming VWAP as institutional signal, \
                (5) volume spike detection — abnormal volume as entry trigger, \
                (6) momentum continuation vs exhaustion — distinguishing sustained moves from spikes, \
                (7) news/event momentum — exploiting liquidation cascades and funding rate spikes. \
                Find papers on momentum trading at intraday frequencies, breakout strategies, \
                and crypto-specific momentum patterns (2018-2026). {ctx}"
            ),
            preamble: "You are a momentum trading researcher specialising in crypto scalping \
                strategies. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1, 4],
            ..Default::default()
        },
        ResearchTask {
            id: 9,
            subject: "mean-reversion-scalping".into(),
            description: format!(
                "Research mean-reversion scalping strategies for crypto perpetual futures. Focus on: \
                (1) range-bound scalping — identifying consolidation zones, support/resistance micro-levels, \
                (2) Bollinger Band bounces — bandwidth contraction/expansion, %B signals, \
                (3) RSI overbought/oversold — extreme readings on 1m/5m, divergence confirmation, \
                (4) statistical arbitrage at micro timeframes — pairs, z-score mean reversion, \
                (5) VWAP mean reversion — fade moves away from VWAP, standard deviation bands, \
                (6) Ornstein-Uhlenbeck process for crypto price reversion modeling, \
                (7) regime detection — distinguishing trending from mean-reverting conditions. \
                Find papers on mean reversion in crypto, intraday reversal strategies, \
                and statistical arbitrage (2018-2026). {ctx}"
            ),
            preamble: "You are a statistical arbitrage researcher specialising in mean-reversion \
                crypto strategies. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1, 4],
            ..Default::default()
        },
        ResearchTask {
            id: 10,
            subject: "orderbook-scalping-strategies".into(),
            description: format!(
                "Research order-book-driven scalping strategies. Focus on: \
                (1) spoofing detection — identifying and reacting to spoofed orders in crypto, \
                (2) iceberg order detection — hidden liquidity inference from trade flow, \
                (3) liquidity imbalance signals — bid/ask ratio, weighted mid-price, \
                (4) queue position optimization — passive vs aggressive fill strategies, \
                (5) order book pressure — large resting orders as support/resistance, \
                (6) market-making-style scalping — providing liquidity, capturing spread, \
                (7) toxic flow avoidance — detecting informed order flow before adverse selection. \
                Find papers on LOB-based trading strategies, market making, \
                and order book signals (2018-2026). {ctx}"
            ),
            preamble: "You are a quantitative market microstructure strategist. Produce structured \
                findings in Markdown on order-book-driven scalping."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2, 5],
            ..Default::default()
        },
        ResearchTask {
            id: 11,
            subject: "funding-rate-arbitrage".into(),
            description: format!(
                "Research funding rate arbitrage and scalping on Bybit. Focus on: \
                (1) funding rate scalping — entering positions before funding snapshots, \
                (2) basis trading — perpetual vs spot/futures calendar spread, \
                (3) cross-exchange funding arbitrage — exploiting funding rate differentials, \
                (4) delta-neutral strategies — hedged positions harvesting funding payments, \
                (5) funding rate prediction — LSTM/ARIMA models for funding rate forecasting, \
                (6) historical funding rate patterns on Bybit — seasonality, volatility correlation, \
                (7) carry trade dynamics in crypto — comparison with traditional FX carry. \
                Find papers on perpetual futures funding mechanisms, basis trading, \
                and crypto carry strategies (2020-2026). {ctx}"
            ),
            preamble: "You are a crypto derivatives researcher specialising in funding rate \
                mechanics and arbitrage. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3, 6],
            ..Default::default()
        },
        ResearchTask {
            id: 12,
            subject: "rl-agent-scalping".into(),
            description: format!(
                "Research reinforcement learning for automated scalping. Focus on: \
                (1) DQN — discrete action spaces for order placement (buy/sell/hold/size), \
                (2) PPO — continuous action spaces, position sizing as continuous control, \
                (3) SAC — entropy-regularized RL for exploration in volatile crypto markets, \
                (4) reward shaping — PnL-based, Sharpe-based, risk-adjusted reward functions, \
                (5) state representation — LOB features, technical indicators, portfolio state, \
                (6) sim-to-real transfer — training in simulation, deploying on live Bybit, \
                (7) multi-agent RL — competing/cooperating agents in order book environments, \
                (8) safe RL — constraining drawdown, position limits, leverage in the policy. \
                Find papers on RL for trading, order execution optimization, \
                and crypto-specific RL agents (2018-2026). {ctx}"
            ),
            preamble: "You are a reinforcement learning researcher specialising in automated \
                trading agents. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![7, 6],
            ..Default::default()
        },

        // ══════════════════════════════════════════════════════════════════════
        // Tier 3 — Synthesis & Production (3 tasks, depend on Tier 2)
        // ══════════════════════════════════════════════════════════════════════
        ResearchTask {
            id: 13,
            subject: "backtesting-execution".into(),
            description: format!(
                "Research backtesting and execution simulation for crypto scalping. Focus on: \
                (1) tick-level backtesting frameworks — Backtrader, Nautilus Trader, custom engines, \
                (2) slippage modeling — market impact, partial fills, queue position simulation, \
                (3) latency simulation — realistic order-to-fill delays for Bybit API, \
                (4) fee and funding modeling — accurate maker/taker fees, funding rate deductions, \
                (5) walk-forward optimization — avoiding overfitting in parameter selection, \
                (6) Monte Carlo simulation — robustness testing, confidence intervals on backtest PnL, \
                (7) look-ahead bias and survivorship bias in crypto backtesting, \
                (8) statistical validation — t-tests, bootstrap, multiple hypothesis testing correction. \
                Find papers on backtesting methodology, execution simulation, \
                and strategy validation for HFT/scalping (2018-2026). {ctx}"
            ),
            preamble: "You are a quantitative strategy validation researcher. Produce structured \
                findings in Markdown on backtesting and execution simulation."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![8, 9, 10],
            ..Default::default()
        },
        ResearchTask {
            id: 14,
            subject: "live-system-architecture".into(),
            description: format!(
                "Research production architecture for a live crypto scalping bot on Bybit. Focus on: \
                (1) Bybit API integration — REST for account/orders, WebSocket for L2 orderbook + trades, \
                (2) order management system — state machine for order lifecycle, retries, reconciliation, \
                (3) low-latency design — async I/O, connection pooling, message parsing optimization, \
                (4) failover and resilience — reconnection logic, stale data detection, kill switches, \
                (5) monitoring and alerting — PnL dashboards, latency metrics, anomaly detection, \
                (6) colocation and hosting — cloud regions near Bybit servers, VPS vs bare metal, \
                (7) data pipeline — real-time tick storage, feature computation, model serving, \
                (8) deployment — containerization, config management, A/B testing strategies. \
                Find papers and resources on trading system architecture, low-latency design, \
                and production ML systems for trading (2018-2026). {ctx}"
            ),
            preamble: "You are a trading systems architect specialising in production crypto \
                trading infrastructure. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3, 10, 12],
            ..Default::default()
        },
        ResearchTask {
            id: 15,
            subject: "edge-decay-market-regimes".into(),
            description: format!(
                "Research alpha decay and market regime adaptation for scalping strategies. Focus on: \
                (1) alpha decay — half-life of scalping edges, signal degradation over time, \
                (2) market regime detection — HMM, change-point detection, volatility regimes, \
                (3) trending vs ranging vs volatile regime classification for crypto, \
                (4) adaptive parameter tuning — online optimization, Bayesian optimization of strategy params, \
                (5) strategy rotation — switching between momentum/mean-reversion based on regime, \
                (6) capacity constraints — how much capital before a scalping edge is arbitraged away, \
                (7) crowding effects — detecting when too many participants exploit the same signal, \
                (8) meta-learning — learning to adapt strategies across changing market conditions. \
                Find papers on alpha decay, regime switching models, adaptive trading, \
                and strategy lifecycle management (2018-2026). {ctx}"
            ),
            preamble: "You are a quantitative finance researcher specialising in strategy \
                lifecycle and market regime analysis. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![8, 9, 11],
            ..Default::default()
        },
    ]
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let api_key =
        std::env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| DEFAULT_BASE_URL.to_string());
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();

    std::fs::create_dir_all(OUT_DIR)
        .with_context(|| format!("creating output dir {OUT_DIR}"))?;

    let tasks = research_tasks();
    let team_size = 4;
    eprintln!(
        "Launching Bybit scalping research team: {team_size} workers, {} tasks\n",
        tasks.len()
    );

    let lead = TeamLead::new(TeamConfig {
        team_size,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        code_root: None,
        synthesis_preamble: Some(
            "You are a world-class quantitative trading research director producing the \
            definitive report on scalping strategies for Bybit cryptocurrency perpetual \
            futures. Synthesise all findings into a coherent, actionable research report."
                .into(),
        ),
        synthesis_prompt_template: Some(
            "You have received {count} research reports from specialist agents covering \
            all aspects of scalping on Bybit. Synthesise them into a single comprehensive \
            report with the following sections:\n\n\
            # Bybit Scalping Strategies — Deep Research Synthesis\n\n\
            ## Executive Summary\n\
            High-level overview of scalping on Bybit, key findings, and strategic implications.\n\n\
            ## Market Microstructure Insights\n\
            Order book dynamics, liquidity, and execution considerations specific to Bybit.\n\n\
            ## Strategy Taxonomy\n\
            Classification of viable scalping approaches — momentum, mean-reversion, order-flow, \
            funding rate, and ML/RL-driven strategies.\n\n\
            ## Technical Implementation\n\
            Indicators, entry/exit rules, and parameter ranges for each strategy class.\n\n\
            ## Risk Management Framework\n\
            Position sizing, stop-loss methodology, drawdown limits, and leverage guidelines.\n\n\
            ## ML/RL Models for Scalping\n\
            Most promising ML architectures, feature engineering, and RL approaches.\n\n\
            ## Backtesting & Validation\n\
            Methodology for realistic strategy validation with crypto-specific pitfalls.\n\n\
            ## Production System Architecture\n\
            End-to-end system design for a live scalping bot on Bybit.\n\n\
            ## Alpha Decay & Adaptation\n\
            Strategy lifecycle, regime detection, and adaptive parameter tuning.\n\n\
            ## Top Papers & Resources\n\
            The most important papers across all research areas with citations.\n\n\
            ## Actionable Recommendations\n\
            Prioritized next steps for building a Bybit scalping system.\n\n\
            ---\n\n\
            Individual agent reports:\n\n{combined}"
                .into(),
        ),
        tool_config: Some(SearchToolConfig {
            default_limit: 10,
            abstract_max_chars: 500,
            max_authors: 5,
            include_fields_of_study: true,
            include_venue: true,
            search_description: None,
            detail_description: None,
        }),
        scholar_concurrency: Some(1),
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(OUT_DIR.into()),
        synthesis_provider: None,
        ranker: None,
        timeout_check_interval: None,
        progress_report_interval: None,
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:03}-{subject}.md");
        std::fs::write(&path, content)
            .with_context(|| format!("writing {path}"))?;
        eprintln!("  wrote {path} ({} bytes)", content.len());
    }

    let synthesis_path = format!("{OUT_DIR}/synthesis.md");
    std::fs::write(&synthesis_path, &result.synthesis)
        .with_context(|| format!("writing {synthesis_path}"))?;
    eprintln!("  wrote {synthesis_path} ({} bytes)", result.synthesis.len());

    let mut combined = String::from(
        "# Bybit Scalping Strategies — Complete Research Report\n\n",
    );
    for (id, subject, content) in &result.findings {
        combined.push_str(&format!(
            "## Agent {id}: {subject}\n\n{content}\n\n---\n\n"
        ));
    }
    combined.push_str("## Grand Synthesis\n\n");
    combined.push_str(&result.synthesis);

    let combined_path =
        format!("{OUT_DIR}/bybit-scalping-research-complete.md");
    std::fs::write(&combined_path, &combined)
        .with_context(|| format!("writing {combined_path}"))?;
    eprintln!("  wrote {combined_path} ({} bytes)", combined.len());

    eprintln!("\nDone — {} agent reports + synthesis + combined.", result.findings.len());
    Ok(())
}
