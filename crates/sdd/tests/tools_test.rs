use serde_json::json;
use sdd::*;

#[test]
fn test_define_builtin_tools_count() {
    let tools = define_builtin_tools();
    assert_eq!(tools.len(), 12);
}

#[test]
fn test_tool_definition_to_schema() {
    let def = ToolDefinition {
        name: "Read".into(),
        description: "Read a file".into(),
        parameters: vec![
            ToolParam {
                name: "file_path".into(),
                description: "Path".into(),
                r#type: "string".into(),
                required: true,
            },
            ToolParam {
                name: "offset".into(),
                description: "Line offset".into(),
                r#type: "integer".into(),
                required: false,
            },
        ],
    };

    let schema = def.to_tool_schema();
    assert_eq!(schema.r#type, "function");
    assert_eq!(schema.function.name, "Read");

    let params = &schema.function.parameters;
    assert!(params["properties"]["file_path"].is_object());
    assert!(params["properties"]["offset"].is_object());

    let required = params["required"].as_array().unwrap();
    assert_eq!(required.len(), 1);
    assert_eq!(required[0], "file_path");
}

#[test]
fn test_tool_registry_register_and_call() {
    let mut registry = ToolRegistry::new();
    registry.register(
        ToolDefinition {
            name: "Echo".into(),
            description: "Echo args".into(),
            parameters: vec![],
        },
        |args| Ok(json!({ "echoed": args })),
    );

    let result = registry.call("Echo", json!({"msg": "hello"}));
    assert!(result.is_ok());
    assert_eq!(result.unwrap()["echoed"]["msg"], "hello");
}

#[test]
fn test_tool_registry_unknown_tool() {
    let registry = ToolRegistry::new();
    let result = registry.call("NonExistent", json!({}));
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Unknown tool"));
}

#[test]
fn test_tool_registry_list_names() {
    let mut registry = ToolRegistry::new();
    registry.register(
        ToolDefinition { name: "Bravo".into(), description: "".into(), parameters: vec![] },
        |_| Ok(json!(null)),
    );
    registry.register(
        ToolDefinition { name: "Alpha".into(), description: "".into(), parameters: vec![] },
        |_| Ok(json!(null)),
    );

    let names = registry.list_names();
    assert_eq!(names, vec!["Alpha", "Bravo"]);
}

#[test]
fn test_tool_registry_filter_schemas() {
    let registry = build_builtin_registry();
    let filtered = registry.filter_schemas(&["Read".into(), "Write".into()]);
    assert_eq!(filtered.len(), 2);

    let names: Vec<&str> = filtered.iter().map(|s| s.function.name.as_str()).collect();
    assert!(names.contains(&"Read"));
    assert!(names.contains(&"Write"));
}

#[test]
fn test_tool_registry_to_schemas() {
    let registry = build_builtin_registry();
    let schemas = registry.to_tool_schemas();
    assert_eq!(schemas.len(), 12);
}

#[test]
fn test_tool_presets() {
    assert_eq!(TOOLS_READONLY.len(), 3);
    assert!(TOOLS_READONLY.contains(&"Read"));

    assert_eq!(TOOLS_FILE_OPS.len(), 5);
    assert!(TOOLS_FILE_OPS.contains(&"Write"));

    assert_eq!(TOOLS_CODING.len(), 6);
    assert!(TOOLS_CODING.contains(&"Bash"));

    assert_eq!(TOOLS_WEB.len(), 2);
    assert!(TOOLS_WEB.contains(&"WebSearch"));

    assert_eq!(TOOLS_SDD.len(), 8);
    assert!(TOOLS_SDD.contains(&"SddPhase"));

    assert_eq!(TOOLS_ALL.len(), 12);
}

#[test]
fn test_builtin_registry_dispatches() {
    let registry = build_builtin_registry();
    let result = registry.call("Read", json!({"file_path": "test.rs"}));
    assert!(result.is_ok());
    let val = result.unwrap();
    assert_eq!(val["tool"], "Read");
    assert_eq!(val["status"], "dispatched");
}
