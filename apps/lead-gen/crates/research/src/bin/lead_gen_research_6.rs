/// Lead-gen research prompt 6 — Report Generation / RAG
/// Advanced RAG, hallucination mitigation, chunking strategies, local LLM deployment
use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskPriority, TeamConfig, TeamLead};
use std::time::Duration;

const OUT_DIR: &str = "../../docs/research-output/06-report-generation";

fn tasks() -> Vec<ResearchTask> {
    vec![
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
    eprintln!("[prompt-6] Launching: 4 workers, {} tasks", tasks.len());

    let lead = TeamLead::new(TeamConfig {
        team_size: 4,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(OUT_DIR.into()),
        scholar_concurrency: Some(3),
        synthesis_preamble: Some(
            "You are an NLP researcher specialising in retrieval-augmented generation for factual \
             report generation. Synthesise findings on RAG architecture, hallucination mitigation, \
             and chunking. Compare against current dual-source RAG (85% factual accuracy, 10–30 sec/report). \
             Produce a 3-tier upgrade plan: quick wins (<1 day), medium effort (1 week), \
             architectural changes (1 month) — each with factual accuracy and latency targets."
                .into(),
        ),
        ..Default::default()
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content).with_context(|| format!("writing {path}"))?;
        eprintln!("[prompt-6] wrote {path} ({} bytes)", content.len());
    }
    std::fs::write(format!("{OUT_DIR}/synthesis.md"), &result.synthesis)?;
    eprintln!("[prompt-6] Done.");
    Ok(())
}
