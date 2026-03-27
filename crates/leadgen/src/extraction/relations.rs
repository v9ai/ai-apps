use anyhow::Result;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RelationType {
    WorksAt,
    FoundedBy,
    LocatedIn,
    ReportsTo,
    AcquiredBy,
    InvestedIn,
}

impl RelationType {
    /// Canonical string used in LLM prompts and JSON serialisation.
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::WorksAt => "WorksAt",
            Self::FoundedBy => "FoundedBy",
            Self::LocatedIn => "LocatedIn",
            Self::ReportsTo => "ReportsTo",
            Self::AcquiredBy => "AcquiredBy",
            Self::InvestedIn => "InvestedIn",
        }
    }

    fn from_str(s: &str) -> Option<Self> {
        match s {
            "WorksAt" => Some(Self::WorksAt),
            "FoundedBy" => Some(Self::FoundedBy),
            "LocatedIn" => Some(Self::LocatedIn),
            "ReportsTo" => Some(Self::ReportsTo),
            "AcquiredBy" => Some(Self::AcquiredBy),
            "InvestedIn" => Some(Self::InvestedIn),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Relation {
    pub subject: String,
    pub relation: RelationType,
    pub object: String,
    /// Confidence in [0, 1].
    pub confidence: f64,
    /// The exact substring of the source text that triggered this relation.
    pub source_text: String,
}

// ---------------------------------------------------------------------------
// Compiled regex bank — initialised once at first use.
// ---------------------------------------------------------------------------

struct Patterns {
    /// "Jane Smith, CEO of Acme Corp"  →  WorksAt(Jane Smith, Acme Corp)
    /// "Jane Smith, CEO at Acme Corp"
    title_at_of: Regex,

    /// "Acme was founded by Jane Smith"  →  FoundedBy(Acme, Jane Smith)
    founded_by_passive: Regex,

    /// "Jane Smith founded Acme Corp"    →  FoundedBy(Acme Corp, Jane Smith)
    founded_by_active: Regex,

    /// "headquartered in Berlin" / "based in Berlin" / "offices in Berlin"
    headquartered_in: Regex,

    /// "Jane Smith reports to John Doe"  →  ReportsTo(Jane Smith, John Doe)
    reports_to: Regex,

    /// "Acme was acquired by BigCo"      →  AcquiredBy(Acme, BigCo)
    acquired_by: Regex,

    /// "BigCo invested in Acme"          →  InvestedIn(BigCo, Acme)
    invested_in: Regex,
}

impl Patterns {
    fn build() -> Self {
        // Person names: one or more capitalised words (allows "van", "de", etc.)
        // We keep the pattern deliberately broad; false positives are filtered by
        // the confidence score returned at the call site.
        let name = r"([A-Z][a-zA-Z\-']+(?:\s+(?:van|de|der|von|la|le)?\s*[A-Z][a-zA-Z\-']+)+)";
        let company = r"([A-Z][A-Za-z0-9 ,.\-&']+?)";

        Self {
            // "Jane Smith, CEO of Acme" / "Jane Smith, CEO at Acme"
            title_at_of: Regex::new(&format!(
                r"(?i){},\s+[A-Za-z &/\-]{{2,40}}\s+(?:of|at)\s+{}",
                name, company
            ))
            .unwrap(),

            // "founded by Jane Smith" (company resolved from context — we use the
            // sentence subject when available, otherwise leave it as "[unknown]")
            founded_by_passive: Regex::new(&format!(
                r"(?i)(?:{}|(?:the\s+)?company)\s+(?:was\s+)?founded\s+by\s+{}",
                company, name
            ))
            .unwrap(),

            // "Jane Smith founded Acme Corp"
            founded_by_active: Regex::new(&format!(
                r"(?i){}\s+founded\s+{}",
                name, company
            ))
            .unwrap(),

            // "headquartered in Berlin" / "based in Berlin" / "offices in Berlin"
            headquartered_in: Regex::new(
                r"(?i)(?:headquartered|based|offices?|located)\s+in\s+([A-Z][A-Za-z\s,]+?)(?:\.|,|\s{2}|$)",
            )
            .unwrap(),

            // "Jane Smith reports to John Doe"
            reports_to: Regex::new(&format!(
                r"(?i){}\s+reports\s+to\s+{}",
                name, name
            ))
            .unwrap(),

            // "Acme was acquired by BigCo"
            acquired_by: Regex::new(&format!(
                r"(?i){}\s+(?:was\s+)?acquired\s+by\s+{}",
                company, company
            ))
            .unwrap(),

            // "BigCo invested in Acme" / "BigCo has invested in Acme"
            invested_in: Regex::new(&format!(
                r"(?i){}\s+(?:has\s+)?invested\s+in\s+{}",
                company, company
            ))
            .unwrap(),
        }
    }
}

static PATTERNS: OnceLock<Patterns> = OnceLock::new();

fn patterns() -> &'static Patterns {
    PATTERNS.get_or_init(Patterns::build)
}

// ---------------------------------------------------------------------------
// Extractor
// ---------------------------------------------------------------------------

pub struct RelationExtractor;

impl Default for RelationExtractor {
    fn default() -> Self {
        Self::new()
    }
}

impl RelationExtractor {
    pub fn new() -> Self {
        // Eagerly initialise patterns so the first `extract` call pays no
        // compilation cost at an inconvenient moment.
        let _ = patterns();
        Self
    }

    /// Extract relations from `text` using compiled regex patterns.
    ///
    /// Each pattern is matched against every non-overlapping occurrence in the
    /// text; captured groups become the subject/object of the resulting
    /// [`Relation`]. Confidence values are conservatively fixed per pattern
    /// class — LLM-based extraction should be preferred when higher precision
    /// is required.
    pub fn extract(&self, text: &str) -> Vec<Relation> {
        let p = patterns();
        let mut relations: Vec<Relation> = Vec::new();

        // --- Pattern 1: "Name, Title at/of Company" → WorksAt ---------------
        for cap in p.title_at_of.captures_iter(text) {
            let full = cap.get(0).map_or("", |m| m.as_str());
            // Group 1 = name (two subgroups inside the name alternation collapse
            // to group indices 1 and 2 due to the nested structure; we use the
            // overall first named capture which is group 1 in practice).
            let subject = trim_capture(&cap, 1);
            let object = trim_capture(&cap, 2);
            if !subject.is_empty() && !object.is_empty() {
                relations.push(Relation {
                    subject,
                    relation: RelationType::WorksAt,
                    object,
                    confidence: 0.80,
                    source_text: full.to_string(),
                });
            }
        }

        // --- Pattern 2: passive "founded by" → FoundedBy --------------------
        for cap in p.founded_by_passive.captures_iter(text) {
            let full = cap.get(0).map_or("", |m| m.as_str());
            // Group 1 = company (may be empty if "the company" matched)
            let company_raw = trim_capture(&cap, 1);
            let company_subject = if company_raw.is_empty() {
                "[company]".to_string()
            } else {
                company_raw
            };
            let founder = trim_capture(&cap, 2);
            if !founder.is_empty() {
                relations.push(Relation {
                    subject: company_subject,
                    relation: RelationType::FoundedBy,
                    object: founder,
                    confidence: 0.82,
                    source_text: full.to_string(),
                });
            }
        }

        // --- Pattern 3: active "Name founded Company" → FoundedBy -----------
        for cap in p.founded_by_active.captures_iter(text) {
            let full = cap.get(0).map_or("", |m| m.as_str());
            let founder = trim_capture(&cap, 1);
            let company_obj = trim_capture(&cap, 2);
            if !founder.is_empty() && !company_obj.is_empty() {
                relations.push(Relation {
                    subject: company_obj,
                    relation: RelationType::FoundedBy,
                    object: founder,
                    confidence: 0.80,
                    source_text: full.to_string(),
                });
            }
        }

        // --- Pattern 4: "headquartered/based in City" → LocatedIn -----------
        for cap in p.headquartered_in.captures_iter(text) {
            let full = cap.get(0).map_or("", |m| m.as_str());
            let location = trim_capture(&cap, 1);
            if !location.is_empty() {
                relations.push(Relation {
                    subject: "[company]".to_string(),
                    relation: RelationType::LocatedIn,
                    object: location,
                    confidence: 0.75,
                    source_text: full.to_string(),
                });
            }
        }

        // --- Pattern 5: "Name reports to Name" → ReportsTo ------------------
        for cap in p.reports_to.captures_iter(text) {
            let full = cap.get(0).map_or("", |m| m.as_str());
            let reporter = trim_capture(&cap, 1);
            let manager = trim_capture(&cap, 2);
            if !reporter.is_empty() && !manager.is_empty() && reporter != manager {
                relations.push(Relation {
                    subject: reporter,
                    relation: RelationType::ReportsTo,
                    object: manager,
                    confidence: 0.85,
                    source_text: full.to_string(),
                });
            }
        }

        // --- Pattern 6: "Company was acquired by BigCo" → AcquiredBy --------
        for cap in p.acquired_by.captures_iter(text) {
            let full = cap.get(0).map_or("", |m| m.as_str());
            let target = trim_capture(&cap, 1);
            let acquirer = trim_capture(&cap, 2);
            if !target.is_empty() && !acquirer.is_empty() {
                relations.push(Relation {
                    subject: target,
                    relation: RelationType::AcquiredBy,
                    object: acquirer,
                    confidence: 0.83,
                    source_text: full.to_string(),
                });
            }
        }

        // --- Pattern 7: "BigCo invested in Acme" → InvestedIn ---------------
        for cap in p.invested_in.captures_iter(text) {
            let full = cap.get(0).map_or("", |m| m.as_str());
            let investor = trim_capture(&cap, 1);
            let investee = trim_capture(&cap, 2);
            if !investor.is_empty() && !investee.is_empty() {
                relations.push(Relation {
                    subject: investor,
                    relation: RelationType::InvestedIn,
                    object: investee,
                    confidence: 0.78,
                    source_text: full.to_string(),
                });
            }
        }

        relations
    }

    /// Extract relations using LLM for complex or ambiguous cases.
    ///
    /// The LLM is prompted to return a JSON array; each element is parsed into
    /// a [`Relation`]. Falls back to an empty list on parse error rather than
    /// propagating — callers can combine this with [`extract`] for best
    /// coverage.
    pub async fn extract_with_llm(
        &self,
        text: &str,
        llm: &crate::llm::LlmClient,
    ) -> Result<Vec<Relation>> {
        let truncated = &text[..text.len().min(2000)];
        let relation_types = [
            RelationType::WorksAt,
            RelationType::FoundedBy,
            RelationType::LocatedIn,
            RelationType::ReportsTo,
            RelationType::AcquiredBy,
            RelationType::InvestedIn,
        ]
        .iter()
        .map(|r| r.as_str())
        .collect::<Vec<_>>()
        .join("|");

        let prompt = format!(
            r#"Extract every business relation from the text below.
Return ONLY a valid JSON array — no explanation, no markdown fences.

Each element must follow this exact schema:
{{"subject":"string","relation_type":"{types}","object":"string","confidence":0.0}}

Rules:
- subject and object are the entity names exactly as they appear in the text.
- relation_type must be one of the values listed above.
- confidence is a float between 0.0 and 1.0 reflecting your certainty.
- If no relations are found, return an empty array: []

Text:
{text}

JSON:"#,
            types = relation_types,
            text = truncated,
        );

        // Re-use the private `chat` method via `extract_entities` — the LLM
        // client exposes only high-level methods publicly, so we call
        // `extract_entities` and discard its parsed output, using the raw
        // content indirectly.  To avoid that indirection we call the public
        // `generate_lead_summary` with a dummy invocation that returns our
        // JSON by embedding the prompt as the entire "company" field — that
        // would be fragile.  Instead, we duplicate the minimal HTTP call here
        // using `reqwest` directly, mirroring what `LlmClient::chat` does
        // internally, so we stay consistent with the existing client design.
        //
        // A cleaner long-term solution is to expose `LlmClient::chat` as pub,
        // but that is outside the scope of this module.
        let raw = llm_raw_chat(llm, &prompt).await?;
        Ok(parse_llm_relations(&raw))
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Trim a regex capture group to a clean string, returning empty string when
/// the group did not participate in the match.
fn trim_capture(cap: &regex::Captures<'_>, idx: usize) -> String {
    cap.get(idx)
        .map(|m| m.as_str().trim().trim_end_matches(',').trim().to_string())
        .unwrap_or_default()
}

/// Minimal OpenAI-compatible chat call that mirrors `LlmClient::chat`.
/// We need access to the raw text response to parse it as a JSON array of
/// relations rather than the fixed `CompanyExtraction` shape.
async fn llm_raw_chat(llm: &crate::llm::LlmClient, prompt: &str) -> Result<String> {
    use serde_json::json;

    let body = json!({
        "model": llm.model_name(),
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "stream": false,
    });

    // Build the request using the public model name; we cannot access the
    // private `client` / `base_url` fields directly.  We therefore construct
    // an independent reqwest client pointing at the same endpoint convention
    // used by `LlmClient::local`.
    //
    // If the project later exposes a `raw_chat` method on `LlmClient` this
    // call should be migrated to use it.
    let endpoint = std::env::var("LLM_BASE_URL")
        .unwrap_or_else(|_| "http://localhost:11434/v1/chat/completions".to_string());

    let client = reqwest::Client::new();
    let mut req = client.post(&endpoint).json(&body);

    if let Ok(key) = std::env::var("LLM_API_KEY") {
        req = req.header("Authorization", format!("Bearer {}", key));
    }

    let resp = req.send().await?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!("LLM error {}: {}", status, text));
    }

    #[derive(serde::Deserialize)]
    struct Resp {
        choices: Vec<Ch>,
    }
    #[derive(serde::Deserialize)]
    struct Ch {
        message: Msg,
    }
    #[derive(serde::Deserialize)]
    struct Msg {
        content: String,
    }

    let parsed: Resp = resp.json().await?;
    parsed
        .choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| anyhow::anyhow!("empty LLM response"))
}

