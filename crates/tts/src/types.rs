use serde::{Deserialize, Serialize};

// ─── Voice ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Voice {
    Cherry,
    Ethan,
    Nofish,
    Jennifer,
    Ryan,
    Katerina,
    Elias,
    Jada,
    Dylan,
    Sunny,
    Li,
    Marcus,
    Roy,
    Peter,
    Rocky,
    Kiki,
    Eric,
}

// ─── Request ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct TtsRequest {
    pub model: String,
    pub input: TtsInput,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parameters: Option<TtsParameters>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TtsInput {
    pub text: String,
    pub voice: Voice,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TtsParameters {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub optimize_instructions: Option<bool>,
}

impl TtsRequest {
    pub fn new(text: impl Into<String>, voice: Voice) -> Self {
        Self {
            model: "qwen3-tts-flash".into(),
            input: TtsInput {
                text: text.into(),
                voice,
                language_type: None,
                instructions: None,
            },
            parameters: None,
        }
    }

    pub fn with_model(mut self, model: impl Into<String>) -> Self {
        self.model = model.into();
        self
    }

    pub fn with_language(mut self, lang: impl Into<String>) -> Self {
        self.input.language_type = Some(lang.into());
        self
    }

    pub fn with_instructions(mut self, instructions: impl Into<String>) -> Self {
        self.input.instructions = Some(instructions.into());
        self.parameters = Some(TtsParameters {
            optimize_instructions: Some(true),
        });
        self
    }
}

// ─── Response (non-streaming) ───────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
pub struct TtsResponse {
    pub request_id: String,
    pub output: TtsOutput,
    pub usage: Option<TtsUsage>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TtsOutput {
    pub audio: AudioOutput,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AudioOutput {
    pub url: Option<String>,
    pub data: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TtsUsage {
    pub input_tokens: Option<u32>,
    pub output_tokens: Option<u32>,
}

// ─── Unit tests ─────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_serializes_minimal() {
        let req = TtsRequest::new("Hello world", Voice::Cherry);
        let v: serde_json::Value = serde_json::to_value(&req).unwrap();
        assert_eq!(v["model"], "qwen3-tts-flash");
        assert_eq!(v["input"]["text"], "Hello world");
        assert_eq!(v["input"]["voice"], "cherry");
        assert!(v.get("parameters").is_none());
        assert!(v["input"].get("language_type").is_none());
    }

    #[test]
    fn request_serializes_with_options() {
        let req = TtsRequest::new("Hola", Voice::Ethan)
            .with_model("qwen3-tts-instruct-flash")
            .with_language("es")
            .with_instructions("Speak slowly");
        let v: serde_json::Value = serde_json::to_value(&req).unwrap();
        assert_eq!(v["model"], "qwen3-tts-instruct-flash");
        assert_eq!(v["input"]["language_type"], "es");
        assert_eq!(v["input"]["instructions"], "Speak slowly");
        assert_eq!(v["parameters"]["optimize_instructions"], true);
    }

    #[test]
    fn voice_serializes_lowercase() {
        let v: serde_json::Value = serde_json::to_value(&Voice::Jennifer).unwrap();
        assert_eq!(v, "jennifer");
    }

    #[test]
    fn response_deserializes_with_url() {
        let json = r#"{
            "request_id": "req-123",
            "output": {
                "audio": { "url": "https://example.com/audio.wav" },
                "finish_reason": "stop"
            },
            "usage": { "input_tokens": 10, "output_tokens": 100 }
        }"#;
        let resp: TtsResponse = serde_json::from_str(json).unwrap();
        assert_eq!(resp.request_id, "req-123");
        assert_eq!(resp.output.audio.url.as_deref(), Some("https://example.com/audio.wav"));
        assert!(resp.output.audio.data.is_none());
        assert_eq!(resp.output.finish_reason.as_deref(), Some("stop"));
        assert_eq!(resp.usage.as_ref().unwrap().input_tokens, Some(10));
    }

    #[test]
    fn response_deserializes_with_data() {
        let json = r#"{
            "request_id": "req-456",
            "output": {
                "audio": { "data": "AAAA" },
                "finish_reason": null
            },
            "usage": null
        }"#;
        let resp: TtsResponse = serde_json::from_str(json).unwrap();
        assert_eq!(resp.output.audio.data.as_deref(), Some("AAAA"));
        assert!(resp.output.audio.url.is_none());
        assert!(resp.usage.is_none());
    }
}
