use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::Path;
use std::sync::Arc;
use tokio::fs;
use tracing::info;

use deepseek::{DeepSeekClient, ReqwestClient};

use crate::agent_teams::{run_parallel, Agent};
use crate::prompts;
use crate::publisher;
use crate::research_phase::{self, ResearchConfig};

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
    /// Publish to vadim.blog + run `vercel deploy --prod` when true.
    publish: bool,
    /// Enable paper search + multi-model research synthesis.
    research_config: Option<ResearchConfig>,
    /// Pre-built client injected by tests; `None` → create from env at run time.
    client: Option<Arc<DeepSeekClient<ReqwestClient>>>,
}

impl Pipeline {
    pub fn new(niche: impl Into<String>, output_dir: impl Into<String>) -> Self {
        Self {
            niche: niche.into(),
            output_dir: output_dir.into(),
            count: 1,
            publish: false,
            research_config: None,
            client: None,
        }
    }

    pub fn with_count(mut self, count: usize) -> Self {
        self.count = count.max(1);
        self
    }

    pub fn with_publish(mut self, publish: bool) -> Self {
        self.publish = publish;
        self
    }

    pub fn with_research(mut self, config: ResearchConfig) -> Self {
        self.research_config = Some(config);
        self
    }

    /// Inject a pre-built client (used in tests to point at a mock server).
    pub fn with_client(mut self, client: Arc<DeepSeekClient<ReqwestClient>>) -> Self {
        self.client = Some(client);
        self
    }

    pub async fn run(&self) -> Result<()> {
        fs::create_dir_all(&self.output_dir).await?;

        let client = match &self.client {
            Some(c) => Arc::clone(c),
            None => Arc::new(deepseek::client_from_env()?),
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

        let cleaned = crate::strip_fences(&selection);
        let selections: Vec<TopicSelection> = serde_json::from_str(cleaned)
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

        let use_research = self.research_config.is_some();
        let research_paper_search = self.research_config.as_ref().map_or(false, |c| c.enable_paper_search);
        let research_multi_model = self.research_config.as_ref().map_or(false, |c| c.enable_multi_model);

        if use_research {
            info!("Research mode: paper_search={research_paper_search}, multi_model={research_multi_model}");
        }

        let mut set = tokio::task::JoinSet::new();

        for (i, sel) in selections.into_iter().take(self.count).enumerate() {
            let client     = Arc::clone(&client);
            let niche      = self.niche.clone();
            let output_dir = self.output_dir.clone();

            let do_publish = self.publish;
            set.spawn(async move {
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

                let slug      = crate::slugify(&sel.topic);
                let topic_dir = format!("{output_dir}/{slug}");
                fs::create_dir_all(&topic_dir).await?;

                let (notes, paper_count) = if use_research {
                    let config = ResearchConfig {
                        enable_paper_search: research_paper_search,
                        enable_multi_model: research_multi_model,
                    };
                    let output = research_phase::research_phase(
                        &sel.topic, &sel.angle, &niche, &config, &client,
                    ).await?;
                    (output.notes, output.paper_count)
                } else {
                    let researcher = Agent::new(
                        format!("researcher[{i}]"),
                        prompts::researcher(&niche),
                        Arc::clone(&client),
                    );
                    let brief = format!("Topic: {}\nAngle: {}\n", sel.topic, sel.angle);
                    let notes = researcher.run(&brief).await?;
                    (notes, 0usize)
                };

                save(&topic_dir, "research.md", &notes).await?;

                // Writer and LinkedIn run concurrently — both take research notes.
                let (blog, li) = run_parallel(&writer, &linkedin, &notes).await?;
                save(&topic_dir, "blog.md",     &blog).await?;
                save(&topic_dir, "linkedin.md", &li).await?;

                if do_publish {
                    publisher::publish(&blog, &sel.topic, true).await?;
                }

                anyhow::Ok((sel.topic, blog, li, paper_count))
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
        for (topic, blog, li, paper_count) in &results {
            let papers_info = if *paper_count > 0 {
                format!("  |  papers: {paper_count}")
            } else {
                String::new()
            };
            println!(
                "\n  [{topic}]\n  blog: ~{} words  |  linkedin: {} lines{papers_info}",
                blog.split_whitespace().count(),
                li.lines().count()
            );
        }

        Ok(())
    }
}

// ── helpers ───────────────────────────────────────────────────────────────────

async fn save(dir: &str, filename: &str, content: &str) -> Result<()> {
    let path = Path::new(dir).join(filename);
    fs::write(&path, content).await?;
    info!("  Saved → {}", path.display());
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::{slugify, strip_fences};
    use super::*;

    #[test]
    fn test_slugify_basic() {
        assert_eq!(slugify("Hello World"), "hello-world");
    }

    #[test]
    fn test_slugify_special_chars() {
        assert_eq!(slugify("Rust 2024: What's New?"), "rust-2024-what-s-new");
    }

    #[test]
    fn test_slugify_consecutive_dashes() {
        assert_eq!(slugify("a--b"), "a-b");
    }

    #[test]
    fn test_strip_fences_json() {
        let input = "```json\n[{\"topic\":\"test\"}]\n```";
        assert_eq!(strip_fences(input), "[{\"topic\":\"test\"}]");
    }

    #[test]
    fn test_strip_fences_no_fences() {
        let input = "[{\"topic\":\"test\"}]";
        assert_eq!(strip_fences(input), input);
    }

    #[test]
    fn test_count_floor_is_one() {
        let p = Pipeline::new("niche", "/tmp/test").with_count(0);
        assert_eq!(p.count, 1, "count should be at least 1");
    }
}
