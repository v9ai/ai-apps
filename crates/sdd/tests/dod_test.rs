use sdd::*;

// ── DodCategory Tests ─────────────────────────────────────────────────────

#[test]
fn test_dod_category_as_str() {
    assert_eq!(DodCategory::Completeness.as_str(), "completeness");
    assert_eq!(DodCategory::Correctness.as_str(), "correctness");
    assert_eq!(DodCategory::Coherence.as_str(), "coherence");
    assert_eq!(DodCategory::Testing.as_str(), "testing");
    assert_eq!(DodCategory::Custom("eval-recall".into()).as_str(), "eval-recall");
}

// ── DefinitionOfDone::default_dod Tests ───────────────────────────────────

#[test]
fn test_default_dod_has_four_criteria() {
    let dod = DefinitionOfDone::default_dod();
    assert_eq!(dod.criteria.len(), 4);
}

#[test]
fn test_default_dod_all_required() {
    let dod = DefinitionOfDone::default_dod();
    assert!(dod.criteria.iter().all(|c| c.required));
}

#[test]
fn test_default_dod_categories() {
    let dod = DefinitionOfDone::default_dod();
    let categories: Vec<_> = dod.criteria.iter().map(|c| c.category.clone()).collect();
    assert!(categories.contains(&DodCategory::Completeness));
    assert!(categories.contains(&DodCategory::Correctness));
    assert!(categories.contains(&DodCategory::Coherence));
    assert!(categories.contains(&DodCategory::Testing));
}

#[test]
fn test_default_dod_criterion_ids() {
    let dod = DefinitionOfDone::default_dod();
    let ids: Vec<_> = dod.criteria.iter().map(|c| c.id.as_str()).collect();
    assert_eq!(ids, vec!["completeness", "correctness", "coherence", "testing"]);
}

// ── to_prompt_section Tests ───────────────────────────────────────────────

#[test]
fn test_to_prompt_section_contains_criterion_ids() {
    let dod = DefinitionOfDone::default_dod();
    let section = dod.to_prompt_section();
    assert!(section.contains("[completeness]"));
    assert!(section.contains("[correctness]"));
    assert!(section.contains("[coherence]"));
    assert!(section.contains("[testing]"));
}

#[test]
fn test_to_prompt_section_contains_format_instructions() {
    let dod = DefinitionOfDone::default_dod();
    let section = dod.to_prompt_section();
    assert!(section.contains("DOD_RESULT:"));
    assert!(section.contains("DOD_VERDICT:"));
}

#[test]
fn test_to_prompt_section_advisory_tag() {
    let dod = DefinitionOfDone {
        criteria: vec![DodCriterion {
            id: "perf".into(),
            description: "Latency under 100ms".into(),
            category: DodCategory::Custom("performance".into()),
            required: false,
        }],
    };
    let section = dod.to_prompt_section();
    assert!(section.contains("[ADVISORY]"));
}

// ── DodReport::parse Tests ────────────────────────────────────────────────

#[test]
fn test_parse_all_pass() {
    let dod = DefinitionOfDone::default_dod();
    let text = "\
DOD_RESULT: completeness PASS All tasks done
DOD_RESULT: correctness PASS All requirements met
DOD_RESULT: coherence PASS Design followed
DOD_RESULT: testing PASS 100% coverage
DOD_VERDICT: PASS";
    let report = DodReport::parse(text, &dod);
    assert_eq!(report.verdict, DodVerdict::Pass);
    assert_eq!(report.results.len(), 4);
    assert!(report.passed());
}

#[test]
fn test_parse_failure() {
    let dod = DefinitionOfDone::default_dod();
    let text = "\
DOD_RESULT: completeness PASS All tasks done
DOD_RESULT: correctness FAIL Missing requirement R3
DOD_RESULT: coherence PASS Design followed
DOD_RESULT: testing PASS Tests pass
DOD_VERDICT: FAIL";
    let report = DodReport::parse(text, &dod);
    assert_eq!(report.verdict, DodVerdict::Fail);
    assert!(!report.passed());
    assert_eq!(report.results[1].status, CriterionStatus::Fail);
    assert_eq!(report.results[1].evidence, "Missing requirement R3");
}

#[test]
fn test_parse_derives_verdict_when_missing() {
    let dod = DefinitionOfDone::default_dod();
    let text = "\
DOD_RESULT: completeness PASS done
DOD_RESULT: correctness PASS ok
DOD_RESULT: coherence WARNING minor deviation
DOD_RESULT: testing PASS ok";
    let report = DodReport::parse(text, &dod);
    // No explicit DOD_VERDICT, should derive PassWithWarnings
    assert_eq!(report.verdict, DodVerdict::PassWithWarnings);
    assert!(report.passed());
}

#[test]
fn test_parse_derives_fail_for_required_criterion() {
    let dod = DefinitionOfDone::default_dod();
    let text = "\
DOD_RESULT: completeness PASS done
DOD_RESULT: correctness FAIL broken
DOD_RESULT: coherence PASS ok
DOD_RESULT: testing PASS ok";
    let report = DodReport::parse(text, &dod);
    // correctness is required and FAIL → Fail verdict
    assert_eq!(report.verdict, DodVerdict::Fail);
    assert!(!report.passed());
}

