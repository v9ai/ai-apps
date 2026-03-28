# Curated Agent Skills for lead-gen — Remote Work Global Focus

This document curates relevant skills and subagents from [awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) and [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents), tailored to the lead-gen project with emphasis on **remote-global job board aggregation and matching**.

---

## 1. Core Frontend & UI/UX

**Purpose:** Build responsive, performant job board interfaces with excellent UX for remote workers globally.

### Official Anthropic Skills
- **Frontend Design and UI/UX Development** — Design-to-code workflows for job listings, filters, and application tracking
- **Web Artifacts Builder with React/Tailwind** — Rapid prototyping of job search, resume, and settings pages
- **Next.js Optimization and Caching Strategies** (Vercel) — Static generation for job listings, ISR for real-time updates

### Claude Code Subagents
- **nextjs-developer** (voltagent-core-dev) — Framework expertise for App Router, API routes, middleware
- **frontend-developer** (voltagent-core-dev) — React 19 component architecture, state management
- **react-specialist** (voltagent-lang) — Advanced patterns for job filtering, search bars, infinite scroll
- **ui-designer** (voltagent-core-dev) — Design system consistency for multi-language job board (i18n)

---

## 2. Backend, GraphQL & Data Architecture

**Purpose:** Design scalable GraphQL API with D1 database for job aggregation, filtering, and resume matching across global platforms.

### Official Anthropic Skills
- **MCP Server Creation** — Build Model Context Protocol servers for ATS integrations (Greenhouse, Lever, Ashby)
- **Cloudflare Tools (Workers, D1, Vectorize, Queues)** (Cloudflare Team) — Serverless job processing pipeline, resume RAG indexing, background job classification

### Claude Code Subagents
- **graphql-architect** (voltagent-core-dev) — Schema design for jobs, companies, applications, skills taxonomy
- **backend-developer** (voltagent-core-dev) — Apollo Server 5 resolvers, context with Better Auth session, federation patterns
- **database-administrator** (voltagent-infra) — Drizzle ORM optimization, D1 query performance, migration strategy
- **api-designer** (voltagent-core-dev) — REST endpoint design for text-to-SQL, company enrichment, bulk imports
- **database-optimizer** (voltagent-data-ai) — Index optimization for job search queries, skill extraction performance

---

## 3. AI/LLM & Job Classification Pipeline

**Purpose:** Develop ML pipeline for accurate remote-global job classification, skill extraction, and resume matching.

### Official Anthropic Skills
- **Prompt Engineering** — Optimize prompts for job classification, bias detection, skill extraction accuracy
- **Document Handling (PDF, DOCX)** — Parse resumes and job descriptions for skill matching

### Claude Code Subagents
- **llm-architect** (voltagent-data-ai) — Design multi-LLM pipelines (Claude, DeepSeek, Google) for job classification
- **prompt-engineer** (voltagent-data-ai) — Refine classification and extraction prompts; manage prompt versions
- **nlp-engineer** (voltagent-data-ai) — Skill extraction, entity recognition for remote work indicators (flexible hours, timezone-agnostic, etc.)
- **machine-learning-engineer** (voltagent-data-ai) — Train classifiers for remote job signals globally; handle regional variations
- **ai-engineer** (voltagent-data-ai) — End-to-end ML pipeline management, model evaluation

---

## 4. Data Engineering & Ingestion

**Purpose:** Ingest jobs from Greenhouse, Lever, Ashby; extract skills; maintain taxonomy; evaluate model accuracy.

### Claude Code Subagents
- **data-engineer** (voltagent-data-ai) — Build ATS fetcher pipelines (Greenhouse, Lever, Ashby), ETL workflows
- **data-analyst** (voltagent-data-ai) — Job board coverage analysis, skill taxonomy validation, remote work trend reporting
- **data-scientist** (voltagent-data-ai) — Statistical analysis of job classifications, bias audit (fairness across regions)

---

## 5. Infrastructure, Deployment & DevOps

**Purpose:** Deploy and maintain the application on Vercel with resilient data pipelines.

### Official Anthropic Skills
- **Web Performance Auditing** — Job board page speed, Core Web Vitals monitoring

### Claude Code Subagents
- **devops-engineer** (voltagent-infra) — CI/CD for Next.js, deployment orchestration
- **deployment-engineer** (voltagent-infra) — Vercel multi-environment setup, secrets management
- **platform-engineer** (voltagent-infra) — Observability (LangSmith), error tracking, log aggregation
- **sre-engineer** (voltagent-infra) — Incident response, job classification failures, database connectivity issues

---

## 6. Quality Assurance & Testing

