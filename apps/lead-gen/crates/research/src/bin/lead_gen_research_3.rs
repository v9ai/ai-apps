/// Lead-gen research prompt 3 — Extraction / NER
/// Zero-shot NER, LLM structured extraction, DOM-aware, topic modeling
use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskPriority, TeamConfig, TeamLead};
use std::time::Duration;

const OUT_DIR: &str = "../../docs/research-output/03-extraction";

fn tasks() -> Vec<ResearchTask> {
    vec![
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
    ]
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let api_key = std::env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| "https://api.deepseek.com".into());
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();

    std::fs::create_dir_all(OUT_DIR).with_context(|| format!("creating {OUT_DIR}"))?;

    let tasks = tasks();
    eprintln!("[prompt-3] Launching: 4 workers, {} tasks", tasks.len());

    let lead = TeamLead::new(TeamConfig {
        team_size: 4,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(OUT_DIR.into()),
        scholar_concurrency: Some(3),
        synthesis_preamble: Some(
            "You are an NLP researcher specialising in information extraction for web-scale data. \
             Synthesise findings on NER and relation extraction, contrasting each against the current \
             BERT NER baseline (F1 92.3%, ~100 pages/sec). Prioritise techniques that: \
             (1) improve PRODUCT entity F1 without re-labelling, \
             (2) add new entity types zero-shot, \
             (3) exploit DOM structure. Must sustain ~100 pages/sec on a single machine. \
             Rank each paper by (F1_delta + new_types_enabled) ÷ implementation_hours."
                .into(),
        ),
        ..Default::default()
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content).with_context(|| format!("writing {path}"))?;
        eprintln!("[prompt-3] wrote {path} ({} bytes)", content.len());
    }
    std::fs::write(format!("{OUT_DIR}/synthesis.md"), &result.synthesis)?;
    eprintln!("[prompt-3] Done.");
    Ok(())
}
