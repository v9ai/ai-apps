//! Qwen-powered investigation of the agentic-trader system.
//!
//! Reads live system state from `_memory/autonomous-team/`, constructs focused
//! prompts for 4 parallel investigation domains, then synthesizes findings.
//!
//! Usage:
//!   cargo run --release --bin qwen-investigate
//!   cargo run --release --bin qwen-investigate -- --output-dir /custom/path

use std::path::Path;

use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskStatus, TeamConfig, TeamLead};
use research::tools::SearchToolConfig;

const TRADER_ROOT: &str = "/Users/vadimnicolai/Public/agentic-trader";
const DEFAULT_OUT: &str = "/Users/vadimnicolai/Public/agentic-trader/_memory/autonomous-team/investigations";

fn read_file(relative: &str) -> String {
    let path = format!("{TRADER_ROOT}/{relative}");
    std::fs::read_to_string(&path).unwrap_or_else(|e| format!("[could not read {path}: {e}]"))
}

/// Truncate to roughly `max_chars` on a char boundary.
fn truncate(s: &str, max_chars: usize) -> &str {
    if s.len() <= max_chars {
        return s;
    }
    let mut end = max_chars;
    while !s.is_char_boundary(end) && end > 0 {
        end -= 1;
    }
    &s[..end]
}

