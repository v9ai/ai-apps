use serde_json::json;
use sdd::WorkflowDocs;

#[test]
fn test_workflow_docs_phase_context() {
    let docs = WorkflowDocs {
        reference_docs: String::new(),
        phase_contexts: serde_json::from_value(json!({
            "explore": "Explore context here",
            "spec": "Spec context here",
        })).unwrap(),
    };

    assert_eq!(docs.phase_context("explore"), "Explore context here");
    assert_eq!(docs.phase_context("spec"), "Spec context here");
    assert_eq!(docs.phase_context("design"), ""); // not defined
}

#[test]
fn test_workflow_docs_enrich_base_only() {
    let docs = WorkflowDocs {
        reference_docs: String::new(),
        phase_contexts: serde_json::Map::new(),
    };

    let result = docs.enrich("Base prompt", "explore");
    assert_eq!(result, "Base prompt");
}

#[test]
fn test_workflow_docs_enrich_with_phase_context() {
    let docs = WorkflowDocs {
        reference_docs: String::new(),
        phase_contexts: serde_json::from_value(json!({
            "explore": "Extra explore guidance",
        })).unwrap(),
    };

    let result = docs.enrich("Base prompt", "explore");
    assert!(result.starts_with("Base prompt"));
    assert!(result.contains("Extra explore guidance"));
}

#[test]
fn test_workflow_docs_enrich_with_reference_docs() {
    let docs = WorkflowDocs {
        reference_docs: "Reference documentation here".into(),
        phase_contexts: serde_json::Map::new(),
    };

    let result = docs.enrich("Base prompt", "explore");
    assert!(result.contains("Base prompt"));
    assert!(result.contains("INTEGRATION REFERENCE"));
    assert!(result.contains("Reference documentation here"));
}

#[test]
fn test_workflow_docs_enrich_with_both() {
    let docs = WorkflowDocs {
        reference_docs: "Reference docs".into(),
        phase_contexts: serde_json::from_value(json!({
            "spec": "Spec phase context",
        })).unwrap(),
    };

    let result = docs.enrich("Base", "spec");
    assert!(result.contains("Base"));
    assert!(result.contains("Spec phase context"));
    assert!(result.contains("Reference docs"));
    // Phase context comes before reference docs
    let phase_pos = result.find("Spec phase context").unwrap();
    let ref_pos = result.find("Reference docs").unwrap();
    assert!(phase_pos < ref_pos);
}
