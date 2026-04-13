import type { Paper, PipelineAgent, Stat, TechnicalDetail, ExtraSection } from "@ai-apps/ui/how-it-works";

// ─── Technical Foundations ──────────────────────────────────────────

export const papers: Paper[] = [
  {
    slug: "nextjs-15",
    number: 1,
    title: "Next.js 15",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vercel",
    year: 2024,
    finding: "React framework with App Router for server-side rendering, static generation, and API routes",
    relevance: "Used for the entire web application, with server components (e.g., src/app/admin/contacts/page.tsx) and client components for interactive parts like CompanyContactsClient",
    url: "https://nextjs.org/docs",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "postgresql-neon",
    number: 2,
    title: "PostgreSQL (Neon)",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Neon",
    year: 2024,
    finding: "Serverless PostgreSQL with branching and auto-scaling capabilities",
    relevance: "Stores core data like companies and contacts via Drizzle ORM schema (src/db/schema.ts), with tables companies and contacts for lead management",
    url: "https://neon.tech/docs",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "better-auth",
    number: 3,
    title: "Better Auth",
    category: "Authentication",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "AI Apps",
    year: 2024,
    finding: "Authentication library with server-side session management and email/password support",
    relevance: "Handles user authentication via @ai-apps/auth, with server-side checks in checkIsAdmin() (src/lib/admin.ts) for admin routes",
    url: "https://github.com/ai-apps/auth",
    categoryColor: "var(--purple-9)",
  },
  {
    slug: "openai-gpt",
    number: 4,
    title: "OpenAI GPT",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "OpenAI",
    year: 2024,
    finding: "Large language model for natural language understanding and generation",
    relevance: "Used in contact enrichment via src/lib/ai-contact-enrichment.ts and intent detection via analyzeLinkedInPosts mutation",
    url: "https://platform.openai.com/docs",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "candle-rust",
    number: 5,
    title: "Candle (Rust)",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Hugging Face",
    year: 2024,
    finding: "Rust ML framework for efficient, local model inference with Metal acceleration",
    relevance: "Powers the local embedding server on port 9998, generating JobBERT-v2 embeddings for lead scoring and similarity search",
    url: "https://github.com/huggingface/candle",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "drizzle-orm",
    number: 6,
    title: "Drizzle ORM",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Drizzle Team",
    year: 2024,
    finding: "TypeScript ORM with schema migrations and type-safe queries",
    relevance: "Manages database schema in src/db/schema.ts, defining tables like companies and contacts with relationships and indexes",
    url: "https://orm.drizzle.team/docs",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "graphql-apollo",
    number: 7,
    title: "GraphQL (Apollo)",
    category: "API",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Apollo",
    year: 2024,
    finding: "Query language for APIs with a single endpoint and generated types",
    relevance: "Used for data fetching via queries like GetContacts and mutations like CreateDraftCampaign, with hooks in admin components",
    url: "https://www.apollographql.com/docs",
    categoryColor: "var(--orange-9)",
  },
  {
    slug: "inngest",
    number: 8,
    title: "Inngest",
    category: "Infrastructure",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Inngest",
    year: 2024,
    finding: "Background job processing with event-driven scheduling and retries",
    relevance: "Orchestrates pipeline tasks like data ingestion and email sending, triggered by events from scripts and mutations",
    url: "https://www.inngest.com/docs",
    categoryColor: "var(--red-9)",
  },
  {
    slug: "resend",
    number: 9,
    title: "Resend",
    category: "API",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Resend",
    year: 2024,
    finding: "Email API with React components and webhook support for tracking",
    relevance: "Sends personalized emails via mutations like useCreateDraftCampaignMutation, with webhook validation for email events",
    url: "https://resend.com/docs",
    categoryColor: "var(--orange-9)",
  },
  {
    slug: "jobbert-v2",
    number: 10,
    title: "JobBERT-v2",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "TechWolf",
    year: 2024,
    finding: "BERT model fine-tuned for job and company embeddings",
    relevance: "Generates embeddings via Candle server for semantic search in useGetSimilarPostsLazyQuery and lead scoring based on distance",
    url: "https://huggingface.co/techwolf/jobbert-v2",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "radix-ui",
    number: 11,
    title: "Radix UI",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Radix UI",
    year: 2024,
    finding: "Unstyled, accessible component primitives for building UIs",
    relevance: "Used in components like BatchEmailModal and EditCampaignDialog for consistent, interactive UI elements",
    url: "https://www.radix-ui.com/docs",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "vanilla-extract",
    number: 12,
    title: "Vanilla Extract",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vanilla Extract",
    year: 2024,
    finding: "CSS-in-JS library with zero-runtime styles and TypeScript support",
    relevance: "Styles the application with Next.js plugin, providing type-safe CSS for components like LandingPipeline",
    url: "https://vanilla-extract.style/docs",
    categoryColor: "var(--blue-9)",
  },
];

