use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskPriority, TeamConfig, TeamLead};

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";
const OUT_DIR: &str = "research-output/last-week-authors";

fn author_preamble() -> String {
    "You are a bibliometrics researcher specialising in tracking who is publishing \
     cutting-edge AI research. For every paper you find, extract and highlight: \
     (1) full author names, (2) institutional affiliations when available, \
     (3) whether they are first/last/corresponding author, \
     (4) notable collaboration patterns (cross-institution, industry-academia). \
     Format your findings in Markdown with author names in **bold**. \
     Focus on papers from the last 7 days (March 19-26, 2026)."
        .into()
}

fn research_tasks() -> Vec<ResearchTask> {
    let week = "last 7 days (March 19-26, 2026)";

    vec![
        ResearchTask {
            id: 1,
            subject: "llm-authors".into(),
            description: format!(
                "Search for papers published in the {week} on large language models (LLMs), \
                 including GPT, Claude, Gemini, Llama, DeepSeek, Qwen variants. \
                 For each paper found, list ALL author names and their affiliations. \
                 Identify the most prolific authors (appearing on 2+ papers) and \
                 which labs/companies they belong to. Note any new first-time LLM authors."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Critical,
            ..Default::default()
        },
        ResearchTask {
            id: 2,
            subject: "vision-diffusion-authors".into(),
            description: format!(
                "Search for papers published in the {week} on computer vision, \
                 image generation, diffusion models, and video generation. \
                 Extract ALL author names and affiliations. \
                 Identify key research groups (Stability AI, Midjourney, Google DeepMind vision team, \
                 Meta FAIR vision). Flag any cross-lab collaborations."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Normal,
            ..Default::default()
        },
        ResearchTask {
            id: 3,
            subject: "rl-robotics-authors".into(),
            description: format!(
                "Search for papers published in the {week} on reinforcement learning, \
                 robot learning, embodied AI, and sim-to-real transfer. \
                 Extract ALL author names and affiliations. \
                 Identify which robotics labs are most active this week \
                 (Berkeley, CMU, Stanford, MIT, Google DeepMind, Toyota Research, etc.)."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Normal,
            ..Default::default()
        },
        ResearchTask {
            id: 4,
            subject: "multimodal-authors".into(),
            description: format!(
                "Search for papers published in the {week} on multimodal AI, \
                 vision-language models, audio-language models, and multi-modal reasoning. \
                 Extract ALL author names and affiliations. \
                 Track which teams are leading multimodal research this week."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Normal,
            ..Default::default()
        },
        ResearchTask {
            id: 5,
            subject: "ai-agents-authors".into(),
            description: format!(
                "Search for papers published in the {week} on AI agents, \
                 tool-use, function calling, agentic workflows, and autonomous systems. \
                 Extract ALL author names and affiliations. \
                 Identify emerging researchers in the agentic AI space."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Critical,
            ..Default::default()
        },
        ResearchTask {
            id: 6,
            subject: "safety-alignment-authors".into(),
            description: format!(
                "Search for papers published in the {week} on AI safety, alignment, \
                 RLHF, constitutional AI, red-teaming, and interpretability. \
                 Extract ALL author names and affiliations. \
                 Identify which safety labs are publishing (Anthropic, OpenAI safety, \
                 DeepMind alignment, MIRI, ARC, Redwood Research)."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Normal,
            ..Default::default()
        },
        ResearchTask {
            id: 7,
            subject: "efficiency-scaling-authors".into(),
            description: format!(
                "Search for papers published in the {week} on model efficiency, \
                 quantization, distillation, pruning, mixture-of-experts, \
                 and scaling laws. Extract ALL author names and affiliations. \
                 Track which hardware/efficiency labs are most active."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Normal,
            ..Default::default()
        },
        ResearchTask {
            id: 8,
            subject: "nlp-ir-authors".into(),
            description: format!(
                "Search for papers published in the {week} on NLP, information retrieval, \
                 RAG, search, embeddings, and text understanding. \
                 Extract ALL author names and affiliations. \
                 Identify the most active NLP research groups this week."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Normal,
            ..Default::default()
        },
        ResearchTask {
            id: 9,
            subject: "graph-geometric-authors".into(),
            description: format!(
                "Search for papers published in the {week} on graph neural networks, \
                 geometric deep learning, molecular AI, and protein folding. \
                 Extract ALL author names and affiliations. \
                 Note any cross-disciplinary collaborations (CS + biology/chemistry)."
            ),
            preamble: author_preamble(),
            priority: TaskPriority::Normal,
            ..Default::default()
        },
        ResearchTask {
            id: 10,
            subject: "author-landscape-synthesis".into(),
            description: format!(
                "Based on findings from all previous tasks, produce a comprehensive \
                 author landscape report for the {week}: \
                 (1) Top 20 most prolific authors across all AI domains, \
                 (2) Most active institutions/labs ranked by paper count, \
                 (3) Notable industry-academia collaborations, \
                 (4) Emerging researchers (first-time or recently-active authors with high-impact work), \
                 (5) Cross-domain authors appearing in multiple research areas, \
                 (6) Geographic distribution of AI research output. \
                 Present as a structured Markdown report with tables where appropriate."
            ),
            preamble: "You are a science-of-science researcher producing a weekly intelligence \
                 briefing on who is driving AI research. Synthesise the teammate findings into \
                 a clear, data-driven author landscape report."
                .into(),
            priority: TaskPriority::Critical,
            dependencies: vec![1, 2, 3, 4, 5, 6, 7, 8, 9],
            ..Default::default()
        },
    ]
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let api_key = std::env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;
    let base_url =
        std::env::var("DEEPSEEK_BASE_URL").unwrap_or_else(|_| DEFAULT_BASE_URL.to_string());
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();

    std::fs::create_dir_all(OUT_DIR).with_context(|| format!("creating output dir {OUT_DIR}"))?;

    let tasks = research_tasks();
    let team_size = 10;
    eprintln!(
        "Launching last-week-authors team: {team_size} workers, {} tasks\n",
        tasks.len()
    );

    let lead = TeamLead::new(TeamConfig {
        team_size,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        code_root: None,
        synthesis_preamble: Some(
            "You are a bibliometrics analyst producing a weekly AI author intelligence report. \
             Synthesise all agent findings into a unified view of who is publishing what, \
             collaboration patterns, and emerging talent."
                .into(),
        ),
        synthesis_prompt_template: Some(
            r#"# Author Landscape Synthesis — Last Week in AI Research

You have received findings from {count} research agents, each tracking author names
and affiliations in a different AI domain over the past week.

Produce a **master author landscape report** with:

1. **Top Authors** — ranked by paper count across all domains
2. **Lab Leaderboard** — institutions ranked by output volume
3. **Collaboration Heatmap** — which labs co-author most frequently
4. **Rising Stars** — newly prolific or first-time authors with notable work
5. **Cross-Domain Bridges** — authors publishing in 2+ domains simultaneously
6. **Industry vs Academia Split** — ratio and key players on each side
7. **Geographic Hotspots** — where AI research is concentrated this week

## Agent Findings

{combined}
"#
            .into(),
        ),
        tool_config: None,
        scholar_concurrency: Some(3),
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(OUT_DIR.into()),
        synthesis_provider: None,
        ranker: None,
        timeout_check_interval: None,
        progress_report_interval: None,
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content).with_context(|| format!("writing {path}"))?;
        eprintln!("  wrote {path} ({} bytes)", content.len());
    }

    let synthesis_path = format!("{OUT_DIR}/synthesis.md");
    std::fs::write(&synthesis_path, &result.synthesis)
        .with_context(|| format!("writing {synthesis_path}"))?;
    eprintln!(
        "  wrote {synthesis_path} ({} bytes)",
        result.synthesis.len()
    );

    let mut combined = String::from("# Last Week in AI — Author Landscape Report\n\n");
    for (id, subject, content) in &result.findings {
        combined.push_str(&format!("## Agent {id}: {subject}\n\n{content}\n\n---\n\n"));
    }
    combined.push_str("## Synthesis\n\n");
    combined.push_str(&result.synthesis);

    let combined_path = format!("{OUT_DIR}/last-week-authors-complete.md");
    std::fs::write(&combined_path, &combined)
        .with_context(|| format!("writing {combined_path}"))?;
    eprintln!("  wrote {combined_path} ({} bytes)", combined.len());

    eprintln!("\nDone.");
    Ok(())
}
