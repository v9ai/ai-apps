# Local-First AI Email Generation: Running Qwen3-1.7B on Apple Silicon for B2B Outreach

## The Problem with Cloud APIs for Outreach

Every time you send a contact's name, company, and tech stack to GPT-4 or Claude to draft an email, you're paying per token, adding 200-800ms of latency, and leaking your sales pipeline to a third party. For a B2B lead generation system that processes hundreds of contacts per batch, this adds up fast.

I built a fully local email generation pipeline that runs on an M1 MacBook Pro using Apple's MLX framework and Qwen3-1.7B. Zero cloud API calls for inference. Sub-100ms generation. Complete data privacy.

## Architecture Overview

The system is a Rust-orchestrated pipeline with three local MLX models:

```
Discovery → Enrichment → Contacts → QA → Outreach
                                            ↓
                              Rust (crates/metal)
                                            ↓
                              mlx_lm.server (OpenAI-compatible)
                                            ↓
                              Qwen3-1.7B-4bit + LoRA adapter
                                            ↓
                              Quality gates + Human approval
```

Three models, three jobs:

| Model | Port | Task |
|-------|------|------|
| Qwen2.5-3B-Instruct-4bit | 8080 | Company classification (category, AI tier) |
| Qwen3-1.7B-4bit + LoRA | 8080 | Email drafting (subject + body + personalization score) |
| sgai-qwen3-1.7b-gguf | 8081 | HTML → structured data extraction |

## The Rust Orchestration Layer

The email pipeline lives in `crates/metal/src/teams/`. The LLM client is dead simple — a generic OpenAI-compatible chat completion caller that works with any local server:

```rust
// crates/metal/src/teams/llm.rs

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

The email drafting function uses a constrained system prompt that forces JSON output:

```rust
// crates/metal/src/teams/llm.rs

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

## The Outreach Stage: Quality Gates + Approval

The outreach orchestrator (`crates/metal/src/teams/outreach.rs`) iterates over target contacts, drafts emails, then runs quality validation before presenting them for human approval:

```rust
// crates/metal/src/teams/outreach.rs

for contact in targets {
    let tech_stack = company_map.get(contact.domain.as_str())
        .map(|c| c.tech_stack.join(", "))
        .unwrap_or_default();

    match llm::draft_email(
        &ctx.http,
        &ctx.llm_base_url,
        ctx.llm_api_key.as_deref(),
        &ctx.llm_model,
        &contact.email.split('@').next().unwrap_or(""),
        "",
        &contact.company_name,
        &contact.domain,
        &tech_stack,
    ).await {
        Ok(draft) => {
            let quality = check_quality(&draft.subject, &draft.body);
            report.drafts.push(OutreachDraft { /* ... */ });
        }
        Err(e) => report.errors.push(format!("{}: {e}", contact.email)),
    }
}
```

The quality gate catches common email anti-patterns before any human sees the draft:

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

Then the mandatory approval gate — no email ever gets sent without explicit human confirmation:

```rust
// Approval gate — NEVER sends without user confirmation
eprintln!("  APPROVAL REQUIRED: Type 'approve' to mark ready, or 'reject':");
let mut input = String::new();
std::io::stdin().read_line(&mut input)?;
if input.trim().to_lowercase() == "approve" {
    OutreachStatus::Approved
} else {
    OutreachStatus::Rejected
}
```

## Fine-Tuning with MLX LoRA

The base Qwen3-1.7B model writes decent emails out of the box, but fine-tuning on real outreach data dramatically improves personalization and format compliance.

### Training Data Pipeline

Data comes from two sources:

1. **Real sent emails** — exported from Neon PostgreSQL + Resend API, joining `contact_emails`, `contacts`, and `companies` tables:

```python
# mlx-training/export_email_data.py
# Joins contact_emails + contacts + companies to build chat-format training pairs.
# Quality signals: reply_received (strong positive), opened (weak positive).

SYSTEM_PROMPT = (
    "You write B2B outreach emails for Vadim Nicolai, Senior Software Engineer "
    "(10+ years: React, TypeScript, AI/ML, Rust, Node.js, GraphQL). "
    "Never reference crypto, blockchain, trading, or Web3. "
    'Output ONLY valid JSON: {"subject": "...", "body": "..."}'
)
```

