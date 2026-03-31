---
title: "Fine-Tune Qwen3 with LoRA for AI Cold Email Outreach"
description: "How I built an AI cold email engine on Apple Silicon. Fine-tuned Qwen3-1.7B with LoRA on real Resend data. Rust orchestration, quality gates, ~50ms per email. Full code."
og_title: "Automate B2B Outreach: Fine-Tune Qwen3 with LoRA on Apple Silicon"
og_description: "200+ personalized cold emails per batch on a MacBook Pro. No API keys. No per-token billing. Here's the Rust + MLX pipeline behind it."
tags: [qwen, lora, fine-tuning, llm, cold-email, b2b, sales-automation, machine-learning, mlx, apple-silicon, rust]
status: draft
---

An AI cold email engine is a system that automatically generates personalized B2B outreach emails using a fine-tuned language model, quality gates, and human approval — all running locally without cloud API dependencies. This article walks through how I built one using Qwen3-1.7B, LoRA fine-tuning on Apple's MLX framework, and a Rust orchestration layer that generates 200+ emails per batch in under 10 seconds on a single M1 MacBook Pro.

SaaS cold email tools like Instantly, Smartlead, and Apollo charge $30-200/month. They send your prospect list to their servers and give you zero control over the AI model generating your copy. You can't fine-tune their model on your winning emails. You can't add custom quality gates. You can't run offline. This system is for engineers and technical founders who want full ownership of their outreach pipeline — from model weights to deliverability scoring.

### Why Local Inference for Cold Email Outreach

Every time you send a contact's name, company, and tech stack to GPT-4 or Claude to draft an email, you're paying per token, adding 200-800ms of latency, and leaking your sales pipeline to a third party. For a B2B lead generation system that processes hundreds of contacts per batch, this adds up fast.

The numbers after fine-tuning tell the story:

| Metric | Cloud API (GPT-4) | Local (Qwen3 + LoRA) |
|---|---|---|
| Latency per email | 400-800ms | ~50ms |
| Cost per email | $0.01-0.03 | $0 (hardware amortized) |
| Data privacy | Sent to third party | Never leaves machine |
| Customization | Prompt engineering only | Full weight adaptation |
| Offline capable | No | Yes |

The trade-off is upfront engineering time. If you're sending a handful of emails, use an API. If you're running a pipeline that generates hundreds per batch, owning the model pays for itself within weeks.

### Architecture: Three Models, Three Jobs

The system is a Rust-orchestrated pipeline with three local MLX models, each specialized for one task:

<Flow
  height={500}
  nodes={[
    { id: "n1", position: { x: 50, y: 0 }, data: { label: "Discovery" }, type: "input" },
    { id: "n2", position: { x: 50, y: 100 }, data: { label: "Enrichment" } },
    { id: "n3", position: { x: 50, y: 200 }, data: { label: "Contacts" } },
    { id: "n4", position: { x: 300, y: 100 }, data: { label: "Qwen2.5-3B (Classification)" } },
    { id: "n5", position: { x: 50, y: 300 }, data: { label: "Quality Gates" } },
    { id: "n6", position: { x: 300, y: 300 }, data: { label: "Qwen3-1.7B + LoRA (Email Drafting)" } },
    { id: "n7", position: { x: 50, y: 400 }, data: { label: "Human Approval" }, type: "output" },
    { id: "n8", position: { x: 550, y: 200 }, data: { label: "ScrapeGraphAI (Extraction)" } }
  ]}
  edges={[
    { id: "e1-2", source: "n1", target: "n2" },
    { id: "e2-3", source: "n2", target: "n3" },
    { id: "e2-4", source: "n2", target: "n4" },
    { id: "e3-5", source: "n3", target: "n5" },
    { id: "e5-6", source: "n5", target: "n6" },
    { id: "e6-7", source: "n6", target: "n7" },
    { id: "e4-8", source: "n4", target: "n8" }
  ]}
/>

| Model | Port | Task |
|---|---|---|
| Qwen2.5-3B-Instruct-4bit | 8080 | Company classification (category, AI tier) |
| Qwen3-1.7B-4bit + LoRA | 8080 | Email drafting (subject + body + personalization score) |
| sgai-qwen3-1.7b-gguf | 8081 | HTML to structured data extraction |

