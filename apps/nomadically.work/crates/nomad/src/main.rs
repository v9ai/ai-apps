use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::signal;
use tokio::sync::broadcast;

#[derive(Debug, Deserialize)]
struct Config {
    service: Vec<Service>,
}

#[derive(Debug, Deserialize)]
struct Service {
    name: String,
    command: String,
    color: String,
    #[serde(default)]
    ready_pattern: Option<String>,
}

const COLORS: &[(&str, &str)] = &[
    ("red", "\x1b[31m"),
    ("green", "\x1b[32m"),
    ("yellow", "\x1b[33m"),
    ("blue", "\x1b[34m"),
    ("magenta", "\x1b[35m"),
    ("cyan", "\x1b[36m"),
    ("white", "\x1b[37m"),
];
const RESET: &str = "\x1b[0m";
const BOLD: &str = "\x1b[1m";
const DIM: &str = "\x1b[2m";

fn color_code(name: &str) -> &'static str {
    COLORS
        .iter()
        .find(|(n, _)| *n == name)
        .map(|(_, c)| *c)
        .unwrap_or("\x1b[37m")
}

fn project_root() -> PathBuf {
    // nomad.toml lives at crates/nomad/nomad.toml
    // project root is two levels up
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest
        .parent()
        .and_then(|p| p.parent())
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| std::env::current_dir().unwrap())
}

async fn spawn_service(
    svc: &Service,
    root: &PathBuf,
    mut shutdown: broadcast::Receiver<()>,
) -> Result<()> {
    let color = color_code(&svc.color);
    let tag = format!("{BOLD}{color}{:>10}{RESET}", svc.name);
    let dim_tag = format!("{DIM}{color}{:>10}{RESET}", svc.name);

    println!("{tag} {DIM}starting:{RESET} {}", svc.command);

    let parts: Vec<&str> = svc.command.split_whitespace().collect();
    let (cmd, args) = parts.split_first().context("empty command")?;

    let mut child = Command::new(cmd)
        .args(args)
        .current_dir(root)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        // Wrangler checks isatty() — force interactive mode via env
        .env("WRANGLER_SEND_METRICS", "false")
        .kill_on_drop(true)
        .spawn()
        .with_context(|| format!("failed to spawn {}", svc.name))?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    let ready_pat = svc.ready_pattern.clone();
    let name = svc.name.clone();

    // Stream stdout
    let tag_out = tag.clone();
    let ready_pat_out = ready_pat.clone();
    let name_out = name.clone();
    let stdout_handle = tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if let Some(ref pat) = ready_pat_out {
                if line.contains(pat) {
                    println!(
                        "{tag_out} {BOLD}\x1b[32m✓ ready{RESET} {DIM}({name_out}){RESET}"
                    );
                }
            }
            println!("{tag_out} {line}");
        }
    });

    // Stream stderr
    let stderr_handle = tokio::spawn(async move {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            eprintln!("{dim_tag} {line}");
        }
    });

    // Wait for shutdown or process exit
    tokio::select! {
        status = child.wait() => {
            match status {
                Ok(s) if s.success() => println!("{tag} {DIM}exited (0){RESET}"),
                Ok(s) => eprintln!("{tag} \x1b[31mexited ({}){RESET}", s.code().unwrap_or(-1)),
                Err(e) => eprintln!("{tag} \x1b[31merror: {e}{RESET}"),
            }
        }
        _ = shutdown.recv() => {
            println!("{tag} {DIM}shutting down...{RESET}");
            // kill_on_drop handles cleanup
        }
    }

    stdout_handle.abort();
    stderr_handle.abort();
    Ok(())
}

fn print_banner(services: &[Service]) {
    println!();
    println!("{BOLD}  ╔══════════════════════════════════════════════╗{RESET}");
    println!("{BOLD}  ║     nomadically.work — local dev stack      ║{RESET}");
    println!("{BOLD}  ╚══════════════════════════════════════════════╝{RESET}");
    println!();
    for svc in services {
        let color = color_code(&svc.color);
        println!("  {color}●{RESET} {:<12} {DIM}{}{RESET}", svc.name, svc.command);
    }
    println!();
    println!("  {DIM}Press Ctrl+C to stop all services{RESET}");
    println!();
}

#[tokio::main]
async fn main() -> Result<()> {
    let root = project_root();
    let config_path = root.join("crates/nomad/nomad.toml");

    let config_str = std::fs::read_to_string(&config_path)
        .with_context(|| format!("reading {}", config_path.display()))?;
    let config: Config = toml::from_str(&config_str).context("parsing nomad.toml")?;

    print_banner(&config.service);

    let (shutdown_tx, _) = broadcast::channel::<()>(1);

    let mut handles = Vec::new();
    for svc in &config.service {
        let rx = shutdown_tx.subscribe();
        let root = root.clone();
        // Leak the service ref into owned data for the spawn
        let svc_owned = Service {
            name: svc.name.clone(),
            command: svc.command.clone(),
            color: svc.color.clone(),
            ready_pattern: svc.ready_pattern.clone(),
        };
        handles.push(tokio::spawn(async move {
            if let Err(e) = spawn_service(&svc_owned, &root, rx).await {
                eprintln!("\x1b[31m[{}] error: {e:#}\x1b[0m", svc_owned.name);
            }
        }));
    }

    // Wait for Ctrl+C
    signal::ctrl_c().await?;
    println!("\n{BOLD}{DIM}Shutting down all services...{RESET}");
    let _ = shutdown_tx.send(());

    // Give processes a moment to clean up
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;

    Ok(())
}