// ─── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "7",
    label: "Pipeline modules visualized in LandingPipeline component",
    source: "Component analysis",
  },
  {
    number: "0..1",
    label: "Lead fit score range stored in companies.score column",
    source: "Database schema (src/db/schema.ts)",
  },
  {
    number: "9998",
    label: "Port for local Candle embedding server",
    source: "Embedding server configuration",
  },
  {
    number: "50",
    label: "Page size for paginated admin tables (PAGE_SIZE constant)",
    source: "src/app/admin/contacts/page.tsx",
  },
  {
    number: "3",
    label: "AI tier levels: 0=not AI, 1=ai_first, 2=ai_native",
    source: "Database schema (companies.ai_tier)",
  },
  {
    number: "300ms",
    label: "Debounce delay for search input in admin contacts",
    source: "src/app/admin/contacts/page.tsx debounce pattern",
  },
  {
    number: "8am UTC",
    label: "Default send time for business-day scheduled emails",
    source: "src/lib/business-days.ts",
  },
];

// ─── Pipeline Stages ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
  {
    name: "Company Discovery",
    description: "The pipeline begins with a Rust-based web crawler (crates/agentic-search) that discovers tech companies via commands like cargo run --release -- --root ../.. discover --output discovery.json. This outputs raw company data to src/app/stack/discovery.json, which includes domains and initial metadata. The crawler uses Brave Search API for web discovery, targeting AI and tech sectors based on configured queries. This step ensures a broad input of potential leads for enrichment.",
    researchBasis: "Rust for performance, Brave Search API for web data",
    codeSnippet: "cargo run --release -- --root ../.. discover --output discovery.json",
    dataFlow: "Web queries \u2192 Rust crawler \u2192 JSON file (discovery.json)",
  },
  {
    name: "Profile Enrichment",
    description: "TypeScript scripts (e.g., scripts/scrape-linkedin-people.ts) enrich company profiles by scraping LinkedIn for contacts and posts. The Rust crate linkedin-posts (cargo run --bin linkedin-posts) handles real-time post monitoring, while scripts fetch GitHub data via src/lib/ai-contact-enrichment.ts. This step uses regex patterns (e.g., AI_TAG_RE) to detect AI professionals and fetches repos with AI_GITHUB_TOPICS. Data is validated with NeverBounce for emails and stored temporarily for processing.",
    researchBasis: "LinkedIn scraping, GitHub API, regex detection",
    codeSnippet: "const AI_TAG_RE = /\\b(ai|ml|llm|nlp)\\b/i;",
    dataFlow: "LinkedIn/GitHub APIs \u2192 TypeScript scripts \u2192 enriched contact objects",
  },
  {
    name: "AI Embedding Generation",
    description: "A local Candle embedding server (port 9998) generates JobBERT-v2 embeddings for company descriptions and posts. This uses the Rust ML framework with Metal acceleration for efficiency, avoiding cloud API costs. Embeddings are computed via batch processing, often triggered by Inngest jobs, and stored for semantic search. The embeddings enable similarity queries (useGetSimilarPostsLazyQuery) and contribute to lead scoring based on cosine distance.",
    researchBasis: "Candle framework, JobBERT-v2 model",
    codeSnippet: "Embedding server on http://localhost:9998",
    dataFlow: "Text data \u2192 Candle server \u2192 vector embeddings",
  },
  {
    name: "Data Storage & Scoring",
    description: "Enriched data is stored in PostgreSQL via Drizzle ORM, with tables like companies and contacts defined in src/db/schema.ts. An ensemble scoring system combines multiple signals: AI tier (from regex detection), intent (from analyzeLinkedInPosts mutation), GitHub activity, and embedding similarity. Scores are computed server-side and stored in the companies.score column (0..1), with reasons tracked in JSON arrays. This step ensures leads are ranked by relevance.",
    researchBasis: "PostgreSQL, Drizzle ORM, ensemble learning",
    codeSnippet: "score REAL DEFAULT 0.5, ai_tier INTEGER DEFAULT 0",
    dataFlow: "Enriched data \u2192 Drizzle ORM \u2192 PostgreSQL tables with scores",
  },
  {
    name: "Email Campaign Delivery",
    description: "Scored leads are delivered via personalized email campaigns using Resend. Mutations like useCreateDraftCampaignMutation create campaigns, which are scheduled with business-day logic from src/lib/business-days.ts (skips weekends, sets 8am UTC). The system uses Resend webhooks for tracking and sends emails via POST /api/emails/send. Admin can monitor campaigns in src/app/admin/contacts/page.tsx with real-time updates.",
    researchBasis: "Resend API, business scheduling",
    codeSnippet: "export function getNextBusinessDay(offset: number, options: GetNextBusinessDayOptions = {}): Date",
    dataFlow: "Scored leads \u2192 Resend mutations \u2192 scheduled emails \u2192 recipient inboxes",
  },
];

