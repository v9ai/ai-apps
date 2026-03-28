# Business Leads AI Automation — AI Features Deep Report

**Source:** https://github.com/asiifdev/business-leads-ai-automation
**Analyzed:** 2026-03-28
**Author of repo:** Muhammad Syaiful Anwar (asiifdev)

---

## 1. Overview

**What it does:** An open-source Node.js CLI + web dashboard that scrapes business listings from Google Maps and feeds that data into OpenAI to generate personalized email and WhatsApp outreach templates. Designed for small-to-medium business owners who want to cold-outreach local businesses (primary market: Indonesia, secondary: global English).

| Attribute | Value |
|---|---|
| GitHub stars | 69 |
| Forks | 18 |
| License | MIT |
| Last commit | February 2026 (active) |
| Project started | July 2025 |
| Primary author | Muhammad Syaiful Anwar (asiifdev) |
| Runtime | Node.js >= 14.0.0 |
| Language | JavaScript (CommonJS modules) |
| LLM | OpenAI GPT (default: `gpt-4o-mini`) |
| Scraping | Puppeteer (headless Chrome) |
| Backend | Express 4.x |
| Database | File-based (JSON + SQLite3 listed as dep, appears unused for core flow) |

**Claim vs. reality:** The README positions this as a "free alternative to $99–299/month SaaS tools." That is technically accurate in that it has zero SaaS subscription cost — you only pay for OpenAI tokens. With `gpt-4o-mini` at ~$0.15/1M input tokens, generating templates for 50 leads costs roughly $0.05–0.15. The comparison to enterprise SaaS (e.g., Apollo.io, Hunter.io) is aspirational; the feature gap is large.

---

## 2. AI Architecture

### LLM Backend

The project uses the official OpenAI Node.js SDK (`openai ^4.104.0`) with a singleton client pattern:

```javascript
// src/openaiClient.js — lazy-loaded singleton
const OpenAI = require('openai');

let client = null;

function getClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }
  return client;
}

function getModel() {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini';
}
```

`OPENAI_BASE_URL` makes this model-agnostic in practice: you can point it at any OpenAI-compatible endpoint — OpenRouter, Azure OpenAI, Ollama, LM Studio, or any local inference server that speaks the OpenAI chat completions protocol.

### How Google Maps Data Feeds AI Prompts

The flow is linear: scraper produces a structured lead object, which is passed wholesale into a prompt builder, which calls OpenAI chat completions.

The lead object shape after scraping and processing:

```
{
  id: sequential integer,
  name: string,            // business name
  address: string,
  phone: string,           // normalized Indonesian format
  rating: number,          // 0.0-5.0
  website: string | null,
  referenceLink: string,   // Google Maps URL
  possibleEmails: [],      // currently always empty (WIP)
  source: "google_maps",
  scrapedAt: ISO timestamp
}
```

After `LeadIntelligence.validateAndEnhanceLead()` runs, two derived fields are appended:

```
businessSize: "small" | "medium" | "large"   // heuristic from website + rating
digitalMaturity: 0-100                        // score: website, social links, etc.
```

These enriched fields are then injected into the AI prompt verbatim.

### Personalization Approach

Two-level personalization:

1. **Sender profile** — loaded from `business-profile.json` at startup. Contains the user's own business name, owner name, phone, email, value propositions, and target industries. This becomes the "from" context in prompts.

2. **Recipient data** — the enriched lead object becomes the "to" context. The system uses the lead's industry, rating, and digital maturity score to select pain points and urgency framing.

The intersection of sender profile + recipient data + industry templates + campaign style produces the final prompt.

---

## 3. Key AI Features

### 3.1 Google Maps Business Scraping

Implemented in `src/scraper.js` using Puppeteer (headless Chrome).

**Search URL construction:**
```
https://www.google.com/maps/search/{encoded_query}
```

**DOM selectors used:**
- Business cards: `.Nv2PK` (primary), `.TFQHme` separator → adjacent `.Nv2PK` (secondary)
- Business name: `.qBF1Pd.fontHeadlineSmall`
- Rating: `.MW4etd`
- Phone: regex match on visible text for Indonesian number patterns
- Address: text containing "Jl." or "Street" keywords
- Website: anchor tags with `.com`, `.co.id`, `.net` etc.

**Scrolling strategy:** Up to 50 scroll attempts on 7 different container selectors, falling back to `window.scrollBy`. Exits early when target count reached or no new results appear.

**Rate limiting:** 3s initial load delay, 2s between scrolls, user-agent spoofing. No proxy rotation — single IP, so at scale Google will block it.

