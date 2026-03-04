/// `sdd-research` — Run the full SDD pipeline on the BS Detector challenge
/// via DeepSeek API. Spec + Design run in parallel automatically.
///
/// Outputs each phase result to `sdd-lh-ai-fs/` directory.
use anyhow::{Context, Result};
use async_trait::async_trait;
use reqwest;
use sdd::{
    ChatRequest, ChatResponse, LlmClient, SddChange, SddError, SddPipeline,
};

// ── DeepSeek LlmClient implementation ────────────────────────────────────

struct DeepSeekLlm {
    http: reqwest::Client,
    api_key: String,
    base_url: String,
}

impl DeepSeekLlm {
    fn new(api_key: String, base_url: String) -> Self {
        Self {
            http: reqwest::Client::new(),
            api_key,
            base_url,
        }
    }
}

#[async_trait]
impl LlmClient for DeepSeekLlm {
    async fn chat(&self, request: &ChatRequest) -> sdd::Result<ChatResponse> {
        let url = format!("{}/chat/completions", self.base_url);

        eprintln!(
            "  → DeepSeek {} | {} msgs | temp={:.1}",
            request.model,
            request.messages.len(),
            request.temperature.unwrap_or(0.0),
        );

        let resp = self
            .http
            .post(&url)
            .bearer_auth(&self.api_key)
            .json(request)
            .send()
            .await
            .map_err(|e| SddError::Llm(format!("HTTP error: {e}")))?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(SddError::Llm(format!("API {status}: {text}")));
        }

        resp.json::<ChatResponse>()
            .await
            .map_err(|e| SddError::Llm(format!("Parse error: {e}")))
    }
}

// ── Main ─────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<()> {
    let api_key =
        std::env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| "https://api.deepseek.com/v1".into());

    let client = DeepSeekLlm::new(api_key, base_url);
    let pipeline = SddPipeline::new(client);

    // Build the SDD change describing the BS Detector implementation
    let repo_context = include_str!("repo_data/readme.md");
    let msj = include_str!("repo_data/msj.txt");
    let police = include_str!("repo_data/police.txt");
    let medical = include_str!("repo_data/medical.txt");
    let witness = include_str!("repo_data/witness.txt");

    let description = format!(
        r#"Build a multi-agent AI pipeline ("BS Detector") that analyzes legal briefs for misrepresentations.

## Challenge Context
This is the JuanVazTor/lh-ai-fs take-home challenge. The pipeline must:
- Extract all citations from a Motion for Summary Judgment
- Verify cited authority actually supports the propositions claimed
- Cross-reference facts against police report, medical records, witness statement
- Produce structured JSON verification report
- Include eval harness measuring precision, recall, hallucination rate

## Key Documents (embedded for analysis)

### README / Challenge Spec
{repo_context}

### Motion for Summary Judgment (first 2000 chars)
{msj_excerpt}

### Police Report (first 1500 chars)
{police_excerpt}

### Medical Records (first 1000 chars)
{medical_excerpt}

### Witness Statement (first 1500 chars)
{witness_excerpt}

## Known Discrepancies (ground truth for eval design)
1. Date: MSJ says March 14 vs all others say March 12
2. PPE: MSJ claims no harness vs police/witness confirm harness worn
3. Privette quote: inserted "never" — actual holding is presumptive, not absolute
4. Statute of limitations: wrong date makes calculation incorrect
5. Retained control: Harmon foreman directed work, overruled safety concerns
6. Citation stuffing: Texas/Florida cases cited in California lawsuit
7. Scaffolding condition: MSJ silent, other docs detail rust/plywood issues
8. Post-incident rebuild: scaffolding replaced with new components (spoliation risk)

## Tech Stack
- Backend: Python/FastAPI (starter code provided)
- Frontend: React/Vite (minimal starter)
- LLM: OpenAI GPT-4o via provided helper
- Docker Compose for local dev

## Constraints
- 6-hour time limit
- Evaluation criteria: agent decomposition, prompt precision, eval quality, progress, honest reflection"#,
        msj_excerpt = &msj[..msj.len().min(2000)],
        police_excerpt = &police[..police.len().min(1500)],
        medical_excerpt = &medical[..medical.len().min(1000)],
        witness_excerpt = &witness[..witness.len().min(1500)],
    );

    let mut change = SddChange::new("bs-detector-pipeline", description);

    // Create output directory
    let out_dir = "sdd-lh-ai-fs";
    std::fs::create_dir_all(out_dir)?;

    eprintln!("Starting SDD full pipeline (spec ⟂ design run in parallel)...\n");

    let result = pipeline.full_pipeline(&mut change, "").await
        .map_err(|e| anyhow::anyhow!("Pipeline error: {e}"))?;

    // Write the full result
    let result_str = serde_json::to_string_pretty(&result)?;
    let out_path = format!("{out_dir}/pipeline-result.json");
    std::fs::write(&out_path, &result_str)?;
    eprintln!("\nWrote pipeline result to {out_path}");

    // Write individual phase artifacts
    for (phase_name, artifact) in &change.artifacts {
        let phase_result = artifact["result"].as_str().unwrap_or("");
        if !phase_result.is_empty() {
            let path = format!("{out_dir}/{phase_name}.md");
            std::fs::write(&path, phase_result)?;
            eprintln!("Wrote {path} ({} bytes)", phase_result.len());
        }
    }

    eprintln!(
        "\nPhases completed: {:?}",
        change
            .phases_completed
            .iter()
            .map(|p| p.as_str())
            .collect::<Vec<_>>()
    );

    Ok(())
}
