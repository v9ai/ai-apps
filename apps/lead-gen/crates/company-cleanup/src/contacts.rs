/// Contact position cleanup — detect LinkedIn headlines stored as job titles.
///
/// Heuristic classifier that flags `position` values that are clearly LinkedIn
/// headlines rather than real job titles.  Flagged contacts get their position
/// set to NULL so downstream ML (seniority, department, authority) doesn't
/// produce garbage.

use anyhow::{Context, Result};
use sqlx::{FromRow, PgPool};
use tracing::info;

#[derive(Debug, Clone, FromRow)]
pub struct ContactRow {
    pub id: i32,
    pub first_name: String,
    pub last_name: String,
    pub position: Option<String>,
    pub company_id: Option<i32>,
}

/// Why the position was flagged as a headline.
#[derive(Debug, Clone)]
pub struct HeadlineVerdict {
    pub contact_id: i32,
    pub name: String,
    pub position: String,
    pub reasons: Vec<&'static str>,
    pub score: u8, // 0-10, higher = more likely a headline
}

/// Fetch contacts with non-empty positions.
pub async fn fetch_contacts_with_positions(pool: &PgPool) -> Result<Vec<ContactRow>> {
    let rows: Vec<ContactRow> = sqlx::query_as(
        r#"
        SELECT id, first_name, last_name, position, company_id
        FROM contacts
        WHERE position IS NOT NULL
          AND position != ''
          AND LENGTH(position) > 1
        ORDER BY id
        "#,
    )
    .fetch_all(pool)
    .await
    .context("fetching contacts with positions")?;

    Ok(rows)
}

/// Clear position for flagged contacts.
pub async fn clear_position(pool: &PgPool, contact_id: i32) -> Result<()> {
    sqlx::query("UPDATE contacts SET position = NULL WHERE id = $1")
        .bind(contact_id)
        .execute(pool)
        .await
        .context("clearing contact position")?;
    Ok(())
}

/// Batch clear positions for multiple contacts.
pub async fn clear_positions_batch(pool: &PgPool, ids: &[i32]) -> Result<u64> {
    if ids.is_empty() {
        return Ok(0);
    }
    let result = sqlx::query("UPDATE contacts SET position = NULL WHERE id = ANY($1)")
        .bind(ids)
        .execute(pool)
        .await
        .context("batch clearing contact positions")?;
    let n = result.rows_affected();
    info!("Cleared {n} contact positions");
    Ok(n)
}

/// Classify a position string — returns None if it looks like a real job title,
/// Some(verdict) if it looks like a LinkedIn headline.
pub fn classify_position(contact: &ContactRow) -> Option<HeadlineVerdict> {
    let pos = match &contact.position {
        Some(p) if !p.is_empty() => p.as_str(),
        _ => return None,
    };

    let mut reasons: Vec<&'static str> = Vec::new();
    let mut score: u8 = 0;

    // --- Length signals ---
    let char_count = pos.chars().count();
    if char_count > 150 {
        reasons.push("very long (>150 chars)");
        score += 4;
    } else if char_count > 100 {
        reasons.push("long (>100 chars)");
        score += 2;
    }

    // --- First-person language ---
    let lower = pos.to_lowercase();
    if lower.starts_with("i am ")
        || lower.starts_with("i'm ")
        || lower.starts_with("i help")
        || lower.contains(" i am ")
        || lower.contains(" i'm ")
        || lower.contains(" i help ")
        || lower.starts_with("helping ")
        || lower.starts_with("passionate about")
        || lower.starts_with("dedicated to")
        || lower.starts_with("experienced ")
        || lower.starts_with("an experienced ")
        || lower.starts_with("as founder")
    {
        reasons.push("first-person / self-description");
        score += 4;
    }

    // --- Multiple pipe separators (LinkedIn headline style) ---
    let pipe_count = pos.matches('|').count();
    if pipe_count >= 3 {
        reasons.push("3+ pipe separators");
        score += 3;
    } else if pipe_count == 2 {
        reasons.push("2 pipe separators");
        score += 1;
    }

    // --- Contains newlines ---
    if pos.contains('\n') {
        reasons.push("contains newlines");
        score += 3;
    }

    // --- Contains hashtags ---
    let hashtag_count = pos.matches('#').count();
    if hashtag_count >= 2 {
        reasons.push("multiple hashtags");
        score += 3;
    }

    // --- Contains emojis ---
    if has_emoji(pos) {
        reasons.push("contains emoji");
        score += 2;
    }

    // --- Sentence-like (ends with period, contains "having", "completed", etc.) ---
    if (lower.contains("having ") && lower.contains("completed"))
        || lower.contains("in search for")
        || lower.contains("looking for")
        || lower.contains("open to")
        || lower.ends_with('.')
        || lower.contains(". ")
    {
        reasons.push("sentence-like text");
        score += 2;
    }

    // --- Contact info in position ---
    if lower.contains("@gmail")
        || lower.contains("@yahoo")
        || lower.contains("@hotmail")
        || lower.contains("wechat")
        || lower.contains("email:")
        || pos.contains("07") && pos.len() > 80 // UK phone numbers in long text
    {
        reasons.push("contains contact info");
        score += 3;
    }

    // Threshold: score >= 4 means it's a headline
    if score >= 4 {
        let name = format!("{} {}", contact.first_name, contact.last_name);
        Some(HeadlineVerdict {
            contact_id: contact.id,
            name,
            position: pos.to_string(),
            reasons,
            score,
        })
    } else {
        None
    }
}

