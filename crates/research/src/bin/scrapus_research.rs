/// Deep research binary for the Scrapus lead-generation pipeline.
///
/// Reads every `module-*/README.md` under the scrapus directory, loads any
/// existing `RESEARCH.md` as prior context, launches parallel research agents
/// that go deeper into gaps, and writes `DEEP_RESEARCH.md` alongside each README.
use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskStatus, TeamConfig, TeamLead};
use research::tools::SearchToolConfig;

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";
const SCRAPUS_DIR: &str =
    "/Users/vadimnicolai/Public/ai-apps/apps/lead-gen/scrapus";

/// Module data: (name, path, readme, prior_research).
struct Module {
    name: String,
    path: String,
    readme: String,
    prior: Option<String>,
}

/// Discovers module-* directories, reads READMEs and existing RESEARCH.md.
fn discover_modules(scrapus_root: &str) -> Result<Vec<Module>> {
    let mut modules = Vec::new();
    let dir = std::fs::read_dir(scrapus_root)
        .with_context(|| format!("reading {scrapus_root}"))?;

    for entry in dir {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.starts_with("module-") || !entry.file_type()?.is_dir() {
            continue;
        }
        let readme_path = entry.path().join("README.md");
        let readme = std::fs::read_to_string(&readme_path)
            .with_context(|| format!("reading {}", readme_path.display()))?;

        let research_path = entry.path().join("RESEARCH.md");
        let prior = std::fs::read_to_string(&research_path).ok();

        let full_path = entry.path().to_string_lossy().to_string();
        modules.push(Module { name, path: full_path, readme, prior });
    }

    modules.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(modules)
}

/// Truncate prior research to fit in context — keep first N chars.
fn truncate_prior(prior: &str, max_chars: usize) -> &str {
    if prior.len() <= max_chars {
        return prior;
    }
    let boundary = prior[..max_chars]
        .rfind("\n## ")
        .or_else(|| prior[..max_chars].rfind("\n\n"))
        .unwrap_or(max_chars);
    &prior[..boundary]
}