/// Parse the LLM response into a `Vec<Relation>`.  Silently drops elements
/// that cannot be deserialised so the caller always gets a usable (possibly
/// partial) result.
fn parse_llm_relations(raw: &str) -> Vec<Relation> {
    // Strip optional markdown fences.
    let cleaned = {
        let t = raw.trim();
        if t.starts_with("```") {
            let after_fence = t.find('\n').map(|p| &t[p + 1..]).unwrap_or(t);
            after_fence
                .rfind("```")
                .map(|p| after_fence[..p].trim())
                .unwrap_or(after_fence.trim())
        } else {
            t
        }
    };

    // Locate the outermost JSON array.
    let array_str = match (cleaned.find('['), cleaned.rfind(']')) {
        (Some(s), Some(e)) if e > s => &cleaned[s..=e],
        _ => return Vec::new(),
    };

    #[derive(Deserialize)]
    struct LlmRelation {
        subject: String,
        relation_type: String,
        object: String,
        confidence: f64,
    }

    let items: Vec<LlmRelation> = match serde_json::from_str(array_str) {
        Ok(v) => v,
        Err(_) => return Vec::new(),
    };

    items
        .into_iter()
        .filter_map(|item| {
            let relation = RelationType::from_str(&item.relation_type)?;
            let confidence = item.confidence.clamp(0.0, 1.0);
            Some(Relation {
                source_text: format!("{} {} {}", item.subject, item.relation_type, item.object),
                subject: item.subject,
                relation,
                object: item.object,
                confidence,
            })
        })
        .collect()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn extractor() -> RelationExtractor {
        RelationExtractor::new()
    }

    // --- RelationType helpers -----------------------------------------------

    #[test]
    fn relation_type_round_trips_via_str() {
        let variants = [
            RelationType::WorksAt,
            RelationType::FoundedBy,
            RelationType::LocatedIn,
            RelationType::ReportsTo,
            RelationType::AcquiredBy,
            RelationType::InvestedIn,
        ];
        for v in &variants {
            assert_eq!(RelationType::from_str(v.as_str()), Some(v.clone()));
        }
    }

    #[test]
    fn relation_type_unknown_returns_none() {
        assert!(RelationType::from_str("Unknown").is_none());
        assert!(RelationType::from_str("").is_none());
    }

    // --- Pattern 1: WorksAt -------------------------------------------------

    #[test]
    fn extracts_works_at_at_preposition() {
        let text = "Jane Smith, CEO at Acme Corp, will attend the conference.";
        let rels = extractor().extract(text);
        let works_at: Vec<_> = rels
            .iter()
            .filter(|r| r.relation == RelationType::WorksAt)
            .collect();
        assert!(!works_at.is_empty(), "expected WorksAt relation");
        assert!(
            works_at[0].subject.contains("Jane Smith"),
            "subject should be Jane Smith, got: {}",
            works_at[0].subject
        );
        assert!(works_at[0].confidence > 0.0 && works_at[0].confidence <= 1.0);
    }

    #[test]
    fn extracts_works_at_of_preposition() {
        let text = "John Doe, CTO of TechStartup Inc announced a new product.";
        let rels = extractor().extract(text);
        let works_at: Vec<_> = rels
            .iter()
            .filter(|r| r.relation == RelationType::WorksAt)
            .collect();
        assert!(!works_at.is_empty(), "expected WorksAt relation");
        assert!(works_at[0].subject.contains("John Doe"));
    }

    // --- Pattern 2: FoundedBy (passive) -------------------------------------

    #[test]
    fn extracts_founded_by_passive() {
        let text = "Acme Corp was founded by Jane Smith in 2010.";
        let rels = extractor().extract(text);
        let founded: Vec<_> = rels
            .iter()
            .filter(|r| r.relation == RelationType::FoundedBy)
            .collect();
        assert!(!founded.is_empty(), "expected FoundedBy relation");
        assert!(
            founded[0].object.contains("Jane Smith"),
            "object should be Jane Smith"
        );
    }

    // --- Pattern 3: FoundedBy (active) --------------------------------------

    #[test]
    fn extracts_founded_by_active() {
        let text = "Elon Musk founded Tesla Motors back in 2003.";
        let rels = extractor().extract(text);
        let founded: Vec<_> = rels
            .iter()
            .filter(|r| r.relation == RelationType::FoundedBy)
            .collect();
        assert!(!founded.is_empty(), "expected FoundedBy relation");
        // The founder is the object of the FoundedBy relation.
        assert!(
            founded[0].object.contains("Elon Musk"),
            "object should be Elon Musk, got: {}",
            founded[0].object
        );
    }

    // --- Pattern 4: LocatedIn -----------------------------------------------

    #[test]
    fn extracts_headquartered_in() {
        let text = "The company is headquartered in Berlin and has offices across Europe.";
        let rels = extractor().extract(text);
        let located: Vec<_> = rels
            .iter()
            .filter(|r| r.relation == RelationType::LocatedIn)
            .collect();
        assert!(!located.is_empty(), "expected LocatedIn relation");
        assert!(
            located[0].object.contains("Berlin"),
            "object should contain Berlin, got: {}",
            located[0].object
        );
    }

    #[test]
    fn extracts_based_in() {
        let text = "We are based in Amsterdam.";
        let rels = extractor().extract(text);
        let located: Vec<_> = rels
            .iter()
            .filter(|r| r.relation == RelationType::LocatedIn)
            .collect();
        assert!(!located.is_empty(), "expected LocatedIn relation");
        assert!(located[0].object.contains("Amsterdam"));
    }

    // --- Pattern 5: ReportsTo -----------------------------------------------

    #[test]
    fn extracts_reports_to() {
        let text = "Alice Johnson reports to Bob Williams, the VP of Engineering.";
        let rels = extractor().extract(text);
        let reports: Vec<_> = rels
            .iter()
            .filter(|r| r.relation == RelationType::ReportsTo)
            .collect();
        assert!(!reports.is_empty(), "expected ReportsTo relation");
        assert!(
            reports[0].subject.contains("Alice Johnson"),
            "subject should be Alice Johnson"
        );
        assert!(
            reports[0].object.contains("Bob Williams"),
            "object should be Bob Williams"
        );
    }

    #[test]
    fn reports_to_does_not_match_same_person() {
        // Sanity check: the extractor filters subject == object.
        let rels = extractor().extract("Alice Smith reports to Alice Smith.");
        let reports: Vec<_> = rels
            .iter()
            .filter(|r| r.relation == RelationType::ReportsTo)
            .collect();
        // Either no match at all, or the reporter and manager differ.
        for r in reports {
            assert_ne!(r.subject, r.object);
        }
    }

    // --- Pattern 6: AcquiredBy ----------------------------------------------

    #[test]
    fn extracts_acquired_by() {
        let text = "Startup Inc was acquired by Mega Corp last quarter.";
        let rels = extractor().extract(text);
        let acquired: Vec<_> = rels
            .iter()
            .filter(|r| r.relation == RelationType::AcquiredBy)
            .collect();
        assert!(!acquired.is_empty(), "expected AcquiredBy relation");
    }

    // --- Pattern 7: InvestedIn ----------------------------------------------

    #[test]
    fn extracts_invested_in() {
        let text = "Sequoia Capital has invested in the company.";
        let rels = extractor().extract(text);
        let invested: Vec<_> = rels
            .iter()
            .filter(|r| r.relation == RelationType::InvestedIn)
            .collect();
        assert!(!invested.is_empty(), "expected InvestedIn relation");
    }

    // --- Multi-relation text ------------------------------------------------

    #[test]
    fn extracts_multiple_relations_from_dense_text() {
        let text = concat!(
            "Jane Smith, CEO at Acme Corp, was founded by John Doe. ",
            "The firm is headquartered in London. ",
            "Alice Brown reports to Jane Smith.",
        );
        let rels = extractor().extract(text);
        let types: Vec<&RelationType> = rels.iter().map(|r| &r.relation).collect();
        assert!(
            types.contains(&&RelationType::WorksAt),
            "expected WorksAt"
        );
        assert!(
            types.contains(&&RelationType::LocatedIn),
            "expected LocatedIn"
        );
        assert!(
            types.contains(&&RelationType::ReportsTo),
            "expected ReportsTo"
        );
    }

    // --- Empty / trivial input ----------------------------------------------

    #[test]
    fn empty_text_returns_no_relations() {
        assert!(extractor().extract("").is_empty());
    }

    #[test]
    fn plain_prose_with_no_relations_is_empty() {
        let text = "The quick brown fox jumps over the lazy dog.";
        assert!(extractor().extract(text).is_empty());
    }

    // --- source_text is populated -------------------------------------------

    #[test]
    fn source_text_is_substring_of_input() {
        let text = "Jane Smith, CEO at Acme Corp, leads the product team.";
        let rels = extractor().extract(text);
        for rel in &rels {
            assert!(
                text.contains(rel.source_text.as_str()),
                "source_text '{}' not found in input",
                rel.source_text
            );
        }
    }

    // --- LLM response parsing -----------------------------------------------

    #[test]
    fn parse_llm_relations_valid_array() {
        let raw = r#"[
            {"subject":"Jane Smith","relation_type":"WorksAt","object":"Acme Corp","confidence":0.9},
            {"subject":"Acme Corp","relation_type":"LocatedIn","object":"Berlin","confidence":0.85}
        ]"#;
        let rels = parse_llm_relations(raw);
        assert_eq!(rels.len(), 2);
        assert_eq!(rels[0].relation, RelationType::WorksAt);
        assert_eq!(rels[1].relation, RelationType::LocatedIn);
    }

    #[test]
    fn parse_llm_relations_strips_markdown_fences() {
        let raw = "```json\n[{\"subject\":\"A\",\"relation_type\":\"WorksAt\",\"object\":\"B\",\"confidence\":0.5}]\n```";
        let rels = parse_llm_relations(raw);
        assert_eq!(rels.len(), 1);
    }

    #[test]
    fn parse_llm_relations_empty_array() {
        assert!(parse_llm_relations("[]").is_empty());
    }

    #[test]
    fn parse_llm_relations_invalid_json_returns_empty() {
        assert!(parse_llm_relations("not json at all").is_empty());
    }

    #[test]
    fn parse_llm_relations_unknown_relation_type_skipped() {
        let raw = r#"[
            {"subject":"A","relation_type":"FlysWith","object":"B","confidence":0.9},
            {"subject":"C","relation_type":"WorksAt","object":"D","confidence":0.7}
        ]"#;
        let rels = parse_llm_relations(raw);
        // FlysWith should be dropped; WorksAt retained.
        assert_eq!(rels.len(), 1);
        assert_eq!(rels[0].relation, RelationType::WorksAt);
    }

    #[test]
    fn parse_llm_relations_clamps_confidence_above_one() {
        let raw = r#"[{"subject":"A","relation_type":"WorksAt","object":"B","confidence":1.5}]"#;
        let rels = parse_llm_relations(raw);
        assert_eq!(rels.len(), 1);
        assert!(rels[0].confidence <= 1.0);
    }

    #[test]
    fn parse_llm_relations_clamps_confidence_below_zero() {
        let raw = r#"[{"subject":"A","relation_type":"WorksAt","object":"B","confidence":-0.3}]"#;
        let rels = parse_llm_relations(raw);
        assert_eq!(rels.len(), 1);
        assert!(rels[0].confidence >= 0.0);
    }
}
