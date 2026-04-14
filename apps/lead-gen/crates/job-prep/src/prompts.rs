/// Shared prompt specifications for lead-gen research binaries 1–9.
///
/// Each `PromptSpec` captures the varying parts (tasks, team config, output dir)
/// so all 9 can run from a unified runner — individually or in parallel.
use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskPriority, TeamConfig, TeamLead};
use research::tools::SearchToolConfig;
use std::time::Duration;

/// Everything that varies between the 9 research prompts.
pub struct PromptSpec {
    pub num: u8,
    pub label: &'static str,
    pub out_dir: &'static str,
    pub team_size: usize,
    pub scholar_concurrency: Option<usize>,
    pub tool_config: Option<SearchToolConfig>,
    pub synthesis_preamble: String,
    pub tasks: Vec<ResearchTask>,
}

/// Run a single prompt spec to completion: create TeamLead, execute tasks, write output.
pub async fn run_prompt(spec: PromptSpec) -> Result<()> {
    let api_key = std::env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;
    let base_url =
        std::env::var("DEEPSEEK_BASE_URL").unwrap_or_else(|_| "https://api.deepseek.com".into());
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();
    let mailto = std::env::var("RESEARCH_MAILTO").ok();

    let num = spec.num;
    let out_dir = spec.out_dir;

    std::fs::create_dir_all(out_dir).with_context(|| format!("creating {out_dir}"))?;

    eprintln!(
        "[prompt-{num}] Launching: {} workers, {} tasks — {}",
        spec.team_size,
        spec.tasks.len(),
        spec.label,
    );

    let lead = TeamLead::new(TeamConfig {
        team_size: spec.team_size,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        mailto,
        output_dir: Some(out_dir.into()),
        scholar_concurrency: spec.scholar_concurrency,
        tool_config: spec.tool_config,
        synthesis_preamble: Some(spec.synthesis_preamble),
        ..Default::default()
    });

    let result = lead.run(spec.tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{out_dir}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content).with_context(|| format!("writing {path}"))?;
        eprintln!("[prompt-{num}] wrote {path} ({} bytes)", content.len());
    }
    std::fs::write(format!("{out_dir}/synthesis.md"), &result.synthesis)?;
    eprintln!("[prompt-{num}] Done.");
    Ok(())
}

// ── Prompt 1: System Architecture ────────────────────────────────────────────

