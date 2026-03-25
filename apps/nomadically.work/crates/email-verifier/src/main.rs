use clap::{Parser, Subcommand, ValueEnum};
use email_verifier::{verify, VerifierConfig};
use std::io::{self, BufRead};

#[derive(Parser)]
#[command(name = "email-verifier")]
#[command(version = "0.1.0")]
#[command(about = "Local email verification via DNS + SMTP — free NeverBounce alternative")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Verify a single email address
    Verify {
        email: String,

        /// SMTP/DNS timeout in seconds
        #[arg(long, default_value = "10")]
        timeout: u64,

        /// Output raw JSON instead of human-readable format
        #[arg(long)]
        json: bool,
    },

    /// Verify emails from a file or stdin (one per line)
    Batch {
        /// File path, or '-' for stdin
        input: String,

        /// Output format
        #[arg(long, default_value = "pretty")]
        format: OutputFormat,

        /// SMTP/DNS timeout in seconds
        #[arg(long, default_value = "10")]
        timeout: u64,
    },
}

#[derive(Clone, ValueEnum)]
enum OutputFormat {
    Pretty,
    Json,
    Csv,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::WARN.into()),
        )
        .init();

    let cli = Cli::parse();

    match cli.command {
        Commands::Verify { email, timeout, json } => {
            let config = VerifierConfig::new(timeout);
            let outcome = verify(&email, &config).await;

            if json {
                println!("{}", serde_json::to_string_pretty(&outcome)?);
            } else {
                print_pretty(&email, &outcome);
            }
        }

        Commands::Batch { input, format, timeout } => {
            let config = VerifierConfig::new(timeout);
            let emails = read_input(&input)?;

            if matches!(format, OutputFormat::Csv) {
                println!(
                    "email,result,verified,flags,suggested_correction,execution_time_ms"
                );
            }

            for email in emails {
                let email = email.trim().to_string();
                if email.is_empty() || email.starts_with('#') {
                    continue;
                }

                let outcome = verify(&email, &config).await;

                match format {
                    OutputFormat::Json => {
                        let obj = serde_json::json!({
                            "email": email,
                            "status": outcome.status,
                            "result": outcome.result,
                            "flags": outcome.flags,
                            "suggested_correction": outcome.suggested_correction,
                            "execution_time_ms": outcome.execution_time_ms,
                            "verified": outcome.verified,
                        });
                        println!("{}", serde_json::to_string(&obj)?);
                    }
                    OutputFormat::Csv => {
                        println!(
                            "{},{},{},{},{},{}",
                            csv_escape(&email),
                            outcome.result,
                            outcome.verified,
                            outcome.flags.join("|"),
                            outcome
                                .suggested_correction
                                .as_deref()
                                .unwrap_or(""),
                            outcome.execution_time_ms,
                        );
                    }
                    OutputFormat::Pretty => print_pretty(&email, &outcome),
                }
            }
        }
    }

    Ok(())
}

fn print_pretty(email: &str, outcome: &email_verifier::VerificationOutcome) {
    let symbol = if outcome.verified { "✓" } else { "✗" };
    let flags = if outcome.flags.is_empty() {
        String::new()
    } else {
        format!("  [{}]", outcome.flags.join(", "))
    };
    let correction = outcome
        .suggested_correction
        .as_deref()
        .map(|c| format!("  → did you mean {c}?"))
        .unwrap_or_default();

    println!(
        "{symbol} {email:<40}  {:12}  {}ms{flags}{correction}",
        outcome.result, outcome.execution_time_ms
    );
}

fn read_input(path: &str) -> anyhow::Result<Vec<String>> {
    if path == "-" {
        let stdin = io::stdin();
        Ok(stdin.lock().lines().collect::<Result<_, _>>()?)
    } else {
        let file = std::fs::File::open(path)?;
        Ok(io::BufReader::new(file)
            .lines()
            .collect::<Result<_, _>>()?)
    }
}

fn csv_escape(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\n') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}
