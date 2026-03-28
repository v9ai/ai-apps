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

// ── Classification results ──────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RoleClassification {
    #[serde(rename = "isAIEngineer")]
    pub is_ai_engineer: bool,
    pub confidence: String,
    pub reason: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RemoteEuClassification {
    #[serde(rename = "isRemoteEU")]
    pub is_remote_eu: bool,
    pub confidence: String,
    pub reason: String,
}

// ── Classification prompts ──────────────────────────────────────────────────

const ROLE_TAG_SYSTEM: &str = "\
You classify job postings as AI/ML engineer roles. \
Return JSON: {\"isAIEngineer\": true/false, \"confidence\": \"high\"|\"medium\"|\"low\", \"reason\": \"...\"}\n\n\
An AI Engineer role involves building, training, deploying, or researching AI/ML systems. \
Look for: ML frameworks (PyTorch, TensorFlow, JAX), LLM/RAG/agent work, \
NLP/CV/deep learning, MLOps, model serving, data science with ML focus.\n\n\
NOT AI Engineer: pure data analytics, BI, data engineering (ETL only), \
frontend/backend without AI, DevOps, product management, sales, HR, finance.\n\n\
CRITICAL: Respond with ONLY a valid JSON object, no markdown.";

const REMOTE_EU_SYSTEM: &str = "\
You are an expert at classifying job postings for Remote EU eligibility. \
A Remote EU position must be FULLY REMOTE and allow work from EU member countries. \
Return JSON: {\"isRemoteEU\": true/false, \"confidence\": \"high\"|\"medium\"|\"low\", \"reason\": \"...\"}\n\n\
CLASSIFICATION RULES (apply in order):\n\n\
0. NEGATIVE SIGNALS (highest priority):\n\
   - \"US only\", \"must be based in US\" → false (high)\n\
   - Swiss-only work permit in DACH context → false (high)\n\n\
1. FULLY REMOTE REQUIREMENT: Must explicitly state remote/fully remote.\n\
   - Hybrid, office-based, on-site → false\n\n\
2. ATS METADATA: EU country code + remote flag → true (high)\n\n\
3. EXPLICIT EU: \"Remote - EU\", \"EU only\" → true (high)\n\n\
4. WORK AUTH: \"EU work authorization\" → true\n\n\
5. REGIONAL: DACH → true (medium), Nordics → true (medium), Benelux → true (high)\n\n\
6. BROADER: EMEA + EU auth → true (high), EMEA alone → true (medium), \"Europe\" → true (medium)\n\n\
7. TIMEZONE: \"EU Timezone\"/\"CET +/- N\" → true (medium)\n\n\
8. WORLDWIDE: + negative → false; + EU signal → true (medium); alone → false (medium)\n\n\
9. UK only (post-Brexit) → false. Switzerland only → false.\n\n\
CRITICAL: Respond with ONLY a valid JSON object, no markdown.";

// ── Wire types ──────────────────────────────────────────────────────────────

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

#[derive(Clone)]
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

    /// General-purpose text completion.
    pub async fn complete(&self, prompt: &str, temperature: f32) -> Result<String> {
        self.chat(prompt, temperature).await
    }

    /// Classify whether a job is an AI/ML engineer role.
    pub async fn classify_role(
        &self, title: &str, company: &str, location: &str, description: &str,
    ) -> Result<RoleClassification> {
        let desc_truncated = if description.len() > 2000 { &description[..2000] } else { description };
        let user_msg = format!(
            "Classify this job as AI/ML engineer or not.\n\n\
             Title: {title}\nCompany: {company}\nLocation: {location}\n\
             Description: {desc_truncated}"
        );
        let content = self.chat_with_system(ROLE_TAG_SYSTEM, &user_msg, 0.1).await?;
        parse_json::<RoleClassification>(&content)
    }

    /// Classify whether a job is remote-EU eligible.
    pub async fn classify_remote_eu(
        &self, title: &str, company: &str, location: &str, description: &str,
        workplace_type: Option<&str>, country: Option<&str>, ats_remote: Option<bool>,
    ) -> Result<RemoteEuClassification> {
        let desc_truncated = if description.len() > 2000 { &description[..2000] } else { description };
        let mut signals = Vec::new();
        if let Some(remote) = ats_remote {
            signals.push(format!("ATS remote flag: {}", if remote { "YES" } else { "NO" }));
        }
        if let Some(wt) = workplace_type {
            signals.push(format!("Workplace type: {wt}"));
        }
        if let Some(cc) = country {
            signals.push(format!("Country code: {cc}"));
        }
        let signals_str = if signals.is_empty() {
            "No structured ATS signals available".to_string()
        } else {
            signals.join("\n")
        };
        let user_msg = format!(
            "Classify this job posting as Remote EU or not.\n\n\
             JOB DETAILS:\n- Title: {title}\n- Company: {company}\n\
             - Location: {location}\n- Description: {desc_truncated}\n\n\
             STRUCTURED SIGNALS:\n{signals_str}"
        );
        let content = self.chat_with_system(REMOTE_EU_SYSTEM, &user_msg, 0.1).await?;
        parse_json::<RemoteEuClassification>(&content)
    }

    async fn chat(&self, prompt: &str, temperature: f32) -> Result<String> {
        self.chat_with_system("", prompt, temperature).await
    }

    async fn chat_with_system(&self, system: &str, prompt: &str, temperature: f32) -> Result<String> {
        let mut messages = Vec::new();
        if !system.is_empty() {
            messages.push(Message { role: "system".into(), content: system.into() });
        }
        messages.push(Message { role: "user".into(), content: prompt.into() });
        let req = ChatRequest {
            model: self.model.clone(),
            messages,
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
    parse_json(content)
}

fn parse_json<T: serde::de::DeserializeOwned>(content: &str) -> Result<T> {
    let cleaned = clean_json_block(content);
    if let Ok(data) = serde_json::from_str::<T>(&cleaned) { return Ok(data); }
    if let Some(start) = cleaned.find('{') {
        if let Some(end) = cleaned.rfind('}') {
            if let Ok(data) = serde_json::from_str::<T>(&cleaned[start..=end]) {
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
