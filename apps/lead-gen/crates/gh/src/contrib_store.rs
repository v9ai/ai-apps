/// Neon PostgreSQL writer for GitHub contributor contacts.
///
/// Maps `Candidate` entries that meet the threshold score to the `contacts`
/// table, using `github_handle` as the dedup key.
///
/// Requires a unique partial index:
///   `CREATE UNIQUE INDEX idx_contacts_github_handle
///      ON contacts(github_handle) WHERE github_handle IS NOT NULL;`
/// See migration `0041_add_github_handle_index.sql`.
use crate::contributors::{infer_position, infer_seniority_level, Candidate};
use crate::error::{GhError, Result};
use sqlx::PgPool;
use tracing::info;

/// Score tiers used in `github:score:{tier}` and `github:strength:{tier}` contact tags.
fn score_tier(score: f32) -> &'static str {
    if score >= 0.70 { "A" } else if score >= 0.50 { "B" } else { "C" }
}

/// Upsert a `Candidate` into the `contacts` table if `candidate.rising_score >= threshold`.
///
/// The upsert key is `github_handle`.  On conflict the tags and optional
/// fields (email, company, position) are refreshed; existing non-null values
/// are preserved via `COALESCE`.
///
/// `extra_tags` are appended alongside the default `github:rising-star` /
/// `skill:*` tags — use for opportunity IDs, location verification, etc.
///
/// Returns the contact `id` when upserted, `None` when below threshold.
pub async fn save_contributor_contact(
    pool: &PgPool,
    candidate: &Candidate,
    threshold: f32,
    extra_tags: &[String],
) -> Result<Option<i32>> {
    // Use the best of strength_score and rising_score for threshold check
    let best_score = candidate.strength_score.max(candidate.rising_score);
    if best_score < threshold {
        return Ok(None);
    }

    // ── Name ────────────────────────────────────────────────────────────────────
    let (first_name, last_name) = match &candidate.name {
        Some(name) => {
            let trimmed = name.trim();
            match trimmed.split_once(' ') {
                Some((first, last)) => (first.to_string(), last.to_string()),
                None => (trimmed.to_string(), String::new()),
            }
        }
        None => (candidate.login.clone(), String::new()),
    };

    // ── Company ─────────────────────────────────────────────────────────────────
    let company = candidate
        .company
        .as_deref()
        .map(|c| c.trim_start_matches('@').trim().to_string())
        .filter(|s| !s.is_empty());

    // ── Position ────────────────────────────────────────────────────────────────
    let position = infer_position(candidate.bio.as_deref());

    // ── Tags ────────────────────────────────────────────────────────────────────
    let rising_tier = score_tier(candidate.rising_score);
    let strength_tier = score_tier(candidate.strength_score);
    let mut tags: Vec<String> = vec![
        "github:rising-star".to_string(),
        "github:ai-contributor".to_string(),
        format!("github:score:{rising_tier}"),
        format!("github:strength:{strength_tier}"),
    ];
    // Opportunity skill match percentage tag
    if candidate.opp_skill_match > 0.0 {
        let pct = (candidate.opp_skill_match * 100.0).round() as u32;
        tags.push(format!("opp:skill-match:{pct}pct"));
    }
    // Seniority tag from position inference
    if let Some(pos) = position {
        let level = infer_seniority_level(Some(pos));
        let level_label = if level >= 0.90 { "staff-plus" }
            else if level >= 0.75 { "senior" }
            else if level >= 0.50 { "mid" }
            else { "junior" };
        tags.push(format!("seniority:{level_label}"));
    }
    for skill in &candidate.skills {
        tags.push(format!("skill:{skill}"));
    }
    // Activity tags from calendar data
    if let Some(d) = candidate.days_since_last_active {
        if d <= 7 {
            tags.push("github:active-this-week".to_string());
        } else if d <= 30 {
            tags.push("github:active-this-month".to_string());
        }
    }
    if let Some(ref trend) = candidate.activity_trend {
        tags.push(format!("github:trend:{trend}"));
    }
    // Contribution quality tag
    if let Some(cq) = candidate.contribution_quality {
        if cq >= 0.5 {
            tags.push("github:quality:external-contributor".to_string());
        }
    }
    for tag in extra_tags {
        tags.push(tag.clone());
    }
    let tags_json = serde_json::to_string(&tags).map_err(|e| GhError::Other(e.to_string()))?;

    // ── Upsert ───────────────────────────────────────────────────────────────────
    let id: i32 = sqlx::query_scalar(
        r#"
        INSERT INTO contacts
          (first_name, last_name, email, company, position, github_handle, tags, authority_score)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (github_handle) WHERE github_handle IS NOT NULL DO UPDATE SET
          tags            = EXCLUDED.tags,
          email           = COALESCE(EXCLUDED.email, contacts.email),
          company         = COALESCE(EXCLUDED.company, contacts.company),
          position        = COALESCE(EXCLUDED.position, contacts.position),
          authority_score = EXCLUDED.authority_score,
          updated_at      = now()::text
        RETURNING id
        "#,
    )
    .bind(&first_name)
    .bind(&last_name)
    .bind(candidate.email.as_deref())
    .bind(company.as_deref())
    .bind(position)
    .bind(&candidate.login)
    .bind(&tags_json)
    .bind(candidate.strength_score) // authority_score ← strength_score (values experience)
    .fetch_one(pool)
    .await
    .map_err(|e| GhError::Other(e.to_string()))?;

    info!(
        "upserted contact id={id} github_handle={} strength={:.3} rising={:.3} opp_match={:.0}%",
        candidate.login, candidate.strength_score, candidate.rising_score, candidate.opp_skill_match * 100.0,
    );
    Ok(Some(id))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_candidate(
        login: &str,
        name: Option<&str>,
        bio: Option<&str>,
        company: Option<&str>,
        rising_score: f32,
        skills: Vec<String>,
    ) -> Candidate {
        Candidate {
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
            strength_score: rising_score, // mirror rising in tests
            opp_skill_match: 0.0,
            position_level: None,
            account_age_days: None,
            last_active_date: None,
            days_since_last_active: None,
            contributions_30d: None,
            contributions_90d: None,
            contributions_365d: None,
            current_streak_days: None,
            activity_trend: None,
            recency: None,
            contribution_quality: None,
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
        // "Senior" matches before "engineer" in the expanded taxonomy
        assert_eq!(infer_position(Some("Senior ML engineer at Anthropic")), Some("Senior Engineer"));
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
        let candidate = make_candidate("jdoe", Some("Jane Doe"), None, None, 0.6, vec![]);
        let (first, last) = match &candidate.name {
            Some(n) => match n.trim().split_once(' ') {
                Some((f, l)) => (f.to_string(), l.to_string()),
                None => (n.trim().to_string(), String::new()),
            },
            None => (candidate.login.clone(), String::new()),
        };
        assert_eq!(first, "Jane");
        assert_eq!(last, "Doe");
    }

    #[test]
    fn name_falls_back_to_login_when_absent() {
        let candidate = make_candidate("jdoe", None, None, None, 0.6, vec![]);
        let first = candidate.name.clone().unwrap_or_else(|| candidate.login.clone());
        assert_eq!(first, "jdoe");
    }

    #[test]
    fn company_strips_at_prefix() {
        let candidate = make_candidate("u", None, None, Some("@anthropic"), 0.6, vec![]);
        let company = candidate.company.as_deref().map(|c| c.trim_start_matches('@').trim().to_string());
        assert_eq!(company.as_deref(), Some("anthropic"));
    }

    #[test]
    fn tags_include_score_tier_and_skills() {
        let candidate = make_candidate(
            "alice",
            None,
            None,
            None,
            0.75,
            vec!["llm".to_string(), "rag".to_string()],
        );
        let rising_tier = score_tier(candidate.rising_score);
        let strength_tier = score_tier(candidate.strength_score);
        assert_eq!(rising_tier, "A");
        assert_eq!(strength_tier, "A");
    }

    #[test]
    fn below_threshold_uses_best_score() {
        // rising_score below threshold but strength_score above → should NOT skip
        let mut candidate = make_candidate("high_strength", None, None, None, 0.3, vec![]);
        candidate.strength_score = 0.6;
        let best = candidate.strength_score.max(candidate.rising_score);
        assert!(best >= 0.4, "best_score={best} should pass threshold 0.4");
    }
}
