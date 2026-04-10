/// Partner staffing fitness scoring — scores GitHub users for delivery/architecture/consulting roles.
///
/// Designed for the Claude Partner Network: find people you'd anchor a Claude practice around —
/// delivery leads, solution architects, technical consultants, engagement managers.
use crate::types::GhUser;
use std::collections::BTreeSet;

/// Archetype taxonomy for partner-staffable roles.
/// Each entry: (canonical tag, list of bio/company keywords).
static ARCHETYPE_TAXONOMY: &[(&str, &[&str])] = &[
    (
        "delivery-lead",
        &[
            "delivery lead",
            "delivery manager",
            "program manager",
            "engagement manager",
            "project lead",
            "technical program manager",
            "tpm",
            "delivery director",
            "head of delivery",
        ],
    ),
    (
        "solution-architect",
        &[
            "solution architect",
            "solutions architect",
            "enterprise architect",
            "cloud architect",
            "technical architect",
            "system architect",
            "principal architect",
            "software architect",
            "data architect",
            "ai architect",
        ],
    ),
    (
        "technical-consultant",
        &[
            "consultant",
            "consulting",
            "advisory",
            "professional services",
            "client engagement",
            "customer success",
            "implementation specialist",
            "technical advisor",
            "practice lead",
        ],
    ),
    (
        "ai-engineer",
        &[
            "ai engineer",
            "ml engineer",
            "machine learning engineer",
            "applied scientist",
            "llm engineer",
            "genai engineer",
            "deep learning engineer",
            "nlp engineer",
            "ai/ml",
        ],
    ),
    (
        "staff-engineer",
        &[
            "staff engineer",
            "principal engineer",
            "distinguished engineer",
            "tech lead",
            "engineering manager",
            "director of engineering",
            "head of engineering",
            "vp engineering",
            "cto",
        ],
    ),
    (
        "partner-signals",
        &[
            "partner",
            "channel",
            "alliance",
            "ecosystem",
            "anthropic",
            "openai partner",
            "aws partner",
            "gcp partner",
            "azure partner",
            "claude",
        ],
    ),
];

/// Companies known for consulting/delivery/SI work — boost when company matches.
static CONSULTING_COMPANIES: &[&str] = &[
    "accenture",
    "deloitte",
    "mckinsey",
    "bcg",
    "bain",
    "slalom",
    "thoughtworks",
    "capgemini",
    "cognizant",
    "infosys",
    "wipro",
    "tcs",
    "epam",
    "globant",
    "avanade",
    "publicis sapient",
    "quantiphi",
    "booz allen",
    "kpmg",
    "ey",
    "pwc",
    "ibm consulting",
    "xebia",
    "futurice",
    "nordcloud",
    "datatonic",
];

/// Result of partner fitness scoring.
#[derive(Debug, Clone)]
pub struct PartnerFitness {
    /// 0.0–1.0 composite partner fitness score.
    pub score: f32,
    /// Matched archetype tags (e.g. "solution-architect", "delivery-lead").
    pub archetypes: Vec<&'static str>,
    /// Whether the user's company matches a known consulting/SI firm.
    pub is_consulting_company: bool,
    /// Whether the user starred an Anthropic / Claude ecosystem repo.
    pub starred_anthropic: bool,
    /// 0.0–1.0 seniority signal from account metrics.
    pub seniority_signal: f32,
    /// 0.0–1.0 AI depth from skill tag overlap.
    pub ai_depth: f32,
    /// 0.0–1.0 engagement readiness (email, hireable, active, blog).
    pub engagement_readiness: f32,
}

/// Extract archetype tags from raw text (bio + company).
pub fn extract_archetypes(text: &str) -> Vec<&'static str> {
    let lower = text.to_lowercase();
    let mut found = BTreeSet::new();
    for (tag, keywords) in ARCHETYPE_TAXONOMY {
        if keywords.iter().any(|kw| lower.contains(kw)) {
            found.insert(*tag);
        }
    }
    found.into_iter().collect()
}

