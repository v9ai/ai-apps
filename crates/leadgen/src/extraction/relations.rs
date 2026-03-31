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
    /// Company uses a specific technology.
    HasTechStack { tool: String },
    /// Company raised a funding round.
    RaisedFunding { round: String, amount: Option<f64> },
    /// Company X partners with company Y.
    PartnersWith,
    /// Company X competes with company Y.
    CompetesWith,
}

impl RelationType {
    /// Canonical string used in LLM prompts and JSON serialisation.
    /// For parameterised variants the base name is returned; use the full
    /// [`Relation`] struct to access the structured fields.
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::WorksAt => "WorksAt",
            Self::FoundedBy => "FoundedBy",
            Self::LocatedIn => "LocatedIn",
            Self::ReportsTo => "ReportsTo",
            Self::AcquiredBy => "AcquiredBy",
            Self::InvestedIn => "InvestedIn",
            Self::HasTechStack { .. } => "HasTechStack",
            Self::RaisedFunding { .. } => "RaisedFunding",
            Self::PartnersWith => "PartnersWith",
            Self::CompetesWith => "CompetesWith",
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
            // Parameterised variants: return with empty/default fields when
            // reconstructed from a plain string (e.g. LLM output).
            "HasTechStack" => Some(Self::HasTechStack {
                tool: String::new(),
            }),
            "RaisedFunding" => Some(Self::RaisedFunding {
                round: String::new(),
                amount: None,
            }),
            "PartnersWith" => Some(Self::PartnersWith),
            "CompetesWith" => Some(Self::CompetesWith),
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

/// Known technology / tool names used in HasTechStack detection.
const KNOWN_TOOLS: &[&str] = &[
    "React",
    "Vue",
    "Angular",
    "Node\\.js",
    "Python",
    "Go",
    "Rust",
    "Kubernetes",
    "Docker",
    "AWS",
    "GCP",
    "Azure",
    "PostgreSQL",
    "MongoDB",
    "Redis",
    "Elasticsearch",
    "Kafka",
    "Spark",
    "TensorFlow",
    "PyTorch",
    "OpenAI",
    "Anthropic",
    "LangChain",
];

struct Patterns {
    /// "Jane Smith, Head of Engineering at Acme Corp"  →  WorksAt
    title_at_of: Regex,

    /// "Acme was founded by Jane Smith" / "co-founded by" / "started by"
    founded_by_passive: Regex,

    /// "Jane Smith founded Acme Corp"    →  FoundedBy(Acme Corp, Jane Smith)
    founded_by_active: Regex,

    /// "headquartered in Berlin" / "based in Berlin" / "offices in Berlin"
    headquartered_in: Regex,

    /// "remote-first" / "fully remote" / "100% remote"  →  LocatedIn(Remote)
    remote_first: Regex,

    /// "Jane Smith reports to John Doe"  →  ReportsTo(Jane Smith, John Doe)
    reports_to: Regex,

    /// "Acme was acquired by BigCo"      →  AcquiredBy(Acme, BigCo)
    acquired_by: Regex,

    /// "BigCo invested in Acme"          →  InvestedIn(BigCo, Acme)
    invested_in: Regex,

    /// "built with React" / "powered by Docker" / "running on Kubernetes" …
    has_tech_stack: Regex,

    /// "raised $5M in Series A" / "closed a $20M Series B round"
    raised_funding: Regex,

    /// "X partners with Y" / "X announced partnership with Y" / "X and Y partner to"
    partners_with: Regex,

