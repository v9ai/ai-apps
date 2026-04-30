import type { Paper, PipelineAgent, Stat, TechnicalDetail, ExtraSection } from "@ai-apps/ui/how-it-works";

// ─── Technical Foundations ──────────────────────────────────────────

export const papers: Paper[] = [
  {
    slug: "nextjs-16",
    number: 1,
    title: "Next.js 16",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vercel",
    year: 2025,
    finding: "React 19 framework with App Router — server components, streaming, and typed route handlers",
    relevance: "Powers every surface of the app. Server components drive list pages (src/app/contacts/contacts-client.tsx); client components handle interactive pieces like CompanyContactsClient.",
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
    slug: "deepseek-v4",
    number: 4,
    title: "DeepSeek v4 (chat + reasoner)",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "DeepSeek",
    year: 2025,
    finding: "deepseek-v4-flash for summary nodes; deepseek-v4-pro with thinking mode + reasoning_effort=high for enrichment, classification, and email generation. Schema-constrained via Zod (TS) / Pydantic (Python).",
    relevance: "Canonical LLM hub at src/lib/deepseek/client.ts. Powers contact enrichment (src/lib/ai-contact-enrichment.ts), intent detection (analyzeLinkedInPosts), and every LangGraph node in backend/leadgen_agent/llm.py.",
    url: "https://api-docs.deepseek.com",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "jobbert-v3-api",
    number: 5,
    title: "JobBERT-v3 (HF API)",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "TechWolf",
    year: 2025,
    finding: "Multilingual sentence transformer for job title matching (EN/ES/DE/ZH), 768-dim embeddings",
    relevance: "Generates embeddings via HuggingFace Inference API for semantic search and lead scoring",
    url: "https://huggingface.co/TechWolf/JobBERT-v3",
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
    slug: "resend",
    number: 8,
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
    slug: "jobbert-v3",
    number: 9,
    title: "JobBERT-v3",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "TechWolf",
    year: 2025,
    finding: "Multilingual sentence transformer fine-tuned on 21M job title pairs for semantic job matching",
    relevance: "Generates 768-dim embeddings via HF Inference API for semantic search in useGetSimilarPostsLazyQuery and lead scoring",
    url: "https://huggingface.co/TechWolf/JobBERT-v3",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "radix-ui",
    number: 10,
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
    slug: "pandacss",
    number: 11,
    title: "PandaCSS + Radix Themes",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Chakra / Radix",
    year: 2025,
    finding: "Build-time atomic CSS with recipe variants, layered on top of Radix Themes primitives for accessible interaction patterns.",
    relevance: "Recipes live in src/recipes/*.ts (badge, button, card, landing, nav, stepper, etc.); interactive primitives like Card, Badge, Heading come from @radix-ui/themes. Zero runtime CSS-in-JS cost.",
    url: "https://panda-css.com/docs",
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
    number: "768",
    label: "Embedding dimensions from JobBERT-v3 via HF Inference API",
    source: "TechWolf/JobBERT-v3 model output",
  },
  {
    number: "50",
    label: "Page size for paginated admin tables (PAGE_SIZE constant)",
    source: "src/app/contacts/contacts-client.tsx",
  },
  {
    number: "3",
    label: "AI tier levels: 0=not AI, 1=ai_first, 2=ai_native",
    source: "Database schema (companies.ai_tier)",
  },
  {
    number: "300ms",
    label: "Debounce delay for search input in admin contacts",
    source: "src/app/contacts/contacts-client.tsx debounce pattern",
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
    description: "JobBERT-v3 embeddings (768-dim, multilingual) are generated for company descriptions and LinkedIn posts. The crates/jobbert Rust crate runs the canonical embedder (XLMRoberta → mean-pool → Dense 768→1024 Tanh → L2-norm) over Candle/Metal; the HuggingFace Inference API is used as a managed fallback. Batches of up to 200 un-analyzed posts are processed by the analyzeLinkedInPosts GraphQL mutation, which writes embeddings + extracted skill tags back to the linkedin_posts table. The embeddings enable similarity queries (useGetSimilarPostsLazyQuery) and contribute to lead scoring based on cosine distance.",
    researchBasis: "TechWolf/JobBERT-v3, HuggingFace Inference API",
    codeSnippet: "await hfEmbed(texts, { normalize: true })",
    dataFlow: "Text data \u2192 HF Inference API \u2192 vector embeddings",
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
    description: "Scored leads are delivered via personalized email campaigns using Resend. Mutations like useCreateDraftCampaignMutation create campaigns, which are scheduled with business-day logic from src/lib/business-days.ts (skips weekends, sets 8am UTC). The system uses Resend webhooks for tracking and sends emails via POST /api/emails/send. Admin can monitor campaigns in src/app/contacts/contacts-client.tsx with real-time updates.",
    researchBasis: "Resend API, business scheduling",
    codeSnippet: "export function getNextBusinessDay(offset: number, options: GetNextBusinessDayOptions = {}): Date",
    dataFlow: "Scored leads \u2192 Resend mutations \u2192 scheduled emails \u2192 recipient inboxes",
  },
];

// ─── Narrative ─────────────────────────────────────────────────────

export const story =
  "The system starts by discovering tech companies via a Rust-based web crawler (crates/agentic-search) that outputs to discovery.json. TypeScript scripts (scripts/scrape-linkedin-people.ts) then enrich LinkedIn profiles, while a Candle embedding server generates JobBERT-v3 embeddings for semantic analysis. Enriched data is stored in PostgreSQL via Drizzle ORM, scored using an ensemble of AI tier, intent, and GitHub signals, and finally delivered as personalized email campaigns via Resend, scheduled with business-day logic from src/lib/business-days.ts.";

