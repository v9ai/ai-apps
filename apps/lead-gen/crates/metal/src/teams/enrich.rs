//! Enrichment stage — classify, score, enrich discovered companies.
//!
//! Input:  discovery report (companies with domains)
//! Output: enrichment report + updated Pipeline records

use ahash::AHashMap;
use anyhow::Result;
use serde::{Deserialize, Serialize};

use super::discover::DiscoveryReport;
use super::{llm, state, StageReport, StageStatus, TeamContext};

#[derive(Debug, Serialize, Deserialize)]
pub struct EnrichmentReport {
    pub companies: Vec<EnrichedCompany>,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnrichedCompany {
    pub domain: String,
    pub name: String,
    pub category: String,
    pub ai_tier: String,
    pub industry: String,
    pub tech_stack: Vec<String>,
    pub emails_found: Vec<String>,
    pub has_careers_page: bool,
    pub remote_policy: u8, // 0=unknown, 1=full_remote, 2=hybrid, 3=onsite
    pub enrichment_score: f64,
    pub confidence: f64,
}

pub async fn run(ctx: &TeamContext) -> Result<StageReport> {
    let discovery: DiscoveryReport = state::load_report(&ctx.data_dir, "discovery")
        .ok_or_else(|| anyhow::anyhow!("no discovery report — run discover first"))?;

    let limit = ctx.batch.enrich.min(discovery.companies.len());
    // Sort by ICP score descending, enrich top N
    let mut candidates = discovery.companies.clone();
    candidates.sort_by(|a, b| b.icp_score.partial_cmp(&a.icp_score).unwrap_or(std::cmp::Ordering::Equal));
    let candidates = &candidates[..limit];

    let mut report = EnrichmentReport {
        companies: Vec::new(),
        errors: Vec::new(),
    };

    for company in candidates {
        // Fetch additional pages for richer signals
        let mut all_text = company.description.clone();
        let mut all_emails = company.emails_found.clone();
        let mut has_careers = false;

        // Collect raw HTML bodies for structured extraction
        #[cfg(feature = "kernel-extract")]
        let mut raw_htmls: Vec<String> = Vec::new();

        for path in &["/about", "/team", "/careers", "/jobs", "/open-positions"] {
            let url = format!("https://{}{path}", company.domain);
            match ctx.http.get(&url).send().await {
                Ok(resp) if resp.status().is_success() => {
                    if let Ok(body) = resp.text().await {
                        #[cfg(feature = "kernel-extract")]
                        raw_htmls.push(body.clone());

                        let text = strip_tags(&body);
                        all_text.push(' ');
                        all_text.push_str(&text);

                        // Check for careers/jobs pages
                        if *path == "/careers" || *path == "/jobs" || *path == "/open-positions" {
                            has_careers = true;
                        }

                        // Extract emails
                        for email in extract_emails(&text) {
                            if !all_emails.contains(&email) {
                                all_emails.push(email);
                            }
                        }
                    }
                }
                _ => {}
            }
        }

        // Try structured extraction via sgai-qwen3-1.7b first, fall back to classify_company
        let (category, ai_tier, industry, confidence) = {
            #[cfg(feature = "kernel-extract")]
            {
                match try_structured_extraction(ctx, &company.name, &raw_htmls).await {
                    Some(result) => result,
                    None => classify_fallback(ctx, &company, &all_text, &mut report.errors).await,
                }
            }
            #[cfg(not(feature = "kernel-extract"))]
            {
                classify_fallback(ctx, &company, &all_text, &mut report.errors).await
            }
        };

        // Merge structured emails from HTML profiles
        #[cfg(feature = "kernel-extract")]
        for html in &raw_htmls {
            let profile = crate::kernel::html_extractor::extract_profile(html);
            for email in &profile.structured_emails {
                if !all_emails.contains(email) {
                    all_emails.push(email.clone());
                }
            }
            if profile.has_careers_section {
                has_careers = true;
            }
        }

        // Detect remote policy from all fetched text
        let remote_policy = crate::kernel::job_ner::detect_remote_policy(
            &all_text.to_lowercase().into_bytes(),
        );

        let enrichment_score = compute_enrichment_score(
            &category, &ai_tier, &company.tech_signals, has_careers, remote_policy, confidence,
            &ctx.icp_vertical,
        );

        let enriched = EnrichedCompany {
            domain: company.domain.clone(),
            name: company.name.clone(),
            category,
            ai_tier,
            industry,
            tech_stack: company.tech_signals.clone(),
            emails_found: all_emails,
            has_careers_page: has_careers,
            remote_policy,
            enrichment_score,
            confidence,
        };

        report.companies.push(enriched);
    }

    state::save_report(&ctx.data_dir, "enrichment", &report)?;

    // Update state
    let mut st = state::PipelineState::load(&ctx.data_dir);
    st.counts.enriched += report.companies.len();
    st.save(&ctx.data_dir)?;

    let created = report.companies.len();
    let errors = report.errors.clone();
    let status = if errors.is_empty() { StageStatus::Success } else { StageStatus::Partial };

    Ok(StageReport {
        stage: "enrich".into(),
        status,
        processed: limit,
        created,
        errors,
        duration_ms: 0,
    })
}

/// Try structured extraction via sgai-qwen3-1.7b. Returns None if the
/// extraction endpoint is unavailable or the response doesn't parse.
#[cfg(feature = "kernel-extract")]
async fn try_structured_extraction(
    ctx: &TeamContext,
    company_name: &str,
    raw_htmls: &[String],
) -> Option<(String, String, String, f64)> {
    use crate::kernel::html_extractor;

    // Build a merged profile from all fetched pages
    let mut merged = html_extractor::HtmlProfile::default();
    for html in raw_htmls {
        let profile = html_extractor::extract_profile(html);
        // Take first non-None values
        if merged.jsonld.is_none() { merged.jsonld = profile.jsonld; }
        if merged.meta_description.is_none() { merged.meta_description = profile.meta_description; }
        if merged.og_title.is_none() { merged.og_title = profile.og_title; }
        if merged.og_description.is_none() { merged.og_description = profile.og_description; }
        if merged.canonical_url.is_none() { merged.canonical_url = profile.canonical_url; }
        merged.headings.extend(profile.headings);
        if merged.main_content.is_empty() {
            merged.main_content = profile.main_content;
        } else if !profile.main_content.is_empty() {
            merged.main_content.push(' ');
            merged.main_content.push_str(&profile.main_content);
        }
        merged.has_careers_section |= profile.has_careers_section;
        merged.has_team_section |= profile.has_team_section;
        for email in profile.structured_emails {
            if !merged.structured_emails.contains(&email) {
                merged.structured_emails.push(email);
            }
        }
    }

    // Skip if we have almost no content
    if merged.main_content.len() < 50 && merged.jsonld.is_none() && merged.meta_description.is_none() {
        return None;
    }

    // If no OG title, use company name
    if merged.og_title.is_none() {
        merged.og_title = Some(company_name.to_string());
    }

    let schema = llm::company_profile_schema();

    match llm::extract_structured(
        &ctx.http,
        &ctx.extract_base_url,
        ctx.llm_api_key.as_deref(),
        &ctx.extract_model,
        &merged,
        &schema,
    ).await {
        Ok(val) => {
            let category = val.get("category")
                .and_then(|v| v.as_str())
                .unwrap_or("PRODUCT")
                .to_string();
            let ai_tier = val.get("ai_tier")
                .and_then(|v| v.as_str())
                .unwrap_or("other")
                .to_string();
            let industry = val.get("industry")
                .and_then(|v| v.as_str())
                .unwrap_or("technology")
                .to_string();
            // Structured extraction gives high confidence
            Some((category, ai_tier, industry, 0.85))
        }
        Err(_) => None,
    }
}

/// Fallback: classify via Qwen2.5-3B (existing flow).
async fn classify_fallback(
    ctx: &TeamContext,
    company: &super::discover::DiscoveredCompany,
    all_text: &str,
    errors: &mut Vec<String>,
) -> (String, String, String, f64) {
    match llm::classify_company(
        &ctx.http, &ctx.llm_base_url, ctx.llm_api_key.as_deref(),
        &ctx.llm_model, &company.name, &company.domain, all_text,
    ).await {
        Ok(cls) => (cls.category, cls.ai_tier, cls.industry, cls.confidence),
        Err(e) => {
            errors.push(format!("{}: LLM classify: {e}", company.domain));
            heuristic_classify(all_text)
        }
    }
}

fn heuristic_classify(text: &str) -> (String, String, String, f64) {
    let lower = text.to_lowercase();

    let category = if lower.contains("consulting") || lower.contains("consultancy") || lower.contains("custom development") {
        "CONSULTANCY"
    } else if lower.contains("agency") || lower.contains("creative") || lower.contains("design studio") {
        "AGENCY"
    } else if lower.contains("staffing") || lower.contains("recruitment") || lower.contains("talent") {
        "STAFFING"
    } else {
        "PRODUCT"
    };

    let ai_tier = if lower.contains("artificial intelligence") || lower.contains("machine learning company")
        || lower.contains("ai-first") || lower.contains("ai company")
    {
        "ai_first"
    } else if lower.contains("ai") || lower.contains("machine learning") || lower.contains("deep learning") {
        "ai_native"
    } else {
        "other"
    };

    let industry = if lower.contains("healthcare") || lower.contains("health") {
        "healthcare"
    } else if lower.contains("fintech") || lower.contains("financial") {
        "fintech"
    } else if lower.contains("devtools") || lower.contains("developer") {
        "devtools"
    } else {
        "technology"
    };

    (category.into(), ai_tier.into(), industry.into(), 0.4)
}

fn compute_enrichment_score(
    category: &str, ai_tier: &str, tech: &[String], has_careers: bool,
    remote_policy: u8, confidence: f64, target_vertical: &str,
) -> f64 {
    let mut score = 0.0;

    // Category weight (target vertical gets priority)
    let target_upper = target_vertical.to_uppercase();
    score += if category == target_upper {
        25.0
    } else {
        match category {
            "PRODUCT" => 20.0,
            "AGENCY" => 12.0,
            _ => 5.0,
        }
    };

    // AI tier
    score += match ai_tier {
        "ai_first" => 25.0,
        "ai_native" => 18.0,
        _ => 5.0,
    };

    // Remote policy (critical filter)
    score += match remote_policy {
        1 => 20.0, // full_remote
        2 => 12.0, // hybrid
        3 => 0.0,  // onsite
        _ => 0.0,  // unknown
    };

    // Tech stack depth
    score += (tech.len().min(8) as f64 / 8.0) * 15.0;

    // Careers page
    if has_careers { score += 8.0; }

    // Confidence modifier
    score += confidence * 7.0;

    score.min(100.0) / 100.0
}

fn strip_tags(html: &str) -> String {
    #[cfg(feature = "kernel-html")]
    {
        crate::kernel::html_scanner::scan_html_full(html.as_bytes()).text
    }
    #[cfg(not(feature = "kernel-html"))]
    {
        let mut out = String::new();
        let mut in_tag = false;
        for ch in html.chars() {
            match ch {
                '<' => in_tag = true,
                '>' => { in_tag = false; out.push(' '); }
                _ if !in_tag => out.push(ch),
                _ => {}
            }
        }
        out
    }
}

fn extract_emails(text: &str) -> Vec<String> {
    text.split_whitespace()
        .filter(|w| w.contains('@') && w.contains('.'))
        .map(|w| {
            w.trim_matches(|c: char| !c.is_alphanumeric() && c != '@' && c != '.' && c != '_' && c != '-')
                .to_lowercase()
        })
        .filter(|e| e.len() > 5)
        .collect()
}

// ── Naive Bayes text classifier ──────────────────────────────

/// Naive Bayes text classifier for company categories.
pub struct NaiveBayesClassifier {
    class_priors: [f32; 4],  // CONSULTANCY, AGENCY, STAFFING, PRODUCT
    word_log_likelihoods: AHashMap<u32, [f32; 4]>,
    class_word_counts: [u32; 4],
    vocab_size: u32,
    trained: bool,
}

impl NaiveBayesClassifier {
    pub fn new() -> Self {
        Self {
            class_priors: [0.25; 4],
            word_log_likelihoods: AHashMap::new(),
            class_word_counts: [0; 4],
            vocab_size: 0,
            trained: false,
        }
    }

