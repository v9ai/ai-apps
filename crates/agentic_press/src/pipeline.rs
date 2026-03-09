use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::Path;
use std::sync::Arc;
use tokio::fs;
use tracing::info;

use deepseek::{DeepSeekClient, ReqwestClient};

use crate::agent_teams::{run_parallel, AgentTeam, ModelClient, ModelPool, TeamRole};
use crate::prompts;
use crate::publisher::{FsPublisher, Publisher};
use crate::research_phase::{self, ResearchConfig};
use crate::task_list::TaskList;

// ── pipeline mode ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum PipelineMode {
    #[default]
    Journalism,
    Blog,
    DeepDive,
}

// ── picker output ────────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct TopicSelection {
    topic: String,
    angle: String,
}

// ── structured results ──────────────────────────────────────────────────────

#[derive(Debug)]
pub struct TopicResult {
    pub topic: String,
    pub slug: String,
    pub blog: String,
    pub linkedin: String,
    pub paper_count: usize,
}

#[derive(Debug)]
pub struct BlogResult {
    pub scout_output: String,
    pub picker_output: String,
    pub topics: Vec<TopicResult>,
}

#[derive(Debug)]
pub struct JournalismArticle {
    pub topic: String,
    pub slug: String,
    pub research: String,
    pub seo: String,
    pub draft: String,
    pub editor_output: String,
    pub approved: bool,
    pub revision_rounds: usize,
}

#[derive(Debug)]
pub struct JournalismResult {
    pub article: JournalismArticle,
}

#[derive(Debug)]
pub struct DeepDiveArticle {
    pub title: String,
    pub slug: String,
    pub source_content: String,
    pub research: String,
    pub seo: String,
    pub draft: String,
    pub linkedin: String,
    pub editor_output: String,
    pub approved: bool,
    pub revision_rounds: usize,
    pub paper_count: usize,
}

#[derive(Debug)]
pub struct DeepDiveResult {
    pub article: DeepDiveArticle,
}

#[derive(Debug)]
pub enum PipelineResult {
    Blog(BlogResult),
    Journalism(JournalismResult),
    DeepDive(DeepDiveResult),
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
    /// Pre-built DeepSeek client injected by tests; `None` → create from env at run time.
    deepseek_client: Option<Arc<DeepSeekClient<ReqwestClient>>>,
    /// Pre-built Qwen client; `None` → create from DASHSCOPE_API_KEY if available.
    qwen_client: Option<Arc<qwen::Client>>,
    /// Custom publisher implementation (default: FsPublisher).
    publisher: Option<Box<dyn Publisher>>,
    /// Pipeline mode: Journalism (default) or Blog.
    mode: PipelineMode,
    /// Topic for journalism mode.
    topic: Option<String>,
    /// Input file path for deep-dive mode.
    input_file: Option<String>,
}

