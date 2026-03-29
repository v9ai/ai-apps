//! CLI for the course-review pipeline.
//!
//! Usage:
//!   cargo run --bin review-courses -- review --title "..." --url "..." --provider "..."
//!   cargo run --bin review-courses -- list [--min-score 7.0] [--verdict recommended]
//!   cargo run --bin review-courses -- count
//!   cargo run --bin review-courses -- export [--output reviews.json]

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;

use clap::{Parser, Subcommand};
use course_review::{CourseInput, CourseReviewPipeline};
use tracing_subscriber::EnvFilter;

// ── Helpers ───────────────────────────────────────────────────────────────────

fn url_to_id(url: &str) -> String {
    let mut h = DefaultHasher::new();
    url.hash(&mut h);
    format!("{:016x}", h.finish())
}

/// Total width of the box (including the two border chars │ on each side).
const BOX_WIDTH: usize = 61;
/// Inner content width (BOX_WIDTH - 2 border chars - 2 padding spaces).
const INNER: usize = BOX_WIDTH - 4;

fn box_top() {
    println!("┌{}┐", "─".repeat(BOX_WIDTH - 2));
}
fn box_sep() {
    println!("├{}┤", "─".repeat(BOX_WIDTH - 2));
}
fn box_bot() {
    println!("└{}┘", "─".repeat(BOX_WIDTH - 2));
}

/// Print a single box row, left-aligned, with right-padding to INNER chars.
fn box_row(text: &str) {
    // Wrap at INNER chars so long strings don't overflow the box.
    let mut remaining = text;
    loop {
        let chunk = if remaining.chars().count() > INNER {
            // Split at a character boundary at INNER.
            let split_at = remaining
                .char_indices()
                .nth(INNER)
                .map(|(i, _)| i)
                .unwrap_or(remaining.len());
            &remaining[..split_at]
        } else {
            remaining
        };

        let pad = INNER.saturating_sub(chunk.chars().count());
        println!("│ {}{} │", chunk, " ".repeat(pad));

        let next = &remaining[chunk.len()..];
        if next.is_empty() {
            break;
        }
        remaining = next;
    }
}

fn box_blank() {
    box_row("");
}

// ── CLI types ─────────────────────────────────────────────────────────────────

#[derive(Parser)]
#[command(
    name = "review-courses",
    about = "Review online courses with a 10-expert LLM pipeline"
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Run the 10-expert review for a course and store the result.
    Review {
        /// Course title
        #[arg(long)]
        title: String,

        /// Course URL (used as unique key if --id is not given)
        #[arg(long)]
        url: String,

        /// Course provider (e.g. Coursera, Udemy, Pluralsight)
        #[arg(long)]
        provider: String,

        /// Short description of the course
        #[arg(long, default_value = "")]
        description: String,

        /// Difficulty level: Beginner | Intermediate | Advanced
        #[arg(long, default_value = "Intermediate")]
        level: String,

        /// Provider star rating (0.0–5.0)
        #[arg(long, default_value_t = 0.0)]
        rating: f32,

        /// Number of learner reviews on the provider platform
        #[arg(long, default_value_t = 0)]
        reviews: u32,

        /// Estimated duration in hours
        #[arg(long, default_value_t = 0.0)]
        hours: f32,

        /// Mark the course as free (default)
        #[arg(long = "free", default_value_t = true, action = clap::ArgAction::SetTrue)]
        is_free: bool,

        /// Mark the course as paid (overrides --free)
        #[arg(long = "paid", action = clap::ArgAction::SetFalse, overrides_with = "is_free")]
        _paid: bool,

        /// Path to the Lance store directory
        #[arg(long, default_value = "./course-reviews.lance")]
        store_path: String,

        /// Explicit course ID (hex string). Auto-derived from URL hash if omitted.
        #[arg(long)]
        id: Option<String>,
    },

    /// List stored reviews, optionally filtered by score or verdict.
    List {
        /// Path to the Lance store directory
        #[arg(long, default_value = "./course-reviews.lance")]
        store_path: String,

        /// Only show reviews with aggregate_score >= this value
        #[arg(long, default_value_t = 0.0)]
        min_score: f32,

        /// Only show reviews with this verdict (excellent|recommended|average|skip)
        #[arg(long)]
        verdict: Option<String>,
    },

    /// Print the total number of stored reviews.
    Count {
        /// Path to the Lance store directory
        #[arg(long, default_value = "./course-reviews.lance")]
        store_path: String,
    },

    /// Export all stored reviews as JSON.
    Export {
        /// Path to the Lance store directory
        #[arg(long, default_value = "./course-reviews.lance")]
        store_path: String,

        /// Output file path. Writes to stdout if omitted.
        #[arg(long)]
        output: Option<PathBuf>,
    },
}

