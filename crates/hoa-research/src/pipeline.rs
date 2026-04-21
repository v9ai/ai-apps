//! Pipeline orchestrator — fully parallel local execution.
//!
//! Phase 1a: ALL HTTP tool calls run concurrently (8 agents' fetches in parallel).
//! Phase 1b: ALL LLM synthesis calls run concurrently on the local model.
//! Phase 2:  ALL 11 analysis agents run concurrently on the local model.
//! Phase 3:  Eval → executive → questions (sequential, each depends on previous).
//!
//! mistral.rs internally wraps the model in `Arc<MistralRs>` with a scheduler that
//! handles continuous batching, so concurrent `&self` chat requests are safe and
//! parallel tokio::spawn tasks share a single `Arc<LocalLlm>` with no Mutex.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tracing::{info, warn};

use crate::error::Result;
use crate::llm::LocalLlm;
use crate::types::{AgentType, PersonInput, ResearchState};

/// Raw data gathered by HTTP tools (before LLM synthesis).
struct GatheredData {
    key: &'static str,
    agent: AgentType,
    system_prompt: String,
    user_prompt: String,
}

/// Local-only pipeline runner.
pub struct Pipeline {
    local_llm: Arc<LocalLlm>,
}

impl Pipeline {
    pub fn new(local_llm: LocalLlm) -> Self {
        info!("Local-only mode: mistral.rs ({})", local_llm.model_name);
        Self {
            local_llm: Arc::new(local_llm),
        }
    }

