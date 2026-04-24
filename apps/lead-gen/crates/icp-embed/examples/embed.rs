//! Embed a single string via BGE-M3. Usage:
//!   cargo run --release --example embed -- "your text here"

use icp_embed::{best_device, IcpEmbedder};

fn main() -> icp_embed::Result<()> {
    tracing_subscriber::fmt().init();

    let text = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "passage: AI-first B2B SaaS, Series A, US+EU".to_string());

    let device = best_device()?;
    let model = IcpEmbedder::from_hf(&device)?;
    let vec = model.embed_one(&text)?;

    eprintln!("dim={}", vec.len());
    eprintln!("head={:?}", &vec[..8]);
    eprintln!("L2={:.6}", vec.iter().map(|x| x * x).sum::<f32>().sqrt());
    Ok(())
}