**Email discovery:** Disabled (returns empty array). The code path exists but the implementation is a stub.

### 3.2 AI-Generated Email Templates

Primary generation in `src/marketingAI.js` via `generateIndustrySpecificContent()`.

**System prompt structure (condensed):**
```
You are an expert marketing consultant specializing in {industry} businesses in {market}.
Communication style: {style} — {style_description}.
{cultural_context}
Generate content that:
- Opens with specific reference to their business (name + location)
- Mentions their rating ({rating}/5) naturally
- Addresses {industry} pain points with data
- Proposes specific, measurable solutions
- Includes local market statistics
Format response as:
EMAIL TEMPLATE:
Subject: ...
Body: ...
WHATSAPP TEMPLATE:
...
```

**User prompt structure:**
```
TARGET BUSINESS INFORMATION:
- Business: {name}
- Address: {address}
- Phone: {phone}
- Rating: {rating}/5
- Website: {website or "tidak ada/none"}
- Business Size: {heuristic}
- Digital Maturity: {0-100 score}

SERVICE OFFERED: {from business-profile.json}
OUR BUSINESS: {sender name, contact, value props}
INDUSTRY CONTEXT: {pain points, solutions, benefits from template}
MARKET DATA: {localized stats, e.g. "77% shop online in Indonesia"}
```

**API call parameters:**
```javascript
{
  model: getModel(),          // default: gpt-4o-mini
  max_tokens: 3000,
  temperature: 0.6,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]
}
```

Temperature 0.6 is a reasonable middle ground — enough variation to avoid identical templates across leads, not so high that outputs become incoherent.

### 3.3 AI-Generated WhatsApp Templates

Generated in the same API call as the email template. The model is instructed to produce a WhatsApp-specific variant after the email content, delimited by `WHATSAPP TEMPLATE:`.

WhatsApp messages are structurally different: shorter, more casual, often use Indonesian honorifics ("Bapak/Ibu"), no formal subject line, optimized for mobile reading. The prompt system prompt explicitly adjusts tone for the channel.

**Response parsing:**
```javascript
parseIndustryResponse(response) {
  // Split on "EMAIL TEMPLATE" marker
  // Then split remainder on "WHATSAPP TEMPLATE" marker
  // Fallback: if markers absent, use first ~60% as email, rest as WhatsApp
  // Subject extraction: look for "Subject:" prefix in email section
}
```

No validation that the output actually contains both sections — if the model deviates from the format, the fallback splits by character count, which will produce malformed output.

### 3.4 Multi-Touch Sequence Generation

`src/marketingAI.js` has three generation methods:

| Method | Purpose | Prompt emphasis |
|---|---|---|
| `generateIndustrySpecificContent()` | First touch | Industry pain points, initial value proposition |
| `generateFollowUpContent()` | Second touch | Case studies, social proof, urgency |
| `generateClosingContent()` | Final touch | FOMO, limited offer, hard CTA |

The web dashboard's `executeCampaignAsync()` only calls the first method for the top-5 leads. The follow-up and closing methods exist but are not wired into the web UI — available only if you call the `CampaignBuilder` class programmatically.

### 3.5 Batch Template Generation with Placeholder Substitution

`src/marketing.js` implements a cost-optimization pattern:

1. **Single AI call:** Generate one base template with placeholder tokens (`[BUSINESS_NAME]`, `[ADDRESS]`, `[PHONE]`, `[RATING]`)
2. **Personalization loop:** For each lead, do string replacement — no additional API calls

This reduces cost from O(N) API calls to O(1) for large lead lists. The trade-off is that all leads in a batch get structurally identical templates with only the substituted fields varying.

### 3.6 Lead Intelligence Scoring (Heuristic, not AI)

`src/leadIntelligence.js` is NOT AI-powered despite the "AI-powered" marketing label. It is a deterministic weighted scoring system:

```
Final Score = (completeness × 0.20) +
              (businessQuality × 0.25) +
              (digitalPresence × 0.15) +
              (locationValue × 0.15) +
              (industryPotential × 0.15) +
              (contactability × 0.10)
```

**Score → category mapping:**
- 85-100: A+ (CRITICAL priority)
- 70-84: A (HIGH priority)
- 55-69: B (MEDIUM priority)
- 40-54: C (LOW priority)
- 0-39: D (filtered out, score < MIN_LEAD_SCORE threshold)

The city scoring (`locationValue`) is hardcoded for Indonesian cities: Jakarta=95, Surabaya=85, Bandung=80, default=65. This makes the tool nearly useless for non-Indonesian markets without modification.

