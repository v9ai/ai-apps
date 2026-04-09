/// Neon PostgreSQL writer for GitHub contributor contacts.
///
/// Maps `RisingStar` entries that meet the threshold score to the `contacts`
/// table, using `github_handle` as the dedup key.
///
/// Requires a unique partial index:
///   `CREATE UNIQUE INDEX idx_contacts_github_handle
///      ON contacts(github_handle) WHERE github_handle IS NOT NULL;`
/// See migration `0041_add_github_handle_index.sql`.
use crate::contributors::RisingStar;
use crate::error::{GhError, Result};
use sqlx::PgPool;
use tracing::info;

/// Score tiers used in `github:score:{tier}` contact tags.
fn score_tier(rising_score: f32) -> &'static str {
    if rising_score >= 0.70 { "A" } else if rising_score >= 0.50 { "B" } else { "C" }
}

/// Infer a position string from keywords in the bio.
fn infer_position(bio: Option<&str>) -> Option<&'static str> {
    let bio = bio?.to_lowercase();
    if bio.contains("founder") || bio.contains("ceo") || bio.contains("cto") {
        Some("Founder")
    } else if bio.contains("researcher") || bio.contains("research scientist") || bio.contains("research engineer") {
        Some("Researcher")
    } else if bio.contains("scientist") || bio.contains("data scientist") {
        Some("Scientist")
    } else if bio.contains("engineer") || bio.contains("developer") || bio.contains("programmer") {
        Some("Engineer")
    } else {
        None
    }
}