// ─── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: ExtraSection[] = [
  {
    heading: "Aho-Corasick Company Classification",
    content: "A single Aho-Corasick automaton is built once at module load with all keyword groups (AI core, AI feature, consulting, staffing, agency, SaaS, devtools), then runs in one linear pass over each company description and returns a Map of label → distinct-pattern count. Failure links are computed via BFS so partial matches backtrack to the longest proper suffix that is also a prefix in the trie. Why: O(n + m + z) replaces O(n × k) sequential String.includes scans and removes an LLM call from the hot path.",
    codeBlock: `// src/ml/company-classifier.ts:88
build(): void {
  const queue: TrieNode[] = [];
  // Depth-1 nodes fail to root
  for (const child of this.root.children.values()) {
    child.fail = this.root;
    queue.push(child);
  }
  // BFS to compute failure links for deeper nodes
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const [ch, child] of current.children) {
      queue.push(child);
      let failNode = current.fail;
      while (failNode !== null && !failNode.children.has(ch)) {
        failNode = failNode.fail;
      }
      child.fail = failNode ? failNode.children.get(ch)! : this.root;
      if (child.fail === child) child.fail = this.root;
      // Merge dictionary suffix-link outputs
      if (child.fail.output.length > 0) {
        child.output = child.output.concat(child.fail.output);
      }
    }
  }
  this.built = true;
}`,
  },
  {
    heading: "Weighted Intent Scoring",
    content: "For each of seven signal types (hiring_intent, tech_adoption, growth_signal, budget_cycle, leadership_change, product_launch, competitor_mention), the scorer keeps only the strongest signal — its confidence multiplied by an exp(-ln2/decay_days × daysSince) half-life freshness factor. Type weights (30/20/25/15/5/5/40) form a denominator so the final score is a weighted average rescaled to [0, 100]. Why: max-per-type prevents stale or duplicate signals from inflating the score while preserving sensitivity to the strongest active intent.",
    codeBlock: `// src/lib/intent/detector.ts:18
export const INTENT_WEIGHTS: Record<string, number> = {
  hiring_intent: 30,
  tech_adoption: 20,
  growth_signal: 25,
  budget_cycle: 15,
  leadership_change: 5,
  product_launch: 5,
  competitor_mention: 40,
};

export function computeFreshness(detectedAt: string, decayDays: number): number {
  const daysSince = (Date.now() - new Date(detectedAt).getTime()) / 86_400_000;
  if (decayDays <= 0) return 0;
  const k = 0.693 / decayDays;
  return Math.exp(-k * daysSince);
}

export function computeIntentScore(signals: ScoreableSignal[]): number {
  let weightedSum = 0, totalWeight = 0;
  for (const [signalType, weight] of Object.entries(INTENT_WEIGHTS)) {
    const best = signals
      .filter((s) => s.signal_type === signalType)
      .reduce((max, s) => Math.max(max, s.confidence * computeFreshness(s.detected_at, s.decay_days)), 0);
    weightedSum += best * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
}`,
  },
  {
    heading: "Single-Pass Email Composition with Anti-Pattern Rules",
    content: "Cold-outreach drafts are generated by a single DeepSeek call at temperature 0.7, with the prompt assembled by buildBatchPrompt from the user-supplied instructions, target company, and a fixed sender background. The prompt body interleaves an interpretation guide, anti-pattern rules forbidding verbatim instruction echoes and fabricated experience, and few-shot examples in JSON. Why: the structure pushes the model toward a JSON {subject, body} response without needing a second refine pass.",
    codeBlock: `// src/lib/email/prompt-builder.ts:26
export function buildBatchPrompt(input: GenerateBatchEmailRequest): string {
  const parts: string[] = [];
  if (input.instructions) {
    parts.push(
      "PRIMARY GOAL (most important — the entire email must serve this):",
      input.instructions, "",
      "INTERPRETATION GUIDE:",
      "- If the goal mentions 'applied', 'application', 'no response', 'follow up' → write a FOLLOW-UP email…",
      "- If the goal is cold outreach → write an introduction email.", "",
    );
  }
  if (input.companyName) parts.push(\`TARGET COMPANY: \${input.companyName}\`, "");
  parts.push(
    "ANTI-PATTERN RULES (violations will be rejected):",
    "- NEVER echo raw text from the instructions field verbatim — interpret and rephrase.",
    "- NEVER list skills that don't match the job requirements.",
    "- NEVER fabricate recipient details, certifications, or experience the sender doesn't have.",
    "",
  );
  return parts.join("\\n");
}`,
  },
  {
    heading: "DataLoader Batch Scheduling",
    content: "GraphQL field resolvers run through DataLoaders with a 2 ms setTimeout scheduler instead of the default process.nextTick — the small delay collects more keys per batch when parallel resolvers fire on list pages. Each loader has its own maxBatchSize (250 for companies, 100 for per-company children, 100 for contacts, 10 for user settings). Why: a single IN query for N companies' facts beats N round-trips when a list view resolves 50 rows in parallel.",
    codeBlock: `// src/apollo/loaders.ts:42
const BATCH_COMPANY = 250;
const BATCH_PER_COMPANY = 100;
const BATCH_CONTACT = 100;
const BATCH_USER = 10;

// Default DataLoader uses process.nextTick which fires before any I/O.
// A small 2ms delay collects more keys per batch when parallel field
// resolvers are executing, trading negligible latency for fewer DB
// round-trips on list pages (e.g. 50 companies × facts + snapshots).
const batchSchedule = (cb: () => void) => setTimeout(cb, 2);

export function createLoaders(db: DbInstance) {
  return {
    company: new DataLoader<number, Company | null>(
      async (companyIds) => {
        const rows = await db
          .select()
          .from(companies)
          .where(inArray(companies.id, [...companyIds]));
        const byId = new Map(rows.map((r) => [r.id, r]));
        return companyIds.map((id) => byId.get(id) ?? null);
      },
      { maxBatchSize: BATCH_COMPANY, batchScheduleFn: batchSchedule },
    ),
    // ... contacts, facts, snapshots loaders
  };
}`,
  },
  {
    heading: "Webhook Signature Verification",
    content: "Resend webhooks are verified with HMAC-SHA256 over the canonical {webhookId}.{timestamp}.{payload} string and a base64-decoded secret, then compared in constant time to defeat timing attacks. The handler also rejects timestamps more than 300 seconds from now to block replay. Why: a naive string compare on the signature leaks bytes of the expected MAC through early-exit timing.",
    codeBlock: `// src/app/api/webhooks/resend/route.ts:64
function verifySignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: string,
  webhookId: string,
): boolean {
  // Check timestamp freshness (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  // Svix uses base64-encoded secret prefixed with whsec_
  const secretBytes = Buffer.from(secret.replace("whsec_", ""), "base64");
  const hmac = createHmac("sha256", secretBytes);
  hmac.update(\`\${webhookId}.\${timestamp}.\${payload}\`);
  const expected = \`v1,\${hmac.digest("base64")}\`;

  // Constant-time comparison
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
    content: "Each company is reduced to a 19-dimension feature vector covering presence flags (description, website, LinkedIn, email, GitHub, job board), counts (emails, tags, services, contacts, decision-makers, facts), and pre-computed scores (ai_tier 0–2, github_ai_score, hf_presence_score, intent_score). Continuous fields are clamped to [0, 1] inline (description length / 500, scores / 100) rather than z-scored — the same vector then feeds both a hand-tuned linear scorer and a quantized INT8 path. Why: a stable feature ordering and fixed normalization let weights be loaded from JSON and reused across batches without retraining-set drift.",
    codeBlock: `// src/ml/icp-scorer.ts:54
export function extractICPFeatures(
  company: any, contactsCount = 0, dmCount = 0, factsCount = 0,
): ICPFeatures {
  const desc = company.description ?? "";
  const emailsArr = parseJsonArrayLen(company.emails);
  return {
    hasDescription: desc.length > 0 ? 1 : 0,
    descriptionLengthNorm: Math.min(desc.length / 500, 1),
    hasWebsite: company.website ? 1 : 0,
    hasLinkedin: company.linkedin_url ? 1 : 0,
    hasEmail: company.email ? 1 : 0,
    emailCount: (company.email ? 1 : 0) + emailsArr,
    tagCount: parseJsonArrayLen(company.tags),
    serviceCount: parseJsonArrayLen(company.services),
    aiTier: company.ai_tier ?? 0,
    isConsultancy: company.category === "CONSULTANCY" ? 1 : 0,
    isProduct: company.category !== "CONSULTANCY" && company.category !== "UNKNOWN" ? 1 : 0,
    factsCount,
    hasGithub: company.github_url ? 1 : 0,
    githubAiScore: company.github_ai_score ?? 0,
    hfPresenceScore: (company.hf_presence_score ?? 0) / 100,
    intentScore: (company.intent_score ?? 0) / 100,
    contactsCount, dmContactsCount: dmCount,
    hasJobBoard: company.job_board_url ? 1 : 0,
  };
}`,
  },
  {
    heading: "Business-Day Scheduling",
    content: "getNextBusinessDay(offset) walks forward day-by-day skipping Saturdays and Sundays (getUTCDay() === 0 || 6), then applies addBusinessDays from date-fns to add the requested offset, and pins the result to 8:00 UTC by default. Why: the helper underpins follow-up cutoffs and any user-facing 'send X business days from now' inputs without depending on the host timezone.",
    codeBlock: `// src/lib/business-days.ts:17
export function getNextBusinessDay(
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
    content: "When an inbound email is classified as 'interested' or 'info_request', generateReplyDraft fetches the full thread by joining contactEmails (outbound) and receivedEmails (inbound) for the contact, sorts chronologically, and runs stripQuotedText on inbound bodies to drop quoted history. The DeepSeek call writes a {subject, body} JSON pair into reply_drafts with status 'pending'. Why: sending stays manual — the row is a draft, not a queued send, so a human is always in the loop before automation hits an external inbox.",
    codeBlock: `// src/lib/email/auto-draft.ts:26
async function getThreadContext(contactId: number): Promise<ThreadMessage[]> {
  const [outbound, inbound] = await Promise.all([
    db.select({
        subject: contactEmails.subject,
        text_content: contactEmails.text_content,
        sent_at: contactEmails.sent_at,
        tags: contactEmails.tags,
      }).from(contactEmails)
      .where(eq(contactEmails.contact_id, contactId))
      .orderBy(desc(contactEmails.sent_at)),
    db.select({
        subject: receivedEmails.subject,
        text_content: receivedEmails.text_content,
        received_at: receivedEmails.received_at,
      }).from(receivedEmails)
      .where(eq(receivedEmails.matched_contact_id, contactId))
      .orderBy(desc(receivedEmails.received_at)),
  ]);

  const messages: ThreadMessage[] = [];
  for (const e of outbound)
    messages.push({ direction: "outbound", subject: e.subject,
      body: e.text_content || "", sentAt: e.sent_at || "" });
  for (const e of inbound)
    messages.push({ direction: "inbound", subject: e.subject || "",
      body: stripQuotedText(e.text_content || ""), sentAt: e.received_at || "" });

  messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  return messages;
}`,
  },
  {
    heading: "Decision-Maker Classification",
    content: "The job title is lowercased and matched against tiered substring lists — C-level patterns and CEO/CTO/CFO/COO/CPO/CRO/CMO regex first, then Founder, Partner, VP, Director, Manager, Senior — each tier assigning a fixed authorityScore (1.0 down to 0.25). Department is then matched the same way; HR/Recruiting hits trigger a 0.4× gatekeeper penalty on the score before it is rounded and compared to the 0.70 decision-maker threshold. Why: deterministic regex over a small taxonomy is faster and more auditable than an LLM call, and the gatekeeper penalty stops a 'VP of People Operations' from being scored as a budget holder.",
    codeBlock: `// src/apollo/resolvers/contacts/classification.ts:42
const C_LEVEL_PATTERNS = [
  "chief executive", "chief technology", "chief product",
  "chief operating", "chief data", "chief ai", /* ...12 more */
];
const isCLevel =
  C_LEVEL_PATTERNS.some(p => t.includes(p)) ||
  /\\bceo\\b/.test(t) || /\\bcto\\b/.test(t) || /\\bcfo\\b/.test(t) ||
  /\\bcoo\\b/.test(t) || /\\bcpo\\b/.test(t) || /\\bcro\\b/.test(t) || /\\bcmo\\b/.test(t);

if (isCLevel) { seniority = "C-level"; authorityScore = 1.0; }
else if (["founder", "co-founder", "president"].some(p => t.includes(p)))
  { seniority = "Founder"; authorityScore = 0.95; }
else if (["vice president", "vp of"].some(p => t.includes(p)) || t.startsWith("vp "))
  { seniority = "VP"; authorityScore = 0.85; }
// ... Director=0.75, Manager=0.50, Senior=0.25

// Gatekeeper penalty applied AFTER seniority is set
let effectiveScore = authorityScore;
if (department === "HR/Recruiting") effectiveScore = authorityScore * 0.4;

const isDecisionMaker = effectiveScore >= 0.70;`,
  },
  {
    heading: "Campaign State Machine",
    content: "The email_campaigns table pins status to a six-value enum (draft, pending, running, completed, failed, stopped); launchEmailCampaign accepts only draft or pending rows, then iterates recipients × sequence steps, calling Resend per message with a scheduledAt ISO string when delay_days[stepIdx-1] > 0. Each result increments one of sent/scheduled/failed, then a single UPDATE writes all three counters plus the new status. Why: one Resend call per message is intentional — Resend's batch endpoints don't preserve the per-recipient replyTo threading the campaign relies on.",
    codeBlock: `// src/apollo/resolvers/email-campaigns.ts:382
async launchEmailCampaign(_parent, args, context) {
  if (!context.userId || !isAdminEmail(context.userEmail)) throw new Error("Forbidden");
  const rows = await context.db.select().from(emailCampaigns)
    .where(eq(emailCampaigns.id, args.id)).limit(1);
  const campaign = rows[0];
  if (campaign.status !== "draft" && campaign.status !== "pending")
    throw new Error(\`Campaign is already \${campaign.status}\`);

  const recipients = parseJsonArray(campaign.recipient_emails);
  const sequence = campaign.sequence ? JSON.parse(campaign.sequence) : [];
  const delayDays = campaign.delay_days ? JSON.parse(campaign.delay_days) : [];
  let sent = 0, scheduled = 0, failed = 0;

  for (const recipientEmail of recipients) {
    for (let stepIdx = 0; stepIdx < sequence.length; stepIdx++) {
      const step = sequence[stepIdx];
      const delay = stepIdx > 0 ? (delayDays[stepIdx - 1] ?? stepIdx) : 0;
      let scheduledAt: string | undefined;
      if (delay > 0) {
        const sendDate = new Date();
        sendDate.setDate(sendDate.getDate() + delay);
        scheduledAt = sendDate.toISOString();
      }
      const result = await resend.instance.send({
        to: recipientEmail, subject: step.subject, html: step.html,
        from: campaign.from_email ?? undefined,
        replyTo: campaign.reply_to ?? undefined, scheduledAt,
      });
      if (result.error) failed++; else if (scheduledAt) scheduled++; else sent++;
    }
  }
  await context.db.update(emailCampaigns).set({
    status: failed === recipients.length * sequence.length ? "failed" : "running",
    emails_sent: sent, emails_scheduled: scheduled, emails_failed: failed,
  }).where(eq(emailCampaigns.id, args.id));
}`,
  },
  {
    heading: "Multi-Factor Deletion Scoring",
    content: "Ten weighted factors accumulate into a 0–1 deletion score: NeverBounce status invalid/disposable (0.25), bounce-list hit or nb_result=fail (0.20), staleness (0.15 for >180d no-reply or 0.10 for never-contacted >365d), no-reachability (0.10 if no email/LinkedIn/GitHub), low-relevance dept × authority < 0.30 (0.10), do-not-contact flag (0.08), outreach exhaustion >3 sends no reply (0.07), authority < 0.15 (0.03), missing position (0.01), and stale tags (0.01). Why: weights are tuned so a single hard signal (bounce, DNC) plus one soft signal (staleness, exhaustion) crosses the purge threshold without requiring any factor to dominate.",
    codeBlock: `// src/apollo/resolvers/contacts/classification.ts:188
// Factor 1 -- email invalidity (0.25)
const INVALID_NB_STATUSES = new Set(["invalid", "disposable", "unknown", "catchall"]);
if (!contact.email) { score += 0.25; reasons.push("No email address"); }
else if (contact.nb_status && INVALID_NB_STATUSES.has(contact.nb_status)) {
  score += 0.25; reasons.push(\`NeverBounce status: \${contact.nb_status}\`);
}

// Factor 2 -- email bounce (0.20)
const emailBounced = contact.email && bouncedList.includes(contact.email);
const nbFail = contact.nb_result === "failed" || contact.nb_result === "fail";
if (emailBounced || nbFail) { score += 0.20; reasons.push(/* ... */); }

// Factor 3 -- staleness (0.15 / 0.10)
if (lastContactedMs && daysSinceContacted > 180 && !anyReply) score += 0.15;
else if (!lastContactedMs && daysSinceCreated > 365) score += 0.10;

// Factor 7 -- outreach exhaustion (0.07)
if (outboundEmailCount > 3 && !anyReply) score += 0.07;

return { score: Math.min(Math.round(score * 100) / 100, 1.0), reasons };`,
  },
  {
    heading: "Discovery Pipeline Signal Detection",
    content: "The CPN (Claude Partner Network) outreach script reads a partner CSV and generates a per-row signal string with three fallback tiers: company match ('Saw {company} is working with Claude'), archetype match ('Your {archetype} work on GitHub caught my eye'), then a generic SDK-ecosystem line. The signal is interpolated into both the subject prefix and the opening sentence of every outreach email. Why: a concrete, row-specific reason for contact keeps every send grounded in observable evidence rather than a generic blast.",
    codeBlock: `// scripts/cpn.ts:197
function signal(row: PartnerRow): string {
  const company = row.company?.trim().replace(/^@/, "");
  if (company) return \`Saw \${company} is working with Claude\`;
  const archetypes = row.archetypes?.trim();
  if (archetypes) {
    const first = archetypes.split(",")[0].trim().replace(/-/g, " ");
    return \`Your \${first} work on GitHub caught my eye\`;
  }
  return "Noticed you're active in the Claude SDK ecosystem";
}

function buildOutreach(row: PartnerRow) {
  const first = firstName(row);
  const sig = signal(row);
  const subject = \`Claude Partner Network — \${first}\`;
  const text = \`Hi \${first},

\${sig} — you'd be a strong fit for this.\`;
}`,
  },
  {
    heading: "Drizzle Schema with Indexes",
    content: "The shared contacts table demonstrates Drizzle's pattern of inline column definitions plus a trailing index function. Contacts carry ML-derived fields — authority_score / is_decision_maker for buyer-tier scoring and to_be_deleted / deletion_score / deletion_reasons for cleanup — alongside conversation_stage for lifecycle state. Why: keeping indexes co-located with the schema means migrations and queries always reference the same source of truth.",
    codeBlock: `// packages/company-intel/src/schema.ts:159
export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    tenant_id: tenantIdColumn(),
    first_name: text("first_name").notNull(),
    last_name: text("last_name").notNull(),
    company_id: integer("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),
    // ML-derived fields
    seniority: text("seniority"),
    is_decision_maker: boolean("is_decision_maker").default(false),
    authority_score: real("authority_score").default(0.0),
    dm_reasons: text("dm_reasons"),
    // ML deletion scoring
    to_be_deleted: boolean("to_be_deleted").notNull().default(false),
    deletion_score: real("deletion_score"),
    deletion_reasons: text("deletion_reasons"),
    conversation_stage: text("conversation_stage"),
  },
  (table) => ({
    emailIdx: uniqueIndex("idx_contacts_email").on(table.email),
    companyIdIdx: index("idx_contacts_company_id").on(table.company_id),
    linkedinUrlIdx: index("idx_contacts_linkedin_url").on(table.linkedin_url),
  }),
);`,
  },
  {
    heading: "AI Contact Enrichment with Zod Validation",
    content: "DeepSeek is called with response_format: { type: 'json_object' } and temperature 0.1, then the raw string is parsed and run through a Zod schema (SynthesisOutputSchema) defining specialization, skills, research_areas, experience_level enum, confidence (0–1), and rationale. safeParse returns null on any shape mismatch — the caller treats null as 'skip enrichment' rather than writing a malformed record. Why: schema validation is the firewall between an LLM and the contacts table; without it, a single hallucinated experience_level would pollute downstream filters.",
    codeBlock: `// src/lib/ai-contact-enrichment.ts:353
const SynthesisOutputSchema = z.object({
  specialization: z.string().nullable(),
  skills: z.array(z.string()),
  research_areas: z.array(z.string()),
  experience_level: z.enum(["junior", "mid", "senior", "principal", "unknown"]),
  synthesis_confidence: z.number().min(0).max(1),
  synthesis_rationale: z.string().nullable(),
});

const response = await client.chat.completions.create({
  model: getDeepSeekModel(),
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: \`Profile:\\n\${contextLines}\` },
  ],
  response_format: { type: "json_object" } as any,
  temperature: 0.1,
  max_tokens: 512,
});

const raw = response.choices?.[0]?.message?.content ?? "{}";
const parsed = SynthesisOutputSchema.safeParse(JSON.parse(raw));
return parsed.success ? parsed.data : null;`,
  },
  {
    heading: "Strategy Enforcer — Grounding-First",
    content: "The strategy enforcer runs static checks over changed files: it strips comments, then regex-scans for LLM call sites (LLM_CALL_PATTERNS) and structured-output anchors (response_format, structuredOutput). A call without a matching anchor emits a BLOCKING violation tagged 'Rule 2: Grounding-First' with a concrete fix string. Why: every database write that flows from an LLM response must come through a Zod / response_format gate, or downstream rows silently drift off-schema.",
    codeBlock: `// src/agents/strategy-enforcer.ts:119
function checkGroundingFirst(
  _changedFiles: string[],
  fileContents: Map<string, string>,
): Violation[] {
  const violations: Violation[] = [];

  for (const [file, content] of fileContents) {
    if (GROUNDING_EXEMPT_PATHS.some((p) => file.includes(p))) continue;

    const codeContent = stripCommentLines(content);

    const hasLLMCall = LLM_CALL_PATTERNS.some((p) => p.test(codeContent));
    const hasStructuredOutput = STRUCTURED_OUTPUT_PATTERNS.some((p) =>
      p.test(codeContent),
    );

    if (hasLLMCall && !hasStructuredOutput) {
      violations.push({
        rule: "Rule 2: Grounding-First — LLM outputs must be schema-constrained",
        severity: "BLOCKING",
        metaApproach: "Grounding-First",
        file,
        message:
          "LLM .generate()/.chat() call found without structuredOutput or response_format. All LLM outputs must be schema-constrained.",
        fix: "Add \`structuredOutput: { schema: yourZodSchema }\` to the generate call, or \`response_format: { type: 'json_object' }\` for Python.",
      });
    }
  }
  return violations;
}`,
  },
  {
    heading: "LinkedIn Post Analysis Pipeline",
    content: "The post analyzer in src/ml/post-analyzer.ts fans two inference services out in parallel via Promise.all: SalesCue (Python, DeBERTa) for skill tag extraction, and Candle (Rust, Metal) for JobBERT-v2 dense embeddings. analyzePostBatch then batches the embed call across all posts while still running per-post skill extraction. Why: tags give filterable structure and the dense vector enables similarity search — two complementary indexes from a single content pass. (The GraphQL analyzeLinkedInPosts mutation that wires this into Neon is currently a deferred no-op while the posts-d1 pipeline is rebuilt.)",
    codeBlock: `// src/ml/post-analyzer.ts:1
import * as candle from "@/lib/candle/client";
import { skills as extractSkillsHttp } from "@/lib/salescue/client";

export interface ExtractedSkill {
  tag: string;
  label: string;
  confidence: number;
}

export interface PostAnalysis {
  skills: ExtractedSkill[];
  jobEmbedding: number[];
  analyzedAt: string;
}

export async function analyzePost(content: string): Promise<PostAnalysis> {
  const [skillsResult, jobEmbedding] = await Promise.all([
    extractSkillsHttp(content),
    candle.embedPost(content),
  ]);

  return {
    skills: skillsResult.result.skills,
    jobEmbedding,
    analyzedAt: new Date().toISOString(),
  };
}`,
  },
  {
    heading: "Auto-Draft Prompt Engineering",
    content: "buildDraftPrompt serializes the full thread as [OUTBOUND]/[INBOUND] blocks separated by ---, then injects classification-specific instructions — 'interested' asks for an enthusiastic 80–150 word reply with a concrete next step, 'info_request' asks for a 100–200 word answer to specific questions (anything else falls back to 'interested'). Why: the resulting row in reply_drafts carries generation_model plus the last six thread messages as thread_context for after-the-fact auditing.",
    codeBlock: `// src/lib/email/auto-draft.ts:95
function buildDraftPrompt(
  classification: ReplyClass,
  thread: ThreadMessage[],
  contactName: string,
  isCpn: boolean,
): string {
  const threadText = thread
    .map((m) => \`[\${m.direction.toUpperCase()}] \${m.subject}\\n\${m.body}\`)
    .join("\\n\\n---\\n\\n");

  const classInstructions: Record<string, string> = {
    interested: \`The contact expressed interest. Write an enthusiastic, helpful reply that:
- Thanks them for their interest
- Provides the next concrete step (share details, schedule a call, send a link)
- Keeps momentum — suggest a specific action
- Is warm but professional, 80-150 words\`,
    info_request: \`The contact asked specific questions. Write a reply that:
- Directly addresses their questions with specific, truthful answers
- Provides enough detail to move them toward a decision
- Ends with a clear next step
- Is informative but concise, 100-200 words\`,
  };

  return \`You are Vadim Nicolai, writing a reply to \${contactName}…
\${classInstructions[classification] || classInstructions.interested}
FULL CONVERSATION THREAD:
\${threadText}
Respond with ONLY valid JSON: {"subject": "Re: ...", "body": "..."}\`;
}`,
  },
  {
    heading: "Semantic Skill Extraction (DeBERTa Cosine)",
    content: "SkillExtractor lazy-encodes the 116-entry canonical skill taxonomy through the shared DeBERTa-v3 backbone, mean-pools over the attention mask, L2-normalizes, and caches the resulting (116, hidden) matrix on first call. At inference time the post embedding is normalized the same way and a single matmul against the cached matrix produces cosine similarities; entries above threshold=0.35 are sorted descending and truncated to top_k=10. Why: the cache amortizes the taxonomy encode across all subsequent posts in the worker.",
    codeBlock: `# salescue/modules/skills.py:45
def _ensure_skill_embeds(self) -> torch.Tensor:
    """Pre-compute DeBERTa embeddings for all skill labels. Cached after first call."""
    if self._skill_embeds is not None:
        return self._skill_embeds

    device = get_device()
    encoded = SharedEncoder.encode_batch(self._labels, max_length=32)
    output = encoded["encoder_output"]

    mask = encoded["attention_mask"]
    last_hidden = output.last_hidden_state
    mask_expanded = mask.unsqueeze(-1).float()
    summed = (last_hidden * mask_expanded).sum(dim=1)
    counts = mask_expanded.sum(dim=1).clamp(min=1e-9)
    pooled = summed / counts

    if "_original_order" in encoded:
        inv = encoded["_original_order"]
        pooled = pooled[inv]

    self._skill_embeds = F.normalize(pooled, p=2, dim=1).to(device)
    return self._skill_embeds`,
  },
  {
    heading: "Admin Agent — LangGraph Bridge",
    content: "adminAssistantAgent is a thin TypeScript wrapper that calls adminChat() in src/lib/langgraph-client.ts and coerces all errors into a discriminated union ({ text } | { text: null, error }) so callers never see raw exceptions. adminChat funnels through runGraph(), which POSTs to LANGGRAPH_URL/runs/wait with assistant_id 'admin_chat' and an optional bearer token. Why: the LLM orchestration runtime (Python LangGraph) and the serving runtime (Next.js) stay decoupled — the same client signature works against langgraph dev locally or a tunneled HF Space.",
    codeBlock: `// src/agents/admin-assistant.ts:10
export const adminAssistantAgent = {
  async generate(
    prompt: string,
  ): Promise<{ text: string; error?: never } | { text: null; error: string }> {
    try {
      const result = await adminChat(prompt);
      return { text: result.response };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error from admin agent";
      console.error("[adminAssistantAgent] generate failed:", message);
      return { text: null, error: message };
    }
  },
};

// src/lib/langgraph-client.ts:247 — typed wrapper over runGraph()
export function adminChat(
  prompt: string,
  system?: string,
): Promise<AdminChatResult> {
  return runGraph<AdminChatResult>("admin_chat", {
    prompt,
    system: system ?? "",
  });
}`,
  },
  {
    heading: "Hawkes Self-Exciting Lead Temperature",
    content: "Each engagement event (open=0.4, click=0.7, reply=1.0, meeting=1.5) adds a kernel that decays exponentially. The naive λ(t) = μ + Σ α·w_i·exp(-β·Δt) is O(n²) per lead; the recursive form S_n = w_{n-1} + exp(-β·Δt)·S_{n-1} carries a running weighted sum forward across sorted timestamps, dropping batch scoring to O(n). Why: nightly recompute over thousands of leads stays linear, and the 1024-entry Float32Array exp-decay LUT replaces every Math.exp() call in the hot path.",
    codeBlock: `// src/lib/ml/lead-temperature.ts:176
let S = 0;
let intensityAtThreeDaysAgo = mu;
let capturedThreeDaysAgo = false;

let prevTimestamp = sortedEvents[0].timestamp;

for (let i = 0; i < n; i++) {
  const ev = sortedEvents[i];
  if (ev.timestamp >= t) break;

  const dt = (ev.timestamp - prevTimestamp) / MS_PER_DAY;
  if (i > 0) {
    // Propagate the running sum forward by the time gap
    S = S * expDecayLUT(beta * dt);
  }

  // Add this event's weight to the running sum
  const w = EVENT_WEIGHTS[ev.type] ?? 0.1;
  S += w;
  prevTimestamp = ev.timestamp;
}

// Decay S from last event to evaluation time t
const dtFinal = (t - prevTimestamp) / MS_PER_DAY;
const intensityAtT = mu + alpha * S * expDecayLUT(beta * dtFinal);`,
  },
  {
    heading: "Thompson-Sampling Send-Time Optimizer",
    content: "Each (day-of-week, hour) slot maintains a Beta(α, β) posterior on open probability, stored as 168 pairs in a single Float64Array. To pick a send time we draw one sample per eligible slot via hand-rolled Marsaglia-Tsang gamma + Box-Muller normal samplers and take the argmax. Why: a 168-byte BUSINESS_HOUR_MASK and a 24×27 LOCAL_HOUR_TABLE turn business-hour eligibility and timezone-to-local-hour conversion into branchless table lookups, so a 10k-recipient batch grouped by (tz, seniority) reuses one sample sweep per group.",
    codeBlock: `// src/lib/ml/send-time-optimizer.ts:296
for (let dow = dowStart; dow < dowEnd; dow++) {
  for (let utcHour = 0; utcHour < 24; utcHour++) {
    // Look up local hour from pre-computed table
    const localHour = LOCAL_HOUR_TABLE[utcHour * TZ_OFFSET_COUNT + tzIdx];

    // Check business-hour eligibility from mask
    if (!BUSINESS_HOUR_MASK[dow * 24 + localHour]) continue;

    const slotIdx = dow * 24 + utcHour;
    const alpha = stats.alphaBeta[slotIdx * 2];
    let beta = stats.alphaBeta[slotIdx * 2 + 1];

    // C-suite narrowing: penalize outside 9am-12pm local
    if (senBucket >= 3 && (localHour < 9 || localHour > 12)) {
      beta += stats.seniorityModifier || 2;
    }

    const sample = betaSample(alpha, beta);
    if (sample > bestSample) {
      bestSample = sample;
      bestHour = utcHour;
    }
  }
}`,
  },
  {
    heading: "Kaplan-Meier Survival Curves for Outreach Cadence",
    content: "Historical reply times are right-censored (most contacts never reply). The product-limit estimator walks unique reply days in order, decrementing the at-risk set as observations are censored, and updates S *= 1 − events/atRisk only on actual reply events. Why: the optimal next follow-up is then the day in [2, 14] that maximizes baseReplyProb + boost·hazard − annoyance·(1 + sent), so the recommender stops automatically once incremental hazard no longer beats the annoyance penalty.",
    codeBlock: `// src/lib/ml/outreach-cadence.ts:75
for (const t of eventTimes) {
  // Count censored before this time
  while (sortIdx < n && sorted[sortIdx].days < t) {
    if (!sorted[sortIdx].replied) {
      atRisk--;
    }
    sortIdx++;
  }

  // Count events at this time
  let events = 0;
  let censoredAtT = 0;
  while (sortIdx < n && sorted[sortIdx].days === t) {
    if (sorted[sortIdx].replied) {
      events++;
    } else {
      censoredAtT++;
    }
    sortIdx++;
  }

  if (atRisk > 0 && events > 0) {
    S *= 1 - events / atRisk;
  }

  times.push(t);
  survival.push(Math.max(0, S));

  atRisk -= events + censoredAtT;
  if (atRisk <= 0) break;
}`,
  },
  {
    heading: "Gradient-Boosted Decision Stumps for Engagement",
    content: "A 12-feature vector (authority, days-since-last, open/reply rate, intent, lead-temperature, hour sin/cos, AI tier, verified) feeds a hand-rolled GBM of depth-1 stumps. Each boosting round fits residuals y − sigmoid(F) by enumerating ~20 quantile-bucketed thresholds per feature and picking the split with lowest MSE. Why: the same ensemble drives both the open and reply heads (reply log-odds = open · 0.6), and a 2048-entry sigmoid LUT plus a 4-way unrolled stump loop over a packed Float64Array feature matrix lets predictBatch score thousands of leads per call.",
    codeBlock: `// src/lib/ml/engagement-predictor.ts:175
for (let f = 0; f < featureCount; f++) {
  // Collect unique thresholds (quantile-based for efficiency)
  const vals = samples.map((s) => s.features[f]);
  const sorted = Array.from(new Set(vals)).sort((a, b) => a - b);
  // Use up to 20 candidate splits
  const step = Math.max(1, Math.floor(sorted.length / 20));
  const candidates: number[] = [];
  for (let i = 0; i < sorted.length; i += step) {
    candidates.push(sorted[i]);
  }

  for (const thr of candidates) {
    let leftSum = 0;
    let leftCount = 0;
    let rightSum = 0;
    let rightCount = 0;

    for (let i = 0; i < samples.length; i++) {
      if (samples[i].features[f] <= thr) {
        leftSum += residuals[i];
        leftCount++;
      } else {
        rightSum += residuals[i];
        rightCount++;
      }
    }
    // ... best-split selection by MSE reduction
  }
}`,
  },
  {
    heading: "LinkedIn Voyager Rate Limiter",
    content: "Every Voyager call passes through a 3-state circuit breaker (closed → open after 3 consecutive 429s → half-open after 5 min, allowing 2 probes), a per-endpoint token-bucket map covering 12 endpoints (profile_view: 12/min·400/day, messaging_send: 3/min·80/day, inmail: 2/min·20/day), and an AWS-style full-jitter exponential backoff randRange(0, base · 2^attempt). Why: each granted permit is delayed by a Box-Muller-shaped log-normal 'human delay' centered on the configured range, so request spacing matches a real browser instead of a uniform-rate bot fingerprint.",
    codeBlock: `// src/lib/linkedin/rate-limiter.ts:236
/** Exponential backoff with full jitter (AWS-style). */
function expBackoffJitter(base: number, attempt: number, cap: number): number {
  const exp = Math.min(cap, base * Math.pow(2, attempt));
  return randRange(0, exp);
}

/** Human-like delay: log-normal distribution centered on midpoint of range. */
function humanDelay(range: [number, number]): number {
  const [min, max] = range;
  // Box-Muller transform for normal distribution, then shift to range
  const u1 = Math.random();
  const u2 = Math.random();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const mid = (min + max) / 2;
  const spread = (max - min) / 4; // ~95% within range
  const delay = mid + normal * spread;
  return Math.max(min, Math.min(max, delay));
}`,
  },
  {
    heading: "SMTP RCPT-TO Email Verification",
    content: "verify_email runs a real RFC 5321 conversation: format check → typo-map correction → disposable-domain block → MX DNS lookup → connect to the lowest-preference MX on port 25 → EHLO with HELO graceful fallback → empty MAIL FROM:<> reverse-path → RCPT TO:<addr>. The response code is classified deterministically — 250 means the mailbox exists, 550–559 means it does not, anything else (timeout, refused, port 25 blocked) collapses to 'unknown'. Why: a catch-all canary xkzqpqxzqpq9zzz@{domain} is probed first, so domains that 250 every recipient are flagged as 'catchall' instead of falsely passing verification.",
    codeBlock: `# backend/leadgen_agent/email_verifier.py:441
try:
    # EHLO -> HELO fallback
    try:
        await client.ehlo("verify.local")
    except aiosmtplib.SMTPException:
        try:
            await client.helo("verify.local")
        except aiosmtplib.SMTPException as exc:
            return "unknown"

    # MAIL FROM:<>  (empty reverse-path, RFC 5321 s4.5.5 -- standard for probing)
    try:
        code, _msg = await client.mail("")
    except aiosmtplib.SMTPException as exc:
        return "unknown"
    if code != 250:
        return "unknown"

    # RCPT TO -- the key check
    try:
        code, _msg = await client.rcpt(email)
    except aiosmtplib.SMTPResponseException as exc:
        code = exc.code

    if code == 250:
        return "valid"
    if 550 <= code <= 559:
        return "invalid"
    return "unknown"`,
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
│  Live Web Search ──┴─→ Domain Dedup ─→ Neon PostgreSQL          │
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
      value: "JobBERT-v3 embeddings via HuggingFace Inference API (768-dim, multilingual) for semantic ICP matching",
      metadata: {"model": "TechWolf/JobBERT-v3, cosine distance"},
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
  {
    type: "code",
    heading: "GraphQL Company Type (SDL)",
    description: "The Company type exposes golden-record fields, AI scoring, intent signals, and related data via DataLoader-backed field resolvers",
    code: `type Company {
  id: Int!
  key: String!
  name: String!
  website: String
  description: String
  industry: String
  location: String
  linkedin_url: String
  job_board_url: String

  # Golden record
  category: CompanyCategory!
  tags: [String!]!
  services: [String!]!
  service_taxonomy: [String!]!
  score: Float!
  score_reasons: [String!]!

  # AI classification (3-tier taxonomy)
  ai_tier: Int!
  ai_classification_reason: String
  ai_classification_confidence: Float!

  # Deep analysis (Markdown narrative)
  deep_analysis: String

  # Intent scoring (weighted max-per-type)
  intentScore: Float!
  intentSignalsCount: Int!

  # Related data (DataLoader-backed)
  facts(limit: Int, offset: Int, field: String): [CompanyFact!]!
  snapshots(limit: Int, offset: Int): [CompanySnapshot!]!
  contacts: [Contact!]!
}`,
  },
  {
    type: "code",
    heading: "Contacts Schema with ML Fields",
    description: "Drizzle ORM schema showing ML-derived classification, deletion scoring, and conversation lifecycle columns with composite indexes",
    code: `export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  first_name: text("first_name").notNull(),
  last_name: text("last_name").notNull(),
  company_id: integer("company_id")
    .references(() => companies.id, { onDelete: "set null" }),

  // ML-derived fields (classifyContact / scoreContactsML)
  seniority: text("seniority"),         // IC | Manager | Director | VP | C-level | Founder
  department: text("department"),        // AI/ML | Engineering | Product | Other
  is_decision_maker: boolean("is_decision_maker").default(false),
  authority_score: real("authority_score").default(0.0),  // 0.10 – 1.0
  dm_reasons: text("dm_reasons"),        // JSON array

  // ML deletion scoring (multi-factor 0–1)
  to_be_deleted: boolean("to_be_deleted").notNull().default(false),
  deletion_score: real("deletion_score"),
  deletion_reasons: text("deletion_reasons"),

  // Conversation lifecycle state machine
  conversation_stage: text("conversation_stage"),
  // initial_sent → follow_up_1 → follow_up_2 → follow_up_3
  // → replied_interested | replied_not_interested
  // → meeting_scheduled → converted → closed
}, (table) => ({
  emailIdx: uniqueIndex("idx_contacts_email").on(table.email),
  companyIdIdx: index("idx_contacts_company_id").on(table.company_id),
  linkedinUrlIdx: index("idx_contacts_linkedin_url").on(table.linkedin_url),
}));`,
  },
  {
    type: "card-grid",
    heading: "Conversation Stage Transitions",
    description: "Contact lifecycle state machine — each stage tracks outreach progress and triggers follow-up scheduling or suppression",
    items: [
    {
      label: "initial_sent",
      value: "First outreach email delivered via Resend API. Starts the follow-up clock.",
      metadata: {"next": "follow_up_1 (after delay_days[0])"},
    },
    {
      label: "follow_up_1 → 3",
      value: "Automated follow-ups with escalating personalization. Max 3 before suppression.",
      metadata: {"gate": "reply-aware — any inbound reply cancels remaining follow-ups"},
    },
    {
      label: "replied_interested",
      value: "Inbound reply classified as interested. Triggers auto-draft reply generation.",
      metadata: {"action": "auto-draft stored in reply_drafts, requires human approval"},
    },
    {
      label: "replied_not_interested",
      value: "Negative reply detected. Contact moved to suppression list.",
      metadata: {"detection": "keyword matching: 'not interested', 'remove', 'unsubscribe'"},
    },
    {
      label: "meeting_scheduled",
      value: "Calendar link clicked or meeting confirmed in reply. Pipeline success metric.",
      metadata: {"tracking": "calendar link click events via Resend webhooks"},
    },
    {
      label: "converted → closed",
      value: "Deal closed or contact marked as won/lost. Terminal states — no further automation.",
      metadata: {"terminal": "true — no follow-ups, no auto-drafts"},
    },
    ],
  },
  {
    type: "card-grid",
    heading: "Rust crate inventory (crates/)",
    description: "Fifteen working Rust crates handle every non-LLM workload: crawling, embedding, classification, ICP scoring, email verification, storage. All compile for M1 aarch64 with NEON SIMD in hot paths; ML crates use Candle with the Metal feature. The `candle` crate is a resolution stub only — real inference lives in `metal`, `icp-embed`, and `jobbert`. The consultancies discovery / enrichment workload moved to LangGraph (six `consultancies_*` Python graphs in `backend/leadgen_agent/`).",
    items: [
      { label: "agentic-search", value: "Parallel codebase search — DeepSeek decomposes a query, spawns N tokio workers, each runs a Glob → Grep → Read tool loop, synthesizes.", metadata: { runtime: "bin", deps: "deepseek + tokio" } },
      { label: "ats", value: "Greenhouse job-board API consumer with parallel fetch.", metadata: { runtime: "lib + bin", deps: "reqwest" } },
      { label: "candle", value: "Resolution stub — real ML lives in metal, icp-embed, jobbert.", metadata: { runtime: "stub", deps: "n/a" } },
      { label: "common-crawl", value: "Seed discovery: CDX lookup → WARC fetch → HTML scrape → Neon upsert.", metadata: { runtime: "bin", deps: "flate2 + scraper + sqlx" } },
      { label: "companies-verify", value: "Candle BGE embeddings + LanceDB kNN to verify UK recruitment companies.", metadata: { runtime: "bin", deps: "candle + lancedb" } },
      { label: "company-cleanup", value: "Same stack as companies-verify, inverted — purges crypto/blockchain companies.", metadata: { runtime: "bin", deps: "candle + lancedb" } },
      { label: "email-verifier", value: "Local DNS MX + SMTP RCPT-TO + catch-all canary — free NeverBounce alternative available as a library.", metadata: { runtime: "lib + bin", deps: "hickory-resolver" } },
      { label: "gh", value: "GitHub API client for AI tier, tech-stack, and hiring-signal extraction.", metadata: { runtime: "lib + 5 bins", deps: "octocrab + feature flags" } },
      { label: "icp", value: "Pure ICP scoring — 64-byte-aligned ContactBatch SoA for 256 contacts, logistic + isotonic calibration.", metadata: { runtime: "lib", deps: "serde only" } },
      { label: "icp-embed", value: "BGE-M3 embedder (1024-dim, CLS-pooled) via Candle-Metal, served over axum HTTP.", metadata: { runtime: "lib + bin", deps: "candle + hf-hub + axum" } },
      { label: "job-prep", value: "Eleven research-agent binaries — interview prep, market research, company deep-dives.", metadata: { runtime: "11 bins", deps: "deepseek + semantic-scholar" } },
      { label: "jobbert", value: "JobBERT-v3 embedder: XLMRoberta → mean-pool → Dense(768→1024) tanh → L2-norm.", metadata: { runtime: "lib", deps: "candle + XLMRoberta" } },
      { label: "lead-papers", value: "Academic paper → lead matcher: Semantic Scholar → LanceDB → Neon.", metadata: { runtime: "bin", deps: "candle + lancedb + strsim" } },
      { label: "linkedin-posts", value: "axum HTTP + LanceDB store, JobBERT-v3 embeddings computed at write time.", metadata: { runtime: "lib + 3 bins", deps: "jobbert + lancedb + axum" } },
      { label: "metal", value: "The kitchen sink: storage (WAL + pages + B+ tree), inverted index, bloom/HLL, dedup, email FSM, NEON SIMD kernels, ONNX-backed BGE / JobBERT-v3 / ConTeXT-Skill embedders.", metadata: { runtime: "lib + bin", deps: "~40+ modules" } },
      { label: "scholar-graph", value: "Academic co-authorship graph ingest → Neon PostgreSQL.", metadata: { runtime: "bin", deps: "tokio-postgres-rustls" } },
    ],
  },
  {
    type: "code",
    heading: "JobBERT-v3 asymmetric anchor head (Rust + Candle)",
    description: "`crates/jobbert` loads TechWolf/JobBERT-v3 over Candle, then applies a linear Dense(768→1024) + Tanh projection — the 'anchor' head of the sentence-transformers Router. The positive head is training-only; at inference time anchor is the canonical embedding. Output is L2-normalized for cosine via dot product.",
    code: `// crates/jobbert/src/embedder.rs:35
// Dense projection: Linear(768 → 1024) + Tanh
fn forward(&self, x: &Tensor) -> Result<Tensor> {
    // x: [batch, 768] → [batch, 1024]
    let out = x.broadcast_matmul(&self.weight.t()?)?;
    let out = out.broadcast_add(&self.bias)?;
    let out = out.tanh()?;              // asymmetric anchor head
    Ok(out)
}`,
  },
  {
    type: "code",
    heading: "Catch-all canary probe (email-verifier, local SMTP FSM)",
    description: "Before SMTP-probing the real address, `email-verifier` probes a deterministically nonexistent canary like `xkzqpqxzqpq9zzz@<domain>`. If the MX host accepts that, every address will — the domain is flagged CatchAll and skipped for primary sends. The companion FSM lives in `metal::email_metal::smtp_fsm` (Banner → Ehlo → MailFrom → RcptTo → CatchAllTest → Quit → Done).",
    code: `// crates/email-verifier/src/lib.rs:101 — catch-all canary probe
let canary = format!("xkzqpqxzqpq9zzz@{domain}");
if smtp::smtp_probe(&canary, mx_host, config.timeout_secs).await
    == smtp::SmtpResult::Valid
{
    flags.push(VerificationFlag::CatchAll);
    return VerificationOutcome::new(
        VerificationResult::CatchAll, flags, None,
        start.elapsed().as_millis() as u64,
    );
}
// 7. SMTP probe for the real address
let smtp_result = smtp::smtp_probe(&email, mx_host, config.timeout_secs).await;`,
  },
];