**Purpose:** Evaluate job classification accuracy, detect bias, assess resume matching quality.

### Official Anthropic Skills
- **Smart Contract Vulnerability Scanning** (Trail of Bits) — *Adapt security scanning patterns for LLM prompt injection*
- **Property-Based Testing** (Trail of Bits) — Generate test cases for edge cases in skill extraction

### Claude Code Subagents
- **qa-expert** (voltagent-qa-sec) — Test remote work classification accuracy across job descriptions
- **test-automator** (voltagent-qa-sec) — Automated eval suites, regression tests for classifiers
- **performance-engineer** (voltagent-qa-sec) — Profile job listing queries, skill extraction latency, resume RAG search speed
- **accessibility-tester** (voltagent-qa-sec) — WCAG compliance for job board

---

## 7. Business & Product

**Purpose:** Align product with remote worker needs globally; manage features and strategy.

### Claude Code Subagents
- **product-manager** (voltagent-biz) — Feature prioritization, user feedback integration, remote work market research
- **seo-specialist** (voltagent-domains) — Job board SEO, geo-targeted keywords for global remote job search
- **content-marketer** (voltagent-biz) — Blog posts, guides for remote job seekers worldwide, skill trend reports
- **business-analyst** (voltagent-biz) — Market analysis, competitor monitoring (other global job boards), revenue modeling
- **technical-writer** (voltagent-biz) — Documentation for job ingestion, resume upload, API endpoints

---

## 8. Security & Compliance

**Purpose:** Secure user data (resumes, preferences), ensure compliance and data privacy.

### Claude Code Subagents
- **security-engineer** (voltagent-infra) — Audit GraphQL queries for injection, Better Auth session hardening, API key rotation
- **security-auditor** (voltagent-qa-sec) — GDPR data retention audits, PII detection in job descriptions and resumes
- **compliance-auditor** (voltagent-qa-sec) — Employment law compliance (working hours in job postings, anti-discrimination)

---

## 9. Remote Work Global Focus

### Key Indicators for Classification:
- **Remote work signals:** "fully remote," "work from anywhere," "distributed team," "async-friendly," "remote-first"
- **Global hiring signals:** "hiring worldwide," "open to applicants from any country," no location restriction in JD
- **Async culture:** Documented async practices, overlap hours requirements (< 4 h overlap preferred)
- **Timezone flexibility:** Multiple timezones on employee profiles, overlapping-hours policies
- **Visa/work authorization:** "We sponsor visas worldwide" or "contractors welcome globally"

### Regional Considerations:
- **Americas:** US-remote roles often restrict to US residents — check explicitly
- **Asia-Pacific:** Growing async-remote culture; check for APAC timezone requirements
- **Global:** "Work from anywhere" roles with no overlap requirement are ideal

---

## 10. Integration Roadmap

### Phase 1: Foundation
- [ ] **frontend-developer** + **nextjs-developer**: Build job listing UI with filters
- [ ] **graphql-architect** + **backend-developer**: Design GraphQL schema, resolvers
- [ ] **database-administrator**: Optimize PostgreSQL schema for job queries

### Phase 2: AI Pipeline
- [ ] **prompt-engineer**: Refine job classification prompts for "remote global" signal detection
- [ ] **nlm-architect**: Set up multi-LLM routing (Claude for classification, DeepSeek for cost, etc.)
- [ ] **data-engineer**: Ingest jobs from ATS platforms

### Phase 3: ML Evaluation
- [ ] **nlp-engineer**: Extract remote work signals (keywords, timezone mentions, salary bands)
- [ ] **ai-engineer**: Build evaluation suite for classifier accuracy
- [ ] **performance-engineer**: Profile skill extraction, resume RAG latency

### Phase 4: Deployment & Scale
- [ ] **devops-engineer**: CI/CD pipeline for Next.js + Vercel
- [ ] **platform-engineer**: Observability, error tracking, alerts for job ingestion failures
- [ ] **sre-engineer**: Incident response playbooks

### Phase 5: Product & Growth
- [ ] **product-manager**: Remote work feature prioritization, user surveys
- [ ] **seo-specialist**: Optimize job board for "remote jobs worldwide" search
- [ ] **content-marketer**: Publish remote work trend reports, salary benchmarks

---

## 11. References

- **Awesome Agent Skills:** https://github.com/VoltAgent/awesome-agent-skills
- **Awesome Claude Code Subagents:** https://github.com/VoltAgent/awesome-claude-code-subagents
- **lead-gen Project:** `/home/user/lead-gen`
- **CLAUDE.md:** Architecture, tech stack, data flow documentation
