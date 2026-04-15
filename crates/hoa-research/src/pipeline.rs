//! Pipeline orchestrator — dual-lane parallel execution.
//!
//! Phase 1: Tool-heavy agents run on Candle local (sequential, needs tool calling)
//!          BUT HTTP tool calls themselves are parallel via tokio.
//! Phase 2: Synthesis agents run on HF 72B (concurrent via tokio::join_all).
//! Phase 3: Eval + exec + questions on HF 72B (sequential, depend on each other).

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Mutex;
use tracing::{info, warn};

use crate::error::Result;
use crate::hf_client::HfClient;
use crate::llm::LocalLlm;
use crate::types::{AgentType, PersonInput, ResearchState};

/// Dual-lane pipeline runner.
pub struct Pipeline {
    /// Local Candle LLM (Qwen2.5-7B on Metal) — behind Mutex for &mut self.
    local_llm: Arc<Mutex<LocalLlm>>,
    /// Remote HF client (72B) — Clone-able, concurrent.
    hf_client: Option<HfClient>,
}

impl Pipeline {
    pub fn new(local_llm: LocalLlm, hf_client: Option<HfClient>) -> Self {
        let mode = if hf_client.is_some() {
            "Dual-lane: Candle local + HF 72B"
        } else {
            "Single-lane: Candle local only"
        };
        info!("{mode}");
        Self {
            local_llm: Arc::new(Mutex::new(local_llm)),
            hf_client,
        }
    }

    /// Run the full 3-phase pipeline.
    pub async fn run(&self, person: PersonInput) -> Result<ResearchState> {
        let start = Instant::now();
        let mut state = ResearchState {
            person: person.clone(),
            ..Default::default()
        };

        // ── Phase 1: Intelligence Gathering ──────────────────────────────────
        info!("Phase 1: Intelligence Gathering ({} agents)", AgentType::PHASE1.len());
        let phase1_results = self.run_phase1(&person).await?;
        self.merge_results(&mut state, phase1_results);

        // ── Phase 2: Deep Analysis ───────────────────────────────────────────
        info!("Phase 2: Deep Analysis ({} agents)", AgentType::PHASE2.len());
        let phase2_results = self.run_phase2(&state).await?;
        self.merge_results(&mut state, phase2_results);

        // ── Phase 3: Synthesis ───────────────────────────────────────────────
        info!("Phase 3: Synthesis (eval → executive → questions)");
        self.run_phase3(&mut state).await?;

        let elapsed = start.elapsed();
        info!("Pipeline complete in {:.1}s", elapsed.as_secs_f64());

        Ok(state)
    }

    /// Phase 1: Tool-heavy agents. Each agent calls HTTP tools, then synthesizes with LLM.
    /// HTTP tool calls are parallel; LLM calls are sequential (single GPU).
    async fn run_phase1(&self, person: &PersonInput) -> Result<HashMap<String, String>> {
        let mut results = HashMap::new();

        for agent in AgentType::PHASE1 {
            let key = agent.as_str();
            info!("  → {key}");
            let start = Instant::now();

            let result = match agent {
                AgentType::WebResearch => self.agent_web_research(person).await,
                AgentType::GitHubAnalyst => self.agent_github(person).await,
                AgentType::OrcidAnalyst => self.agent_orcid(person).await,
                AgentType::ArxivAnalyst => self.agent_arxiv(person).await,
                AgentType::PodcastAnalyst => self.agent_podcast(person).await,
                AgentType::NewsAnalyst => self.agent_news(person).await,
                AgentType::HuggingFaceAnalyst => self.agent_huggingface(person).await,
                AgentType::BlogAnalyst => self.agent_blog(person).await,
                _ => Ok(String::new()),
            };

            let elapsed = start.elapsed();
            match result {
                Ok(data) => {
                    info!("  ✓ {key} ({} chars, {:.1}s)", data.len(), elapsed.as_secs_f64());
                    results.insert(agent.state_key().to_string(), data);
                }
                Err(e) => {
                    warn!("  ✗ {key} failed: {e}");
                    results.insert(agent.state_key().to_string(), String::new());
                }
            }
        }

        Ok(results)
    }