pub fn prompt_1() -> PromptSpec {
    PromptSpec {
        num: 1,
        label: "System Architecture",
        out_dir: "../../docs/research-output/01-system-architecture",
        team_size: 3,
        scholar_concurrency: Some(2),
        tool_config: None,
        synthesis_preamble:
            "You are a systems ML researcher. Synthesise findings on local-first ML infrastructure: \
             memory efficiency, zero-copy data exchange, and privacy-preserving edge deployment. \
             Contrast each approach against the current pipeline (SQLite WAL + LanceDB + ChromaDB + asyncio) \
             and recommend concrete upgrade paths. Rank upgrades by: impact × ease of implementation."
                .into(),
        tasks: vec![
            ResearchTask {
                id: 1,
                subject: "rust-ml-backends".into(),
                preamble: "You are a systems engineer specialising in high-performance Rust ML runtimes. \
                           Search for papers on Rust-native neural network inference, ONNX runtime integration, \
                           and the Burn/Candle framework. Focus on papers from 2024–2026 that benchmark Rust \
                           inference vs Python on consumer CPUs and Apple Silicon. Extract: framework name, \
                           hardware target, latency (ms), memory (MB), supported ops, SIMD/Metal acceleration."
                    .into(),
                description: "Search for: 'Burn framework Rust deep learning benchmark', \
                              'ONNX runtime Rust inference performance 2024', \
                              'candle ML framework Rust Apple Silicon', \
                              'tract ONNX inference safe Rust production', \
                              'CubeCL Rust GPU kernel cross-platform'. \
                              Find papers comparing Rust ML frameworks against Python (PyTorch, ONNX) \
                              on memory usage and latency. Also search OpenAlex from 2024-01-01 for \
                              'edge ML inference optimization'. Report top 10 papers with key metrics."
                    .into(),
                priority: TaskPriority::Critical,
                timeout: Some(Duration::from_secs(1800)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 2,
                subject: "zero-copy-data-pipelines".into(),
                preamble: "You are a database systems researcher specialising in zero-copy data exchange \
                           between heterogeneous runtimes. Search for papers on Apache Arrow ADBC, shared \
                           memory ML pipelines, and zero-copy tensor passing between Rust and Python processes."
                    .into(),
                description: "Search for: 'Apache Arrow ADBC zero-copy database 2024', \
                              'Arrow Flight streaming ML pipeline', \
                              'shared memory tensor interop Rust Python', \
                              'zero-copy serialisation machine learning pipeline'. \
                              Find papers documenting latency and throughput improvements from eliminating \
                              serialisation between pipeline stages. Extract: serialisation overhead (ms/MB), \
                              speedup factor, memory reduction, and applicable pipeline architectures."
                    .into(),
                priority: TaskPriority::Normal,
                timeout: Some(Duration::from_secs(1800)),
                ..Default::default()
            },
            ResearchTask {
                id: 3,
                subject: "embedded-vector-db-alternatives".into(),
                preamble: "You are a database researcher specialising in embedded vector search for \
                           small-to-medium datasets (<100K vectors). Search for papers benchmarking \
                           SQLite vector extensions (sqlite-vss, sqlite-vec), DiskANN, and alternatives \
                           to ChromaDB for document retrieval under 2 GB RAM."
                    .into(),
                description: "Search for: 'embedded vector search SQLite extension benchmark', \
                              'DiskANN disk-based ANN low memory', \
                              'HNSW vs IVF embedded vector database 2024', \
                              'Qdrant embedded in-process vector search'. \
                              Compare recall@10, latency (ms), index build time, and memory footprint \
                              for 10K–100K vectors. Focus on solutions that run without a separate server \
                              process. Extract: index type, dataset size, recall, latency, RAM, disk."
                    .into(),
                priority: TaskPriority::Normal,
                dependencies: vec![1],
                timeout: Some(Duration::from_secs(1800)),
                ..Default::default()
            },
        ],
    }
}

// ── Prompt 2: RL Crawler ─────────────────────────────────────────────────────

pub fn prompt_2() -> PromptSpec {
    PromptSpec {
        num: 2,
        label: "RL Crawler",
        out_dir: "../../docs/research-output/02-crawler",
        team_size: 4,
        scholar_concurrency: Some(3),
        tool_config: None,
        synthesis_preamble:
            "You are an RL researcher specialising in web information retrieval. \
             Synthesise findings on DQN-based URL selection and bandit-based domain scheduling. \
             Compare against the current DQN+UCB1+PER baseline (15% harvest rate, 448-dim state). \
             Identify improvements that can be adopted incrementally vs require architecture changes. \
             Rank by: expected harvest rate improvement ÷ implementation days."
                .into(),
        tasks: vec![
            ResearchTask {
                id: 1,
                subject: "dqn-url-selection-advances".into(),
                preamble: "You are an RL researcher specialising in deep Q-networks for information \
                           retrieval. Search for papers from 2024–2026 that improve on vanilla DQN \
                           for URL/link selection in focused web crawling. Focus on: state representation \
                           improvements, double DQN vs dueling DQN vs distributional RL, and \
                           LLM-augmented state encoders. Current baseline: 448-dim state, 15% harvest rate."
                    .into(),
                description: "Search for: 'deep Q-network focused web crawling 2024', \
                              'dueling DQN distributional RL web navigation', \
                              'LLM state encoder reinforcement learning URL selection', \
                              'Rainbow DQN information retrieval focused crawler'. \
                              Find papers benchmarking against DQN baselines on focused crawling tasks. \
                              Extract: state dimensionality, network architecture, harvest rate improvement, \
                              training data requirements, and inference latency per URL decision."
                    .into(),
                priority: TaskPriority::Critical,
                timeout: Some(Duration::from_secs(2400)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 2,
                subject: "bandit-domain-scheduling".into(),
                preamble: "You are a bandit algorithms researcher. Search for papers from 2024–2026 \
                           on non-stationary multi-armed bandits for domain scheduling in web crawlers. \
                           Focus on: temporal drift handling, latent autoregressive state models, \
                           sliding-window UCB, and multi-constraint bandits with politeness/budget constraints. \
                           Current baseline: UCB1 with formula ucb = reward_sum/pages + sqrt(2*ln(total)/pages)."
                    .into(),
                description: "Search for: 'LARL latent autoregressive bandit temporal drift RLC 2025', \
                              'M2-CMAB multi-constraint bandit Lagrangian web', \
                              'sliding window UCB non-stationary domain yield', \
                              'contextual bandit domain scheduling web crawler 2024'. \
                              Compare against UCB1 baseline. Extract: regret bounds, adaptation speed to drift, \
                              constraint satisfaction rate, and computational overhead vs UCB1."
                    .into(),
                priority: TaskPriority::Critical,
                timeout: Some(Duration::from_secs(2400)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 3,
                subject: "llm-world-model-crawling".into(),
                preamble: "You are an AI researcher specialising in LLM-based web agents. Search for \
                           papers from 2024–2026 that use LLMs as world models or reward models for \
                           web navigation and focused crawling. Focus on: WebDreamer, OpAgent, WebRL, \
                           self-evolving curricula, and hybrid symbolic+neural web agents. \
                           Assess feasibility for local-first pipeline (no cloud LLM required)."
                    .into(),
                description: "Search for: 'WebRL self-evolving curriculum reinforcement learning ICLR 2025', \
                              'WebDreamer LLM world model web navigation TMLR 2025', \
                              'OpAgent hybrid reward WebJudge web agent arXiv 2026', \
                              'LLM web agent focused crawling quality 2025'. \
                              Extract: success rate on WebArena/Mind2Web, LLM size required, \
                              inference cost per page, and whether a local 3B–14B model suffices."
                    .into(),
                priority: TaskPriority::Normal,
                timeout: Some(Duration::from_secs(2400)),
                ..Default::default()
            },
            ResearchTask {
                id: 4,
                subject: "reward-shaping-curriculum".into(),
                preamble: "You are an RL researcher specialising in sparse reward problems and curriculum \
                           learning. Search for papers from 2024–2026 on semi-supervised reward shaping, \
                           goal-conditioned curriculum generation, and adaptive experience replay for \
                           web crawlers with rare positive rewards. Current PER: alpha=0.6, beta 0.4→1.0."
                    .into(),
                description: "Search for: 'DISCOVER auto-curriculum goal selection NeurIPS 2025', \
                              'semi-supervised reward shaping sparse reward web crawling arXiv 2026', \
                              'ARB adaptive replay buffer on-policy alignment arXiv 2025', \
                              'Craw4LLM content quality pre-filter URL ACL 2025', \
                              'QMin quality propagation minimum inlinking SIGIR 2025'. \
                              Find papers proposing better PER sampling or pseudo-reward generation. \
                              Extract: improvement over PER baseline, implementation complexity, \
                              sample efficiency gain, and whether it requires LLM calls."
                    .into(),
                priority: TaskPriority::Normal,
                dependencies: vec![1],
                timeout: Some(Duration::from_secs(2400)),
                ..Default::default()
            },
        ],
    }
}

// ── Prompt 3: Extraction / NER ───────────────────────────────────────────────

pub fn prompt_3() -> PromptSpec {
    PromptSpec {
        num: 3,
        label: "Extraction / NER",
        out_dir: "../../docs/research-output/03-extraction",
        team_size: 4,
        scholar_concurrency: Some(3),
        tool_config: None,
        synthesis_preamble:
            "You are an NLP researcher specialising in information extraction for web-scale data. \
             Synthesise findings on NER and relation extraction, contrasting each against the current \
             BERT NER baseline (F1 92.3%, ~100 pages/sec). Prioritise techniques that: \
             (1) improve PRODUCT entity F1 without re-labelling, \
             (2) add new entity types zero-shot, \
             (3) exploit DOM structure. Must sustain ~100 pages/sec on a single machine. \
             Rank each paper by (F1_delta + new_types_enabled) ÷ implementation_hours."
                .into(),
        tasks: vec![
            ResearchTask {
                id: 1,
                subject: "zero-shot-ner-advances".into(),
                preamble: "You are an NLP researcher specialising in zero-shot and few-shot named entity \
                           recognition. Search for papers from 2024–2026 on zero-shot NER models that can \
                           recognise new entity types without fine-tuning. Focus on GLiNER, NuNER, \
                           span-based models, and LLM-based NER with structured output. \
                           Current baseline: BERT NER F1 92.3% on ORG/PERSON/LOC/PRODUCT."
                    .into(),
                description: "Search for: 'GLiNER zero-shot NER generalisation 2024', \
                              'NuNER Zero token-level entity recognition EMNLP 2024', \
                              'zero-shot NER new entity types without fine-tuning', \
                              'UniversalNER instruction-tuned entity recognition', \
                              'span classification NER few-shot 2024 2025'. \
                              Find models matching BERT NER F1 on standard types WHILE supporting \
                              new types (SKILL, FUNDING_AMOUNT, DATE). \
                              Extract: model name, F1 on CoNLL-2003, zero-shot F1 on new types, \
                              inference speed (tokens/sec), model size (MB)."
                    .into(),
                priority: TaskPriority::Critical,
                timeout: Some(Duration::from_secs(2400)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 2,
                subject: "llm-structured-extraction".into(),
                preamble: "You are an NLP researcher specialising in LLM-based information extraction \
                           with structured output. Search for papers from 2024–2026 on using small LLMs \
                           (1B–7B) for web information extraction with JSON schema constraints, \
                           XPath provenance, and DOM-aware extraction. Target: locally runnable models."
                    .into(),
                description: "Search for: 'AXE DOM-aware web extraction XPath provenance arXiv 2026', \
                              'ScrapeGraphAI web scraping LLM fine-tuning 2025', \
                              'constrained decoding JSON schema information extraction', \
                              'small LLM 3B 7B information extraction web accuracy'. \
                              Target: models runnable locally (<7B params, <8 GB RAM). \
                              Extract: model size, entity F1, HTML/DOM input handling, \
                              provenance support, throughput (pages/sec) on CPU/GPU."
                    .into(),
                priority: TaskPriority::Critical,
                timeout: Some(Duration::from_secs(2400)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 3,
                subject: "relation-extraction-2024".into(),
                preamble: "You are an NLP researcher specialising in relation extraction from web text. \
                           Search for papers from 2024–2026 on relation extraction between entities \
                           (ORG-founded_by-PERSON, ORG-located_in-LOCATION) using dependency parsing, \
                           LLMs, or knowledge graph completion. Focus on extracting business relations."
                    .into(),
                description: "Search for: 'relation extraction LLM web text 2024 2025', \
                              'open information extraction neural 2024', \
                              'knowledge graph population web crawl LLM', \
                              'CPTuning multi-relation extraction trie decoding arXiv 2025', \
                              'KGGen entity relation extraction iterative NeurIPS 2025'. \
                              Focus on: (company, founded_by, person), (company, located_in, city), \
                              (company, acquired_by, company). \
                              Extract: relation types supported, F1 on NYT10/DocRED, \
                              inference time, and zero-shot capability."
                    .into(),
                priority: TaskPriority::Normal,
                timeout: Some(Duration::from_secs(2400)),
                ..Default::default()
            },
            ResearchTask {
                id: 4,
                subject: "topic-modeling-bertopic-2024".into(),
                preamble: "You are an NLP researcher specialising in topic modeling for web-scale document \
                           collections. Search for papers from 2024–2026 on improvements to BERTopic, \
                           dynamic topic models, and alternatives for classifying page content into \
                           industry categories (B2B tech, AI, SaaS, fintech). Current: BERTopic + \
                           ChromaDB embeddings (384-dim sentence-transformer)."
                    .into(),
                description: "Search for: 'BERTopic improvements dynamic topics 2024 2025', \
                              'neural topic model web pages classification streaming', \
                              'LLM topic labeling zero-shot industry classification', \
                              'online topic modeling streaming documents'. \
                              Find methods handling: streaming new documents, hierarchical topics, \
                              multilingual company pages. Extract: coherence score, topic stability, \
                              streaming update latency, memory per 10K documents."
                    .into(),
                priority: TaskPriority::Normal,
                dependencies: vec![1, 2],
                timeout: Some(Duration::from_secs(2400)),
                ..Default::default()
            },
        ],
    }
}

// ── Prompt 4: Entity Resolution ──────────────────────────────────────────────

pub fn prompt_4() -> PromptSpec {
    PromptSpec {
        num: 4,
        label: "Entity Resolution",
        out_dir: "../../docs/research-output/04-entity-resolution",
        team_size: 3,
        scholar_concurrency: Some(3),
        tool_config: None,
        synthesis_preamble:
            "You are a database researcher specialising in entity resolution at scale. \
             Synthesise findings on zero-shot, LLM-based, and GNN-based entity resolution. \
             Compare against current Siamese + SQL blocking (P=96.8%, R=84.2%, F1=90.1%). \
             Identify the single highest-ROI change to improve recall from 84.2% to >90% \
             without sacrificing precision. Prioritise methods that work without new labeled \
             pairs and run locally (<1ms per query on 100K entities)."
                .into(),
        tasks: vec![
            ResearchTask {
                id: 1,
                subject: "zero-shot-entity-matching".into(),
                preamble: "You are a database researcher specialising in zero-shot entity matching. \
                           Search for papers from 2024–2026 on entity resolution without labeled pairs, \
                           using pre-trained language models, contrastive embeddings, or in-context \
                           learning with LLMs. Current baseline: Siamese + SQL blocking \
                           (P=96.8%, R=84.2%, F1=90.1%). Recall 84.2% is the weak link."
                    .into(),
                description: "Search for: 'AnyMatch zero-shot entity matching SLM AAAI 2025', \
                              'zero-shot record linkage pre-trained language model 2024', \
                              'in-context learning entity resolution LLM GPT', \
                              'Eridu embeddings contrastive company person matching', \
                              'foundation model entity matching without labels 2024 2025'. \
                              Find methods achieving F1 >85% without labeled training data. \
                              Extract: benchmark dataset, P/R/F1, model size, inference cost per pair, \
                              whether it runs locally (<8 GB RAM), and training data needed."
                    .into(),
                priority: TaskPriority::Critical,
                timeout: Some(Duration::from_secs(2400)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 2,
                subject: "llm-distillation-er".into(),
                preamble: "You are an ML researcher specialising in knowledge distillation for entity \
                           resolution. Search for papers from 2024–2026 on distilling GPT-4 or other \
                           large LLMs into small (1B–3B) local models for entity matching, trading \
                           some accuracy for 100–1000× lower inference cost."
                    .into(),
                description: "Search for: 'DistillER LLM distillation entity matching EDBT 2026', \
                              'knowledge distillation entity resolution small model teacher student', \
                              'LLM annotation entity resolution training data generation', \
                              'GPT-4 labeler entity matching fine-tune local model 2024'. \
                              Cost target: GPT-4 labels 10K pairs (~$20) → train local model (free). \
                              Extract: student model size, F1 vs GPT-4 teacher, distillation data size, \
                              inference latency (ms/pair), company name handling quality."
                    .into(),
                priority: TaskPriority::Critical,
                timeout: Some(Duration::from_secs(2400)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 3,
                subject: "graph-neural-network-er".into(),
                preamble: "You are a graph ML researcher. Search for papers from 2024–2026 on graph \
                           neural networks for entity resolution, especially multi-source ER where the \
                           same entity appears with different attributes across data sources \
                           (LinkedIn, Crunchbase, company website). Current: SQLite adjacency list + \
                           recursive CTEs for transitive closure."
                    .into(),
                description: "Search for: 'GraLMatch multi-source entity group matching EDBT 2025', \
                              'GraphER property graph GDD GNN entity resolution 2025', \
                              'graph neural network entity resolution multi-source 2024', \
                              'OpenSanctions logic-v2 deterministic company matching'. \
                              Find GNN methods that improve transitive closure detection across sources. \
                              Extract: F1 on DBLP-ACM/Amazon-Google/Walmart-Amazon, training time, \
                              inference latency, and memory for 100K-entity graph."
                    .into(),
                priority: TaskPriority::Normal,
                dependencies: vec![1],
                timeout: Some(Duration::from_secs(2400)),
                ..Default::default()
            },
        ],
    }
}

// ── Prompt 5: Lead Matching & Scoring ────────────────────────────────────────

pub fn prompt_5() -> PromptSpec {
    PromptSpec {
        num: 5,
        label: "Lead Matching & Scoring",
        out_dir: "../../docs/research-output/05-lead-matching",
        team_size: 4,
        scholar_concurrency: Some(3),
        tool_config: None,
        synthesis_preamble:
            "You are an ML researcher specialising in tabular classification for B2B sales. \
             Synthesise findings on tabular foundation models, calibration, and temporal signals. \
             Compare against current XGBoost ensemble (P=89.7%, R=86.5%, F1=0.88, ~1000 leads/sec). \
             Produce a decision matrix for replacing vs augmenting XGBoost, ordered by \
             PR-AUC improvement at ≥500 leads/sec inference speed."
                .into(),
        tasks: vec![
            ResearchTask {
                id: 1,
                subject: "tabular-foundation-models".into(),
                preamble: "You are an ML researcher specialising in tabular learning. Search for papers \
                           from 2024–2026 on tabular foundation models, in-context learning for tabular \
                           data, and methods that eliminate feature engineering while matching or beating \
                           XGBoost. Inference speed requirement: must sustain 500+ leads/sec. \
                           Current: XGBoost ensemble (P=89.7%, R=86.5%, F1=0.88, ~1000 leads/sec)."
                    .into(),
                description: "Search for: 'TabPFN-2.5 tabular prior-data fitted network arXiv 2025', \
                              'TabM BatchEnsemble MLP tabular ICLR 2025', \
                              'ModernNCA retrieval-based tabular learning ICLR 2025', \
                              'in-context learning tabular classification 2024 2025', \
                              'SAINT self-attention tabular improvements 2024'. \
                              Find models that beat XGBoost F1 on <10K training samples. \
                              Extract: F1 on OpenML tabular benchmarks, training sample efficiency, \
                              inference latency (ms/sample), feature engineering required."
                    .into(),
                priority: TaskPriority::Critical,
                timeout: Some(Duration::from_secs(2400)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 2,
                subject: "calibration-distribution-shift".into(),
                preamble: "You are an ML researcher specialising in probability calibration and \
                           distribution shift. Search for papers from 2024–2026 on online calibration, \
                           conformal prediction for tabular data, and methods that maintain calibration \
                           under ICP drift without full model retraining. Current: Platt scaling."
                    .into(),
                description: "Search for: 'COP conformal online prediction distribution shift ICLR 2026', \
                              'SmartCal automated calibration selection AutoML 2025', \
                              'online calibration tabular distribution shift 2024', \
                              'conformal prediction tabular classification 2024 2025'. \
                              Find calibration methods adapting online to new lead types without \
                              storing full dataset. Extract: ECE before/after, calibration update \
                              latency, memory footprint, coverage guarantees under covariate shift."
                    .into(),
                priority: TaskPriority::Critical,
                timeout: Some(Duration::from_secs(2400)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 3,
                subject: "temporal-event-signals".into(),
                preamble: "You are an ML researcher specialising in temporal event sequences for \
                           business prediction. Search for papers from 2024–2026 on using temporal \
                           signals (funding rounds, hiring activity, tech stack changes) as features \
                           for B2B lead scoring, including Hawkes processes, transformer event models, \
                           and graph temporal networks."
                    .into(),
                description: "Search for: 'Hawkes process attention lead scoring temporal event arXiv 2025', \
                              'funding event sequence company classification ML', \
                              'temporal graph network company signal B2B', \
                              'hiring activity prediction company readiness ML 2024'. \
                              Find models taking funding/hiring/product event sequences as input. \
                              Extract: AUC improvement vs static features, event types used, \
                              sequence length, model size, and inference latency."
                    .into(),
                priority: TaskPriority::Normal,
                timeout: Some(Duration::from_secs(2400)),
                ..Default::default()
            },
            ResearchTask {
                id: 4,
                subject: "icp-embedding-retrieval".into(),
                preamble: "You are an ML researcher specialising in embedding-based retrieval for \
                           business applications. Search for papers from 2024–2026 on ICP (Ideal \
                           Customer Profile) modeling via dense retrieval, contrastive learning on \
                           company profiles, and retrieval-augmented lead scoring. \
                           Current: 128-dim Siamese ICP embeddings in LanceDB."
                    .into(),
                description: "Search for: 'ideal customer profile embedding contrastive learning B2B', \
                              'company profile similarity dense retrieval 2024', \
                              'retrieval augmented classification tabular business', \
                              'dense retrieval tabular features company similarity matching'. \
                              Find improved embedding methods for company similarity. \
                              Extract: embedding dimension, similarity metric, retrieval speed \
                              on 100K candidates (ms), F1 on held-out ICP matching task."
                    .into(),
                priority: TaskPriority::Normal,
                dependencies: vec![1],
                timeout: Some(Duration::from_secs(2400)),
                ..Default::default()
            },
        ],
    }
}

// ── Prompt 6: Report Generation / RAG ────────────────────────────────────────

pub fn prompt_6() -> PromptSpec {
    PromptSpec {
        num: 6,
        label: "Report Generation / RAG",
        out_dir: "../../docs/research-output/06-report-generation",
        team_size: 4,
        scholar_concurrency: Some(3),
        tool_config: None,
        synthesis_preamble:
            "You are an NLP researcher specialising in retrieval-augmented generation for factual \
             report generation. Synthesise findings on RAG architecture, hallucination mitigation, \
             and chunking. Compare against current dual-source RAG (85% factual accuracy, 10–30 sec/report). \
             Produce a 3-tier upgrade plan: quick wins (<1 day), medium effort (1 week), \
             architectural changes (1 month) — each with factual accuracy and latency targets."
                .into(),
        tasks: vec![
            ResearchTask {
                id: 1,
                subject: "rag-architecture-advances".into(),
                preamble: "You are an NLP researcher specialising in RAG system design. Search for papers \
                           from 2024–2026 on advanced RAG architectures: hierarchical retrieval, iterative \
                           retrieval, agentic RAG, and corrective RAG. Focus on improvements that maintain \
                           factual accuracy while reducing LLM inference calls. Current: single-pass \
                           dual-source retrieval (SQLite + ChromaDB), 85% factual accuracy, 10–30 sec/report."
                    .into(),
                description: "Search for: 'A-RAG hierarchical agentic retrieval HotpotQA arXiv 2025', \
                              'CRAG corrective RAG semantic caching latency 2025', \
                              'REFRAG long context retrieval compression Meta arXiv 2025', \
                              'MA-RAG multi-agent collaborative retrieval LLaMA 2025', \
                              'iterative RAG multi-hop question answering 2024'. \
                              Find architectures handling multi-hop reasoning across company facts. \
                              Extract: HotpotQA/MultiHopRAG F1, latency, number of retrieval rounds, \
                              whether it requires a separate retrieval LLM."
                    .into(),
                priority: TaskPriority::Critical,
                timeout: Some(Duration::from_secs(2400)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 2,
                subject: "hallucination-mitigation".into(),
                preamble: "You are an NLP researcher specialising in LLM hallucination mitigation. \
                           Search for papers from 2024–2026 on factual grounding techniques, \
                           citation-backed generation, self-consistency checking, and hybrid \
                           symbolic+neural approaches that enforce factual accuracy from retrieved context."
                    .into(),
                description: "Search for: 'RAG hallucination mitigation factual grounding 2024 2025', \
                              'citation generation factual accuracy FActScore 2024', \
                              'self-consistency RAG multiple sampling grounding', \
                              'chain-of-thought grounded generation structured output factual'. \
                              Current: explicit prompting + structured templates (85% factual). \
                              Find techniques detecting and correcting hallucinations automatically. \
                              Extract: hallucination rate reduction (%), FActScore benchmark, \
                              latency overhead, compatibility with local LLMs."
                    .into(),
                priority: TaskPriority::Critical,
                timeout: Some(Duration::from_secs(2400)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 3,
                subject: "chunking-retrieval-strategies".into(),
                preamble: "You are an information retrieval researcher. Search for papers from 2024–2026 \
                           on document chunking strategies for RAG: semantic chunking, cross-document \
                           chunking, sentence-window retrieval, and hierarchical chunking that respects \
                           document structure (sections, paragraphs, entities). Current: basic ChromaDB \
                           chunking with 384-dim embeddings."
                    .into(),
                description: "Search for: 'CDTA cross-document topic-aligned chunking faithfulness 2025', \
                              'semantic chunking document structure RAG 2024', \
                              'late chunking full document embedding chunk', \
                              'sentence window retrieval context RAG 2024', \
                              'parent child chunk retrieval hierarchical 2024'. \
                              Find methods improving faithfulness on RAGAS/TruLens benchmarks. \
                              Extract: faithfulness score, answer relevance, chunk size recommendations, \
                              memory overhead for index, compatible embedding models."
                    .into(),
                priority: TaskPriority::Normal,
                timeout: Some(Duration::from_secs(2400)),
                ..Default::default()
            },
            ResearchTask {
                id: 4,
                subject: "local-llm-deployment-rag".into(),
                preamble: "You are a systems researcher specialising in local LLM deployment for RAG. \
                           Search for papers and technical reports from 2024–2026 on running 3B–14B \
                           parameter LLMs locally for report generation: quantization, speculative \
                           decoding, KV cache optimisation, and batching strategies. \
                           Target: <10 sec/report on Apple M1/M2 with 16 GB RAM."
                    .into(),
                description: "Search for: 'Qwen3 local inference RAG deployment 2025', \
                              'Ollama llama.cpp Apple Silicon Metal benchmark 2024', \
                              'speculative decoding local LLM latency reduction', \
                              'INT4 INT8 quantization report generation quality tradeoff'. \
                              Target: <10 sec/report generation, >90% factual accuracy. \
                              Extract: model name and size, tokens/sec on M1, quality vs GPT-4 \
                              (ROUGE, human preference), quantization level, memory footprint."
                    .into(),
                priority: TaskPriority::Normal,
                dependencies: vec![1],
                timeout: Some(Duration::from_secs(2400)),
                ..Default::default()
            },
        ],
    }
}

// ── Prompt 7: Evaluation ─────────────────────────────────────────────────────

pub fn prompt_7() -> PromptSpec {
    PromptSpec {
        num: 7,
        label: "Evaluation",
        out_dir: "../../docs/research-output/07-evaluation",
        team_size: 3,
        scholar_concurrency: Some(2),
        tool_config: None,
        synthesis_preamble:
            "You are an ML evaluation researcher. Synthesise findings on pipeline evaluation, \
             LLM-as-judge reliability, and drift detection. Compare against current evaluation: \
             CER ~0.15, LLM-as-judge regression tests, manual ablation studies. \
             Produce an evaluation enhancement roadmap: which metrics to add, which biases to \
             correct, and one recommended drift alerting strategy with implementation details."
                .into(),
        tasks: vec![
            ResearchTask {
                id: 1,
                subject: "llm-as-judge-reliability".into(),
                preamble: "You are an NLP evaluation researcher. Search for papers from 2024–2026 on \
                           LLM-as-judge reliability: bias analysis, calibration of judge models, \
                           position bias, length bias, and methods to improve judge consistency and \
                           agreement with human evaluators. Current: LLM-as-judge quality gate assertions \
                           with no bias correction or calibration."
                    .into(),
                description: "Search for: 'LLM judge reliability bias position length 2024', \
                              'LLM evaluator consistency agreement human judge 2024 2025', \
                              'MT-Bench Chatbot Arena evaluation bias 2024', \
                              'calibration LLM judge model reliability 2025'. \
                              Find papers quantifying judge bias and methods to correct it. \
                              Extract: bias types found, correlation with human judges (κ or Spearman), \
                              correction techniques, judge model size requirements, \
                              whether a local 7B judge is reliable enough."
                    .into(),
                priority: TaskPriority::Critical,
                timeout: Some(Duration::from_secs(2400)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 2,
                subject: "cascade-error-attribution".into(),
                preamble: "You are an ML systems researcher specialising in error propagation analysis. \
                           Search for papers from 2024–2026 on automated cascade error analysis in \
                           multi-stage NLP pipelines: error attribution across stages, counterfactual \
                           error tracing, and pipeline robustness metrics. Current: manual CER ~0.15, \
                           EAF 1.15×, manual ablation studies."
                    .into(),
                description: "Search for: 'cascade error propagation multi-stage NLP pipeline 2024', \
                              'error attribution automated pipeline information extraction', \
                              'counterfactual analysis NLP pipeline robustness 2024', \
                              'compound AI system evaluation error propagation 2025'. \
                              Find automated methods identifying which stage causes most downstream errors. \
                              Extract: attribution method, pipeline types evaluated, \
                              whether attribution is exact or approximate, overhead per prediction."
                    .into(),
                priority: TaskPriority::Normal,
                timeout: Some(Duration::from_secs(2400)),
                ..Default::default()
            },
            ResearchTask {
                id: 3,
                subject: "drift-detection-explainability".into(),
                preamble: "You are an ML reliability researcher. Search for papers from 2024–2026 on \
                           concept drift detection in NLP/ML pipelines, feature attribution for tabular \
                           ML (SHAP, LIME, integrated gradients), and explainability methods for \
                           scoring/ranking models in production. Current: no drift detection, no \
                           per-lead feature attribution in reports."
                    .into(),
                description: "Search for: 'concept drift detection NLP streaming 2024', \
                              'SHAP attribution XGBoost tabular production monitoring', \
                              'explainable lead scoring feature attribution B2B', \
                              'online drift detection web content distribution shift 2024', \
                              'counterfactual explanation classification scoring 2024 2025'. \
                              Find lightweight drift detectors (<1ms overhead per prediction) \
                              alerting when entity type distribution shifts. \
                              Extract: detection delay (samples), false positive rate, \
                              computational overhead, label-free detection capability."
                    .into(),
                priority: TaskPriority::Normal,
                dependencies: vec![1],
                timeout: Some(Duration::from_secs(2400)),
                ..Default::default()
            },
        ],
    }
}

// ── Prompt 8: Pipeline Synthesis / Roadmap ───────────────────────────────────

pub fn prompt_8() -> PromptSpec {
    PromptSpec {
        num: 8,
        label: "Pipeline Synthesis / Roadmap",
        out_dir: "../../docs/research-output/08-synthesis",
        team_size: 2,
        scholar_concurrency: Some(2),
        tool_config: None,
        synthesis_preamble:
            "You are a systems architect specialising in AI/ML pipeline optimisation. \
             Synthesise findings on end-to-end ML pipeline design for lead generation. \
             Current pipeline: 50K pages → 300 leads (0.6% yield), 10 pages/sec crawl bottleneck, \
             $1,500/year hardware cost. Identify cross-cutting upgrades affecting multiple modules. \
             Produce a 12-month roadmap with quarterly milestones, each improving at least one of: \
             funnel yield (>0.6%), crawl throughput (>10 pages/sec), hardware cost (<$1,500/year)."
                .into(),
        tasks: vec![
            ResearchTask {
                id: 1,
                subject: "end-to-end-pipeline-surveys".into(),
                preamble: "You are a systems researcher. Search for survey papers and system papers \
                           from 2024–2026 on end-to-end ML pipelines for information extraction, \
                           lead generation, or knowledge graph construction. Focus on papers analysing \
                           bottlenecks, co-optimisation across stages, and unified architectures. \
                           Current: 50K pages → 300 qualified leads (0.6% yield), 10 pages/sec bottleneck."
                    .into(),
                description: "Search for: 'end-to-end pipeline web information extraction survey 2024', \
                              'knowledge graph construction web crawl pipeline ML 2024', \
                              'automated company intelligence pipeline machine learning', \
                              'multi-stage NLP pipeline optimisation survey 2024 2025', \
                              'B2B lead generation AI automated pipeline 2024'. \
                              Find survey papers covering 3+ pipeline stages. \
                              Extract: which stages each paper covers, identified bottlenecks, \
                              recommended architectures, benchmark datasets for full-pipeline evaluation."
                    .into(),
                priority: TaskPriority::Critical,
                timeout: Some(Duration::from_secs(2400)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 2,
                subject: "cost-efficiency-active-learning".into(),
                preamble: "You are an MLOps researcher. Search for papers from 2024–2026 on \
                           cost-performance tradeoffs for local vs cloud ML deployment, active learning \
                           loops that improve pipeline yield, and data flywheel strategies for \
                           continuous improvement without constant manual labelling. \
                           Current: $1,500/year hardware vs $5,400–$13,200 cloud (64–89% savings)."
                    .into(),
                description: "Search for: 'local vs cloud ML deployment cost analysis 2024', \
                              'active learning data flywheel ML pipeline improvement', \
                              'continuous learning pipeline production deployment 2024', \
                              'ML pipeline cost optimisation edge inference'. \
                              Find papers quantifying: when local beats cloud, how active learning \
                              from user feedback improves all stages simultaneously, monitoring triggers \
                              for retraining. Extract: cost comparison methodology, breakeven analysis, \
                              active learning strategy, annotation effort."
                    .into(),
                priority: TaskPriority::Normal,
                dependencies: vec![1],
                timeout: Some(Duration::from_secs(2400)),
                ..Default::default()
            },
        ],
    }
}

// ── Prompt 9: Novelty Hunt 2025–2026 ─────────────────────────────────────────

const KNOWN_TECHNIQUES: &str = "Craw4LLM, QMin, LARL, ARB, WebDreamer, OpAgent, M2-CMAB, \
    DISCOVER, WebRL, AXE, NuNER Zero, SeNER, KGGen, CPTuning, ScrapeGraphAI-100k, \
    DistillER, AnyMatch, OpenSanctions logic-v2, GraLMatch, Eridu, GraphER, \
    TabPFN-2.5, TabM, COP, SmartCal, ModernNCA, Hawkes Attention, \
    A-RAG, CRAG, CDTA, CoT-RAG, REFRAG, MA-RAG, GFM-RAG";

pub fn prompt_9() -> PromptSpec {
    PromptSpec {
        num: 9,
        label: "Novelty Hunt 2025–2026",
        out_dir: "../../docs/research-output/09-novelty",
        team_size: 5,
        scholar_concurrency: Some(3),
        tool_config: Some(SearchToolConfig {
            default_limit: 20,
            abstract_max_chars: 500,
            include_fields_of_study: true,
            ..Default::default()
        }),
        synthesis_preamble: format!(
            "You are a research scout specialising in identifying breakthrough ML/NLP techniques \
             from 2025–2026. Your job is to find papers NOT already documented in the novelty index. \
             Cross-check findings against this known list and SKIP any technique already listed: [{}]. \
             Only report papers NOT on this list. For each new paper, classify: which pipeline module \
             it applies to (1=infrastructure, 2=crawler, 3=extraction, 4=entity-resolution, \
             5=lead-scoring, 6=RAG/reports, 7=evaluation), what the breakthrough is, and whether it \
             supersedes an already-documented technique. Output a diff: ADD/UPDATE/DEPRECATE.",
            KNOWN_TECHNIQUES
        ),
        tasks: vec![
            ResearchTask {
                id: 1,
                subject: "novelty-infrastructure-2026".into(),
                preamble: format!(
                    "You are a systems ML researcher scouting for infrastructure breakthroughs from \
                     2025–2026 not yet documented. Known and skip: [{}]. Search for new papers on \
                     Rust ML runtimes (Burn, Candle, tract, CubeCL), Apple Silicon inference \
                     optimisation (MLX), zero-copy pipelines, and embedded vector DBs. \
                     Classify impact as HIGH/MEDIUM/LOW.",
                    KNOWN_TECHNIQUES
                ),
                description: "Search arXiv cs.LG+cs.DC from 2025-01-01 onward for: \
                              'Rust ML inference 2025 2026 Burn CubeCL Candle', \
                              'Apple MLX machine learning framework 2025', \
                              'embedded vector database 2026 benchmark sqlite-vec'. \
                              Also search OpenAlex from_publication_date=2026-01-01 for: \
                              'edge ML inference optimisation 2026'. \
                              Use Zenodo for code releases: 'web crawler dataset 2026'. \
                              Flag papers superseding LanceDB, ChromaDB, or SQLite. \
                              Do NOT report any technique already in the known list."
                    .into(),
                priority: TaskPriority::Normal,
                timeout: Some(Duration::from_secs(3000)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 2,
                subject: "novelty-crawler-2026".into(),
                preamble: format!(
                    "You are an RL web crawling researcher scouting for 2025–2026 breakthroughs. \
                     Known techniques (skip these): [Craw4LLM, QMin, LARL, ARB, WebDreamer, \
                     OpAgent, M2-CMAB, DISCOVER, WebRL]. Find papers that post-date or supersede \
                     these. Use strict date filter 2026-01-01 onward for primary search.",
                ),
                description: "Search arXiv cs.LG+cs.IR from 2026-01-01 for: \
                              'web crawling reinforcement learning 2026 new', \
                              'web agent navigation benchmark 2026', \
                              'focused crawler LLM quality 2026'. \
                              Search SemanticScholar year=2026 (no min_citations — new papers): \
                              'web navigation agent reward shaping 2026'. \
                              For each paper found: (1) confirm NOT in known list, \
                              (2) state which known technique it improves upon, \
                              (3) quantify improvement if benchmarks available."
                    .into(),
                priority: TaskPriority::Critical,
                timeout: Some(Duration::from_secs(3000)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 3,
                subject: "novelty-extraction-er-2026".into(),
                preamble: format!(
                    "You are an NLP researcher scouting for 2025–2026 breakthroughs in NER, \
                     relation extraction, and entity resolution not yet documented. \
                     Known (skip): [AXE, NuNER Zero, SeNER, KGGen, CPTuning, ScrapeGraphAI-100k, \
                     DistillER, AnyMatch, GraLMatch, Eridu, GraphER]. \
                     Also look for new benchmarks for NER or ER published in 2026.",
                ),
                description: "Search arXiv cs.CL from 2026-01-01 for: \
                              'named entity recognition 2026 new method benchmark', \
                              'entity resolution LLM 2026 new approach', \
                              'web extraction benchmark 2026'. \
                              Search S2 year=2026 (no min_citations): \
                              'zero-shot entity matching 2026', 'NER structured output LLM 2026'. \
                              For each new paper: state which known technique it replaces \
                              and by how much (F1 delta, speed delta)."
                    .into(),
                priority: TaskPriority::Critical,
                timeout: Some(Duration::from_secs(3000)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 4,
                subject: "novelty-scoring-rag-2026".into(),
                preamble: format!(
                    "You are an ML researcher scouting for 2025–2026 breakthroughs in tabular ML \
                     and RAG not yet documented. Known tabular (skip): [TabPFN-2.5, TabM, COP, \
                     SmartCal, ModernNCA, Hawkes Attention]. Known RAG (skip): [A-RAG, CRAG, CDTA, \
                     CoT-RAG, REFRAG, MA-RAG, GFM-RAG]. Find papers post-dating these.",
                ),
                description: "Search arXiv cs.LG+cs.AI from 2026-01-01 for: \
                              'tabular classification 2026 new method benchmark', \
                              'retrieval augmented generation 2026 new architecture', \
                              'RAG evaluation benchmark 2026'. \
                              Search OpenAlex from_publication_date=2026-01-01 for: \
                              'tabular learning 2026', 'generative AI report grounding 2026'. \
                              For each new tabular paper: benchmark against TabPFN-2.5. \
                              For each new RAG paper: does it beat REFRAG on latency?"
                    .into(),
                priority: TaskPriority::Critical,
                timeout: Some(Duration::from_secs(3000)),
                max_retries: 1,
                ..Default::default()
            },
            ResearchTask {
                id: 5,
                subject: "novelty-synthesis-gaps".into(),
                preamble: "You are a research strategist. Based on findings from tasks 1–4, \
                           synthesise which pipeline modules have the most undocumented research \
                           activity in 2026. Identify new research directions not covered by existing \
                           8 modules: privacy, multi-language support, compliance, federated learning."
                    .into(),
                description: "Search for: 'privacy-preserving web crawling GDPR 2025 2026', \
                              'multilingual entity resolution company 2025 2026', \
                              'federated learning lead generation pipeline', \
                              'compliance GDPR web data ML pipeline 2025'. \
                              Synthesise from tasks 1–4: \
                              (1) which modules have most new 2026 papers, \
                              (2) techniques superseding 3+ documented methods, \
                              (3) new module candidates (Module 9+)."
                    .into(),
                priority: TaskPriority::Normal,
                dependencies: vec![1, 2, 3, 4],
                timeout: Some(Duration::from_secs(3600)),
                max_retries: 1,
                ..Default::default()
            },
        ],
    }
}

/// All 9 prompt specs, in order.
pub fn all_prompts() -> Vec<PromptSpec> {
    vec![
        prompt_1(),
        prompt_2(),
        prompt_3(),
        prompt_4(),
        prompt_5(),
        prompt_6(),
        prompt_7(),
        prompt_8(),
        prompt_9(),
    ]
}