fn research_tasks(modules: &[Module]) -> Vec<ResearchTask> {
    let system_ctx = "This is a SECOND-PASS deep research iteration on the Scrapus pipeline — \
        a fully local B2B lead generation system (SQLite graph, LanceDB vectors, ChromaDB embeddings). \
        A first-round literature review and implementation guide already exist (provided as PRIOR FINDINGS). \
        Your job is to GO DEEPER: find papers the first round MISSED, identify 2024-2026 advances, \
        propose concrete architectural upgrades with pseudocode, and challenge assumptions. \
        Do NOT repeat what the prior findings already cover — instead cite NEW papers, \
        newer techniques, and provide quantitative comparisons. \
        IMPORTANT: For every paper, include full citation with clickable link — \
        Semantic Scholar URL or DOI link (`https://doi.org/{doi}`). \
        Format: **Author et al. (Year)** [Title](url). Include References section.";

    let mut tasks = Vec::new();
    let n = modules.len();

    // ═══════════════════════════════════════════════════════════════════════
    // All per-module tasks run in parallel (no dependencies)
    // ═══════════════════════════════════════════════════════════════════════
    for (i, m) in modules.iter().enumerate() {
        let prior_ctx = m.prior.as_deref()
            .map(|p| truncate_prior(p, 6000))
            .unwrap_or("(no prior research available)");

        // ── Deep-dive literature (ID i+1) ───────────────────────────────
        let (subject, description, preamble) =
            deep_literature_task(&m.name, &m.readme, prior_ctx, system_ctx);
        tasks.push(ResearchTask {
            id: i + 1,
            subject,
            description,
            preamble,
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            ..Default::default()
        });

        // ── Upgrade blueprint (ID n+i+1) ────────────────────────────────
        let (subject, description, preamble) =
            upgrade_blueprint_task(&m.name, &m.readme, prior_ctx, system_ctx);
        tasks.push(ResearchTask {
            id: n + i + 1,
            subject,
            description,
            preamble,
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            ..Default::default()
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Grand synthesis — depends on all
    // ═══════════════════════════════════════════════════════════════════════
    let synthesis_id = 2 * n + 1;
    let all_ids: Vec<usize> = (1..=2 * n).collect();
    tasks.push(ResearchTask {
        id: synthesis_id,
        subject: "deep-pipeline-synthesis".into(),
        description: format!(
            "Synthesise all deep-dive research into a DEFINITIVE upgrade plan for Scrapus. \
            Structure as:\n\
            1. **Critical Upgrades** — must-do changes with expected metric lifts\n\
            2. **Architecture Evolution** — from current to next-gen (with migration path)\n\
            3. **Paper-Backed Evidence** — each recommendation linked to specific papers\n\
            4. **Quantitative Targets** — concrete before/after metrics per module\n\
            5. **Risk Analysis** — what could go wrong with each upgrade\n\
            6. **Implementation Order** — dependency graph of upgrades\n\
            {system_ctx}"
        ),
        preamble: "You are a principal ML architect producing the definitive upgrade \
            blueprint for a production lead-generation pipeline. Be specific, quantitative, \
            and cite papers for every recommendation."
            .into(),
        status: TaskStatus::Pending,
        owner: None,
        dependencies: all_ids,
        ..Default::default()
    });

    tasks
}

fn deep_literature_task(name: &str, readme: &str, prior: &str, ctx: &str) -> (String, String, String) {
    match name {
        "module-0-system-overview" => (
            "deep-system-architecture".into(),
            format!(
                "PRIOR FINDINGS (first-round research — do NOT repeat, go deeper):\n\
                {prior}\n\n---\n\n\
                MODULE README:\n```\n{readme}\n```\n\n\
                DEEP-DIVE TARGETS:\n\
                (1) DuckDB vs SQLite for analytical graph queries — 2024-2025 benchmarks on ML workloads,\n\
                (2) Lance format v2 — columnar storage advances over Arrow-native LanceDB,\n\
                (3) Qdrant/Milvus-lite as ChromaDB alternatives — local-first vector DB comparison 2024-2026,\n\
                (4) MLflow/DVC for local experiment tracking — reproducibility in file-based pipelines,\n\
                (5) ONNX Runtime + TensorRT-LLM for local model serving — latest throughput numbers,\n\
                (6) containerised local stacks (Docker Compose) vs bare-metal — startup latency, GPU passthrough,\n\
                (7) unified storage: can LanceDB replace both ChromaDB and SQLite? — schema flexibility studies.\n\
                Search for papers published 2024-2026. {ctx}"
            ),
            "You are an ML infrastructure researcher tracking cutting-edge local-first \
                deployment patterns. Go beyond standard surveys — find benchmarks, \
                comparison studies, and architecture migration papers."
                .into(),
        ),
        "module-1-crawler" => (
            "deep-rl-crawling".into(),
            format!(
                "PRIOR FINDINGS:\n{prior}\n\n---\n\nMODULE README:\n```\n{readme}\n```\n\n\
                DEEP-DIVE TARGETS:\n\
                (1) Decision Transformer / offline RL for crawling — replacing DQN with sequence modeling,\n\
                (2) PPO vs DQN for URL selection — 2023-2026 comparisons in sequential decision problems,\n\
                (3) contextual bandits (LinUCB, NeuralUCB) vs UCB1 for domain scheduling,\n\
                (4) GNN-based state representation — modeling the web graph structure directly,\n\
                (5) curriculum learning for crawler training — progressive difficulty,\n\
                (6) sim-to-real for web crawling — synthetic web graph simulators for pre-training,\n\
                (7) reward shaping — intrinsic curiosity module for discovering novel lead-rich domains.\n\
                Find papers 2023-2026 only. {ctx}"
            ),
            "You are a reinforcement learning researcher at the frontier of RL applied \
                to information retrieval. Focus on post-2023 advances that supersede DQN."
                .into(),
        ),
        "module-2-extraction" => (
            "deep-extraction-nlp".into(),
            format!(
                "PRIOR FINDINGS:\n{prior}\n\n---\n\nMODULE README:\n```\n{readme}\n```\n\n\
                DEEP-DIVE TARGETS:\n\
                (1) GLiNER / UniNER — universal NER without fine-tuning (2024-2025),\n\
                (2) LLM-based extraction (GPT-4/Claude) vs BERT NER — cost, accuracy, latency for B2B,\n\
                (3) Instructor embeddings for entity typing — zero-shot entity classification,\n\
                (4) DocETL — recent document extraction pipeline frameworks,\n\
                (5) joint NER + relation extraction in a single pass — SpERT, PL-Marker, OneRel,\n\
                (6) active learning for NER annotation — reducing labeling cost by 60-80%,\n\
                (7) small language models (Phi-3, Gemma-2B, Qwen2.5-1.5B) for local extraction.\n\
                Search for 2024-2026 papers. {ctx}"
            ),
            "You are an NLP researcher tracking the shift from fine-tuned BERT to \
                LLM-based and universal extraction. Find the latest breakthroughs."
                .into(),
        ),
        "module-3-entity-resolution" => (
            "deep-entity-resolution".into(),
            format!(
                "PRIOR FINDINGS:\n{prior}\n\n---\n\nMODULE README:\n```\n{readme}\n```\n\n\
                DEEP-DIVE TARGETS:\n\
                (1) LLM-based entity matching — GPT-4/Claude for zero-shot ER (Peeters & Bizer 2024),\n\
                (2) Ditto and beyond — pre-trained transformer ER with data augmentation (2023-2026),\n\
                (3) active learning for ER — selecting the most informative pairs to label,\n\
                (4) graph neural networks for collective ER — message passing over entity graphs,\n\
                (5) blocking with learned embeddings — replacing rule-based blocking with SBERT,\n\
                (6) benchmark: Magellan vs Dedupe vs ZeroER vs Ditto — latest comparison,\n\
                (7) streaming ER — incremental entity resolution for continuously crawled data.\n\
                Search for 2023-2026 papers. {ctx}"
            ),
            "You are an entity resolution researcher focused on the LLM revolution \
                in data integration. Find papers that challenge Siamese-network ER."
                .into(),
        ),
        "module-4-lead-matching" => (
            "deep-lead-scoring".into(),
            format!(
                "PRIOR FINDINGS:\n{prior}\n\n---\n\nMODULE README:\n```\n{readme}\n```\n\n\
                DEEP-DIVE TARGETS:\n\
                (1) contrastive learning (SimCLR, SupCon) for ICP embedding — beyond Siamese,\n\
                (2) TabNet / FT-Transformer for tabular lead features — replacing XGBoost,\n\
                (3) LightGBM vs CatBoost vs XGBoost 2024 benchmarks on B2B datasets,\n\
                (4) graph-based lead scoring — company-person-technology knowledge graph features,\n\
                (5) multi-objective lead scoring — balancing fit, intent, and recency signals,\n\
                (6) conformal prediction for lead scoring uncertainty — calibrated confidence intervals,\n\
                (7) foundation models for firmographic embedding — pre-trained company representations.\n\
                Search for 2023-2026 papers. {ctx}"
            ),
            "You are an ML researcher specialising in representation learning for \
                business entities. Find the latest advances in learned matching."
                .into(),
        ),
        "module-5-report-generation" => (
            "deep-report-generation".into(),
            format!(
                "PRIOR FINDINGS:\n{prior}\n\n---\n\nMODULE README:\n```\n{readme}\n```\n\n\
                DEEP-DIVE TARGETS:\n\
                (1) advanced RAG — RAPTOR (recursive summarisation), Self-RAG, CRAG (corrective RAG),\n\
                (2) GraphRAG — Microsoft's graph-based retrieval for multi-hop reasoning,\n\
                (3) structured generation — Outlines, Instructor, LMQL for schema-enforced output,\n\
                (4) local LLM advances — Llama 3.x, Mistral, Qwen2.5 for on-premise report gen,\n\
                (5) citation verification — automated fact-checking of generated claims against sources,\n\
                (6) multi-agent report generation — specialist agents for different report sections,\n\
                (7) ColBERT v2 / ColPali for late-interaction retrieval — replacing dense retrieval.\n\
                Search for 2024-2026 papers. {ctx}"
            ),
            "You are a generative AI researcher tracking the RAG revolution. \
                Focus on techniques that appeared after the first-round research."
                .into(),
        ),
        "module-6-evaluation" => (
            "deep-pipeline-evaluation".into(),
            format!(
                "PRIOR FINDINGS:\n{prior}\n\n---\n\nMODULE README:\n```\n{readme}\n```\n\n\
                DEEP-DIVE TARGETS:\n\
                (1) holistic ML pipeline testing — Great Expectations, Deepchecks, Evidently AI,\n\
                (2) data drift detection for crawled web data — distribution shift monitoring,\n\
                (3) causal evaluation — counterfactual analysis of pipeline component contributions,\n\
                (4) LLM-as-judge for report quality — GPT-4 evaluation protocols (2024-2025),\n\
                (5) continuous evaluation — online metrics, shadow pipelines, A/B testing for ML,\n\
                (6) cost-quality Pareto frontiers — optimising pipeline stages for budget constraints,\n\
                (7) red-teaming ML pipelines — adversarial evaluation for robustness.\n\
                Search for 2024-2026 papers. {ctx}"
            ),
            "You are an MLOps researcher focused on production evaluation and \
                monitoring. Find papers on continuous pipeline quality assurance."
                .into(),
        ),
        _ => (
            format!("deep-{name}"),
            format!(
                "PRIOR FINDINGS:\n{prior}\n\n---\n\nMODULE README:\n```\n{readme}\n```\n\n\
                Go deeper than the prior findings. Find 2024-2026 papers. {ctx}"
            ),
            "You are a research scientist. Go beyond prior work.".into(),
        ),
    }
}

fn upgrade_blueprint_task(name: &str, readme: &str, prior: &str, ctx: &str) -> (String, String, String) {
    match name {
        "module-0-system-overview" => (
            "upgrade-system-architecture".into(),
            format!(
                "PRIOR FINDINGS:\n{prior}\n\n---\n\nMODULE README:\n```\n{readme}\n```\n\n\
                Produce a concrete UPGRADE BLUEPRINT:\n\
                (1) Storage migration plan: SQLite→DuckDB for analytics, ChromaDB→LanceDB unification,\n\
                (2) Model serving: ONNX Runtime graph with quantised models — full config,\n\
                (3) Pipeline orchestration: asyncio task groups with structured concurrency,\n\
                (4) Monitoring: OpenTelemetry spans for each pipeline stage — trace schema,\n\
                (5) Reproducibility: DVC-based data+model versioning — directory layout.\n\
                Include Python pseudocode for each upgrade. {ctx}"
            ),
            "You are a senior platform engineer writing migration blueprints. \
                Every recommendation needs pseudocode and expected metric improvement."
                .into(),
        ),
        "module-1-crawler" => (
            "upgrade-crawler".into(),
            format!(
                "PRIOR FINDINGS:\n{prior}\n\n---\n\nMODULE README:\n```\n{readme}\n```\n\n\
                Produce a concrete UPGRADE BLUEPRINT:\n\
                (1) Replace DQN with Decision Transformer — architecture, training loop pseudocode,\n\
                (2) Replace UCB1 with NeuralUCB — contextual features, update rule,\n\
                (3) Add intrinsic curiosity module (ICM) for domain exploration,\n\
                (4) Implement prioritised experience replay with sum-tree,\n\
                (5) GNN state encoder for link-neighbourhood features — message passing pseudocode.\n\
                Include Python/PyTorch pseudocode. {ctx}"
            ),
            "You are an RL engineer designing next-gen crawlers. \
                Provide complete upgrade specs with architecture diagrams in ASCII."
                .into(),
        ),
        "module-2-extraction" => (
            "upgrade-extraction".into(),
            format!(
                "PRIOR FINDINGS:\n{prior}\n\n---\n\nMODULE README:\n```\n{readme}\n```\n\n\
                Produce a concrete UPGRADE BLUEPRINT:\n\
                (1) Replace BERT NER with GLiNER for zero-shot entity extraction — setup guide,\n\
                (2) Add joint NER+RE using SpERT or PL-Marker — single-pass architecture,\n\
                (3) Implement active learning loop — uncertainty sampling for annotation,\n\
                (4) ONNX quantisation pipeline for 3× inference speedup — export script,\n\
                (5) Switch from Boilerpipe to Trafilatura — benchmark comparison.\n\
                Include Python pseudocode. {ctx}"
            ),
            "You are an NLP engineer modernising extraction pipelines. \
                Provide drop-in replacement specs with migration steps."
                .into(),
        ),
        "module-3-entity-resolution" => (
            "upgrade-entity-resolution".into(),
            format!(
                "PRIOR FINDINGS:\n{prior}\n\n---\n\nMODULE README:\n```\n{readme}\n```\n\n\
                Produce a concrete UPGRADE BLUEPRINT:\n\
                (1) Replace rule-based blocking with SBERT embedding blocking — threshold tuning,\n\
                (2) Replace Siamese matcher with Ditto (pre-trained transformer ER),\n\
                (3) Add active learning pair selection — uncertainty + diversity sampling,\n\
                (4) Implement streaming ER — incremental graph updates without re-computation,\n\
                (5) LLM fallback for hard cases — prompt template for ambiguous entity pairs.\n\
                Include Python pseudocode. {ctx}"
            ),
            "You are a data integration engineer modernising ER pipelines. \
                Provide concrete migration specs."
                .into(),
        ),
        "module-4-lead-matching" => (
            "upgrade-lead-matching".into(),
            format!(
                "PRIOR FINDINGS:\n{prior}\n\n---\n\nMODULE README:\n```\n{readme}\n```\n\n\
                Produce a concrete UPGRADE BLUEPRINT:\n\
                (1) Replace Siamese with SupCon (supervised contrastive) — training loop,\n\
                (2) Add FT-Transformer alongside XGBoost — tabular feature handling,\n\
                (3) Implement conformal prediction for calibrated confidence intervals,\n\
                (4) Knowledge graph features — extract company-technology-person subgraph,\n\
                (5) Online learning with label buffer — incremental model updates.\n\
                Include Python/PyTorch pseudocode. {ctx}"
            ),
            "You are an ML engineer specialising in production scoring systems. \
                Provide upgrade specs with training configurations."
                .into(),
        ),
        "module-5-report-generation" => (
            "upgrade-report-generation".into(),
            format!(
                "PRIOR FINDINGS:\n{prior}\n\n---\n\nMODULE README:\n```\n{readme}\n```\n\n\
                Produce a concrete UPGRADE BLUEPRINT:\n\
                (1) Implement Self-RAG — retrieval-augmented generation with self-reflection,\n\
                (2) Add GraphRAG for multi-hop entity relationship reasoning,\n\
                (3) Structured generation with Outlines — schema-enforced JSON output,\n\
                (4) Citation verification pipeline — automated source-claim matching,\n\
                (5) Multi-agent report gen — specialist agents for financials, tech, people sections.\n\
                Include Python pseudocode. {ctx}"
            ),
            "You are a generative AI architect designing production RAG systems. \
                Provide complete upgrade specs with prompt templates."
                .into(),
        ),
        "module-6-evaluation" => (
            "upgrade-evaluation".into(),
            format!(
                "PRIOR FINDINGS:\n{prior}\n\n---\n\nMODULE README:\n```\n{readme}\n```\n\n\
                Produce a concrete UPGRADE BLUEPRINT:\n\
                (1) Implement data drift detection with Evidently AI — monitoring dashboard,\n\
                (2) LLM-as-judge protocol for report quality evaluation — rubric + prompts,\n\
                (3) Error propagation matrix — measuring cascade failures across stages,\n\
                (4) Shadow pipeline for A/B testing upgrades — traffic splitting design,\n\
                (5) Regression test suite with pytest fixtures — quality gates per stage.\n\
                Include Python pseudocode. {ctx}"
            ),
            "You are an MLOps engineer designing evaluation infrastructure. \
                Provide complete monitoring and testing specs."
                .into(),
        ),
        _ => (
            format!("upgrade-{name}"),
            format!(
                "PRIOR FINDINGS:\n{prior}\n\n---\n\nMODULE README:\n```\n{readme}\n```\n\n\
                Produce upgrade blueprints with pseudocode. {ctx}"
            ),
            "You are a senior engineer. Provide upgrade specs.".into(),
        ),
    }
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

    let scrapus_root = std::env::var("SCRAPUS_DIR")
        .unwrap_or_else(|_| SCRAPUS_DIR.to_string());

    let modules = discover_modules(&scrapus_root)?;
    eprintln!("Discovered {} modules:", modules.len());
    for m in &modules {
        let has_prior = if m.prior.is_some() { "✓ prior" } else { "✗ no prior" };
        eprintln!("  {} → {} ({})", m.name, m.path, has_prior);
    }

    let out_dir = format!("{scrapus_root}/research-output");
    std::fs::create_dir_all(&out_dir)
        .with_context(|| format!("creating output dir {out_dir}"))?;

    let tasks = research_tasks(&modules);
    let task_count = tasks.len();
    let module_count = modules.len();
    let team_size = module_count * 2; // all tasks in parallel

    eprintln!(
        "\nLaunching DEEP research team: {team_size} workers, {task_count} tasks\n"
    );

    let lead = TeamLead::new(TeamConfig {
        team_size,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        code_root: None,
        synthesis_preamble: Some(
            "You are a principal ML architect producing the definitive upgrade plan \
            for the Scrapus pipeline. Every recommendation must be paper-backed, \
            quantitative, and include implementation priority."
                .into(),
        ),
        synthesis_prompt_template: Some(
            "You have received {count} deep-dive research reports. Produce the \
            DEFINITIVE UPGRADE BLUEPRINT:\n\n\
            ## Critical Upgrades (Do Now)\n\
            Must-do changes with expected metric lifts, paper evidence, pseudocode.\n\n\
            ## Architecture Evolution\n\
            Current → Target architecture, migration path, breaking changes.\n\n\
            ## Per-Module Upgrade Summary\n\
            For each module: current approach → proposed replacement → expected gain → key paper.\n\n\
            ## Quantitative Targets\n\
            | Module | Current Metric | Target Metric | Paper Evidence |\n\n\
            ## Risk Matrix\n\
            | Upgrade | Risk | Mitigation |\n\n\
            ## Implementation Order\n\
            Dependency graph: which upgrades unlock others.\n\n\
            ## Consolidated References\n\
            All papers cited, with clickable links, grouped by module.\n\n\
            ---\n\nIndividual reports:\n\n{combined}"
                .into(),
        ),
        tool_config: Some(SearchToolConfig {
            default_limit: 15,
            abstract_max_chars: 600,
            max_authors: 5,
            include_fields_of_study: true,
            include_venue: true,
            search_description: None,
            detail_description: None,
        }),
        scholar_concurrency: Some(2),
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(out_dir.clone()),
        synthesis_provider: None,
        ranker: None,
        timeout_check_interval: None,
        progress_report_interval: None,
    });

    let result = lead.run(tasks).await?;

    // ── Write DEEP_RESEARCH.md into each module folder ──────────────────────
    for (i, m) in modules.iter().enumerate() {
        let lit_id = i + 1;
        let upgrade_id = module_count + i + 1;

        let lit = result.findings.iter()
            .find(|(id, _, _)| *id == lit_id)
            .map(|(_, _, c)| c.as_str())
            .unwrap_or("");
        let upgrade = result.findings.iter()
            .find(|(id, _, _)| *id == upgrade_id)
            .map(|(_, _, c)| c.as_str())
            .unwrap_or("");

        let doc = format!(
            "# Deep Research — {name}\n\n\
            > Second-pass deep dive — generated by `scrapus-research` on {date}\n\n\
            ## Latest Literature (2024-2026)\n\n{lit}\n\n---\n\n\
            ## Upgrade Blueprint\n\n{upgrade}\n",
            name = m.name,
            date = chrono_date(),
        );

        let path = format!("{}/DEEP_RESEARCH.md", m.path);
        std::fs::write(&path, &doc)
            .with_context(|| format!("writing {path}"))?;
        eprintln!("  wrote {path} ({} bytes)", doc.len());
    }

    // ── Write synthesis ─────────────────────────────────────────────────────
    let synthesis_path = format!("{scrapus_root}/DEEP_SYNTHESIS.md");
    std::fs::write(&synthesis_path, &result.synthesis)
        .with_context(|| format!("writing {synthesis_path}"))?;
    eprintln!("  wrote {synthesis_path} ({} bytes)", result.synthesis.len());

    eprintln!(
        "\nDone — {} DEEP_RESEARCH.md + DEEP_SYNTHESIS.md written to {}",
        modules.len(), scrapus_root,
    );
    Ok(())
}

fn chrono_date() -> String {
    std::process::Command::new("date")
        .arg("+%Y-%m-%d")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "unknown".into())
}
