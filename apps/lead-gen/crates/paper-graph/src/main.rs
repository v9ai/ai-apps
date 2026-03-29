mod db;
mod graph;
mod import;
mod migrate;
mod store;
mod types;

use anyhow::Result;
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "paper-graph", about = "Research paper storage and co-authorship graph")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Create tables in Neon PostgreSQL
    Migrate,
    /// Import papers from external sources
    Import {
        #[command(subcommand)]
        source: ImportSource,
    },
    /// List co-authors for an author
    Coauthors {
        /// Author ID
        author_id: i32,
    },
    /// List all authors
    Authors,
    /// List all papers
    Papers,
}

#[derive(Subcommand)]
enum ImportSource {
    /// Import a paper from arXiv by ID (e.g., 2602.15189)
    Arxiv {
        /// arXiv paper ID
        id: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "paper_graph=info,research=info".parse().unwrap()),
        )
        .init();

    let cli = Cli::parse();

    match cli.command {
        Command::Migrate => {
            let client = db::connect().await?;
            migrate::run(&client).await?;
        }
        Command::Import { source } => match source {
            ImportSource::Arxiv { id } => {
                let client = db::connect().await?;
                let result = import::import_arxiv(&client, &id).await?;
                println!(
                    "Imported: \"{}\" (paper_id={}, authors_linked={})",
                    result.title, result.paper_id, result.authors_linked
                );
            }
        },
        Command::Coauthors { author_id } => {
            let client = db::connect().await?;
            let edges = graph::coauthors(&client, author_id).await?;
            if edges.is_empty() {
                println!("No co-authors found for author_id={author_id}");
            } else {
                println!("Co-authors of author_id={author_id}:");
                for e in &edges {
                    println!(
                        "  {} (id={}) — {} shared paper{}",
                        e.author_name,
                        e.author_id,
                        e.shared_papers,
                        if e.shared_papers == 1 { "" } else { "s" }
                    );
                }
            }
        }
        Command::Authors => {
            let client = db::connect().await?;
            let authors = graph::list_authors(&client).await?;
            if authors.is_empty() {
                println!("No authors yet.");
            } else {
                for (a, count) in &authors {
                    println!(
                        "  [{}] {} — {} paper{}",
                        a.id,
                        a.name,
                        count,
                        if *count == 1 { "" } else { "s" }
                    );
                }
            }
        }
        Command::Papers => {
            let client = db::connect().await?;
            let papers = graph::list_papers(&client).await?;
            if papers.is_empty() {
                println!("No papers yet.");
            } else {
                for p in &papers {
                    let cats: Vec<String> = p
                        .categories
                        .as_deref()
                        .and_then(|c| serde_json::from_str(c).ok())
                        .unwrap_or_default();
                    println!(
                        "  [{}] {} ({})",
                        p.id,
                        p.title,
                        if cats.is_empty() {
                            p.source.clone()
                        } else {
                            cats.join(", ")
                        }
                    );
                }
            }
        }
    }

    Ok(())
}
