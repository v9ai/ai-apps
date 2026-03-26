use std::sync::Arc;

use anyhow::{Context, Result};

use crate::models::Contact;

/// Fetch all contacts with a linkedin_url from Neon PostgreSQL.
pub async fn fetch_contacts_with_linkedin() -> Result<Vec<Contact>> {
    let db_url = std::env::var("NEON_DATABASE_URL")
        .context("NEON_DATABASE_URL env var not set")?
        // tokio-postgres + rustls doesn't support channel_binding — strip it
        .replace("channel_binding=require&", "")
        .replace("&channel_binding=require", "")
        .replace("?channel_binding=require", "?");

    // Neon requires SSL — build a rustls connector
    let tls_config = rustls::ClientConfig::builder()
        .with_root_certificates(root_certs())
        .with_no_client_auth();
    let tls = tokio_postgres_rustls::MakeRustlsConnect::new(tls_config);

    let (client, connection) = tokio_postgres::connect(&db_url, tls)
        .await
        .context("Failed to connect to Neon")?;

    // Spawn the connection task
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            tracing::error!("Neon connection error: {}", e);
        }
    });

    let rows = client
        .query(
            "SELECT id, first_name, last_name, linkedin_url, company, position
             FROM contacts
             WHERE linkedin_url IS NOT NULL AND linkedin_url != ''
             ORDER BY id",
            &[],
        )
        .await
        .context("Failed to query contacts")?;

    let now = chrono::Utc::now().to_rfc3339();
    let contacts: Vec<Contact> = rows
        .iter()
        .map(|row| Contact {
            id: row.get::<_, i32>("id"),
            first_name: row.get::<_, String>("first_name"),
            last_name: row.get::<_, String>("last_name"),
            linkedin_url: row.get::<_, String>("linkedin_url"),
            company: row.get::<_, Option<String>>("company"),
            position: row.get::<_, Option<String>>("position"),
            scraped_at: now.clone(),
        })
        .collect();

    tracing::info!("Fetched {} contacts with LinkedIn URLs from Neon", contacts.len());
    Ok(contacts)
}

/// Count contacts with linkedin_url in Neon.
pub async fn count_contacts() -> Result<i64> {
    let db_url = std::env::var("NEON_DATABASE_URL")
        .context("NEON_DATABASE_URL env var not set")?
        .replace("channel_binding=require&", "")
        .replace("&channel_binding=require", "")
        .replace("?channel_binding=require", "?");

    let tls_config = rustls::ClientConfig::builder()
        .with_root_certificates(root_certs())
        .with_no_client_auth();
    let tls = tokio_postgres_rustls::MakeRustlsConnect::new(tls_config);

    let (client, connection) = tokio_postgres::connect(&db_url, tls)
        .await
        .context("Failed to connect to Neon")?;

    tokio::spawn(async move {
        if let Err(e) = connection.await {
            tracing::error!("Neon connection error: {}", e);
        }
    });

    let row = client
        .query_one(
            "SELECT COUNT(*) FROM contacts WHERE linkedin_url IS NOT NULL AND linkedin_url != ''",
            &[],
        )
        .await
        .context("Failed to count contacts")?;

    Ok(row.get::<_, i64>(0))
}

fn root_certs() -> Arc<rustls::RootCertStore> {
    let mut roots = rustls::RootCertStore::empty();
    roots.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
    Arc::new(roots)
}
