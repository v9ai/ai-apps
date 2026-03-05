use sdd::eval::{evaluate, finding_matches, EvalConfig, Finding, GroundTruth};

fn gt(id: &str, keywords: &[&str]) -> GroundTruth {
    GroundTruth {
        id: id.into(),
        description: format!("Ground truth {}", id),
        keywords: keywords.iter().map(|s| s.to_string()).collect(),
        severity: None,
        category: None,
    }
}

fn finding(id: &str, desc: &str, evidence: &[&str]) -> Finding {
    Finding {
        id: id.into(),
        description: desc.into(),
        evidence: evidence.iter().map(|s| s.to_string()).collect(),
        confidence: 1.0,
        finding_type: None,
        category: None,
    }
}

#[test]
fn keyword_match_above_threshold() {
    let f = finding("f1", "Found injection and overflow vulnerability", &[]);
    let g = gt("g1", &["injection", "overflow"]);
    assert!(finding_matches(&f, &g, 2));
}

#[test]
fn keyword_match_below_threshold() {
    let f = finding("f1", "Found only injection", &[]);
    let g = gt("g1", &["injection", "overflow"]);
    assert!(!finding_matches(&f, &g, 2));
}

#[test]
fn case_insensitive_matching() {
    let f = finding("f1", "Found SQL INJECTION and OVERFLOW", &[]);
    let g = gt("g1", &["injection", "overflow"]);
    assert!(finding_matches(&f, &g, 2));
}

#[test]
fn perfect_detection() {
    let config = EvalConfig::new(vec![
        gt("g1", &["injection", "overflow"]),
        gt("g2", &["xss", "script"]),
    ])
    .with_threshold(1);

    let findings = vec![
        finding("f1", "injection found", &[]),
        finding("f2", "xss detected via script", &[]),
    ];

    let metrics = evaluate(&findings, &config);
    assert_eq!(metrics.true_positives, 2);
    assert_eq!(metrics.false_positives, 0);
    assert_eq!(metrics.false_negatives, 0);
    assert!((metrics.precision - 1.0).abs() < f64::EPSILON);
    assert!((metrics.recall - 1.0).abs() < f64::EPSILON);
    assert!((metrics.f1_score - 1.0).abs() < f64::EPSILON);
}

#[test]
fn extra_findings_increase_hallucination_rate() {
    let config = EvalConfig::new(vec![gt("g1", &["injection", "overflow"])]).with_threshold(1);

    let findings = vec![
        finding("f1", "injection found", &[]),
        finding("f2", "totally bogus finding", &[]),
    ];

    let metrics = evaluate(&findings, &config);
    assert_eq!(metrics.true_positives, 1);
    assert_eq!(metrics.false_positives, 1);
    assert!((metrics.hallucination_rate - 0.5).abs() < f64::EPSILON);
}

#[test]
fn missed_ground_truths_increase_false_negatives() {
    let config = EvalConfig::new(vec![
        gt("g1", &["injection"]),
        gt("g2", &["xss"]),
        gt("g3", &["csrf"]),
    ])
    .with_threshold(1);

    let findings = vec![finding("f1", "injection found", &[])];

    let metrics = evaluate(&findings, &config);
    assert_eq!(metrics.true_positives, 1);
    assert_eq!(metrics.false_negatives, 2);
    assert_eq!(metrics.missed_ids, vec!["g2", "g3"]);
}

#[test]
fn empty_findings_zero_metrics() {
    let config = EvalConfig::new(vec![gt("g1", &["injection"])]).with_threshold(1);
    let metrics = evaluate(&[], &config);

    assert_eq!(metrics.true_positives, 0);
    assert_eq!(metrics.false_negatives, 1);
    assert!((metrics.precision).abs() < f64::EPSILON);
    assert!((metrics.recall).abs() < f64::EPSILON);
    assert!((metrics.f1_score).abs() < f64::EPSILON);
}

#[test]
fn custom_threshold_is_lenient() {
    let f = finding("f1", "Found injection", &[]);
    let g = gt("g1", &["injection", "overflow", "buffer"]);

    // threshold=1 matches (1 keyword hit)
    assert!(finding_matches(&f, &g, 1));
    // threshold=2 doesn't match
    assert!(!finding_matches(&f, &g, 2));
}

// ── Weighted + Categorized Evaluation Tests ───────────────────────────

#[test]
fn severity_weights_affect_weighted_f1() {
    let config = EvalConfig::new(vec![
        GroundTruth {
            id: "g1".into(),
            description: "Critical issue".into(),
            keywords: vec!["injection".into()],
            severity: Some("critical".into()),
            category: None,
        },
        GroundTruth {
            id: "g2".into(),
            description: "Minor issue".into(),
            keywords: vec!["typo".into()],
            severity: Some("minor".into()),
            category: None,
        },
    ])
    .with_threshold(1)
    .with_severity_weight("critical", 3.0)
    .with_severity_weight("minor", 1.0);

    // Only detect the critical one
    let findings = vec![finding("f1", "injection found", &[])];
    let metrics = evaluate(&findings, &config);

    assert_eq!(metrics.true_positives, 1);
    assert_eq!(metrics.false_negatives, 1);
    // Regular recall = 0.5, but weighted recall = 3/4 = 0.75
    assert!(metrics.weighted_f1.is_some());
    let wf1 = metrics.weighted_f1.unwrap();
    // weighted_recall = 3.0 / (3.0 + 1.0) = 0.75
    // precision = 1.0 (1 tp, 0 fp)
    // weighted_f1 = 2 * 1.0 * 0.75 / (1.0 + 0.75) = 6/7 ≈ 0.857
    assert!((wf1 - 6.0 / 7.0).abs() < 0.001);
}

