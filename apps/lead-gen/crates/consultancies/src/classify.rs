use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ClassificationResult {
    pub is_consultancy: bool,
    pub is_ai_focused: bool,
    pub consultancy_score: f32,
    pub ai_score: f32,
    pub ai_tier: i32,
    pub keyword_hits: Vec<String>,
    pub ai_keyword_hits: Vec<String>,
    pub anti_hits: Vec<String>,
}

const STRONG_CONSULTANCY: &[&str] = &[
    "consulting firm",
    "consultancy",
    "consulting services",
    "management consulting",
    "technology consulting",
    "digital transformation consulting",
    "strategy consulting",
    "advisory services",
    "professional services firm",
    "we help clients",
    "our consulting",
    "our consultants",
    "engagement model",
    "client engagements",
    "consulting practice",
    "consulting partner",
];

const MODERATE_CONSULTANCY: &[&str] = &[
    "consulting",
    "advisory",
    "professional services",
    "enterprise solutions",
    "bespoke solutions",
    "strategic partner",
    "implementation partner",
    "managed services",
    "solution provider",
    "service provider",
    "we work with",
    "our clients",
    "client success",
    "industry expertise",
];

const ANTI_CONSULTANCY: &[&str] = &[
    "recruitment agency",
    "staffing",
    "we recruit",
    "placing candidates",
    "job board",
    "submit your cv",
    "e-commerce",
    "add to cart",
    "marketplace",
    "download our app",
    "free trial",
    "sign up free",
    "casino",
    "gambling",
    "crypto exchange",
    "nft marketplace",
];

const STRONG_AI: &[&str] = &[
    "machine learning",
    "artificial intelligence",
    "deep learning",
    "neural network",
    "natural language processing",
    "computer vision",
    "generative ai",
    "large language model",
    "llm",
    "mlops",
    "ml engineering",
    "ai strategy",
    "data science consulting",
    "ai consulting",
    "ai research",
    "foundation model",
    "transformer model",
    "reinforcement learning",
];

const MODERATE_AI: &[&str] = &[
    "data science",
    "predictive analytics",
    "recommendation engine",
    "nlp",
    "pytorch",
    "tensorflow",
    "hugging face",
    "ai-powered",
    "intelligent automation",
    "ml platform",
    "model training",
    "model deployment",
    "feature store",
    "vector database",
    "embeddings",
    "fine-tuning",
    "prompt engineering",
];

const OFFSHORE_SIGNALS: &[&str] = &[
    "bangalore",
    "bengaluru",
    "hyderabad",
    "pune",
    "mumbai",
    "chennai",
    "noida",
    "gurgaon",
    "delhi",
    "kolkata",
    "manila",
    "cebu",
    "lahore",
    "karachi",
    "islamabad",
    "dhaka",
    "chittagong",
    "headquartered in india",
    "based in india",
    "headquartered in philippines",
    "based in philippines",
    "headquartered in pakistan",
    "headquartered in bangladesh",
    "headquartered in vietnam",
    "ho chi minh",
    "hanoi",
];

pub fn classify(text: &str) -> ClassificationResult {
    let lower = text.to_lowercase();

    let mut keyword_hits = Vec::new();
    let mut strong_c = 0u32;
    for kw in STRONG_CONSULTANCY {
        if lower.contains(kw) {
            strong_c += 1;
            keyword_hits.push(kw.to_string());
        }
    }
    let mut moderate_c = 0u32;
    for kw in MODERATE_CONSULTANCY {
        if lower.contains(kw) {
            moderate_c += 1;
            keyword_hits.push(kw.to_string());
        }
    }

    let mut anti_hits = Vec::new();
    for kw in ANTI_CONSULTANCY {
        if lower.contains(kw) {
            anti_hits.push(kw.to_string());
        }
    }

    let mut ai_keyword_hits = Vec::new();
    let mut strong_ai = 0u32;
    for kw in STRONG_AI {
        if lower.contains(kw) {
            strong_ai += 1;
            ai_keyword_hits.push(kw.to_string());
        }
    }
    let mut moderate_ai = 0u32;
    for kw in MODERATE_AI {
        if lower.contains(kw) {
            moderate_ai += 1;
            ai_keyword_hits.push(kw.to_string());
        }
    }

    let is_consultancy = (strong_c >= 2)
        || (strong_c >= 1 && moderate_c >= 2 && anti_hits.is_empty());

    let is_ai_focused = strong_ai >= 1 || moderate_ai >= 3;

    let consultancy_score =
        ((strong_c as f32 * 0.15 + moderate_c as f32 * 0.05).min(0.5)
            + if strong_c > 0 { 0.5 } else { 0.0 })
        .min(1.0);

    let ai_score =
        ((strong_ai as f32 * 0.15 + moderate_ai as f32 * 0.05).min(0.5)
            + if strong_ai > 0 { 0.5 } else { 0.0 })
        .min(1.0);

    let ai_tier = if strong_ai >= 2 {
        2
    } else if strong_ai >= 1 || moderate_ai >= 3 {
        1
    } else {
        0
    };

    ClassificationResult {
        is_consultancy,
        is_ai_focused,
        consultancy_score,
        ai_score,
        ai_tier,
        keyword_hits,
        ai_keyword_hits,
        anti_hits,
    }
}

pub fn is_offshore_location(text: &str) -> bool {
    let lower = text.to_lowercase();
    OFFSHORE_SIGNALS.iter().any(|s| lower.contains(s))
}