    /// Run the full 3-phase pipeline.
    pub async fn run(&self, person: PersonInput) -> Result<ResearchState> {
        let start = Instant::now();
        let mut state = ResearchState {
            person: person.clone(),
            ..Default::default()
        };

        // ── Phase 1: Intelligence Gathering (fully parallel) ─────────────────
        info!("Phase 1: Intelligence Gathering ({} agents)", AgentType::PHASE1.len());
        let phase1_results = self.run_phase1(&person).await?;
        self.merge_results(&mut state, phase1_results);

        // ── Phase 2: Deep Analysis (fully parallel local) ────────────────────
        info!("Phase 2: Deep Analysis ({} agents)", AgentType::PHASE2.len());
        let phase2_results = self.run_phase2(&state).await?;
        self.merge_results(&mut state, phase2_results);

        // ── Phase 3: Synthesis (sequential — each depends on previous) ───────
        info!("Phase 3: Synthesis (eval → executive → questions)");
        self.run_phase3(&mut state).await?;

        let elapsed = start.elapsed();
        info!("Pipeline complete in {:.1}s", elapsed.as_secs_f64());

        Ok(state)
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Phase 1 — fully parallel: HTTP gather + LLM synthesize
    // ═════════════════════════════════════════════════════════════════════════

    async fn run_phase1(&self, person: &PersonInput) -> Result<HashMap<String, String>> {
        info!("  Phase 1a: {} HTTP gather tasks → tokio parallel", AgentType::PHASE1.len());
        let gather_start = Instant::now();

        let gathered = self.gather_all(person).await;

        let gather_elapsed = gather_start.elapsed();
        info!(
            "  Phase 1a complete: {} tasks in {:.1}s",
            gathered.len(),
            gather_elapsed.as_secs_f64()
        );

        let synth_start = Instant::now();
        info!(
            "  Phase 1b: {} LLM synthesis → local concurrent",
            gathered.len()
        );
        let results = self.synthesize_all_local(gathered).await;

        let synth_elapsed = synth_start.elapsed();
        info!("  Phase 1b complete in {:.1}s", synth_elapsed.as_secs_f64());

        Ok(results)
    }

    /// Run ALL HTTP gather tasks concurrently via tokio::spawn.
    async fn gather_all(&self, person: &PersonInput) -> Vec<GatheredData> {
        let p = person.clone();

        let web_handle = {
            let p = p.clone();
            tokio::spawn(async move { gather_web_research(&p).await })
        };
        let github_handle = {
            let p = p.clone();
            tokio::spawn(async move { gather_github(&p).await })
        };
        let orcid_handle = {
            let p = p.clone();
            tokio::spawn(async move { gather_orcid(&p).await })
        };
        let arxiv_handle = {
            let p = p.clone();
            tokio::spawn(async move { gather_arxiv(&p).await })
        };
        let podcast_handle = {
            let p = p.clone();
            tokio::spawn(async move { gather_podcast(&p).await })
        };
        let news_handle = {
            let p = p.clone();
            tokio::spawn(async move { gather_news(&p).await })
        };
        let hf_handle = {
            let p = p.clone();
            tokio::spawn(async move { gather_huggingface(&p).await })
        };
        let blog_handle = {
            let p = p.clone();
            tokio::spawn(async move { gather_blog(&p).await })
        };

        let (web, github, orcid, arxiv, podcast, news, hf, blog) = tokio::join!(
            web_handle,
            github_handle,
            orcid_handle,
            arxiv_handle,
            podcast_handle,
            news_handle,
            hf_handle,
            blog_handle,
        );

        let mut gathered = Vec::new();

        for (result, agent) in [
            (web, AgentType::WebResearch),
            (github, AgentType::GitHubAnalyst),
            (orcid, AgentType::OrcidAnalyst),
            (arxiv, AgentType::ArxivAnalyst),
            (podcast, AgentType::PodcastAnalyst),
            (news, AgentType::NewsAnalyst),
            (hf, AgentType::HuggingFaceAnalyst),
            (blog, AgentType::BlogAnalyst),
        ] {
            match result {
                Ok(Some(data)) => {
                    info!("  ✓ {} gathered ({} chars prompt)", agent.as_str(), data.user_prompt.len());
                    gathered.push(data);
                }
                Ok(None) => {
                    info!("  ⊘ {} skipped (no data source)", agent.as_str());
                }
                Err(e) => {
                    warn!("  ✗ {} gather failed: {e}", agent.as_str());
                }
            }
        }

        gathered
    }

    /// Synthesize ALL gathered data concurrently on the local model.
    async fn synthesize_all_local(
        &self,
        gathered: Vec<GatheredData>,
    ) -> HashMap<String, String> {
        let mut handles = Vec::new();

        for data in gathered {
            let llm = Arc::clone(&self.local_llm);
            let key = data.key.to_string();
            let name = data.agent.as_str().to_string();
            let system = data.system_prompt;
            let user = data.user_prompt;

            let handle = tokio::spawn(async move {
                let start = Instant::now();
                let result = llm.chat(&system, &user, 4096).await;
                let elapsed = start.elapsed();
                (key, name, result, elapsed)
            });
            handles.push(handle);
        }

        let mut results = HashMap::new();
        for handle in handles {
            match handle.await {
                Ok((key, name, Ok(data), elapsed)) => {
                    info!(
                        "  ✓ {name} synthesized ({} chars, {:.1}s)",
                        data.len(),
                        elapsed.as_secs_f64()
                    );
                    results.insert(key, data);
                }
                Ok((key, name, Err(e), _)) => {
                    warn!("  ✗ {name} synthesis failed: {e}");
                    results.insert(key, String::new());
                }
                Err(e) => {
                    warn!("  ✗ join error: {e}");
                }
            }
        }
        results
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Phase 2 — fully parallel synthesis on the local model
    // ═════════════════════════════════════════════════════════════════════════

    async fn run_phase2(&self, state: &ResearchState) -> Result<HashMap<String, String>> {
        info!(
            "  {} agents → local concurrent",
            AgentType::PHASE2.len()
        );

        let mut handles = Vec::new();
        for agent in AgentType::PHASE2 {
            let llm = Arc::clone(&self.local_llm);
            let state = state.clone();
            let agent = *agent;
            let handle = tokio::spawn(async move {
                let start = Instant::now();
                let (system, user) = synthesis_prompt(agent, &state);
                let result = llm.chat(&system, &user, 4096).await;
                let elapsed = start.elapsed();
                (agent.state_key().to_string(), result, agent.as_str(), elapsed)
            });
            handles.push(handle);
        }

        let mut results = HashMap::new();
        for handle in handles {
            match handle.await {
                Ok((key, Ok(data), name, elapsed)) => {
                    info!(
                        "  ✓ {name} ({} chars, {:.1}s)",
                        data.len(),
                        elapsed.as_secs_f64()
                    );
                    results.insert(key, data);
                }
                Ok((key, Err(e), name, _)) => {
                    warn!("  ✗ {name} failed: {e}");
                    results.insert(key, String::new());
                }
                Err(e) => {
                    warn!("  ✗ join error: {e}");
                }
            }
        }
        Ok(results)
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Phase 3 — sequential (each depends on previous)
    // ═════════════════════════════════════════════════════════════════════════

    async fn run_phase3(&self, state: &mut ResearchState) -> Result<()> {
        let agents = [
            AgentType::QualityEvaluator,
            AgentType::ExecutiveSynthesizer,
            AgentType::QuestionGenerator,
        ];

        for agent in agents {
            let key = agent.as_str();
            info!("  → {key}");
            let start = Instant::now();

            let (system, user) = synthesis_prompt(agent, state);
            let result = self.local_llm.chat(&system, &user, 8192).await;

            let elapsed = start.elapsed();
            match result {
                Ok(data) => {
                    info!("  ✓ {key} ({} chars, {:.1}s)", data.len(), elapsed.as_secs_f64());
                    let state_key = agent.state_key().to_string();
                    self.set_state_field(state, &state_key, data);
                }
                Err(e) => {
                    warn!("  ✗ {key} failed: {e}");
                }
            }
        }

        Ok(())
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Helpers
    // ═════════════════════════════════════════════════════════════════════════

    fn merge_results(&self, state: &mut ResearchState, results: HashMap<String, String>) {
        for (key, value) in results {
            self.set_state_field(state, &key, value);
        }
    }

    fn set_state_field(&self, state: &mut ResearchState, key: &str, value: String) {
        match key {
            "web_data" => state.web_data = value,
            "github_data" => state.github_data = value,
            "orcid_data" => state.orcid_data = value,
            "arxiv_data" => state.arxiv_data = value,
            "podcast_data" => state.podcast_data = value,
            "news_data" => state.news_data = value,
            "hf_data" => state.hf_data = value,
            "blog_data" => state.blog_data = value,
            "bio" => state.bio = value,
            "timeline" => state.timeline = value,
            "contributions" => state.contributions = value,
            "quotes" => state.quotes = value,
            "social" => state.social = value,
            "expertise" => state.expertise = value,
            "competitive" => state.competitive = value,
            "collaboration" => state.collaboration = value,
            "funding" => state.funding = value,
            "conference" => state.conference = value,
            "philosophy" => state.philosophy = value,
            "eval" => state.eval = value,
            "executive" => state.executive = value,
            "questions" => state.questions = value,
            _ => {}
        }
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// Phase 1a — HTTP gather functions (pure async, no LLM)
// ═════════════════════════════════════════════════════════════════════════════

async fn gather_web_research(person: &PersonInput) -> Option<GatheredData> {
    use crate::tools::web_search;

    let queries = vec![
        format!("{} {} {}", person.name, person.role, person.org),
        format!("{} interview podcast", person.name),
        format!("{} blog technical writing", person.name),
    ];

    let futs: Vec<_> = queries.iter().map(|q| web_search(q)).collect();
    let results = futures::future::join_all(futs).await;
    let raw: String = results.join("\n\n");

    Some(GatheredData {
        key: "web_data",
        agent: AgentType::WebResearch,
        system_prompt: "You are a web research specialist. Summarize the search results into a structured intelligence report about the person.".into(),
        user_prompt: format!(
            "Compile a research dossier on {} ({} at {}) from these search results:\n\n{}",
            person.name, person.role, person.org, &raw[..raw.len().min(6000)]
        ),
    })
}

async fn gather_github(person: &PersonInput) -> Option<GatheredData> {
    let username = person.github.as_deref().filter(|u| !u.is_empty())?;
    let data = crate::tools::github_profile(username).await;

    Some(GatheredData {
        key: "github_data",
        agent: AgentType::GitHubAnalyst,
        system_prompt: "You are a GitHub & open-source analyst. Analyze the profile and repos.".into(),
        user_prompt: format!("Analyze this GitHub profile for {}:\n\n{}", person.name, data),
    })
}

async fn gather_orcid(person: &PersonInput) -> Option<GatheredData> {
    let orcid = person.orcid.as_deref().filter(|o| !o.is_empty())?;
    let data = crate::tools::orcid_works(orcid).await;

    Some(GatheredData {
        key: "orcid_data",
        agent: AgentType::OrcidAnalyst,
        system_prompt: "You are an academic publications analyst. Extract publication records.".into(),
        user_prompt: format!(
            "Analyze ORCID publications for {}:\n\n{}",
            person.name, &data[..data.len().min(6000)]
        ),
    })
}

async fn gather_arxiv(person: &PersonInput) -> Option<GatheredData> {
    let (arxiv, scholar) = tokio::join!(
        crate::tools::arxiv_search(&person.name, 10),
        crate::tools::semantic_scholar_search(&person.name),
    );

    let combined = format!("=== arXiv ===\n{arxiv}\n\n=== Semantic Scholar ===\n{scholar}");

    Some(GatheredData {
        key: "arxiv_data",
        agent: AgentType::ArxivAnalyst,
        system_prompt: "You are an academic research analyst. Analyze papers, citations, and impact.".into(),
        user_prompt: format!(
            "Analyze academic output for {}:\n\n{}",
            person.name, &combined[..combined.len().min(8000)]
        ),
    })
}

async fn gather_podcast(person: &PersonInput) -> Option<GatheredData> {
    let data = crate::tools::web_search(
        &format!("{} podcast interview appearance", person.name),
    ).await;

    Some(GatheredData {
        key: "podcast_data",
        agent: AgentType::PodcastAnalyst,
        system_prompt: "You are a podcast & media analyst. Extract podcast appearances and key discussion points.".into(),
        user_prompt: format!("Find podcast appearances for {}:\n\n{}", person.name, data),
    })
}

async fn gather_news(person: &PersonInput) -> Option<GatheredData> {
    let data = crate::tools::web_search(
        &format!("{} {} news announcement", person.name, person.org),
    ).await;

    Some(GatheredData {
        key: "news_data",
        agent: AgentType::NewsAnalyst,
        system_prompt: "You are a news & press analyst. Extract recent news and press coverage.".into(),
        user_prompt: format!("Find news coverage for {}:\n\n{}", person.name, data),
    })
}

async fn gather_huggingface(person: &PersonInput) -> Option<GatheredData> {
    let username = person.github.as_deref().unwrap_or(&person.slug);
    let data = crate::tools::fetch_url(
        &format!("https://huggingface.co/{username}"),
    ).await;

    Some(GatheredData {
        key: "hf_data",
        agent: AgentType::HuggingFaceAnalyst,
        system_prompt: "You are a HuggingFace & model registry analyst. Extract models, datasets, and spaces.".into(),
        user_prompt: format!(
            "Analyze HuggingFace presence for {}:\n\n{}",
            person.name, &data[..data.len().min(6000)]
        ),
    })
}

async fn gather_blog(person: &PersonInput) -> Option<GatheredData> {
    let blog_url = person.blog_url.as_deref().filter(|u| !u.is_empty())?;
    let data = crate::tools::fetch_url(blog_url).await;

    Some(GatheredData {
        key: "blog_data",
        agent: AgentType::BlogAnalyst,
        system_prompt: "You are a blog & writing analyst. Extract blog post topics, themes, and writing patterns.".into(),
        user_prompt: format!(
            "Analyze the blog at {} for {}:\n\n{}",
            blog_url, person.name, &data[..data.len().min(8000)]
        ),
    })
}

// ═════════════════════════════════════════════════════════════════════════════
// Synthesis prompts (Phase 2/3)
// ═════════════════════════════════════════════════════════════════════════════

fn ctx_block(label: &str, data: &str) -> String {
    if data.is_empty() {
        String::new()
    } else {
        format!("\n=== {label} ===\n{}\n", &data[..data.len().min(3000)])
    }
}

fn synthesis_prompt(agent: AgentType, state: &ResearchState) -> (String, String) {
    let ctx = format!(
        "{} ({} @ {})",
        state.person.name, state.person.role, state.person.org
    );

    let all_intel = format!(
        "{}{}{}{}{}{}{}{}",
        ctx_block("Web Research", &state.web_data),
        ctx_block("GitHub", &state.github_data),
        ctx_block("ORCID", &state.orcid_data),
        ctx_block("arXiv/Scholar", &state.arxiv_data),
        ctx_block("Podcast/Media", &state.podcast_data),
        ctx_block("News", &state.news_data),
        ctx_block("HuggingFace", &state.hf_data),
        ctx_block("Blog", &state.blog_data),
    );

    let all_analysis = format!(
        "{}{}{}{}{}{}{}{}{}{}{}",
        ctx_block("Biography", &state.bio),
        ctx_block("Timeline", &state.timeline),
        ctx_block("Contributions", &state.contributions),
        ctx_block("Quotes", &state.quotes),
        ctx_block("Social", &state.social),
        ctx_block("Expertise", &state.expertise),
        ctx_block("Competitive", &state.competitive),
        ctx_block("Collaboration", &state.collaboration),
        ctx_block("Funding", &state.funding),
        ctx_block("Conference", &state.conference),
        ctx_block("Philosophy", &state.philosophy),
    );

    match agent {
        AgentType::BiographyWriter => (
            "You are a biography writer. Synthesize a compelling career narrative.".into(),
            format!("Write a 3-paragraph biography for {ctx}:\n{all_intel}"),
        ),
        AgentType::TimelineArchitect => (
            "You are a timeline architect. Extract chronological events as JSON.".into(),
            format!("Create a timeline for {ctx}. Output JSON array of {{\"date\": \"YYYY-MM\", \"event\": \"...\", \"url\": \"...\"}}:\n{all_intel}"),
        ),
        AgentType::ContributionsAnalyst => (
            "You are a technical contributions analyst. Identify impactful projects and papers.".into(),
            format!("List key technical contributions for {ctx}. Output JSON array of {{\"title\": \"...\", \"description\": \"...\", \"url\": \"...\", \"impact\": \"...\"}}:\n{all_intel}"),
        ),
        AgentType::QuoteSpecialist => (
            "You are a quote specialist. Find verbatim quotes with sources.".into(),
            format!("Extract notable quotes from {ctx}. Output JSON array of {{\"text\": \"...\", \"source\": \"...\", \"date\": \"...\"}}:\n{all_intel}"),
        ),
        AgentType::SocialMapper => (
            "You are a social & digital presence mapper. Find all public profiles.".into(),
            format!("Map digital presence for {ctx}. Output JSON array of {{\"platform\": \"...\", \"url\": \"...\"}}:\n{all_intel}"),
        ),
        AgentType::ExpertiseDomainAnalyst => (
            "You are an expertise domain analyst. Extract specific topic areas.".into(),
            format!("Identify expertise domains for {ctx}. Output JSON array of topic strings:\n{all_intel}"),
        ),
        AgentType::CompetitiveLandscape => (
            "You are a competitive landscape analyst. Position this person in the industry ecosystem.".into(),
            format!("Analyze competitive landscape for {ctx}:\n{all_intel}"),
        ),
        AgentType::CollaborationNetwork => (
            "You are a collaboration network analyst. Map co-authors, co-founders, mentors.".into(),
            format!("Map collaboration network for {ctx}:\n{all_intel}"),
        ),
        AgentType::FundingAnalyst => (
            "You are a funding & business analyst. Extract funding, revenue, and business milestones.".into(),
            format!("Analyze business/funding for {ctx}:\n{all_intel}"),
        ),
        AgentType::ConferenceAnalyst => (
            "You are a conference & speaking analyst. Extract keynotes, talks, panels.".into(),
            format!("Find conference appearances for {ctx}:\n{all_intel}"),
        ),
        AgentType::PhilosophyAnalyst => (
            "You are a technical philosophy analyst. Extract core beliefs, stances, predictions.".into(),
            format!("Analyze technical philosophy for {ctx}:\n{all_intel}"),
        ),
        AgentType::QualityEvaluator => (
            "You are a research quality evaluator. Score 5 dimensions: completeness, accuracy, depth, source quality, overall (each 1-10).".into(),
            format!("Evaluate research quality for {ctx}. Output JSON {{\"completeness\": N, \"accuracy\": N, \"depth\": N, \"source_quality\": N, \"overall\": N, \"summary\": \"...\"}}:\n{all_analysis}"),
        ),
        AgentType::ExecutiveSynthesizer => (
            "You are an executive summary synthesizer. Output a JSON object with these fields: one_liner (one sentence), key_facts (array of 5-8 bullet strings), career_arc (2-3 sentence narrative), current_focus (1-2 sentences), industry_significance (1-2 sentences), confidence_level (\"high\"/\"medium\"/\"low\"). Output ONLY valid JSON, no markdown.".into(),
            format!("Synthesize executive summary for {ctx}. Output ONLY a JSON object:\n{all_analysis}"),
        ),
        AgentType::QuestionGenerator => {
            let categories = get_question_categories(&state.person.slug);
            (
                "You are an expert podcast interviewer who has read everything this person has written. Generate probing, specific questions that reference their actual work — blog posts by name, specific projects, technical decisions they made. Never ask generic questions that could apply to anyone. Each question should make the interviewee think 'this person really did their homework.' Output ONLY a JSON array, no markdown.".into(),
                format!(
                    "Generate {count} interview questions for {ctx} ({per} per category).\n\nCategories (use these exact category keys):\n{cats}\n\nOutput JSON array of {{\"category\": \"...\", \"question\": \"...\", \"why_this_question\": \"...\", \"expected_insight\": \"...\"}}:\n{all_analysis}",
                    count = categories.len() * 2,
                    per = 2,
                    cats = categories.iter().map(|(k, desc)| format!("- {k}: {desc}")).collect::<Vec<_>>().join("\n"),
                ),
            )
        },
        _ => ("".into(), "".into()),
    }
}

/// Per-person question categories.
fn get_question_categories(slug: &str) -> Vec<(&'static str, &'static str)> {
    match slug {
        "athos-georgiou" => vec![
            ("origin", "Founding NCA, career transition from telescope infrastructure to AI"),
            ("technical_depth", "Snappy architecture, ColPali/ColQwen, patch-to-region propagation"),
            ("philosophy", "Responsible AI, 'raising AI' parent-child metaphor, GenAI limitations"),
            ("collaboration", "Claude Code ecosystem, kimchi-cult, open-source community"),
            ("future", "Enterprise AI adoption, AMD GPU scaling, vision-language retrieval roadmap"),
            ("vision_retrieval", "ColPali, ColQwen models, late interaction, document understanding"),
            ("graph_rag", "Qdrant, Neo4j, Ollama, knowledge graphs, dynamic ontology"),
            ("gpu_optimization", "AMD Instinct MI325X, inference benchmarking, dtype/memory tricks"),
            ("observability", "Grafana Alloy, OpenTelemetry, Prometheus, production monitoring"),
            ("responsible_ai", "Ethics, AI consciousness debate, enterprise adoption gaps"),
            ("full_stack_ai", "RAG pipelines, Pinecone, Next.js integration, vision RAG templates"),
            ("model_training", "ColQwen3.5 fine-tuning, Vidore benchmark, diminishing returns"),
            ("building_in_public", "Blogging journey from 2023, open-source evolution, community building"),
        ],
        _ => vec![
            ("origin", "Founding story, career path, what led them here"),
            ("technical_depth", "Architecture decisions, technical trade-offs, implementation details"),
            ("philosophy", "Core beliefs about technology, industry predictions, contrarian takes"),
            ("collaboration", "Key partnerships, team dynamics, community engagement"),
            ("future", "What they're building next, industry trends, long-term vision"),
        ],
    }
}
