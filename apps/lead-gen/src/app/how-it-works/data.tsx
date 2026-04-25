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
    slug: "jobbert-v3",
    number: 10,
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
    slug: "pandacss",
    number: 12,
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
    description: "The HuggingFace Inference API generates JobBERT-v3 embeddings (768-dim, multilingual) for company descriptions and posts. Embeddings are computed via batch processing, often triggered by Inngest jobs, and stored for semantic search. The embeddings enable similarity queries (useGetSimilarPostsLazyQuery) and contribute to lead scoring based on cosine distance.",
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
  {
    heading: "Decision-Maker Classification",
    content: "Contact seniority and decision-maker status are computed deterministically via keyword-pattern matching against job titles — no LLM overhead for a classification that maps cleanly to a fixed taxonomy. C-level patterns, founder/president, VP, director, and manager tiers each receive a calibrated authority score (0.10–1.0). A contact is flagged as a decision-maker if authority ≥ 0.75, or ≥ 0.60 in an AI/ML department — reflecting that domain-relevant managers carry more pipeline weight than generic executives.",
    codeBlock: `function classifyContact(position: string | null | undefined): ContactClassification {
  const t = (position?.trim() ?? "").toLowerCase();
  if (!t) return { seniority: "IC", authorityScore: 0.10, isDecisionMaker: false };

  let seniority = "IC";
  let authorityScore = 0.10;

  const C_LEVEL = ["chief executive", "chief technology", "chief product",
    "chief operating", "chief data", "chief ai"];
  const isCLevel = C_LEVEL.some(p => t.includes(p))
    || /\\bceo\\b/.test(t) || /\\bcto\\b/.test(t) || /\\bcfo\\b/.test(t);

  if (isCLevel) { seniority = "C-level"; authorityScore = 1.0; }
  else if (["founder", "co-founder", "president"].some(p => t.includes(p)))
    { seniority = "Founder"; authorityScore = 0.95; }
  else if (["vice president", "vp of"].some(p => t.includes(p)) || t.startsWith("vp "))
    { seniority = "VP"; authorityScore = 0.85; }

  // AI/ML department detection
  const AI_ML = ["artificial intelligence", " ai ", "machine learning",
    "deep learning", "nlp", "data science", "mlops", "llm"];
  const department = AI_ML.some(p => t.includes(p)) ? "AI/ML" : "Other";

  const isDecisionMaker = authorityScore >= 0.75
    || (authorityScore >= 0.60 && department === "AI/ML");
  return { seniority, department, authorityScore, isDecisionMaker, dmReasons: [] };
}`,
  },
  {
    heading: "Campaign State Machine",
    content: "Email campaigns follow a strict state machine: draft → pending → running → completed/failed/stopped. The launch mutation iterates recipients × sequence steps, computing per-step delays via business-day arithmetic. Same-company staggering is enforced at creation time. Resend API calls are synchronous per-message to preserve reply-to threading — batch endpoints would merge threads. Sent/scheduled/failed counters are updated atomically after the loop completes.",
    codeBlock: `async launchEmailCampaign(_parent, args, context) {
  const campaign = rows[0];
  if (campaign.status !== "draft" && campaign.status !== "pending")
    throw new Error(\`Campaign is already \${campaign.status}\`);

  const recipients = parseJsonArray(campaign.recipient_emails);
  const sequence = JSON.parse(campaign.sequence ?? "[]");
  const delayDays = JSON.parse(campaign.delay_days ?? "[]");
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
        to: recipientEmail, subject: step.subject,
        html: step.html, from: campaign.from_email ?? undefined,
        scheduledAt,
      });
      if (result.error) failed++; else if (scheduledAt) scheduled++; else sent++;
    }
  }

  await context.db.update(emailCampaigns).set({
    status: failed === recipients.length * sequence.length ? "failed" : "running",
    emails_sent: sent, emails_scheduled: scheduled, emails_failed: failed,
    start_at: new Date().toISOString(),
  }).where(eq(emailCampaigns.id, args.id));
}`,
  },
  {
    heading: "Multi-Factor Deletion Scoring",
    content: "Contacts accumulate a deletion score (0–1) across 6 weighted factors: invalid email/bounce history (0.25), blocked company association (0.17), staleness — 180+ days since last contact with no reply (0.15), data incompleteness — no email, LinkedIn, or GitHub (0.10), low-relevance department with low authority (0.10), and explicit do-not-contact flag (0.08). Contacts above the threshold are flagged for batch review rather than auto-deleted — the system optimizes for human confirmation at the boundary.",
    codeBlock: `// Factor 3 — staleness (0.15)
const daysSinceContacted = lastContactedMs
  ? Math.floor((now - lastContactedMs) / msPerDay) : 0;
if (lastContactedMs && daysSinceContacted > 180 && !anyReply) {
  score += 0.15;
  reasons.push(\`Last contacted \${daysSinceContacted} days ago with no reply\`);
} else if (!lastContactedMs && daysSinceCreated > 365) {
  score += 0.10;
  reasons.push(\`Never contacted, created \${daysSinceCreated} days ago\`);
}

// Factor 4 — data incompleteness (0.10)
if (!contact.email && !contact.linkedin_url && !contact.github_handle) {
  score += 0.10;
  reasons.push("No email, LinkedIn URL, or GitHub handle");
}

// Factor 5 — low relevance (0.10)
const LOW_RELEVANCE_DEPTS = new Set(["HR/Recruiting", "Other"]);
if (LOW_RELEVANCE_DEPTS.has(contact.department ?? "")
    && (contact.authority_score ?? 0) < 0.30) {
  score += 0.10;
  reasons.push(\`Low-relevance dept with authority \${authorityScore.toFixed(2)}\`);
}

// Factor 6 — DNC flag (0.08)
if (contact.do_not_contact) {
  score += 0.08;
  reasons.push("Marked do-not-contact");
}`,
  },
  {
    heading: "Discovery Pipeline Signal Detection",
    content: "The CPN (Claude Partner Network) discovery pipeline parses CSV partner data and generates personalized outreach signals per row. A signal function cascades through three tiers: company association (strongest — 'Saw {company} is working with Claude'), archetype match ('Your {archetype} work on GitHub caught my eye'), and generic fallback. Each signal feeds directly into the email subject and opening line, ensuring every outreach email has a concrete, verifiable reason for contact.",
    codeBlock: `const CPN_TAG = '["cpn-outreach"]';
const FROM = "Vadim Nicolai <contact@vadim.blog>";

interface PartnerRow {
  rank: string; login: string; name: string;
  email: string; company: string; score: string;
  archetypes: string; github_url: string;
}

function signal(row: PartnerRow): string {
  const company = row.company?.trim().replace(/^@/, "");
  if (company) return \`Saw \${company} is working with Claude\`;

  const archetypes = row.archetypes?.trim();
  if (archetypes) {
    const first = archetypes.split(",")[0].trim();
    return \`Your \${first} work on GitHub caught my eye\`;
  }

  return "Noticed you're active in the Claude SDK ecosystem";
}`,
  },
  {
    heading: "Drizzle Schema with Indexes",
    content: "The contacts and email_campaigns tables demonstrate Drizzle ORM's composable schema pattern: column definitions inline, index definitions in a trailing function. Contacts carry ML-derived deletion scoring fields (to_be_deleted, deletion_score, deletion_reasons) alongside conversation lifecycle state. Email campaigns use a status enum column with a dedicated index for queue-scan queries. Foreign keys cascade on delete to prevent orphaned records.",
    codeBlock: `export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  first_name: text("first_name").notNull(),
  last_name: text("last_name").notNull(),
  company_id: integer("company_id")
    .references(() => companies.id, { onDelete: "set null" }),

  // ML-derived fields
  seniority: text("seniority"),
  is_decision_maker: boolean("is_decision_maker").default(false),
  authority_score: real("authority_score").default(0.0),
  dm_reasons: text("dm_reasons"),              // JSON array

  // ML deletion scoring
  to_be_deleted: boolean("to_be_deleted").notNull().default(false),
  deletion_score: real("deletion_score"),
  deletion_reasons: text("deletion_reasons"),   // JSON array

  // Conversation lifecycle
  conversation_stage: text("conversation_stage"),
  // initial_sent | follow_up_1..3 | replied_interested
  // | meeting_scheduled | converted | closed
}, (table) => ({
  emailIdx: uniqueIndex("idx_contacts_email").on(table.email),
  companyIdIdx: index("idx_contacts_company_id").on(table.company_id),
  linkedinUrlIdx: index("idx_contacts_linkedin_url").on(table.linkedin_url),
}));`,
  },
  {
    heading: "AI Contact Enrichment with Zod Validation",
    content: "Contact enrichment uses DeepSeek with JSON response format constrained by a Zod schema — SynthesisOutputSchema defines the exact shape of enrichment output (specialization, skills, research areas, experience level, confidence score). The raw JSON is parsed and validated via safeParse; malformed responses return null rather than corrupting the contact record. Temperature 0.1 ensures reproducible classification across identical inputs.",
    codeBlock: `const SynthesisOutputSchema = z.object({
  specialization: z.string().nullable(),
  skills: z.array(z.string()),
  research_areas: z.array(z.string()),
  experience_level: z.enum(["junior", "mid", "senior", "principal", "unknown"]),
  synthesis_confidence: z.number().min(0).max(1),
  synthesis_rationale: z.string().nullable(),
});

const response = await client.chat.completions.create({
  model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: \`Profile:\\n\${contextLines}\` },
  ],
  response_format: { type: "json_object" },
  temperature: 0.1,
  max_tokens: 512,
});

const parsed = SynthesisOutputSchema.safeParse(JSON.parse(raw));
return parsed.success ? parsed.data : null;`,
  },
  {
    heading: "Strategy Enforcer — Grounding-First",
    content: "The strategy enforcer is a static analysis agent that scans changed files for LLM calls without schema constraints. It pattern-matches on generate()/chat() calls and checks for structuredOutput or response_format nearby. Violations are severity-tagged as BLOCKING — the enforcer won't approve a PR where an LLM call returns unstructured text that feeds into database writes. Exempt paths (test files, scripts) are skipped. This catches the #1 source of runtime type errors in AI pipelines: unvalidated LLM output.",
    codeBlock: `function checkGroundingFirst(
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
        rule: "Grounding-First — LLM outputs must be schema-constrained",
        severity: "BLOCKING",
        file,
        message: "LLM call found without structuredOutput or response_format",
        fix: "Add structuredOutput: { schema: yourZodSchema } to the call",
      });
    }
  }
  return violations;
}`,
  },
  {
    heading: "LinkedIn Post Analysis Pipeline",
    content: "Post analysis orchestrates two parallel inference calls: SalesCue (DeBERTa-based) for semantic skill extraction, and a local JobBERT-v3 embedder served from the `jobbert` Rust crate (XLMRoberta → mean-pool → Dense 768→1024 Tanh → L2, 1024-dim, 64-token max). Both run concurrently via Promise.all — the skill tags feed intent classification while the dense vectors land in LanceDB for similarity search. Batch processing analyzes up to 200 un-analyzed posts per mutation call, writing embeddings and skills back to the linkedin_posts table. The dual-model approach gives both structured tags (filterable) and dense vectors (searchable).",
    codeBlock: `interface PostAnalysis {
  skills: ExtractedSkill[];
  jobEmbedding: number[];
  analyzedAt: string;
}

async function analyzePost(content: string): Promise<PostAnalysis> {
  const [skillsResult, jobEmbedding] = await Promise.all([
    extractSkillsHttp(content),   // SalesCue: semantic skill tags
    candle.embedPost(content),    // JobBERT-v3: dense vector embedding (HF API)
  ]);
  return {
    skills: skillsResult.result.skills,
    jobEmbedding,
    analyzedAt: new Date().toISOString(),
  };
}

// Batch mutation — analyze up to 200 un-analyzed posts
async analyzeLinkedInPosts(_parent, args, context) {
  const targetPosts = await context.db.select().from(linkedinPosts)
    .where(isNull(linkedinPosts.analyzed_at))
    .limit(Math.min(args.limit ?? 50, 200));

  const results = await analyzePostBatch(
    targetPosts.map((p) => ({ id: p.id, content: p.content! })),
  );
  // Update DB with embeddings + skills per post
}`,
  },
  {
    heading: "Auto-Draft Prompt Engineering",
    content: "Auto-draft replies use classification-specific prompt templates injected into a multi-turn thread context. The thread is serialized as [OUTBOUND]/[INBOUND] labeled messages, limited to the last 6 exchanges to stay within token budget. Each reply classification (interested, info_request, not_interested) has tailored instructions — 'interested' replies suggest specific next actions, 'info_request' replies provide truthful answers without overselling. Generated drafts include auto-prepended greetings and are stored with generation_model and thread_context for auditability.",
    codeBlock: `function buildDraftPrompt(
  classification: ReplyClass,
  thread: ThreadMessage[],
  contactName: string,
): string {
  const threadText = thread
    .map((m) => \`[\${m.direction.toUpperCase()}] \${m.subject}\\n\${m.body}\`)
    .join("\\n\\n---\\n\\n");

  const classInstructions: Record<string, string> = {
    interested: \`Write an enthusiastic reply that:
- Thanks them for their interest
- Provides next concrete step
- Keeps momentum — suggest specific action
- Is warm but professional, 80-150 words\`,
    info_request: \`Write a reply addressing their questions
with specific, truthful answers...\`,
  };

  return \`You are Vadim Nicolai, writing a reply to \${contactName}...
\${classInstructions[classification]}
FULL CONVERSATION THREAD:
\${threadText}
Respond with ONLY valid JSON: {"subject": "Re: ...", "body": "..."}\`;
}

// Store draft with audit trail
await db.insert(replyDrafts).values({
  received_email_id: receivedEmailId,
  status: "pending",        // requires human approval
  generation_model: model,
  thread_context: JSON.stringify(thread.slice(-6)),
});`,
  },
  {
    heading: "Dual-Runtime Skill Extraction",
    content: "Skill extraction runs in two runtimes against a canonical 157-skill ESCO taxonomy. The Rust implementation (crates/metal) pre-computes 768-dim ConTeXT embeddings for all skill labels into a flat row-major array, then runs cosine similarity against incoming text embeddings — batch inference at Metal-accelerated speeds. The Python implementation (SalesCue) lazy-loads DeBERTa embeddings with mean pooling over token dimensions, caching after first call. Both use the same threshold (0.35) and top-K (10) parameters, producing identical skill tag outputs across runtimes.",
    codeBlock: `// Rust — crates/metal/src/kernel/skill_extraction.rs
pub struct SkillTaxonomy {
    labels: Vec<String>,
    embeddings: Vec<f32>,  // flat row-major: [n_skills x 768]
    dim: usize,
}

impl SkillTaxonomy {
    pub fn match_embedding(
        &self, text_embedding: &[f32], top_k: usize, threshold: f32,
    ) -> Vec<ExtractedSkill> {
        let mut scores: Vec<(usize, f32)> = Vec::with_capacity(self.labels.len());
        for i in 0..self.labels.len() {
            let sim = cosine_similarity(text_embedding, self.get_embedding(i));
            if sim >= threshold { scores.push((i, sim)); }
        }
        scores.sort_unstable_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        scores.truncate(top_k);
        scores.iter().map(|(i, s)| ExtractedSkill {
            label: self.labels[*i].clone(), confidence: *s,
        }).collect()
    }
}

# Python — salescue/modules/skills.py
class SkillExtractor(BaseModule):
    def _ensure_skill_embeds(self) -> torch.Tensor:
        """Pre-compute DeBERTa embeddings. Cached after first call."""
        mask = encoded["attention_mask"].unsqueeze(-1).float()
        summed = (last_hidden * mask).sum(dim=1)
        pooled = summed / mask.sum(dim=1).clamp(min=1e-9)
        self._skill_embeds = F.normalize(pooled, p=2, dim=1)
        return self._skill_embeds`,
  },
  {
    heading: "NEON SIMD cosine similarity — ~10 ns per 384-dim vector",
    content: "The workhorse Rust crate `metal` compiles its similarity kernel down to ARM NEON intrinsics on aarch64. `cosine_sim_int8_neon` reads 16 INT8 bytes per iteration, widens u8→u16→u32→f32 via `vmovl` lanes, dequantizes through fused multiply-add (`vfmaq_f32`), and accumulates dot + norm in a single pass. Four float32x4 accumulators give instruction-level parallelism on the M1's wide decode. Source comments claim ~30 cycles / ~10 ns at 3.2 GHz — a single cosine over 384 dimensions. This is the primitive under every INT8-quantized recall path: skill matching, post similarity, ICP centroid distance.",
    codeBlock: `// crates/metal/src/similarity/simd.rs:412
// For 384 dims: 24 iterations × 4 FMA = 96 FMAs ≈ 30 cycles ≈ 10 ns @ 3.2 GHz
#[cfg(target_arch = "aarch64")]
unsafe fn cosine_sim_int8_neon(
    query: &[f32], quant_data: &[u8],
    scale: f32, bias: f32, query_norm: f32, dim: usize,
) -> f32 {
    use core::arch::aarch64::*;
    let scale_v = vdupq_n_f32(scale);
    let bias_v  = vdupq_n_f32(bias);
    let mut dot_acc    = vdupq_n_f32(0.0);
    let mut norm_c_acc = vdupq_n_f32(0.0);
    let mut i = 0;
    while i + 16 <= dim {                              // 16 INT8 per iter
        let raw  = vld1q_u8(quant_data.as_ptr().add(i));
        let lo16 = vmovl_u8(vget_low_u8(raw));         // u8 → u16
        let f0   = vcvtq_f32_u32(vmovl_u16(vget_low_u16(lo16)));
        let c0   = vfmaq_f32(bias_v, f0, scale_v);     // dequantize via FMA
        let q0   = vld1q_f32(query.as_ptr().add(i));
        dot_acc    = vfmaq_f32(dot_acc, q0, c0);       // dot  += q * c
        norm_c_acc = vfmaq_f32(norm_c_acc, c0, c0);    // norm += c * c
        i += 16;
    }
    vaddvq_f32(dot_acc) / (query_norm * vaddvq_f32(norm_c_acc).sqrt() + 1e-10)
}`,
  },
  {
    heading: "Follow-Up Scheduler Cron",
    content: "A Vercel cron endpoint runs the multi-stage follow-up scheduler. Three timing windows (3 days after initial, 5 days after follow-up 1, 7 days after follow-up 2) drive the drip cadence. The scheduler respects conversation-stage gates — contacts who replied, converted, or scheduled meetings are immediately excluded. Before generating each draft, it checks for existing pending drafts to prevent duplicates. Generated drafts require human approval before sending, preserving the human-in-the-loop principle.",
    codeBlock: `const DAYS_AFTER_INITIAL = 3;
const DAYS_AFTER_FOLLOWUP_1 = 5;
const DAYS_AFTER_FOLLOWUP_2 = 7;

const needsFollowUp = eligibleEmails.filter((e) => {
  const seqNum = parseInt(e.sequence_number || "0", 10);
  const stage = e.conversation_stage;

  // Respect conversation-stage gates
  if (stage && stage.startsWith("replied_")) return false;
  if (stage === "closed" || stage === "converted") return false;
  if (stage === "meeting_scheduled") return false;

  if (seqNum === 0 && sentAt < cutoffInitial) return true;
  if (seqNum === 1 && sentAt < cutoffF1) return true;
  if (seqNum === 2 && sentAt < cutoffF2) return true;
  return false;
});

for (const email of needsFollowUp) {
  // Prevent duplicate drafts
  const [existingDraft] = await db.select({ id: replyDrafts.id })
    .from(replyDrafts)
    .where(and(
      eq(replyDrafts.contact_id, email.contact_id),
      eq(replyDrafts.draft_type, "follow_up"),
      eq(replyDrafts.status, "pending"),
    )).limit(1);

  if (existingDraft) { skipped++; continue; }

  // Generate follow-up via DeepSeek
  const instructions = buildFollowUpInstructions(
    (seqNum + 1).toString(), daysSince, email.subject,
  );
  // ... DeepSeek call with response_format: json_object
  await db.insert(replyDrafts).values({
    contact_id: email.contact_id,
    status: "pending",  // requires human approval
    draft_type: "follow_up",
  });
}`,
  },
  {
    heading: "Admin Agent — LangGraph Bridge",
    content: "The admin assistant is a typed HTTP bridge from TypeScript to a Python LangGraph server running on port 8002. The TypeScript layer handles error coercion into a discriminated union (either { text: string } or { text: null, error: string }) — callers never see raw exceptions. The Python side hosts an ops-grade agent for internal debugging, evidence inspection, and batch reprocessing. This architecture separates the LLM orchestration runtime (Python/LangGraph) from the serving runtime (TypeScript/Next.js), letting each use its optimal toolchain.",
    codeBlock: `// src/agents/admin-assistant.ts
export const adminAssistantAgent = {
  async generate(prompt: string):
    Promise<{ text: string } | { text: null; error: string }> {
    try {
      const result = await adminChat(prompt);
      return { text: result.response };
    } catch (err) {
      const message = err instanceof Error
        ? err.message : "Unknown error from admin agent";
      return { text: null, error: message };
    }
  },
};

// src/lib/langgraph-client.ts — typed HTTP bridge
export function adminChat(
  prompt: string, system?: string,
): Promise<AdminChatResult> {
  return callLangGraph<AdminChatResult>("/admin-chat", {
    prompt,
    system: system ?? "",
  });
}

async function callLangGraph<T>(path: string, body: unknown): Promise<T> {
  const base = process.env.LANGGRAPH_URL ?? "http://localhost:8002";
  const res = await fetch(\`\${base}\${path}\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(\`LangGraph \${res.status}\`);
  return res.json() as Promise<T>;
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
    description: "Sixteen working Rust crates handle every non-LLM workload: crawling, embedding, classification, ICP scoring, email verification, storage. All compile for M1 aarch64 with NEON SIMD in hot paths; ML crates use Candle with the Metal feature. The `candle` crate is a resolution stub only — real inference lives in `metal`, `icp-embed`, and `jobbert`.",
    items: [
      { label: "agentic-search", value: "Parallel codebase search — DeepSeek decomposes a query, spawns N tokio workers, each runs a Glob → Grep → Read tool loop, synthesizes.", metadata: { runtime: "bin", deps: "deepseek + tokio" } },
      { label: "ats", value: "Greenhouse job-board API consumer with parallel fetch.", metadata: { runtime: "lib + bin", deps: "reqwest" } },
      { label: "candle", value: "Resolution stub — real ML lives in metal, icp-embed, jobbert.", metadata: { runtime: "stub", deps: "n/a" } },
      { label: "common-crawl", value: "Seed discovery: CDX lookup → WARC fetch → HTML scrape → Neon upsert.", metadata: { runtime: "bin", deps: "flate2 + scraper + sqlx" } },
      { label: "companies-verify", value: "Candle BGE embeddings + LanceDB kNN to verify UK recruitment companies.", metadata: { runtime: "bin", deps: "candle + lancedb" } },
      { label: "company-cleanup", value: "Same stack as companies-verify, inverted — purges crypto/blockchain companies.", metadata: { runtime: "bin", deps: "candle + lancedb" } },
      { label: "consultancies", value: "Discover top-tier AI/ML consultancies across EU/UK/US and upsert to Neon.", metadata: { runtime: "2 bins", deps: "reqwest + scraper" } },
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
