/// Run all 9 lead-gen research prompts concurrently via tokio::JoinSet.
///
/// Usage:
///   lead-gen-research-all              # run all 9 in parallel
///   lead-gen-research-all 1 3 9        # run only prompts 1, 3, 9 in parallel
use anyhow::{Context, Result};
use job_prep::prompts::{self, run_prompt};
use std::env;
use tokio::task::JoinSet;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    // Fail fast if key is missing
    env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;

    let args: Vec<String> = env::args().skip(1).collect();
    let specs = build_specs(&args)?;

    eprintln!("=== Running {} prompt(s) in parallel ===", specs.len());

    let mut set = JoinSet::new();
    for spec in specs {
        set.spawn(async move { run_prompt(spec).await });
    }

    let mut errors = Vec::new();
    while let Some(result) = set.join_next().await {
        match result {
            Ok(Ok(())) => {}
            Ok(Err(e)) => errors.push(e),
            Err(e) => errors.push(e.into()),
        }
    }

    if errors.is_empty() {
        eprintln!("=== All prompts completed successfully ===");
        Ok(())
    } else {
        eprintln!("=== {} prompt(s) failed ===", errors.len());
        for e in &errors {
            eprintln!("  - {e:#}");
        }
        anyhow::bail!("{} prompt(s) failed", errors.len());
    }
}

fn build_specs(args: &[String]) -> Result<Vec<prompts::PromptSpec>> {
    if args.is_empty() {
        return Ok(prompts::all_prompts());
    }

    let nums: Vec<u8> = args
        .iter()
        .map(|a| a.parse::<u8>().context(format!("invalid prompt number: {a}")))
        .collect::<Result<_>>()?;

    for n in &nums {
        if *n < 1 || *n > 9 {
            anyhow::bail!("prompt number {n} out of range (valid: 1–9)");
        }
    }

    let selected: Vec<_> = prompts::all_prompts()
        .into_iter()
        .filter(|s| nums.contains(&s.num))
        .collect();

    if selected.is_empty() {
        anyhow::bail!("no matching prompts for {:?}", nums);
    }

    Ok(selected)
}