fn investigation_tasks() -> Vec<ResearchTask> {
    // ── Load live system state ──────────────────────────────────────────────
    let regime = read_file("_memory/autonomous-team/learning/current-regime.md");
    let profit = read_file("_memory/autonomous-team/profit-tracking/latest.json");
    let insights = read_file("_memory/autonomous-team/research-insights/latest-insights.md");
    let backtest_cfg = read_file("auto_backtest.json");
    let opt_history = read_file("_memory/autonomous-team/optimization-history.json");
    let env_file = read_file(".env");

    // Redact secrets from .env before sending to Qwen
    let env_redacted: String = env_file
        .lines()
        .map(|line| {
            if line.contains("API_KEY") || line.contains("SECRET") || line.contains("PASSWORD") {
                let key = line.split('=').next().unwrap_or(line);
                format!("{key}=<REDACTED>")
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\n");

    // Load last 5 cycle reports
    let mut cycle_reports = String::new();
    for i in (173..=177).rev() {
        let content = read_file(&format!(
            "_memory/autonomous-team/cycle-reports/cycle-{i}.json"
        ));
        cycle_reports.push_str(&format!("### Cycle {i}\n```json\n{}\n```\n\n", truncate(&content, 4000)));
    }

    // Load last 5 reflections
    let mut reflections = String::new();
    for i in (173..=177).rev() {
        let content = read_file(&format!(
            "_memory/autonomous-team/reflections/cycle-{i}.json"
        ));
        reflections.push_str(&format!(
            "### Cycle {i} Reflection\n```json\n{}\n```\n\n",
            truncate(&content, 3000)
        ));
    }

    let codegen_history = read_file("_memory/autonomous-team/codegen-history.json");
    let auto_apply = read_file("_memory/autonomous-team/auto-apply-history.json");

    let system_context = format!(
        "SYSTEM CONTEXT: Automated crypto perpetual futures trading system on Bybit mainnet. \
         Rust codebase. $9.35 account, signal-only mode (SIGNAL_ONLY=true — no real orders placed). \
         177 cycles completed, 0 promotions, stuck in BEAR_CHOPPY regime. \
         Round-trip fee: 0.11% (Bybit VIP0 taker). \
         OOS Sharpe gate: >= 3.0, IS/OOS gap <= 3.0."
    );

    vec![
        // ── t1: BTC Investigation (no deps) ────────────────────────────────
        ResearchTask {
            id: 1,
            subject: "btcusdt-zero-winrate".into(),
            description: format!(
                "{system_context}\n\n\
                 INVESTIGATION DOMAIN: BTCUSDT shows 0% win rate across 177 cycles while \
                 SOL shows 44% and BTC (spot symbol) shows 40%. Diagnose the root cause.\n\n\
                 DATA — Current Regime:\n{regime}\n\n\
                 DATA — Optimization History (BTC entries):\n```json\n{opt_history_truncated}\n```\n\n\
                 DATA — Recent Cycle Reports:\n{cycle_reports}\n\n\
                 QUESTIONS:\n\
                 1. Why does BTCUSDT (perpetual) show 0% win rate when BTC (spot) shows 40%?\n\
                 2. Is this a symbol mapping bug (BTCUSDT vs BTC in the strategy/backtest code)?\n\
                 3. Are the backtested parameters suitable for BTC perpetual vs spot dynamics?\n\
                 4. Could funding rate costs explain the gap?\n\
                 5. What specific code or config change would fix this?",
                opt_history_truncated = truncate(&opt_history, 8000),
            ),
            preamble: format!(
                "You are a trading system diagnostician. A crypto perpetual futures system \
                 shows BTCUSDT at 0% win rate across 177 autonomous cycles while SOL/XRP \
                 show 40-44%. Diagnose the root cause with specific evidence from the data provided. \
                 Be concrete — point to specific parameters, code paths, or config values."
            ),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        // ── t2: Regime Investigation (no deps) ─────────────────────────────
        ResearchTask {
            id: 2,
            subject: "regime-classification-analysis".into(),
            description: format!(
                "{system_context}\n\n\
                 INVESTIGATION DOMAIN: System has been in BEAR_CHOPPY regime for 177 cycles \
                 with 0 strategy promotions. Is the regime classification correct? Are the \
                 research/promotion gates too tight? Is strategy selection appropriate?\n\n\
                 DATA — Current Regime:\n{regime}\n\n\
                 DATA — Reflections (last 5 cycles):\n{reflections}\n\n\
                 DATA — Backtest Config:\n```json\n{backtest_truncated}\n```\n\n\
                 DATA — Recent Cycle Reports:\n{cycle_reports}\n\n\
                 QUESTIONS:\n\
                 1. Is BEAR_CHOPPY at 100% confidence correct for current BTC/SOL/XRP markets (March 2026)?\n\
                 2. Is OOS Sharpe >= 3.0 realistic for ANY strategy in a bear/choppy market?\n\
                 3. Should the system lower the gate or switch to bear-specific strategies?\n\
                 4. Are the strategy_types_by_regime mappings sensible?\n\
                 5. What regime-adaptive changes would produce the first promotion?",
                backtest_truncated = truncate(&backtest_cfg, 6000),
            ),
            preamble: "You are a quantitative analyst specializing in market regime classification \
                 and strategy selection. Analyze whether a trading system's regime detection and \
                 promotion gates are calibrated correctly. Provide specific numeric recommendations."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        // ── t3: Execution/Config Investigation (no deps) ───────────────────
        ResearchTask {
            id: 3,
            subject: "execution-config-audit".into(),
            description: format!(
                "{system_context}\n\n\
                 INVESTIGATION DOMAIN: The system is in SIGNAL_ONLY=true mode with $9.35 frozen \
                 balance. Even if strategies pass the gate, can the system actually trade? \
                 Are risk limits configured to allow trades?\n\n\
                 DATA — Environment Config:\n```\n{env_redacted}\n```\n\n\
                 DATA — Profit Tracking:\n```json\n{profit}\n```\n\n\
                 DATA — Current Regime:\n{regime}\n\n\
                 QUESTIONS:\n\
                 1. With SIGNAL_ONLY=true, are signals being generated but not executed?\n\
                 2. Are the risk limits (MAX_POSITION_USDC, MAX_DAILY_LOSS_USDC, etc.) compatible with $9.35 balance?\n\
                 3. Is the regime filter blocking ALL entry signals? (total_signals: 0)\n\
                 4. What's the path from signal-only to live trading?\n\
                 5. What specific .env changes would enable cautious live trading?\n\
                 6. Is the cooldown/hourly signal cap too restrictive?"
            ),
            preamble: "You are an operations engineer auditing a trading system's configuration. \
                 Determine whether the system can trade, what's blocking it, and what specific \
                 config changes would enable cautious live trading with a $9.35 account."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        // ── t4: Strategy/Research Investigation (no deps) ──────────────────
        ResearchTask {
            id: 4,
            subject: "strategy-research-effectiveness".into(),
            description: format!(
                "{system_context}\n\n\
                 INVESTIGATION DOMAIN: The system runs 8 researchers per cycle producing insights, \
                 but 177 cycles have produced 0 promotions. Why aren't research insights translating \
                 to profitable strategies?\n\n\
                 DATA — Latest Research Insights:\n{insights_truncated}\n\n\
                 DATA — Codegen History:\n```json\n{codegen_truncated}\n```\n\n\
                 DATA — Auto-Apply History:\n```json\n{auto_apply_truncated}\n```\n\n\
                 DATA — Backtest Config:\n```json\n{backtest_truncated}\n```\n\n\
                 QUESTIONS:\n\
                 1. Are research insights being applied to the optimizer grid?\n\
                 2. Is the grid search space too narrow or too wide?\n\
                 3. Is 90 days of data sufficient for BEAR_CHOPPY backtesting?\n\
                 4. Are the strategy types (bollinger, supertrend, grid, mean_rev_ou) appropriate for BEAR_CHOPPY?\n\
                 5. Should the system switch to shorter timeframes or longer hold periods?\n\
                 6. Is the fee model (0.055% + 30bps slippage) too pessimistic or realistic?\n\
                 7. What specific strategy type + parameters would realistically pass OOS Sharpe >= 3.0?",
                insights_truncated = truncate(&insights, 8000),
                codegen_truncated = truncate(&codegen_history, 4000),
                auto_apply_truncated = truncate(&auto_apply, 4000),
                backtest_truncated = truncate(&backtest_cfg, 4000),
            ),
            preamble: "You are a bear-market quant specialist. Analyze why an automated research + \
                 optimization loop has failed to produce any profitable strategy in 177 cycles of \
                 BEAR_CHOPPY market conditions. Provide specific, actionable strategy recommendations \
                 with exact parameter values."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        // ── t5: Synthesis (depends on t1-t4) ───────────────────────────────
        ResearchTask {
            id: 5,
            subject: "investigation-synthesis".into(),
            description: format!(
                "{system_context}\n\n\
                 SYNTHESIS TASK: You have received 4 investigation reports covering:\n\
                 1. BTCUSDT zero win rate diagnosis\n\
                 2. Regime classification and gate calibration\n\
                 3. Execution configuration audit\n\
                 4. Strategy research effectiveness\n\n\
                 Produce a unified report with:\n\
                 1. RANKED ROOT CAUSES — ordered by impact, with evidence\n\
                 2. DEPENDENCY GRAPH — which fixes must happen before others\n\
                 3. PRIORITIZED ACTION PLAN — specific file paths and parameter changes\n\
                 4. RISK ASSESSMENT — what could go wrong with each fix\n\
                 5. RECOMMENDATION — continue/pause/restructure the autonomous loop"
            ),
            preamble: "You are a chief architect reviewing 4 investigation reports about a failing \
                 automated trading system. Synthesize into a single actionable plan. Be specific \
                 about file paths, parameter values, and implementation order. No hand-waving."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1, 2, 3, 4],
            result: None,
        },
    ]
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    // Load env from agentic-trader
    dotenvy::from_path(format!("{TRADER_ROOT}/.env")).ok();
    dotenvy::dotenv().ok();

    let output_dir = std::env::args()
        .nth(1)
        .filter(|a| a == "--output-dir")
        .and_then(|_| std::env::args().nth(2))
        .unwrap_or_else(|| DEFAULT_OUT.into());

    let api_key = std::env::var("QWEN_API_KEY")
        .or_else(|_| std::env::var("DASHSCOPE_API_KEY"))
        .context("QWEN_API_KEY or DASHSCOPE_API_KEY must be set")?;
    let model = std::env::var("QWEN_MODEL").unwrap_or_else(|_| "qwen-plus".into());
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();

    std::fs::create_dir_all(&output_dir)
        .with_context(|| format!("creating output dir {output_dir}"))?;

    let tasks = investigation_tasks();
    let team_size = 3; // 4 parallel tasks, 3 workers is enough (t5 waits)

    eprintln!(
        "=== Qwen Investigation Team ===\n\
         Model: {model}\n\
         Workers: {team_size}\n\
         Tasks: {}\n\
         Output: {output_dir}\n",
        tasks.len()
    );

    let today = chrono_date();

    let lead = TeamLead::new(TeamConfig {
        team_size,
        provider: LlmProvider::Qwen {
            api_key,
            model: model.clone(),
        },
        scholar_key,
        code_root: Some(Path::new(TRADER_ROOT).into()),
        synthesis_preamble: Some(
            "You are a chief architect producing the definitive diagnosis and action plan \
             for a failing automated crypto trading system. Synthesize investigation reports \
             into concrete, prioritized, implementable fixes."
                .into(),
        ),
        synthesis_prompt_template: Some(
            "# System Investigation Synthesis — {date}\n\n\
             You have received {count} investigation reports about why an automated crypto \
             trading system has been stuck at $9.35 with 0 promotions across 177 cycles.\n\n\
             Produce:\n\n\
             ## 1. Ranked Root Causes\n\
             Ordered by impact. Each with evidence from the reports.\n\n\
             ## 2. Dependency Graph\n\
             Which fixes must happen before others.\n\n\
             ## 3. Prioritized Action Plan\n\
             Specific changes with file paths and exact parameter values.\n\n\
             ## 4. Risk Assessment\n\
             What could go wrong with each proposed fix.\n\n\
             ## 5. Recommendation\n\
             Continue / Pause / Restructure the autonomous loop.\n\n\
             ---\n\n\
             Investigation Reports:\n\n{combined}"
                .replace("{date}", &today),
        ),
        tool_config: Some(SearchToolConfig {
            default_limit: 5,
            abstract_max_chars: 300,
            max_authors: 3,
            include_fields_of_study: false,
            include_venue: true,
            search_description: None,
            detail_description: None,
        }),
        scholar_concurrency: Some(1),
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(output_dir.clone()),
        synthesis_provider: None,
    });

    let result = lead.run(tasks).await?;

    // Write individual reports
    for (_id, subject, content) in &result.findings {
        let path = format!("{output_dir}/qwen-{subject}-{today}.md");
        std::fs::write(&path, content)
            .with_context(|| format!("writing {path}"))?;
        eprintln!("  wrote {path} ({} bytes)", content.len());
    }

    // Write merged synthesis
    let synthesis_path = format!("{output_dir}/qwen-investigation-merged-{today}.md");
    std::fs::write(&synthesis_path, &result.synthesis)
        .with_context(|| format!("writing {synthesis_path}"))?;

    eprintln!("\n=== SYNTHESIS ===\n");
    eprintln!("{}", &result.synthesis[..result.synthesis.len().min(2000)]);
    eprintln!(
        "\n\nFull report: {synthesis_path}\n{} investigation reports + synthesis written.",
        result.findings.len()
    );

    Ok(())
}

fn chrono_date() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Simple date: YYYYMMDD
    let days = now / 86400;
    let year = 1970 + (days / 365); // approximate, good enough for file naming
    let day_of_year = days % 365;
    let month = day_of_year / 30 + 1;
    let day = day_of_year % 30 + 1;
    format!("{year}{month:02}{day:02}")
}