/// Compute partner fitness score for a GitHub user.
///
/// `skills` should come from `crate::skills::extract_skills()`.
/// `starred_anthropic` — true if the user was discovered via stargazing an Anthropic/Claude repo.
pub fn compute_partner_fitness(user: &GhUser, skills: &[&str], starred_anthropic: bool) -> PartnerFitness {
    // Build combined text for archetype matching
    let mut text = String::new();
    if let Some(ref bio) = user.bio {
        text.push_str(bio);
        text.push(' ');
    }
    if let Some(ref company) = user.company {
        text.push_str(company);
        text.push(' ');
    }
    if let Some(ref blog) = user.blog {
        text.push_str(blog);
    }

    let archetypes = extract_archetypes(&text);

    // ── Archetype match (weight: 0.35) ──────────────────────────────────────
    let archetype_score = if archetypes.is_empty() {
        0.0
    } else {
        // More archetypes = higher score, capped at 1.0
        (archetypes.len() as f32 * 0.4).min(1.0)
    };

    // ── AI depth (weight: 0.25) ─────────────────────────────────────────────
    // Count of AI/ML skill tags, normalised (caps at 5 tags → 1.0)
    let ai_depth = (skills.len() as f32 / 5.0).min(1.0);

    // ── Seniority signal (weight: 0.20) ─────────────────────────────────────
    let followers = user.followers as f32;
    let public_repos = user.public_repos as f32;
    let account_age_years = {
        let now = chrono::Utc::now();
        (now - user.created_at).num_days().max(1) as f32 / 365.0
    };
    // Normalised components
    let follower_signal = (followers / 500.0).min(1.0);
    let repo_signal = (public_repos / 50.0).min(1.0);
    let age_signal = (account_age_years / 8.0).min(1.0);
    let seniority_signal = follower_signal * 0.4 + repo_signal * 0.3 + age_signal * 0.3;

    // ── Engagement readiness (weight: 0.20) ──────────────────────────────────
    let has_email = user.email.is_some() && !user.email.as_deref().unwrap_or("").is_empty();
    let is_hireable = user.hireable.unwrap_or(false);
    let has_blog = user.blog.as_deref().map_or(false, |b| !b.is_empty());
    let has_twitter = user.twitter_username.is_some();
    let recently_active = {
        let days_since_update = (chrono::Utc::now() - user.updated_at).num_days();
        days_since_update < 90
    };

    let readiness_signals = [
        has_email,
        is_hireable,
        has_blog,
        has_twitter,
        recently_active,
    ];
    let engagement_readiness =
        readiness_signals.iter().filter(|&&s| s).count() as f32 / readiness_signals.len() as f32;

    // ── Consulting company boost ────────────────────────────────────────────
    let company_lower = user.company.as_deref().unwrap_or("").to_lowercase();
    let is_consulting_company = CONSULTING_COMPANIES
        .iter()
        .any(|c| company_lower.contains(c));
    let consulting_boost: f32 = if is_consulting_company { 0.15 } else { 0.0 };

    // ── Anthropic stargazer boost (highest signal) ──────────────────────────
    // A consulting employee who starred anthropic-sdk-python scores much higher
    // than someone with "solution architect" in bio and no Anthropic signal.
    let star_boost: f32 = if starred_anthropic { 0.30 } else { 0.0 };

    // ── Composite score ─────────────────────────────────────────────────────
    // Weights: star(0.30) + archetype(0.25) + ai(0.20) + seniority(0.15)
    //        + engagement(0.10) + consulting(0.15)
    let raw = star_boost
        + archetype_score * 0.25
        + ai_depth * 0.20
        + seniority_signal * 0.15
        + engagement_readiness * 0.10
        + consulting_boost;
    let score = raw.min(1.0);

    PartnerFitness {
        score,
        archetypes,
        is_consulting_company,
        starred_anthropic,
        seniority_signal,
        ai_depth,
        engagement_readiness,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::GhUser;
    use chrono::Utc;

    fn make_user(bio: Option<&str>, company: Option<&str>) -> GhUser {
        GhUser {
            login: "testuser".into(),
            id: 1,
            html_url: "https://github.com/testuser".into(),
            avatar_url: String::new(),
            name: Some("Test User".into()),
            email: Some("test@example.com".into()),
            bio: bio.map(|s| s.into()),
            company: company.map(|s| s.into()),
            location: Some("Berlin, Germany".into()),
            blog: Some("https://example.com".into()),
            twitter_username: Some("testuser".into()),
            public_repos: 30,
            public_gists: 5,
            followers: 200,
            following: 50,
            hireable: Some(true),
            created_at: Utc::now() - chrono::Duration::days(365 * 5),
            updated_at: Utc::now() - chrono::Duration::days(2),
        }
    }

    #[test]
    fn architect_bio_scores_high() {
        let user = make_user(
            Some("Solutions Architect at AWS. Building cloud-native AI systems."),
            Some("Amazon Web Services"),
        );
        let skills = vec!["llm", "rag", "python"];
        let fitness = compute_partner_fitness(&user, &skills, false);
        assert!(fitness.score > 0.4, "expected > 0.4, got {}", fitness.score);
        assert!(fitness.archetypes.contains(&"solution-architect"));
    }

    #[test]
    fn consultant_at_big_four_scores_high() {
        let user = make_user(
            Some("Technical Consultant — AI/ML practice"),
            Some("Deloitte"),
        );
        let skills = vec!["llm", "mlops"];
        let fitness = compute_partner_fitness(&user, &skills, false);
        assert!(fitness.score > 0.4);
        assert!(fitness.is_consulting_company);
        assert!(fitness.archetypes.contains(&"technical-consultant"));
    }

    #[test]
    fn empty_bio_scores_low() {
        let user = make_user(None, None);
        let fitness = compute_partner_fitness(&user, &[], false);
        assert!(fitness.score < 0.3, "expected < 0.3, got {}", fitness.score);
        assert!(fitness.archetypes.is_empty());
    }

    #[test]
    fn stargazer_boost_outweighs_archetype() {
        // A generic user who starred an Anthropic repo should outscore
        // an architect without the stargazer signal.
        let user = make_user(Some("Software engineer"), None);
        let starred = compute_partner_fitness(&user, &[], true);
        let architect = compute_partner_fitness(
            &make_user(Some("Solutions Architect"), None),
            &[],
            false,
        );
        assert!(
            starred.score > architect.score,
            "starred ({:.2}) should beat architect ({:.2})",
            starred.score,
            architect.score,
        );
        assert!(starred.starred_anthropic);
    }

    #[test]
    fn consulting_stargazer_scores_highest() {
        let user = make_user(
            Some("Technical Consultant — AI/ML"),
            Some("Deloitte"),
        );
        let fitness = compute_partner_fitness(&user, &["llm", "rag"], true);
        assert!(fitness.score > 0.7, "expected > 0.7, got {}", fitness.score);
        assert!(fitness.starred_anthropic);
        assert!(fitness.is_consulting_company);
    }

    #[test]
    fn extract_archetypes_finds_multiple() {
        let tags = extract_archetypes("Staff Engineer and Solutions Architect at EPAM");
        assert!(tags.contains(&"solution-architect"));
        assert!(tags.contains(&"staff-engineer"));
    }

    #[test]
    fn extract_archetypes_case_insensitive() {
        let tags = extract_archetypes("DELIVERY LEAD for enterprise AI");
        assert!(tags.contains(&"delivery-lead"));
    }

    #[test]
    fn extract_archetypes_empty_text() {
        assert!(extract_archetypes("").is_empty());
    }
}
