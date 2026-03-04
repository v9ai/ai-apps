use sdd::*;

#[test]
fn test_subagent_registry_define_and_get() {
    let mut registry = SubagentRegistry::new();
    registry.define(define_subagent(
        "test-agent",
        "A test agent",
        "Do test things",
        DeepSeekModel::Chat,
        vec!["Read".into()],
        Some(5),
    ));

    let agent = registry.get("test-agent").unwrap();
    assert_eq!(agent.name, "test-agent");
    assert_eq!(agent.model, DeepSeekModel::Chat);
    assert_eq!(agent.tools, vec!["Read"]);
    assert_eq!(agent.max_turns, Some(5));
}

#[test]
fn test_subagent_registry_get_missing() {
    let registry = SubagentRegistry::new();
    assert!(registry.get("nonexistent").is_none());
}

#[test]
fn test_subagent_registry_list_sorted() {
    let mut registry = SubagentRegistry::new();
    registry.define(define_subagent("charlie", "", "", DeepSeekModel::Chat, vec![], None));
    registry.define(define_subagent("alpha", "", "", DeepSeekModel::Chat, vec![], None));
    registry.define(define_subagent("bravo", "", "", DeepSeekModel::Chat, vec![], None));

    let names = registry.list();
    assert_eq!(names, vec!["alpha", "bravo", "charlie"]);
}

#[test]
fn test_subagent_registry_list_json() {
    let mut registry = SubagentRegistry::new();
    registry.define(define_subagent(
        "researcher",
        "Researches topics",
        "Research prompt",
        DeepSeekModel::Reasoner,
        vec!["Read".into(), "WebSearch".into()],
        Some(15),
    ));

    let json = registry.list_json();
    assert_eq!(json.len(), 1);
    assert_eq!(json[0]["name"], "researcher");
    assert_eq!(json[0]["model"], "deepseek-reasoner");
    assert_eq!(json[0]["max_turns"], 15);
}

#[test]
fn test_preset_subagents() {
    let presets = preset_subagents();
    assert_eq!(presets.len(), 4);

    let names: Vec<&str> = presets.iter().map(|a| a.name.as_str()).collect();
    assert!(names.contains(&"code-reviewer"));
    assert!(names.contains(&"test-runner"));
    assert!(names.contains(&"researcher"));
    assert!(names.contains(&"reasoner"));
}

#[test]
fn test_preset_subagents_models() {
    let presets = preset_subagents();
    for agent in &presets {
        match agent.name.as_str() {
            "reasoner" => assert_eq!(agent.model, DeepSeekModel::Reasoner),
            _ => assert_eq!(agent.model, DeepSeekModel::Chat),
        }
    }
}

#[test]
fn test_sdd_subagents() {
    let sdd = sdd_subagents();
    assert_eq!(sdd.len(), 8);

    let names: Vec<&str> = sdd.iter().map(|a| a.name.as_str()).collect();
    assert!(names.contains(&"sdd-explore"));
    assert!(names.contains(&"sdd-propose"));
    assert!(names.contains(&"sdd-spec"));
    assert!(names.contains(&"sdd-design"));
    assert!(names.contains(&"sdd-tasks"));
    assert!(names.contains(&"sdd-apply"));
    assert!(names.contains(&"sdd-verify"));
    assert!(names.contains(&"sdd-archive"));
}

#[test]
fn test_sdd_subagents_models() {
    let sdd = sdd_subagents();
    for agent in &sdd {
        match agent.name.as_str() {
            "sdd-explore" | "sdd-spec" | "sdd-design" | "sdd-verify" => {
                assert_eq!(agent.model, DeepSeekModel::Reasoner, "{} should use Reasoner", agent.name);
            }
            _ => {
                assert_eq!(agent.model, DeepSeekModel::Chat, "{} should use Chat", agent.name);
            }
        }
    }
}

#[test]
fn test_sdd_subagents_have_tools() {
    let sdd = sdd_subagents();
    for agent in &sdd {
        assert!(!agent.tools.is_empty(), "{} should have tools", agent.name);
        assert!(agent.max_turns.is_some(), "{} should have max_turns", agent.name);
    }
}

#[test]
fn test_define_subagent_disallowed_tools_empty() {
    let agent = define_subagent("test", "desc", "prompt", DeepSeekModel::Chat, vec![], None);
    assert!(agent.disallowed_tools.is_empty());
}

#[test]
fn test_subagent_registry_overwrite() {
    let mut registry = SubagentRegistry::new();
    registry.define(define_subagent("agent", "v1", "p1", DeepSeekModel::Chat, vec![], None));
    registry.define(define_subagent("agent", "v2", "p2", DeepSeekModel::Reasoner, vec![], None));

    let agent = registry.get("agent").unwrap();
    assert_eq!(agent.description, "v2");
    assert_eq!(agent.model, DeepSeekModel::Reasoner);
    assert_eq!(registry.list().len(), 1);
}
