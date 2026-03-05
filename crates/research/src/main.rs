use anyhow::{Context, Result};
use research::team::{ResearchTask, TaskStatus, TeamConfig, TeamLead};

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";
const OUT_DIR: &str = "research-output";

fn research_tasks() -> Vec<ResearchTask> {
    vec![
        ResearchTask {
            id: 1,
            subject: "foundations".into(),
            description: "Research the theoretical foundations of Spec-Driven Development (SDD): \
                formal specification languages (Z, Alloy, TLA+), design-by-contract, \
                executable specs, and how specs act as the single source of truth across \
                parallel workstreams. Search for seminal papers and recent work (2015+). \
                Summarise: (1) key formalisms, (2) tool support, (3) adoption in industry."
                .into(),
            preamble: "You are a software engineering researcher specialising in formal \
                specification methods. Produce a structured literature review in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 2,
            subject: "parallel-team-coordination".into(),
            description: "Research how parallel development teams use specifications to coordinate \
                without tight coupling. Focus on: contract-first APIs, interface agreements, \
                consumer-driven contract testing (Pact), and spec-as-coordination-protocol \
                patterns. Find papers on team topology, Conway's Law, and spec synchronisation \
                in distributed organisations (2015-2026)."
                .into(),
            preamble: "You are an expert in large-scale agile and multi-team software delivery. \
                Produce concise, practical findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 3,
            subject: "bdd-tdd-parallel".into(),
            description: "Research how BDD (Cucumber, SpecFlow, Gherkin) and TDD enable parallel \
                development: multiple engineers working simultaneously from shared scenarios, \
                living documentation, and outside-in development. Include: tooling ecosystems, \
                empirical studies on parallel productivity, and how feature files act as \
                executable contracts between teams (2013-2026)."
                .into(),
            preamble: "You are a practitioner-researcher in test-driven and behaviour-driven \
                development. Produce evidence-based findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 4,
            subject: "api-first-openapi".into(),
            description: "Research OpenAPI/AsyncAPI contract-first development for parallel teams: \
                how a machine-readable spec lets frontend, backend, and QA work simultaneously. \
                Find papers on: API-first methodology, mock-server driven development, \
                spec linting and versioning, and case studies of organisations that adopted \
                contract-first to parallelise delivery (2016-2026)."
                .into(),
            preamble: "You are an API design and microservices architecture researcher. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 5,
            subject: "model-driven-engineering".into(),
            description: "Research Model-Driven Architecture (MDA) and model-driven engineering (MDE) \
                as enablers of parallel development: how platform-independent models allow \
                multiple platform-specific implementations to proceed in parallel. Include: \
                UML, DSLs, code generation, and empirical evidence on parallelism gains \
                from model-level specs (2010-2026)."
                .into(),
            preamble: "You are a model-driven engineering researcher. Produce a concise \
                literature review in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 6,
            subject: "requirements-engineering".into(),
            description: "Research requirements engineering practices that enable parallel development: \
                lightweight formal requirements, EARS notation, structured user stories, \
                acceptance criteria as executable specs, and traceability from requirements \
                to parallel implementation tasks. Find empirical studies on requirement-driven \
                parallelism (2015-2026)."
                .into(),
            preamble: "You are a requirements engineering researcher specialising in distributed \
                and agile contexts. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 7,
            subject: "continuous-integration-spec-gates".into(),
            description: "Research how CI/CD pipelines enforce spec compliance to keep parallel \
                branches converging safely: spec linting gates, contract testing in CI, \
                schema registry validation, and automated backwards-compatibility checks. \
                Find papers on spec-driven CI, mutation testing of specs, and deployment \
                safety for parallel feature branches (2016-2026)."
                .into(),
            preamble: "You are a DevOps and continuous integration researcher. \
                Produce practical, evidence-based findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 8,
            subject: "property-based-testing".into(),
            description: "Research property-based testing (QuickCheck, PropEr, Hypothesis) as a \
                parallel SDD enabler: how properties derived from specs allow independent \
                generators/shrinkers to run in parallel, shrink counterexamples, and \
                validate implementations against formal properties without global coordination. \
                Include stateful model testing (Erlang QuickCheck, Jepsen) (2010-2026)."
                .into(),
            preamble: "You are a researcher in formal verification and property-based testing. \
                Produce rigorous, structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 9,
            subject: "event-driven-async-specs".into(),
            description: "Research AsyncAPI, event schema registries (Confluent Schema Registry, AWS EventBridge), \
                and event-driven specs as the contract enabling parallel microservice development. \
                How do producers and consumers evolve independently when bound by a shared \
                schema spec? Include: event storming, domain event specs, and parallel team \
                autonomy in event-driven systems (2017-2026)."
                .into(),
            preamble: "You are a distributed systems and event-driven architecture researcher. \
                Produce clear, structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 10,
            subject: "ai-llm-spec-generation".into(),
            description: "Research AI and LLM-assisted spec generation for parallel development: \
                using LLMs to draft OpenAPI specs, BDD scenarios, formal properties, and \
                acceptance criteria that unblock parallel implementation. Include: \
                GitHub Copilot for specs, LLM-to-spec pipelines, automated spec \
                consistency checking, and emerging AI-native SDD workflows (2022-2026)."
                .into(),
            preamble: "You are an AI-assisted software engineering researcher. \
                Produce forward-looking, evidence-based findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1, 2],
            result: None,
        },
    ]
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

    std::fs::create_dir_all(OUT_DIR)
        .with_context(|| format!("creating output dir {OUT_DIR}"))?;

    let tasks = research_tasks();
    eprintln!("Launching team: 20 workers, {} tasks\n", tasks.len());

    let lead = TeamLead::new(TeamConfig {
        team_size: 20,
        api_key,
        base_url,
        scholar_key,
        code_root: None,
    });

    let result = lead.run(tasks).await?;

    // Write per-agent results.
    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content)
            .with_context(|| format!("writing {path}"))?;
        eprintln!("  wrote {path} ({} bytes)", content.len());
    }

    // Write synthesis.
    let synthesis_path = format!("{OUT_DIR}/synthesis.md");
    std::fs::write(&synthesis_path, &result.synthesis)
        .with_context(|| format!("writing {synthesis_path}"))?;
    eprintln!("  wrote {synthesis_path} ({} bytes)", result.synthesis.len());

    // Write combined report.
    let mut combined = String::from("# SDD Research — Complete Report\n\n");
    for (id, subject, content) in &result.findings {
        combined.push_str(&format!("## Agent {id}: {subject}\n\n{content}\n\n---\n\n"));
    }
    combined.push_str("## Synthesis\n\n");
    combined.push_str(&result.synthesis);

    let combined_path = format!("{OUT_DIR}/sdd-research-complete.md");
    std::fs::write(&combined_path, &combined)
        .with_context(|| format!("writing {combined_path}"))?;
    eprintln!("  wrote {combined_path} ({} bytes)", combined.len());

    eprintln!("\nDone.");
    Ok(())
}
