//! Offline eval binary for the characteristic research pipeline.
//!
//! Runs graders against pre-existing output files in a characteristic
//! research output directory.
//!
//! Usage:
//!   cargo run --bin eval-characteristic -- research-output/characteristics/emotional-dysregulation
//!
//! Output (stdout): JSON with composite score and per-grader breakdowns.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;

/// Grader weights from benchmark.yaml
const WEIGHTS: &[(&str, f64)] = &[
    ("citation_accuracy", 0.3),
    ("grounding", 0.3),
    ("synthesis_completeness", 0.2),
    ("team_efficiency", 0.2),
];

/// Grader definitions: (name, relative path from crate root)
const GRADERS: &[(&str, &str)] = &[
    ("citation_accuracy", "harbor/graders/citation_verifier.py"),
    ("grounding", "harbor/graders/research_grounding.py"),
    (
        "synthesis_completeness",
        "harbor/graders/characteristic_synthesis.py",
    ),
    (
        "team_efficiency",
        "harbor/graders/characteristic_efficiency.py",
    ),
];

#[derive(Debug, Deserialize)]
struct GraderResult {
    score: f64,
    details: serde_json::Value,
}

#[derive(Debug, Serialize)]
struct EvalSummary {
    composite_score: f64,
    grader_scores: Vec<GraderScore>,
    pass_status: String,
}

#[derive(Debug, Serialize)]
struct GraderScore {
    name: String,
    score: f64,
    weight: f64,
    weighted_score: f64,
    details: serde_json::Value,
}

fn find_repo_root() -> Result<PathBuf> {
    // Walk up from the binary's manifest dir to find the harbor/ directory.
    let mut dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    loop {
        if dir.join("harbor").is_dir() {
            return Ok(dir);
        }
        if !dir.pop() {
            break;
        }
    }
    // Fallback: try current directory
    let cwd = std::env::current_dir()?;
    if cwd.join("harbor").is_dir() {
        return Ok(cwd);
    }
    anyhow::bail!(
        "Could not find repo root (looked for harbor/ directory). \
         Run from the repository root or set working directory accordingly."
    )
}

fn run_grader(name: &str, script_path: &Path, output_dir: &Path) -> Result<GraderResult> {
    eprintln!("  Running grader: {name} ...");

    let output = Command::new("python3")
        .arg(script_path)
        .env("OUTPUT_DIR", output_dir)
        .output()
        .with_context(|| {
            format!(
                "Failed to execute grader {name} at {}",
                script_path.display()
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!(
            "Grader {name} exited with status {}: {}",
            output.status,
            stderr.trim()
        );
    }

    let stdout = String::from_utf8(output.stdout)
        .with_context(|| format!("Grader {name} produced non-UTF-8 output"))?;

    let result: GraderResult = serde_json::from_str(stdout.trim()).with_context(|| {
        format!(
            "Grader {name} produced invalid JSON:\n{}",
            &stdout[..stdout.len().min(500)]
        )
    })?;

    Ok(result)
}

fn main() -> Result<()> {
    dotenvy::dotenv().ok();

    let repo_root = find_repo_root()?;

    // Accept output directory as CLI argument, or fall back to default.
    let output_dir = if let Some(arg) = std::env::args().nth(1) {
        let path = PathBuf::from(&arg);
        if path.is_absolute() {
            path
        } else {
            repo_root.join(path)
        }
    } else {
        repo_root.join("research-output/characteristics")
    };

    if !output_dir.exists() {
        anyhow::bail!(
            "Output directory not found: {}\n\
             Run the characteristic-research binary first to generate output files,\n\
             or pass the output directory path as a CLI argument.",
            output_dir.display()
        );
    }

    eprintln!("Harbor Eval: Characteristic Research");
    eprintln!("====================================");
    eprintln!("Output dir: {}", output_dir.display());
    eprintln!();

    // Verify output files exist
    let agent_count = std::fs::read_dir(&output_dir)?
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_name()
                .to_str()
                .map_or(false, |n| n.starts_with("agent-") && n.ends_with(".md"))
        })
        .count();
    let has_synthesis = output_dir.join("synthesis.md").exists();

    eprintln!("  Found {agent_count} agent files, synthesis: {has_synthesis}");
    eprintln!();

    // Build weight map
    let weight_map: std::collections::HashMap<&str, f64> = WEIGHTS.iter().copied().collect();

    // Run each grader
    let mut grader_scores = Vec::new();
    let mut composite = 0.0;

    for (name, rel_path) in GRADERS {
        let script_path = repo_root.join(rel_path);
        if !script_path.exists() {
            eprintln!(
                "  WARNING: Grader script not found: {}",
                script_path.display()
            );
            grader_scores.push(GraderScore {
                name: name.to_string(),
                score: 0.0,
                weight: *weight_map.get(name).unwrap_or(&0.0),
                weighted_score: 0.0,
                details: serde_json::json!({"error": "grader script not found"}),
            });
            continue;
        }

        match run_grader(name, &script_path, &output_dir) {
            Ok(result) => {
                let weight = *weight_map.get(name).unwrap_or(&0.0);
                let weighted = result.score * weight;
                composite += weighted;

                eprintln!(
                    "  {name}: {:.2} (weight {:.1}, weighted {:.3})",
                    result.score, weight, weighted
                );

                grader_scores.push(GraderScore {
                    name: name.to_string(),
                    score: result.score,
                    weight,
                    weighted_score: weighted,
                    details: result.details,
                });
            }
            Err(e) => {
                eprintln!("  {name}: ERROR - {e:#}");
                grader_scores.push(GraderScore {
                    name: name.to_string(),
                    score: 0.0,
                    weight: *weight_map.get(name).unwrap_or(&0.0),
                    weighted_score: 0.0,
                    details: serde_json::json!({"error": format!("{e:#}")}),
                });
            }
        }
    }

    // Determine pass status
    let pass_status = if composite >= 0.9 {
        "EXCELLENT"
    } else if composite >= 0.75 {
        "GOOD"
    } else if composite >= 0.6 {
        "PASS"
    } else {
        "FAIL"
    };

    let summary = EvalSummary {
        composite_score: (composite * 10000.0).round() / 10000.0,
        grader_scores,
        pass_status: pass_status.to_string(),
    };

    eprintln!();
    eprintln!("====================================");
    eprintln!(
        "Composite Score: {:.4} [{}]",
        summary.composite_score, pass_status
    );
    eprintln!("====================================");

    // Print structured JSON to stdout
    println!("{}", serde_json::to_string_pretty(&summary)?);

    Ok(())
}