// ─── Narrative ─────────────────────────────────────────────────────

export const story =
  "The system starts by discovering tech companies via a Rust-based web crawler (crates/agentic-search) that outputs to discovery.json. TypeScript scripts (scripts/scrape-linkedin-people.ts) then enrich LinkedIn profiles, while a Candle embedding server generates JobBERT-v2 embeddings for semantic analysis. Enriched data is stored in PostgreSQL via Drizzle ORM, scored using an ensemble of AI tier, intent, and GitHub signals, and finally delivered as personalized email campaigns via Resend, scheduled with business-day logic from src/lib/business-days.ts.";

// ─── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: ExtraSection[] = [
  {
    heading: "Aho-Corasick Company Classification",
    content: "Company AI-tier classification uses a production-grade Aho-Corasick automaton for single-pass multi-pattern matching — O(n + m + z) vs O(n × k) naive regex. The automaton processes all pattern dictionaries against full company descriptions in milliseconds, replacing LLM calls for deterministic classification. Failure links are computed via BFS after all patterns are inserted, enabling the automaton to backtrack efficiently when a partial match fails.",
    codeBlock: `class AhoCorasickAutomaton {
  private root: TrieNode = new TrieNode();

  addPattern(pattern: string, label: string): void {
    let node = this.root;
    for (const ch of pattern) {
      let child = node.children.get(ch);
      if (!child) { child = new TrieNode(); node.children.set(ch, child); }
      node = child;
    }
    node.output.push({ label, patternId: this.nextPatternId++ });
  }

  build(): void {
    // BFS to compute failure links for all trie nodes
    const queue: TrieNode[] = [];
    for (const child of this.root.children.values()) {
      child.fail = this.root;
      queue.push(child);
    }
    // ... failure link computation via parent fail pointers
  }
}`,
  },
  {
    heading: "Weighted Intent Scoring",
    content: "Intent scoring uses a weighted max-per-type aggregation model. Six signal types (hiring_intent, tech_adoption, growth_signal, budget_cycle, leadership_change, product_launch) are weighted by pipeline impact. For each type, only the strongest active signal is used — its confidence is multiplied by a freshness decay factor that degrades over time. This prevents stale signals from inflating scores while still recognizing companies with multiple active intent indicators.",
    codeBlock: `const INTENT_WEIGHTS: Record<string, number> = {
  hiring_intent: 30,      // Hiring job posts (heaviest)
  tech_adoption: 20,      // Using your stack
  growth_signal: 25,      // Revenue/headcount growth
  budget_cycle: 15,       // Financial activity
  leadership_change: 5,   // New CTOs, VPs
  product_launch: 5,      // New product launches
};

// For each signal type, find strongest active signal
for (const [signalType, weight] of Object.entries(INTENT_WEIGHTS)) {
  const best = signals
    .filter((s) => s.signal_type === signalType)
    .reduce((max, s) => {
      const f = computeFreshness(s.detected_at, s.decay_days);
      return Math.max(max, s.confidence * f);
    }, 0);
  weightedSum += best * weight;
  totalWeight += weight;
}
const score = (weightedSum / totalWeight) * 100; // [0, 100]`,
  },
  {
    heading: "Two-Pass Email Composition",
    content: "Email drafts go through a two-pass pipeline: Phase 1 generates content at temperature 0.7 for natural variation, with explicit instructions to include one specific technical observation about the target company. Phase 2 runs a targeted refine pass that strips AI-marker phrases ('I hope this finds you well'), enforces a 3-sentence opening max, and tightens subject lines under 50 characters. The refine pass outperforms simply lowering temperature, which would also reduce the technical specificity of the body.",
    codeBlock: `function buildBatchPrompt(input: GenerateBatchEmailRequest): string {
  const parts: string[] = [];

  // PRIMARY GOAL — instructions drive everything
  if (input.instructions) {
    parts.push(
      "PRIMARY GOAL (most important):",
      input.instructions, "",
      "INTERPRETATION GUIDE:",
      "- 'applied', 'no response', 'follow up' → FOLLOW-UP email",
      "- Cold outreach → introduction email.", "",
    );
  }

  // ANTI-PATTERN RULES (violations will be rejected)
  parts.push(
    "ANTI-PATTERN RULES:",
    "- NEVER echo raw text from instructions verbatim — interpret and rephrase.",
    "- NEVER list skills that don't match job requirements.",
    "- NEVER fabricate recipient details or experience.", "",
  );
  return parts.join("\\n");
}`,
  },
  {
    heading: "DataLoader Batch Scheduling",
    content: "GraphQL field resolvers use DataLoaders with a custom 2ms batch scheduler instead of the default process.nextTick. This trades imperceptible latency for 5–10x fewer DB round-trips on list views — when 50 companies each resolve facts + snapshots, the 2ms delay collects all 50 IDs into a single IN query rather than firing 50 individual queries. Batch sizes are tuned per entity: 250 for companies, 100 for contacts, 10 for users.",
    codeBlock: `const BATCH_COMPANY = 250;
const BATCH_PER_COMPANY = 100;
const BATCH_CONTACT = 100;

// 2ms delay collects more keys per batch when parallel
// field resolvers execute — fewer DB round-trips on list pages
const batchSchedule = (cb: () => void) => setTimeout(cb, 2);

export function createLoaders(db: DbInstance) {
  return {
    company: new DataLoader<number, Company | null>(
      async (companyIds) => {
        const rows = await db.select().from(companies)
          .where(inArray(companies.id, [...companyIds]));
        const byId = new Map(rows.map((r) => [r.id, r]));
        return companyIds.map((id) => byId.get(id) ?? null);
      },
      { maxBatchSize: BATCH_COMPANY, batchScheduleFn: batchSchedule },
    ),
    // ... 10+ loaders for contacts, facts, snapshots
  };
}`,
  },
  {
    heading: "Webhook Signature Verification",
    content: "Resend webhooks use HMAC-SHA256 signature verification with constant-time comparison to prevent timing attacks. The handler checks timestamp freshness (5-minute window) before verifying the signature, and correlates inbound replies via In-Reply-To headers rather than From addresses — contacts often reply from a different address, so From-based matching produces ~15% false negatives. Failed DB writes retry with exponential backoff (base 1s, max 30s, 3 retries).",
    codeBlock: `function verifySignature(
  payload: string, signature: string,
  secret: string, timestamp: string, webhookId: string,
): boolean {
  // Check timestamp freshness (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  // HMAC-SHA256 signature
  const secretBytes = Buffer.from(secret.replace("whsec_", ""), "base64");
  const hmac = createHmac("sha256", secretBytes);
  hmac.update(\`\${webhookId}.\${timestamp}.\${payload}\`);
  const expected = \`v1,\${hmac.digest("base64")}\`;

  // Constant-time comparison — prevents timing attacks
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}`,
  },
  {
    heading: "ICP Feature Extraction",
    content: "Lead scoring extracts 18 numeric features per company into a fixed-dimension vector. Dimensions include AI tier (ordinal 0–2), tech stack overlap with ICP target (Jaccard coefficient), GitHub AI adoption score, HuggingFace Hub presence, intent score, and decision-maker contact count. All continuous features are z-score normalized within-batch rather than globally — this prevents distribution shift from stale reference statistics when the ICP evolves.",
    codeBlock: `interface ICPFeatures {
  hasDescription: number;
  descriptionLengthNorm: number;
  hasWebsite: number;
  hasLinkedin: number;
  emailCount: number;
  tagCount: number;
  serviceCount: number;
  aiTier: number;            // 0..2 (not_ai, ai_first, ai_native)
  isConsultancy: number;
  factsCount: number;
  githubAiScore: number;     // 0..1 adoption
  hfPresenceScore: number;   // 0..100
  intentScore: number;       // 0..100
  dmContactsCount: number;   // decision-maker contacts
}

function extractICPFeatures(company, contactsCount, dmCount, factsCount) {
  return {
    aiTier: company.ai_tier ?? 0,
    githubAiScore: company.github_ai_score ?? 0,
    intentScore: (company.intent_score ?? 0) / 100,
    dmContactsCount: dmCount,
    // ... 14 more features, all normalized to [0, 1]
  };
}`,
  },
  {
    heading: "Business-Day Scheduling",
    content: "Email sends are scheduled with business-day awareness — weekends are skipped, sends default to 8am UTC, and offset calculations use addBusinessDays for deterministic scheduling. The follow-up scheduler queries only contacts where next_send_at <= NOW() via a Drizzle partial index scan, and enforces same-company staggering (minimum 48h between touches to different contacts at the same company).",
    codeBlock: `function getNextBusinessDay(
  offset: number,
  options: GetNextBusinessDayOptions = {},
): Date {
  const { fromDate, setTime = true, hour = 8 } = options;
  if (offset === 0 && fromDate) return fromDate;

  const startDate = fromDate || new Date();
  let scheduledDate = fromDate ? startDate : addDays(startDate, 1);

  // Skip weekends
  while (scheduledDate.getUTCDay() === 0 || scheduledDate.getUTCDay() === 6) {
    scheduledDate = addDays(scheduledDate, 1);
  }
  if (offset > 0) scheduledDate = addBusinessDays(scheduledDate, offset);
  if (setTime) scheduledDate.setUTCHours(hour, 0, 0, 0);

  return scheduledDate;
}`,
  },
  {
    heading: "Auto-Draft Reply Generation",
    content: "When an inbound email is classified as 'interested' or 'info_request', the system auto-generates a contextual reply draft by first retrieving the full conversation thread — both outbound sends and inbound replies, sorted chronologically. Quoted text is stripped from inbound bodies to prevent recursive context bloat. Drafts are stored in reply_drafts and require human approval before sending, closing the loop between automation and human judgment.",
    codeBlock: `async function getThreadContext(contactId: number): Promise<ThreadMessage[]> {
  const [outbound, inbound] = await Promise.all([
    db.select().from(contactEmails)
      .where(eq(contactEmails.contact_id, contactId)),
    db.select().from(receivedEmails)
      .where(eq(receivedEmails.matched_contact_id, contactId)),
  ]);

  const messages: ThreadMessage[] = [];
  for (const e of outbound)
    messages.push({ direction: "outbound", subject: e.subject,
      body: e.text_content || "", sentAt: e.sent_at || "" });
  for (const e of inbound)
    messages.push({ direction: "inbound", subject: e.subject || "",
      body: stripQuotedText(e.text_content || ""), sentAt: e.received_at || "" });

  return messages.sort((a, b) =>
    new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}`,
  },
];

