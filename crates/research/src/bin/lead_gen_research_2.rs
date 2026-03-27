/// Lead-gen research prompt 2 — RL Crawler
/// DQN URL selection, MAB domain scheduling, LLM world models, reward shaping
use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskPriority, TeamConfig, TeamLead};
use std::time::Duration;

const OUT_DIR: &str = "../../apps/lead-gen/docs/research-output/02-crawler";

fn tasks() -> Vec<ResearchTask> {
    vec![
        ResearchTask {
            id: 1,
            subject: "dqn-url-selection-advances".into(),
            preamble: "You are an RL researcher specialising in deep Q-networks for information \
                       retrieval. Search for papers from 2024–2026 that improve on vanilla DQN \
                       for URL/link selection in focused web crawling. Focus on: state representation \
                       improvements, double DQN vs dueling DQN vs distributional RL, and \
                       LLM-augmented state encoders. Current baseline: 448-dim state, 15% harvest rate."
                .into(),
            description: "Search for: 'deep Q-network focused web crawling 2024', \
                          'dueling DQN distributional RL web navigation', \
                          'LLM state encoder reinforcement learning URL selection', \
                          'Rainbow DQN information retrieval focused crawler'. \
                          Find papers benchmarking against DQN baselines on focused crawling tasks. \
                          Extract: state dimensionality, network architecture, harvest rate improvement, \
                          training data requirements, and inference latency per URL decision."
                .into(),
            priority: TaskPriority::Critical,
            timeout: Some(Duration::from_secs(2400)),
            max_retries: 1,
            ..Default::default()
        },
        ResearchTask {
            id: 2,
            subject: "bandit-domain-scheduling".into(),
            preamble: "You are a bandit algorithms researcher. Search for papers from 2024–2026 \
                       on non-stationary multi-armed bandits for domain scheduling in web crawlers. \
                       Focus on: temporal drift handling, latent autoregressive state models, \
                       sliding-window UCB, and multi-constraint bandits with politeness/budget constraints. \
                       Current baseline: UCB1 with formula ucb = reward_sum/pages + sqrt(2*ln(total)/pages)."
                .into(),
            description: "Search for: 'LARL latent autoregressive bandit temporal drift RLC 2025', \
                          'M2-CMAB multi-constraint bandit Lagrangian web', \
                          'sliding window UCB non-stationary domain yield', \
                          'contextual bandit domain scheduling web crawler 2024'. \
                          Compare against UCB1 baseline. Extract: regret bounds, adaptation speed to drift, \
                          constraint satisfaction rate, and computational overhead vs UCB1."
                .into(),
            priority: TaskPriority::Critical,
            timeout: Some(Duration::from_secs(2400)),
            max_retries: 1,
            ..Default::default()
        },
        ResearchTask {
            id: 3,
            subject: "llm-world-model-crawling".into(),
            preamble: "You are an AI researcher specialising in LLM-based web agents. Search for \
                       papers from 2024–2026 that use LLMs as world models or reward models for \
                       web navigation and focused crawling. Focus on: WebDreamer, OpAgent, WebRL, \
                       self-evolving curricula, and hybrid symbolic+neural web agents. \
                       Assess feasibility for local-first pipeline (no cloud LLM required)."
                .into(),
            description: "Search for: 'WebRL self-evolving curriculum reinforcement learning ICLR 2025', \
                          'WebDreamer LLM world model web navigation TMLR 2025', \
                          'OpAgent hybrid reward WebJudge web agent arXiv 2026', \
                          'LLM web agent focused crawling quality 2025'. \
                          Extract: success rate on WebArena/Mind2Web, LLM size required, \
                          inference cost per page, and whether a local 3B–14B model suffices."
                .into(),
            priority: TaskPriority::Normal,
            timeout: Some(Duration::from_secs(2400)),
            ..Default::default()
        },
        ResearchTask {
            id: 4,
            subject: "reward-shaping-curriculum".into(),
            preamble: "You are an RL researcher specialising in sparse reward problems and curriculum \
                       learning. Search for papers from 2024–2026 on semi-supervised reward shaping, \
                       goal-conditioned curriculum generation, and adaptive experience replay for \
                       web crawlers with rare positive rewards. Current PER: alpha=0.6, beta 0.4→1.0."
                .into(),
            description: "Search for: 'DISCOVER auto-curriculum goal selection NeurIPS 2025', \
                          'semi-supervised reward shaping sparse reward web crawling arXiv 2026', \
                          'ARB adaptive replay buffer on-policy alignment arXiv 2025', \
                          'Craw4LLM content quality pre-filter URL ACL 2025', \
                          'QMin quality propagation minimum inlinking SIGIR 2025'. \
                          Find papers proposing better PER sampling or pseudo-reward generation. \
                          Extract: improvement over PER baseline, implementation complexity, \
                          sample efficiency gain, and whether it requires LLM calls."
                .into(),
            priority: TaskPriority::Normal,
            dependencies: vec![1],
            timeout: Some(Duration::from_secs(2400)),
            ..Default::default()
        },
    ]
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let api_key = std::env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| "https://api.deepseek.com".into());
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();

    std::fs::create_dir_all(OUT_DIR).with_context(|| format!("creating {OUT_DIR}"))?;

    let tasks = tasks();
    eprintln!("[prompt-2] Launching: 4 workers, {} tasks", tasks.len());

    let lead = TeamLead::new(TeamConfig {
        team_size: 4,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(OUT_DIR.into()),
        scholar_concurrency: Some(3),
        synthesis_preamble: Some(
            "You are an RL researcher specialising in web information retrieval. \
             Synthesise findings on DQN-based URL selection and bandit-based domain scheduling. \
             Compare against the current DQN+UCB1+PER baseline (15% harvest rate, 448-dim state). \
             Identify improvements that can be adopted incrementally vs require architecture changes. \
             Rank by: expected harvest rate improvement ÷ implementation days."
                .into(),
        ),
        ..Default::default()
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content).with_context(|| format!("writing {path}"))?;
        eprintln!("[prompt-2] wrote {path} ({} bytes)", content.len());
    }
    std::fs::write(format!("{OUT_DIR}/synthesis.md"), &result.synthesis)?;
    eprintln!("[prompt-2] Done.");
    Ok(())
}