impl Pipeline {
    pub fn new(niche: impl Into<String>, output_dir: impl Into<String>) -> Self {
        Self {
            niche: niche.into(),
            output_dir: output_dir.into(),
            count: 1,
            publish: false,
            research_config: None,
            deepseek_client: None,
            qwen_client: None,
            publisher: None,
            mode: PipelineMode::default(),
            topic: None,
            input_file: None,
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

    /// Inject a pre-built DeepSeek client (used in tests to point at a mock server).
    pub fn with_deepseek_client(mut self, client: Arc<DeepSeekClient<ReqwestClient>>) -> Self {
        self.deepseek_client = Some(client);
        self
    }

    /// Inject a pre-built Qwen client (used in tests to point at a mock server).
    pub fn with_qwen_client(mut self, client: Arc<qwen::Client>) -> Self {
        self.qwen_client = Some(client);
        self
    }

    /// Inject a custom publisher (used in tests to avoid filesystem side effects).
    pub fn with_publisher(mut self, publisher: impl Publisher + 'static) -> Self {
        self.publisher = Some(Box::new(publisher));
        self
    }

    pub fn with_mode(mut self, mode: PipelineMode) -> Self {
        self.mode = mode;
        self
    }

    pub fn with_topic(mut self, topic: impl Into<String>) -> Self {
        self.topic = Some(topic.into());
        self
    }

    pub fn with_input_file(mut self, path: impl Into<String>) -> Self {
        self.input_file = Some(path.into());
        self
    }

    pub async fn run(&self) -> Result<PipelineResult> {
        match self.mode {
            PipelineMode::Journalism => self.run_journalism().await,
            PipelineMode::Blog => self.run_blog().await,
            PipelineMode::DeepDive => self.run_deep_dive().await,
        }
    }

    /// Build a ModelPool from injected or env-based clients.
    fn build_pool(&self) -> Result<ModelPool> {
        let ds_client = match &self.deepseek_client {
            Some(c) => Arc::clone(c),
            None => Arc::new(deepseek::client_from_env()?),
        };

        let qw_client = match &self.qwen_client {
            Some(c) => Some(Arc::clone(c)),
            None => std::env::var("DASHSCOPE_API_KEY")
                .ok()
                .map(|key| Arc::new(qwen::Client::new(key))),
        };

        let ds = ModelClient::deepseek(Arc::clone(&ds_client));
        let qw = qw_client
            .map(ModelClient::qwen)
            .unwrap_or_else(|| ds.clone());

        Ok(ModelPool::new(ds, qw))
    }

    async fn run_blog(&self) -> Result<PipelineResult> {
        fs::create_dir_all(&self.output_dir).await?;

        let pool = self.build_pool()?;
        let ds_client = pool.deepseek_client()
            .context("ModelPool must have a DeepSeek reasoner")?;

        info!("═══ agentic_press pipeline starting ═══");
        info!(
            "Models: {}  |  Niche: {}  |  Count: {}",
            pool.label(),
            self.niche,
            self.count
        );

        // ── Create team ─────────────────────────────────────────────────────
        let mut team = AgentTeam::new("blog-team");

        // ── TaskList ─────────────────────────────────────────────────────────
        let mut tasks = TaskList::new();

        // ── Phase 1 — Scout (Fast) ──────────────────────────────────────────
        let scout_idx = team.spawn("scout", prompts::scout(&self.niche), TeamRole::Fast, &pool);
        let scout_task = tasks.add("scout", vec![]);

        info!("Phase 1 — Scout");
        tasks.claim(scout_task);
        let scout_output = team.agent(scout_idx)
            .run(&format!("Find 5 trending topics in this niche: {}", self.niche))
            .await?;
        tasks.complete(scout_task, scout_output.clone());
        save(&self.output_dir, "01_scout_topics.md", &scout_output).await?;

        // ── Phase 2 — Picker (Fast) ─────────────────────────────────────────
        let picker_idx = team.spawn(
            "picker",
            prompts::picker(&self.niche, self.count),
            TeamRole::Fast,
            &pool,
        );
        let picker_task = tasks.add("picker", vec![scout_task]);

        info!("Phase 2 — Picker (selecting {})", self.count);
        tasks.claim(picker_task);
        let picker_output = team.agent(picker_idx).run(&scout_output).await?;
        tasks.complete(picker_task, picker_output.clone());
        save(&self.output_dir, "02_picker_selection.json", &picker_output).await?;

        let cleaned = crate::strip_fences(&picker_output);
        let selections: Vec<TopicSelection> = serde_json::from_str(cleaned)
            .with_context(|| {
                format!("Picker output is not a valid JSON array:\n{picker_output}")
            })?;

        // ── Phase 3–5 — per-topic: Researcher → (Writer ∥ LinkedIn) ────────
        info!(
            "Phase 3–5 — {} topic(s) running concurrently",
            selections.len().min(self.count)
        );

        let use_research = self.research_config.is_some();
        let research_paper_search = self
            .research_config
            .as_ref()
            .is_some_and(|c| c.enable_paper_search);
        let research_multi_model = self
            .research_config
            .as_ref()
            .is_some_and(|c| c.enable_multi_model);

        if use_research {
            info!(
                "Research mode: paper_search={research_paper_search}, multi_model={research_multi_model}"
            );
        }

        let mut set = tokio::task::JoinSet::new();

        for (i, sel) in selections.into_iter().take(self.count).enumerate() {
            let ds_client = Arc::clone(&ds_client);
            let pool = pool.clone();
            let niche = self.niche.clone();
            let output_dir = self.output_dir.clone();

            set.spawn(async move {
                // Create per-topic sub-team with role-based routing.
                let mut sub_team = AgentTeam::new(format!("topic-{i}"));
                let writer_idx = sub_team.spawn(
                    format!("writer[{i}]"),
                    prompts::writer(),
                    TeamRole::Reasoner,
                    &pool,
                );
                let linkedin_idx = sub_team.spawn(
                    format!("linkedin[{i}]"),
                    prompts::linkedin(),
                    TeamRole::Fast,
                    &pool,
                );

                let slug = crate::slugify(&sel.topic);
                let topic_dir = format!("{output_dir}/{slug}");
                fs::create_dir_all(&topic_dir).await?;

                let (notes, paper_count) = if use_research {
                    let config = ResearchConfig {
                        enable_paper_search: research_paper_search,
                        enable_multi_model: research_multi_model,
                    };
                    let output = research_phase::research_phase(
                        &sel.topic, &sel.angle, &niche, &config, &ds_client,
                    )
                    .await?;
                    (output.notes, output.paper_count)
                } else {
                    let researcher_idx = sub_team.spawn(
                        format!("researcher[{i}]"),
                        prompts::researcher(&niche),
                        TeamRole::Reasoner,
                        &pool,
                    );
                    let brief = format!("Topic: {}\nAngle: {}\n", sel.topic, sel.angle);
                    let notes = sub_team.agent(researcher_idx).run(&brief).await?;
                    (notes, 0usize)
                };

                save(&topic_dir, "research.md", &notes).await?;

                // Writer and LinkedIn run concurrently via run_parallel.
                let (blog, li) = run_parallel(
                    sub_team.agent(writer_idx),
                    sub_team.agent(linkedin_idx),
                    &notes,
                ).await?;
                save(&topic_dir, "blog.md", &blog).await?;
                save(&topic_dir, "linkedin.md", &li).await?;

                anyhow::Ok(TopicResult {
                    topic: sel.topic,
                    slug,
                    blog,
                    linkedin: li,
                    paper_count,
                })
            });
        }

        let mut topics = Vec::new();
        while let Some(res) = set.join_next().await {
            let topic_result = res??;

            if self.publish {
                let default_pub = FsPublisher;
                let pub_impl: &dyn Publisher = match &self.publisher {
                    Some(p) => p.as_ref(),
                    None => &default_pub,
                };
                pub_impl
                    .publish_post(&topic_result.blog, &topic_result.topic, true, None)
                    .await?;
            }

            topics.push(topic_result);
        }

        Ok(PipelineResult::Blog(BlogResult {
            scout_output,
            picker_output,
            topics,
        }))
    }

    async fn run_journalism(&self) -> Result<PipelineResult> {
        let topic = self
            .topic
            .as_deref()
            .ok_or_else(|| anyhow::anyhow!("--topic is required for journalism mode"))?;

        let slug = crate::slugify(topic);

        // Create output directories.
        let research_dir = format!("{}/research", self.output_dir);
        let drafts_dir = format!("{}/drafts", self.output_dir);
        let published_dir = format!("{}/published", self.output_dir);
        for d in [&research_dir, &drafts_dir, &published_dir] {
            fs::create_dir_all(d).await?;
        }

        let pool = self.build_pool()?;

        info!("═══ agentic_press journalism pipeline starting ═══");
        info!("Models: {}  |  Topic: {topic}", pool.label());

        // ── Create team + task list ─────────────────────────────────────────
        let mut team = AgentTeam::new("journalism-team");
        let mut tasks = TaskList::new();

        // ── Phase 1 — Researcher (Reasoner) ∥ SEO (Fast) ───────────────────
        let researcher_idx = team.spawn(
            "journalist-researcher",
            prompts::journalism_researcher(topic),
            TeamRole::Reasoner,
            &pool,
        );
        let seo_idx = team.spawn(
            "journalist-seo",
            prompts::journalism_seo(topic),
            TeamRole::Fast,
            &pool,
        );
        let research_task = tasks.add("researcher", vec![]);
        let seo_task = tasks.add("seo", vec![]);

        info!("Phase 1 — Researcher ∥ SEO (parallel)");
        tasks.claim(research_task);
        tasks.claim(seo_task);

        let research_input = format!("Research this topic: {topic}");
        let (research_output, seo_output) =
            run_parallel(team.agent(researcher_idx), team.agent(seo_idx), &research_input).await?;

        tasks.complete(research_task, research_output.clone());
        tasks.complete(seo_task, seo_output.clone());
        save(&research_dir, &format!("{slug}-research.md"), &research_output).await?;
        save(&research_dir, &format!("{slug}-seo.md"), &seo_output).await?;

        // ── Phase 2 — Writer (Reasoner) ────────────────────────────────────
        let writer_idx = team.spawn(
            "journalist-writer",
            prompts::journalism_writer(),
            TeamRole::Reasoner,
            &pool,
        );
        let writer_task = tasks.add("writer", vec![research_task, seo_task]);

        info!("Phase 2 — Writer");
        tasks.claim(writer_task);
        let writer_input = format!(
            "## Research Brief\n\n{research_output}\n\n---\n\n## SEO Strategy\n\n{seo_output}"
        );
        let mut draft = team.agent(writer_idx).run(&writer_input).await?;
        tasks.complete(writer_task, draft.clone());
        save(&drafts_dir, &format!("{slug}.md"), &draft).await?;

        // ── Phase 3 — Editor (Reviewer) with revision loop ─────────────────
        let mut revision_rounds: usize = 0;
        let mut editor_output;
        let mut approved;

        loop {
            let editor_idx = team.spawn(
                format!("journalist-editor-r{revision_rounds}"),
                prompts::journalism_editor(),
                TeamRole::Reviewer,
                &pool,
            );
            let editor_task = tasks.add(
                &format!("editor-r{revision_rounds}"),
                vec![writer_task],
            );

            info!("Phase 3 — Editor (round {})", revision_rounds + 1);
            tasks.claim(editor_task);
            let editor_input = format!(
                "## Draft\n\n{draft}\n\n---\n\n## Research Brief\n\n{research_output}\n\n---\n\n## SEO Strategy\n\n{seo_output}"
            );
            editor_output = team.agent(editor_idx).run(&editor_input).await?;
            tasks.complete(editor_task, editor_output.clone());

            approved = editor_output.contains("APPROVE")
                || editor_output.contains("status: published");

            if approved || revision_rounds >= 1 {
                break;
            }

            // ── Revision: feed editor notes back to Writer ──────────────
            revision_rounds += 1;
            info!("Editor requested revision — round {revision_rounds}");

            let revision_writer_idx = team.spawn(
                format!("journalist-writer-r{revision_rounds}"),
                prompts::journalism_writer(),
                TeamRole::Reasoner,
                &pool,
            );
            let revision_task = tasks.add(
                &format!("writer-r{revision_rounds}"),
                vec![editor_task],
            );

            tasks.claim(revision_task);
            let revision_input = format!(
                "## Revision Notes from Editor\n\n{editor_output}\n\n---\n\n\
                 ## Original Research Brief\n\n{research_output}\n\n---\n\n\
                 ## SEO Strategy\n\n{seo_output}\n\n---\n\n\
                 ## Previous Draft (revise this, don't start from scratch)\n\n{draft}"
            );
            draft = team.agent(revision_writer_idx).run(&revision_input).await?;
            tasks.complete(revision_task, draft.clone());
            save(
                &drafts_dir,
                &format!("{slug}-revisions.md"),
                &editor_output,
            )
            .await?;
            save(&drafts_dir, &format!("{slug}.md"), &draft).await?;
        }

        if approved {
            save(&published_dir, &format!("{slug}.md"), &editor_output).await?;
        } else {
            save(
                &drafts_dir,
                &format!("{slug}-revisions.md"),
                &editor_output,
            )
            .await?;
        }

        // ── Optional publish ────────────────────────────────────────────────
        if self.publish && approved {
            let default_pub = FsPublisher;
            let pub_impl: &dyn Publisher = match &self.publisher {
                Some(p) => p.as_ref(),
                None => &default_pub,
            };
            pub_impl.publish_post(&editor_output, topic, true, None).await?;
        }

        assert!(tasks.is_all_done(), "all journalism tasks should be complete");

        let article = JournalismArticle {
            topic: topic.to_string(),
            slug,
            research: research_output,
            seo: seo_output,
            draft,
            editor_output,
            approved,
            revision_rounds,
        };

        Ok(PipelineResult::Journalism(JournalismResult { article }))
    }

    async fn run_deep_dive(&self) -> Result<PipelineResult> {
        let input_path = self
            .input_file
            .as_deref()
            .ok_or_else(|| anyhow::anyhow!("--input is required for deep-dive mode"))?;

        let title = self
            .topic
            .as_deref()
            .ok_or_else(|| anyhow::anyhow!("--title/--topic is required for deep-dive mode"))?;

        let slug = crate::slugify(title);

        // Read source article.
        let source_content = fs::read_to_string(input_path)
            .await
            .with_context(|| format!("Cannot read input file: {input_path}"))?;
        info!("Read {} chars from {input_path}", source_content.len());

        // Create output directories.
        let research_dir = format!("{}/research", self.output_dir);
        let drafts_dir = format!("{}/drafts", self.output_dir);
        let published_dir = format!("{}/published", self.output_dir);
        for d in [&research_dir, &drafts_dir, &published_dir] {
            fs::create_dir_all(d).await?;
        }

        let pool = self.build_pool()?;
        let ds_client = pool
            .deepseek_client()
            .context("ModelPool must have a DeepSeek reasoner")?;

        info!("═══ agentic_press deep-dive pipeline starting ═══");
        info!("Models: {}  |  Title: {title}", pool.label());

        let mut team = AgentTeam::new("deep-dive-team");
        let mut tasks = TaskList::new();

        // ── Phase 1 — Research ∥ SEO (parallel) ────────────────────────────
        let seo_idx = team.spawn(
            "deep-dive-seo",
            prompts::journalism_seo(title),
            TeamRole::Fast,
            &pool,
        );
        let research_task = tasks.add("research", vec![]);
        let seo_task = tasks.add("seo", vec![]);

        info!("Phase 1 — Research ∥ SEO (parallel)");
        tasks.claim(research_task);
        tasks.claim(seo_task);

        let use_research = self.research_config.is_some();
        let research_paper_search = self
            .research_config
            .as_ref()
            .is_some_and(|c| c.enable_paper_search);
        let research_multi_model = self
            .research_config
            .as_ref()
            .is_some_and(|c| c.enable_multi_model);

        // Run research and SEO in parallel.
        let seo_input = format!("Analyze SEO strategy for: {title}");
        let (research_output, paper_count, seo_output) = if use_research {
            let config = ResearchConfig {
                enable_paper_search: research_paper_search,
                enable_multi_model: research_multi_model,
            };
            let (research_result, seo_result) = tokio::try_join!(
                research_phase::research_phase(title, title, &self.niche, &config, &ds_client),
                team.agent(seo_idx).run(&seo_input),
            )?;
            (research_result.notes, research_result.paper_count, seo_result)
        } else {
            // No research configured — run a simple researcher agent in parallel with SEO.
            let researcher_idx = team.spawn(
                "deep-dive-researcher",
                prompts::journalism_researcher(title),
                TeamRole::Reasoner,
                &pool,
            );
            let research_input = format!("Research this topic: {title}");
            let (research_result, seo_result) = run_parallel(
                team.agent(researcher_idx),
                team.agent(seo_idx),
                &research_input,
            )
            .await?;
            (research_result, 0usize, seo_result)
        };

        tasks.complete(research_task, research_output.clone());
        tasks.complete(seo_task, seo_output.clone());
        save(&research_dir, &format!("{slug}-research.md"), &research_output).await?;
        save(&research_dir, &format!("{slug}-seo.md"), &seo_output).await?;

        // ── Phase 2 — DeepDiveWriter (Reasoner) ────────────────────────────
        let writer_idx = team.spawn(
            "deep-dive-writer",
            prompts::deep_dive_writer(title),
            TeamRole::Reasoner,
            &pool,
        );
        let writer_task = tasks.add("writer", vec![research_task, seo_task]);

        info!("Phase 2 — DeepDiveWriter");
        tasks.claim(writer_task);
        let writer_input = format!(
            "## Source Article\n\n{source_content}\n\n---\n\n## Academic Research\n\n{research_output}\n\n---\n\n## SEO Strategy\n\n{seo_output}"
        );
        let mut draft = team.agent(writer_idx).run(&writer_input).await?;
        tasks.complete(writer_task, draft.clone());
        save(&drafts_dir, &format!("{slug}.md"), &draft).await?;

        // ── Phase 3 — Editor (Reviewer) with revision loop ─────────────────
        let mut revision_rounds: usize = 0;
        let mut editor_output;
        let mut approved;

        loop {
            let editor_idx = team.spawn(
                format!("deep-dive-editor-r{revision_rounds}"),
                prompts::journalism_editor(),
                TeamRole::Reviewer,
                &pool,
            );
            let editor_task = tasks.add(
                &format!("editor-r{revision_rounds}"),
                vec![writer_task],
            );

            info!("Phase 3 — Editor (round {})", revision_rounds + 1);
            tasks.claim(editor_task);
            let editor_input = format!(
                "## Draft\n\n{draft}\n\n---\n\n## Research Brief\n\n{research_output}\n\n---\n\n## SEO Strategy\n\n{seo_output}"
            );
            editor_output = team.agent(editor_idx).run(&editor_input).await?;
            tasks.complete(editor_task, editor_output.clone());

            approved = editor_output.contains("APPROVE")
                || editor_output.contains("status: published");

            if approved || revision_rounds >= 1 {
                break;
            }

            // ── Revision: feed editor notes back to Writer ──────────────
            revision_rounds += 1;
            info!("Editor requested revision — round {revision_rounds}");

            let revision_writer_idx = team.spawn(
                format!("deep-dive-writer-r{revision_rounds}"),
                prompts::deep_dive_writer(title),
                TeamRole::Reasoner,
                &pool,
            );
            let revision_task = tasks.add(
                &format!("writer-r{revision_rounds}"),
                vec![editor_task],
            );

            tasks.claim(revision_task);
            let revision_input = format!(
                "## Revision Notes from Editor\n\n{editor_output}\n\n---\n\n\
                 ## Source Article\n\n{source_content}\n\n---\n\n\
                 ## Academic Research\n\n{research_output}\n\n---\n\n\
                 ## SEO Strategy\n\n{seo_output}\n\n---\n\n\
                 ## Previous Draft (revise this, don't start from scratch)\n\n{draft}"
            );
            draft = team.agent(revision_writer_idx).run(&revision_input).await?;
            tasks.complete(revision_task, draft.clone());
            save(
                &drafts_dir,
                &format!("{slug}-revisions.md"),
                &editor_output,
            )
            .await?;
            save(&drafts_dir, &format!("{slug}.md"), &draft).await?;
        }

        if approved {
            save(&published_dir, &format!("{slug}.md"), &editor_output).await?;
        } else {
            save(
                &drafts_dir,
                &format!("{slug}-revisions.md"),
                &editor_output,
            )
            .await?;
        }

        // ── Phase 4 — LinkedIn (Fast) from final content ───────────────────
        let final_content = if approved { &editor_output } else { &draft };
        let linkedin_idx = team.spawn(
            "deep-dive-linkedin",
            prompts::linkedin(),
            TeamRole::Fast,
            &pool,
        );
        let linkedin_task = tasks.add("linkedin", vec![]);

        info!("Phase 4 — LinkedIn");
        tasks.claim(linkedin_task);
        let linkedin = team.agent(linkedin_idx).run(final_content).await?;
        tasks.complete(linkedin_task, linkedin.clone());
        save(&drafts_dir, &format!("{slug}-linkedin.md"), &linkedin).await?;

        // ── Optional publish ────────────────────────────────────────────────
        if self.publish && approved {
            let default_pub = FsPublisher;
            let pub_impl: &dyn Publisher = match &self.publisher {
                Some(p) => p.as_ref(),
                None => &default_pub,
            };
            pub_impl
                .publish_post(&editor_output, title, true, None)
                .await?;
        }

        assert!(tasks.is_all_done(), "all deep-dive tasks should be complete");

        let article = DeepDiveArticle {
            title: title.to_string(),
            slug,
            source_content,
            research: research_output,
            seo: seo_output,
            draft,
            linkedin,
            editor_output,
            approved,
            revision_rounds,
            paper_count,
        };

        Ok(PipelineResult::DeepDive(DeepDiveResult { article }))
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
    fn test_strip_fences_markdown() {
        let input = "```markdown\n# Hello\n```";
        assert_eq!(strip_fences(input), "# Hello");
    }

    #[test]
    fn test_strip_fences_md() {
        let input = "```md\n# Hello\n```";
        assert_eq!(strip_fences(input), "# Hello");
    }

    #[test]
    fn test_strip_fences_text() {
        let input = "```text\nHello world\n```";
        assert_eq!(strip_fences(input), "Hello world");
    }

    #[test]
    fn test_strip_fences_bare() {
        let input = "```\nHello world\n```";
        assert_eq!(strip_fences(input), "Hello world");
    }

    #[test]
    fn test_count_floor_is_one() {
        let p = Pipeline::new("niche", "/tmp/test").with_count(0);
        assert_eq!(p.count, 1, "count should be at least 1");
    }

    #[test]
    fn test_strip_fences_empty_string() {
        assert_eq!(strip_fences(""), "");
    }

    #[test]
    fn test_strip_fences_whitespace_only() {
        assert_eq!(strip_fences("   \n  "), "");
    }

    #[test]
    fn test_strip_fences_no_closing() {
        let input = "```json\n{\"key\": \"value\"}";
        assert_eq!(strip_fences(input), "{\"key\": \"value\"}");
    }

    #[test]
    fn test_strip_fences_surrounding_whitespace() {
        let input = "  \n```json\n[1,2,3]\n```\n  ";
        assert_eq!(strip_fences(input), "[1,2,3]");
    }

    #[test]
    fn test_strip_fences_multiline_body() {
        let input = "```json\n{\n  \"a\": 1,\n  \"b\": 2\n}\n```";
        assert_eq!(strip_fences(input), "{\n  \"a\": 1,\n  \"b\": 2\n}");
    }

    #[test]
    fn test_strip_fences_rust() {
        let input = "```rust\nfn main() {}\n```";
        assert_eq!(strip_fences(input), "fn main() {}");
    }

    #[test]
    fn test_slugify_empty_string() {
        assert_eq!(slugify(""), "");
    }

    #[test]
    fn test_slugify_all_special_chars() {
        assert_eq!(slugify("!@#$%^&*()"), "");
    }

    #[test]
    fn test_slugify_leading_trailing_whitespace() {
        assert_eq!(slugify("  Hello World  "), "hello-world");
    }

    #[test]
    fn test_slugify_numbers_only() {
        assert_eq!(slugify("2024"), "2024");
    }

    #[test]
    fn test_slugify_unicode() {
        // Unicode alphanumeric chars are preserved (lowercased)
        assert_eq!(slugify("café résumé"), "café-résumé");
    }

    #[test]
    fn test_pipeline_defaults() {
        let p = Pipeline::new("test", "/tmp");
        assert_eq!(p.count, 1);
        assert!(!p.publish);
        assert!(p.research_config.is_none());
        assert!(p.deepseek_client.is_none());
        assert!(p.qwen_client.is_none());
        assert!(p.publisher.is_none());
        assert_eq!(p.mode, PipelineMode::Journalism);
        assert!(p.topic.is_none());
        assert!(p.input_file.is_none());
    }

    #[test]
    fn test_with_publish_toggle() {
        let p = Pipeline::new("n", "/tmp").with_publish(true);
        assert!(p.publish);
        let p = p.with_publish(false);
        assert!(!p.publish);
    }

    #[test]
    fn test_with_count_preserves_large_values() {
        let p = Pipeline::new("n", "/tmp").with_count(100);
        assert_eq!(p.count, 100);
    }

    #[test]
    fn test_with_research_sets_config() {
        let p = Pipeline::new("n", "/tmp").with_research(ResearchConfig::default());
        assert!(p.research_config.is_some());
        let cfg = p.research_config.unwrap();
        assert!(cfg.enable_paper_search);
        assert!(cfg.enable_multi_model);
    }

    #[test]
    fn test_with_mode() {
        let p = Pipeline::new("n", "/tmp").with_mode(PipelineMode::Blog);
        assert_eq!(p.mode, PipelineMode::Blog);
    }

    #[test]
    fn test_with_topic() {
        let p = Pipeline::new("n", "/tmp").with_topic("Remote work in Germany");
        assert_eq!(p.topic.as_deref(), Some("Remote work in Germany"));
    }

    #[test]
    fn test_default_mode_is_journalism() {
        assert_eq!(PipelineMode::default(), PipelineMode::Journalism);
    }
}