All three run locally via `mlx_lm.server`, Apple's native ML framework that provides zero-copy Metal GPU access with no CPU-to-GPU transfer overhead. The 1.7B-4bit model uses roughly 1GB of memory, leaving headroom for the 3B classification model (~2GB) to run simultaneously on a different port.

### The Rust Orchestration Layer

The email pipeline lives in Rust, not Python. The LLM client is a generic OpenAI-compatible chat completion caller that works with any local server:

```rust
#[derive(Debug, Serialize)]
struct ChatRequest<'a> {
    model: &'a str,
    messages: Vec<Message<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
}

pub async fn chat(
    client: &reqwest::Client,
    base_url: &str,
    api_key: Option<&str>,
    model: &str,
    system: &str,
    user: &str,
    temperature: Option<f32>,
) -> Result<String> {
    let mut builder = client.post(format!("{base_url}/chat/completions"));
    if let Some(key) = api_key {
        builder = builder.bearer_auth(key);
    }
    let resp = builder.json(&req).send().await?;
    // ...
}
```

The email drafting function uses a constrained system prompt that forces JSON output. No markdown fences, no preamble — just a raw JSON object with subject, body, and personalization score:

```rust
pub async fn draft_email(
    client: &reqwest::Client,
    base_url: &str,
    api_key: Option<&str>,
    model: &str,
    contact_name: &str,
    contact_title: &str,
    company_name: &str,
    company_domain: &str,
    tech_stack: &str,
) -> Result<EmailDraft> {
    let system = "You draft B2B outreach emails. Respond ONLY with JSON, no markdown fences.\n\
        Schema: {\"subject\":\"string\",\"body\":\"string\",\"personalization_score\":0.0-1.0}\n\
        Rules:\n\
        - Subject: < 60 chars, no spam triggers, no ALL CAPS\n\
        - Body: 100-250 words, professional but human\n\
        - Opening: personal connection point (shared tech, company context)\n\
        - Value prop: specific to their tech/challenges\n\
        - CTA: single, clear, low-friction (15-min call)\n\
        - No generic flattery. Reference specific tech they use.";

    let raw = chat(client, base_url, api_key, model, system, &user, Some(0.7)).await?;
    let draft: EmailDraft = serde_json::from_str(json_str)?;
    Ok(draft)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailDraft {
    pub subject: String,
    pub body: String,
    #[serde(default)]
    pub personalization_score: f64,
}
```

The system prompt does the heavy lifting here. The rules are specific and measurable: subject under 60 characters, body between 100-250 words, one clear CTA. The LoRA fine-tuning teaches the model to follow these constraints reliably — the base model achieves ~85% JSON parse rate, while the fine-tuned model hits near 100%.

### Quality Gates: Catching Bad Emails Before Humans See Them

The outreach orchestrator iterates over target contacts, drafts emails, then runs automated quality validation before presenting anything for human review:

```rust
for contact in targets {
    let tech_stack = company_map.get(contact.domain.as_str())
        .map(|c| c.tech_stack.join(", "))
        .unwrap_or_default();

    match llm::draft_email(
        &ctx.http, &ctx.llm_base_url, ctx.llm_api_key.as_deref(),
        &ctx.llm_model, &contact.email.split('@').next().unwrap_or(""),
        "", &contact.company_name, &contact.domain, &tech_stack,
    ).await {
        Ok(draft) => {
            let quality = check_quality(&draft.subject, &draft.body);
            report.drafts.push(OutreachDraft { /* ... */ });
        }
        Err(e) => report.errors.push(format!("{}: {e}", contact.email)),
    }
}
```

The quality gate catches common email anti-patterns — spam trigger words, ALL CAPS subjects, missing CTAs, emails that are too short or too long:

```rust
fn check_quality(subject: &str, body: &str) -> QualityChecks {
    let word_count = body.split_whitespace().count();

    // Spam score heuristic
    let mut spam = 0.0;
    let spam_triggers = [
        "free", "urgent", "act now", "limited time", "winner",
        "click here", "buy now", "!!!",
    ];
    for trigger in &spam_triggers {
        if lower_subj.contains(trigger) { spam += 0.15; }
    }
    if subject.chars().filter(|c| c.is_uppercase()).count() > subject.len() / 2 {
        spam += 0.2; // Penalize ALL CAPS subjects
    }

    // CTA detection
    let has_cta = lower_body.contains("call")
        || lower_body.contains("chat")
        || lower_body.contains("meet")
        || lower_body.contains("schedule");

    QualityChecks {
        subject_length_ok: subject_len > 0 && subject_len <= 60,
        body_word_count: word_count,
        body_length_ok: (100..=250).contains(&word_count),
        has_cta,
        spam_score: f64::min(spam, 1.0),
    }
}
```

