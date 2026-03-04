/// `parallel-sdd-research` — 10 parallel DeepSeek agents researching
/// "parallel spec-driven development" from different angles via Semantic Scholar.
///
/// Each agent gets a unique research angle, runs the full tool-use loop,
/// and writes its findings to `parallel-sdd-research/agent-NN-<topic>.md`.
/// A synthesis agent then combines all findings into a final report.
use anyhow::{Context, Result};
use research::{
    SemanticScholarClient,
    agent::Client,
    tools::{GetPaperDetail, SearchPapers, SearchToolConfig},
};
use tokio::task::JoinSet;

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";
const OUT_DIR: &str = "parallel-sdd-research";

// ── Research angles ───────────────────────────────────────────────────────────

struct ResearchAngle {
    id: usize,
    slug: &'static str,
    preamble: &'static str,
    prompt: &'static str,
}

const ANGLES: &[ResearchAngle] = &[
    ResearchAngle {
        id: 1,
        slug: "foundations",
        preamble: "You are a software engineering researcher specialising in formal \
                   specification methods. Produce a structured literature review in Markdown.",
        prompt: "Research the theoretical foundations of Spec-Driven Development (SDD): \
                 formal specification languages (Z, Alloy, TLA+), design-by-contract, \
                 executable specs, and how specs act as the single source of truth across \
                 parallel workstreams. Search for seminal papers and recent work (2015+). \
                 Summarise: (1) key formalisms, (2) tool support, (3) adoption in industry.",
    },
    ResearchAngle {
        id: 2,
        slug: "parallel-team-coordination",
        preamble: "You are an expert in large-scale agile and multi-team software delivery. \
                   Produce concise, practical findings in Markdown.",
        prompt: "Research how parallel development teams use specifications to coordinate \
                 without tight coupling. Focus on: contract-first APIs, interface agreements, \
                 consumer-driven contract testing (Pact), and spec-as-coordination-protocol \
                 patterns. Find papers on team topology, Conway's Law, and spec synchronisation \
                 in distributed organisations (2015-2026).",
    },
    ResearchAngle {
        id: 3,
        slug: "bdd-tdd-parallel",
        preamble: "You are a practitioner-researcher in test-driven and behaviour-driven \
                   development. Produce evidence-based findings in Markdown.",
        prompt: "Research how BDD (Cucumber, SpecFlow, Gherkin) and TDD enable parallel \
                 development: multiple engineers working simultaneously from shared scenarios, \
                 living documentation, and outside-in development. Include: tooling ecosystems, \
                 empirical studies on parallel productivity, and how feature files act as \
                 executable contracts between teams (2013-2026).",
    },
    ResearchAngle {
        id: 4,
        slug: "api-first-openapi",
        preamble: "You are an API design and microservices architecture researcher. \
                   Produce structured findings in Markdown.",
        prompt: "Research OpenAPI/AsyncAPI contract-first development for parallel teams: \
                 how a machine-readable spec lets frontend, backend, and QA work simultaneously. \
                 Find papers on: API-first methodology, mock-server driven development, \
                 spec linting and versioning, and case studies of organisations that adopted \
                 contract-first to parallelise delivery (2016-2026).",
    },
    ResearchAngle {
        id: 5,
        slug: "model-driven-engineering",
        preamble: "You are a model-driven engineering researcher. Produce a concise \
                   literature review in Markdown.",
        prompt: "Research Model-Driven Architecture (MDA) and model-driven engineering (MDE) \
                 as enablers of parallel development: how platform-independent models allow \
                 multiple platform-specific implementations to proceed in parallel. Include: \
                 UML, DSLs, code generation, and empirical evidence on parallelism gains \
                 from model-level specs (2010-2026).",
    },
    ResearchAngle {
        id: 6,
        slug: "requirements-engineering",
        preamble: "You are a requirements engineering researcher specialising in distributed \
                   and agile contexts. Produce structured findings in Markdown.",
        prompt: "Research requirements engineering practices that enable parallel development: \
                 lightweight formal requirements, EARS notation, structured user stories, \
                 acceptance criteria as executable specs, and traceability from requirements \
                 to parallel implementation tasks. Find empirical studies on requirement-driven \
                 parallelism (2015-2026).",
    },
    ResearchAngle {
        id: 7,
        slug: "continuous-integration-spec-gates",
        preamble: "You are a DevOps and continuous integration researcher. \
                   Produce practical, evidence-based findings in Markdown.",
        prompt: "Research how CI/CD pipelines enforce spec compliance to keep parallel \
                 branches converging safely: spec linting gates, contract testing in CI, \
                 schema registry validation, and automated backwards-compatibility checks. \
                 Find papers on spec-driven CI, mutation testing of specs, and deployment \
                 safety for parallel feature branches (2016-2026).",
    },
    ResearchAngle {
        id: 8,
        slug: "property-based-testing",
        preamble: "You are a researcher in formal verification and property-based testing. \
                   Produce rigorous, structured findings in Markdown.",
        prompt: "Research property-based testing (QuickCheck, PropEr, Hypothesis) as a \
                 parallel SDD enabler: how properties derived from specs allow independent \
                 generators/shrinkers to run in parallel, shrink counterexamples, and \
                 validate implementations against formal properties without global coordination. \
                 Include stateful model testing (Erlang QuickCheck, Jepsen) (2010-2026).",
    },
    ResearchAngle {
        id: 9,
        slug: "event-driven-async-specs",
        preamble: "You are a distributed systems and event-driven architecture researcher. \
                   Produce clear, structured findings in Markdown.",
        prompt: "Research AsyncAPI, event schema registries (Confluent Schema Registry, AWS EventBridge), \
                 and event-driven specs as the contract enabling parallel microservice development. \
                 How do producers and consumers evolve independently when bound by a shared \
                 schema spec? Include: event storming, domain event specs, and parallel team \
                 autonomy in event-driven systems (2017-2026).",
    },
    ResearchAngle {
        id: 10,
        slug: "ai-llm-spec-generation",
        preamble: "You are an AI-assisted software engineering researcher. \
                   Produce forward-looking, evidence-based findings in Markdown.",
        prompt: "Research AI and LLM-assisted spec generation for parallel development: \
                 using LLMs to draft OpenAPI specs, BDD scenarios, formal properties, and \
                 acceptance criteria that unblock parallel implementation. Include: \
                 GitHub Copilot for specs, LLM-to-spec pipelines, automated spec \
                 consistency checking, and emerging AI-native SDD workflows (2022-2026).",
    },
];

