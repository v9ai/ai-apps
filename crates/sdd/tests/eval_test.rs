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