#[test]
fn test_parse_advisory_fail_becomes_warning() {
    let dod = DefinitionOfDone {
        criteria: vec![
            DodCriterion {
                id: "required-check".into(),
                description: "Must pass".into(),
                category: DodCategory::Completeness,
                required: true,
            },
            DodCriterion {
                id: "advisory-check".into(),
                description: "Nice to have".into(),
                category: DodCategory::Custom("optional".into()),
                required: false,
            },
        ],
    };
    let text = "\
DOD_RESULT: required-check PASS ok
DOD_RESULT: advisory-check FAIL not great";
    let report = DodReport::parse(text, &dod);
    // Advisory fail should not cause overall Fail
    assert_eq!(report.verdict, DodVerdict::PassWithWarnings);
    assert!(report.passed());
}

#[test]
fn test_parse_legacy_fallback_pass() {
    let dod = DefinitionOfDone::default_dod();
    let text = "All checks PASS. Everything looks good.";
    let report = DodReport::parse(text, &dod);
    assert_eq!(report.verdict, DodVerdict::Pass);
    assert!(report.passed());
    // Should synthesize results for all 4 criteria
    assert_eq!(report.results.len(), 4);
    assert!(report.results.iter().all(|r| r.status == CriterionStatus::Pass));
}

#[test]
fn test_parse_legacy_fallback_fail() {
    let dod = DefinitionOfDone::default_dod();
    let text = "FAIL: missing tests and incomplete coverage";
    let report = DodReport::parse(text, &dod);
    assert_eq!(report.verdict, DodVerdict::Fail);
    assert!(!report.passed());
    assert!(report.results.iter().all(|r| r.status == CriterionStatus::Fail));
}

// ── SddChange DoD integration Tests ──────────────────────────────────────

#[test]
fn test_sdd_change_dod_defaults() {
    let change = SddChange::new("test", "desc");
    let dod = change.dod();
    assert_eq!(dod.criteria.len(), 4);
    assert!(change.definition_of_done.is_none());
}

#[test]
fn test_sdd_change_dod_custom() {
    let custom = DefinitionOfDone {
        criteria: vec![DodCriterion {
            id: "eval-recall".into(),
            description: "Eval suite passes 60% recall".into(),
            category: DodCategory::Custom("eval".into()),
            required: true,
        }],
    };
    let change = SddChange::new("test", "desc").with_dod(custom.clone());
    assert_eq!(change.dod().criteria.len(), 1);
    assert_eq!(change.dod().criteria[0].id, "eval-recall");
}

#[test]
fn test_sdd_change_add_criterion() {
    let mut change = SddChange::new("test", "desc");
    change.add_criterion(DodCriterion {
        id: "legal-citations".into(),
        description: "All legal citations verified".into(),
        category: DodCategory::Custom("legal".into()),
        required: true,
    });
    // Should have default 4 + 1 custom = 5
    let dod = change.dod();
    assert_eq!(dod.criteria.len(), 5);
    assert_eq!(dod.criteria[4].id, "legal-citations");
}

#[test]
fn test_sdd_change_with_dod_builder() {
    let dod = DefinitionOfDone {
        criteria: vec![
            DodCriterion {
                id: "c1".into(),
                description: "Check 1".into(),
                category: DodCategory::Completeness,
                required: true,
            },
            DodCriterion {
                id: "c2".into(),
                description: "Check 2".into(),
                category: DodCategory::Testing,
                required: false,
            },
        ],
    };
    let change = SddChange::new("test", "desc").with_dod(dod);
    assert!(change.definition_of_done.is_some());
    assert_eq!(change.dod().criteria.len(), 2);
}

// ── Serde roundtrip Tests ─────────────────────────────────────────────────

#[test]
fn test_serde_roundtrip_without_dod() {
    let change = SddChange::new("test", "desc");
    let json = serde_json::to_string(&change).unwrap();
    // definition_of_done should be omitted (skip_serializing_if)
    assert!(!json.contains("definition_of_done"));
    let deserialized: SddChange = serde_json::from_str(&json).unwrap();
    assert!(deserialized.definition_of_done.is_none());
}

#[test]
fn test_serde_roundtrip_with_dod() {
    let dod = DefinitionOfDone {
        criteria: vec![DodCriterion {
            id: "custom".into(),
            description: "Custom check".into(),
            category: DodCategory::Custom("perf".into()),
            required: false,
        }],
    };
    let change = SddChange::new("test", "desc").with_dod(dod);
    let json = serde_json::to_string(&change).unwrap();
    assert!(json.contains("definition_of_done"));
    let deserialized: SddChange = serde_json::from_str(&json).unwrap();
    assert!(deserialized.definition_of_done.is_some());
    assert_eq!(deserialized.dod().criteria[0].id, "custom");
}

#[test]
fn test_backward_compat_deserialize_without_dod_field() {
    // Old JSON without definition_of_done should deserialize cleanly
    let old_json = r#"{
        "name": "legacy",
        "description": "old change",
        "phases_completed": ["Propose"],
        "phases_in_progress": [],
        "artifacts": {},
        "created_at": "2025-01-01",
        "updated_at": "2025-01-01"
    }"#;
    let change: SddChange = serde_json::from_str(old_json).unwrap();
    assert!(change.definition_of_done.is_none());
    // dod() should still return default
    assert_eq!(change.dod().criteria.len(), 4);
}
