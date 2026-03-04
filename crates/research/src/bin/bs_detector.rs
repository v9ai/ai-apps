/// `bs-detector` — 4 parallel DeepSeek agents analyzing legal documents.
///
/// Agent pipeline (mirrors the Python implementation):
///   1. Document Parser    — extracts citations + facts from MSJ
///   2. Citation Verifier  — verifies each citation (runs after parser)
///   3. Fact Checker       — cross-references facts across all docs (parallel with #2)
///   4. Report Synthesizer — combines results into final report (runs after #2 + #3)
///
/// Agents 2 & 3 run in parallel via `tokio::join!`.
/// All inference via DeepSeek Reasoner — zero Claude tokens.
use anyhow::{Context, Result};
use research::agent::Client;
use std::time::Instant;

const MSJ: &str = include_str!("repo_data/msj.txt");
const POLICE: &str = include_str!("repo_data/police.txt");
const MEDICAL: &str = include_str!("repo_data/medical.txt");
const WITNESS: &str = include_str!("repo_data/witness.txt");

fn make_client() -> Result<(Client, String)> {
    let api_key =
        std::env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| "https://api.deepseek.com".into());
    Ok((Client::new(&api_key), base_url))
}

#[tokio::main]
async fn main() -> Result<()> {
    let (client, base_url) = make_client()?;
    let out_dir = "bs-detector-output";
    std::fs::create_dir_all(out_dir)?;

    let t0 = Instant::now();

    // ── Agent 1: Document Parser (must run first) ────────────────────────
    eprintln!("[1/4] Document Parser — extracting citations and facts from MSJ...");
    let parser_agent = client
        .agent("deepseek-reasoner")
        .preamble(
            "You are a legal document parser. Extract ALL legal citations and factual claims \
             from the Motion for Summary Judgment. Be exhaustive. Output valid JSON.",
        )
        .base_url(&base_url)
        .worker_id("parser")
        .build();

    let parser_prompt = format!(
        r#"Extract every legal citation and factual claim from this Motion for Summary Judgment.

For each CITATION, identify:
1. Exact citation text (case name, volume, reporter, page)
2. The proposition the brief claims it supports
3. Any direct quotes attributed to the authority
4. Section where it appears

For each FACTUAL CLAIM, identify:
1. The claim text as stated
2. Category (date, PPE/safety, injury, timeline, scaffolding, control, OSHA)
3. Section where it appears

MOTION FOR SUMMARY JUDGMENT:
{MSJ}

Output a JSON object with two arrays: "citations" and "facts". Be thorough — miss nothing."#
    );

    let parser_result = parser_agent.prompt(parser_prompt).await?;
    std::fs::write(format!("{out_dir}/1-parser.json"), &parser_result)?;
    eprintln!("  ✓ Parser done ({} bytes, {:.1}s)", parser_result.len(), t0.elapsed().as_secs_f64());

    // ── Agents 2 & 3: Citation Verifier + Fact Checker (PARALLEL) ────────
    eprintln!("[2/4] Citation Verifier + [3/4] Fact Checker — running in PARALLEL...");
    let t_parallel = Instant::now();

    let citation_agent = client
        .agent("deepseek-reasoner")
        .preamble(
            "You are a legal citation verification expert. You verify whether legal citations \
             actually support the propositions claimed in briefs. You know California case law \
             deeply. You check for misquotations, mischaracterizations, fabricated citations, \
             and jurisdiction issues. Output structured Markdown analysis.",
        )
        .base_url(&base_url)
        .worker_id("citation-verifier")
        .build();

    let citation_prompt = format!(
        r#"Verify every legal citation in this Motion for Summary Judgment.

EXTRACTED CITATIONS AND CLAIMS:
{parser_result}

FULL MSJ TEXT:
{MSJ}

For EACH citation, analyze:

1. **Quote accuracy**: If the MSJ includes a direct quote, is it verbatim? Look for inserted or omitted words.
   - CRITICAL: Privette v. Superior Court, 5 Cal.4th 689 (1993) — the MSJ quotes it as saying "A hirer is NEVER liable." Check if "never" actually appears in the holding. The real Privette holding creates a rebuttable PRESUMPTION, not absolute immunity. Exceptions exist for retained control, concealed hazards, and non-delegable duties.

2. **Proposition support**: Does the cited case actually stand for what the MSJ claims?
   - Seabright Insurance Co. v. US Airways, Inc., 52 Cal.4th 590 (2011) — check what this case actually held vs. how MSJ uses it.
   - Kellerman v. Pacific Coast Construction — is this a real case? What jurisdiction?

3. **Jurisdiction relevance**: Is each citation binding authority in California state court?
   - Flag any federal court cases (persuasive only, not binding)
   - Flag any out-of-state cases (Texas, Florida, etc.)

4. **Existence**: Could any footnote citations be fabricated?
   - Check: Whitmore v. Delgado Scaffolding Co., Torres v. Granite Falls, Blackwell v. Sunrise, Dixon v. Lone Star, Okafor v. Brightline, Nguyen v. Allied Pacific, Reeves v. Summit Engineering

For each citation, provide:
- Status: SUPPORTED / NOT_SUPPORTED / MISLEADING / COULD_NOT_VERIFY
- Confidence: 0-100
- Discrepancies found
- Severity: CRITICAL / HIGH / MEDIUM / LOW

Be thorough and skeptical. This is a BS detector — assume nothing."#
    );

    let fact_agent = client
        .agent("deepseek-reasoner")
        .preamble(
            "You are a legal fact-checking expert. You cross-reference factual claims in legal \
             briefs against supporting documents (police reports, medical records, witness \
             statements). You identify every discrepancy, contradiction, and material omission. \
             Output structured Markdown analysis.",
        )
        .base_url(&base_url)
        .worker_id("fact-checker")
        .build();

    let fact_prompt = format!(
        r#"Cross-reference every factual claim in the Motion for Summary Judgment against the police report, medical records, and witness statement.

MOTION FOR SUMMARY JUDGMENT:
{MSJ}

POLICE REPORT:
{POLICE}

MEDICAL RECORDS:
{MEDICAL}

WITNESS STATEMENT:
{WITNESS}

Check these specific categories:

1. **DATES**: MSJ states "March 14, 2021" — what date do the other documents say?
2. **PPE/SAFETY EQUIPMENT**: MSJ claims Rivera "was not wearing required personal protective equipment" — what do the police report and witness statement say about his equipment?
3. **WHO DIRECTED THE WORK**: MSJ implies Harmon had no control (Privette doctrine) — but did Harmon's foreman Ray Donner direct the crew? Did he dismiss safety concerns?
4. **SCAFFOLDING CONDITION**: MSJ is silent — what do the police report and witness statement say about rust, plywood base, bent pins?
5. **OSHA COMPLIANCE**: MSJ claims "passed all OSHA inspections" — is this consistent with the documented safety concerns?
6. **INJURIES**: Are injury descriptions consistent across documents?
7. **STATUTE OF LIMITATIONS**: MSJ says "one year and 362 days" using March 14 date — recalculate using the correct date.
8. **POST-INCIDENT ACTIONS**: Did Harmon rebuild the scaffolding after the incident? What does this imply?

For each discrepancy:
- Quote the exact text from each document
- Rate severity: CRITICAL / HIGH / MEDIUM / LOW
- Rate confidence: 0-100
- Explain the legal significance

Be exhaustive. Every contradiction matters."#
    );

    // Run both agents in parallel
    let (citation_result, fact_result) = tokio::join!(
        citation_agent.prompt(citation_prompt),
        fact_agent.prompt(fact_prompt),
    );

    let citation_result = citation_result?;
    let fact_result = fact_result?;

    std::fs::write(format!("{out_dir}/2-citations.md"), &citation_result)?;
    std::fs::write(format!("{out_dir}/3-facts.md"), &fact_result)?;
    eprintln!(
        "  ✓ Citation Verifier done ({} bytes)",
        citation_result.len()
    );
    eprintln!("  ✓ Fact Checker done ({} bytes)", fact_result.len());
    eprintln!(
        "  ✓ Parallel phase completed in {:.1}s",
        t_parallel.elapsed().as_secs_f64()
    );

    // ── Agent 4: Report Synthesizer ──────────────────────────────────────
    eprintln!("[4/4] Report Synthesizer — compiling final report...");

    let synth_agent = client
        .agent("deepseek-reasoner")
        .preamble(
            "You are a legal report synthesizer. You combine citation verification and \
             fact-checking results into a comprehensive, structured verification report. \
             Include a judicial memo paragraph. Output Markdown.",
        )
        .base_url(&base_url)
        .worker_id("synthesizer")
        .build();

    let synth_prompt = format!(
        r#"Synthesize the citation verification and fact-checking results into a final BS Detector report.

## Citation Verification Results
{citation_result}

## Fact-Checking Results
{fact_result}

Create a structured report with:

1. **Executive Summary** — 3-5 sentence overview of the most critical findings

2. **Top Findings** — ranked by severity and confidence, each with:
   - ID (e.g., DATE-001, PPE-001, CIT-001)
   - Type (citation / fact / omission)
   - Severity (CRITICAL / HIGH / MEDIUM / LOW)
   - Confidence (0-100)
   - Description
   - Evidence (exact quotes from documents)
   - Legal significance

3. **Confidence Scores**
   - Citation verification confidence (0-100)
   - Fact consistency confidence (0-100)
   - Overall pipeline confidence (0-100)

4. **Unverifiable Items** — claims that could not be confirmed or denied

5. **Judicial Memo** — ONE PARAGRAPH for a judge summarizing the most material issues.
   Write in formal legal language. Be specific about which MSJ claims are contradicted
   and by what evidence. 3-5 sentences maximum.

6. **Methodology** — brief description of the verification approach

Make the report suitable for legal review."#
    );

    let synth_result = synth_agent.prompt(synth_prompt).await?;
    std::fs::write(format!("{out_dir}/4-report.md"), &synth_result)?;
    eprintln!(
        "  ✓ Synthesizer done ({} bytes)",
        synth_result.len()
    );

    // ── Write combined output ────────────────────────────────────────────
    let combined = format!(
        "# BS Detector — Full Verification Report\n\
         _Generated by 4 parallel DeepSeek Reasoner agents_\n\
         _Total time: {:.1}s_\n\n\
         ---\n\n\
         {synth_result}\n\n\
         ---\n\n\
         # Appendix A: Citation Verification Details\n\n\
         {citation_result}\n\n\
         ---\n\n\
         # Appendix B: Fact-Checking Details\n\n\
         {fact_result}\n\n\
         ---\n\n\
         # Appendix C: Document Parser Output\n\n\
         ```json\n{parser_result}\n```\n",
        t0.elapsed().as_secs_f64()
    );

    let report_path = format!("{out_dir}/bs-detector-report.md");
    std::fs::write(&report_path, &combined)?;

    eprintln!("\n============================================================");
    eprintln!("BS Detector complete in {:.1}s", t0.elapsed().as_secs_f64());
    eprintln!("Output: {out_dir}/");
    eprintln!("  1-parser.json    — extracted citations + facts");
    eprintln!("  2-citations.md   — citation verification");
    eprintln!("  3-facts.md       — cross-document fact checking");
    eprintln!("  4-report.md      — synthesized report");
    eprintln!("  bs-detector-report.md — full combined report");

    Ok(())
}