#[test]
fn category_breakdown_groups_ground_truths() {
    let config = EvalConfig::new(vec![
        GroundTruth {
            id: "g1".into(),
            description: "SQL injection".into(),
            keywords: vec!["injection".into()],
            severity: None,
            category: Some("security".into()),
        },
        GroundTruth {
            id: "g2".into(),
            description: "XSS".into(),
            keywords: vec!["xss".into()],
            severity: None,
            category: Some("security".into()),
        },
        GroundTruth {
            id: "g3".into(),
            description: "Typo in docs".into(),
            keywords: vec!["typo".into()],
            severity: None,
            category: Some("quality".into()),
        },
    ])
    .with_threshold(1)
    .with_category_breakdown();

    let findings = vec![
        finding("f1", "injection found", &[]),
        finding("f2", "xss detected", &[]),
    ];

    let metrics = evaluate(&findings, &config);
    assert_eq!(metrics.categories.len(), 2);

    let security = metrics.categories.iter().find(|c| c.category == "security").unwrap();
    assert_eq!(security.true_positives, 2);
    assert_eq!(security.false_negatives, 0);
    assert!((security.recall - 1.0).abs() < f64::EPSILON);

    let quality = metrics.categories.iter().find(|c| c.category == "quality").unwrap();
    assert_eq!(quality.true_positives, 0);
    assert_eq!(quality.false_negatives, 1);
    assert!((quality.recall).abs() < f64::EPSILON);
}

#[test]
fn mean_confidence_computed_for_matched_findings() {
    let config = EvalConfig::new(vec![
        gt("g1", &["injection"]),
    ])
    .with_threshold(1);

    let findings = vec![
        Finding {
            id: "f1".into(),
            description: "injection found".into(),
            evidence: Vec::new(),
            confidence: 0.8,
            finding_type: None,
            category: None,
        },
        Finding {
            id: "f2".into(),
            description: "unrelated bogus".into(),
            evidence: Vec::new(),
            confidence: 0.3,
            finding_type: None,
            category: None,
        },
    ];

    let metrics = evaluate(&findings, &config);
    // Only f1 matches, so mean_confidence = 0.8
    assert!(metrics.mean_confidence.is_some());
    assert!((metrics.mean_confidence.unwrap() - 0.8).abs() < f64::EPSILON);
}

#[test]
fn mean_confidence_none_when_no_matches() {
    let config = EvalConfig::new(vec![gt("g1", &["injection"])]).with_threshold(1);
    let findings = vec![finding("f1", "unrelated", &[])];

    let metrics = evaluate(&findings, &config);
    assert!(metrics.mean_confidence.is_none());
}

#[test]
fn evidence_contributes_to_keyword_match() {
    let f = Finding {
        id: "f1".into(),
        description: "Found a vulnerability".into(),
        evidence: vec!["SQL injection in login.rs".into(), "buffer overflow in parser.c".into()],
        confidence: 0.9,
        finding_type: None,
        category: None,
    };
    let g = gt("g1", &["injection", "overflow"]);
    // Keywords appear in evidence, not description
    assert!(finding_matches(&f, &g, 2));
}

#[test]
fn evidence_alone_sufficient_for_match() {
    let f = Finding {
        id: "f1".into(),
        description: "Generic finding".into(),
        evidence: vec!["xss detected in template rendering".into()],
        confidence: 1.0,
        finding_type: None,
        category: None,
    };
    let g = gt("g1", &["xss"]);
    assert!(finding_matches(&f, &g, 1));
}

#[test]
fn empty_ground_truths_zero_metrics() {
    let config = EvalConfig::new(vec![]).with_threshold(1);
    let findings = vec![finding("f1", "something", &[])];
    let metrics = evaluate(&findings, &config);

    assert_eq!(metrics.true_positives, 0);
    assert_eq!(metrics.false_positives, 1);
    assert_eq!(metrics.false_negatives, 0);
    assert!((metrics.hallucination_rate - 1.0).abs() < f64::EPSILON);
}

#[test]
fn no_ground_truths_no_findings_all_zero() {
    let config = EvalConfig::new(vec![]).with_threshold(1);
    let metrics = evaluate(&[], &config);

    assert_eq!(metrics.true_positives, 0);
    assert_eq!(metrics.false_positives, 0);
    assert_eq!(metrics.false_negatives, 0);
    assert!((metrics.precision).abs() < f64::EPSILON);
}

#[test]
fn category_breakdown_uncategorized_bucket() {
    let config = EvalConfig::new(vec![
        GroundTruth {
            id: "g1".into(),
            description: "No category".into(),
            keywords: vec!["bug".into()],
            severity: None,
            category: None, // should go into "uncategorized"
        },
    ])
    .with_threshold(1)
    .with_category_breakdown();

    let findings = vec![finding("f1", "found a bug", &[])];
    let metrics = evaluate(&findings, &config);

    assert_eq!(metrics.categories.len(), 1);
    assert_eq!(metrics.categories[0].category, "uncategorized");
    assert_eq!(metrics.categories[0].true_positives, 1);
}
