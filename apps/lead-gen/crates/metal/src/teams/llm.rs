//! OpenAI-compatible chat completion client for local Qwen (mlx_lm.server).

use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
struct ChatRequest<'a> {
    model: &'a str,
    messages: Vec<Message<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Message<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: ResponseMessage,
}

#[derive(Debug, Deserialize)]
struct ResponseMessage {
    content: String,
}

/// Send a chat completion request to a local Qwen server (mlx_lm.server)
/// or any OpenAI-compatible endpoint.
pub async fn chat(
    client: &reqwest::Client,
    base_url: &str,
    api_key: Option<&str>,
    model: &str,
    system: &str,
    user: &str,
    temperature: Option<f32>,
) -> Result<String> {
    let mut messages = Vec::new();
    if !system.is_empty() {
        messages.push(Message { role: "system", content: system });
    }
    messages.push(Message { role: "user", content: user });

    let req = ChatRequest {
        model,
        messages,
        temperature,
        max_tokens: Some(2048),
    };

    let mut builder = client.post(format!("{base_url}/chat/completions"));
    if let Some(key) = api_key {
        builder = builder.bearer_auth(key);
    }
    let resp = builder.json(&req).send().await?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        bail!("LLM API {status}: {body}");
    }

    let body: ChatResponse = resp.json().await?;
    body.choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| anyhow::anyhow!("empty LLM response"))
}

