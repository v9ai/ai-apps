use std::sync::Arc;

use anyhow::{Context, Result};
use tokio_postgres::Client;

/// Connect to Neon PostgreSQL via NEON_DATABASE_URL.
pub async fn connect() -> Result<Client> {
    let db_url = std::env::var("NEON_DATABASE_URL")
        .context("NEON_DATABASE_URL env var not set")?
        .replace("channel_binding=require&", "")
        .replace("&channel_binding=require", "")
        .replace("?channel_binding=require", "?");

    let _ = rustls::crypto::ring::default_provider().install_default();

    let mut roots = rustls::RootCertStore::empty();
    roots.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
    let tls_config = rustls::ClientConfig::builder()
        .with_root_certificates(Arc::new(roots))
        .with_no_client_auth();
    let tls = tokio_postgres_rustls::MakeRustlsConnect::new(tls_config);

    let (client, connection) = tokio_postgres::connect(&db_url, tls)
        .await
        .context("Failed to connect to Neon")?;

    tokio::spawn(async move {
        if let Err(e) = connection.await {
            tracing::error!("Neon connection error: {e}");
        }
    });

    Ok(client)
}
