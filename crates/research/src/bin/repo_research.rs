/// `repo-research` — Deep research analysis of JuanVazTor/lh-ai-fs via DeepSeek Reasoner.
///
/// Sends the full repo contents to DeepSeek for analysis and writes the response
/// to `research-lh-ai-fs.md` in the repo root.
use anyhow::{Context, Result};
use research::agent::Client;

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";

#[tokio::main]
async fn main() -> Result<()> {
    let api_key = std::env::var("DEEPSEEK_API_KEY")
        .context("DEEPSEEK_API_KEY must be set")?;
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| DEFAULT_BASE_URL.to_string());

    let client = Client::new(&api_key);
    let agent = client
        .agent("deepseek-reasoner")
        .preamble(
            "You are a senior software architect and legal-tech expert. \
             You produce thorough, structured research analyses in Markdown. \
             Be specific, cite exact text from documents, and identify all discrepancies.",
        )
        .base_url(&base_url)
        .build();

    let prompt = format!(
        r#"# Deep Research: JuanVazTor/lh-ai-fs (BS Detector)

Analyze this GitHub repository thoroughly. I'm providing the complete source code and all documents below.

## Research Focus

1. **Challenge Requirements Analysis** — What exactly is being asked? Break down the tier structure (Core/Expected/Stretch) and evaluate feasibility within the 6-hour constraint.

2. **Legal Document Discrepancy Analysis** — This is the core value. Cross-reference every factual claim in the Motion for Summary Judgment against the police report, medical records, and witness statement. Identify ALL planted errors, including:
   - Date discrepancies
   - Factual contradictions about PPE/safety equipment
   - Mischaracterized legal citations (look up Privette v. Superior Court — does the quote attributed to it at page 702 actually say "A hirer is **never** liable..."? The real holding is more nuanced)
   - Statute of limitations calculation issues
   - Who directed the crew and whether Harmon had actual control
   - Any fabricated or suspicious case citations in the footnotes

3. **Recommended Multi-Agent Pipeline Design** — Design the optimal agent architecture for this challenge. Consider:
   - Citation Extractor agent
   - Citation Verifier agent (checking if legal citations support the propositions claimed)
   - Cross-Document Fact Checker agent
   - Report Synthesizer / Judicial Memo agent
   - How should agents communicate? What data structures to pass?

4. **Evaluation Strategy** — Design the eval harness. What metrics matter? How to measure precision, recall, and hallucination rate for legal document analysis?

5. **Implementation Roadmap** — If building this in 6 hours, what's the optimal time allocation? What to prioritize vs. skip?

## Repository Contents

### README.md

{readme}

### backend/main.py

{main_py}

### backend/llm.py

{llm_py}

### backend/documents/motion_for_summary_judgment.txt

{msj}

### backend/documents/police_report.txt

{police}

### backend/documents/medical_records_excerpt.txt

{medical}

### backend/documents/witness_statement.txt

{witness}

### frontend/src/App.jsx

{app_jsx}

### docker-compose.yml

{docker}

---

Produce a comprehensive research report in Markdown format. Be exhaustive in the discrepancy analysis — this is the most valuable part."#,
        readme = include_str!("repo_data/readme.md"),
        main_py = include_str!("repo_data/main.py"),
        llm_py = include_str!("repo_data/llm.py"),
        msj = include_str!("repo_data/msj.txt"),
        police = include_str!("repo_data/police.txt"),
        medical = include_str!("repo_data/medical.txt"),
        witness = include_str!("repo_data/witness.txt"),
        app_jsx = include_str!("repo_data/app.jsx"),
        docker = include_str!("repo_data/docker.yml"),
    );

    eprintln!("Sending to DeepSeek Reasoner at {base_url}...");
    eprintln!("Prompt length: {} chars", prompt.len());

    let response = agent.prompt(prompt).await?;

    let out_path = "research-lh-ai-fs.md";
    std::fs::write(out_path, &response)?;
    eprintln!("Wrote {} bytes to {out_path}", response.len());

    Ok(())
}