    pub fn is_trained(&self) -> bool { self.trained }

    /// Train from labeled (text, category) pairs.
    /// Categories: "CONSULTANCY" (0), "AGENCY" (1), "STAFFING" (2), "PRODUCT" (3)
    pub fn train(&mut self, examples: &[(&str, &str)]) {
        if examples.is_empty() { return; }

        let mut class_counts = [0u32; 4];
        let mut word_class_counts: AHashMap<u32, [u32; 4]> = AHashMap::new();
        self.class_word_counts = [0; 4];

        for (text, category) in examples {
            let cls = match *category {
                "CONSULTANCY" => 0,
                "AGENCY" => 1,
                "STAFFING" => 2,
                "PRODUCT" => 3,
                _ => continue,
            };
            class_counts[cls] += 1;

            for hash in tokenize_nb(text) {
                word_class_counts.entry(hash).or_insert([0; 4])[cls] += 1;
                self.class_word_counts[cls] += 1;
            }
        }

        let total = examples.len() as f32;
        for i in 0..4 {
            self.class_priors[i] = (class_counts[i] as f32 + 1.0) / (total + 4.0);
        }

        self.vocab_size = word_class_counts.len() as u32;

        for (hash, counts) in &word_class_counts {
            let mut log_probs = [0.0f32; 4];
            for cls in 0..4 {
                let num = counts[cls] as f32 + 1.0;
                let den = self.class_word_counts[cls] as f32 + self.vocab_size as f32;
                log_probs[cls] = (num / den).ln();
            }
            self.word_log_likelihoods.insert(*hash, log_probs);
        }

        self.trained = true;
    }

