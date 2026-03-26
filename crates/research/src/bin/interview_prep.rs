use anyhow::{Context, Result};
use research::dual::{DualModelResearcher, format_prep_document};

const OUT_DIR: &str = "research-output/interview-prep";

const SYSTEM: &str = "\
You are a senior legal AI engineer preparing for a technical interview about \
a multi-agent AI pipeline called 'BS Detector' — a system that verifies legal \
briefs by catching citation errors, factual inconsistencies, and hallucinated \
case law. The system has 5 specialized agents: Document Parser, Citation Verifier, \
Fact Checker, Report Synthesizer, and Judicial Memo Writer. Citation verification \
and fact checking run in parallel via asyncio.gather(). Each agent uses Pydantic \
structured output. The eval harness tracks recall, precision, hallucination rate, \
and grounding against 8 planted discrepancies in a test case (Rivera v. Harmon).

Provide deep, technical, production-oriented answers. Include specific references \
to papers, systems, or techniques where relevant. Be honest about trade-offs \
and limitations. Your answers should demonstrate the depth of someone who has \
actually built and shipped these systems.";

fn architecture_questions() -> Vec<&'static str> {
    vec![
        "Why decompose into exactly 5 agents rather than 3 or 7? What's the design \
         principle for deciding agent boundaries in a legal document verification pipeline? \
         How would you know if you have too many or too few agents? Discuss the \
         coordination overhead vs. specialization tradeoff.",

        "The Citation Verifier and Fact Checker run in parallel via asyncio.gather(). \
         What are the hidden assumptions in this design? When would parallel execution \
         be WRONG — what data dependencies could emerge in a more complex legal analysis \
         that would break this parallelism? How would you detect and handle such dependencies?",

        "Every agent uses Pydantic structured output (typed contracts). What happens \
         when the LLM violates the schema? How do you handle partial conformance? \
         Compare structured output approaches: JSON mode, function calling, constrained \
         decoding, and post-hoc parsing. What are the failure modes of each?",

        "The 5th agent (Judicial Memo) was separated from Report Synthesizer during \
         development. Walk through the decision process: when should aggregation and \
         generation be split? What quality signal told you the combined agent was doing \
         too much? How do you measure whether the split actually improved output quality?",

        "The orchestrator tracks agent status (pending/running/success/failed) with \
         timing. If the Citation Verifier fails, the pipeline continues with Fact Checker \
         results only. What's the theoretical framework for deciding when partial results \
         are 'good enough'? How would you formally define degraded-mode guarantees?",
    ]
}

fn citation_verification_questions() -> Vec<&'static str> {
    vec![
        "The Citation Verifier currently relies on LLM training data for case law \
         verification in unknown cases. This is the biggest gap. Design a production \
         citation verification system: what would the architecture look like with \
         Westlaw/LexisNexis integration? How do you handle the latency, cost, and \
         API rate limits of external legal databases? What caching strategies apply?",

        "Describe the specific failure modes of LLM-based citation verification: \
         (1) the case exists but says something different than claimed, (2) the case \
         doesn't exist at all (hallucinated), (3) the case exists but was overruled, \
         (4) the quote is accurate but taken out of context. How would you build \
         detection for each failure mode? What's the recall/precision tradeoff for each?",

        "The Privette v. Superior Court misquotation (inserting 'never' into a nuanced \
         holding) was caught because the prompt included domain-specific legal knowledge \
         via case_context injection. How does this approach scale? What happens when \
         you have 10,000 possible cases to verify across different jurisdictions? \
         Design a scalable case law knowledge injection system.",

        "Citation verification in legal AI has a fundamental asymmetry: false negatives \
         (missing a bad citation) can lead to sanctions, while false positives (flagging \
         a good citation) waste attorney time. How should this asymmetry influence your \
         system design? What operating point on the precision-recall curve is appropriate \
         for different use cases (pre-filing review vs. opposing counsel analysis)?",
    ]
}

