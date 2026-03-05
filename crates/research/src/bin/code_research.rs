/// Research binary that combines paper search + code analysis.
///
/// Example usage: research error handling best practices AND analyse
/// the research crate's actual error handling patterns.
use anyhow::{Context, Result};
use research::team::{ResearchTask, TaskStatus, TeamConfig, TeamLead};
use std::path::PathBuf;

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";
const OUT_DIR: &str = "research-output/code-analysis";

fn research_tasks(code_root: &str) -> Vec<ResearchTask> {
    vec![
        ResearchTask {
            id: 1,
            subject: "error-handling-literature".into(),
            description: format!(
                "Research best practices for error handling in Rust. Focus on: \
                (1) Result vs panic patterns, (2) thiserror vs anyhow design decisions, \
                (3) error propagation in async code, (4) error hierarchy design. \
                Search for papers and well-cited blog posts on Rust error handling (2020-2026)."
            ),
            preamble: "You are a Rust programming researcher. Produce structured findings \
                in Markdown focusing on evidence-backed patterns."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 2,
            subject: "codebase-error-analysis".into(),
            description: format!(
                "Analyse the Rust codebase at '{code_root}' for error handling patterns. \
                Use the code analysis tools to: \
                (1) search for all functions returning Result, \
                (2) find .unwrap() and .expect() usage, \
                (3) analyze the structure of error types, \
                (4) detect anti-patterns in the error_handling category. \
                Produce a report of findings with specific file:line references."
            ),
            preamble: "You are a senior Rust code reviewer. Use the code analysis tools \
                to inspect the codebase and produce a detailed review in Markdown. \
                Always include file paths and line numbers in your findings."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 3,
            subject: "codebase-structure-map".into(),
            description: format!(
                "Map the structural layout of the Rust codebase at '{code_root}'. \
                Use the analyze_structure tool to list all functions, structs, traits, \
                enums, and impl blocks. Produce an architectural overview showing \
                module organisation, key types, and how they relate."
            ),
            preamble: "You are a software architect. Use the code analysis tools to \
                understand the codebase structure and produce an architectural overview \
                in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 4,
            subject: "recommendations-synthesis".into(),
            description: format!(
                "Based on the prior findings from literature research and codebase analysis, \
                produce actionable recommendations for improving the codebase at '{code_root}'. \
                Cross-reference the literature best practices with what the code actually does. \
                Identify gaps, strengths, and specific improvements with file:line references."
            ),
            preamble: "You are a principal engineer synthesising research and code review \
                into actionable recommendations. Be specific and pragmatic."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1, 2, 3],
            result: None,
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

    // Default to analysing the research crate itself.
    let code_root = std::env::var("CODE_ROOT")
        .unwrap_or_else(|_| "crates/research/src".into());
    let code_root_path = PathBuf::from(&code_root)
        .canonicalize()
        .unwrap_or_else(|_| PathBuf::from(&code_root));

    std::fs::create_dir_all(OUT_DIR)
        .with_context(|| format!("creating output dir {OUT_DIR}"))?;

    let tasks = research_tasks(&code_root);
    let team_size = 4;
    eprintln!(
        "Launching code research team: {team_size} workers, {} tasks, code_root={}\n",
        tasks.len(),
        code_root_path.display()
    );

    let lead = TeamLead::new(TeamConfig {
        team_size,
        api_key,
        base_url,
        scholar_key,
        code_root: Some(code_root_path),
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content)
            .with_context(|| format!("writing {path}"))?;
        eprintln!("  wrote {path} ({} bytes)", content.len());
    }

    let synthesis_path = format!("{OUT_DIR}/synthesis.md");
    std::fs::write(&synthesis_path, &result.synthesis)
        .with_context(|| format!("writing {synthesis_path}"))?;
    eprintln!("  wrote {synthesis_path} ({} bytes)", result.synthesis.len());

    eprintln!("\nDone.");
    Ok(())
}
