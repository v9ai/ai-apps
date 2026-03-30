use serde::{Deserialize, Serialize};

/// Full ML classification for a single contact based on their job title.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactClassification {
    /// Seniority tier: "C-level" | "Founder" | "Partner" | "VP" | "Director" | "Manager" | "Senior" | "IC"
    pub seniority: String,
    /// Functional department: "AI/ML" | "Engineering" | "Product" | "Sales/BD" | "Marketing" |
    /// "HR/Recruiting" | "Research" | "Operations" | "Finance" | "Other"
    pub department: String,
    /// Composite authority score 0.0–1.0 derived from seniority tier.
    pub authority_score: f64,
    /// True when authority_score >= 0.70 (C-level, Founder, Partner, VP, Director).
    pub is_decision_maker: bool,
    /// Human-readable list of reasons for the classification.
    pub reasons: Vec<String>,
}

/// Classify a contact's job title into seniority tier, department, authority score,
/// and decision-maker flag.
///
/// This function is intentionally allocation-light: it normalises the title to lowercase
/// once and then scans keyword lists.  It is safe to call in a hot loop over thousands
/// of contacts.
pub fn classify_contact(title: &str) -> ContactClassification {
    if title.trim().is_empty() {
        return ContactClassification {
            seniority: "IC".into(),
            department: "Other".into(),
            authority_score: 0.10,
            is_decision_maker: false,
            reasons: vec!["No title provided".into()],
        };
    }

    let t = title.to_lowercase();
    let (seniority, authority_score, seniority_reason) = infer_seniority_v2(&t);
    let (department, dept_reason) = classify_department(&t);

    let mut reasons = vec![seniority_reason, dept_reason];

    // Gatekeeper penalty: HR/Recruiting contacts are explicitly NOT decision makers
    // regardless of seniority (e.g. "Head of People" is Director-tier but not a hiring DM).
    let effective_score = if department == "HR/Recruiting" {
        reasons.push("HR/Recruiting contacts are gatekeepers, not hiring DMs".into());
        authority_score * 0.4
    } else {
        authority_score
    };

    let is_decision_maker = effective_score >= 0.70;
    if is_decision_maker {
        reasons.push(format!("Authority score {:.2} ≥ 0.70 threshold", effective_score));
    }

    ContactClassification {
        seniority,
        department,
        authority_score: (effective_score * 100.0).round() / 100.0,
        is_decision_maker,
        reasons,
    }
}

/// Returns (seniority_tier, authority_score, reason_string).
fn infer_seniority_v2(t: &str) -> (String, f64, String) {
    // ── C-level ──────────────────────────────────────────────────────────────
    // Explicit C-suite titles and "Chief … Officer" patterns
    if contains_any(t, &[
        "chief executive", "chief technology", "chief technical",
        "chief product", "chief operating", "chief financial",
        "chief revenue", "chief marketing", "chief data",
        "chief ai", "chief machine learning", "chief science",
        "chief information", "chief growth", "chief people",
        "chief legal", "chief compliance", "chief architect",
    ]) || t.contains(" ceo")  || t.starts_with("ceo")
      || t.contains(" cto")  || t.starts_with("cto")
      || t.contains(" cfo")  || t.starts_with("cfo")
      || t.contains(" coo")  || t.starts_with("coo")
      || t.contains(" cpo")  || t.starts_with("cpo")
      || t.contains(" cro")  || t.starts_with("cro")
      || t.contains(" cmo")  || t.starts_with("cmo")
      || t.contains(" cdo")  || t.starts_with("cdo")
    {
        return ("C-level".into(), 1.0, format!("Title '{}' matches C-level pattern", t));
    }

    // ── Founder / President ───────────────────────────────────────────────────
    if contains_any(t, &["founder", "co-founder", "cofounder", "president", "co founder"]) {
        return ("Founder".into(), 0.95, format!("Title '{}' matches Founder pattern", t));
    }

    // ── Partner ───────────────────────────────────────────────────────────────
    if contains_any(t, &["managing partner", "general partner", " partner", "equity partner"]) {
        return ("Partner".into(), 0.90, format!("Title '{}' matches Partner pattern", t));
    }

    // ── VP ────────────────────────────────────────────────────────────────────
    if contains_any(t, &[
        "vice president", "vp of", "vp,", "vp engineering",
        "vp product", "vp sales", "vp marketing", "vp business",
        "vp operations", "vp ai", "vp technology", "vp research",
        "vp data", "vp partnerships", "vp finance", "vp strategy",
    ]) || (t.starts_with("vp ") && t.len() > 3)
      || t == "vp"
    {
        return ("VP".into(), 0.85, format!("Title '{}' matches VP pattern", t));
    }

    // ── Director / Head of ────────────────────────────────────────────────────
    if contains_any(t, &[
        "director of", "director,", "director ", "head of",
        "general manager", "managing director", "regional director",
        "executive director", "associate director", "group lead",
        "group manager",
    ]) || t == "director"
    {
        return ("Director".into(), 0.75, format!("Title '{}' matches Director/Head-of pattern", t));
    }

    // ── Manager / Lead ────────────────────────────────────────────────────────
    if contains_any(t, &[
        "engineering manager", "product manager", "project manager",
        "program manager", "team lead", "tech lead", "technical lead",
        "team manager", "area manager", "delivery manager",
        "account manager", "practice lead",
    ]) || (t.contains("manager") && !t.contains("general manager"))
      || (t.contains(" lead") && !t.contains("team lead") && !t.contains("tech lead") && !t.contains("squad lead"))
      || t.ends_with(" lead")
    {
        return ("Manager".into(), 0.50, format!("Title '{}' matches Manager/Lead pattern", t));
    }

    // ── Senior / Staff / Principal ────────────────────────────────────────────
    if contains_any(t, &["senior ", "staff ", "principal ", "sr. ", "sr "]) {
        return ("Senior".into(), 0.25, format!("Title '{}' matches Senior/Staff/Principal pattern", t));
    }

    // ── IC fallback ───────────────────────────────────────────────────────────
    ("IC".into(), 0.10, format!("Title '{}' classified as IC (no seniority signal found)", t))
}