2. **Synthetic data** — generated via DeepSeek API as a teacher model, combining company profiles, recipient personas, email types (initial, followup_1, followup_2, followup_3), and style variants:

```python
# mlx-training/generate_synthetic_emails.py
# Supports negative example generation for contrastive/DPO training
# python3 generate_synthetic_emails.py --count 1000 --neg-ratio 0.15
```

### LoRA Configuration

The training config is carefully tuned for the M1's 16GB RAM constraint:

```python
# mlx-training/finetune_config.py

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

Key decisions:
- **Rank 8** (not 16) — 1.7B model doesn't need high rank; overfits fast
- **Alpha 32** (scale = 4.0) — strong LoRA signal relative to frozen weights
- **Max seq 512** — emails are short; saves memory for larger effective batch
- **LR 1e-5** — gentler than the classification tasks (2e-5) since email quality is more nuanced than binary classification
- **Cosine decay** with warmup — prevents early divergence on small dataset

### Hyperparameter Sweep

A 3x3 grid sweep over rank and learning rate to find optimal settings:

```python
# 3×3 grid: rank × learning rate for outreach-email
# Short 2-epoch runs to conserve M1 compute.
for _rank in [4, 8, 16]:
    for _lr in [5e-6, 1e-5, 2e-5]:
        _key = f"outreach-email-sweep/r{_rank}_lr{_lr:.0e}"
        # ...
```

## Evaluation Pipeline

The evaluation script scores generated emails on multiple dimensions:

```python
# mlx-training/eval_email_model.py

def score_email(parsed: dict | None, email_type: str = "initial") -> dict:
    scores = {
        "json_valid": False,       # Can the output parse as JSON?
        "subject_ok": False,       # Under 60 chars, not ALL CAPS?
        "word_count_ok": False,    # Within limits for email type?
        "has_placeholder": False,  # Uses {{name}} template var?
        "no_spam": False,          # Free of spam trigger words?
        "has_cta": False,          # Contains call-to-action?
        "has_sign_off": False,     # Proper sign-off (Best/Thanks, Vadim)?
    }
```

Word count limits are type-aware:
- **Initial**: 80-220 words
- **First follow-up**: 60-150 words
- **Second follow-up**: 50-130 words
- **Final follow-up**: 35-100 words

Plus semantic metrics: TF-IDF cosine similarity to reference emails (catches drift from training distribution) and diversity scoring (1 - mean pairwise similarity — ensures the model isn't collapsing to a single template).

## M1 Metal Constraints and Optimizations

Running on an M1 MacBook Pro with 16GB unified memory:

- **Memory bandwidth**: 68.25 GB/s — the bottleneck for inference
- **SLC cache**: 8MB — fits attention KV cache for short sequences (512 tokens)
- **Quantization**: 4-bit (INT4) — halves memory vs INT8, critical for fitting 1.7B params + LoRA adapters in 16GB
- **MLX framework**: Apple's native ML framework — zero-copy Metal GPU access, no CPU↔GPU transfer overhead

The 1.7B-4bit model uses ~1GB of memory, leaving plenty of headroom for the classification model (3B-4bit, ~2GB) to run simultaneously on a different port.

Pre-flight checks ensure both servers are healthy before any pipeline run:

```bash
make leads-preflight  # Verifies LLM servers on :8080 and :8081
```

## What I'd Do Differently

1. **Structured output mode** — mlx_lm now supports grammar-constrained decoding. Would eliminate the JSON parsing/stripping dance entirely.
2. **DPO over SFT** — The synthetic data pipeline already generates negative examples. Direct Preference Optimization would teach the model what NOT to write, not just what to copy.
3. **Engagement feedback loop** — The `reply_received` and `opened` signals from Resend could feed back into training weights automatically, making the model optimize for replies, not just format compliance.

## Results

After 1,100+ training steps with LoRA fine-tuning:
- JSON parse rate: near 100% (base model was ~85%)
- Subject length compliance: 95%+ (was ~70%)
- Personalization: noticeably references actual tech stack rather than generic platitudes
- Spam score: consistently < 0.1 (base model occasionally triggered with aggressive subject lines)
- Generation speed: ~50ms per email on M1 (vs 400-800ms round-trip to cloud APIs)

The entire pipeline — from contact list to reviewed drafts — runs offline on a laptop with no API keys needed for inference. The only cloud dependency is the Neon PostgreSQL database where contacts and companies live.