// ── Worker ────────────────────────────────────────────────────────────────────

async fn run_angle(
    angle_id: usize,
    angle_slug: String,
    preamble: String,
    prompt: String,
    api_key: String,
    base_url: String,
    scholar_key: Option<String>,
) -> Result<(usize, String, String)> {
    let worker_id = format!("worker-{:02}", angle_id);
    eprintln!("[{worker_id}] starting: {angle_slug}");

    let scholar = SemanticScholarClient::new(scholar_key.as_deref());
    let config = SearchToolConfig {
        default_limit: 10,
        abstract_max_chars: 500,
        max_authors: 5,
        include_fields_of_study: true,
        include_venue: true,
        search_description: None,
        detail_description: None,
    };

    let client = Client::new(&api_key);
    let agent = client
        .agent("deepseek-chat")
        .preamble(&preamble)
        .tool(SearchPapers::with_config(scholar.clone(), config.clone()))
        .tool(GetPaperDetail::with_config(scholar, config))
        .base_url(&base_url)
        .worker_id(&worker_id)
        .build();

    let result = agent
        .prompt(prompt)
        .await
        .with_context(|| format!("[{worker_id}] DeepSeek call failed"))?;

    eprintln!(
        "[{worker_id}] done — {} bytes",
        result.len()
    );

    Ok((angle_id, angle_slug, result))
}

// ── Synthesis ─────────────────────────────────────────────────────────────────