/// Returns (department, reason_string).
fn classify_department(t: &str) -> (String, String) {
    // AI/ML — check first: many AI titles also contain "engineering" or "research"
    if contains_any(t, &[
        "artificial intelligence", " ai ", "machine learning", "deep learning",
        "natural language", " nlp", "computer vision", " cv ",
        "data science", "data scientist", "mlops", "ml engineer",
        "llm", "large language", "language model", "generative ai",
        "reinforcement learning", "neural network", "foundation model",
        "ai research", "ai engineer", "ai architect", "ai lead",
        "ai director", "head of ai", "vp ai", "chief ai",
    ]) || t.starts_with("ai ") || t.ends_with(" ai")
    {
        return ("AI/ML".into(), "Title contains AI/ML keywords".into());
    }

    // Research
    if contains_any(t, &[
        "research scientist", "research engineer", "researcher",
        "r&d", "research and development", "scientist", " lab ",
        "applied science",
    ]) {
        return ("Research".into(), "Title contains Research keywords".into());
    }

    // Engineering
    if contains_any(t, &[
        "engineer", "developer", "software", "backend", "frontend",
        "full stack", "fullstack", "platform", "infrastructure",
        "devops", "site reliability", "sre", "cloud architect",
        "solutions architect", "architect", "cto", "vp eng",
        "engineering manager", "head of engineering",
    ]) {
        return ("Engineering".into(), "Title contains Engineering keywords".into());
    }

    // Product
    if contains_any(t, &[
        "product manager", "product owner", "product lead",
        "head of product", "vp product", "cpo", "ux", "user experience",
        "product design", "ui designer", "ux designer",
    ]) {
        return ("Product".into(), "Title contains Product keywords".into());
    }

    // Sales / Business Development
    if contains_any(t, &[
        "sales", "business development", "account executive",
        "account manager", "commercial", "revenue", "partnerships",
        "partner manager", "strategic alliance", "cro", "pre-sales",
        "presales", "solution selling", "enterprise", "channel",
    ]) {
        return ("Sales/BD".into(), "Title contains Sales/BD keywords".into());
    }

    // Marketing
    if contains_any(t, &[
        "marketing", "growth", "cmo", "brand", "content",
        "demand generation", "seo", "paid acquisition", "pr ",
        "public relations", "communications", "product marketing",
    ]) {
        return ("Marketing".into(), "Title contains Marketing keywords".into());
    }

    // HR / Recruiting — deliberately after Sales so "talent acquisition" doesn't match Sales
    if contains_any(t, &[
        "recruiter", "recruiting", "recruitment", "talent acquisition",
        "talent partner", "head of talent", "head of people",
        "chief people", "people operations", "hr manager", "hrbp",
        "human resources", "people & culture", "people and culture",
        "people team",
    ]) {
        return ("HR/Recruiting".into(), "Title contains HR/Recruiting keywords (gatekeeper)".into());
    }

    // Finance
    if contains_any(t, &[
        "finance", "cfo", "controller", "accounting", "treasurer",
        "financial", "fp&a", "investor relations",
    ]) {
        return ("Finance".into(), "Title contains Finance keywords".into());
    }

    // Operations
    if contains_any(t, &[
        "operations", "coo", "general manager", "chief of staff",
        "strategy", "transformation", "process", "supply chain",
        "program operations",
    ]) {
        return ("Operations".into(), "Title contains Operations keywords".into());
    }

    ("Other".into(), "No department keyword found — classified as Other".into())
}

