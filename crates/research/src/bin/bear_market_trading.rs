use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskStatus, TeamConfig, TeamLead};
use research::tools::SearchToolConfig;

const OUT_DIR: &str = "research-output/bear-market-trading";

fn research_tasks() -> Vec<ResearchTask> {
    let ctx = "This research supports an automated crypto perpetual futures trading system on Bybit \
        that currently STOPS trading in bear markets (60d return < -15%). All 4 tracked coins \
        (BTC -22%, SOL -36%, XRP -32%, DOGE -30%) are in bear regime. The system needs strategies \
        that PROFIT in bear markets, not just survive. Current stack: Rust, EMA crossover + RSI + \
        Bollinger + funding arb strategies, HMM regime classifier, $9.35 account, 5x leverage, \
        signal-only mode. Round-trip fee: 0.11% (Bybit VIP0 taker).";

    vec![
        // Tier 1 — Bear market strategy research (no deps)
        ResearchTask {
            id: 1,
            subject: "bear-market-crypto-strategies".into(),
            description: format!(
                "Research profitable trading strategies specifically for crypto BEAR markets \
                (sustained -20% to -50% drawdowns over 60+ days). Focus on: \
                (1) short-biased momentum — riding downtrends with trailing stops, \
                (2) mean reversion in bear markets — oversold bounces with tight stops, \
                (3) volatility expansion strategies — VIX-equivalent for crypto, \
                (4) funding rate harvesting during bear (perpetual funding often negative = shorts pay longs), \
                (5) bear market rally trading — identifying dead cat bounces for short re-entry, \
                (6) relative value / pairs in bear — long strongest, short weakest, \
                (7) academic evidence on bear market return predictability. \
                Find papers on bear market trading, short selling profitability, \
                and crypto-specific bear strategies (2018-2026). {ctx}"
            ),
            preamble: "You are a quantitative trading researcher who specializes in bear market \
                strategies for cryptocurrency derivatives. Produce structured, actionable findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            ..Default::default()
        },
        ResearchTask {
            id: 2,
            subject: "regime-adaptive-trading".into(),
            description: format!(
                "Research regime-adaptive trading systems that dynamically switch strategies \
                based on market conditions. Focus on: \
                (1) Hidden Markov Models for regime detection — Bull/Bear/Choppy/HighVol states, \
                (2) strategy rotation frameworks — which strategy type works in which regime, \
                (3) parameter adaptation — how to adjust EMA periods, RSI thresholds, stop distances \
                    for bear vs bull, \
                (4) signal filtering vs signal inversion — should a bear filter block entries or \
                    FLIP entries to short-biased?, \
                (5) regime transition detection — leading indicators of regime change, \
                (6) ensemble methods — running multiple regime-specific strategies simultaneously, \
                (7) evidence from crypto markets 2022-2026 bear cycles. \
                Find papers on regime switching models, adaptive strategies, \
                and multi-regime portfolio management (2018-2026). {ctx}"
            ),
            preamble: "You are a financial econometrics researcher specializing in regime switching \
                models and adaptive trading systems. Produce structured findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            ..Default::default()
        },
        ResearchTask {
            id: 3,
            subject: "short-selling-crypto-mechanics".into(),
            description: format!(
                "Research the mechanics and profitability of short selling on crypto perpetual futures. \
                Focus on: \
                (1) perpetual futures short mechanics — margin, liquidation, funding costs/income, \
                (2) optimal short entry signals in downtrends — breakdown, retest, continuation patterns, \
                (3) short squeeze risk management — position sizing to survive 10-20% bear rallies, \
                (4) funding rate dynamics during bear — when shorts pay vs receive funding, \
                (5) optimal leverage for shorting — academic evidence on leverage drag in bearish conditions, \
                (6) trailing stop techniques for shorts — ATR-based, swing high, time-decay stops, \
                (7) historical profitability of systematic shorting in crypto bear markets 2018-2025. \
                Find papers on short selling profitability, bear market trading, \
                and crypto perpetual futures (2018-2026). {ctx}"
            ),
            preamble: "You are a derivatives trading researcher specializing in short selling \
                mechanics and bear market profitability. Produce structured findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            ..Default::default()
        },
        ResearchTask {
            id: 4,
            subject: "micro-account-bear-strategies".into(),
            description: format!(
                "Research practical strategies for trading a MICRO account ($5-$50) in a crypto bear \
                market on Bybit perpetuals. Focus on: \
                (1) minimum viable position sizing — Bybit $5 min notional, 5x leverage = $1 margin, \
                (2) fee budget optimization — 0.11% RT fee means TP must be >0.5% for positive EV, \
                (3) swing trading (1h-4h) vs scalping (1m-15m) for micro accounts in bear, \
                (4) optimal number of concurrent positions with $10 capital, \
                (5) compounding strategies — Kelly fraction for micro account growth, \
                (6) risk of ruin calculations for $10 accounts with 5x leverage, \
                (7) coin selection in bear — which coins have most tradeable volatility. \
                Provide CONCRETE parameter recommendations: hold period, TP%, SL%, leverage, \
                position size as fraction of equity. {ctx}"
            ),
            preamble: "You are a practical crypto trader who has experience growing micro accounts \
                ($10-$100) using leveraged perpetual futures in bear markets. Give concrete, \
                actionable recommendations with specific numbers."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            ..Default::default()
        },

        // Tier 2 — Synthesis (depends on all Tier 1)
        ResearchTask {
            id: 5,
            subject: "bear-trading-implementation-plan".into(),
            description: format!(
                "Synthesize findings from tasks 1-4 into a concrete implementation plan for an \
                automated Rust trading system. The system currently has: \
                - EMA crossover (momentum) strategy \
                - RSI mean reversion strategy \
                - Bollinger band strategy \
                - Funding rate arbitrage strategy \
                - HMM 4-state regime classifier (Bear/Stable/Bull/HighVol) \
                - Walk-forward backtester with OOS Sharpe gate \
                - $9.35 capital, 5x leverage, Bybit mainnet \
                - Signal-only mode (no real orders yet) \
                \n\nProvide: \
                (1) Which existing strategies to ENABLE in bear regime (with modified params), \
                (2) What NEW bear-specific strategy to add (if any), \
                (3) Exact parameter changes: EMA periods, RSI thresholds, TP/SL percentages, \
                    hold periods, position sizing, \
                (4) How to modify the regime filter — should it block entries, flip bias, or adjust sizing?, \
                (5) Risk limits for bear trading — max position, daily loss, drawdown, \
                (6) Expected Sharpe ratio range for realistic bear strategies, \
                (7) Priority-ordered action items for implementation. {ctx}"
            ),
            preamble: "You are a senior quant PM designing a bear market trading system. \
                Be specific with parameter values. No hand-waving."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1, 2, 3, 4],
            ..Default::default()
        },
    ]
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    // Load env from agentic-trader's .env
    dotenvy::from_path("/Users/vadimnicolai/Public/agentic-trader/.env").ok();
    dotenvy::dotenv().ok();

    // Use QWEN_API_KEY as DASHSCOPE key (same DashScope endpoint)
    let api_key = std::env::var("QWEN_API_KEY")
        .or_else(|_| std::env::var("DASHSCOPE_API_KEY"))
        .context("QWEN_API_KEY or DASHSCOPE_API_KEY must be set")?;
    let model = std::env::var("QWEN_MODEL").unwrap_or_else(|_| "qwen-plus".into());
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();

    std::fs::create_dir_all(OUT_DIR)
        .with_context(|| format!("creating output dir {OUT_DIR}"))?;

    let tasks = research_tasks();
    let team_size = 3;
    eprintln!(
        "Launching bear market trading research: {team_size} workers, {} tasks\n",
        tasks.len()
    );

    let lead = TeamLead::new(TeamConfig {
        team_size,
        provider: LlmProvider::Qwen { api_key, model },
        scholar_key,
        code_root: None,
        synthesis_preamble: Some(
            "You are a senior quantitative portfolio manager producing the definitive \
            action plan for trading crypto perpetual futures profitably during bear markets. \
            Synthesise all research into concrete, implementable recommendations."
                .into(),
        ),
        synthesis_prompt_template: Some(
            "You have received {count} research reports on bear market crypto trading. \
            Synthesise them into a single actionable plan:\n\n\
            # Bear Market Trading Plan — Implementation Guide\n\n\
            ## Executive Summary\n\
            Key findings and the core bear market trading thesis.\n\n\
            ## Strategy Selection for Bear Regime\n\
            Which strategies to run, with exact parameters.\n\n\
            ## Regime Filter Modifications\n\
            How to change the HMM regime filter to allow bear trading.\n\n\
            ## Risk Management in Bear Markets\n\
            Position sizing, stops, daily loss limits for $10 account.\n\n\
            ## Parameter Recommendations\n\
            Concrete numbers: EMA periods, RSI levels, TP/SL %, hold periods.\n\n\
            ## Implementation Priority\n\
            Ordered action items for the Rust trading system.\n\n\
            ---\n\n\
            Individual research reports:\n\n{combined}"
                .into(),
        ),
        tool_config: Some(SearchToolConfig {
            default_limit: 8,
            abstract_max_chars: 400,
            max_authors: 4,
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
    eprintln!("\n=== SYNTHESIS ===\n");
    eprintln!("{}", &result.synthesis);

    eprintln!("\nDone — {} reports + synthesis.", result.findings.len());
    Ok(())
}
