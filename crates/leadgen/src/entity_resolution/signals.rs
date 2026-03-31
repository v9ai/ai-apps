use serde::{Deserialize, Serialize};

use crate::types::{Company, Contact};

/// A single match signal between two entity records.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchSignal {
    pub signal_type: SignalType,
    pub score: f64,
    pub weight: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SignalType {
    // Contact-level signals
    NameSimilarity,
    ExactEmail,
    EmailLocalPart,
    DomainMatch,
    TitleSimilarity,
    LinkedInMatch,
    PhoneMatch,
    EmbeddingSimilarity,
    // Company-level signals
    CompanyNameSimilarity,
    CompanyDomainExact,
    CompanyDomainNormalized,
    CompanyIndustryMatch,
}

/// Weighted composite of multiple match signals.
pub fn composite_match_score(signals: &[MatchSignal]) -> f64 {
    let (weighted_sum, weight_sum) = signals
        .iter()
        .fold((0.0, 0.0), |(ws, wt), s| (ws + s.score * s.weight, wt + s.weight));
    if weight_sum > 0.0 {
        weighted_sum / weight_sum
    } else {
        0.0
    }
}

/// Build a MatchSignal from a pre-computed embedding cosine similarity score.
///
/// Returns `Some` only when `sim > 0.7`, preventing low-confidence vectors from
/// polluting the composite score.  The weight (4.0) sits between name similarity
/// (3.0) and an exact email match (10.0), reflecting that embeddings give a
/// strong-but-not-definitive identity signal.
///
/// This function is pure and synchronous — the caller is responsible for
/// computing the similarity before calling this.
pub fn compute_embedding_signal(sim: f64) -> Option<MatchSignal> {
    if sim > 0.7 {
        Some(MatchSignal {
            signal_type: SignalType::EmbeddingSimilarity,
            score: sim,
            weight: 4.0,
        })
    } else {
        None
    }
}

/// Compute all applicable match signals between two contacts.
pub fn compute_signals(a: &Contact, b: &Contact) -> Vec<MatchSignal> {
    let mut signals = Vec::new();

    // Name similarity (Jaro-Winkler)
    let name_a = format!("{} {}", a.first_name, a.last_name).to_lowercase();
    let name_b = format!("{} {}", b.first_name, b.last_name).to_lowercase();
    let name_sim = strsim::jaro_winkler(&name_a, &name_b);
    if name_sim > 0.75 {
        signals.push(MatchSignal {
            signal_type: SignalType::NameSimilarity,
            score: name_sim,
            weight: 3.0,
        });
    }

    // Exact email match
    if let (Some(ea), Some(eb)) = (&a.email, &b.email) {
        let ea_lower = ea.to_lowercase();
        let eb_lower = eb.to_lowercase();
        if !ea_lower.is_empty() && ea_lower == eb_lower {
            signals.push(MatchSignal {
                signal_type: SignalType::ExactEmail,
                score: 1.0,
                weight: 10.0,
            });
        } else {
            // Email local part match (same person, different domain = job change)
            let la = ea_lower.split('@').next().unwrap_or("");
            let lb = eb_lower.split('@').next().unwrap_or("");
            if !la.is_empty() && la == lb && la.len() > 3 {
                signals.push(MatchSignal {
                    signal_type: SignalType::EmailLocalPart,
                    score: 0.7,
                    weight: 2.0,
                });
            }
        }
    }

    // LinkedIn URL match
    if let (Some(la), Some(lb)) = (&a.linkedin_url, &b.linkedin_url) {
        if !la.is_empty() && normalize_linkedin(la) == normalize_linkedin(lb) {
            signals.push(MatchSignal {
                signal_type: SignalType::LinkedInMatch,
                score: 1.0,
                weight: 10.0,
            });
        }
    }

    // Domain match (same company)
    let domain_a = a.email.as_deref().and_then(|e| e.split('@').nth(1));
    let domain_b = b.email.as_deref().and_then(|e| e.split('@').nth(1));
    if let (Some(da), Some(db)) = (domain_a, domain_b) {
        if !da.is_empty() && da.to_lowercase() == db.to_lowercase() {
            signals.push(MatchSignal {
                signal_type: SignalType::DomainMatch,
                score: 1.0,
                weight: 1.0,
            });
        }
    }

    // Phone match
    if let (Some(pa), Some(pb)) = (&a.phone, &b.phone) {
        let na = normalize_phone(pa);
        let nb = normalize_phone(pb);
        if !na.is_empty() && na == nb {
            signals.push(MatchSignal {
                signal_type: SignalType::PhoneMatch,
                score: 1.0,
                weight: 8.0,
            });
        }
    }

    // Title similarity
    if let (Some(ta), Some(tb)) = (&a.title, &b.title) {
        let sim = strsim::jaro_winkler(&ta.to_lowercase(), &tb.to_lowercase());
        if sim > 0.85 {
            signals.push(MatchSignal {
                signal_type: SignalType::TitleSimilarity,
                score: sim,
                weight: 1.0,
            });
        }
    }

    signals
}

fn normalize_linkedin(url: &str) -> String {
    url.to_lowercase()
        .trim_end_matches('/')
        .replace("http://", "https://")
        .replace("www.linkedin.com", "linkedin.com")
        .to_string()
}

fn normalize_phone(phone: &str) -> String {
    phone.chars().filter(|c| c.is_ascii_digit()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_contact(id: &str, first: &str, last: &str, email: Option<&str>) -> Contact {
        Contact {
            id: id.into(),
            company_id: None,
            first_name: first.into(),
            last_name: last.into(),
            title: None,
            seniority: None,
            department: None,
            email: email.map(Into::into),
            email_status: None,
            linkedin_url: None,
            phone: None,
            source: None,
            created_at: None,
        }
    }

    #[test]
    fn exact_email_match_scores_high() {
        let a = make_contact("1", "John", "Doe", Some("john@acme.com"));
        let b = make_contact("2", "Johnny", "Doe", Some("john@acme.com"));
        let sigs = compute_signals(&a, &b);
        let score = composite_match_score(&sigs);
        assert!(score > 0.9, "exact email should produce high score: {score}");
    }

    #[test]
    fn different_people_score_low() {
        let a = make_contact("1", "John", "Doe", Some("john@acme.com"));
        let b = make_contact("2", "Jane", "Smith", Some("jane@other.com"));
        let sigs = compute_signals(&a, &b);
        let score = composite_match_score(&sigs);
        assert!(score < 0.5, "different people should score low: {score}");
    }

    #[test]
    fn empty_signals_score_zero() {
        assert_eq!(composite_match_score(&[]), 0.0);
    }
}
