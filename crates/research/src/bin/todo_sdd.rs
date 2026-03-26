use anyhow::{Context, Result};
use sdd::{DeepSeekLlmClient, Provider, SddChange, SddPipeline};

const OUT_DIR: &str = "../../apps/todo/sdd";
const SYNTHESIS_PATH: &str = "../../apps/todo/research/synthesis.md";

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let synthesis = std::fs::read_to_string(SYNTHESIS_PATH)
        .with_context(|| format!("reading {SYNTHESIS_PATH}"))?;
    eprintln!("Loaded synthesis context: {} bytes", synthesis.len());

    std::fs::create_dir_all(OUT_DIR)
        .with_context(|| format!("creating output dir {OUT_DIR}"))?;

    let client = DeepSeekLlmClient::from_env().context("creating DeepSeek client")?;

    let mut pipeline = SddPipeline::with_provider(client, Provider::DeepSeek);
    pipeline = pipeline.max_verify_retries(1);

    let description = "\
        MANDATORY TECH STACK — every artifact MUST use exactly this stack:\n\
        - Framework: Next.js (latest) with App Router and React Server Components\n\
        - UI: React 19 + @radix-ui/themes (Radix UI theme tokens for styling, NO Tailwind)\n\
        - Database: Neon PostgreSQL (@neondatabase/serverless driver, with drizzle-orm for schema/queries)\n\
        - Auth: Better Auth (better-auth package, server-side sessions via Next.js middleware)\n\
        - AI: Claude API (@anthropic-ai/sdk) for intelligent task features (smart categorisation, energy-aware suggestions, natural language capture)\n\
        - API: Next.js API route handlers (app/api/), NO standalone server\n\
        - Build: pnpm workspace, app lives at apps/todo/, turbopack for dev\n\
        - Deploy: Vercel\n\
        - Dev port: 3007 (next dev -p 3007)\n\
        - DO NOT use React Native, Express, standalone Node servers, GraphQL, Supabase, or Clerk\n\n\
        GOAL: Build an evidence-based todo/task management web application synthesising \
        research findings from cognitive load theory, gamification science, UX patterns, \
        priority scheduling algorithms, subtask hierarchies, and time-blocking methodologies. \
        Implement these 10 evidence-based design principles: progressive disclosure, \
        one-tap capture, chunked lists (7±2 items), simplified priority models, streak \
        mechanics with recovery, visual completion feedback, 2-level subtask hierarchy, \
        lightweight dependency tracking, timeboxing with calendar integration, and \
        energy-aware scheduling.";

    // Prepend monorepo context before the research synthesis
    let context = format!(
        "## Monorepo Reference\n\n\
         This is a pnpm monorepo deployed on Vercel. All apps are Next.js web apps:\n\
         - apps/knowledge/ — port 3003\n\
         - apps/nomadically.work/ — port 3004\n\
         - apps/research-thera/ — port 3005\n\
         - apps/scalping/ — port 3006\n\
         - apps/todo/ — port 3007 (THIS APP)\n\n\
         The todo app MUST live at apps/todo/ with standard Next.js App Router structure:\n\
         apps/todo/app/ (pages, layouts, API routes), apps/todo/components/, apps/todo/lib/.\n\n\
         DO NOT propose React Native, Express, standalone Node servers, Supabase, or Clerk.\n\
         Use ONLY: Next.js App Router + React 19 + @radix-ui/themes + Neon PostgreSQL (@neondatabase/serverless + drizzle-orm) + Better Auth + Claude API (@anthropic-ai/sdk) + Vercel.\n\n\
         ---\n\n\
         ## Research Synthesis\n\n\
         {synthesis}"
    );

    let mut change = SddChange::new("todo-app", description);

    eprintln!("Running full SDD pipeline (Propose → Spec ‖ Design → Tasks → Apply → Verify → Archive)...\n");

    let pipeline_err = pipeline.full_pipeline(&mut change, &context).await;

    // Write whatever artifacts were produced (even on verify failure)
    let phases = ["propose", "spec", "design", "tasks", "apply", "verify", "archive"];
    for phase in &phases {
        if let Some(artifact) = change.artifacts.get(*phase) {
            let content = artifact["result"].as_str().unwrap_or("");
            if content.is_empty() {
                continue;
            }
            let path = format!("{OUT_DIR}/{phase}.md");
            std::fs::write(&path, content)
                .with_context(|| format!("writing {path}"))?;
            eprintln!("  wrote {path} ({} bytes)", content.len());
        }
    }

    let tokens_used: u32 = change.usage_history.iter().map(|u| u.total_tokens).sum();
    let phases_done = change.phases_completed.len();
    eprintln!(
        "\n{phases_done} phases completed, {tokens_used} total tokens used."
    );

    match pipeline_err {
        Ok(_) => {
            eprintln!("Pipeline completed successfully.");
            Ok(())
        }
        Err(e) => {
            eprintln!("Pipeline finished with error (artifacts still written): {e}");
            Ok(())
        }
    }
}
