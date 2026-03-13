use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use dotenvy::dotenv;
use chrono::Utc;
use research::agent::agent_builder;
use research::tools::{GetPaperDetail, SearchPapers, SearchToolConfig};
use research::scholar::SemanticScholarClient;
use thera_research::d1::{parse_path, D1Client};
use thera_research::therapy_context::{ResearchOutput, TherapyContext};
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
    /// Fetch characteristic directly from D1 by URL path.
    /// Example: research url /family/2/characteristics/2
    Url {
        /// App URL path, e.g. /family/2/characteristics/2
        path: String,
    },
}

fn therapy_tool_config() -> SearchToolConfig {
    SearchToolConfig {
        default_limit: 10,
        abstract_max_chars: 150,
        max_authors: 3,
        include_fields_of_study: true,
        include_venue: true,
        search_description: Some(
            "Search 214M+ academic papers on Semantic Scholar for therapeutic, psychological, \
             and clinical research. Returns titles, authors, citation counts, abstracts, and PDF \
             links. Call multiple times with different query terms to cover the topic \
             from different angles (e.g., 'CBT anxiety children', 'exposure therapy meta-analysis')."
                .into(),
        ),
        detail_description: Some(
            "Get full details for a specific paper: complete abstract, AI-generated \
             TLDR summary, all authors, venue, citation context, and PDF link. \
             Use this on the most relevant papers from search_papers to extract \
             therapeutic techniques, outcome measures, and evidence level before \
             writing your final report."
                .into(),
        ),
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Load .env.local then .env (ignore missing files)
    let _ = dotenvy::from_filename(".env.local");
    let _ = dotenv();

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

    let preamble = r#"You are a clinical research specialist for a therapeutic platform supporting children and families.
You have access to the Semantic Scholar API via search_papers and get_paper_detail.

Research standards:
- Run exactly 3 search_papers calls with different query terms; set limit=10 on each call
- Select the TOP 10 most relevant papers — quality over quantity
- Call get_paper_detail on at most 2 papers for full abstracts
- Weight evidence level: meta-analysis > systematic review > RCT > cohort > case study
- Extract concrete therapeutic techniques from each paper
- Identify outcome measures and their effect sizes when available
- Report confidence honestly — say 'insufficient evidence' if the literature is sparse
- The final JSON block MUST contain exactly 10 papers (or fewer if not enough quality results)
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
        Commands::Url { path } => {
            let (family_member_id, characteristic_id) =
                parse_path(path).with_context(|| format!("parsing path {path:?}"))?;
            info!(family_member_id, characteristic_id, "Fetching characteristic from D1");
            let d1 = D1Client::from_env()?;
            let char = d1.fetch_characteristic(characteristic_id).await?;
            TherapyContext::from_characteristic_data(
                char.id,
                family_member_id,
                char.category,
                char.title,
                char.description,
                char.severity,
                char.impairment_domains,
            )
        }
    };

    info!(
        goal_id = context.goal_id,
        goal_type = %context.therapeutic_goal_type,
        title = %context.title,
        population = %context.target_population,
        "Therapy context loaded"
    );

    let config = therapy_tool_config();
    let agent = agent_builder(&api_key, "deepseek-reasoner")
        .preamble(preamble)
        .tool(SearchPapers::with_config(scholar.clone(), config.clone()))
        .tool(GetPaperDetail::with_config(scholar, config))
        .build();

    let prompt = context.build_agent_prompt();
    info!("Sending therapeutic context to DeepSeek Reasoner (may take 30–120s)…");

    let insights = agent
        .prompt(prompt)
        .await
        .context("DeepSeek agent call failed")?;

    info!("Research complete ({} chars)", insights.len());

    // Always write markdown output (regardless of --stdout)
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

    if cli.stdout {
        println!("{insights}");
    }

    // Persist to D1 when running the Url subcommand
    if let Commands::Url { path } = &cli.command {
        let (family_member_id, characteristic_id) = parse_path(path)?;
        let json_str = extract_research_json(&insights)
            .context("No JSON block found in agent output — cannot persist to D1")?;

        let output: ResearchOutput =
            serde_json::from_str(&json_str).context("Parsing research JSON")?;

        // Find a goal_id for this family member (required by therapy_research schema)
        let d1 = D1Client::from_env()?;
        let goal_id = d1
            .fetch_first_goal_id(family_member_id)
            .await?
            .with_context(|| {
                format!("No goals found for family_member_id={family_member_id}. Create a goal first.")
            })?;

        info!(
            characteristic_id,
            goal_id,
            paper_count = output.papers.len(),
            "Persisting papers to D1"
        );

        let mut saved = 0usize;
        let mut skipped = 0usize;
        for paper in output.papers.iter().take(10) {
            let authors_json = serde_json::to_string(&paper.authors).unwrap_or_default();
            let key_findings_json = serde_json::to_string(&paper.key_findings).unwrap_or_default();
            let techniques_json =
                serde_json::to_string(&paper.therapeutic_techniques).unwrap_or_default();

            match d1
                .upsert_research_paper(
                    goal_id,
                    characteristic_id,
                    &output.therapeutic_goal_type,
                    &paper.title,
                    &authors_json,
                    paper.year.map(|y| y as i32),
                    paper.doi.as_deref(),
                    paper.url.as_deref(),
                    &key_findings_json,
                    &techniques_json,
                    &paper.evidence_level,
                    paper.relevance_score,
                )
                .await
            {
                Ok(row_id) => {
                    saved += 1;
                    info!(row_id, title = %paper.title, "Upserted paper");
                }
                Err(e) => {
                    skipped += 1;
                    tracing::warn!(title = %paper.title, error = %e, "Failed to upsert paper");
                }
            }
        }

        info!("D1 persist complete: {saved} saved, {skipped} failed");
        println!("\n✅ Persisted {saved}/{} papers to D1 (characteristic_id={characteristic_id}, goal_id={goal_id})",
            output.papers.len());
    } else if let Some(json) = extract_research_json(&insights) {
        println!("{json}");
    } else {
        tracing::warn!("No JSON output block found in research — manual extraction required");
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