Then the mandatory approval gate. No email ever gets sent without explicit human confirmation:

```rust
eprintln!("  APPROVAL REQUIRED: Type 'approve' to mark ready, or 'reject':");
let mut input = String::new();
std::io::stdin().read_line(&mut input)?;
if input.trim().to_lowercase() == "approve" {
    OutreachStatus::Approved
} else {
    OutreachStatus::Rejected
}
```

This is non-negotiable. The AI drafts, the human decides. Automated outreach without human review is how you get blacklisted by every email provider.

### Fine-Tuning Qwen3 with MLX LoRA

The base Qwen3-1.7B model writes decent cold emails out of the box, but fine-tuning on real outreach data dramatically improves both personalization and format compliance. I used Apple's MLX framework for training — it runs natively on Apple Silicon with zero-copy Metal GPU access.

#### Training Data: Real Emails + Synthetic Augmentation

Data comes from two sources. First, real sent emails exported from Neon PostgreSQL and the Resend API, joining `contact_emails`, `contacts`, and `companies` tables. Quality signals include `reply_received` (strong positive) and `opened` (weak positive):

```python
# Joins contact_emails + contacts + companies to build chat-format training pairs
SYSTEM_PROMPT = (
    "You write B2B outreach emails for Vadim Nicolai, Senior Software Engineer "
    "(10+ years: React, TypeScript, AI/ML, Rust, Node.js, GraphQL). "
    "Never reference crypto, blockchain, trading, or Web3. "
    'Output ONLY valid JSON: {"subject": "...", "body": "..."}'
)
```

Second, synthetic data generated via DeepSeek API as a teacher model, combining company profiles, recipient personas, email types (initial, followup_1, followup_2, followup_3), and style variants. The synthetic pipeline also supports negative example generation for contrastive training:

```bash
python3 generate_synthetic_emails.py --count 1000 --neg-ratio 0.15
```

#### LoRA Configuration for M1 16GB

The training config is carefully tuned for the M1's 16GB unified memory constraint:

```python
"outreach-email": TrainConfig(
    model="mlx-community/Qwen3-1.7B-4bit",
    max_seq_length=512,    # emails are short (~400 tokens)
    batch_size=2,
    grad_accumulation_steps=8,  # effective batch = 16
    learning_rate=1e-5,    # gentler for QLoRA on small 1.7B model
    epochs=5,
    lora=LoRAConfig(rank=8, alpha=32.0, dropout=0.1),
    warmup_steps=30,
)
```

Every parameter choice here reflects a specific constraint:

- **Rank 8** instead of 16 — the 1.7B model doesn't need high rank and overfits fast with it
- **Alpha 32** (scale factor = 4.0) — strong LoRA signal relative to frozen base weights
- **Max seq length 512** — emails are short (~400 tokens), so this saves memory for the larger effective batch size
- **Learning rate 1e-5** — gentler than the classification tasks (which use 2e-5) because email quality is more nuanced than binary classification
- **Cosine decay with warmup** — prevents early divergence on the small dataset

I ran a 3x3 hyperparameter sweep over rank and learning rate to validate these choices:

```python
for _rank in [4, 8, 16]:
    for _lr in [5e-6, 1e-5, 2e-5]:
        _key = f"outreach-email-sweep/r{_rank}_lr{_lr:.0e}"
        # Short 2-epoch runs to conserve M1 compute
```

Rank 8 with 1e-5 learning rate consistently produced the lowest validation loss without overfitting.

### Evaluation: Beyond Loss Curves

Standard NLP metrics like perplexity are nearly useless for cold email. I built a multi-dimensional evaluation pipeline that scores generated emails on what actually matters for deliverability and conversion:

```python
def score_email(parsed: dict | None, email_type: str = "initial") -> dict:
    scores = {
        "json_valid": False,       # Can the output parse as JSON?
        "subject_ok": False,       # Under 60 chars, not ALL CAPS?
        "word_count_ok": False,    # Within limits for email type?
        "has_placeholder": False,  # Uses {{name}} template var?
        "no_spam": False,          # Free of spam trigger words?
        "has_cta": False,          # Contains call-to-action?
        "has_sign_off": False,     # Proper sign-off (Best/Thanks)?
    }
```

Word count limits are type-aware because follow-up emails should get progressively shorter:

| Email Type | Word Count Range |
|---|---|
| Initial | 80-220 words |
| First follow-up | 60-150 words |
| Second follow-up | 50-130 words |
| Final follow-up | 35-100 words |

Beyond structural checks, the eval pipeline computes TF-IDF cosine similarity to reference emails (catches drift from the training distribution) and diversity scoring (1 minus mean pairwise similarity — ensures the model isn't collapsing to a single template).

### Apple Silicon Constraints and Optimizations

Running on an M1 MacBook Pro with 16GB unified memory imposes specific constraints that shaped every architectural decision:

- **Memory bandwidth**: 68.25 GB/s — this is the bottleneck for inference, not compute
- **SLC cache**: 8MB — fits attention KV cache for short sequences (512 tokens)
- **Quantization**: 4-bit (INT4) — halves memory vs INT8, critical for fitting 1.7B params plus LoRA adapters in 16GB
- **MLX framework**: Apple's native ML framework — zero-copy Metal GPU access, no CPU-to-GPU transfer overhead

The 1.7B-4bit model uses roughly 1GB of memory. This leaves plenty of headroom for the classification model (3B-4bit, ~2GB) to run simultaneously. Pre-flight checks ensure both servers are healthy before any pipeline run:

```bash
make leads-preflight  # Verifies LLM servers on :8080 and :8081
```

### Results After 1,100+ Training Steps

| Metric | Base Model | Fine-Tuned |
|---|---|---|
| JSON parse rate | ~85% | ~100% |
| Subject length compliance | ~70% | 95%+ |
| Spam score | Occasional triggers | Consistently < 0.1 |
| Generation speed | ~50ms | ~50ms (no degradation) |
| Personalization | Generic platitudes | References actual tech stack |

The entire pipeline — from contact list to reviewed drafts — runs offline on a laptop with no API keys needed for inference. The only cloud dependency is the Neon PostgreSQL database where contacts and companies live.

### What I'd Build Differently

Three improvements I'd make with more time:

1. **Structured output mode** — `mlx_lm` now supports grammar-constrained decoding, which would eliminate the JSON parsing and stripping dance entirely.

2. **DPO over SFT** — The synthetic data pipeline already generates negative examples. Direct Preference Optimization would teach the model what NOT to write, not just what to copy.

3. **Engagement feedback loop** — The `reply_received` and `opened` signals from Resend could feed back into training weights automatically, making the model optimize for replies rather than just format compliance.

### FAQ

**Q: What is LoRA in AI fine-tuning?**
A: LoRA (Low-Rank Adaptation) is a parameter-efficient fine-tuning method that trains small, rank-decomposition matrices injected into a pre-trained model, drastically reducing the number of trainable parameters and computational cost. In this system, it reduces trainable parameters to roughly 0.2% of the full model.

**Q: Can I use a fine-tuned model for fully automated email sending?**
A: No. This system includes a mandatory human approval gate — every email must be explicitly approved or rejected before it can be sent. Automated outreach without human review is how you get blacklisted.

**Q: How much data is needed to fine-tune a model like Qwen for emails?**
A: I used a combination of real sent emails (exported from Resend API with engagement signals) and synthetic data generated by DeepSeek as a teacher model. Several hundred high-quality examples plus synthetic augmentation to ~1,000 total.

**Q: Is running local inference actually faster than a cloud API?**
A: For batch processing, yes. The fine-tuned Qwen3-1.7B generates emails at ~50ms each on M1, compared to 400-800ms round-trips to cloud APIs. For 200 emails, that's 10 seconds local vs 80-160 seconds via API — plus you save $2-6 per batch in API costs.

The promise of AI cold email automation is real, but it's realized through specialization, not generality. By fine-tuning Qwen3 with LoRA on actual outreach data and wrapping it in Rust quality gates, you move from using a generic tool to owning a dedicated engine — one that runs on your hardware, speaks your prospect's language, and costs nothing per email to operate.