/// Upsert a `RisingStar` into the `contacts` table if `star.rising_score >= threshold`.
///
/// The upsert key is `github_handle`.  On conflict the tags and optional
/// fields (email, company, position) are refreshed; existing non-null values
/// are preserved via `COALESCE`.
///
/// Returns the contact `id` when upserted, `None` when below threshold.
pub async fn save_contributor_contact(
    pool: &PgPool,
    star: &RisingStar,
    threshold: f32,
) -> Result<Option<i32>> {
    if star.rising_score < threshold {
        return Ok(None);
    }

    // ── Name ────────────────────────────────────────────────────────────────────
    let (first_name, last_name) = match &star.name {
        Some(name) => {
            let trimmed = name.trim();
            match trimmed.split_once(' ') {
                Some((first, last)) => (first.to_string(), last.to_string()),
                None => (trimmed.to_string(), String::new()),
            }
        }
        None => (star.login.clone(), String::new()),
    };

    // ── Company ─────────────────────────────────────────────────────────────────
    let company = star
        .company
        .as_deref()
        .map(|c| c.trim_start_matches('@').trim().to_string())
        .filter(|s| !s.is_empty());

    // ── Position ────────────────────────────────────────────────────────────────
    let position = infer_position(star.bio.as_deref());

    // ── Tags ────────────────────────────────────────────────────────────────────
    let tier = score_tier(star.rising_score);
    let mut tags: Vec<String> = vec![
        "github:rising-star".to_string(),
        "github:ai-contributor".to_string(),
        format!("github:score:{tier}"),
    ];
    for skill in &star.skills {
        tags.push(format!("skill:{skill}"));
    }
    let tags_json = serde_json::to_string(&tags).map_err(|e| GhError::Other(e.to_string()))?;

    // ── Upsert ───────────────────────────────────────────────────────────────────
    let id: i32 = sqlx::query_scalar(
        r#"
        INSERT INTO contacts
          (first_name, last_name, email, company, position, github_handle, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (github_handle) WHERE github_handle IS NOT NULL DO UPDATE SET
          tags       = EXCLUDED.tags,
          email      = COALESCE(EXCLUDED.email, contacts.email),
          company    = COALESCE(EXCLUDED.company, contacts.company),
          position   = COALESCE(EXCLUDED.position, contacts.position),
          updated_at = now()::text
        RETURNING id
        "#,
    )
    .bind(&first_name)
    .bind(&last_name)
    .bind(star.email.as_deref())
    .bind(company.as_deref())
    .bind(position)
    .bind(&star.login)
    .bind(&tags_json)
    .fetch_one(pool)
    .await
    .map_err(|e| GhError::Other(e.to_string()))?;

    info!(
        "upserted contact id={id} github_handle={} score={:.3}",
        star.login, star.rising_score,
    );
    Ok(Some(id))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_star(
        login: &str,
        name: Option<&str>,
        bio: Option<&str>,
        company: Option<&str>,
        rising_score: f32,
        skills: Vec<String>,
    ) -> RisingStar {
        RisingStar {
            login: login.into(),
            html_url: format!("https://github.com/{login}"),
            name: name.map(str::to_string),
            email: None,
            company: company.map(str::to_string),
            location: None,
            bio: bio.map(str::to_string),
            followers: 10,
            public_repos: 5,
            total_contributions: 100,
            ai_repos_count: 2,
            rising_score,
            contribution_density: 0.5,
            novelty: 0.5,
            breadth: 0.4,
            realness: 0.8,
            gh_created_at: "2022-01-01T00:00:00Z".into(),
            skills,
        }
    }

    #[test]
    fn score_tier_boundaries() {
        assert_eq!(score_tier(0.70), "A");
        assert_eq!(score_tier(0.80), "A");
        assert_eq!(score_tier(0.50), "B");
        assert_eq!(score_tier(0.65), "B");
        assert_eq!(score_tier(0.49), "C");
        assert_eq!(score_tier(0.0), "C");
    }

    #[test]
    fn infer_position_engineer() {
        assert_eq!(infer_position(Some("Senior ML engineer at Anthropic")), Some("Engineer"));
        assert_eq!(infer_position(Some("Software developer")), Some("Engineer"));
    }

    #[test]
    fn infer_position_researcher() {
        assert_eq!(infer_position(Some("Research scientist at DeepMind")), Some("Researcher"));
        assert_eq!(infer_position(Some("NLP researcher")), Some("Researcher"));
    }

    #[test]
    fn infer_position_founder() {
        assert_eq!(infer_position(Some("Founder & CEO")), Some("Founder"));
        assert_eq!(infer_position(Some("CTO and co-founder")), Some("Founder"));
    }

    #[test]
    fn infer_position_none_for_unknown() {
        assert_eq!(infer_position(Some("loves cats and open source")), None);
        assert_eq!(infer_position(None), None);
    }

    #[test]
    fn name_splits_first_last() {
        let star = make_star("jdoe", Some("Jane Doe"), None, None, 0.6, vec![]);
        // Simulate what save_contributor_contact does for name
        let (first, last) = match &star.name {
            Some(n) => match n.trim().split_once(' ') {
                Some((f, l)) => (f.to_string(), l.to_string()),
                None => (n.trim().to_string(), String::new()),
            },
            None => (star.login.clone(), String::new()),
        };
        assert_eq!(first, "Jane");
        assert_eq!(last, "Doe");
    }

    #[test]
    fn name_falls_back_to_login_when_absent() {
        let star = make_star("jdoe", None, None, None, 0.6, vec![]);
        let first = star.name.clone().unwrap_or_else(|| star.login.clone());
        assert_eq!(first, "jdoe");
    }

    #[test]
    fn company_strips_at_prefix() {
        let star = make_star("u", None, None, Some("@anthropic"), 0.6, vec![]);
        let company = star.company.as_deref().map(|c| c.trim_start_matches('@').trim().to_string());
        assert_eq!(company.as_deref(), Some("anthropic"));
    }

    #[test]
    fn tags_include_score_tier_and_skills() {
        let star = make_star(
            "alice",
            None,
            None,
            None,
            0.75,
            vec!["llm".to_string(), "rag".to_string()],
        );
        let tier = score_tier(star.rising_score);
        let mut tags: Vec<String> = vec![
            "github:rising-star".to_string(),
            "github:ai-contributor".to_string(),
            format!("github:score:{tier}"),
        ];
        for skill in &star.skills {
            tags.push(format!("skill:{skill}"));
        }
        assert!(tags.contains(&"github:score:A".to_string()));
        assert!(tags.contains(&"skill:llm".to_string()));
        assert!(tags.contains(&"skill:rag".to_string()));
    }

    #[test]
    fn below_threshold_would_be_skipped() {
        // Just tests the threshold comparison — DB not needed
        let star = make_star("low", None, None, None, 0.3, vec![]);
        assert!(star.rising_score < 0.4, "should be below threshold");
    }
}
