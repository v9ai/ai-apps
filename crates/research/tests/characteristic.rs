use std::time::Instant;
use research::team::{
    Mailbox, MessageKind, ResearchTask, SharedTaskList, TaskStatus, TeamMessage,
};

// ── Helper: create characteristic research task set ─────────────────

fn concern_tasks() -> Vec<ResearchTask> {
    let research = vec![
        ("evidence-based-interventions", 1),
        ("assessment-monitoring", 2),
        ("family-strategies", 3),
        ("developmental-trajectory", 4),
    ];
    let mut tasks: Vec<ResearchTask> = research
        .into_iter()
        .map(|(subject, id)| ResearchTask {
            id,
            subject: subject.into(),
            description: format!("Research {subject}"),
            preamble: "You are a researcher.".into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        })
        .collect();

    tasks.push(ResearchTask {
        id: 5,
        subject: "actionable-synthesis".into(),
        description: "Synthesize all findings".into(),
        preamble: "You are a synthesizer.".into(),
        status: TaskStatus::Pending,
        owner: None,
        dependencies: vec![1, 2, 3, 4],
        result: None,
    });
    tasks
}

fn strength_tasks() -> Vec<ResearchTask> {
    let research = vec![
        ("strength-leveraging", 1),
        ("protective-factors", 2),
        ("strength-development", 3),
        ("cross-domain-transfer", 4),
    ];
    let mut tasks: Vec<ResearchTask> = research
        .into_iter()
        .map(|(subject, id)| ResearchTask {
            id,
            subject: subject.into(),
            description: format!("Research {subject}"),
            preamble: "You are a researcher.".into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        })
        .collect();

    tasks.push(ResearchTask {
        id: 5,
        subject: "actionable-synthesis".into(),
        description: "Synthesize all findings".into(),
        preamble: "You are a synthesizer.".into(),
        status: TaskStatus::Pending,
        owner: None,
        dependencies: vec![1, 2, 3, 4],
        result: None,
    });
    tasks
}

// ── Task claiming: parallel research, blocked synthesis ─────────────

#[test]
fn research_tasks_claimable_in_parallel() {
    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    // All 4 research tasks should be claimable immediately
    let t1 = list.claim("w1").expect("task 1 claimable");
    let t2 = list.claim("w2").expect("task 2 claimable");
    let t3 = list.claim("w3").expect("task 3 claimable");
    let t4 = list.claim("w4").expect("task 4 claimable");

    assert_eq!(t1.id, 1);
    assert_eq!(t2.id, 2);
    assert_eq!(t3.id, 3);
    assert_eq!(t4.id, 4);

    // Synthesis should NOT be claimable yet
    assert!(list.claim("w5").is_none(), "synthesis blocked by deps");
}

#[test]
fn synthesis_unblocked_after_all_research_complete() {
    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    // Claim and complete all 4 research tasks
    for i in 0..4 {
        let t = list.claim(&format!("w{i}")).unwrap();
        list.complete(t.id, format!("Result for task {}", t.id));
    }

    // Now synthesis should be claimable
    let synthesis = list.claim("w-synth").expect("synthesis unblocked");
    assert_eq!(synthesis.id, 5);
    assert_eq!(synthesis.subject, "actionable-synthesis");
    assert_eq!(synthesis.dependencies, vec![1, 2, 3, 4]);
}

#[test]
fn synthesis_unblocked_even_with_failed_tasks() {
    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    // Complete 2, fail 2
    list.claim("w1"); // task 1
    list.claim("w2"); // task 2
    list.claim("w3"); // task 3
    list.claim("w4"); // task 4

    list.complete(1, "Good result".into());
    list.complete(2, "Good result".into());
    list.fail(3, "API timeout".into());
    list.fail(4, "Rate limited".into());

    // Synthesis should still be claimable (failed counts as resolved)
    let synthesis = list
        .claim("w-synth")
        .expect("synthesis unblocked by failed deps");
    assert_eq!(synthesis.id, 5);
}

#[test]
fn all_done_when_all_tasks_terminal() {
    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    assert!(!list.all_done());

    for _ in 0..4 {
        let t = list.claim("w").unwrap();
        list.complete(t.id, "done".into());
    }
    assert!(!list.all_done(), "synthesis still pending");

    let synth = list.claim("w").unwrap();
    list.complete(synth.id, "synthesis done".into());
    assert!(list.all_done());
}

