//! Pipeline orchestrator — fully parallel dual-lane execution.
//!
//! Phase 1a: ALL HTTP tool calls run concurrently (8 agents' fetches in parallel).
//! Phase 1b: ALL LLM synthesis calls run concurrently on HF 72B (or sequential on Candle).
//! Phase 2:  ALL 11 analysis agents run concurrently on HF 72B.
//! Phase 3:  Eval → executive → questions (sequential, each depends on previous).

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Mutex;
use tracing::{info, warn};

use crate::error::Result;
use crate::hf_client::HfClient;
use crate::llm::LocalLlm;
use crate::types::{AgentType, PersonInput, ResearchState};

/// Raw data gathered by HTTP tools (before LLM synthesis).
struct GatheredData {
    key: &'static str,
    agent: AgentType,
    system_prompt: String,
    user_prompt: String,
}

/// Dual-lane pipeline runner.
pub struct Pipeline {
    local_llm: Arc<Mutex<LocalLlm>>,
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

        // ── Phase 1: Intelligence Gathering (fully parallel) ─────────────────
        info!("Phase 1: Intelligence Gathering ({} agents)", AgentType::PHASE1.len());
        let phase1_results = self.run_phase1(&person).await?;
        self.merge_results(&mut state, phase1_results);

        // ── Phase 2: Deep Analysis (fully parallel on HF 72B) ────────────────
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
        // 1a: ALL HTTP fetches run concurrently
        info!("  Phase 1a: {} HTTP gather tasks → tokio parallel", AgentType::PHASE1.len());
        let gather_start = Instant::now();

        let gathered = self.gather_all(person).await;

        let gather_elapsed = gather_start.elapsed();
        info!(
            "  Phase 1a complete: {} tasks in {:.1}s",
            gathered.len(),
            gather_elapsed.as_secs_f64()
        );

        // 1b: ALL LLM synthesis calls
        let synth_start = Instant::now();

        let results = if let Some(hf) = &self.hf_client {
            // Concurrent on HF 72B
            info!(
                "  Phase 1b: {} LLM synthesis → HF 72B concurrent",
                gathered.len()
            );
            self.synthesize_all_hf(hf, gathered).await
        } else {
            // Sequential on Candle local
            info!(
                "  Phase 1b: {} LLM synthesis → Candle local (sequential)",
                gathered.len()
            );
            self.synthesize_all_local(gathered).await
        };

        let synth_elapsed = synth_start.elapsed();
        info!("  Phase 1b complete in {:.1}s", synth_elapsed.as_secs_f64());

        Ok(results)
    }

    /// Run ALL HTTP gather tasks concurrently via tokio::spawn.
    async fn gather_all(&self, person: &PersonInput) -> Vec<GatheredData> {
        let p = person.clone();

        // Spawn all HTTP gather tasks concurrently
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

        // Await all concurrently
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

    /// Synthesize ALL gathered data concurrently on HF 72B.
    async fn synthesize_all_hf(
        &self,
        hf: &HfClient,
        gathered: Vec<GatheredData>,
    ) -> HashMap<String, String> {
        let mut handles = Vec::new();

        for data in gathered {
            let hf = hf.clone();
            let key = data.key.to_string();
            let name = data.agent.as_str().to_string();
            let system = data.system_prompt;
            let user = data.user_prompt;

            let handle = tokio::spawn(async move {
                let start = Instant::now();
                let result = hf.chat(&system, &user, 4096).await;
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
                        "  ✓ {name} synthesized ({} chars, {:.1}s) ← HF",
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

    /// Synthesize ALL gathered data sequentially on Candle local.
    async fn synthesize_all_local(
        &self,
        gathered: Vec<GatheredData>,
    ) -> HashMap<String, String> {
        let mut results = HashMap::new();

        for data in gathered {
            let name = data.agent.as_str();
            info!("  → {name} (Candle)");
            let start = Instant::now();

            let mut llm = self.local_llm.lock().await;
            let result = llm.chat(&data.system_prompt, &data.user_prompt, 4096);
            drop(llm);

            let elapsed = start.elapsed();
            match result {
                Ok(text) => {
                    info!(
                        "  ✓ {name} ({} chars, {:.1}s)",
                        text.len(),
                        elapsed.as_secs_f64()
                    );
                    results.insert(data.key.to_string(), text);
                }
                Err(e) => {
                    warn!("  ✗ {name} failed: {e}");
                    results.insert(data.key.to_string(), String::new());
                }
            }
        }
        results
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Phase 2 — fully parallel synthesis on HF 72B
    // ═════════════════════════════════════════════════════════════════════════

    async fn run_phase2(&self, state: &ResearchState) -> Result<HashMap<String, String>> {
        if let Some(hf) = &self.hf_client {
            info!(
                "  {} agents → HF 72B concurrent",
                AgentType::PHASE2.len()
            );

            let mut handles = Vec::new();
            for agent in AgentType::PHASE2 {
                let hf = hf.clone();
                let state = state.clone();
                let handle = tokio::spawn(async move {
                    let start = Instant::now();
                    let (system, user) = synthesis_prompt(*agent, &state);
                    let result = hf.chat(&system, &user, 4096).await;
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
                            "  ✓ {name} ({} chars, {:.1}s) ← HF",
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
        } else {
            info!(
                "  {} agents → Candle local (sequential)",
                AgentType::PHASE2.len()
            );

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