---

## 4. Data Pipeline

### Full Pipeline Diagram

```
User Input (CLI/Web)
    │  search query + max results + industry + style
    ▼
Google Maps Search URL
    │  headless Chrome via Puppeteer
    ▼
DOM Scraping (.Nv2PK cards)
    │  name, address, phone, rating, website, Maps URL
    ▼
processResults()
    │  dedup, phone normalization, timestamps, sequential IDs
    ▼
LeadIntelligence.scoreAndPrioritize()
    │  6-factor weighted score (0-100), category (A+ to D)
    │  filter: score >= MIN_LEAD_SCORE (default: 60)
    ▼
validateAndEnhanceLead()
    │  append businessSize + digitalMaturity heuristics
    ▼
[Only top-N priority leads proceed to AI generation]
    │  web: top 5; CLI: configurable via MAX_CONTENT_GENERATION (default: 50)
    ▼
MarketingAI.generateIndustrySpecificContent()
    │  build systemPrompt (industry + style + language)
    │  build userPrompt (lead data + sender profile + market stats)
    │  OpenAI chat completions API call (gpt-4o-mini, T=0.6, max_tokens=3000)
    ▼
parseIndustryResponse()
    │  split on "EMAIL TEMPLATE:" and "WHATSAPP TEMPLATE:" markers
    ▼
FileUtils.saveLeads()
    │  output/{campaign}_{date}.csv
    │  output/{campaign}_{date}.json
    ▼
Web Dashboard / CLI Output
```

### Data Transformation Steps

1. **Raw DOM text → structured object:** Phone regex, address keyword detection, link filtering
2. **Lead enrichment:** Score computation, category assignment, business size/digital maturity heuristics
3. **Prompt assembly:** Sender profile + recipient data + industry template + market stats → string concatenation
4. **LLM output parsing:** Plain text → `{ emailSubject, emailTemplate, whatsappTemplate }` object
5. **Export:** Lead array + template object → CSV rows + JSON file

There is no embedding, vector store, retrieval, or semantic search at any step. The entire "AI" component is a single chat completions call per lead.

---

## 5. Evaluation / Quality

### Template Quality Measurement

There is no automated quality evaluation of AI outputs. The test suite (`test.js`, 50+ tests) validates:

- Placeholder tokens (`[BUSINESS_NAME]` etc.) are substituted correctly
- No residual unreplaced tokens in final output
- Industry template data structures contain required keys (`painPoints`, `solutions`, `benefits`)
- Both `indonesian` and `english` language variants exist
- All three campaign styles (`conservative`, `balanced`, `aggressive`) are defined
- Lead enrichment fields (`businessSize`, `digitalMaturity`) are appended
- Response parser correctly splits on format markers

**What is not tested:**
- Whether the generated email actually sounds natural
- Whether the WhatsApp message respects character limits
- Whether personalization is contextually accurate (e.g., does a high-rating business get appropriate framing?)
- Deliverability or spam score of generated emails
- A/B testing or reply rate tracking
- Any form of human feedback loop or RLHF

Quality assurance is entirely structural (does the output have the right shape?) not semantic (is the output good?).

### Output Validation

The `parseIndustryResponse()` fallback (character-count split when markers are absent) means malformed LLM outputs silently produce wrong results. There is no retry logic if parsing fails — no "if no EMAIL TEMPLATE marker found, retry with clearer instructions."

---

## 6. Rust/ML Relevance

### Could Scraping + AI Generation Be Done in Rust?

**Scraping:**
The Puppeteer-based scraping could be replaced with a Rust implementation using:
- `headless_chrome` crate or `fantoccini` (WebDriver client) for JS-heavy pages
- `scraper` crate (HTML parsing via CSS selectors) for the DOM extraction once HTML is obtained
- `reqwest` for HTTP-level access where possible (though Google Maps requires JS execution)

In practice, Google Maps is a heavy JS SPA — you need actual browser execution, which means either a WebDriver-based solution or replicating the internal Maps API calls (more brittle). Puppeteer is a pragmatic choice here.

**AI Generation:**
Trivially replaceable with any Rust HTTP client (`reqwest`) against the same OpenAI-compatible endpoint. The prompt construction is just string formatting — `format!()` in Rust. If you wanted local inference instead of the API, `candle` (Hugging Face) or `llama.cpp` bindings in Rust would work.

