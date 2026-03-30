use std::sync::Arc;

use anyhow::{Context, Result};

use crate::models::Contact;

/// Open a reusable Neon PostgreSQL connection (SSL via rustls).
pub async fn connect_neon() -> Result<tokio_postgres::Client> {
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

    Ok(client)
}

/// Fetch all contacts with a linkedin_url from Neon PostgreSQL.
/// Opens its own connection. Use `fetch_contacts_with_client` to reuse an existing one.
pub async fn fetch_contacts_with_linkedin() -> Result<Vec<Contact>> {
    let client = connect_neon().await?;
    fetch_contacts_with_client(&client).await
}

/// Fetch all contacts with a linkedin_url using an existing Neon client.
pub async fn fetch_contacts_with_client(client: &tokio_postgres::Client) -> Result<Vec<Contact>> {
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
    let client = connect_neon().await?;

    let row = client
        .query_one(
            "SELECT COUNT(*) FROM contacts WHERE linkedin_url IS NOT NULL AND linkedin_url != ''",
            &[],
        )
        .await
        .context("Failed to count contacts")?;

    Ok(row.get::<_, i64>(0))
}

/// Set a contact's authority_score in Neon to an absolute value.
/// Uses SET (not additive delta) because `aggregate_signals` recomputes
/// from all posts each run — additive would re-count old posts.
pub async fn update_contact_authority(contact_id: i32, score: f32) -> Result<()> {
    if score <= 0.0 {
        return Ok(());
    }

    let clamped = score.clamp(0.0, 1.0);
    let client = connect_neon().await?;

    client
        .execute(
            "UPDATE contacts SET authority_score = $1 WHERE id = $2",
            &[&clamped, &contact_id],
        )
        .await
        .context("Failed to update authority_score")?;

    tracing::info!(
        "Updated contact {} authority_score = {:.3}",
        contact_id,
        clamped
    );
    Ok(())
}

fn root_certs() -> Arc<rustls::RootCertStore> {
    let mut roots = rustls::RootCertStore::empty();
    roots.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
    Arc::new(roots)
}
