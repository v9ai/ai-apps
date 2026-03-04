use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use chrono::Utc;
use research_agent::{
    agent::Client,
    therapy_context::TherapyContext,
    tools::{GetPaperDetail, SearchPapers},
};
use semantic_scholar::SemanticScholarClient;
use std::path::PathBuf;
use tracing::info;

#[derive(Parser)]
#[command(
    name = "research",
    about = "DeepSeek Reasoner + Semantic Scholar therapeutic research agent",
    long_about = "Researches evidence-based therapeutic interventions for goals and Support Priority.\n\n\
                  Required env vars:\n  DEEPSEEK_API_KEY — DeepSeek API key\n\
                  Optional:\n  SEMANTIC_SCHOLAR_API_KEY — higher rate limits"
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    #[arg(long)]
    api_key: Option<String>,

    #[arg(long)]
    stdout: bool,

    #[arg(long, default_value = "_memory/therapeutic-research")]
    output_dir: PathBuf,
}

#[derive(Subcommand)]
enum Commands {
    Goal {
        #[arg(long)]
        goal_file: PathBuf,
    },
    SupportNeed {
        #[arg(long)]
        support_need_file: PathBuf,
    },
    Query {
        #[arg(long)]
        therapeutic_type: String,
        #[arg(long)]
        title: String,
        #[arg(long)]
        population: Option<String>,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("research_agent=info".parse()?),
        )
        .init();

    let cli = Cli::parse();

    let api_key = cli
        .api_key
        .or_else(|| std::env::var("DEEPSEEK_API_KEY").ok())
        .context("DEEPSEEK_API_KEY not set — pass --api-key or set the env var")?;

    let scholar = SemanticScholarClient::new(
        std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok().as_deref(),
    );

    let client = Client::new(&api_key);

    let preamble = r#"You are a clinical research specialist for a therapeutic platform supporting children and families.
You have access to the Semantic Scholar API via search_papers and get_paper_detail.

Research standards:
- Always run ≥3 search_papers calls with different query terms
- Call get_paper_detail on the 4–5 most promising papers for full abstracts
- Weight evidence level: meta-analysis > systematic review > RCT > cohort > case study
- Extract concrete therapeutic techniques from each paper
- Identify outcome measures and their effect sizes when available
- Report confidence honestly — say 'insufficient evidence' if the literature is sparse
- The final JSON block MUST be valid JSON that can be machine-parsed

Evidence levels:
- meta-analysis: pooled analysis of multiple studies
- systematic_review: structured review of literature
- rct: randomized controlled trial
- cohort: prospective observational study
- case_control: retrospective comparison
- case_series: multiple case reports
- case_study: single case report
- expert_opinion: clinical consensus without empirical data"#;

    let context = match &cli.command {
        Commands::Goal { goal_file } => {
            info!("Loading therapeutic goal from {goal_file:?}");
            TherapyContext::from_goal_file(goal_file)
                .with_context(|| format!("parsing goal file {goal_file:?}"))?
        }
        Commands::SupportNeed { support_need_file } => {
            info!("Loading support need from {support_need_file:?}");
            TherapyContext::from_support_need(support_need_file)
                .with_context(|| format!("parsing support need file {support_need_file:?}"))?
        }
        Commands::Query { therapeutic_type, title, population } => {
            TherapyContext {
                goal_id: 0,
                family_member_id: 0,
                therapeutic_goal_type: therapeutic_type.clone(),
                title: title.clone(),
                description: None,
                category: None,
                severity: None,
                impairment_domains: vec![],
                target_population: population.clone().unwrap_or_else(|| "children adolescents".to_string()),
                focus_keywords: vec![],
            }
        }
    };

    info!(
        goal_id = context.goal_id,
        goal_type = %context.therapeutic_goal_type,
        title = %context.title,
        population = %context.target_population,
        "Therapy context loaded"
    );

    let agent = client
        .agent("deepseek-reasoner")
        .preamble(preamble)
        .tool(SearchPapers(scholar.clone()))
        .tool(GetPaperDetail(scholar))
        .build();

    let prompt = context.build_agent_prompt();
    info!("Sending therapeutic context to DeepSeek Reasoner (may take 30–120s)…");

    let insights = agent
        .prompt(prompt)
        .await
        .context("DeepSeek agent call failed")?;

    info!("Research complete ({} chars)", insights.len());

    if cli.stdout {
        println!("{insights}");
    } else {
        std::fs::create_dir_all(&cli.output_dir)?;

        let timestamp = Utc::now().format("%Y%m%d-%H%M%S");
        let filename = format!(
            "{}-{}-{}.md",
            timestamp,
            context.therapeutic_goal_type.to_lowercase().replace(' ', "-"),
            context.goal_id
        );
        let out_path = cli.output_dir.join(&filename);

        std::fs::write(&out_path, &insights)
            .with_context(|| format!("writing {out_path:?}"))?;
        info!("Research written to {out_path:?}");

        let latest = cli.output_dir.join("latest-research.md");
        std::fs::write(&latest, &insights)?;
        info!("latest-research.md updated");

        if let Some(json) = extract_research_json(&insights) {
            println!("{json}");
        } else {
            tracing::warn!("No JSON output block found in research — manual extraction required");
        }
    }

    Ok(())
}

fn extract_research_json(text: &str) -> Option<String> {
    let markers = [
        "## Recommended JSON Output",
        "## Recommended Optimizer Grid",
    ];

    for marker in markers {
        if let Some(section_start) = text.find(marker) {
            let after_marker = &text[section_start..];
            if let Some(fence_start) = after_marker.find("```json") {
                let json_start = fence_start + 7;
                let after_fence = &after_marker[json_start..];
                if let Some(fence_end) = after_fence.find("```") {
                    return Some(after_fence[..fence_end].trim().to_string());
                }
            }
        }
    }
    None
}
