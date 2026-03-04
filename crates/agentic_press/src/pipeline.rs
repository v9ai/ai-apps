use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::Path;
use std::sync::Arc;
use tokio::fs;
use tracing::info;

use crate::agent_teams::{run_parallel, Agent};
use crate::deepseek::DeepSeekClient;
use crate::prompts;

// ── picker output ────────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct TopicSelection {
    topic: String,
    angle: String,
}

// ── pipeline ─────────────────────────────────────────────────────────────────

pub struct Pipeline {
    niche: String,
    output_dir: String,
    /// How many topics to produce per run (default: 1).
    count: usize,
    /// Pre-built client injected by tests; `None` → create from env at run time.
    client: Option<Arc<DeepSeekClient>>,
}

impl Pipeline {
    pub fn new(niche: impl Into<String>, output_dir: impl Into<String>) -> Self {
        Self {
            niche: niche.into(),
            output_dir: output_dir.into(),
            count: 1,
            client: None,
        }
    }

    pub fn with_count(mut self, count: usize) -> Self {
        self.count = count.max(1);
        self
    }

    /// Inject a pre-built client (used in tests to point at a mock server).
    pub fn with_client(mut self, client: Arc<DeepSeekClient>) -> Self {
        self.client = Some(client);
        self
    }

    pub async fn run(&self) -> Result<()> {
        fs::create_dir_all(&self.output_dir).await?;

        let client = match &self.client {
            Some(c) => Arc::clone(c),
            None => Arc::new(DeepSeekClient::from_env()?),
        };

        info!("═══ agentic_press pipeline starting ═══");
        info!(
            "Model: deepseek-reasoner  |  Niche: {}  |  Count: {}",
            self.niche, self.count
        );

        // ── Phase 1 — Scout ──────────────────────────────────────────────────
        info!("Phase 1 — Scout");
        let scout = Agent::new("scout", prompts::scout(&self.niche), Arc::clone(&client));
        let topics = scout
            .run(&format!("Find 5 trending topics in this niche: {}", self.niche))
            .await?;
        save(&self.output_dir, "01_scout_topics.md", &topics).await?;

        // ── Phase 2 — Picker ─────────────────────────────────────────────────
        info!("Phase 2 — Picker (selecting {})", self.count);
        let picker = Agent::new(
            "picker",
            prompts::picker(&self.niche, self.count),
            Arc::clone(&client),
        );
        let selection = picker.run(&topics).await?;
        save(&self.output_dir, "02_picker_selection.json", &selection).await?;

        let selections: Vec<TopicSelection> = serde_json::from_str(&selection)
            .with_context(|| format!("Picker output is not a valid JSON array:\n{selection}"))?;

        // ── Phase 3–5 — per-topic: Researcher → (Writer ∥ LinkedIn) ──────────
        //
        // All topic tasks are spawned at once so their Researcher calls run
        // concurrently; within each task Writer + LinkedIn also run in parallel.
        //
        //   Scout → Picker → ┌─ Researcher[0] → Writer[0] ─┐
        //                    │               ↘ LinkedIn[0]─┤ (join_all)
        //                    └─ Researcher[1] → Writer[1] ─┤
        //                                    ↘ LinkedIn[1]─┘
        info!(
            "Phase 3–5 — {} topic(s) running concurrently",
            selections.len().min(self.count)
        );

        let mut set = tokio::task::JoinSet::new();

        for (i, sel) in selections.into_iter().take(self.count).enumerate() {
            let client     = Arc::clone(&client);
            let niche      = self.niche.clone();
            let output_dir = self.output_dir.clone();

            set.spawn(async move {
                let researcher = Agent::new(
                    format!("researcher[{i}]"),
                    prompts::researcher(&niche),
                    Arc::clone(&client),
                );
                let writer = Agent::new(
                    format!("writer[{i}]"),
                    prompts::writer(),
                    Arc::clone(&client),
                );
                let linkedin = Agent::new(
                    format!("linkedin[{i}]"),
                    prompts::linkedin(),
                    Arc::clone(&client),
                );

                let brief     = format!("Topic: {}\nAngle: {}\n", sel.topic, sel.angle);
                let slug      = slugify(&sel.topic);
                let topic_dir = format!("{output_dir}/{slug}");
                fs::create_dir_all(&topic_dir).await?;

                let notes = researcher.run(&brief).await?;
                save(&topic_dir, "research.md", &notes).await?;

                // Writer and LinkedIn run concurrently — both take research notes.
                let (blog, li) = run_parallel(&writer, &linkedin, &notes).await?;
                save(&topic_dir, "blog.md",     &blog).await?;
                save(&topic_dir, "linkedin.md", &li).await?;

                anyhow::Ok((sel.topic, blog, li))
            });
        }

        let mut results = Vec::new();
        while let Some(res) = set.join_next().await {
            results.push(res??); // flatten JoinError + anyhow::Error
        }

        println!("\n╔══════════════════════════════════════╗");
        println!("║       agentic_press — Run Complete   ║");
        println!("╚══════════════════════════════════════╝");
        println!("\nModel:  deepseek-reasoner  |  Topics: {}", results.len());
        for (topic, blog, li) in &results {
            println!(
                "\n  [{topic}]\n  blog: ~{} words  |  linkedin: {} lines",
                blog.split_whitespace().count(),
                li.lines().count()
            );
        }

        Ok(())
    }
}

// ── helpers ───────────────────────────────────────────────────────────────────

fn slugify(s: &str) -> String {
    let raw: String = s
        .chars()
        .map(|c| if c.is_alphanumeric() { c.to_ascii_lowercase() } else { '-' })
        .collect();
    raw.split('-')
        .filter(|p| !p.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

async fn save(dir: &str, filename: &str, content: &str) -> Result<()> {
    let path = Path::new(dir).join(filename);
    fs::write(&path, content).await?;
    info!("  Saved → {}", path.display());
    Ok(())
}