#[test]
fn all_done_with_mixed_complete_and_failed() {
    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    list.claim("w");
    list.complete(1, "ok".into());
    list.claim("w");
    list.fail(2, "err".into());
    list.claim("w");
    list.complete(3, "ok".into());
    list.claim("w");
    list.fail(4, "err".into());
    list.claim("w");
    list.complete(5, "synthesis".into());

    assert!(list.all_done());
}

// ── Completed findings ──────────────────────────────────────────────

#[test]
fn completed_findings_returns_only_completed() {
    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    list.claim("w");
    list.complete(1, "Result 1".into());
    list.claim("w");
    list.fail(2, "Failed".into());
    list.claim("w");
    list.complete(3, "Result 3".into());

    let findings = list.completed_findings();
    assert_eq!(findings.len(), 2);
    assert!(findings
        .iter()
        .any(|(s, _)| s == "evidence-based-interventions"));
    assert!(findings.iter().any(|(s, _)| s == "family-strategies"));
}

#[test]
fn completed_findings_for_filters_by_deps() {
    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    for _ in 0..4 {
        let t = list.claim("w").unwrap();
        list.complete(t.id, format!("Result for {}", t.subject));
    }

    // Only get findings for deps [1, 3]
    let filtered = list.completed_findings_for(&[1, 3]);
    assert_eq!(filtered.len(), 2);
    assert!(filtered
        .iter()
        .any(|(s, _)| s == "evidence-based-interventions"));
    assert!(filtered.iter().any(|(s, _)| s == "family-strategies"));
    assert!(!filtered
        .iter()
        .any(|(s, _)| s == "assessment-monitoring"));
}

#[test]
fn completed_tasks_includes_ids() {
    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    list.claim("w");
    list.complete(1, "R1".into());
    list.claim("w");
    list.complete(2, "R2".into());

    let completed = list.completed_tasks();
    assert_eq!(completed.len(), 2);
    assert!(completed.iter().any(|(id, _, _)| *id == 1));
    assert!(completed.iter().any(|(id, _, _)| *id == 2));
}

// ── Strength tasks follow same patterns ─────────────────────────────

#[test]
fn strength_tasks_have_correct_structure() {
    let tasks = strength_tasks();
    assert_eq!(tasks.len(), 5);

    // First 4 are research tasks with no deps
    for t in &tasks[..4] {
        assert!(t.dependencies.is_empty());
    }

    // Last is synthesis depending on all 4
    assert_eq!(tasks[4].subject, "actionable-synthesis");
    assert_eq!(tasks[4].dependencies, vec![1, 2, 3, 4]);
}

#[test]
fn strength_task_subjects_correct() {
    let tasks = strength_tasks();
    let subjects: Vec<&str> = tasks.iter().map(|t| t.subject.as_str()).collect();
    assert_eq!(
        subjects,
        vec![
            "strength-leveraging",
            "protective-factors",
            "strength-development",
            "cross-domain-transfer",
            "actionable-synthesis",
        ]
    );
}

// ── Resume from disk with characteristic file names ─────────────────

#[test]
fn resume_characteristic_output_files() {
    let dir = tempfile::tempdir().unwrap();
    let dir_path = dir.path().to_str().unwrap();

    // Simulate previously saved characteristic research files
    std::fs::write(
        format!("{dir_path}/agent-01-evidence-based-interventions.md"),
        "# Evidence-Based Interventions\n\nCBT is well-supported (Smith et al., 2023).",
    )
    .unwrap();
    std::fs::write(
        format!("{dir_path}/agent-03-family-strategies.md"),
        "# Family Strategies\n\nPCIT shows strong evidence (Johnson, 2022).",
    )
    .unwrap();

    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);
    let resumed = list.resume_from_dir(dir_path);

    assert_eq!(resumed, 2, "should resume tasks 1 and 3");

    let completed = list.completed_tasks();
    assert_eq!(completed.len(), 2);
    assert!(completed
        .iter()
        .any(|(id, subj, _)| *id == 1 && subj == "evidence-based-interventions"));
    assert!(completed
        .iter()
        .any(|(id, subj, _)| *id == 3 && subj == "family-strategies"));

    // Tasks 2 and 4 should still be claimable
    let next = list.claim("worker");
    assert!(next.is_some());
    assert_eq!(next.unwrap().id, 2);
}