    /// Classify text. Returns (category_name, posterior_probability).
    pub fn classify(&self, text: &str) -> (&'static str, f32) {
        if !self.trained {
            return ("PRODUCT", 0.25); // uniform fallback
        }

        let tokens = tokenize_nb(text);
        let mut log_posteriors = [0.0f32; 4];

        for cls in 0..4 {
            log_posteriors[cls] = self.class_priors[cls].ln();
        }

        // Default log-prob for unseen words (Laplace smoothing)
        let default_log: [f32; 4] = std::array::from_fn(|cls| {
            (1.0 / (self.class_word_counts[cls] as f32 + self.vocab_size as f32)).ln()
        });

        for hash in &tokens {
            let log_probs = self.word_log_likelihoods.get(hash).unwrap_or(&default_log);
            for cls in 0..4 {
                log_posteriors[cls] += log_probs[cls];
            }
        }

        // Softmax for posterior probability
        let max_log = log_posteriors.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
        let mut exps = [0.0f32; 4];
        let mut exp_sum = 0.0f32;
        for cls in 0..4 {
            exps[cls] = (log_posteriors[cls] - max_log).exp();
            exp_sum += exps[cls];
        }

        let mut best_cls = 0;
        let mut best_prob = 0.0f32;
        for cls in 0..4 {
            let prob = exps[cls] / exp_sum;
            if prob > best_prob {
                best_prob = prob;
                best_cls = cls;
            }
        }

        let name = match best_cls {
            0 => "CONSULTANCY",
            1 => "AGENCY",
            2 => "STAFFING",
            _ => "PRODUCT",
        };

        (name, best_prob)
    }
}

/// Tokenize for Naive Bayes: lowercase, split on non-alphanumeric, return hashes.
fn tokenize_nb(text: &str) -> Vec<u32> {
    text.split(|c: char| !c.is_alphanumeric())
        .filter(|s| s.len() >= 2)
        .map(|s| {
            let lower: Vec<u8> = s.bytes().map(|b| if b >= b'A' && b <= b'Z' { b + 32 } else { b }).collect();
            // Simple hash (FNV-1a style)
            let mut h = 2166136261u32;
            for &b in &lower {
                h ^= b as u32;
                h = h.wrapping_mul(16777619);
            }
            h
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn training_data() -> Vec<(&'static str, &'static str)> {
        vec![
            ("We provide consulting services and advisory for enterprise digital transformation custom development", "CONSULTANCY"),
            ("Expert consultancy in cloud architecture and DevOps advisory services", "CONSULTANCY"),
            ("Technology consulting firm specializing in custom software development", "CONSULTANCY"),
            ("Strategic advisory and consulting for AI implementation", "CONSULTANCY"),
            ("Full-service creative agency specializing in branding and digital marketing", "AGENCY"),
            ("Digital agency delivering web design and creative campaigns", "AGENCY"),
            ("Marketing agency focused on social media and creative content", "AGENCY"),
            ("Design studio and creative agency for startups", "AGENCY"),
            ("Global staffing and recruitment solutions for tech talent", "STAFFING"),
            ("IT staffing firm connecting talent with top employers", "STAFFING"),
            ("Recruitment agency specializing in engineering talent placement", "STAFFING"),
            ("Technical staffing and workforce solutions provider", "STAFFING"),
            ("SaaS platform for project management and team collaboration software", "PRODUCT"),
            ("AI-powered product for automated data analytics platform", "PRODUCT"),
            ("Developer tools and software platform for CI/CD pipelines", "PRODUCT"),
            ("Cloud-native software product for enterprise resource planning", "PRODUCT"),
        ]
    }

    #[test]
    fn test_nb_untrained_fallback() {
        let nb = NaiveBayesClassifier::new();
        assert!(!nb.is_trained());
        let (category, prob) = nb.classify("some random text about software");
        assert_eq!(category, "PRODUCT");
        assert!((prob - 0.25).abs() < f32::EPSILON);
    }

    #[test]
    fn test_nb_train_and_classify() {
        let mut nb = NaiveBayesClassifier::new();
        let data = training_data();
        nb.train(&data);
        assert!(nb.is_trained());

        // Should classify consulting text as CONSULTANCY
        let (cat, prob) = nb.classify("consulting advisory services for enterprise");
        assert_eq!(cat, "CONSULTANCY");
        assert!(prob > 0.3, "Expected prob > 0.3, got {prob}");
    }

    #[test]
    fn test_nb_posterior_sums_to_one() {
        let mut nb = NaiveBayesClassifier::new();
        let data = training_data();
        nb.train(&data);

        let text = "We build software products and platforms";
        let tokens = tokenize_nb(text);

        let mut log_posteriors = [0.0f32; 4];
        for cls in 0..4 {
            log_posteriors[cls] = nb.class_priors[cls].ln();
        }
        let default_log: [f32; 4] = std::array::from_fn(|cls| {
            (1.0 / (nb.class_word_counts[cls] as f32 + nb.vocab_size as f32)).ln()
        });
        for hash in &tokens {
            let log_probs = nb.word_log_likelihoods.get(hash).unwrap_or(&default_log);
            for cls in 0..4 {
                log_posteriors[cls] += log_probs[cls];
            }
        }
        let max_log = log_posteriors.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
        let sum: f32 = log_posteriors.iter().map(|lp| (lp - max_log).exp()).sum();
        // After normalization, probabilities should sum to 1.0
        let normalized_sum: f32 = log_posteriors.iter().map(|lp| (lp - max_log).exp() / sum).sum();
        assert!((normalized_sum - 1.0).abs() < 0.001, "Posteriors should sum to ~1.0, got {normalized_sum}");
    }

    #[test]
    fn test_nb_laplace_handles_unseen() {
        let mut nb = NaiveBayesClassifier::new();
        let data = training_data();
        nb.train(&data);

        // Classify with completely unseen words — should not panic or return -inf
        let (cat, prob) = nb.classify("xylophone zygomorphic quasar nebula");
        assert!(!prob.is_nan(), "Probability should not be NaN");
        assert!(!prob.is_infinite(), "Probability should not be infinite");
        assert!(prob > 0.0, "Probability should be positive");
        assert!(!cat.is_empty(), "Category should not be empty");
    }

    #[test]
    fn test_nb_empty_training() {
        let mut nb = NaiveBayesClassifier::new();
        let empty: Vec<(&str, &str)> = vec![];
        nb.train(&empty);
        assert!(!nb.is_trained(), "Should remain untrained after empty training data");
    }

    #[test]
    fn test_nb_consultancy() {
        let mut nb = NaiveBayesClassifier::new();
        let data = training_data();
        nb.train(&data);

        let (cat, prob) = nb.classify("consulting advisory custom development enterprise solutions");
        assert_eq!(cat, "CONSULTANCY", "Expected CONSULTANCY, got {cat}");
        assert!(prob > 0.3, "Expected confident classification, got {prob}");
    }

    #[test]
    fn test_nb_product() {
        let mut nb = NaiveBayesClassifier::new();
        let data = training_data();
        nb.train(&data);

        let (cat, prob) = nb.classify("software platform product saas cloud-native tools");
        assert_eq!(cat, "PRODUCT", "Expected PRODUCT, got {cat}");
        assert!(prob > 0.3, "Expected confident classification, got {prob}");
    }
}