    /// Phase 2: Synthesis agents. No tools — pure LLM.
    /// If HF client available: all agents run concurrently via tokio::join_all.
    /// Otherwise: sequential on local LLM.
    async fn run_phase2(&self, state: &ResearchState) -> Result<HashMap<String, String>> {
        if let Some(hf) = &self.hf_client {
            // Concurrent on HF 72B
            info!("  Dual-lane: {} agents → HF 72B concurrent", AgentType::PHASE2.len());

            let mut handles = Vec::new();
            for agent in AgentType::PHASE2 {
                let hf = hf.clone();
                let state = state.clone();
                let handle = tokio::spawn(async move {
                    let start = Instant::now();
                    let result = run_synthesis_agent_hf(&hf, *agent, &state).await;
                    let elapsed = start.elapsed();
                    (agent.state_key().to_string(), result, agent.as_str(), elapsed)
                });
                handles.push(handle);
            }

            let mut results = HashMap::new();
            for handle in handles {
                match handle.await {
                    Ok((key, Ok(data), name, elapsed)) => {
                        info!("  ✓ {name} ({} chars, {:.1}s) ← HF", data.len(), elapsed.as_secs_f64());
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
        } else {
            // Sequential on local LLM
            info!("  Single-lane: {} agents → Candle local (sequential)", AgentType::PHASE2.len());

            let mut results = HashMap::new();
            for agent in AgentType::PHASE2 {
                let key = agent.as_str();
                info!("  → {key}");
                let start = Instant::now();

                let (system, user) = synthesis_prompt(*agent, state);
                let mut llm = self.local_llm.lock().await;
                let result = llm.chat(&system, &user, 4096);
                drop(llm);

                let elapsed = start.elapsed();
                match result {
                    Ok(data) => {
                        info!("  ✓ {key} ({} chars, {:.1}s)", data.len(), elapsed.as_secs_f64());
                        results.insert(agent.state_key().to_string(), data);
                    }
                    Err(e) => {
                        warn!("  ✗ {key} failed: {e}");
                        results.insert(agent.state_key().to_string(), String::new());
                    }
                }
            }
            Ok(results)
        }
    }

    /// Phase 3: Sequential synthesis — eval, executive, questions.
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
            let result = if let Some(hf) = &self.hf_client {
                hf.chat(&system, &user, 8192).await
            } else {
                let mut llm = self.local_llm.lock().await;
                llm.chat(&system, &user, 8192)
            };

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

// ── Phase 1 agent implementations ───────────────────────────────────────────

impl Pipeline {
    async fn agent_web_research(&self, person: &PersonInput) -> Result<String> {
        use crate::tools::web_search;

        let queries = vec![
            format!("{} {} {}", person.name, person.role, person.org),
            format!("{} interview podcast", person.name),
            format!("{} blog technical writing", person.name),
        ];

        // Run all searches concurrently
        let search_futures: Vec<_> = queries.iter().map(|q| web_search(q)).collect();
        let search_results = futures::future::join_all(search_futures).await;

        let raw_data: String = search_results.into_iter().collect::<Vec<_>>().join("\n\n");

        // Synthesize with LLM
        let system = "You are a web research specialist. Summarize the search results into a structured intelligence report about the person.";
        let user = format!(
            "Compile a research dossier on {} ({} at {}) from these search results:\n\n{}",
            person.name, person.role, person.org, &raw_data[..raw_data.len().min(6000)]
        );

        let mut llm = self.local_llm.lock().await;
        llm.chat(system, &user, 4096)
    }

    async fn agent_github(&self, person: &PersonInput) -> Result<String> {
        let username = match &person.github {
            Some(u) if !u.is_empty() => u.clone(),
            _ => return Ok("(no GitHub username)".into()),
        };

        let data = crate::tools::github_profile(&username).await;

        let system = "You are a GitHub & open-source analyst. Analyze the profile and repos.";
        let user = format!(
            "Analyze this GitHub profile for {}:\n\n{}",
            person.name, data
        );

        let mut llm = self.local_llm.lock().await;
        llm.chat(system, &user, 4096)
    }

    async fn agent_orcid(&self, person: &PersonInput) -> Result<String> {
        let orcid = match &person.orcid {
            Some(o) if !o.is_empty() => o.clone(),
            _ => return Ok("(no ORCID)".into()),
        };

        let data = crate::tools::orcid_works(&orcid).await;

        let system = "You are an academic publications analyst. Extract publication records.";
        let user = format!(
            "Analyze ORCID publications for {}:\n\n{}",
            person.name, &data[..data.len().min(6000)]
        );

        let mut llm = self.local_llm.lock().await;
        llm.chat(system, &user, 4096)
    }

    async fn agent_arxiv(&self, person: &PersonInput) -> Result<String> {
        // Run arXiv + Semantic Scholar concurrently
        let (arxiv, scholar) = tokio::join!(
            crate::tools::arxiv_search(&person.name, 10),
            crate::tools::semantic_scholar_search(&person.name),
        );

        let combined = format!("=== arXiv ===\n{arxiv}\n\n=== Semantic Scholar ===\n{scholar}");

        let system = "You are an academic research analyst. Analyze papers, citations, and impact.";
        let user = format!(
            "Analyze academic output for {}:\n\n{}",
            person.name, &combined[..combined.len().min(8000)]
        );

        let mut llm = self.local_llm.lock().await;
        llm.chat(system, &user, 4096)
    }

    async fn agent_podcast(&self, person: &PersonInput) -> Result<String> {
        let data = crate::tools::web_search(
            &format!("{} podcast interview appearance", person.name),
        )
        .await;

        let system = "You are a podcast & media analyst. Extract podcast appearances and key discussion points.";
        let user = format!(
            "Find podcast appearances for {}:\n\n{}",
            person.name, data
        );

        let mut llm = self.local_llm.lock().await;
        llm.chat(system, &user, 4096)
    }

    async fn agent_news(&self, person: &PersonInput) -> Result<String> {
        let data = crate::tools::web_search(
            &format!("{} {} news announcement", person.name, person.org),
        )
        .await;

        let system = "You are a news & press analyst. Extract recent news and press coverage.";
        let user = format!(
            "Find news coverage for {}:\n\n{}",
            person.name, data
        );

        let mut llm = self.local_llm.lock().await;
        llm.chat(system, &user, 2048)
    }

    async fn agent_huggingface(&self, person: &PersonInput) -> Result<String> {
        let username = person.github.as_deref().unwrap_or(&person.slug);
        let data = crate::tools::fetch_url(
            &format!("https://huggingface.co/{username}"),
        )
        .await;

        let system = "You are a HuggingFace & model registry analyst. Extract models, datasets, and spaces.";
        let user = format!(
            "Analyze HuggingFace presence for {}:\n\n{}",
            person.name, &data[..data.len().min(6000)]
        );

        let mut llm = self.local_llm.lock().await;
        llm.chat(system, &user, 2048)
    }

    async fn agent_blog(&self, person: &PersonInput) -> Result<String> {
        let blog_url = match &person.blog_url {
            Some(u) if !u.is_empty() => u.clone(),
            _ => return Ok("(no blog URL)".into()),
        };

        let data = crate::tools::fetch_url(&blog_url).await;

        let system = "You are a blog & writing analyst. Extract blog post topics, themes, and writing patterns.";
        let user = format!(
            "Analyze the blog at {} for {}:\n\n{}",
            blog_url, person.name, &data[..data.len().min(8000)]
        );

        let mut llm = self.local_llm.lock().await;
        llm.chat(system, &user, 4096)
    }
}

// ── Phase 2/3 synthesis prompts ─────────────────────────────────────────────

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
            "You are an executive summary synthesizer. Produce the final comprehensive profile.".into(),
            format!("Synthesize executive summary for {ctx}:\n{all_analysis}"),
        ),
        AgentType::QuestionGenerator => (
            "You are an expert podcast interviewer. Generate probing, specific interview questions.".into(),
            format!(
                "Generate 26 interview questions for {ctx} (2 per category). Output JSON array of {{\"category\": \"...\", \"question\": \"...\", \"why_this_question\": \"...\", \"expected_insight\": \"...\"}}:\n{all_analysis}"
            ),
        ),
        _ => ("".into(), "".into()),
    }
}

/// Run a synthesis agent on HF 72B (for concurrent Phase 2 execution).
async fn run_synthesis_agent_hf(
    hf: &HfClient,
    agent: AgentType,
    state: &ResearchState,
) -> Result<String> {
    let (system, user) = synthesis_prompt(agent, state);
    hf.chat(&system, &user, 4096).await
}