#[test]
fn resume_strength_output_files() {
    let dir = tempfile::tempdir().unwrap();
    let dir_path = dir.path().to_str().unwrap();

    std::fs::write(
        format!("{dir_path}/agent-01-strength-leveraging.md"),
        "# Strength Leveraging\nPositive psychology research...",
    )
    .unwrap();
    std::fs::write(
        format!("{dir_path}/agent-04-cross-domain-transfer.md"),
        "# Cross-Domain Transfer\nTransfer of learning research...",
    )
    .unwrap();

    let tasks = strength_tasks();
    let list = SharedTaskList::new(tasks);
    let resumed = list.resume_from_dir(dir_path);

    assert_eq!(resumed, 2);
}

#[test]
fn resume_with_synthesis_already_done() {
    let dir = tempfile::tempdir().unwrap();
    let dir_path = dir.path().to_str().unwrap();

    // All 5 files saved
    for (i, subject) in [
        "evidence-based-interventions",
        "assessment-monitoring",
        "family-strategies",
        "developmental-trajectory",
        "actionable-synthesis",
    ]
    .iter()
    .enumerate()
    {
        std::fs::write(
            format!("{dir_path}/agent-{:02}-{subject}.md", i + 1),
            format!("# {subject}\nContent here."),
        )
        .unwrap();
    }

    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);
    let resumed = list.resume_from_dir(dir_path);

    assert_eq!(resumed, 5, "all tasks should resume");
    assert!(list.all_done(), "all tasks should be marked done");
}

#[test]
fn resume_skips_empty_files() {
    let dir = tempfile::tempdir().unwrap();
    let dir_path = dir.path().to_str().unwrap();

    // Write a non-empty file and an empty file
    std::fs::write(
        format!("{dir_path}/agent-01-evidence-based-interventions.md"),
        "# Evidence-Based Interventions\nContent here.",
    )
    .unwrap();
    std::fs::write(
        format!("{dir_path}/agent-02-assessment-monitoring.md"),
        "", // empty file should be skipped
    )
    .unwrap();

    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);
    let resumed = list.resume_from_dir(dir_path);

    assert_eq!(resumed, 1, "empty file should not count as resumed");

    let completed = list.completed_tasks();
    assert_eq!(completed.len(), 1);
    assert!(completed
        .iter()
        .any(|(id, _, _)| *id == 1));
}

#[test]
fn resume_does_not_affect_already_claimed_tasks() {
    let dir = tempfile::tempdir().unwrap();
    let dir_path = dir.path().to_str().unwrap();

    std::fs::write(
        format!("{dir_path}/agent-01-evidence-based-interventions.md"),
        "# Resumed content",
    )
    .unwrap();

    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    // Claim task 1 before resuming -- it is now InProgress, not Pending
    let _claimed = list.claim("worker-01");

    let resumed = list.resume_from_dir(dir_path);
    // Task 1 was InProgress, so resume_from_dir should skip it (only resumes Pending)
    assert_eq!(resumed, 0);
}

// ── Reset failed tasks ──────────────────────────────────────────────

#[test]
fn reset_failed_characteristic_tasks() {
    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    // Complete 2, fail 2
    list.claim("w");
    list.complete(1, "ok".into());
    list.claim("w");
    list.complete(2, "ok".into());
    list.claim("w");
    list.fail(3, "timeout".into());
    list.claim("w");
    list.fail(4, "rate limit".into());

    let reset_count = list.reset_failed();
    assert_eq!(reset_count, 2);

    // Failed tasks should be claimable again
    let t = list.claim("retry").unwrap();
    assert!(t.id == 3 || t.id == 4);
}

#[test]
fn reset_failed_clears_owner_and_result() {
    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    list.claim("w1");
    list.fail(1, "some error".into());

    let reset_count = list.reset_failed();
    assert_eq!(reset_count, 1);

    // Claim the reset task and verify it has no stale owner/result
    let t = list.claim("w2").unwrap();
    assert_eq!(t.id, 1);
    assert_eq!(t.owner.as_deref(), Some("w2"));
    assert!(t.result.is_none());
}