fn eval_questions() -> Vec<&'static str> {
    vec![
        "The eval harness uses dual evaluation: keyword matching (fast, deterministic) \
         and LLM-as-judge (semantic, non-deterministic). Walk through the design space \
         of combining these signals. When do they disagree? How would you calibrate the \
         LLM judge — what reference distributions would you need? What's the cost-accuracy \
         tradeoff of running both vs. just keyword matching in CI?",

        "8 planted discrepancies in one test case. How would you design an eval suite \
         for production? What's the minimum number of test briefs needed for statistical \
         significance? How do you handle the long tail of error types (not just the 8 \
         categories you planted)? Design an eval suite that catches both known and \
         unknown failure modes.",

        "Confidence scores in the pipeline are LLM-generated estimates, not calibrated \
         probabilities. The reflection honestly admits this. How would you actually \
         calibrate these scores? Describe Platt scaling, temperature scaling, and \
         isotonic regression for LLM confidence calibration. What ground truth data \
         would you need? How many samples for reliable calibration?",

        "The negative test (clean documents) checks for <=1 finding and 0 contradictions. \
         This is a precision test — does the system hallucinate problems that don't exist? \
         How would you design a comprehensive precision evaluation? What types of \
         adversarial 'clean' documents would stress-test the system's false positive rate?",
    ]
}

fn production_questions() -> Vec<&'static str> {
    vec![
        "Take this pipeline to production serving 100 law firms. What changes? Think about: \
         document parsing (PDF/DOCX, not just text), multi-tenancy, latency SLOs, \
         cost per analysis, caching strategies, human-in-the-loop review, audit logging \
         for compliance, and handling confidential legal documents securely.",

        "The current system does single-pass analysis — one LLM call per citation/fact. \
         Design a multi-pass verification pipeline where the system can ask clarifying \
         questions, request additional context, or escalate uncertain findings to a \
         human reviewer. What's the latency budget? How do you decide when to stop?",

        "How would you handle model updates (GPT-4 to GPT-5, Claude 3 to Claude 4) \
         in production? Your eval suite shows 75% recall today — what if a model update \
         drops it to 60%? Design a model evaluation and rollback strategy. How do you \
         maintain eval parity across model versions?",

        "The system currently uses a single LLM provider. Design a multi-model \
         architecture where critical verifications are cross-checked by multiple models. \
         When do two models disagree? How do you resolve disagreements? What's the \
         cost multiplier and is it justified for high-stakes legal analysis?",
    ]
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let researcher = DualModelResearcher::from_env()
        .context("Failed to init dual-model researcher")?;

    std::fs::create_dir_all(OUT_DIR)
        .with_context(|| format!("creating {OUT_DIR}"))?;

    // Run all question categories
    let categories: Vec<(&str, Vec<&str>)> = vec![
        ("Architecture Deep Dive", architecture_questions()),
        ("Citation Verification Gaps", citation_verification_questions()),
        ("Evaluation & Metrics", eval_questions()),
        ("Production Readiness", production_questions()),
    ];

    let mut all_responses = Vec::new();

    for (category, questions) in &categories {
        eprintln!("\n{}", "=".repeat(60));
        eprintln!("  CATEGORY: {category}");
        eprintln!("{}", "=".repeat(60));

        let responses = researcher.query_all(SYSTEM, questions).await;

        // Write per-category file
        let slug = category.to_lowercase().replace(' ', "-").replace('&', "and");
        let doc = format_prep_document(
            &format!("Interview Prep: {category}"),
            &responses,
        );
        let path = format!("{OUT_DIR}/{slug}.md");
        std::fs::write(&path, &doc)
            .with_context(|| format!("writing {path}"))?;
        eprintln!("  Wrote {path} ({} bytes)", doc.len());

        all_responses.extend(responses);
    }

    // Write combined document
    let combined = format_prep_document(
        "Learned Hand Interview Prep — Complete Research",
        &all_responses,
    );
    let combined_path = format!("{OUT_DIR}/complete-prep.md");
    std::fs::write(&combined_path, &combined)
        .with_context(|| format!("writing {combined_path}"))?;
    eprintln!("\nWrote {combined_path} ({} bytes)", combined.len());

    eprintln!("\nDone. {} questions researched across {} categories.",
        all_responses.len(), categories.len());
    Ok(())
}
