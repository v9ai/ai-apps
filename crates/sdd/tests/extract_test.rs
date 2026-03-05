use sdd::extract::{extract_json, extract_validated};

#[test]
fn pure_json_object() {
    let text = r#"{"key": "value", "num": 42}"#;
    let v = extract_json(text).unwrap();
    assert_eq!(v["key"], "value");
    assert_eq!(v["num"], 42);
}

#[test]
fn pure_json_array() {
    let text = r#"[1, 2, 3]"#;
    let v = extract_json(text).unwrap();
    assert!(v.is_array());
    assert_eq!(v.as_array().unwrap().len(), 3);
}

#[test]
fn fenced_json() {
    let text = r#"Here is the result:
```json
{"findings": ["a", "b"], "score": 0.95}
```
That's it."#;
    let v = extract_json(text).unwrap();
    assert_eq!(v["score"], 0.95);
    assert_eq!(v["findings"].as_array().unwrap().len(), 2);
}

#[test]
fn json_object_in_prose() {
    let text = r#"The analysis shows: {"result": true, "details": "ok"} and that's the end."#;
    let v = extract_json(text).unwrap();
    assert_eq!(v["result"], true);
}

#[test]
fn json_array_in_prose() {
    let text = r#"Found items: [1, 2, 3] in the document."#;
    let v = extract_json(text).unwrap();
    assert!(v.is_array());
    assert_eq!(v.as_array().unwrap().len(), 3);
}

#[test]
fn malformed_returns_none() {
    let text = "This is just plain text with no JSON at all.";
    assert!(extract_json(text).is_none());
}

#[test]
fn validated_with_required_keys() {
    let text = r#"{"name": "test", "score": 0.8, "extra": true}"#;
    let v = extract_validated(text, &["name", "score"]).unwrap();
    assert_eq!(v["name"], "test");
}

#[test]
fn validated_missing_key_returns_none() {
    let text = r#"{"name": "test"}"#;
    assert!(extract_validated(text, &["name", "score"]).is_none());
}

#[test]
fn validated_on_array_returns_none() {
    let text = r#"[1, 2, 3]"#;
    // Arrays don't have top-level keys
    assert!(extract_validated(text, &["key"]).is_none());
}

#[test]
fn whitespace_around_json() {
    let text = "   \n  {\"a\": 1}  \n  ";
    let v = extract_json(text).unwrap();
    assert_eq!(v["a"], 1);
}

#[test]
fn nested_braces_handled() {
    let text = r#"Result: {"outer": {"inner": [1,2]}, "ok": true} done."#;
    let v = extract_json(text).unwrap();
    assert_eq!(v["ok"], true);
    assert!(v["outer"]["inner"].is_array());
}

#[test]
fn escaped_quotes_in_json_string() {
    let text = r#"{"msg": "He said \"hello\" to me"}"#;
    let v = extract_json(text).unwrap();
    assert_eq!(v["msg"], r#"He said "hello" to me"#);
}

#[test]
fn multiple_json_fences_takes_first() {
    let text = "First block:\n```json\n{\"a\": 1}\n```\nSecond:\n```json\n{\"b\": 2}\n```";
    let v = extract_json(text).unwrap();
    assert_eq!(v["a"], 1);
}

#[test]
fn validated_empty_required_keys_always_passes() {
    let text = r#"{"anything": true}"#;
    let v = extract_validated(text, &[]).unwrap();
    assert_eq!(v["anything"], true);
}

#[test]
fn braces_inside_string_not_confused() {
    let text = r#"{"pattern": "fn foo() { bar() }", "ok": true}"#;
    let v = extract_json(text).unwrap();
    assert_eq!(v["ok"], true);
    assert_eq!(v["pattern"], "fn foo() { bar() }");
}

#[test]
fn deeply_nested_json() {
    let text = r#"{"a": {"b": {"c": {"d": 42}}}}"#;
    let v = extract_json(text).unwrap();
    assert_eq!(v["a"]["b"]["c"]["d"], 42);
}

#[test]
fn array_of_objects() {
    let text = r#"[{"id": 1}, {"id": 2}]"#;
    let v = extract_json(text).unwrap();
    let arr = v.as_array().unwrap();
    assert_eq!(arr.len(), 2);
    assert_eq!(arr[0]["id"], 1);
    assert_eq!(arr[1]["id"], 2);
}

#[test]
fn json_with_leading_prose_and_trailing_prose() {
    let text = "Analysis complete. Result: {\"score\": 0.92, \"status\": \"pass\"} — see above.";
    let v = extract_json(text).unwrap();
    assert_eq!(v["score"], 0.92);
    assert_eq!(v["status"], "pass");
}