#[test]
fn reset_failed_does_not_touch_completed() {
    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    list.claim("w");
    list.complete(1, "good result".into());
    list.claim("w");
    list.fail(2, "error".into());

    let reset_count = list.reset_failed();
    assert_eq!(reset_count, 1);

    // Task 1 should still be completed
    let completed = list.completed_tasks();
    assert_eq!(completed.len(), 1);
    assert_eq!(completed[0].0, 1);
}

// ── Mailbox communication ───────────────────────────────────────────

#[test]
fn mailbox_broadcasts_findings() {
    let mailbox = Mailbox::new(16);
    let mut rx = mailbox.subscribe();

    mailbox.send(TeamMessage {
        from: "worker-01".into(),
        kind: MessageKind::Finding {
            task_id: 1,
            summary: "Found CBT evidence".into(),
        },
        timestamp: Instant::now(),
    });

    let msg = rx.try_recv().unwrap();
    assert_eq!(msg.from, "worker-01");
    match msg.kind {
        MessageKind::Finding { task_id, summary } => {
            assert_eq!(task_id, 1);
            assert_eq!(summary, "Found CBT evidence");
        }
        _ => panic!("expected Finding"),
    }
}

#[test]
fn mailbox_broadcasts_errors() {
    let mailbox = Mailbox::new(16);
    let mut rx = mailbox.subscribe();

    mailbox.send(TeamMessage {
        from: "worker-03".into(),
        kind: MessageKind::Error("API rate limited".into()),
        timestamp: Instant::now(),
    });

    let msg = rx.try_recv().unwrap();
    match msg.kind {
        MessageKind::Error(e) => assert_eq!(e, "API rate limited"),
        _ => panic!("expected Error"),
    }
}

#[test]
fn mailbox_broadcasts_status_updates() {
    let mailbox = Mailbox::new(16);
    let mut rx = mailbox.subscribe();

    mailbox.send(TeamMessage {
        from: "worker-02".into(),
        kind: MessageKind::StatusUpdate(
            "Starting task 2: assessment-monitoring".into(),
        ),
        timestamp: Instant::now(),
    });

    let msg = rx.try_recv().unwrap();
    match msg.kind {
        MessageKind::StatusUpdate(s) => {
            assert!(s.contains("Starting task 2"));
            assert!(s.contains("assessment-monitoring"));
        }
        _ => panic!("expected StatusUpdate"),
    }
}

#[test]
fn mailbox_multiple_subscribers_all_receive() {
    let mailbox = Mailbox::new(16);
    let mut rx1 = mailbox.subscribe();
    let mut rx2 = mailbox.subscribe();

    mailbox.send(TeamMessage {
        from: "lead".into(),
        kind: MessageKind::StatusUpdate("broadcast".into()),
        timestamp: Instant::now(),
    });

    assert!(rx1.try_recv().is_ok());
    assert!(rx2.try_recv().is_ok());
}

#[test]
fn mailbox_send_without_receivers_does_not_panic() {
    let mailbox = Mailbox::new(16);
    // No subscribers -- send should not panic
    mailbox.send(TeamMessage {
        from: "orphan".into(),
        kind: MessageKind::StatusUpdate("nobody listening".into()),
        timestamp: Instant::now(),
    });
}

// ── CharacteristicInput JSON deserialization ─────────────────────────

#[test]
fn characteristic_input_full_json() {
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    #[allow(dead_code)]
    struct CharacteristicInput {
        id: Option<i64>,
        title: String,
        description: Option<String>,
        category: String,
        severity: Option<String>,
        age_years: Option<i64>,
        tags: Option<Vec<String>>,
        impairment_domains: Option<Vec<String>>,
        externalized_name: Option<String>,
        strengths: Option<String>,
        family_member_name: Option<String>,
    }

    let json = r#"{
        "id": 42,
        "title": "Emotional Dysregulation",
        "description": "Difficulty managing intense emotions",
        "category": "PRIORITY_CONCERN",
        "severity": "moderate",
        "ageYears": 8,
        "tags": ["emotional", "behavioral"],
        "impairmentDomains": ["SOCIAL", "ACADEMIC"],
        "externalizedName": "The Emotion Monster",
        "strengths": "Creative, empathetic",
        "familyMemberName": "Alex"
    }"#;

    let input: CharacteristicInput = serde_json::from_str(json).unwrap();
    assert_eq!(input.id, Some(42));
    assert_eq!(input.title, "Emotional Dysregulation");
    assert_eq!(input.category, "PRIORITY_CONCERN");
    assert_eq!(input.severity.as_deref(), Some("moderate"));
    assert_eq!(input.age_years, Some(8));
    assert_eq!(input.tags.as_ref().unwrap().len(), 2);
    assert_eq!(input.impairment_domains.as_ref().unwrap().len(), 2);
    assert_eq!(
        input.externalized_name.as_deref(),
        Some("The Emotion Monster")
    );
    assert_eq!(input.family_member_name.as_deref(), Some("Alex"));
}

