# Sales Outreach Automation with LangGraph — AI Features Deep Report

**Source:** [kaymen99/sales-outreach-automation-langgraph](https://github.com/kaymen99/sales-outreach-automation-langgraph)
**Research date:** 2026-03-28
**Analyst:** Senior AI Engineer review for competing platform

---

## 1. Overview

### What It Does

`sales-outreach-automation-langgraph` is a Python-based, AI-driven B2B outreach automation system built by Aymen K (kaymen99). It automates the full funnel from lead ingestion to personalized cold outreach: pulling contacts from CRMs, scraping their LinkedIn presence and company digital footprint, scoring qualification, generating research reports, and drafting personalized emails + sales call scripts.

The system is designed for a digital-marketing / AI-services agency ("ElevateAI" in the codebase) targeting SMBs. The prompts and scoring criteria are hard-coded to this agency archetype, making the system opinionated but functional out of the box.

### Repository Stats

| Metric | Value |
|---|---|
| GitHub stars | ~258 |
| Forks | ~69 |
| Commits (main) | 30 |
| Language | Python 100% |
| License | Not specified (no LICENSE file) |
| Last activity | Active as of early 2025 |
| Author contact | aymenMir1001@gmail.com |

### Tech Stack

| Layer | Technology |
|---|---|
| Orchestration | LangGraph + LangChain |
| Primary LLM | Google Gemini 1.5 Flash + 1.5 Pro |
| Supported LLMs | OpenAI GPT-4o, Anthropic Claude (via factory) |
| Vector DB | ChromaDB (local persistence) |
| Embeddings | Google `text-embedding-004` |
| LinkedIn data | RapidAPI (`fresh-linkedin-profile-data`) |
| Web search | Serper API |
| CRMs | HubSpot, Airtable, Google Sheets |
| Output | Google Docs, Gmail, local filesystem |
| Scraping | `requests` + `BeautifulSoup` + `html2text` |
| Language runtime | Python 3.9+ |

---

## 2. AI Architecture

### LangGraph Graph Structure

The core graph is a `StateGraph` compiled from `src/graph.py`. It is not a simple linear chain — it implements fan-out parallelism, conditional routing, and a batch-processing loop.

**Complete node inventory (17 registered nodes):**

```
Lead acquisition layer:
  get_new_leads
  check_for_remaining_leads

Research layer (sequential + parallel):
  fetch_linkedin_profile_data
  review_company_website
  collect_company_information          ← fan-out origin
    ├─ analyze_blog_content            ─┐
    ├─ analyze_social_media_content     ├─ parallel branches
    └─ analyze_recent_news             ─┘
  generate_digital_presence_report     ← fan-in convergence
  generate_full_lead_research_report
  score_lead

Outreach layer (conditional + parallel):
  create_outreach_materials            ← fan-out origin (conditional)
    ├─ generate_custom_outreach_report ─┐
    └─ generate_interview_script       ─┘ parallel
  generate_personalized_email
  await_reports_creation               ← synchronization barrier

Finalization layer:
  save_reports_to_google_docs
  update_CRM
```

**Edge pattern:**

```
START
  → get_new_leads
  → check_for_remaining_leads
  ──[conditional]──────────────────────
    "No more leads" → END
    "Found leads"   → fetch_linkedin_profile_data
  → review_company_website
  → collect_company_information
  ──[fan-out]──────────────────────────
    → analyze_blog_content
    → analyze_social_media_content
    → analyze_recent_news
  ──[fan-in]───────────────────────────
  → generate_digital_presence_report
  → generate_full_lead_research_report
  → score_lead
  ──[conditional]──────────────────────
    "not qualified" → save_reports_to_google_docs
    "qualified"     → generate_custom_outreach_report
  ──[fan-out]──────────────────────────
    → generate_personalized_email
    → generate_interview_script
  ──[fan-in via await_reports_creation]─
  → save_reports_to_google_docs
  → update_CRM
  → check_for_remaining_leads          ← loop back
```

The loop means a single `.invoke()` call processes the entire batch of leads sequentially. This is a **synchronous batch loop** within one graph execution, not a proper concurrent execution across leads.

### Which LLMs/Models Are Used

| Node | Model | Rationale |
|---|---|---|
| `review_company_website` | gemini-1.5-flash | Cheap, fast website summarization |
| `analyze_blog_content` | gemini-1.5-flash | Blog scoring (quantitative) |
| `analyze_social_media_content` | gemini-1.5-flash | YouTube metric analysis |
| `analyze_recent_news` | gemini-1.5-flash | News summarization |
| `generate_digital_presence_report` | gemini-1.5-flash | Synthesis of 3 reports |
| `generate_full_lead_research_report` | gemini-1.5-pro | Deep consolidated analysis — escalated model |
| `score_lead` | gemini-1.5-pro | Numeric scoring — escalated model |
| `generate_custom_outreach_report` | gemini-1.5-pro + flash | Pro drafts, Flash proof-reads |
| `generate_personalized_email` | gemini-1.5-flash | Email generation (structured output) |
| `generate_interview_script` | gemini-1.5-flash | SPIN questions + script |
| LinkedIn research summary | gemini-1.5-flash | Profile narrative |
| Company profile | gemini-1.5-flash | Combined LinkedIn + website profile |

The pattern is: **Flash for individual analysis tasks, Pro for synthesis and decision nodes.** This is a sensible cost optimization — Pro is invoked only when the full context window of accumulated reports is needed.

The `get_llm_by_provider()` factory in `utils.py` supports OpenAI and Anthropic as drop-in alternatives.

### Prompting Strategy Per Agent Node

Each node has a dedicated prompt in `src/prompts.py`. Key patterns:

**WEBSITE_ANALYSIS_PROMPT** — Instructs extraction of a 500-word summary plus structured link extraction (blog, YouTube, Twitter, Facebook URLs). Uses `{main_url}` to resolve relative links. Returns a Pydantic `WebsiteData` model via LangChain's `.with_structured_output()`.

**BLOG_ANALYSIS_PROMPT / YOUTUBE_ANALYSIS_PROMPT** — Quantitative scoring prompts. Each asks for a score on 3-4 dimensions (volume, frequency, engagement, relevancy) on a 1-10 scale, producing structured numeric outputs.

**NEWS_ANALYSIS_PROMPT** — Injects `{company_name}`, `{number_months}`, and `{date}` context. Extracts recent business signals from news articles.

**GLOBAL_LEAD_RESEARCH_REPORT_PROMPT** — Uses gemini-1.5-pro. Asks for a long-form synthesis combining lead background, company overview, and all digital signals. Input is the concatenated output of prior nodes.

**SCORE_LEAD_PROMPT** — Hard-coded six evaluation criteria: Digital Presence, Social Media Activity, Industry Fit, Company Scale, Marketing Strategy, Pain Points & ROI. Output is a single float on 1-10. No chain-of-thought or explanation — just the number.

**GENERATE_OUTREACH_REPORT_PROMPT** — Most elaborate prompt. Has a fixed "agency identity" section about ElevateAI, asks the LLM to produce a full pitch deck structure: business overview, identified challenges, 3 specific AI solutions (linked to retrieved case studies via RAG), ROI projections, and a CTA. Two-pass: Pro drafts, Flash proof-reads.

**PERSONALIZE_EMAIL_PROMPT** — Produces an `EmailResponse` Pydantic model with `subject` and `email` fields. Contains bracketed placeholders `[First Name]`, `[Lead's Company Name]`, `[Lead's Company industry]`, and the Google Docs link to the outreach report.

**GENERATE_SPIN_QUESTIONS_PROMPT** — Produces maximum 15 SPIN-methodology questions (Situation, Problem, Implication, Need-Payoff) based on the global research report.

**WRITE_INTERVIEW_SCRIPT_PROMPT** — Expands SPIN questions into a full conversational call script with intro hook, structured question sections, and closing.

**PROOF_READER_PROMPT** — Acts as an editor: validates structure, completeness, and language of the outreach report draft.

### State Management Across the Graph

State is managed via two TypedDicts in `src/state.py`:

```python
class GraphInputState(TypedDict):
    leads_ids: List[str]

class GraphState(TypedDict):
    leads_ids: List[str]
    leads_data: List[dict]
    current_lead: LeadData
    lead_score: str          # stored as string, compared as float (≥7.0)
    company_data: CompanyData
    reports: Annotated[list[Report], add]   # reducer: accumulates, never overwrites
    reports_folder_link: str
    custom_outreach_report_link: str
    personalized_email: str
    interview_script: str
    number_leads: int
```

The `reports` field is the critical accumulator. Using LangGraph's `add` reducer means every node that appends a `Report` object will accumulate it into the shared list rather than replace the prior value. Nodes retrieve specific reports by title using `get_report(reports, "Blog Analysis Report")`.

The `current_lead` field is replaced on each loop iteration (a single lead is popped from `leads_data`), while `reports` is cleared implicitly between leads (not explicitly shown in the public analysis — worth verifying in practice).

---

## 3. Key AI Features

### Lead Research and Qualification Logic

Research is multi-source and multi-pass:

1. **LinkedIn profile** (RapidAPI) — personal profile: about, experiences, skills, education, certifications, orgs. Company profile: name, founding year, industries, employee count, locations, follower count.
2. **Website** (html2text scrape) — mission, products, services, social link extraction.
3. **Blog** (html2text scrape + LLM scoring) — post volume, frequency, topic relevancy.
4. **YouTube** (YouTube Data API v3) — subscriber count, total videos, avg views/likes, last 15 video titles.
5. **News** (Serper API `tbs: qdr:y`) — last 20 articles from past year, chronologically reversed.

Qualification is a single-pass LLM scoring (gemini-1.5-pro) on the Global Research Report. The six scoring dimensions are:

| Dimension | What it measures |
|---|---|
| Digital Presence | Website quality, blog activity, SEO signals |
| Social Media Activity | YouTube/Twitter/Facebook engagement |
| Industry Fit | Alignment with ElevateAI's service verticals |
| Company Scale | Employee count, revenue proxy |
| Marketing Strategy | Sophistication of current marketing |
| Pain Points & ROI | Clear problems the agency can solve |

Threshold: score ≥ 7.0 = qualified. There is no human-in-the-loop validation; the LLM score directly gates downstream work.

### Personalized Outreach Generation

The outreach pipeline has four distinct deliverables:

1. **Custom Outreach Report** (Google Doc, shared link) — A full pitch deck document personalized to the lead's identified challenges. RAG retrieves the most relevant case study. The report includes: business overview, 3 specific AI-solution recommendations, ROI projections, and a CTA. Proof-read by a second Flash pass.

2. **Personalized Cold Email** — `EmailResponse` Pydantic model with subject + body. The email links to the outreach report. Created as a Gmail draft by default (`SEND_EMAIL_DIRECTLY = False`).

3. **SPIN Interview Script** — 15 targeted sales questions following SPIN methodology (Situation → Problem → Implication → Need-Payoff), then expanded into a full call script.

4. **Global Research Report** — Internal artifact, not sent to the prospect. Used as the knowledge base for generating all three outreach artifacts.

### LinkedIn Scraping + Digital Presence Analysis

LinkedIn scraping uses the **fresh-linkedin-profile-data** RapidAPI service. Two endpoints:

```
Personal:  GET /get-linkedin-profile?linkedin_url=...
Company:   GET /get-company-by-linkedinurl?linkedin_url=...
```

Profile discovery flow:
1. Extract domain from lead email (`email.split("@")[1]`)
2. Google search query: `"LinkedIn {lead_name} {company_domain}"`
3. Parse first LinkedIn URL from Serper organic results
4. Call RapidAPI with discovered URL

This avoids requiring CRMs to store LinkedIn URLs — the system derives them from email + name. However, it is dependent on Serper returning a correct LinkedIn URL as the first organic result, which can fail for common names.

Digital presence analysis collects:
- YouTube: subscriber count, 15 recent videos, avg views/likes (YouTube Data API v3)
- Blog: article count, publishing frequency, topic relevancy
- Twitter/Facebook: linked but only URLs extracted, no further API calls (analysis deferred to future work or LLM inference from URL existence)
- News: 20 articles from past year via Serper news endpoint

### Report Generation

Six distinct reports are generated and accumulated in state:

| Report | Generator Node | Model |
|---|---|---|
| General Lead Research Report | `review_company_website` | gemini-1.5-flash |
| Blog Analysis Report | `analyze_blog_content` | gemini-1.5-flash |
| Youtube Analysis Report | `analyze_social_media_content` | gemini-1.5-flash |
| News Analysis Report | `analyze_recent_news` | gemini-1.5-flash |
| Digital Presence Report | `generate_digital_presence_report` | gemini-1.5-flash |
| Global Lead Analysis Report | `generate_full_lead_research_report` | gemini-1.5-pro |

Plus three outreach artifacts (Outreach Report, Email, Interview Script) generated from the Global Lead Analysis Report.

All reports are saved locally as `.txt` files in `./reports/`. Google Docs saving is gated by `SAVE_TO_GOOGLE_DOCS = False` flag.

### Actual Graph Definition (Reconstructed)

```python
from langgraph.graph import StateGraph, START, END
from src.state import GraphState, GraphInputState

workflow = StateGraph(GraphState, input=GraphInputState)

# Nodes
workflow.add_node("get_new_leads", nodes.get_new_leads)
workflow.add_node("check_for_remaining_leads", nodes.check_for_remaining_leads)
workflow.add_node("fetch_linkedin_profile_data", nodes.fetch_linkedin_profile_data)
workflow.add_node("review_company_website", nodes.review_company_website)
workflow.add_node("collect_company_information", nodes.collect_company_information)
workflow.add_node("analyze_blog_content", nodes.analyze_blog_content)
workflow.add_node("analyze_social_media_content", nodes.analyze_social_media_content)
workflow.add_node("analyze_recent_news", nodes.analyze_recent_news)
workflow.add_node("generate_digital_presence_report", nodes.generate_digital_presence_report)
workflow.add_node("generate_full_lead_research_report", nodes.generate_full_lead_research_report)
workflow.add_node("score_lead", nodes.score_lead)
workflow.add_node("create_outreach_materials", nodes.create_outreach_materials)
workflow.add_node("generate_custom_outreach_report", nodes.generate_custom_outreach_report)
workflow.add_node("generate_personalized_email", nodes.generate_personalized_email)
workflow.add_node("generate_interview_script", nodes.generate_interview_script)
workflow.add_node("await_reports_creation", nodes.await_reports_creation)
workflow.add_node("save_reports_to_google_docs", nodes.save_reports_to_google_docs)
workflow.add_node("update_CRM", nodes.update_CRM)

# Edges
workflow.add_edge(START, "get_new_leads")
workflow.add_edge("get_new_leads", "check_for_remaining_leads")

workflow.add_conditional_edges("check_for_remaining_leads",
    nodes.check_if_there_more_leads,
    {"Found leads": "fetch_linkedin_profile_data", "No more leads": END}
)

workflow.add_edge("fetch_linkedin_profile_data", "review_company_website")
workflow.add_edge("review_company_website", "collect_company_information")

# Fan-out: parallel research
workflow.add_edge("collect_company_information", "analyze_blog_content")
workflow.add_edge("collect_company_information", "analyze_social_media_content")
workflow.add_edge("collect_company_information", "analyze_recent_news")

# Fan-in: all three → digital presence report
workflow.add_edge("analyze_blog_content", "generate_digital_presence_report")
workflow.add_edge("analyze_social_media_content", "generate_digital_presence_report")
workflow.add_edge("analyze_recent_news", "generate_digital_presence_report")

workflow.add_edge("generate_digital_presence_report", "generate_full_lead_research_report")
workflow.add_edge("generate_full_lead_research_report", "score_lead")

workflow.add_conditional_edges("score_lead",
    nodes.check_if_qualified,
    {"qualified": "create_outreach_materials", "not qualified": "save_reports_to_google_docs"}
)

# Fan-out: parallel outreach generation
workflow.add_edge("create_outreach_materials", "generate_custom_outreach_report")
workflow.add_edge("create_outreach_materials", "generate_interview_script")
workflow.add_edge("generate_custom_outreach_report", "generate_personalized_email")
workflow.add_edge("generate_interview_script", "await_reports_creation")
workflow.add_edge("generate_personalized_email", "await_reports_creation")

workflow.add_edge("await_reports_creation", "save_reports_to_google_docs")
workflow.add_edge("save_reports_to_google_docs", "update_CRM")
workflow.add_edge("update_CRM", "check_for_remaining_leads")  # batch loop

app = workflow.compile()
```

---

## 4. Data Pipeline

### Graph Traversal: Research → Qualify → Enrich → Draft → Send

```
[CRM] ──fetch──► get_new_leads
                     │ LeadData list
                     ▼
            check_for_remaining_leads
                     │ pop one lead
                     ▼
         fetch_linkedin_profile_data
           RapidAPI: personal + company
                     │
                     ▼
          review_company_website
           html2text scrape → Flash LLM
                     │
                     ▼
       collect_company_information  (fan-out)
         /           |            \
    blog           youtube        news
   (Flash)        (YT API)       (Serper)
         \           |            /
          generate_digital_presence_report (Flash)
                     │
                     ▼
     generate_full_lead_research_report (Pro)
                     │
                     ▼
               score_lead (Pro)
              score < 7 ──► save_reports → update_CRM
              score ≥ 7 ──► create_outreach_materials (fan-out)
                               /                \
                  outreach_report (Pro+Flash)   interview_script (Flash×2)
                               \                /
                        generate_personalized_email (Flash)
                                    │
                                    ▼
                         save_reports_to_google_docs
                                    │
                                    ▼
                               update_CRM
                                    │
                                    ▼
                         check_for_remaining_leads ──► (next lead or END)
```

### HubSpot Integration

```python
class HubSpotLeadLoader(LeadLoaderBase):
    def fetch_records(self, lead_ids=None, status_filter="NEW"):
        # If lead_ids: client.crm.contacts.basic_api.get_by_id() per ID
        # Else: client.crm.contacts.basic_api.get_page(limit=100)
        #       filter by hs_lead_status == status_filter
        # Properties: email, firstname, lastname, hs_lead_status, address, phone

    def update_record(self, lead_id, updates: dict):
        # client.crm.contacts.basic_api.update(
        #     lead_id, SimplePublicObjectInput(properties=updates)
        # )
```

CRM update payload written back on completion:
- Lead status → "ATTEMPTED_TO_CONTACT" or "UNQUALIFIED"
- Lead score (numeric)
- Google Docs folder link
- Custom outreach report link
- Date of outreach attempt

### Airtable Integration

Uses `pyairtable` library. Filters by `Status` column with `match()` formula. Dynamic field creation on update (merges existing + new fields before write).

### Google Sheets Integration

Uses `googleapiclient` Sheets v4 API. Constructs synthetic `id` from row number (starting at 2). Identifies columns by header name matching. Executes batched range updates for efficiency.

### Google Docs / Drive Output

`GoogleDocsManager` creates documents via Docs v1 API (batchUpdate with `insertText` operations), organizes them into per-lead folders via Drive v3 API, and sets `anyone:reader` sharing permissions. Returns shareable links that are embedded in cold emails.

### RAG for Case Study Matching

```python
# Indexing (one-time):
loader = DirectoryLoader("./data/case_studies")
vectorstore = Chroma.from_documents(docs, GoogleGenerativeAIEmbeddings(model="text-embedding-004"))

# Retrieval (per lead):
retriever = vectorstore.as_retriever(search_kwargs={"k": 1})
case_study = retriever.invoke(lead_description)[0].page_content
```

Only `k=1` — single most similar case study. No reranking, no multi-case synthesis.

---

## 5. Evaluation / Quality

### How AI Output Quality Is Measured

There is **no automated evaluation framework** in this codebase. Quality assurance is limited to:

1. **Score threshold as a proxy for quality** — The 7.0/10 lead qualification gate is the only automated quality check. Below threshold: no outreach resources wasted.

2. **Proof-reader pass** — `PROOF_READER_PROMPT` instructs gemini-1.5-flash to review the outreach report for: structure validity, content completeness, and language quality. However, this is an LLM reviewing its own model family's output with no ground truth comparison — it is an editorial polish step, not a correctness evaluator.

3. **Structured output enforcement** — `WebsiteData` and `EmailResponse` Pydantic models enforce schema at parse time. LangChain's `.with_structured_output()` retries on parse failures.

4. **Manual review gate** — `SEND_EMAIL_DIRECTLY = False` defaults to Gmail draft creation, not immediate sending. Human review before send is the implicit quality gate for outreach.

### Confidence Scoring

The numeric lead score (1-10) is the only confidence signal in the system. It is produced by a single LLM call with no:
- Calibration against historical conversion data
- Uncertainty quantification
- Ensemble scoring across multiple models
- Human feedback loop

The score is stored as a string in GraphState and compared with `float(lead_score) >= 7.0`. There is no confidence interval or score provenance.

---

## 6. Rust/ML Relevance

### Would This LangGraph Pattern Translate to Rust?

The LangGraph pattern maps conceptually to Rust's async ecosystem, but with significant friction:

| LangGraph concept | Rust equivalent | Friction |
|---|---|---|
| `StateGraph` node registration | Trait objects + HashMap dispatch | Boilerplate, but feasible |
| `Annotated[list, add]` reducer | Custom `State` struct + `+=` impl | Clean in Rust |
| Fan-out (parallel edges) | `tokio::join!` or `FuturesUnordered` | Natural in async Rust |
| Conditional edges (routing) | `match` + enum variants | Idiomatic Rust |
| Structured output (Pydantic) | `serde` + `schemars` | Excellent parity |
| LLM provider factory | Trait-based LLM client | Well-supported pattern |
| ChromaDB RAG | Qdrant Rust client | Good native support |
| LangChain tool abstractions | Custom async fn traits | More boilerplate |

The graph topology itself (nodes, edges, reducers, conditional routing) translates cleanly. The largest friction point is the LangChain tool ecosystem — Python has 500+ pre-built integrations; Rust has none of this.

For the specific tools in this project:
- **LinkedIn via RapidAPI**: `reqwest` HTTP calls — trivial to port
- **Serper API**: `reqwest` — trivial
- **YouTube Data API**: `reqwest` — trivial
- **html2text scraping**: `scraper` crate + `htmd` for markdown conversion
- **ChromaDB / vector search**: `qdrant-client` (better production choice)
- **HubSpot/Airtable/Google APIs**: `reqwest` + custom auth handlers

The node logic (research, scoring, generation) is entirely LLM-call-based, so the Rust port would consist mostly of prompt construction + HTTP calls to LLM APIs. No trained ML models are used — this is a pure API-orchestration system.

**Verdict:** Portable to Rust, but you'd be rebuilding LangChain's tool layer from scratch. The graph orchestration itself is straightforward. Given the project memory notes about preferring Candle + Rust ML, the LLM routing layer would be the easy part; the value is in the graph topology and prompt engineering, not the Python-specific abstractions.

### Comparison to Vercel AI SDK Approach

| Dimension | LangGraph (Python) | Vercel AI SDK (TypeScript) |
|---|---|---|
| Graph definition | Explicit `StateGraph` with typed nodes | No native graph primitive — use `generateObject` chains |
| Parallelism | `add_edge` fan-out (automatic) | `Promise.all()` explicit |
| State management | `TypedDict` + reducers | Manual, often ad-hoc |
| Conditional routing | `add_conditional_edges` | `if/else` in orchestration code |
| Structured output | Pydantic `.with_structured_output()` | Zod schema via `generateObject` |
| Streaming | Partial support via streaming LLM | First-class via `streamText/streamObject` |
| Tool use | LangChain tool registry | Vercel AI `tools` parameter |
| Loop/batch | Graph loop with state accumulator | Requires manual while loop |
| Observability | LangSmith traces (built-in) | Requires custom instrumentation |
| Deployment | Python script / async process | Vercel Edge Functions / serverless |

LangGraph's key advantage is that **the graph topology is a first-class concern** — you can visualize, serialize, checkpoint, and resume graph execution. The Vercel AI SDK has no equivalent of graph serialization or mid-execution checkpointing.

For the lead-gen platform specifically: the LangGraph fan-out/fan-in pattern for parallel research (blog + social + news simultaneously) would require explicit `Promise.all()` composition in the Vercel AI SDK, losing the declarative topology.

---

## 7. Integration Points

### HubSpot

- Library: `hubspot-api-client` (official Python SDK)
- Auth: OAuth access token via env var
- Reads: `crm.contacts.basic_api.get_by_id()` / `get_page(limit=100)`
- Writes: `crm.contacts.basic_api.update()` with `SimplePublicObjectInput`
- Fields managed: `email`, `firstname`, `lastname`, `hs_lead_status`, `address`, `phone`
- Status values: `NEW`, `UNQUALIFIED`, `ATTEMPTED_TO_CONTACT`

### Airtable

- Library: `pyairtable`
- Auth: access token + base_id + table_name
- Reads: `table.all()` with `match({"Status": status_filter})`
- Writes: fetch → merge fields → `table.update()`
- Dynamic field creation on update (no schema migration required)

### Google Sheets

- Library: `googleapiclient` (Sheets v4)
- Auth: OAuth2 via `google-auth-oauthlib`
- Reads: header row + data rows, status column filter
- Writes: batched range updates, column index → letter notation conversion
- Synthetic `id`: row number starting from 2

### Gmail

- Library: `googleapiclient` (Gmail v1)
- Auth: OAuth2 shared credentials
- Operations: draft creation (`users.drafts.create`) or direct send (`users.messages.send`)
- Message format: MIME text, base64-urlsafe encoded
- Default: draft only (`SEND_EMAIL_DIRECTLY = False`)

### Google Docs / Drive

- Library: `googleapiclient` (Docs v1 + Drive v3)
- Auth: OAuth2 shared credentials
- Creates: documents with batchUpdate insertText
- Organizes: per-lead folders in Google Drive
- Sharing: `anyone:reader` permissions for link sharing
- Returns: shareable URL embedded in cold email

### API Surface

No REST or GraphQL API is exposed. The system runs as a script:

```python
app = build_graph()
app.invoke({"leads_ids": ["lead_id_1", "lead_id_2"]})
```

There is no web server, no webhook receiver, no API endpoint. Integration is via direct Python invocation with CRM credentials in environment variables.

---

## 8. Gaps / Weaknesses

### What the AI Layer Doesn't Do Well

**1. Single-sample scoring with no calibration**
The lead score is one LLM call, one temperature setting, no ensemble, no calibration against historical conversion data. The 7.0 threshold is arbitrary — there is no A/B testing or feedback loop to tune it. A lead that scores 6.9 is discarded with no human review option.

**2. Twitter/Facebook are phantom channels**
URLs for Twitter and Facebook are extracted from the website, but there are no Twitter API or Facebook Graph API integrations. The digital presence report for these platforms relies on LLM inference from URL existence alone. `analyze_social_media_content` only implements YouTube.

**3. LinkedIn discovery is fragile**
The LinkedIn URL discovery chain (email domain → Google search → first LinkedIn URL) breaks on common names, homographs, or when the lead doesn't have a LinkedIn profile. The `scrape_linkedin()` call has basic 200/non-200 error handling with no retry logic, rate limiting, or fallback.

**4. RAG retrieves k=1 with no reranking**
A single case study is retrieved via cosine similarity. There is no:
- Threshold for minimum similarity (a bad match is used regardless)
- Multiple candidate selection with LLM reranking
- Synthesis across multiple relevant case studies
- Metadata filtering by industry/vertical

**5. Reports accumulate without per-lead reset**
The `reports` field uses an `add` reducer. There is no explicit reset between leads in the batch loop. If a node fails to produce a report for one lead, the next lead may inherit stale reports. The `get_report()` function retrieves by title, so an old "Blog Analysis Report" from lead N could appear in lead N+1's context if lead N+1's blog analysis fails.

**6. No streaming or real-time feedback**
All LLM calls are synchronous blocking calls. Processing one lead end-to-end can take several minutes. There is no progress reporting, streaming, or partial result emission.

**7. No deduplication or idempotency**
Running the pipeline twice will process the same leads twice (creating duplicate Google Docs, duplicate Gmail drafts, double CRM updates). Status update to `ATTEMPTED_TO_CONTACT` is the only guard, but this only prevents re-processing leads that completed successfully.

**8. Agency-specific hard-coding**
The `SCORE_LEAD_PROMPT`, `GENERATE_OUTREACH_REPORT_PROMPT`, and email templates contain references to "ElevateAI" and specific AI marketing services. Re-targeting to a different agency requires manual prompt editing across multiple files.

**9. No evaluation against ground truth**
There is no eval framework, no test suite for LLM outputs, no accuracy measurement against historical outcomes. The `PROOF_READER_PROMPT` is editorial, not evaluative.

**10. Email sending is disabled by default but dangerous when enabled**
`SEND_EMAIL_DIRECTLY = True` would send cold emails immediately on pipeline completion, with no bounce handling, unsubscribe management, rate limiting, or compliance checking (CAN-SPAM, GDPR).

**11. No parallelism across leads**
The batch loop processes leads sequentially within the graph. For 50 leads, this is 50 sequential full-pipeline executions. LangGraph supports parallel subgraph execution but this is not leveraged.

**12. ChromaDB persistence is path-relative**
`Chroma.from_documents()` persists at `"./database"` — a relative path. Running from a different working directory silently creates a new empty vector store.

---

## 9. Takeaways for a B2B Lead Gen Platform

### What to Adopt

**A. The fan-out/fan-in research pattern**
Running blog analysis, social media analysis, and news analysis in parallel (rather than sequentially) is the right architecture. In the lead-gen platform's Apollo/Drizzle stack, this maps to `Promise.all()` across enrichment tasks, or parallel LLM calls via the Vercel AI SDK's streaming. The LangGraph graph topology makes this explicit and visualizable — worth implementing an equivalent declarative graph definition even in TypeScript.

**B. Flash for leaf nodes, Pro for synthesis**
The model-tiering strategy (cheap Flash for individual analysis tasks, expensive Pro for consolidated synthesis and decision nodes) is economically sound. Apply this to the lead-gen platform's enrichment pipeline: use cheap/fast models (DeepSeek, Gemini Flash) for individual signal extraction, escalate to GPT-4o or Claude Sonnet only for final ICP scoring and outreach generation.

**C. Pydantic-equivalent structured outputs for each stage**
`WebsiteData` and `EmailResponse` models enforce schema at the LLM output boundary. The lead-gen platform should use Zod schemas on every `generateObject` call, with defined fallback/retry behavior on parse failure.

**D. Two-pass generation with editorial review**
The Pro-drafts + Flash-proofreads pattern for the outreach report adds negligible cost (one Flash call) but catches structural issues. Apply this to email generation and outreach reports in the lead-gen platform.

**E. CRM-agnostic abstraction layer**
The `LeadLoaderBase` pattern with `fetch_records()` and `update_record()` is clean. The lead-gen platform's GraphQL resolvers already provide this abstraction at the API layer, but the explicit status lifecycle (`NEW → ATTEMPTED_TO_CONTACT | UNQUALIFIED`) is worth formalizing in the Drizzle schema as an enum.

**F. SPIN methodology for call scripts**
The two-stage approach (generate SPIN questions from research → expand into full call script) is practical and directly usable. This would be a high-value addition to the platform's outreach module if sales call support is in scope.

**G. RAG for case study / social proof matching**
The ChromaDB case study retrieval pattern is directly applicable. Improve on it: use `k=3` with an LLM reranker, add industry/vertical metadata filtering, and store case studies with structured metadata (industry, company size, outcome metric) rather than raw text. Replace ChromaDB with pgvector (already available in Neon) to eliminate the separate vector DB dependency.

### What to Avoid

**A. Hard-coded agency identity in prompts**
All prompts reference "ElevateAI" and specific service lines. The lead-gen platform must externalize agency identity, value propositions, and scoring criteria as configurable data (DB rows or config files), not hardcoded prompt strings.

**B. Single-LLM lead scoring with no feedback loop**
The 7.0 threshold and six-dimension scoring framework are not validated against real conversion data. Build a proper eval loop: track which scored-as-qualified leads actually converted, feed back into threshold tuning. Start with logged LLM scores + outcomes, then consider fine-tuning a classifier on top.

**C. Synchronous sequential batch processing**
Processing leads one at a time in a graph loop is fine for demos, not for production scale. The lead-gen platform should use proper job queuing (Bull/BullMQ or equivalent) with per-lead worker parallelism and dead-letter handling.

**D. RapidAPI for LinkedIn**
The `fresh-linkedin-profile-data` RapidAPI service is a third-party scraper with ToS risk, no SLA, and unpredictable rate limits. For production, use LinkedIn's official Partner API (requires formal partnership) or an enrichment service with contractual guarantees (Apollo.io, PDL, Clearbit).

**E. OAuth2 credentials in environment files**
Google OAuth tokens expire and need refresh. The credentials pattern (`token.json` in the project root) is fine for local dev but not for multi-tenant production deployment. Use a secrets manager and per-user OAuth credential storage.

**F. k=1 RAG with no similarity threshold**
Always setting k=1 with no minimum similarity score means a poor case study will be used for leads in industries not represented in the training data. This actively hurts outreach quality. Enforce a minimum cosine similarity threshold (e.g., 0.75) and fall back to a generic value prop section when no sufficiently similar case study exists.

### What to Build Upon

**A. LinkedIn URL discovery from email + name**
The Google search → LinkedIn URL extraction pattern is clever and avoids requiring LinkedIn URLs in the CRM. This is worth building upon: cache discovered URLs by email domain to reduce redundant searches, add confidence scoring for ambiguous name matches, and fall back to manual tagging for common names.

**B. Multi-source digital presence scoring**
The six-dimension scoring rubric (Digital Presence, Social Activity, Industry Fit, Company Scale, Marketing Strategy, Pain Points) is a solid starting framework. Extend it with: company funding signals (Crunchbase), tech stack indicators (BuiltWith), job posting velocity (LinkedIn jobs count), and traffic estimates (SimilarWeb API). Turn the LLM score into a trained classifier over these features.

**C. Google Docs as the outreach artifact delivery mechanism**
Using a shared Google Doc as the outreach report (rather than a PDF attachment) is smart — it is indexable, shareable, editable, and trackable. The lead-gen platform could extend this with document-open tracking and comment threading for team review before send.

**D. SPIN-to-call-script pipeline as a separate skill**
The two-stage SPIN generation is general enough to be a standalone skill: given a research report, produce a tailored discovery call script. This could be exposed via the platform's GraphQL API as a mutation (`generateCallScript(leadId: ID!): CallScript`).

**E. Explicit state accumulator pattern for multi-stage enrichment**
The `Annotated[list[Report], add]` reducer pattern — accumulating enrichment artifacts in typed state rather than passing through an ad-hoc context dictionary — is the right data model for a multi-stage enrichment pipeline. In TypeScript, model this as a typed `EnrichmentState` object updated immutably at each stage, stored per-company in the Drizzle schema.

---

## Appendix: Dependency Inventory

```
# Core AI/ML
langgraph
langchain-core
langchain_community
langchain_google_genai
langchain_openai
langchain_chroma
chromadb

# CRM integrations
hubspot-api-client
pyairtable

# Google platform
google-api-python-client
google-auth-oauthlib
google-auth-httplib2

# Web scraping
bs4
unstructured

# Utilities
python-dotenv
colorama
```

All dependencies are pinned without versions in `requirements.txt`, which is a reproducibility risk.

---

## 10. Deep ML Analysis

### ChromaDB RAG: Exact Configuration

From the repository source (confirmed via `database/chroma.sqlite3` artifact and LangChain wrapper usage pattern):

```python
# Indexing (one-time in setup):
loader = DirectoryLoader("./data/case_studies")
vectorstore = Chroma.from_documents(
    docs,
    GoogleGenerativeAIEmbeddings(model="models/text-embedding-004"),
    persist_directory="./database"
)

# Retrieval (per lead):
retriever = vectorstore.as_retriever(search_kwargs={"k": 1})
case_study = retriever.invoke(lead_description)[0].page_content
```

**Embedding model:** Google `text-embedding-004`. Specifications: 768-dimensional output vectors (same as the `text-embedding-005` successor — Google standardized on 768 for this generation), max input 2,048 tokens, supports `taskType` parameter (`RETRIEVAL_DOCUMENT`, `RETRIEVAL_QUERY`, `SEMANTIC_SIMILARITY`, etc.). The codebase does not set a `taskType`, defaulting to general-purpose embedding, which is sub-optimal for asymmetric retrieval (query ≠ document).

**ChromaDB index (defaults used):** HNSW with:
- `space=l2` (L2 Euclidean — not cosine)
- `ef_construction=100`
- `ef_search=100`
- `max_neighbors=16` (M parameter)
- Persisted at `./database` (relative path — breakage risk when invoked from different working directories)

**k=1 design flaw analysis:** Retrieving exactly one case study has three compounding failure modes:
1. **No similarity threshold.** A case study from the "e-commerce" vertical will be returned for a "healthcare" lead with cosine similarity of 0.45 — below any reasonable relevance threshold — with no indication to the LLM that the match is poor.
2. **No diversity.** If the agency has 5 case studies in fintech and 1 in manufacturing, a manufacturing lead will receive a fintech case study simply because it is the least-bad L2 neighbor.
3. **Single-failure surface.** The outreach report's RAG quality is entirely determined by one retrieval call. With `k=3` + LLM reranking (e.g., Cohere Rerank or a second LLM pass), at least two of three retrieved documents would likely be relevant.

The practical fix: `search_kwargs={"k": 3, "score_threshold": 0.75}` with a fallback to a generic value-proposition block when no document meets the threshold.

**Distance metric mismatch:** L2 on 768-dimensional normalized vectors approximates cosine ranking but is not identical. Google's own documentation recommends cosine similarity for `text-embedding-004`. The ChromaDB collection should be initialized with `metadata={"hnsw:space": "cosine"}`.

### SPIN Methodology: Academic Grounding and LLM Mapping

SPIN (Situation-Problem-Implication-Need-payoff) was published in Neil Rackham's "SPIN Selling" (McGraw-Hill, 1988), based on analysis of 35,000 sales calls conducted by Huthwaite International. The methodology is not a peer-reviewed academic framework — it is practitioner literature with empirical (but proprietary) supporting data.

The codebase maps SPIN to LLM prompting as follows:

| SPIN Stage | LangGraph Prompt Instruction | LLM Task |
|---|---|---|
| **Situation** | "Gather factual background about their current setup" | Generate open-ended questions about existing state |
| **Problem** | "Identify difficulties or dissatisfaction" | Generate diagnostic questions probing pain |
| **Implication** | "Develop consequences/effects of the problem" | Generate consequence-amplifying questions |
| **Need-Payoff** | "Have prospect articulate value of solving" | Generate solution-focused questions |

The `GENERATE_SPIN_QUESTIONS_PROMPT` instructs the model to produce maximum 15 questions distributed across these four categories, based on the Global Research Report. The `WRITE_INTERVIEW_SCRIPT_PROMPT` then expands questions into a conversational flow with intro hooks and closing segments.

No academic paper on AI-driven SPIN implementation was found. The closest ML literature is in argumentation mining (identifying claim structures in dialogues) and preference elicitation in conversational recommendation systems — both of which are academically adjacent but not SPIN-specific.

### Gemini 1.5 Flash vs. Pro Routing: Cost and Performance Delta

The tiered routing pattern in this codebase (Flash for leaf nodes, Pro for synthesis) has measurable cost implications based on Google's published pricing and community benchmarks:

| Metric | Gemini 1.5 Flash | Gemini 1.5 Pro |
|---|---|---|
| Input cost (per 1M tokens) | $0.075 (≤128K ctx) | $3.50 (≤128K ctx) |
| Output cost (per 1M tokens) | $0.30 (≤128K ctx) | $10.50 (≤128K ctx) |
| Context window | 1M tokens | 1M tokens |
| MMLU score | 78.9% | 81.9% |
| Typical latency | 0.5–1.2s (first token) | 2–5s (first token) |

**Cost delta per lead (estimated):** Assuming 4 Flash calls × 2K tokens + 2 Pro calls × 8K tokens of output:
- Flash: 4 × 2K × $0.30/1M = $0.0024
- Pro: 2 × 8K × $10.50/1M = $0.168
- Total per lead: ~$0.17, of which Pro accounts for ~99% of LLM cost

**Accuracy trade-off:** The MMLU delta (3 points) understates the practical difference on synthesis tasks. Pro's longer effective reasoning context and stronger instruction-following make it materially better for the Global Lead Research Report (which ingests all prior node outputs) and the lead qualification score (a structured judgment call). Flash's accuracy is sufficient for individual data extraction tasks (blog scoring, website summary).

**The architectural insight:** Cost scales linearly with Pro call count. Every additional Pro call per lead costs ~$0.08–0.17. A system designer should minimize Pro calls to decision nodes only and use Flash or a local model for all extraction/summarization tasks.

### LangGraph State Machine Formalism

The `StateGraph` in LangGraph implements a **directed acyclic graph with conditional routing and cycle re-entry**. The key formalism:

- **Nodes** are pure functions `(GraphState) → GraphState` (or `(GraphState) → dict`).
- **Edges** are static or conditional. Static edges fire unconditionally; conditional edges evaluate a function `(GraphState) → str` and route to the matching key.
- **Reducers** are type-level annotations (`Annotated[list[Report], add]`) that define how partial state updates from different nodes are merged. The `add` reducer implements append-only accumulation.
- **The batch loop** is a self-loop: `update_CRM → check_for_remaining_leads` creates a cycle. LangGraph supports cycles via explicit looping — `StateGraph` is not constrained to DAGs.
- **Fan-out/fan-in** is implemented as multiple outgoing edges from one node + multiple incoming edges to one node. LangGraph runs all fan-out branches in parallel by default when `collect_company_information` has three successors.

The recursion limit is set to 1000 in `main.py` (`app.invoke({"leads_ids": [...]}, {"recursion_limit": 1000})`), which caps the total number of node invocations. For a 50-lead batch with ~17 nodes per lead, the effective capacity is ~58 leads before hitting the limit.

### LinkedIn Data Quality: RapidAPI `fresh-linkedin-profile-data`

The `fresh-linkedin-profile-data` RapidAPI provider presents three concrete risks:

1. **Freshness:** The service caches profiles. According to community reports, cache TTL ranges from 24 hours to 30 days depending on profile popularity. A contact who left their company 3 weeks ago may still show as current.
2. **Legal risk:** LinkedIn's User Agreement §8.2 prohibits scraping. RapidAPI services that scrape LinkedIn without authorization expose users to cease-and-desist risk. LinkedIn has successfully sued scrapers (hiQ Labs v. LinkedIn, reversed by 9th Circuit 2022 on Computer Fraud and Abuse Act grounds, but the ToS violation risk remains).
3. **Accuracy:** Profile data (job titles, company names) is self-reported by LinkedIn users and not verified. Seniority inference from title is unreliable for ambiguous titles like "Lead" or "Principal."

Recommended alternatives with better legal standing: Apollo.io, PDL (People Data Labs), Clearbit Enrichment, Clay — all maintain explicit licensing agreements with data sources and provide contractual data accuracy guarantees.

---

## 11. Research Papers & Prior Art

| Paper | Authors | Year | Venue | Relevance | Key Finding |
|-------|---------|------|-------|-----------|-------------|
| ReAct: Synergizing Reasoning and Acting in Language Models | Yao, Zhao, Yu, Du, Shafran, Narasimhan, Cao | 2022 | ICLR 2023 | LangGraph nodes that call tools are implementing ReAct-style reasoning; the fan-out pattern is a parallel multi-ReAct structure | Interleaving reasoning traces with actions outperforms action-only or reasoning-only baselines; 34% gain on interactive decision-making |
| Reflexion: Language Agents with Verbal Reinforcement Learning | Shinn, Cassano, Berman, Gopinath, Narasimhan, Yao | 2023 | arXiv 2303.11366 | The proof-reader pass in this system is a weak Reflexion: a second LLM critiques first LLM output. Full Reflexion would loop until the critic is satisfied | Verbal self-reflection without weight updates achieves 91% pass@1 on HumanEval; episodic memory buffer enables iterative improvement |
| Cognitive Architectures for Language Agents (CoALA) | Sumers, Yao, Narasimhan, Griffiths | 2023 | TMLR 2024 | This LangGraph system implements CoALA's "action space" (external tool calls) and "memory" (TypedDict state accumulator) but lacks long-term memory and decision-making reflection | Framework unifying memory (in-context, external, episodic, semantic) with structured action space for language agents |
| A Survey on Large Language Model based Autonomous Agents | Wang et al. | 2023 | arXiv 2308.11432 | Positions the fan-out research graph as a multi-agent pattern; each parallel analysis branch approximates a specialist agent | Profile + memory + planning + action framework; this codebase implements planning (graph topology) and action (tool calls) but no inter-agent memory sharing |
| Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena | Zheng, Chiang, Sheng et al. | 2023 | NeurIPS 2023 | The PROOF_READER_PROMPT is an LLM-as-judge pattern; this paper establishes the methodology and identifies its biases (verbosity preference, position bias) | GPT-4 as judge achieves >80% agreement with humans; same-model-family judging introduces self-enhancement bias (Flash judging Flash-generated content) |
| Filtered Approximate Nearest Neighbor Search in Vector Databases | Amanbayev, Tsan, Dang, Rusu | 2026 | arXiv 2602.11443 | Directly addresses the k=1/HNSW design choice; shows IVFFlat outperforms HNSW for low-selectivity filtered queries (e.g., "case studies in fintech only") | For filtered RAG, partition-based IVFFlat beats graph-based HNSW; metadata filtering before ANN search is critical for domain-specific RAG |
| AI Agents That Matter | Kapoor, Stroebl, Siegel, Nadgir, Narayanan | 2024 | arXiv 2407.01502 | The 7.0 lead score threshold with no A/B validation is exactly the class of "benchmark overfitting" this paper warns against — arbitrary thresholds not validated against real outcomes | Current agent evaluations optimize accuracy without cost; joint cost-accuracy optimization and holdout validation sets are necessary for real-world utility |
| Towards Personalized Conversational Sales Agents: Contextual User Profiling for Strategic Action | Kim et al. | 2025 | arXiv 2504.08754 | Direct academic framing of what this system tries to do; introduces CSALES task with formal evaluation | LLM-based user simulation enables training data generation for sales agents; contextual user profiling > static scoring |
| Agentic Retrieval-Augmented Generation: A Survey | Singh, Ehtesham, Kumar, Khoei | 2025 | arXiv 2501.09136 | The case study RAG layer in this system is a minimal agentic RAG; this survey describes more sophisticated patterns (iterative retrieval, query reformulation) that would improve it | Dynamic retrieval with reflection and planning outperforms static one-shot RAG for complex synthesis tasks |

### Annotations

**On CoALA (Sumers et al., 2023):** The LangGraph state machine maps cleanly to CoALA's architecture. The `TypedDict` accumulator is CoALA's "external storage." The graph topology is CoALA's "planning" (sequential + conditional). The missing CoALA components are: (1) no long-term semantic memory across leads, (2) no decision-making loop that updates the action plan based on intermediate results. Adding a "should I continue research or escalate to Pro model?" conditional node after `generate_digital_presence_report` would implement CoALA's deliberation component.

**On the k=1 RAG flaw (Amanbayev et al., 2026):** The paper specifically shows that for filtered search (industry-specific retrieval), IVFFlat with pre-filtering outperforms HNSW with post-filtering. For this system's case study retrieval, the right architecture is: add a `metadata` field to each case study document with `{"industry": "fintech", "company_size": "SMB"}`, then use ChromaDB's `where` clause to pre-filter by industry before ANN search. This makes k=1 much less dangerous because the candidate pool is already domain-constrained.

**On SPIN academic grounding:** The SPIN methodology (Rackham, 1988) predates NLP by decades. The academic ML literature does not yet have a "SPIN paper" — the closest work is in argumentation mining (Stab & Gurevych, 2017) and persuasive dialogue generation. The system's SPIN implementation is entirely prompt-engineered with no ML training signal. A future improvement: fine-tune a sequence classifier on the 35,000+ call dataset that Huthwaite International used for the original SPIN research, if licensable, to automatically identify which SPIN stage each question belongs to and measure coverage.

**On LLM-as-judge bias (Zheng et al., 2023):** The proof-reader pass (Flash reviewing Flash-generated content) has the specific "self-enhancement bias" identified in this paper — a model tends to rate outputs from the same model family higher. For a production system, the proofreader should use a different model family than the drafter (e.g., GPT-4o proofing Gemini-generated content) to get genuinely independent editorial review.

*Sources: [GitHub repository](https://github.com/kaymen99/sales-outreach-automation-langgraph), [DEV.to article by kaymen99](https://dev.to/kaymen99/how-ai-automation-can-transform-your-sales-outreach-strategy-aop), [customization docs](https://github.com/kaymen99/sales-outreach-automation-langgraph/blob/main/docs/customization.md)*

---

## 12. Recency & Changelog

### Latest Commit

**2025-01-15 — "Updated README"** (SHA `2e2761c`). This is a documentation-only change. The last substantive code commit was **2024-12-22 ("Updated nodes & tools")**, followed by a cluster of README/docs updates through January 15. No code changes have been committed since that December 2024 push.

### Repository Activity

| Metric | Value |
|---|---|
| Total commits | 30 |
| First commit | 2024-08-01 |
| Last code change | 2024-12-22 |
| Last any commit | 2025-01-15 (README only) |
| Stars | 258 |
| Forks | 69 |
| Open issues | 1 |
| Open PRs | 0 |

Commit cadence breaks into three distinct bursts: initial release (Aug 2024, 6 commits), a quiet phase (Sep 2024, 3 commits), and a December 2024 feature push (16 commits over Dec 5–22) that added `.env.example`, automation workflow updates, and node/tool changes. After January 15, 2025, the repository went silent. **No commits in the last 14+ months** (as of 2026-03-28). The project is effectively in maintenance-freeze; it is not actively maintained.

### Dependency Freshness

The `requirements.txt` **pins no versions** — all packages (`langgraph`, `langchain-core`, `langchain_google_genai`, etc.) are listed as bare names. This creates a double-edged problem:

- **At time of authoring (Dec 2024):** The repo was written against LangGraph **0.2.55–0.2.60** (the 0.2.x series was current then).
- **Latest LangGraph today (2026-03-28):** **1.1.3** (released 2026-03-18).
- **Gap:** 0.2.x → 1.1.3 spans two major version bumps (0.3.x, 0.4.x, 0.5.x, 0.6.x, 1.0.x, 1.1.x) and 14+ months of releases.

| Package | Implied version at authoring | Latest (2026-03-28) | Risk |
|---|---|---|---|
| `langgraph` | ~0.2.60 | 1.1.3 | High — two major bumps |
| `langchain-core` | ~0.3.x | 1.2.x | Medium |
| `langchain_google_genai` | ~2.x | unknown | Medium |
| `chromadb` | ~0.5.x | ~0.6.x | Low |
| `langchain_chroma` | ~0.1.x | ~0.2.x | Low |

Because `requirements.txt` has no pins, `pip install -r requirements.txt` today will pull the latest versions of everything, likely breaking the graph construction API.

### Open Issues

**1 open issue** (as of 2026-03-28):

- **Issue #2 — "Any idea on the cost implications with this approach?"** (opened 2025-06-03, unanswered). No response from the author. The author has not engaged with GitHub issues since the repo went quiet.

No bug reports, no feature requests, no dependency update PRs. The absence of issues does not indicate quality — it indicates low traffic and an inactive maintainer.

### LangGraph Framework Changes (last 90 days)

The last 90 days covers LangGraph **1.0.8 through 1.1.3** (February–March 2026). Key upstream changes relevant to this repo:

**LangGraph 1.1.0 (2026-03-10) — Type-Safe Streaming v2 (opt-in)**
A new `version="v2"` parameter on `invoke()` and `stream()` produces strongly-typed `GraphOutput` and `StreamPart` objects instead of raw dicts/tuples. Old-style dict access on `invoke()` results now emits `LangGraphDeprecatedSinceV11` warnings. The repo's `app.invoke({"leads_ids": [...]})` usage is v1-style and will generate deprecation warnings on 1.1.x. No runtime breakage yet, but this is queued for removal in v3.0.

**LangGraph 1.0.0 (2025-10-17) — Major version, no breaking changes**
LangGraph announced 1.0 with explicit backward compatibility. The one notable deprecation was `langgraph.prebuilt` moving to `langchain.agents`. This repo does not import `langgraph.prebuilt`, so that deprecation is not directly relevant.

**LangGraph 0.3.x → 0.4.x → 0.5.x → 0.6.x (Feb–Aug 2025)**
The 0.3.x series (Feb 2025) introduced the `functional API` and restructured some checkpoint internals. The 0.5.x / 0.6.x series added distributed runtime and LangGraph Platform features. None of these changes remove the `StateGraph` / `add_edge` / `add_conditional_edges` API that this repo uses — those primitives are the stable core of LangGraph and have not been broken across any release.

**The critical unknown:** The 0.2.x → 0.3.x boundary (February 2025) may have changed internal module paths or import signatures. The repo was written on 0.2.x and has never been tested against any newer version. Without running it, the exact failure surface is unknown.

### Staleness Assessment

**Safe to fork, risky to run as-is.** The graph topology, prompting strategy, and architectural patterns remain fully valid — the LangGraph `StateGraph` primitive is stable and backward-compatible. However:

1. **Dependency installation will pull breaking versions.** Running `pip install -r requirements.txt` today installs LangGraph 1.1.3, which is ~14 months newer than what the code was written against. The `StateGraph` core API is intact, but edge cases in state reducers, streaming behavior, and the checkpoint layer may behave differently.

2. **Gemini 1.5 Flash and 1.5 Pro are not deprecated but may change defaults.** Google has released Gemini 2.0 and the `google-generativeai` / `langchain_google_genai` package may have updated default model routing. Hardcoded model strings (`gemini-1.5-flash`, `gemini-1.5-pro`) still work but are no longer Google's current recommended models.

3. **No maintenance signal.** Zero commits in 14+ months, zero issue responses, zero PR activity. If a dependency breaks the graph construction API, there is no maintainer to fix it.

4. **Recommended approach for forking:** Pin specific versions in a fresh `requirements.txt` using the dependency matrix the repo was authored against (`langgraph==0.2.60`, `langchain-core==0.3.x`) for reproducibility, then upgrade incrementally with testing. The graph topology and prompt logic are worth copying; the dependency configuration is not.

*Sources: [GitHub commits](https://github.com/kaymen99/sales-outreach-automation-langgraph/commits/main), [GitHub issues](https://github.com/kaymen99/sales-outreach-automation-langgraph/issues), [LangGraph releases](https://github.com/langchain-ai/langgraph/releases), [LangGraph 1.0 changelog](https://changelog.langchain.com/announcements/langgraph-1-0-is-now-generally-available), [DEV.to article by kaymen99](https://dev.to/kaymen99/how-ai-automation-can-transform-your-sales-outreach-strategy-aop)*