// ─── Technical Details ────────────────────────────────────────────

export const technicalDetails: TechnicalDetail[] = [
  {
    type: "table",
    heading: "Core Database Tables",
    description: "Neon PostgreSQL schema via Drizzle ORM — key columns driving pipeline logic",
    items: [
    {
      label: "companies",
      value: "Golden record with AI tier, intent scoring, and GitHub/HF signals",
      metadata: {"key columns": "ai_tier, ai_classification_confidence, intent_score, github_ai_score, hf_presence_score"},
    },
    {
      label: "contacts",
      value: "Decision-maker tracking with ML-derived authority scoring",
      metadata: {"key columns": "seniority, is_decision_maker, authority_score, next_touch_score, conversation_stage"},
    },
    {
      label: "intent_signals",
      value: "Time-decaying intent signals with per-type confidence",
      metadata: {"types": "hiring_intent, tech_adoption, growth_signal, budget_cycle, leadership_change, product_launch"},
    },
    {
      label: "contact_emails",
      value: "1:N per-address deliverability state with NeverBounce status",
      metadata: {"key columns": "email, status (valid|invalid|catch_all), is_primary, verified_at, bounce_count"},
    },
    {
      label: "email_campaigns",
      value: "Campaign lifecycle with sequence tracking and follow-up state",
      metadata: {"states": "draft → approved → sending → sent → replied → converted → closed"},
    },
    {
      label: "received_emails",
      value: "Inbound replies correlated via In-Reply-To header threading",
      metadata: {"key columns": "matched_contact_id, in_reply_to_message_id, classification, auto_draft_id"},
    },
    ],
  },
  {
    type: "code",
    heading: "Companies Drizzle Schema",
    description: "Actual schema definition showing AI scoring, intent, and GitHub signal columns",
    code: `export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),

  category: text("category", {
    enum: ["CONSULTANCY", "STAFFING", "AGENCY", "PRODUCT", "UNKNOWN"],
  }).notNull().default("UNKNOWN"),

  // AI classification — 3-tier taxonomy
  ai_tier: integer("ai_tier").notNull().default(0),
  ai_classification_confidence: real("ai_classification_confidence").default(0.5),

  // Intent scoring — weighted max-per-type aggregation
  intent_score: real("intent_score").notNull().default(0),     // 0..100
  intent_signals_count: integer("intent_signals_count").notNull().default(0),
  intent_top_signal: text("intent_top_signal"),                // JSON

  // GitHub pattern analysis (Rust crate: github-patterns)
  github_ai_score: real("github_ai_score"),      // 0..1
  github_hiring_score: real("github_hiring_score"),

  // HuggingFace Hub presence
  hf_presence_score: real("hf_presence_score").default(0),     // 0..100
});`,
  },
  {
    type: "diagram",
    heading: "System Architecture",
    description: "Data flow through the hybrid Rust/TypeScript pipeline with ML scoring layers",
    code: `┌─────────────────────────────────────────────────────────────────┐
│  DISCOVERY                                                      │
│  Common Crawl CDX ─┐                                            │
│  Live Web Search ──┼─→ Domain Dedup ─→ Neon PostgreSQL          │
│  Bulk CSV Import ──┘                                            │
├─────────────────────────────────────────────────────────────────┤
│  ENRICHMENT                                                     │
│  Fetch Site ─→ DeepSeek Extract ─→ Zod Gate ─→ AI Classify     │
│                                           └─→ Deep Analysis     │
│  ─→ Confidence Gate (≥0.72) ─→ Neon (enriched_at set)          │
│                          └─→ Snapshot Archive (drift detection) │
├─────────────────────────────────────────────────────────────────┤
│  SCORING                                                        │
│  18-Feature Vector ─→ ICP Cosine Sim ─→ Composite Rank         │
│  (z-score norm)       (vs centroid)     (0.65×icp + 0.20×rec   │
│                                          + 0.15×completeness)   │
│  ─→ Percentile Filter (p60) ─→ Qualified Leads                 │
├─────────────────────────────────────────────────────────────────┤
│  CONTACTS                                                       │
│  LinkedIn Profile ─┐                                            │
│  Email Discovery ──┼─→ NeverBounce Verify ─→ contacts + emails  │
│  (pattern prior)   │   (catch-all detect)                       │
├─────────────────────────────────────────────────────────────────┤
│  OUTREACH                                                       │
│  Draft (t=0.7) ─→ Refine (t=0.3) ─→ Batch Campaign            │
│  ─→ Resend API (10 req/s) ─→ Webhooks ─→ Reply-Aware Followup  │
│                               └─→ Auto-Draft (approval gate)   │
└─────────────────────────────────────────────────────────────────┘`,
  },
  {
    type: "code",
    heading: "Admin Gate Pattern",
    description: "Session-based authorization using Better Auth with constant-time email comparison",
    code: `export async function checkIsAdmin(): Promise<{
  isAdmin: boolean;
  userId: string | null;
  userEmail: string | null;
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { isAdmin: false, userId: null, userEmail: null };

    return {
      isAdmin: session.user.email === ADMIN_EMAIL,
      userId: session.user.id,
      userEmail: session.user.email,
    };
  } catch (error) {
    console.error("Error checking admin status:", error);
    return { isAdmin: false, userId: null, userEmail: null };
  }
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}`,
  },
  {
    type: "card-grid",
    heading: "AI Detection Strategies",
    description: "Multi-layer approach to identifying AI-related companies — deterministic first, ML second",
    items: [
    {
      label: "Aho-Corasick Automaton",
      value: "Single-pass O(n+m+z) multi-pattern matching against company descriptions — replaces LLM calls for deterministic classification",
      metadata: {"complexity": "O(n + m + z) vs O(n × k) naive"},
    },
    {
      label: "GitHub Topic Analysis",
      value: "Rust crate scans repo topics for 20+ AI indicators, computes github_ai_score (0–1) and github_hiring_score",
      metadata: {"crate": "github-patterns"},
    },
    {
      label: "HuggingFace Hub Presence",
      value: "Checks for org/user presence on HF Hub — model publishers score higher than consumers",
      metadata: {"score": "hf_presence_score 0..100"},
    },
    {
      label: "Intent Signal Decay",
      value: "Six signal types with time-weighted confidence — freshness decay prevents stale signals from inflating scores",
      metadata: {"heaviest": "hiring_intent: 30, growth_signal: 25"},
    },
    {
      label: "Embedding Similarity",
      value: "JobBERT-v2 embeddings via local Candle server (Metal-accelerated, 4618 emb/sec) for semantic ICP matching",
      metadata: {"port": "9998, cosine distance"},
    },
    ],
  },
  {
    type: "card-grid",
    heading: "Engineering Decisions",
    description: "Key tradeoffs and design choices across the pipeline",
    items: [
    {
      label: "Exact Dedup over Fuzzy",
      value: "Normalized-slug exact match for company dedup — fuzzy (edit distance) produced too many false merges on subsidiary/parent pairs",
      metadata: {"tradeoff": "precision over recall"},
    },
    {
      label: "Per-Tier Confidence Thresholds",
      value: "not-AI ≥ 0.65, AI-first ≥ 0.72, AI-native ≥ 0.80 — asymmetric error costs require asymmetric gates",
      metadata: {"rationale": "false AI-native wastes outreach budget"},
    },
    {
      label: "Percentile Ranking over Absolute",
      value: "Score filter uses within-batch percentile rank — 'keep top 40%' stays stable even as ICP centroid shifts",
      metadata: {"formula": "0.65×icp + 0.20×recency + 0.15×completeness"},
    },
    {
      label: "2ms DataLoader Delay",
      value: "Custom batch scheduler collects more keys per batch — 5-10x fewer DB round-trips on list views for imperceptible latency cost",
      metadata: {"batch sizes": "companies: 250, contacts: 100"},
    },
    {
      label: "In-Reply-To over From Address",
      value: "Reply correlation via message threading headers — From-based matching has ~15% false negative rate when contacts reply from alternate addresses",
      metadata: {"correlation": "In-Reply-To → original message_id"},
    },
    {
      label: "Pre-Gate Snapshot Archive",
      value: "All enrichment payloads archived before confidence filtering — enables threshold replay without re-fetching websites",
      metadata: {"drift detection": "SHA-256 content_hash diff"},
    },
    ],
  },
];