#[test]
fn characteristic_input_minimal_json() {
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    #[allow(dead_code)]
    struct CharacteristicInput {
        id: Option<i64>,
        title: String,
        description: Option<String>,
        category: String,
        severity: Option<String>,
        age_years: Option<i64>,
        tags: Option<Vec<String>>,
        impairment_domains: Option<Vec<String>>,
        externalized_name: Option<String>,
        strengths: Option<String>,
        family_member_name: Option<String>,
    }

    let json = r#"{"title": "Creativity", "category": "STRENGTH"}"#;

    let input: CharacteristicInput = serde_json::from_str(json).unwrap();
    assert_eq!(input.title, "Creativity");
    assert_eq!(input.category, "STRENGTH");
    assert!(input.id.is_none());
    assert!(input.description.is_none());
    assert!(input.severity.is_none());
    assert!(input.age_years.is_none());
    assert!(input.tags.is_none());
}

#[test]
fn characteristic_input_strength_with_tags() {
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    #[allow(dead_code)]
    struct CharacteristicInput {
        id: Option<i64>,
        title: String,
        description: Option<String>,
        category: String,
        severity: Option<String>,
        age_years: Option<i64>,
        tags: Option<Vec<String>>,
        impairment_domains: Option<Vec<String>>,
        externalized_name: Option<String>,
        strengths: Option<String>,
        family_member_name: Option<String>,
    }

    let json = r#"{
        "title": "Musical Talent",
        "category": "STRENGTH",
        "ageYears": 10,
        "tags": ["creative", "musical"],
        "strengths": "Perfect pitch, rhythmic memory"
    }"#;

    let input: CharacteristicInput = serde_json::from_str(json).unwrap();
    assert_eq!(input.title, "Musical Talent");
    assert_eq!(input.category, "STRENGTH");
    assert_eq!(input.age_years, Some(10));
    assert_eq!(
        input.tags.as_ref().unwrap(),
        &vec!["creative".to_string(), "musical".to_string()]
    );
    assert_eq!(
        input.strengths.as_deref(),
        Some("Perfect pitch, rhythmic memory")
    );
}

// ── CharacteristicOutput JSON serialization ─────────────────────────

#[test]
fn characteristic_output_serializes_camel_case() {
    #[derive(serde::Serialize)]
    #[serde(rename_all = "camelCase")]
    struct CharacteristicOutput {
        characteristic_id: Option<i64>,
        findings: Vec<Finding>,
        synthesis: String,
    }

    #[derive(serde::Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Finding {
        task_id: usize,
        subject: String,
        content: String,
    }

    let output = CharacteristicOutput {
        characteristic_id: Some(42),
        findings: vec![Finding {
            task_id: 1,
            subject: "evidence-based-interventions".into(),
            content: "CBT evidence found.".into(),
        }],
        synthesis: "Overall synthesis.".into(),
    };

    let json = serde_json::to_string(&output).unwrap();
    assert!(json.contains("characteristicId"));
    assert!(json.contains("taskId"));
    assert!(!json.contains("characteristic_id"));
    assert!(!json.contains("task_id"));
}