/// Simple emoji detection — checks for common Unicode emoji ranges.
fn has_emoji(s: &str) -> bool {
    s.chars().any(|c| {
        matches!(c,
            '\u{1F300}'..='\u{1F9FF}' // Misc Symbols, Emoticons, Supplemental
            | '\u{2600}'..='\u{26FF}' // Misc Symbols
            | '\u{2700}'..='\u{27BF}' // Dingbats
            | '\u{FE00}'..='\u{FE0F}' // Variation Selectors
            | '\u{1FA00}'..='\u{1FA6F}' // Chess Symbols
            | '\u{1FA70}'..='\u{1FAFF}' // Symbols Extended-A
            | '\u{200D}' // Zero Width Joiner
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_contact(id: i32, position: &str) -> ContactRow {
        ContactRow {
            id,
            first_name: "Test".into(),
            last_name: "User".into(),
            position: Some(position.into()),
            company_id: Some(1),
        }
    }

    #[test]
    fn real_title_not_flagged() {
        let c = make_contact(1, "Senior Consultant at Oliver Bernard");
        assert!(classify_position(&c).is_none());
    }

    #[test]
    fn short_title_not_flagged() {
        let c = make_contact(2, "CTO");
        assert!(classify_position(&c).is_none());
    }

    #[test]
    fn headline_with_first_person() {
        let c = make_contact(3, "I am a hardworking and resilient individual, having completed my Psychology degree I am in search for new opportunities.");
        let v = classify_position(&c).expect("should flag");
        assert!(v.reasons.contains(&"first-person / self-description"));
        assert!(v.score >= 4);
    }

    #[test]
    fn headline_with_pipes_and_emojis() {
        let c = make_contact(4, "📊 Data & AI Recruiter | Oliver Bernard | Scaling Tech Teams | Community Builder | Speaker");
        let v = classify_position(&c).expect("should flag");
        assert!(v.reasons.contains(&"3+ pipe separators"));
    }

    #[test]
    fn headline_with_newlines() {
        let c = make_contact(5, "Group Partnership Manager\nWorking across three brands, supporting food producers to build teams quickly.");
        let v = classify_position(&c).expect("should flag");
        assert!(v.reasons.contains(&"contains newlines"));
    }

    #[test]
    fn headline_very_long() {
        let c = make_contact(6, "Strategic People Leader, FCIPD Fellow l FCGI Governance Fellow I Prosci Change Practitioner l HR Trustee l Freeman of the City of London | ACC ICF Systemic, Behavioural Change Executive & Team Coach l Accredited Mediator");
        let v = classify_position(&c).expect("should flag");
        assert!(v.score >= 4);
    }

    #[test]
    fn short_title_with_at_not_flagged() {
        let c = make_contact(7, "Director, Talent Acquisition at Alvarez and Marsal");
        assert!(classify_position(&c).is_none());
    }
}
