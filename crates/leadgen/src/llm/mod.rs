use anyhow::{anyhow, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompanyExtraction {
    pub company_name: String,
    pub industry: Option<String>,
    pub employee_count: Option<i32>,
    pub founding_year: Option<i32>,
    pub location: Option<String>,
    pub tech_stack: Vec<String>,
    pub key_people: Vec<PersonExtraction>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PersonExtraction {
    pub name: String,
    pub title: String,
    pub department: Option<String>,
}

#[derive(Serialize)]
struct ChatRequest { model: String, messages: Vec<Message>, temperature: f32, stream: bool }

#[derive(Serialize, Deserialize)]
struct Message { role: String, content: String }

#[derive(Deserialize)]
struct ChatResponse { choices: Vec<Choice> }

#[derive(Deserialize)]
struct Choice { message: MessageContent }

#[derive(Deserialize)]
struct MessageContent { content: String }

pub struct LlmClient {
    client: Client,
    base_url: String,
    model: String,
    api_key: Option<String>,
}

impl LlmClient {
    pub fn local(model: &str) -> Self {
        Self { client: Client::new(), base_url: "http://localhost:11434/v1/chat/completions".into(),
               model: model.into(), api_key: None }
    }

    pub fn remote(base_url: &str, model: &str, api_key: &str) -> Self {
        Self { client: Client::new(), base_url: base_url.into(),
               model: model.into(), api_key: Some(api_key.into()) }
    }

    pub fn model_name(&self) -> String { self.model.clone() }

    pub async fn extract_entities(&self, page_text: &str) -> Result<CompanyExtraction> {
        let prompt = format!(
            r#"Extract structured data from this company web page.
Return ONLY valid JSON with no explanation or markdown.

{{"company_name":"string","industry":"string or null","employee_count":"number or null",
"founding_year":"number or null","location":"string or null","tech_stack":["string"],
"key_people":[{{"name":"Full Name","title":"Job Title","department":"string or null"}}],
"description":"one sentence or null"}}

Page text:
{}"#, page_text);

        let content = self.chat(&prompt, 0.1).await?;
        parse_json_response(&content)
    }

    pub async fn generate_lead_summary(
        &self, company: &str, industry: &str, emp: i32,
        contact: &str, title: &str, tech: &str,
    ) -> Result<String> {
        let prompt = format!(
            "Write a 3-sentence lead brief.\nCompany: {}\nIndustry: {}\nEmployees: {}\nContact: {} — {}\nTech: {}\n\n1. What they do\n2. Why relevant\n3. Outreach angle",
            company, industry, emp, contact, title, tech);
        self.chat(&prompt, 0.7).await
    }

    async fn chat(&self, prompt: &str, temperature: f32) -> Result<String> {
        let req = ChatRequest {
            model: self.model.clone(),
            messages: vec![Message { role: "user".into(), content: prompt.into() }],
            temperature, stream: false,
        };
        let mut builder = self.client.post(&self.base_url).json(&req);
        if let Some(ref key) = self.api_key {
            builder = builder.header("Authorization", format!("Bearer {}", key));
        }
        let resp = builder.send().await?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(anyhow!("LLM API error {}: {}", status, body));
        }
        let chat_resp: ChatResponse = resp.json().await?;
        chat_resp.choices.first().map(|c| c.message.content.clone())
            .ok_or_else(|| anyhow!("empty LLM response"))
    }
}

fn parse_json_response(content: &str) -> Result<CompanyExtraction> {
    let cleaned = clean_json_block(content);
    if let Ok(data) = serde_json::from_str::<CompanyExtraction>(&cleaned) { return Ok(data); }
    if let Some(start) = cleaned.find('{') {
        if let Some(end) = cleaned.rfind('}') {
            if let Ok(data) = serde_json::from_str::<CompanyExtraction>(&cleaned[start..=end]) {
                return Ok(data);
            }
        }
    }
    Err(anyhow!("failed to parse LLM JSON: {}", &content[..content.len().min(300)]))
}

fn clean_json_block(s: &str) -> String {
    let trimmed = s.trim();
    if trimmed.starts_with("```") {
        let without_start = trimmed.find('\n').map(|p| &trimmed[p+1..]).unwrap_or(trimmed);
        if let Some(end) = without_start.rfind("```") { return without_start[..end].trim().into(); }
        return without_start.trim().into();
    }
    trimmed.into()
}