#[test]
fn characteristic_output_roundtrip() {
    #[derive(serde::Serialize, serde::Deserialize, Debug, PartialEq)]
    #[serde(rename_all = "camelCase")]
    struct CharacteristicOutput {
        characteristic_id: Option<i64>,
        findings: Vec<Finding>,
        synthesis: String,
    }

    #[derive(serde::Serialize, serde::Deserialize, Debug, PartialEq)]
    #[serde(rename_all = "camelCase")]
    struct Finding {
        task_id: usize,
        subject: String,
        content: String,
    }

    let output = CharacteristicOutput {
        characteristic_id: Some(99),
        findings: vec![
            Finding {
                task_id: 1,
                subject: "evidence-based-interventions".into(),
                content: "Finding 1".into(),
            },
            Finding {
                task_id: 2,
                subject: "assessment-monitoring".into(),
                content: "Finding 2".into(),
            },
        ],
        synthesis: "Combined synthesis.".into(),
    };

    let json = serde_json::to_string_pretty(&output).unwrap();
    let deserialized: CharacteristicOutput = serde_json::from_str(&json).unwrap();
    assert_eq!(output, deserialized);
}

// ── Safe title generation ───────────────────────────────────────────

#[test]
fn safe_title_filters_special_chars() {
    let title = "Emotional Dysregulation (Severe) / Type-1";
    let safe = title
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_' || *c == ' ')
        .collect::<String>()
        .replace(' ', "-")
        .to_lowercase();
    assert_eq!(safe, "emotional-dysregulation-severe--type-1");
    assert!(!safe.contains('/'));
    assert!(!safe.contains('('));
    assert!(!safe.contains(')'));
}

#[test]
fn safe_title_handles_unicode() {
    let title = "Anxiete Sociale";
    let safe = title
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_' || *c == ' ')
        .collect::<String>()
        .replace(' ', "-")
        .to_lowercase();
    assert_eq!(safe, "anxiete-sociale");
}

#[test]
fn safe_title_preserves_hyphens_and_underscores() {
    let title = "self-regulation_skills";
    let safe = title
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_' || *c == ' ')
        .collect::<String>()
        .replace(' ', "-")
        .to_lowercase();
    assert_eq!(safe, "self-regulation_skills");
}

#[test]
fn safe_title_empty_after_filtering() {
    let title = "!@#$%^&*()";
    let safe = title
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_' || *c == ' ')
        .collect::<String>()
        .replace(' ', "-")
        .to_lowercase();
    assert_eq!(safe, "");
}

// ── Age qualifier logic ─────────────────────────────────────────────

#[test]
fn age_qualifier_boundaries() {
    fn age_qualifier(age: Option<i64>) -> String {
        age.map(|a| {
            match a {
                0..=5 => "in early childhood (ages 2-5)",
                6..=11 => "in middle childhood (ages 6-11)",
                12..=14 => "in early adolescence (ages 12-14)",
                15..=18 => "in late adolescence (ages 15-18)",
                _ => "in adults",
            }
            .to_string()
        })
        .unwrap_or_default()
    }

    assert_eq!(age_qualifier(None), "");
    assert_eq!(age_qualifier(Some(0)), "in early childhood (ages 2-5)");
    assert_eq!(age_qualifier(Some(3)), "in early childhood (ages 2-5)");
    assert_eq!(age_qualifier(Some(5)), "in early childhood (ages 2-5)");
    assert_eq!(age_qualifier(Some(6)), "in middle childhood (ages 6-11)");
    assert_eq!(age_qualifier(Some(11)), "in middle childhood (ages 6-11)");
    assert_eq!(
        age_qualifier(Some(12)),
        "in early adolescence (ages 12-14)"
    );
    assert_eq!(
        age_qualifier(Some(14)),
        "in early adolescence (ages 12-14)"
    );
    assert_eq!(
        age_qualifier(Some(15)),
        "in late adolescence (ages 15-18)"
    );
    assert_eq!(
        age_qualifier(Some(18)),
        "in late adolescence (ages 15-18)"
    );
    assert_eq!(age_qualifier(Some(19)), "in adults");
    assert_eq!(age_qualifier(Some(35)), "in adults");
}

// ── Build context logic ─────────────────────────────────────────────

