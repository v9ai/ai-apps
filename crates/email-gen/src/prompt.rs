use serde::{Deserialize, Serialize};

const SYSTEM_PROMPT: &str = "You write B2B outreach emails for Vadim Nicolai, Senior Software Engineer (10+ years: React, TypeScript, AI/ML, Rust, Node.js, GraphQL). Never reference crypto, blockchain, trading, or Web3. Output ONLY valid JSON: {\"subject\": \"...\", \"body\": \"...\"}";

#[derive(Debug, Deserialize)]
pub struct Recipient {
    pub name: String,
    pub position: String,
    pub company: String,
    pub industry: String,
}

#[derive(Debug, Deserialize)]
pub struct InputPayload {
    pub recipient: Recipient,
    pub email_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmailOutput {
    pub subject: String,
    pub body: String,
}

pub fn build_prompt(recipient: &Recipient, email_type: &str) -> String {
    let user_msg = format!(
        "Write a {} outreach email to {} ({} at {}). Industry: {}.",
        email_type, recipient.name, recipient.position, recipient.company, recipient.industry
    );

    // Qwen chat template: <|im_start|>system\n...<|im_end|>\n<|im_start|>user\n...<|im_end|>\n<|im_start|>assistant\n
    format!(
        "<|im_start|>system\n{SYSTEM_PROMPT}<|im_end|>\n<|im_start|>user\n{user_msg}<|im_end|>\n<|im_start|>assistant\n"
    )
}

/// Strip `<think>...</think>` tags from Qwen3 output and extract JSON.
pub fn parse_output(raw: &str) -> Option<EmailOutput> {
    // Remove <think>...</think> blocks (Qwen3 thinking mode)
    let cleaned = strip_think_tags(raw);
    let trimmed = cleaned.trim();

    // Try to find JSON object in the output
    if let Some(start) = trimmed.find('{') {
        if let Some(end) = trimmed.rfind('}') {
            let json_str = &trimmed[start..=end];
            if let Ok(output) = serde_json::from_str::<EmailOutput>(json_str) {
                return Some(output);
            }
        }
    }

    None
}

fn strip_think_tags(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut rest = s;

    while let Some(start) = rest.find("<think>") {
        result.push_str(&rest[..start]);
        if let Some(end) = rest[start..].find("</think>") {
            rest = &rest[start + end + "</think>".len()..];
        } else {
            // Unclosed <think> tag — skip to end
            return result;
        }
    }
    result.push_str(rest);
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strip_think_tags() {
        assert_eq!(
            strip_think_tags("<think>reasoning here</think>{\"subject\": \"Hi\", \"body\": \"Hello\"}"),
            "{\"subject\": \"Hi\", \"body\": \"Hello\"}"
        );
    }

    #[test]
    fn test_parse_output() {
        let raw = "<think>Let me think...</think>\n{\"subject\": \"Collaboration Opportunity\", \"body\": \"Hi Sarah,\\n\\nI noticed NeuralScale...\"}";
        let output = parse_output(raw).unwrap();
        assert_eq!(output.subject, "Collaboration Opportunity");
        assert!(output.body.contains("Sarah"));
    }

    #[test]
    fn test_build_prompt() {
        let recipient = Recipient {
            name: "Sarah".to_string(),
            position: "CTO".to_string(),
            company: "NeuralScale".to_string(),
            industry: "AI/ML Platform".to_string(),
        };
        let prompt = build_prompt(&recipient, "initial");
        assert!(prompt.contains("<|im_start|>system"));
        assert!(prompt.contains("Sarah"));
        assert!(prompt.contains("initial"));
        assert!(prompt.contains("<|im_start|>assistant"));
    }
}
