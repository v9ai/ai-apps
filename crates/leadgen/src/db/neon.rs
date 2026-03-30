/// Neon PostgreSQL integration for batch contact scoring.
///
/// Enabled only when the `neon` Cargo feature is active:
///   cargo build -p leadgen --features neon
///   cargo run  -p leadgen --features neon -- score-neon --company aleph-alpha-com
///
/// The function reads contacts from the Next.js / Drizzle Neon database,
/// runs `classify_contact()` on each `position` field, and (unless `--dry-run`)
/// writes seniority / department / authority_score / is_decision_maker / dm_reasons
/// back to the same rows.
use anyhow::Result;
use sqlx::postgres::PgPoolOptions;

use crate::scoring::authority::{classify_contact, ContactClassification};

/// One row returned from the contacts query.
#[derive(Debug, sqlx::FromRow)]
struct ContactRow {
    id: i32,
    first_name: String,
    last_name: String,
    position: Option<String>,
}

/// Score all contacts belonging to `company_key` (the slug / key column in the
/// companies table).  If `dry_run` is true, prints the results but does not
/// write back to the database.
///
/// Returns a `Vec` of `(id, first_name, last_name, ContactClassification)`.
pub async fn score_company_contacts(
    db_url: &str,
    company_key: &str,
    dry_run: bool,
) -> Result<Vec<(i32, String, String, ContactClassification)>> {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(db_url)
        .await?;

    // Fetch all contacts for the company.
    let rows: Vec<ContactRow> = sqlx::query_as(
        r#"
        SELECT c.id, c.first_name, c.last_name, c.position
        FROM contacts c
        INNER JOIN companies co ON co.id = c.company_id
        WHERE co.key = $1
        ORDER BY c.id
        "#,
    )
    .bind(company_key)
    .fetch_all(&pool)
    .await?;

    if rows.is_empty() {
        println!("No contacts found for company '{}'.", company_key);
        return Ok(vec![]);
    }

    // Classify each contact.
    let mut results: Vec<(i32, String, String, ContactClassification)> = rows
        .iter()
        .map(|r| {
            let cls = classify_contact(r.position.as_deref().unwrap_or(""));
            (r.id, r.first_name.clone(), r.last_name.clone(), cls)
        })
        .collect();

    // Sort by authority_score descending so the table is ranked.
    results.sort_by(|a, b| b.3.authority_score.partial_cmp(&a.3.authority_score).unwrap());

    // Print ranked table.
    println!(
        "\n{:<4}  {:<25}  {:<35}  {:<10}  {:<12}  {:<5}  {}",
        "Rank", "Name", "Position", "Seniority", "Dept", "Score", "DM?"
    );
    println!("{}", "-".repeat(110));
    for (rank, (id, first, last, cls)) in results.iter().enumerate() {
        let name = format!("{} {}", first, last);
        // Look up original position for display.
        let position = rows
            .iter()
            .find(|r| r.id == *id)
            .and_then(|r| r.position.as_deref())
            .unwrap_or("-");
        println!(
            "{:<4}  {:<25}  {:<35}  {:<10}  {:<12}  {:.2}   {}",
            rank + 1,
            &name[..name.len().min(25)],
            &position[..position.len().min(35)],
            cls.seniority,
            cls.department,
            cls.authority_score,
            if cls.is_decision_maker { "YES ✓" } else { "no" },
        );
    }
    println!();

    if dry_run {
        println!("[dry-run] No changes written to database.");
        return Ok(results);
    }

    // Write back classifications.
    let mut updated = 0usize;
    for (id, _, _, cls) in &results {
        let reasons_json = serde_json::to_string(&cls.reasons).unwrap_or_else(|_| "[]".into());
        sqlx::query(
            r#"
            UPDATE contacts
            SET seniority        = $1,
                department       = $2,
                is_decision_maker = $3,
                authority_score  = $4,
                dm_reasons       = $5,
                updated_at       = now()::text
            WHERE id = $6
            "#,
        )
        .bind(&cls.seniority)
        .bind(&cls.department)
        .bind(cls.is_decision_maker)
        .bind(cls.authority_score)
        .bind(&reasons_json)
        .bind(id)
        .execute(&pool)
        .await?;
        updated += 1;
    }

    println!("Wrote ML classifications for {} contacts.", updated);
    Ok(results)
}
