use research_agent::therapy_context::TherapyContext;
use std::io::Write;
use tempfile::NamedTempFile;

fn write_goal_json(json: &str) -> NamedTempFile {
    let mut f = NamedTempFile::new().unwrap();
    write!(f, "{json}").unwrap();
    f
}

fn minimal_goal(goal_type: &str) -> String {
    format!(
        r#"{{
            "goal_id": 5,
            "family_member_id": 1,
            "therapeutic_goal_type": "{goal_type}",
            "title": "Reduce anxiety symptoms"
        }}"#
    )
}

fn minimal_support_need(title: &str) -> String {
    format!(
        r#"{{
            "characteristic_id": 10,
            "family_member_id": 2,
            "category": "SUPPORT_NEED",
            "title": "{title}"
        }}"#
    )
}

#[test]
fn from_goal_file_parses_basic_fields() {
    let f = write_goal_json(&minimal_goal("Anxiety"));
    let ctx = TherapyContext::from_goal_file(f.path()).unwrap();

    assert_eq!(ctx.goal_id, 5);
    assert_eq!(ctx.family_member_id, 1);
    assert_eq!(ctx.therapeutic_goal_type, "Anxiety");
    assert_eq!(ctx.title, "Reduce anxiety symptoms");
}

#[test]
fn from_support_need_parses_basic_fields() {
    let f = write_goal_json(&minimal_support_need(
        "Difficulty with emotional regulation",
    ));
    let ctx = TherapyContext::from_support_need(f.path()).unwrap();

    assert_eq!(ctx.goal_id, 10);
    assert_eq!(ctx.family_member_id, 2);
    assert_eq!(ctx.therapeutic_goal_type, "SUPPORT_NEED");
    assert_eq!(ctx.title, "Difficulty with emotional regulation");
}

#[test]
fn from_goal_file_parses_impairment_domains() {
    let json = r#"{
        "goal_id": 1,
        "family_member_id": 1,
        "therapeutic_goal_type": "ADHD",
        "title": "Improve focus",
        "impairment_domains": "ACADEMIC,PEER,FAMILY"
    }"#;
    let f = write_goal_json(json);
    let ctx = TherapyContext::from_goal_file(f.path()).unwrap();

    assert_eq!(ctx.impairment_domains, vec!["ACADEMIC", "PEER", "FAMILY"]);
}

#[test]
fn from_goal_file_optional_fields() {
    let json = r#"{
        "goal_id": 1,
        "family_member_id": 1,
        "therapeutic_goal_type": "Depression",
        "title": "Improve mood",
        "description": "Child experiencing low mood",
        "severity": "MODERATE",
        "target_population": "adolescents"
    }"#;
    let f = write_goal_json(json);
    let ctx = TherapyContext::from_goal_file(f.path()).unwrap();

    assert_eq!(
        ctx.description.as_deref(),
        Some("Child experiencing low mood")
    );
    assert_eq!(ctx.severity.as_deref(), Some("MODERATE"));
    assert_eq!(ctx.target_population, "adolescents");
}

#[test]
fn from_goal_file_missing_returns_error() {
    let err =
        TherapyContext::from_goal_file(std::path::Path::new("/no/such/file.json")).unwrap_err();
    assert!(
        err.to_string().contains("reading") || err.to_string().contains("os error"),
        "unexpected error: {err}"
    );
}

#[test]
fn from_goal_file_invalid_json_returns_error() {
    let f = write_goal_json("not json at all");
    let err = TherapyContext::from_goal_file(f.path()).unwrap_err();
    assert!(
        err.to_string().contains("parsing") || err.to_string().contains("expected"),
        "unexpected error: {err}"
    );
}

#[test]
fn build_agent_prompt_contains_goal_type() {
    let f = write_goal_json(&minimal_goal("Anxiety"));
    let ctx = TherapyContext::from_goal_file(f.path()).unwrap();
    let prompt = ctx.build_agent_prompt();

    assert!(prompt.contains("Anxiety"), "goal type missing from prompt");
}

#[test]
fn build_agent_prompt_contains_title() {
    let f = write_goal_json(&minimal_goal("Anxiety"));
    let ctx = TherapyContext::from_goal_file(f.path()).unwrap();
    let prompt = ctx.build_agent_prompt();

    assert!(
        prompt.contains("Reduce anxiety symptoms"),
        "title missing from prompt"
    );
}

