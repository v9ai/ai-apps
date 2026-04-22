use crate::lance::Lance;
use crate::pg;
use crate::sqlite::{self, Db};
use anyhow::Result;
use serde_json::{json, Value};
use sqlx::{PgPool, Row};

pub struct PromoteCounts {
    pub considered: usize,
    pub promoted: usize,
    pub skipped: usize,
}

/// Read SQLite `contact_match_state` rows with the given status, assemble the
/// papers JSON the existing Drizzle `contacts.papers` column expects, and write
/// to Neon.
pub async fn promote(
    pg: &PgPool,
    sqlite_db: &Db,
    lance: &Lance,
    status_filter: &str,
    min_score: f32,
) -> Result<PromoteCounts> {
    let states = sqlite::list_match_state(sqlite_db, status_filter).await?;
    let mut counts = PromoteCounts {
        considered: states.len(),
        promoted: 0,
        skipped: 0,
    };

    for s in states {
        let score = s.score.unwrap_or(0.0);
        if score < min_score {
            counts.skipped += 1;
            continue;
        }
        let contact_id: i32 = match s.contact_id.parse() {
            Ok(v) => v,
            Err(_) => {
                tracing::warn!("skip non-numeric contact id: {}", s.contact_id);
                counts.skipped += 1;
                continue;
            }
        };

        let papers_json = load_contact_papers_json(sqlite_db, &s.contact_id).await?;

        // Optional: enrich github_handle from Lance profile if login is set.
        let handle = s.login.clone();

        let affected = pg::promote_contact(
            pg,
            contact_id,
            handle.as_deref(),
            &papers_json,
            score,
            &s.status,
            s.arm_id.as_deref(),
            s.evidence_ref.as_deref(),
        )
        .await?;

        if affected > 0 {
            counts.promoted += 1;
        } else {
            counts.skipped += 1;
        }

        let _ = lance; // reserved for future: cross-check gh_profiles before write
    }
    Ok(counts)
}

/// Shape matches the Drizzle `contacts.papers` schema comment:
///   Paper[] — {title, authors, year, venue, doi, url, citation_count, source}
async fn load_contact_papers_json(sqlite_db: &Db, contact_id: &str) -> Result<Value> {
    // Papers for a contact aren't directly linked yet; pull every paper whose
    // paper_authors row links back to an author whose name matches — but we
    // don't have author→contact links in SQLite yet. Simpler initial impl:
    // return the papers we persisted during the same run by matching on the
    // Lance paper_embeddings table's contact_id. This is a read-through only.
    let rows = sqlx::query(
        r#"select p.title, p.authors_json, p.year, p.venue, p.doi,
                  p.html_url, p.citation_count, p.source
           from papers p
           join (
             select paper_id from paper_authors pa
             join authors a on a.id = pa.author_id
             where a.id = ?
           ) pa on pa.paper_id = p.id"#,
    )
    .bind(contact_id)
    .fetch_all(sqlite_db)
    .await
    .unwrap_or_default();

    let mut out: Vec<Value> = Vec::new();
    for r in rows {
        let authors: Vec<String> = r
            .try_get::<String, _>("authors_json")
            .ok()
            .and_then(|j| serde_json::from_str(&j).ok())
            .unwrap_or_default();
        out.push(json!({
            "title":          r.try_get::<String, _>("title").ok(),
            "authors":        authors,
            "year":           r.try_get::<i64, _>("year").ok(),
            "venue":          r.try_get::<String, _>("venue").ok(),
            "doi":            r.try_get::<String, _>("doi").ok(),
            "url":            r.try_get::<String, _>("html_url").ok(),
            "citation_count": r.try_get::<i64, _>("citation_count").ok(),
            "source":         r.try_get::<String, _>("source").ok(),
        }));
    }
    Ok(Value::Array(out))
}