**Simplicity of Architecture:**
The AI architecture is extremely simple — single-turn chat completion, no RAG, no embeddings, no tool use, no streaming. This is precisely why it is easy to port to any language. The "AI" is just one HTTP POST to `/v1/chat/completions`.

The real complexity is in the Puppeteer scraping (DOM fragility, scroll logic, anti-bot evasion) and in the prompt engineering (industry templates, market data, bilingual support). Both of these are data and string manipulation problems, not ML problems.

---

## 7. Integration Points

### Output Formats

| Format | Contents |
|---|---|
| CSV | ID, Name, Address, Phone, Website, Rating, Source, Score, Priority, Category |
| JSON | Full lead object including all enrichment fields and generated templates |
| vCard (`.vcf`) | Individual contact export for direct phone import |
| vCard bulk | All leads in a campaign exported as single vCard batch |
| `marketing_log.json` | Timestamped activity log |

### Connecting to Email/WhatsApp Sending

**The tool generates templates but does NOT send anything.** There is no SMTP client, no Twilio integration, no WhatsApp Business API client. The expectation is:

1. Export CSV/JSON
2. Manually copy WhatsApp messages into WhatsApp Web/Business
3. Manually paste email templates into your email client or an ESP (Mailchimp, SendGrid, etc.)

This is a significant gap. There are no webhooks, no API surface for outbound sending, no campaign scheduler.

### API Surface