/// Returns true if `haystack` contains any of the `needles`.
fn contains_any(haystack: &str, needles: &[&str]) -> bool {
    needles.iter().any(|n| haystack.contains(n))
}

/// ML-computed urgency score for re-engaging a contact.
///
/// Formula: `next_touch_score = authority_score × urgency`
///
/// Urgency is an inverse-sigmoid centred at 14 days with steepness k=0.2:
///   `urgency = 1 / (1 + exp(-0.2 × (days − 14)))`
///
/// Special cases:
/// - `has_reply = true` → 0.0 (conversation active, no follow-up needed)
/// - `days_since_last_email = None` → urgency = 1.0 (never contacted)
/// - `days >= 90` → urgency clamped to 1.0 (contact has gone cold)
pub fn compute_next_touch_score(
    authority_score: f64,
    days_since_last_email: Option<i64>,
    has_reply: bool,
) -> f64 {
    if has_reply {
        return 0.0;
    }

    let urgency = match days_since_last_email {
        None => 1.0,
        Some(days) if days >= 90 => 1.0,
        Some(days) => {
            let x = days as f64 - 14.0;
            1.0 / (1.0 + (-0.2 * x).exp())
        }
    };

    let raw = authority_score * urgency;
    (raw * 100.0).round() / 100.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ceo_is_c_level_dm() {
        let c = classify_contact("CEO & Co-Founder");
        assert_eq!(c.seniority, "C-level");
        assert!(c.is_decision_maker);
        assert!((c.authority_score - 1.0).abs() < 0.01);
    }

    #[test]
    fn head_of_ai_is_director_dm() {
        let c = classify_contact("Head of AI Research");
        assert!(c.is_decision_maker, "Head of AI Research must be DM");
    }

    #[test]
    fn vp_bd_is_dm() {
        let c = classify_contact("VP Business Development");
        assert_eq!(c.seniority, "VP");
        assert!(c.is_decision_maker);
    }

    #[test]
    fn recruiter_is_not_dm() {
        let c = classify_contact("Senior Talent Acquisition Partner");
        assert!(!c.is_decision_maker, "Recruiter must NOT be a DM");
        assert_eq!(c.department, "HR/Recruiting");
    }

    #[test]
    fn senior_ml_engineer_is_not_dm() {
        let c = classify_contact("Senior Machine Learning Engineer");
        assert!(!c.is_decision_maker);
        assert_eq!(c.department, "AI/ML");
        assert_eq!(c.seniority, "Senior");
    }

    #[test]
    fn empty_title_is_ic() {
        let c = classify_contact("");
        assert_eq!(c.seniority, "IC");
        assert!(!c.is_decision_maker);
    }

    #[test]
    fn managing_director_is_director_dm() {
        let c = classify_contact("Managing Director EMEA");
        assert_eq!(c.seniority, "Director");
        assert!(c.is_decision_maker);
    }

    #[test]
    fn engineering_manager_is_manager_not_dm() {
        let c = classify_contact("Engineering Manager");
        assert_eq!(c.seniority, "Manager");
        assert!(!c.is_decision_maker);
    }

    // ── compute_next_touch_score tests ────────────────────────────────────────

    #[test]
    fn touch_score_zero_when_reply_received() {
        let score = compute_next_touch_score(1.0, Some(30), true);
        assert_eq!(score, 0.0, "Has reply → score must be 0");
    }

    #[test]
    fn touch_score_equals_authority_when_never_contacted() {
        let score = compute_next_touch_score(0.85, None, false);
        // urgency = 1.0, so score = authority_score
        assert!((score - 0.85).abs() < 0.01, "Never contacted → score ≈ authority_score");
    }

    #[test]
    fn touch_score_near_zero_for_very_recent_email() {
        // 0 days ago: urgency = 1/(1+exp(2.8)) ≈ 0.057
        let score = compute_next_touch_score(1.0, Some(0), false);
        assert!(score < 0.15, "Just sent → score must be low (got {score})");
    }

    #[test]
    fn touch_score_high_for_stale_contact() {
        // 30 days: urgency = 1/(1+exp(-3.2)) ≈ 0.96
        let score = compute_next_touch_score(1.0, Some(30), false);
        assert!(score > 0.90, "30 days no reply → score must be high (got {score})");
    }

    #[test]
    fn touch_score_clamped_at_90_days() {
        let score_90 = compute_next_touch_score(0.75, Some(90), false);
        let score_365 = compute_next_touch_score(0.75, Some(365), false);
        // Both should be the same (urgency clamped to 1.0)
        assert!((score_90 - score_365).abs() < 0.01, "90+ days both clamped to authority_score");
        assert!((score_90 - 0.75).abs() < 0.01);
    }
}