#[test]
fn build_context_all_fields() {
    // Replicate the build_context logic from the binary
    let title = "Emotional Dysregulation";
    let description = Some("Difficulty managing emotions");
    let category = "PRIORITY_CONCERN";
    let severity = Some("moderate");
    let age_years: Option<i64> = Some(8);
    let tags: Option<Vec<String>> =
        Some(vec!["emotional".into(), "behavioral".into()]);
    let impairment_domains: Option<Vec<String>> =
        Some(vec!["SOCIAL".into(), "ACADEMIC".into()]);
    let externalized_name: Option<&str> = Some("The Emotion Monster");
    let strengths: Option<&str> = Some("Creative, empathetic");
    let family_member_name: Option<&str> = Some("Alex");

    let mut ctx = format!("Characteristic: {title}");
    if let Some(desc) = description {
        ctx.push_str(&format!("\nDescription: {desc}"));
    }
    ctx.push_str(&format!("\nCategory: {category}"));
    if let Some(sev) = severity {
        ctx.push_str(&format!("\nSeverity: {sev}"));
    }
    if let Some(age) = age_years {
        let tier = match age {
            0..=5 => "Early Childhood (2-5)",
            6..=11 => "Middle Childhood (6-11)",
            12..=14 => "Early Adolescence (12-14)",
            15..=18 => "Late Adolescence (15-18)",
            _ => "Adult",
        };
        ctx.push_str(&format!("\nAge: {age} years ({tier})"));
    }
    if let Some(t) = &tags {
        if !t.is_empty() {
            ctx.push_str(&format!("\nTags: {}", t.join(", ")));
        }
    }
    if let Some(d) = &impairment_domains {
        if !d.is_empty() {
            ctx.push_str(&format!(
                "\nImpairment domains: {}",
                d.join(", ")
            ));
        }
    }
    if let Some(name) = externalized_name {
        ctx.push_str(&format!("\nExternalized name: {name}"));
    }
    if let Some(s) = strengths {
        ctx.push_str(&format!("\nStrengths: {s}"));
    }
    if let Some(name) = family_member_name {
        ctx.push_str(&format!("\nFamily member: {name}"));
    }

    assert!(ctx.contains("Characteristic: Emotional Dysregulation"));
    assert!(ctx.contains("Description: Difficulty managing emotions"));
    assert!(ctx.contains("Category: PRIORITY_CONCERN"));
    assert!(ctx.contains("Severity: moderate"));
    assert!(ctx.contains("Age: 8 years (Middle Childhood (6-11))"));
    assert!(ctx.contains("Tags: emotional, behavioral"));
    assert!(ctx.contains("Impairment domains: SOCIAL, ACADEMIC"));
    assert!(ctx.contains("Externalized name: The Emotion Monster"));
    assert!(ctx.contains("Strengths: Creative, empathetic"));
    assert!(ctx.contains("Family member: Alex"));
}

#[test]
fn build_context_minimal_fields() {
    let title = "Creativity";
    let category = "STRENGTH";

    let mut ctx = format!("Characteristic: {title}");
    ctx.push_str(&format!("\nCategory: {category}"));

    assert_eq!(ctx, "Characteristic: Creativity\nCategory: STRENGTH");
    assert!(!ctx.contains("Description"));
    assert!(!ctx.contains("Severity"));
    assert!(!ctx.contains("Age"));
}

#[test]
fn build_context_empty_tags_excluded() {
    let tags: Option<Vec<String>> = Some(vec![]);
    let mut ctx = String::from("Characteristic: Test");
    if let Some(t) = &tags {
        if !t.is_empty() {
            ctx.push_str(&format!("\nTags: {}", t.join(", ")));
        }
    }
    assert!(!ctx.contains("Tags"));
}

// ── Output directory structure ──────────────────────────────────────