// ── Entry point ───────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let cli = Cli::parse();

    match cli.command {
        // ── review ────────────────────────────────────────────────────────────
        Command::Review {
            title,
            url,
            provider,
            description,
            level,
            rating,
            reviews,
            hours,
            is_free,
            store_path,
            id,
        } => {
            let course_id = id.unwrap_or_else(|| url_to_id(&url));

            let course = CourseInput {
                course_id,
                title,
                url,
                provider,
                description,
                level,
                rating,
                review_count: reviews,
                duration_hours: hours,
                is_free,
            };

            eprintln!("Loading pipeline (this may take a moment to load the model)…");
            let mut pipeline = CourseReviewPipeline::new(&store_path).await?;

            eprintln!("Running 10-expert review for \"{}\"…", course.title);
            let review = pipeline.review_and_store(&course).await?;

            // ── Box output ────────────────────────────────────────────────────
            use course_review::ExpertType;

            box_top();
            box_row(&format!("Course: {}", review.title));
            box_row(&format!("Provider: {}", review.provider));
            box_sep();
            box_row("Expert Scores");
            box_blank();

            let label_width = 22usize;
            for expert in ExpertType::ALL {
                let score = review.get_score(expert);
                let label = expert_display_name(expert);
                let pad = label_width.saturating_sub(label.chars().count());
                box_row(&format!(
                    "  {}{}{}/10",
                    label,
                    " ".repeat(pad),
                    score.score
                ));
            }

            box_sep();
            box_row(&format!(
                "Aggregate: {:.1}/10   Verdict: {}",
                review.aggregate_score, review.verdict
            ));
            box_blank();
            box_row(&format!("Summary: {}", review.summary));
            box_bot();
        }

        // ── list ──────────────────────────────────────────────────────────────
        Command::List {
            store_path,
            min_score,
            verdict,
        } => {
            let store = course_review::store::ReviewStore::connect(&store_path).await?;

            let reviews = match verdict {
                Some(ref v) => store.list_by_verdict(v).await?,
                None => store.list_by_score(min_score).await?,
            };

            if reviews.is_empty() {
                println!("No reviews found.");
            } else {
                for r in &reviews {
                    println!(
                        "{:<40} {:4.1}/10  {:<12}  {}",
                        truncate(&r.title, 40),
                        r.aggregate_score,
                        r.verdict,
                        r.provider,
                    );
                }
            }
        }

        // ── count ─────────────────────────────────────────────────────────────
        Command::Count { store_path } => {
            let store = course_review::store::ReviewStore::connect(&store_path).await?;
            let n = store.count().await?;
            println!("{n}");
        }

        // ── export ────────────────────────────────────────────────────────────
        Command::Export { store_path, output } => {
            let store = course_review::store::ReviewStore::connect(&store_path).await?;
            let json = store.export_json().await?;

            match output {
                Some(path) => {
                    std::fs::write(&path, &json)?;
                    eprintln!("Exported to {}", path.display());
                }
                None => {
                    print!("{json}");
                }
            }
        }
    }

    Ok(())
}

// ── Display helpers ───────────────────────────────────────────────────────────

/// Human-readable label for each expert dimension.
fn expert_display_name(expert: course_review::ExpertType) -> &'static str {
    use course_review::ExpertType;
    match expert {
        ExpertType::Pedagogy             => "Pedagogy",
        ExpertType::TechnicalAccuracy    => "Technical Accuracy",
        ExpertType::ContentDepth         => "Content Depth",
        ExpertType::PracticalApplication => "Practical Application",
        ExpertType::InstructorClarity    => "Instructor Clarity",
        ExpertType::CurriculumFit        => "Curriculum Fit",
        ExpertType::Prerequisites        => "Prerequisites",
        ExpertType::AiDomainRelevance    => "AI Domain Relevance",
        ExpertType::CommunityHealth      => "Community Health",
        ExpertType::ValueProposition     => "Value Proposition",
    }
}

/// Truncate a string to at most `max` characters, appending `…` if cut.
fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_owned()
    } else {
        let cut: String = s.chars().take(max.saturating_sub(1)).collect();
        format!("{cut}…")
    }
}