#[test]
fn build_agent_prompt_contains_population() {
    let f = write_goal_json(&minimal_goal("Anxiety"));
    let ctx = TherapyContext::from_goal_file(f.path()).unwrap();
    let prompt = ctx.build_agent_prompt();

    assert!(
        prompt.contains("children adolescents"),
        "population missing from prompt"
    );
}

#[test]
fn build_agent_prompt_contains_required_sections() {
    let f = write_goal_json(&minimal_goal("Anxiety"));
    let ctx = TherapyContext::from_goal_file(f.path()).unwrap();
    let prompt = ctx.build_agent_prompt();

    assert!(
        prompt.contains("## Papers Reviewed"),
        "Papers Reviewed section missing"
    );
    assert!(
        prompt.contains("## Aggregated Therapeutic Techniques"),
        "Aggregated section missing"
    );
    assert!(
        prompt.contains("## Recommended JSON Output"),
        "JSON output section missing"
    );
    assert!(prompt.contains("```json"), "JSON fence missing");
}

#[test]
fn build_agent_prompt_contains_severity_when_present() {
    let json = r#"{
        "goal_id": 1,
        "family_member_id": 1,
        "therapeutic_goal_type": "Anxiety",
        "title": "Reduce anxiety",
        "severity": "SEVERE"
    }"#;
    let f = write_goal_json(json);
    let ctx = TherapyContext::from_goal_file(f.path()).unwrap();
    let prompt = ctx.build_agent_prompt();

    assert!(prompt.contains("SEVERE"), "severity missing from prompt");
}

#[test]
fn build_agent_prompt_includes_search_queries() {
    let f = write_goal_json(&minimal_goal("Anxiety"));
    let ctx = TherapyContext::from_goal_file(f.path()).unwrap();
    let prompt = ctx.build_agent_prompt();

    assert!(
        prompt.contains("search_papers"),
        "search_papers instruction missing"
    );
    let count = (1..=10)
        .filter(|i| prompt.contains(&format!("  {i}.")))
        .count();
    assert!(count >= 3, "expected ≥3 search queries, found {count}");
}

#[test]
fn infer_focus_keywords_for_anxiety() {
    let f = write_goal_json(&minimal_goal("Anxiety"));
    let ctx = TherapyContext::from_goal_file(f.path()).unwrap();

    assert!(ctx.focus_keywords.contains(&"CBT".to_string()));
    assert!(ctx.focus_keywords.contains(&"exposure therapy".to_string()));
}

#[test]
fn infer_focus_keywords_for_depression() {
    let json = r#"{
        "goal_id": 1,
        "family_member_id": 1,
        "therapeutic_goal_type": "Depression",
        "title": "Improve mood"
    }"#;
    let f = write_goal_json(json);
    let ctx = TherapyContext::from_goal_file(f.path()).unwrap();

    assert!(ctx.focus_keywords.contains(&"CBT".to_string()));
    assert!(ctx
        .focus_keywords
        .contains(&"behavioral activation".to_string()));
}

#[test]
fn infer_focus_keywords_for_adhd() {
    let json = r#"{
        "goal_id": 1,
        "family_member_id": 1,
        "therapeutic_goal_type": "ADHD",
        "title": "Improve attention"
    }"#;
    let f = write_goal_json(json);
    let ctx = TherapyContext::from_goal_file(f.path()).unwrap();

    assert!(ctx
        .focus_keywords
        .contains(&"ADHD intervention".to_string()));
    assert!(ctx.focus_keywords.contains(&"parent training".to_string()));
}

#[test]
fn infer_focus_keywords_for_trauma() {
    let json = r#"{
        "goal_id": 1,
        "family_member_id": 1,
        "therapeutic_goal_type": "Trauma",
        "title": "Process traumatic experiences"
    }"#;
    let f = write_goal_json(json);
    let ctx = TherapyContext::from_goal_file(f.path()).unwrap();

    assert!(ctx.focus_keywords.contains(&"TF-CBT".to_string()));
    assert!(ctx.focus_keywords.contains(&"EMDR".to_string()));
}

#[test]
fn build_agent_prompt_includes_evidence_level_guidance() {
    let f = write_goal_json(&minimal_goal("Anxiety"));
    let ctx = TherapyContext::from_goal_file(f.path()).unwrap();
    let prompt = ctx.build_agent_prompt();

    assert!(
        prompt.contains("meta-analysis"),
        "evidence level guidance missing"
    );
    assert!(prompt.contains("RCT"), "RCT evidence level missing");
    assert!(
        prompt.contains("systematic review"),
        "systematic review missing"
    );
}