The Express web server (`src/web/server.js`) exposes a REST API at `localhost:3000`:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/campaigns` | POST | Create and execute new campaign |
| `/api/campaigns` | GET | List all historical campaigns |
| `/api/campaigns/:id` | GET | Get campaign details + leads |
| `/api/campaigns/:id/status` | GET | Real-time progress polling |
| `/api/campaigns/:id/leads` | GET | Paginated lead list (filter by priority/score) |
| `/api/campaigns/:id/export/vcard` | GET | Bulk vCard export |
| `/api/leads/:campaignId/:leadIndex/vcard` | GET | Single lead vCard |
| `/api/dashboard` | GET | Aggregate stats |
| `/api/analytics` | GET | Industry distribution, quality breakdown, 30-day trends |
| `/api/health` | GET | Server status + OpenAI config check |
| `/api/events` | GET | SSE stream for real-time campaign progress |

This is a reasonable programmatic surface if you want to build integrations — you could trigger campaigns and poll for results from an external orchestrator.

---

## 8. Gaps / Weaknesses

### Architecture Weaknesses

**No email sending.** Templates are generated but delivery is entirely manual. A production tool needs SMTP/ESP integration.

**No WhatsApp API integration.** The WhatsApp Business API (Meta's official channel) or even unofficial clients like Baileys are absent. Users manually copy-paste.

**Email discovery is broken.** The `possibleEmails` field is always an empty array. This is called out in the README as "work in progress" but it is a core feature of any lead gen tool.

**Single-IP scraping.** No proxy rotation, no CAPTCHA solving, no residential proxy support. Google Maps will rate-limit or block at modest volumes (typically after 50-200 requests/hour from a single IP).

**DOM selector fragility.** Google Maps updates its DOM frequently. The selectors (`.Nv2PK`, `.TFQHme`, `.qBF1Pd`, `.MW4etd`) will break without notice. There is no fallback strategy beyond a second CSS selector approach.

**Indonesia-specific hardcoding.** Phone validation (`08` and `+62` prefixes), city scoring (Jakarta/Surabaya/Bandung), default language (Indonesian), market statistics — all are Indonesian-market-specific. Global use requires significant modification.

### Scale Limitations

- **Top-5 AI generation in web mode.** The `executeCampaignAsync()` in the web server only generates AI templates for the top 5 leads per campaign. The CLI allows up to 50 via `MAX_CONTENT_GENERATION`, but this is a configuration cap, not a technical limit.
- **In-memory campaign state.** Active campaigns are stored in a JavaScript `Map`. Server restart loses all in-progress campaigns.
- **No queue.** Campaigns run synchronously in a single async function. Concurrent campaign execution is not handled — running two campaigns simultaneously will interleave Puppeteer instances unpredictably.
- **SQLite3 listed as dependency but not used** for core functionality. File-based JSON is the actual persistence layer. At scale, querying thousands of leads means loading entire JSON files into memory.

### AI Quality Weaknesses

**No output validation.** Malformed LLM responses silently produce bad templates via character-count fallback splitting.

**No retry on failure.** If the OpenAI call fails or returns unexpected format, the lead gets no template — no retry, no error recovery, no notification.

**No semantic quality check.** There is no second LLM call to evaluate template quality, no self-critique loop, no score for "does this sound natural?"

**Static market data.** The statistics injected into prompts ("88% of Indonesians use smartphones") are hardcoded strings in the source code, not fetched from live sources. These will become stale.

**Temperature not tuned per use case.** A single `temperature: 0.6` is used for all three template types (initial, follow-up, closing). Closing templates (high urgency) might benefit from lower temperature for consistency; initial templates might benefit from higher variation.

**No A/B testing framework.** No mechanism to test which prompt structure, industry framing, or campaign style produces better reply rates.

---

## 9. Takeaways for a B2B Lead Gen Platform

### Low-Cost AI Template Generation Patterns

**The batch + placeholder pattern is worth stealing.** One AI call generates a template with typed placeholders, then pure string substitution handles the rest of the batch. At scale (hundreds of leads), this reduces OpenAI costs by 95%+ compared to per-lead API calls. The quality trade-off (less deep personalization) is acceptable for cold outreach where response rates are typically 1-5% regardless.

**Three-stage sequence (initial → follow-up → closing) is a solid structure.** Even with simple implementation, having distinct prompt strategies per touch point is better than reusing one template. The follow-up prompt focusing on case studies and the closing prompt using scarcity/urgency are standard copywriting frameworks that translate well to LLM prompting.

**System prompt + user prompt separation is correct.** Using system prompt for persona/industry/style and user prompt for specific lead data is the right architectural split. It keeps the static context in the system role (cheaper in token pricing on some models) and the dynamic content in the user role.

**`gpt-4o-mini` is the right default.** For structured template generation with well-constrained prompts, the quality difference between `gpt-4o-mini` and `gpt-4o` is small. The cost difference is 15x. This is the correct cost/quality tradeoff for cold outreach templates.

**Custom base URL is a key extensibility feature.** Allowing `OPENAI_BASE_URL` override means you can swap in OpenRouter (multi-model routing), a local Ollama instance, or a company proxy without code changes. For a production platform, this pattern enables model routing based on cost, latency, or task type.

### Google Maps as a Lead Source

**Google Maps is underutilized as a B2B lead source.** Most enterprise lead gen tools focus on LinkedIn and company databases. Google Maps has several advantages:
- **Local business density:** Millions of SMBs that are not on LinkedIn
- **Rich structured data:** Name, address, phone, rating, category, hours all in one place
- **Intent signals:** Ratings, review recency, and review content indicate business health
- **No login required:** Unlike LinkedIn, public data without authentication

**What the project does not exploit:**
- Review content as intent signal (negative reviews → pain points for your pitch)
- Business category tags (more granular than just 7 hardcoded industries)
- Operating hours as digital maturity signal (no hours listed = less sophisticated)
- Photo count as proxy for marketing investment
- Q&A section content
- "Popular times" data as proxy for business volume

**Data quality reality:** Phone numbers are moderately reliable. Emails are not discoverable from Maps alone — you need the business website + email pattern inference or a contact enrichment API (Hunter.io, Apollo). The missing email field is the single biggest gap between this tool and a functional cold email system.

### Architectural Recommendations for a Production Platform

1. **Replace Puppeteer with Google Places API** for reliable structured data — $0.017 per call is expensive at scale but eliminates DOM fragility entirely. For scraping, use rotating residential proxies + browser fingerprinting to avoid detection.

2. **Add email discovery pipeline:** Website fetch → extract contact page → pattern-match emails, or integrate Hunter.io/Apollo API. Without email, the "email template" output is useless.

3. **Integrate actual sending:** Resend or SendGrid for email (already in your stack), Meta WhatsApp Business API for WhatsApp. Generate → send should be one pipeline, not two manual steps.

4. **Replace heuristic lead scoring with a trained classifier:** The 6-factor weighted formula is brittle. A logistic regression or gradient boosting model trained on historical reply rates would significantly outperform it. The feature set (rating, website presence, address type, city) is already reasonable for a first model.

5. **Add semantic output validation:** After generating a template, run a second cheap LLM call: "Does this email sound like spam? Rate 1-10." Filter anything above a threshold. This costs ~$0.001 per lead and eliminates the worst outputs.

6. **Persist campaign state in PostgreSQL (Neon), not JSON files.** The file-based approach collapses at 10,000+ leads. Your existing Drizzle + Neon setup handles this without changes.

7. **Add reply tracking:** The tool generates outreach but has no feedback loop. Even basic "replied / bounced / opened" tracking fed back into the scoring model would compound quality improvements over time.

---

*Report generated from static analysis of the public repository. No live execution was performed.*