#[test]
fn output_directory_file_naming_convention() {
    let dir = tempfile::tempdir().unwrap();
    let dir_path = dir.path().to_str().unwrap();

    // Simulate writing output files as the binary does
    let findings = vec![
        (1_usize, "evidence-based-interventions", "Content 1"),
        (2, "assessment-monitoring", "Content 2"),
        (3, "family-strategies", "Content 3"),
        (4, "developmental-trajectory", "Content 4"),
        (5, "actionable-synthesis", "Content 5"),
    ];

    for (id, subject, content) in &findings {
        let path = format!("{dir_path}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content).unwrap();
    }

    // Verify all files exist with correct names
    for (id, subject, _) in &findings {
        let path = format!("{dir_path}/agent-{id:02}-{subject}.md");
        assert!(
            std::path::Path::new(&path).exists(),
            "expected {path} to exist"
        );
    }

    // Verify synthesis.md and output.json would be siblings
    std::fs::write(format!("{dir_path}/synthesis.md"), "Synthesis content").unwrap();
    std::fs::write(format!("{dir_path}/output.json"), "{}").unwrap();
    assert!(std::path::Path::new(&format!("{dir_path}/synthesis.md")).exists());
    assert!(std::path::Path::new(&format!("{dir_path}/output.json")).exists());
}

#[test]
fn output_file_content_matches_task_results() {
    let dir = tempfile::tempdir().unwrap();
    let dir_path = dir.path().to_str().unwrap();

    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    // Complete all tasks
    for _ in 0..4 {
        let t = list.claim("w").unwrap();
        list.complete(t.id, format!("# {}\n\nResearch content for {}.", t.subject, t.subject));
    }
    let synth = list.claim("w").unwrap();
    list.complete(synth.id, "# Synthesis\n\nCombined findings.".into());

    // Write to disk as the binary does
    let findings = list.completed_tasks();
    for (id, subject, content) in &findings {
        let path = format!("{dir_path}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content).unwrap();
    }

    // Now create a fresh task list and resume
    let tasks2 = concern_tasks();
    let list2 = SharedTaskList::new(tasks2);
    let resumed = list2.resume_from_dir(dir_path);
    assert_eq!(resumed, 5);

    // Verify content matches
    let resumed_findings = list2.completed_tasks();
    for (id, subject, content) in &resumed_findings {
        let original = findings.iter().find(|(oid, _, _)| oid == id);
        assert!(original.is_some(), "task {id} not found in original");
        let (_, orig_subj, orig_content) = original.unwrap();
        assert_eq!(subject, orig_subj);
        assert_eq!(content, orig_content);
    }
}

// ── Edge cases ──────────────────────────────────────────────────────

#[test]
fn empty_task_list_is_immediately_done() {
    let list = SharedTaskList::new(vec![]);
    assert!(list.all_done());
    assert!(list.claim("w").is_none());
    assert!(list.completed_findings().is_empty());
    assert!(list.completed_tasks().is_empty());
}

#[test]
fn claiming_same_task_twice_not_possible() {
    let tasks = vec![ResearchTask {
        id: 1,
        subject: "only-task".into(),
        description: "The only task".into(),
        preamble: "preamble".into(),
        status: TaskStatus::Pending,
        owner: None,
        dependencies: vec![],
        result: None,
    }];
    let list = SharedTaskList::new(tasks);

    let first = list.claim("w1");
    assert!(first.is_some());

    let second = list.claim("w2");
    assert!(second.is_none(), "same task should not be claimed twice");
}

#[test]
fn completed_findings_for_empty_deps_returns_empty() {
    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    list.claim("w");
    list.complete(1, "Result".into());

    let findings = list.completed_findings_for(&[]);
    assert!(findings.is_empty());
}

#[test]
fn completed_findings_for_nonexistent_deps_returns_empty() {
    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    list.claim("w");
    list.complete(1, "Result".into());

    let findings = list.completed_findings_for(&[99, 100]);
    assert!(findings.is_empty());
}

#[test]
fn fail_stores_prefixed_error_message() {
    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    list.claim("w");
    list.fail(1, "connection timeout".into());

    // The fail method prefixes with "FAILED: "
    let all_findings = list.completed_findings();
    assert!(all_findings.is_empty(), "failed tasks not in completed_findings");

    // But completed_tasks also won't include failed tasks
    let completed = list.completed_tasks();
    assert!(completed.is_empty());
}

#[test]
fn reset_failed_on_list_with_no_failures_returns_zero() {
    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    list.claim("w");
    list.complete(1, "ok".into());

    let reset_count = list.reset_failed();
    assert_eq!(reset_count, 0);
}

#[test]
fn concurrent_claims_assign_distinct_tasks() {
    // Simulates what happens when multiple workers claim tasks concurrently.
    // Since SharedTaskList uses a Mutex internally, sequential calls
    // model the serialized behavior.
    let tasks = concern_tasks();
    let list = SharedTaskList::new(tasks);

    let mut claimed_ids = vec![];
    for i in 0..4 {
        if let Some(t) = list.claim(&format!("worker-{i}")) {
            claimed_ids.push(t.id);
        }
    }

    // All 4 research tasks should be claimed with distinct IDs
    assert_eq!(claimed_ids.len(), 4);
    claimed_ids.sort();
    assert_eq!(claimed_ids, vec![1, 2, 3, 4]);
}
