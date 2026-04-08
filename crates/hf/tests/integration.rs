use std::collections::HashMap;

use hf::{
    EffortLevel, FetchRequest, HfClient, ListOptions, OrgProfile, OrgScanner, RepoInfo,
};

#[test]
fn client_constructs_and_types_compose() {
    // Public API: construct client, create typed requests
    let client = HfClient::new(None, 8).unwrap();
    let _requests = [
        FetchRequest::model("meta-llama/Llama-3-8B").with_path("config.json"),
        FetchRequest::dataset("squad").with_revision("v2"),
    ];
    let _opts = ListOptions::models().search("llama").author("meta-llama").max_pages(3);
    // Compiles and constructs — types compose correctly
    drop(client);
}

#[test]
fn org_scanner_pure_functions_compose() {
    // Feed a realistic RepoInfo through the entire analysis pipeline
    let repo = RepoInfo {
        id: None,
        repo_id: Some("research-lab/custom-llm-v2".into()),
        model_id: None,
        author: Some("research-lab".into()),
        sha: None,
        last_modified: Some("2025-03-15T00:00:00.000Z".into()),
        created_at: Some("2024-06-01T00:00:00.000Z".into()),
        tags: Some(vec!["transformers".into(), "text-generation".into()]),
        downloads: Some(25_000),
        likes: Some(150),
        library: Some("transformers".into()),
        pipeline_tag: Some("text-generation".into()),
        private: Some(false),
        gated: None,
        disabled: None,
        description: Some("Custom LLM for code generation".into()),
        sdk: None,
        siblings: Some(vec![
            hf::SiblingFile { filename: "config.json".into(), size: Some(500) },
            hf::SiblingFile { filename: "model.safetensors".into(), size: Some(8_000_000_000) },
            hf::SiblingFile { filename: "training_args.bin".into(), size: Some(5000) },
        ]),
        card_data: Some(serde_json::json!({"datasets": ["custom-proprietary"]})),
        extra: serde_json::Value::Null,
    };

    let readme = "# Custom LLM v2\n\nWe trained this model on our proprietary code dataset.\n\n## Evaluation\n\nExtensive results on HumanEval benchmark.\n";
    let tags = vec!["transformers".into(), "text-generation".into()];
    let siblings = repo.siblings.as_deref().unwrap_or(&[]);

    // 1. Parse training signals from README
    let signals = OrgScanner::parse_training_signals("research-lab/custom-llm-v2", readme);
    assert!(!signals.is_empty(), "should detect training signals");

    // 2. Parse file-based signals
    let file_signals = OrgScanner::parse_file_signals("research-lab/custom-llm-v2", siblings);
    assert!(!file_signals.is_empty(), "should detect training_args.bin");

    // 3. Assess maturity
    let maturity = OrgScanner::assess_model_maturity(
        "research-lab/custom-llm-v2",
        &repo,
        Some(readme),
        siblings,
        &tags,
    );
    assert!(
        maturity.effort_level == EffortLevel::Production || maturity.effort_level == EffortLevel::Research,
        "well-documented, high-download model should be Production or Research, got {:?}",
        maturity.effort_level
    );
    assert!(maturity.updated_after_creation);

    // 4. Compute org-level score
    let mut all_signals = signals;
    all_signals.extend(file_signals);
    let profile = OrgProfile {
        org_name: "research-lab".into(),
        models: vec![repo],
        datasets: vec![],
        spaces: vec![],
        total_downloads: 25_000,
        libraries_used: vec![("transformers".into(), 1)],
        pipeline_tags: vec![("text-generation".into(), 1)],
        training_signals: all_signals,
        arxiv_links: vec![],
        model_configs: HashMap::new(),
        model_maturity: vec![maturity],
        sales_signals: vec![],
    };
    let score = OrgScanner::compute_hf_score(&profile);
    assert!(score > 0.0, "non-trivial org should have positive score: {score}");
    assert!(score <= 1.0, "score should be capped at 1.0: {score}");
}
