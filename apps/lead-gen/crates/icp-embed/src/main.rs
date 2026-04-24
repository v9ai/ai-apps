use std::sync::Arc;

use icp_embed::{best_device, server::serve, IcpEmbedder};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "icp_embed=info".into()),
        )
        .init();

    let device = best_device()?;
    let embedder = IcpEmbedder::from_hf(&device)?;
    let state = Arc::new(embedder);

    let port = std::env::var("ICP_EMBED_PORT").unwrap_or_else(|_| "7799".to_string());
    let addr = format!("127.0.0.1:{port}");
    serve(state, &addr).await
}