async fn synthesize(
    findings: &[(usize, String, String)],
    api_key: &str,
    base_url: &str,
) -> Result<String> {
    eprintln!("[synthesis] starting final synthesis across 10 findings…");

    let combined: String = findings
        .iter()
        .map(|(id, slug, content)| {
            format!("## Agent {id}: {slug}\n\n{content}\n\n---\n\n")
        })
        .collect();

    let client = Client::new(api_key);
    let agent = client
        .agent("deepseek-chat")
        .preamble(
            "You are a principal researcher synthesising findings from 10 specialist \
             research agents into a coherent, actionable report. Write in Markdown. \
             Be concise but comprehensive. Identify cross-cutting themes, convergences, \
             and contradictions across the findings.",
        )
        .base_url(base_url)
        .worker_id("synthesis")
        .build();

    let prompt = format!(
        r#"# Synthesis Request: Parallel Spec-Driven Development

You have received findings from 10 parallel research agents, each covering a different
angle of **Parallel Spec-Driven Development (SDD)**.

Your task: produce a **master synthesis report** with:

1. **Executive Summary** (3-5 key insights)
2. **Cross-Cutting Themes** — patterns that appear across multiple agents
3. **Convergent Evidence** — where multiple agents agree on a finding
4. **Tensions & Trade-offs** — where findings conflict or have nuance
5. **Recommended SDD Patterns for Parallel Teams** — concrete, actionable patterns
6. **Open Research Questions** — gaps the literature has not resolved
7. **Top 10 Must-Read Papers** — synthesised from all agent recommendations

## Agent Findings

{combined}
"#
    );

    let result = agent
        .prompt(prompt)
        .await
        .context("[synthesis] DeepSeek call failed")?;

    eprintln!("[synthesis] done — {} bytes", result.len());
    Ok(result)
}

// ── Main ──────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();

    let api_key =
        std::env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| DEFAULT_BASE_URL.to_string());
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();

    std::fs::create_dir_all(OUT_DIR)
        .with_context(|| format!("creating output dir {OUT_DIR}"))?;

    eprintln!("Launching {} parallel research agents…\n", ANGLES.len());

    // Spawn all agents concurrently
    let mut join_set: JoinSet<Result<(usize, String, String)>> = JoinSet::new();

    for angle in ANGLES {
        join_set.spawn(run_angle(
            angle.id,
            angle.slug.to_string(),
            angle.preamble.to_string(),
            angle.prompt.to_string(),
            api_key.clone(),
            base_url.clone(),
            scholar_key.clone(),
        ));
    }

    // Collect results as they complete
    let mut findings: Vec<(usize, String, String)> = Vec::with_capacity(ANGLES.len());

    while let Some(result) = join_set.join_next().await {
        match result {
            Ok(Ok((id, slug, content))) => {
                // Write individual agent output
                let path = format!("{OUT_DIR}/agent-{id:02}-{slug}.md");
                std::fs::write(&path, &content)
                    .with_context(|| format!("writing {path}"))?;
                eprintln!("  wrote {path}");
                findings.push((id, slug, content));
            }
            Ok(Err(e)) => {
                eprintln!("  agent error: {e:#}");
            }
            Err(join_err) => {
                eprintln!("  task panicked: {join_err}");
            }
        }
    }

    // Sort by agent ID for deterministic synthesis order
    findings.sort_by_key(|(id, _, _)| *id);

    eprintln!(
        "\nAll agents complete ({}/{} succeeded). Running synthesis…\n",
        findings.len(),
        ANGLES.len()
    );

    if findings.is_empty() {
        anyhow::bail!("All agents failed — nothing to synthesise");
    }

    let synthesis = synthesize(&findings, &api_key, &base_url).await?;

    let synthesis_path = format!("{OUT_DIR}/synthesis.md");
    std::fs::write(&synthesis_path, &synthesis)
        .with_context(|| format!("writing {synthesis_path}"))?;

    eprintln!("\nDone. Output files:");
    for (id, slug, content) in &findings {
        eprintln!(
            "  {OUT_DIR}/agent-{id:02}-{slug}.md ({} bytes)",
            content.len()
        );
    }
    eprintln!("  {synthesis_path} ({} bytes)", synthesis.len());

    Ok(())
}