    /// "X competes with Y" / "X competitor Y" / "alternatives to X include Y"
    competes_with: Regex,
}

impl Patterns {
    fn build() -> Self {
        // Person names: one or more capitalised words (allows "van", "de", etc.)
        let name = r"([A-Z][a-zA-Z\-']+(?:\s+(?:van|de|der|von|la|le)?\s*[A-Z][a-zA-Z\-']+)+)";
        let company = r"([A-Z][A-Za-z0-9 ,.\-&']+?)";

        // Build the tool alternation once, escaping dots that are already
        // escaped in KNOWN_TOOLS (kept as-is — they're valid regex fragments).
        let tools_alt = KNOWN_TOOLS.join("|");

        Self {
            // Multi-word titles such as "Head of Engineering at Acme" or
            // "VP of Sales at Acme".  The title segment allows letters, spaces,
            // "&", "/" and "-", length 2–50.
            title_at_of: Regex::new(&format!(
                r"(?i){},\s+[A-Za-z][A-Za-z &/\-]{{1,49}}\s+(?:of|at)\s+{}",
                name, company
            ))
            .unwrap(),

            // "was founded by" / "co-founded by" / "started by"
            founded_by_passive: Regex::new(&format!(
                r"(?i)(?:{}|(?:the\s+)?company)\s+(?:was\s+)?(?:co-?founded|founded|started)\s+by\s+{}",
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

            // "remote-first", "fully remote", "100% remote", "entirely remote"
            remote_first: Regex::new(
                r"(?i)\b(?:remote-first|fully\s+remote|100%\s+remote|entirely\s+remote|all-remote)\b",
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

            // "built with React", "powered by Docker", "runs on Kubernetes",
            // "using Python", "React-based"
            has_tech_stack: Regex::new(&format!(
                r"(?i)(?:(?:built|made)\s+with|powered\s+by|runs?\s+on|running\s+on|using)\s+({tools})|({tools})-based",
                tools = tools_alt,
            ))
            .unwrap(),

            // "raised $5M in Series A"
            // "closed a $20M Series B round"
            // "announced $100M Series C"
            // Amount: $NM or $N million or $N billion
            raised_funding: Regex::new(
                r"(?i)(?:raised|closed|announced)\s+(?:a\s+)?\$(\d+(?:\.\d+)?)\s*(M|B|million|billion)?\s+(?:in\s+)?(?:a\s+)?(Seed|Series\s+[A-E])\b(?:\s+round)?",
            )
            .unwrap(),

            // "X partners with Y"
            // "X announced partnership with Y"
            // "X and Y partner to"
            partners_with: Regex::new(&format!(
                r"(?i)(?:{co}\s+(?:partners?\s+with|announced\s+(?:a\s+)?partnership\s+with)\s+{co2}|{co3}\s+and\s+{co4}\s+partner\s+to\b)",
                co = company,
                co2 = company,
                co3 = company,
                co4 = company,
            ))
            .unwrap(),

            // "X competes with Y"
            // "X competitor Y" (e.g. "Acme competitor BigCo")
            // "alternatives to X include Y"
            competes_with: Regex::new(&format!(
                r"(?i)(?:{co}\s+competes\s+with\s+{co2}|{co3}\s+competitor\s+{co4}|alternatives\s+to\s+{co5}\s+include\s+{co6})",
                co = company,
                co2 = company,
                co3 = company,
                co4 = company,
                co5 = company,
                co6 = company,
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

        // --- Pattern 2: passive "founded by" / "co-founded by" / "started by" → FoundedBy
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

        // --- Pattern 4b: "remote-first" / "fully remote" → LocatedIn(Remote)
        for mat in p.remote_first.find_iter(text) {
            relations.push(Relation {
                subject: "[company]".to_string(),
                relation: RelationType::LocatedIn,
                object: "Remote".to_string(),
                confidence: 0.90,
                source_text: mat.as_str().to_string(),
            });
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

        // --- Pattern 8: tech stack phrases → HasTechStack -------------------
        // The regex has two alternating capture groups: group 1 catches the
        // phrase-prefix form ("built with React") and group 2 catches the
        // suffix form ("React-based").  Exactly one of the two is populated
        // per match.
        for cap in p.has_tech_stack.captures_iter(text) {
            let full = cap.get(0).map_or("", |m| m.as_str());
            // Try group 1 first (phrase prefix), then group 2 (suffix "-based").
            let tool = cap
                .get(1)
                .or_else(|| cap.get(2))
                .map(|m| normalise_tool(m.as_str()))
                .unwrap_or_default();
            if !tool.is_empty() {
                relations.push(Relation {
                    subject: "[company]".to_string(),
                    relation: RelationType::HasTechStack { tool },
                    object: String::new(),
                    confidence: 0.70,
                    source_text: full.to_string(),
                });
            }
        }

        // --- Pattern 9: funding round → RaisedFunding -----------------------
        // Captures: 1=amount_digits, 2=unit(M/B/million/billion, optional),
        // 3=round(Seed/Series X)
        for cap in p.raised_funding.captures_iter(text) {
            let full = cap.get(0).map_or("", |m| m.as_str());
            let amount_str = trim_capture(&cap, 1);
            let unit = trim_capture(&cap, 2);
            let round_raw = trim_capture(&cap, 3);
            let round = normalise_round(&round_raw);

            let amount: Option<f64> = amount_str.parse::<f64>().ok().map(|n| {
                let multiplier = match unit.to_lowercase().as_str() {
                    "b" | "billion" => 1_000.0, // store in millions for consistency
                    _ => 1.0,                   // M / million / empty → already millions
                };
                n * multiplier
            });

            if !round.is_empty() {
                relations.push(Relation {
                    subject: "[company]".to_string(),
                    relation: RelationType::RaisedFunding { round, amount },
                    object: String::new(),
                    confidence: 0.85,
                    source_text: full.to_string(),
                });
            }
        }

        // --- Pattern 10: "X partners with Y" → PartnersWith -----------------
        // The regex has 4 capture groups from the two alternation branches.
        // Branch A ("X partners with Y"):  groups 1, 2
        // Branch B ("X and Y partner to"): groups 3, 4
        for cap in p.partners_with.captures_iter(text) {
            let full = cap.get(0).map_or("", |m| m.as_str());
            let (subj, obj) = extract_two_companies(&cap, &[(1, 2), (3, 4)]);
            if !subj.is_empty() && !obj.is_empty() {
                relations.push(Relation {
                    subject: subj,
                    relation: RelationType::PartnersWith,
                    object: obj,
                    confidence: 0.65,
                    source_text: full.to_string(),
                });
            }
        }

        // --- Pattern 11: "X competes with Y" → CompetesWith -----------------
        // Three alternation branches → groups (1,2), (3,4), (5,6).
        for cap in p.competes_with.captures_iter(text) {
            let full = cap.get(0).map_or("", |m| m.as_str());
            let (subj, obj) =
                extract_two_companies(&cap, &[(1, 2), (3, 4), (5, 6)]);
            if !subj.is_empty() && !obj.is_empty() {
                relations.push(Relation {
                    subject: subj,
                    relation: RelationType::CompetesWith,
                    object: obj,
                    confidence: 0.55,
                    source_text: full.to_string(),
                });
            }
        }

        relations
    }

    /// Extract relations relevant to company-level text (about page, homepage).
    ///
    /// Runs the full extractor but keeps only relations that describe a
    /// company's identity: [`RelationType::LocatedIn`], [`RelationType::FoundedBy`],
    /// [`RelationType::RaisedFunding`], [`RelationType::HasTechStack`],
    /// and [`RelationType::PartnersWith`].
    pub fn extract_company_relations(&self, text: &str) -> Vec<Relation> {
        self.extract(text)
            .into_iter()
            .filter(|r| {
                matches!(
                    r.relation,
                    RelationType::LocatedIn
                        | RelationType::FoundedBy
                        | RelationType::RaisedFunding { .. }
                        | RelationType::HasTechStack { .. }
                        | RelationType::PartnersWith
                )
            })
            .collect()
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
            RelationType::HasTechStack {
                tool: String::new(),
            },
            RelationType::RaisedFunding {
                round: String::new(),
                amount: None,
            },
            RelationType::PartnersWith,
            RelationType::CompetesWith,
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

/// Given a list of (subject_group, object_group) index pairs, return the
/// first populated pair as (subject, object).  Used to handle regex
/// alternations where multiple branch groups exist.
fn extract_two_companies(
    cap: &regex::Captures<'_>,
    pairs: &[(usize, usize)],
) -> (String, String) {
    for &(si, oi) in pairs {
        let s = trim_capture(cap, si);
        let o = trim_capture(cap, oi);
        if !s.is_empty() && !o.is_empty() {
            return (s, o);
        }
    }
    (String::new(), String::new())
}

/// Normalise a matched tool name: strip any trailing punctuation that leaked
/// in and convert "Node.js" regex fragment back to canonical display form.
fn normalise_tool(raw: &str) -> String {
    // The regex stores "Node\\.js" as a literal pattern; what actually matches
    // is "Node.js" — no extra normalisation needed beyond trimming.
    raw.trim().to_string()
}

/// Normalise a matched funding round string ("Series A", "Seed", etc.).
fn normalise_round(raw: &str) -> String {
    // Collapse any internal whitespace and title-case.
    raw.split_whitespace()
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().to_string() + c.as_str(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
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
            RelationType::PartnersWith,
            RelationType::CompetesWith,
        ];
        for v in &variants {
            assert_eq!(RelationType::from_str(v.as_str()), Some(v.clone()));
        }
    }

    #[test]
    fn relation_type_parameterised_as_str() {
        assert_eq!(
            RelationType::HasTechStack {
                tool: "React".into()
            }
            .as_str(),
            "HasTechStack"
        );
        assert_eq!(
            RelationType::RaisedFunding {
                round: "Series A".into(),
                amount: Some(5.0)
            }
            .as_str(),
            "RaisedFunding"
        );
    }

    #[test]
    fn relation_type_from_str_parameterised() {
        assert!(matches!(
            RelationType::from_str("HasTechStack"),
            Some(RelationType::HasTechStack { .. })
        ));
        assert!(matches!(
            RelationType::from_str("RaisedFunding"),
            Some(RelationType::RaisedFunding { .. })
        ));
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

    #[test]
    fn extracts_works_at_multi_word_title() {
        let text = "Alice Brown, Head of Engineering at DataCo, joined the panel.";
        let rels = extractor().extract(text);
        let works_at: Vec<_> = rels
            .iter()
            .filter(|r| r.relation == RelationType::WorksAt)
            .collect();
        assert!(
            !works_at.is_empty(),
            "expected WorksAt for multi-word title"
        );
        assert!(works_at[0].subject.contains("Alice Brown"));
    }

    #[test]
    fn extracts_works_at_vp_title() {
        let text = "Bob Singh, VP of Sales at CloudCo, closed the deal.";
        let rels = extractor().extract(text);
        let works_at: Vec<_> = rels
            .iter()
            .filter(|r| r.relation == RelationType::WorksAt)
            .collect();
        assert!(!works_at.is_empty(), "expected WorksAt for VP of Sales at");
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

    #[test]
    fn extracts_co_founded_by() {
        let text = "Stripe was co-founded by Patrick Collison in 2010.";
        let rels = extractor().extract(text);
        let founded: Vec<_> = rels
            .iter()
            .filter(|r| r.relation == RelationType::FoundedBy)
            .collect();
        assert!(
            !founded.is_empty(),
            "expected FoundedBy for co-founded by pattern"
        );
        assert!(
            founded[0].object.contains("Patrick Collison"),
            "object should be Patrick Collison, got: {}",
            founded[0].object
        );
    }

    #[test]
    fn extracts_started_by() {
        let text = "The company was started by Maria Garcia back in 2015.";
        let rels = extractor().extract(text);
        let founded: Vec<_> = rels
            .iter()
            .filter(|r| r.relation == RelationType::FoundedBy)
            .collect();
        assert!(
            !founded.is_empty(),
            "expected FoundedBy for started by pattern"
        );
        assert!(founded[0].object.contains("Maria Garcia"));
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

    #[test]
    fn extracts_remote_first_as_located_in_remote() {
        let text = "We are a remote-first company building the future of work.";
        let rels = extractor().extract(text);
        let located: Vec<_> = rels
            .iter()
            .filter(|r| r.relation == RelationType::LocatedIn)
            .collect();
        assert!(!located.is_empty(), "expected LocatedIn(Remote) for remote-first");
        assert!(
            located.iter().any(|r| r.object == "Remote"),
            "expected object == Remote, got: {:?}",
            located.iter().map(|r| &r.object).collect::<Vec<_>>()
        );
        let conf = located
            .iter()
            .find(|r| r.object == "Remote")
            .unwrap()
            .confidence;
        assert!(
            (conf - 0.90).abs() < f64::EPSILON,
            "expected confidence 0.90, got {conf}"
        );
    }

    #[test]
    fn extracts_fully_remote_as_located_in_remote() {
        let text = "Our team is fully remote and distributed across 30 countries.";
        let rels = extractor().extract(text);
        assert!(
            rels.iter()
                .any(|r| r.relation == RelationType::LocatedIn && r.object == "Remote"),
            "expected LocatedIn(Remote) for fully remote"
        );
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
        let rels = extractor().extract("Alice Smith reports to Alice Smith.");
        let reports: Vec<_> = rels
            .iter()
            .filter(|r| r.relation == RelationType::ReportsTo)
            .collect();
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

    // --- Pattern 8: HasTechStack --------------------------------------------

    #[test]
    fn extracts_has_tech_stack_built_with() {
        let text = "Our platform is built with React and powers millions of users.";
        let rels = extractor().extract(text);
        let tech: Vec<_> = rels
            .iter()
            .filter(|r| matches!(r.relation, RelationType::HasTechStack { .. }))
            .collect();
        assert!(!tech.is_empty(), "expected HasTechStack for built with React");
        let tool = match &tech[0].relation {
            RelationType::HasTechStack { tool } => tool.as_str(),
            _ => "",
        };
        assert_eq!(tool, "React", "tool should be React, got: {tool}");
        assert!(
            (tech[0].confidence - 0.70).abs() < f64::EPSILON,
            "expected confidence 0.70"
        );
    }

    #[test]
    fn extracts_has_tech_stack_powered_by() {
        let text = "The service is powered by Kubernetes under the hood.";
        let rels = extractor().extract(text);
        assert!(
            rels.iter().any(|r| matches!(
                &r.relation,
                RelationType::HasTechStack { tool } if tool == "Kubernetes"
            )),
            "expected HasTechStack(Kubernetes)"
        );
    }

    #[test]
    fn extracts_has_tech_stack_based_suffix() {
        let text = "We ship a Docker-based deployment pipeline.";
        let rels = extractor().extract(text);
        assert!(
            rels.iter().any(|r| matches!(
                &r.relation,
                RelationType::HasTechStack { tool } if tool == "Docker"
            )),
            "expected HasTechStack(Docker) from Docker-based"
        );
    }

    // --- Pattern 9: RaisedFunding -------------------------------------------

    #[test]
    fn extracts_raised_funding_series_a() {
        let text = "The startup raised $5M in Series A led by Sequoia.";
        let rels = extractor().extract(text);
        let funding: Vec<_> = rels
            .iter()
            .filter(|r| matches!(r.relation, RelationType::RaisedFunding { .. }))
            .collect();
        assert!(!funding.is_empty(), "expected RaisedFunding for $5M Series A");
        match &funding[0].relation {
            RelationType::RaisedFunding { round, amount } => {
                assert_eq!(round, "Series A", "round should be Series A, got: {round}");
                assert_eq!(*amount, Some(5.0), "amount should be 5.0M");
            }
            _ => panic!("expected RaisedFunding"),
        }
        assert!(
            (funding[0].confidence - 0.85).abs() < f64::EPSILON,
            "expected confidence 0.85"
        );
    }

    #[test]
    fn extracts_raised_funding_seed() {
        let text = "Acme closed a $2M Seed round last month.";
        let rels = extractor().extract(text);
        assert!(
            rels.iter().any(|r| matches!(
                &r.relation,
                RelationType::RaisedFunding { round, .. } if round == "Seed"
            )),
            "expected RaisedFunding(Seed)"
        );
    }

    #[test]
    fn extracts_raised_funding_billion() {
        let text = "The firm announced $1B in Series C.";
        let rels = extractor().extract(text);
        let funding: Vec<_> = rels
            .iter()
            .filter(|r| matches!(r.relation, RelationType::RaisedFunding { .. }))
            .collect();
        assert!(!funding.is_empty(), "expected RaisedFunding for $1B Series C");
        match &funding[0].relation {
            RelationType::RaisedFunding { amount, .. } => {
                // 1 billion stored as 1000 millions
                assert_eq!(*amount, Some(1000.0));
            }
            _ => panic!("expected RaisedFunding"),
        }
    }

    // --- Pattern 10: PartnersWith -------------------------------------------

    #[test]
    fn extracts_partners_with() {
        let text = "Salesforce partners with ServiceNow on enterprise automation.";
        let rels = extractor().extract(text);
        assert!(
            rels.iter().any(|r| r.relation == RelationType::PartnersWith),
            "expected PartnersWith"
        );
    }

    #[test]
    fn extracts_partnership_announced() {
        let text = "Stripe announced partnership with Shopify to streamline payments.";
        let rels = extractor().extract(text);
        assert!(
            rels.iter().any(|r| r.relation == RelationType::PartnersWith),
            "expected PartnersWith from announced partnership"
        );
    }

    // --- Pattern 11: CompetesWith -------------------------------------------

    #[test]
    fn extracts_competes_with() {
        let text = "Notion competes with Confluence in the knowledge management space.";
        let rels = extractor().extract(text);
        assert!(
            rels.iter().any(|r| r.relation == RelationType::CompetesWith),
            "expected CompetesWith"
        );
    }

    // --- extract_company_relations ------------------------------------------

    #[test]
    fn extract_company_relations_filters_correctly() {
        let text = concat!(
            "Acme Corp was founded by Jane Smith. ",
            "The company is fully remote. ",
            "It raised $10M in Series A. ",
            "The platform is built with React. ",
            "Alice Brown reports to Bob Green.",
        );
        let rels = extractor().extract_company_relations(text);
        // ReportsTo should be filtered out.
        assert!(
            !rels.iter().any(|r| r.relation == RelationType::ReportsTo),
            "ReportsTo should be filtered out of company relations"
        );
        // FoundedBy, LocatedIn, RaisedFunding, HasTechStack should be present.
        assert!(
            rels.iter().any(|r| r.relation == RelationType::FoundedBy),
            "expected FoundedBy"
        );
        assert!(
            rels.iter().any(|r| r.relation == RelationType::LocatedIn),
            "expected LocatedIn"
        );
        assert!(
            rels.iter()
                .any(|r| matches!(r.relation, RelationType::RaisedFunding { .. })),
            "expected RaisedFunding"
        );
        assert!(
            rels.iter()
                .any(|r| matches!(r.relation, RelationType::HasTechStack { .. })),
            "expected HasTechStack"
        );
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
        assert!(types.contains(&&RelationType::WorksAt), "expected WorksAt");
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

    #[test]
    fn parse_llm_relations_new_types_parsed() {
        let raw = r#"[
            {"subject":"Acme","relation_type":"HasTechStack","object":"React","confidence":0.7},
            {"subject":"Acme","relation_type":"RaisedFunding","object":"Series A","confidence":0.85},
            {"subject":"Acme","relation_type":"PartnersWith","object":"BigCo","confidence":0.65},
            {"subject":"Acme","relation_type":"CompetesWith","object":"RivalCo","confidence":0.55}
        ]"#;
        let rels = parse_llm_relations(raw);
        assert_eq!(rels.len(), 4);
        assert!(matches!(rels[0].relation, RelationType::HasTechStack { .. }));
        assert!(matches!(rels[1].relation, RelationType::RaisedFunding { .. }));
        assert_eq!(rels[2].relation, RelationType::PartnersWith);
        assert_eq!(rels[3].relation, RelationType::CompetesWith);
    }
}
