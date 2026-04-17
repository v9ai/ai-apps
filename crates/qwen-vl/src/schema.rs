use serde::{Deserialize, Serialize};

// ─── Discovery extraction ───────────────────────────────────────────────────

pub const DISCOVERY_PROMPT: &str = "\
You are a B2B company data extractor. Given a company web page (as text or screenshot), \
extract structured company information. Return ONLY valid JSON matching this schema: \
{\"company_name\": string|null, \"tagline\": string|null, \"industry\": string|null, \
\"location\": string|null, \"employee_count_hint\": string|null, \
\"key_people\": [{\"name\": string, \"title\": string|null}], \
\"emails_found\": [string], \"is_b2b\": bool|null}. \
Fields you cannot determine should be null. Do not hallucinate.";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveryExtraction {
    pub company_name: Option<String>,
    pub tagline: Option<String>,
    pub industry: Option<String>,
    pub location: Option<String>,
    pub employee_count_hint: Option<String>,
    #[serde(default)]
    pub key_people: Vec<PersonBrief>,
    #[serde(default)]
    pub emails_found: Vec<String>,
    pub is_b2b: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonBrief {
    pub name: String,
    pub title: Option<String>,
}

// ─── Enrichment extraction ──────────────────────────────────────────────────

pub const ENRICHMENT_PROMPT: &str = "\
You are a B2B company analyst. Given company web page content, classify and extract: \
category (e.g. \"AI Consultancy\", \"SaaS Platform\", \"Dev Tools\"), \
ai_tier (one of: \"AI-native\", \"AI-enabled\", \"AI-adjacent\", \"non-AI\"), \
tech_stack (list of technologies), services (list of services offered), \
funding_stage (if mentioned), target_customers (\"Enterprise\", \"SMB\", \"Startups\", or \"Mixed\"), \
differentiators (unique selling points), hiring_signals (evidence of growth/hiring). \
Return ONLY valid JSON. Fields you cannot determine should be null or empty arrays.";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnrichmentExtraction {
    pub category: Option<String>,
    pub ai_tier: Option<String>,
    #[serde(default)]
    pub tech_stack: Vec<String>,
    #[serde(default)]
    pub services: Vec<String>,
    pub funding_stage: Option<String>,
    pub target_customers: Option<String>,
    #[serde(default)]
    pub differentiators: Vec<String>,
    #[serde(default)]
    pub hiring_signals: Vec<String>,
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discovery_extraction_deserializes() {
        let json = r#"{
            "company_name": "Acme AI",
            "tagline": "AI for everyone",
            "industry": "Technology",
            "location": "San Francisco, CA",
            "employee_count_hint": "50-200",
            "key_people": [{"name": "Jane Doe", "title": "CEO"}],
            "emails_found": ["info@acme.ai"],
            "is_b2b": true
        }"#;
        let d: DiscoveryExtraction = serde_json::from_str(json).unwrap();
        assert_eq!(d.company_name.as_deref(), Some("Acme AI"));
        assert_eq!(d.key_people.len(), 1);
        assert_eq!(d.emails_found.len(), 1);
    }

    #[test]
    fn discovery_extraction_handles_nulls() {
        let json = r#"{
            "company_name": null,
            "tagline": null,
            "industry": null,
            "location": null,
            "employee_count_hint": null,
            "key_people": [],
            "emails_found": [],
            "is_b2b": null
        }"#;
        let d: DiscoveryExtraction = serde_json::from_str(json).unwrap();
        assert!(d.company_name.is_none());
        assert!(d.key_people.is_empty());
    }

    #[test]
    fn discovery_extraction_handles_missing_arrays() {
        let json = r#"{"company_name": "Test"}"#;
        let d: DiscoveryExtraction = serde_json::from_str(json).unwrap();
        assert!(d.key_people.is_empty());
        assert!(d.emails_found.is_empty());
    }

    #[test]
    fn enrichment_extraction_deserializes() {
        let json = r#"{
            "category": "AI Consultancy",
            "ai_tier": "AI-native",
            "tech_stack": ["PyTorch", "Kubernetes"],
            "services": ["MLOps consulting"],
            "funding_stage": "Series A",
            "target_customers": "Enterprise",
            "differentiators": ["proprietary model"],
            "hiring_signals": ["hiring ML engineers"]
        }"#;
        let e: EnrichmentExtraction = serde_json::from_str(json).unwrap();
        assert_eq!(e.category.as_deref(), Some("AI Consultancy"));
        assert_eq!(e.tech_stack.len(), 2);
    }

    #[test]
    fn enrichment_extraction_handles_missing_arrays() {
        let json = r#"{"category": "SaaS"}"#;
        let e: EnrichmentExtraction = serde_json::from_str(json).unwrap();
        assert!(e.tech_stack.is_empty());
        assert!(e.services.is_empty());
    }
}