/// Classify a company using LLM. Returns (category, ai_tier, confidence).
pub async fn classify_company(
    client: &reqwest::Client,
    base_url: &str,
    api_key: Option<&str>,
    model: &str,
    name: &str,
    domain: &str,
    page_text: &str,
) -> Result<CompanyClassification> {
    let system = "You classify B2B companies. Respond ONLY with JSON, no markdown fences.\n\
        Schema: {\"category\":\"CONSULTANCY|AGENCY|STAFFING|PRODUCT\",\"ai_tier\":\"ai_first|ai_native|other\",\"industry\":\"string\",\"confidence\":0.0-1.0}\n\
        - CONSULTANCY: custom software/AI development for clients\n\
        - AGENCY: digital/creative agency\n\
        - STAFFING: recruitment/body-leasing\n\
        - PRODUCT: own SaaS/product company\n\
        - ai_first: AI is core business (>50% revenue)\n\
        - ai_native: uses AI heavily but not core\n\
        - other: minimal AI";

    let truncated = if page_text.len() > 3000 { &page_text[..3000] } else { page_text };
    let user = format!("Company: {name}\nDomain: {domain}\nPage text:\n{truncated}");

    let raw = chat(client, base_url, api_key, model, system, &user, Some(0.1)).await?;

    // Strip markdown fences if present
    let json_str = raw
        .trim()
        .strip_prefix("```json")
        .or_else(|| raw.trim().strip_prefix("```"))
        .unwrap_or(raw.trim())
        .strip_suffix("```")
        .unwrap_or(raw.trim())
        .trim();

    let cls: CompanyClassification = serde_json::from_str(json_str)
        .map_err(|e| anyhow::anyhow!("LLM classification parse error: {e}\nRaw: {raw}"))?;
    Ok(cls)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyClassification {
    pub category: String,
    pub ai_tier: String,
    #[serde(default)]
    pub industry: String,
    #[serde(default = "default_confidence")]
    pub confidence: f64,
}

fn default_confidence() -> f64 { 0.5 }

#[cfg(test)]
mod tests {
    #[cfg(feature = "kernel-extract")]
    #[test]
    fn test_company_profile_schema_has_required_fields() {
        let schema = super::company_profile_schema();
        let required = schema["required"].as_array().expect("required must be array");
        let required_strs: Vec<&str> = required.iter()
            .filter_map(|v| v.as_str())
            .collect();
        assert!(required_strs.contains(&"name"));
        assert!(required_strs.contains(&"category"));
        assert!(required_strs.contains(&"ai_tier"));
    }

    #[cfg(feature = "kernel-extract")]
    #[test]
    fn test_company_profile_schema_properties() {
        let schema = super::company_profile_schema();
        let props = schema["properties"].as_object().expect("properties must be object");
        assert!(props.contains_key("name"));
        assert!(props.contains_key("category"));
        assert!(props.contains_key("ai_tier"));
        assert!(props.contains_key("tech_stack"));
        assert!(props.contains_key("remote_policy"));
        assert!(props.contains_key("services"));
        assert!(props.contains_key("hiring_signals"));
    }

    #[cfg(feature = "kernel-extract")]
    #[test]
    fn test_company_profile_schema_category_enum() {
        let schema = super::company_profile_schema();
        let variants = schema["properties"]["category"]["enum"]
            .as_array()
            .expect("category enum must be array");
        let strs: Vec<&str> = variants.iter().filter_map(|v| v.as_str()).collect();
        assert!(strs.contains(&"CONSULTANCY"));
        assert!(strs.contains(&"AGENCY"));
        assert!(strs.contains(&"STAFFING"));
        assert!(strs.contains(&"PRODUCT"));
    }

    #[cfg(feature = "kernel-extract")]
    #[test]
    fn test_company_profile_schema_ai_tier_enum() {
        let schema = super::company_profile_schema();
        let variants = schema["properties"]["ai_tier"]["enum"]
            .as_array()
            .expect("ai_tier enum must be array");
        let strs: Vec<&str> = variants.iter().filter_map(|v| v.as_str()).collect();
        assert!(strs.contains(&"ai_first"));
        assert!(strs.contains(&"ai_native"));
        assert!(strs.contains(&"other"));
    }

    #[cfg(feature = "kernel-extract")]
    #[test]
    fn test_company_profile_schema_remote_policy_enum() {
        let schema = super::company_profile_schema();
        let variants = schema["properties"]["remote_policy"]["enum"]
            .as_array()
            .expect("remote_policy enum must be array");
        let strs: Vec<&str> = variants.iter().filter_map(|v| v.as_str()).collect();
        assert!(strs.contains(&"full_remote"));
        assert!(strs.contains(&"hybrid"));
        assert!(strs.contains(&"onsite"));
        assert!(strs.contains(&"unknown"));
    }
}

/// Draft a personalized outreach email using LLM.
pub async fn draft_email(
    client: &reqwest::Client,
    base_url: &str,
    api_key: Option<&str>,
    model: &str,
    contact_name: &str,
    contact_title: &str,
    company_name: &str,
    company_domain: &str,
    tech_stack: &str,
) -> Result<EmailDraft> {
    let system = "You draft B2B outreach emails. Respond ONLY with JSON, no markdown fences.\n\
        Schema: {\"subject\":\"string\",\"body\":\"string\",\"personalization_score\":0.0-1.0}\n\
        Rules:\n\
        - Subject: < 60 chars, no spam triggers, no ALL CAPS\n\
        - Body: 100-250 words, professional but human\n\
        - Opening: personal connection point (shared tech, company context)\n\
        - Value prop: specific to their tech/challenges\n\
        - CTA: single, clear, low-friction (15-min call)\n\
        - No generic flattery. Reference specific tech they use.";

    let user = format!(
        "Contact: {contact_name} ({contact_title})\n\
         Company: {company_name} ({company_domain})\n\
         Tech stack: {tech_stack}\n\
         \n\
         I am a senior AI/ML engineer with deep Rust, Python, and infrastructure experience, \
         looking for fully remote positions worldwide. Draft a warm outreach email."
    );

    let raw = chat(client, base_url, api_key, model, system, &user, Some(0.7)).await?;

    let json_str = raw
        .trim()
        .strip_prefix("```json")
        .or_else(|| raw.trim().strip_prefix("```"))
        .unwrap_or(raw.trim())
        .strip_suffix("```")
        .unwrap_or(raw.trim())
        .trim();

    let draft: EmailDraft = serde_json::from_str(json_str)
        .map_err(|e| anyhow::anyhow!("Email draft parse error: {e}\nRaw: {raw}"))?;
    Ok(draft)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailDraft {
    pub subject: String,
    pub body: String,
    #[serde(default)]
    pub personalization_score: f64,
}

/// Extract structured data from an HTML profile using a schema-constrained model
/// (sgai-qwen3-1.7b or similar). The model receives a markdown rendering of the
/// HTML profile plus a JSON schema, and returns schema-compliant JSON.
#[cfg(feature = "kernel-extract")]
pub async fn extract_structured(
    client: &reqwest::Client,
    base_url: &str,
    api_key: Option<&str>,
    model: &str,
    profile: &crate::kernel::html_extractor::HtmlProfile,
    schema: &serde_json::Value,
) -> Result<serde_json::Value> {
    let context = crate::kernel::html_extractor::profile_to_markdown(profile);
    let schema_str = serde_json::to_string(schema).unwrap_or_default();

    let system = "You are a structured data extraction model. \
        Extract information from the provided web page content and return ONLY valid JSON \
        matching the given schema. No markdown fences, no explanations.";

    let user = format!(
        "Extract structured data from this web page.\n\n\
         {context}\n\n\
         ---\n\n\
         Return JSON matching this schema:\n```json\n{schema_str}\n```"
    );

    let raw = chat(client, base_url, api_key, model, system, &user, Some(0.1)).await?;

    // Strip markdown fences if present
    let json_str = raw
        .trim()
        .strip_prefix("```json")
        .or_else(|| raw.trim().strip_prefix("```"))
        .unwrap_or(raw.trim())
        .strip_suffix("```")
        .unwrap_or(raw.trim())
        .trim();

    let val: serde_json::Value = serde_json::from_str(json_str)
        .map_err(|e| anyhow::anyhow!("Structured extraction parse error: {e}\nRaw: {raw}"))?;

    Ok(val)
}

/// Static JSON schema for company profile extraction.
#[cfg(feature = "kernel-extract")]
pub fn company_profile_schema() -> serde_json::Value {
    serde_json::json!({
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "category": {"type": "string", "enum": ["CONSULTANCY", "AGENCY", "STAFFING", "PRODUCT"]},
            "ai_tier": {"type": "string", "enum": ["ai_first", "ai_native", "other"]},
            "industry": {"type": "string"},
            "tech_stack": {"type": "array", "items": {"type": "string"}},
            "employee_count_estimate": {"type": "integer"},
            "remote_policy": {"type": "string", "enum": ["full_remote", "hybrid", "onsite", "unknown"]},
            "services": {"type": "array", "items": {"type": "string"}},
            "hiring_signals": {"type": "boolean"}
        },
        "required": ["name", "category", "ai_tier"]
    })
}
