/**
 * Scrape Udemy courses related to vector databases via topic navigation.
 * Run: pnpm scrape:udemy
 *
 * Strategy:
 *  1. Crawl the primary topic page + related topic pages to discover courses
 *  2. From each course, collect "Explore related topics" → crawl those too
 *  3. Deep-scrape every discovered course in a fresh browser (bypasses Cloudflare)
 *  4. Only save courses whose content matches vector-DB keywords
 *  5. Map to lesson slugs based on keyword relevance
 */
import { webkit, type Page, type BrowserContext } from "playwright";
import { db } from "@/src/db";
import { externalCourses, lessonCourses } from "@/src/db/schema";

const DELAY_MS = 3000;

const BROWSER_OPTS = {
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  viewport: { width: 1440 as const, height: 900 as const },
  locale: "en-US" as const,
};

// Topics to crawl for course discovery. Starts with the primary topic,
// then follows related topics found on course pages.
const SEED_TOPICS = [
  "vector-databases",
  "langchain",
  "openai-api",
  "retrieval-augmented-generation",
  "ai-agents",
  "generative-ai",
];

// Promotional courses Udemy shows on every topic page — skip these.
const PROMO_SLUGS = new Set([
  "google-ai-fundamentals",
  "google-ai-for-brainstorming-and-planning",
  "google-ai-for-research-and-insights",
  "google-ai-for-writing-and-communicating",
  "google-ai-for-content-creation",
  "google-ai-for-data-analysis",
  "google-ai-for-workflow-automation",
]);

// Keywords that must appear in a course's full text for it to be relevant.
// At least one must match for us to save the course.
const RELEVANCE_KEYWORDS = [
  "vector database", "vector db", "vectorstore", "vector store",
  "pinecone", "weaviate", "qdrant", "milvus", "chroma", "chromadb",
  "pgvector", "faiss", "similarity search",
  "embedding", "vector search", "nearest neighbor",
  "rag", "retrieval augmented", "retrieval-augmented",
  "langchain", "llamaindex", "langgraph",
];

// ── Types ────────────────────────────────────────────────────────────

interface CourseMetadata {
  instructors: string[];
  subtitle: string | null;
  price: string | null;
  whatYoullLearn: string[];
  requirements: string[];
  targetAudience: string[];
  curriculum: { section: string; lectures: number; duration: string }[];
  lastUpdated: string | null;
  totalLectures: number | null;
  totalDuration: string | null;
  discoveredFrom: string; // topic or course URL that led us here
}

interface ScrapedCourse {
  title: string;
  url: string;
  description: string | null;
  level: string | null;
  rating: number | null;
  reviewCount: number | null;
  durationHours: number | null;
  isFree: boolean;
  enrolled: number | null;
  imageUrl: string | null;
  language: string;
  metadata: CourseMetadata;
}

// ── Slug keyword mapping ─────────────────────────────────────────────

const SLUG_KEYWORDS: Record<string, string[]> = {
  "vector-databases": [
    "vector database", "pinecone", "weaviate", "qdrant", "milvus", "chroma",
    "pgvector", "faiss", "similarity search", "nearest neighbor", "vector store",
    "vector index", "vector search", "ann index", "hnsw",
  ],
  "embedding-models": [
    "embedding model", "sentence transformer", "text-embedding", "word2vec",
    "sbert", "embed model", "vector representation", "openai embedding",
  ],
  "retrieval-strategies": [
    "retrieval", "semantic search", "hybrid search", "reranking", "bm25",
    "dense retrieval", "sparse retrieval", "rag retrieval", "search engine",
  ],
  "advanced-rag": [
    "advanced rag", "agentic rag", "multi-step retrieval", "query decomposition",
    "self-rag", "corrective rag", "graph rag", "rag pipeline",
  ],
  "chunking-strategies": [
    "chunking", "text splitting", "document splitting", "chunk size",
    "recursive split", "semantic chunking",
  ],
  "rag-evaluation": [
    "rag eval", "faithfulness", "context relevance", "answer relevance",
    "groundedness", "ragas", "trulens",
  ],
  "embeddings": [
    "embedding", "dense vector", "embedding space", "cosine similarity",
    "semantic similarity", "vector embedding",
  ],
  "langgraph": [
    "langgraph", "langchain graph", "state graph", "agentic rag",
  ],
  "function-calling": [
    "function calling", "tool calling", "tool use",
  ],
  "agent-architectures": [
    "ai agent", "agent architecture", "react agent", "react loop",
    "multi-agent", "agentic",
  ],
};

function matchSlugs(course: ScrapedCourse): { slug: string; relevance: number }[] {
  const fullText = [
    course.title,
    course.description ?? "",
    ...course.metadata.whatYoullLearn,
    ...course.metadata.curriculum.map((s) => s.section),
  ]
    .join(" ")
    .toLowerCase();

  const matches: { slug: string; relevance: number }[] = [];

  for (const [slug, keywords] of Object.entries(SLUG_KEYWORDS)) {
    const hitCount = keywords.filter((kw) => fullText.includes(kw.toLowerCase())).length;
    if (hitCount > 0) {
      const relevance = Math.min(1.0, Math.max(0.3, (hitCount / keywords.length) * 1.5));
      matches.push({ slug, relevance: Math.round(relevance * 100) / 100 });
    }
  }

  // Ensure at least vector-databases slug
  if (!matches.find((m) => m.slug === "vector-databases")) {
    matches.push({ slug: "vector-databases", relevance: 0.3 });
  }

  return matches;
}

function isRelevant(course: ScrapedCourse): boolean {
  const fullText = [
    course.title,
    course.metadata.subtitle ?? "",
    course.description ?? "",
    ...course.metadata.whatYoullLearn,
    ...course.metadata.curriculum.map((s) => s.section),
  ]
    .join(" ")
    .toLowerCase();

  return RELEVANCE_KEYWORDS.some((kw) => fullText.includes(kw));
}

// ── Browser helpers ──────────────────────────────────────────────────

async function freshContext(): Promise<{ context: BrowserContext; close: () => Promise<void> }> {
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext(BROWSER_OPTS);
  return { context, close: () => browser.close() };
}

function extractCourseUrls(rawUrls: string[]): string[] {
  const seen = new Set<string>();
  return rawUrls
    .map((u) => {
      const m = u.match(/(https:\/\/www\.udemy\.com\/course\/[^/?#]+)/);
      return m ? m[1] + "/" : null;
    })
    .filter((u): u is string => {
      if (!u || seen.has(u)) return false;
      seen.add(u);
      const slug = u.replace("https://www.udemy.com/course/", "").replace("/", "");
      return !PROMO_SLUGS.has(slug);
    });
}

// ── Phase 1: Crawl topic pages ───────────────────────────────────────

async function crawlTopicPage(topic: string): Promise<{ courses: string[]; relatedTopics: string[] }> {
  const { context, close } = await freshContext();
  try {
    const page = await context.newPage();
    const url = `https://www.udemy.com/topic/${topic}/`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(6000);

    const title = await page.title();
    if (title.includes("moment") || title.includes("404")) {
      return { courses: [], relatedTopics: [] };
    }

    // Dismiss cookies
    await page.click('[id*="onetrust-accept"], button:has-text("Accept")').catch(() => {});

    // Scroll to load
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);
    }

    const courseHrefs = await page.evaluate(() =>
      [...document.querySelectorAll("a")].map((a) => a.href).filter((h) => h.includes("/course/")),
    );

    const topicHrefs = await page.evaluate(() =>
      [...document.querySelectorAll("a")]
        .map((a) => a.href)
        .filter((h) => h.match(/^https:\/\/www\.udemy\.com\/topic\/[a-z0-9-]+\/?$/))
        .filter((v, i, arr) => arr.indexOf(v) === i),
    );

    const relatedTopics = topicHrefs
      .map((h) => h.match(/\/topic\/([a-z0-9-]+)/)?.[1])
      .filter((t): t is string => !!t);

    return { courses: extractCourseUrls(courseHrefs), relatedTopics };
  } finally {
    await close();
  }
}

// ── Phase 2: Deep scrape a course page ───────────────────────────────

async function scrapeCoursePage(page: Page, url: string): Promise<ScrapedCourse | null> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("h1", { timeout: 15000 });
  await page.waitForTimeout(5000);

  // Scroll to load lazy sections
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
  }

  // Expand "Show more" / "Expand all sections"
  const expandBtns = page.locator('button:has-text("Show more"), button:has-text("Expand all sections")');
  const btnCount = await expandBtns.count();
  for (let i = 0; i < Math.min(btnCount, 10); i++) {
    await expandBtns.nth(i).click().catch(() => {});
    await page.waitForTimeout(500);
  }

  const data = await page.evaluate((courseUrl: string) => {
    const lines = document.body.innerText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    const h1 = document.querySelector("h1");
    const title = h1?.textContent?.trim() ?? "Unknown";

    // Subtitle
    let subtitle: string | null = null;
    const titleIdx = lines.findIndex((l) => l === title);
    if (titleIdx >= 0) {
      const secondIdx = lines.indexOf(title, titleIdx + 1);
      const searchStart = secondIdx >= 0 ? secondIdx + 1 : titleIdx + 1;
      const nextLine = lines[searchStart];
      if (nextLine && !/^(Rating|Highest|Bestseller|Role Play|Hot & New|New)/.test(nextLine)) {
        subtitle = nextLine;
      }
    }

    // Rating
    let rating: number | null = null;
    const ratingLine = lines.find((l) => /^Rating:\s*[\d.]+\s*out\s*of/.test(l));
    if (ratingLine) {
      const m = ratingLine.match(/([\d.]+)\s*out/);
      if (m) rating = parseFloat(m[1]);
    } else {
      const ratingIdx = lines.findIndex((l) => /^\d\.\d$/.test(l));
      if (ratingIdx >= 0) rating = parseFloat(lines[ratingIdx]);
    }

    // Review count
    let reviewCount: number | null = null;
    const reviewLine = lines.find((l) => /\([\d,]+\s*rating/.test(l));
    if (reviewLine) {
      const m = reviewLine.match(/([\d,]+)\s*rating/);
      if (m) reviewCount = parseInt(m[1].replace(/,/g, ""), 10);
    }

    // Enrolled
    let enrolled: number | null = null;
    const enrolledLine = lines.find((l) => /^[\d,]+\s*student/i.test(l));
    if (enrolledLine) {
      const m = enrolledLine.match(/([\d,]+)\s*student/i);
      if (m) enrolled = parseInt(m[1].replace(/,/g, ""), 10);
    }

    // Instructors
    const createdIdx = lines.findIndex((l) => l === "Created by");
    const instructors: string[] = [];
    if (createdIdx >= 0 && lines[createdIdx + 1]) {
      instructors.push(...lines[createdIdx + 1].split(",").map((s) => s.trim()).filter(Boolean));
    }

    // Last updated
    const updatedLine = lines.find((l) => /^Last updated/.test(l));
    const lastUpdated = updatedLine ?? null;

    // Language
    let language = "English";
    if (updatedLine) {
      const updIdx = lines.indexOf(updatedLine);
      const langLine = lines[updIdx + 1];
      if (langLine && /^[A-Z][a-z]+$/.test(langLine)) language = langLine;
    }

    // Price
    const priceLine = lines.find((l) => /^(Free|(\$|€|£|₹|lei\s*)[\d,.]+)$/i.test(l));
    const price = priceLine ?? null;
    const isFree = price ? /free/i.test(price) : false;

    // What you'll learn
    const learnIdx = lines.findIndex((l) => l === "What you'll learn");
    const whatYoullLearn: string[] = [];
    if (learnIdx >= 0) {
      for (let i = learnIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (/^(Explore related|Show more|Show less|Course content|Coding Exercises)/.test(line)) break;
        if (line.length > 10 && line.length < 300) whatYoullLearn.push(line);
      }
    }

    // Curriculum
    const contentIdx = lines.findIndex((l) => l === "Course content");
    const curriculum: { section: string; lectures: number; duration: string }[] = [];
    let totalLectures: number | null = null;
    let totalDuration: string | null = null;
    if (contentIdx >= 0) {
      const summaryLine = lines[contentIdx + 1];
      if (summaryLine) {
        const lm = summaryLine.match(/(\d+)\s*lecture/);
        if (lm) totalLectures = parseInt(lm[1], 10);
        const dm = summaryLine.match(/([\dh\s]+\d+m)\s*total/);
        if (dm) totalDuration = dm[1].trim();
      }

      for (let i = contentIdx + 2; i < lines.length; i++) {
        const line = lines[i];
        if (line === "Requirements" || line === "Description" || line === "Who this course is for:") break;
        if (line === "Expand all sections" || /^\d+ more section/.test(line)) continue;
        const statsLine = lines[i + 1];
        if (statsLine && /^\d+\s*lecture/.test(statsLine)) {
          const lm = statsLine.match(/(\d+)\s*lecture/);
          const dm = statsLine.match(/•\s*(.+)/);
          curriculum.push({
            section: line,
            lectures: lm ? parseInt(lm[1], 10) : 0,
            duration: dm ? dm[1].trim() : "",
          });
          i++;
        }
      }
    }

    // Requirements
    const reqIdx = lines.findIndex((l) => l === "Requirements");
    const requirements: string[] = [];
    if (reqIdx >= 0) {
      for (let i = reqIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line === "Description" || line === "Who this course is for:" || line === "Show more") break;
        if (line.length > 5 && line.length < 300) requirements.push(line);
      }
    }

    // Description
    const descIdx = lines.findIndex((l, idx) => l === "Description" && idx > (contentIdx || 0));
    let description: string | null = null;
    if (descIdx >= 0) {
      const descLines: string[] = [];
      for (let i = descIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line === "Who this course is for:" || line === "Show more" || line === "Show less") break;
        descLines.push(line);
      }
      description = descLines.join("\n").slice(0, 5000) || null;
    }
    if (!description) description = subtitle;

    // Target audience
    const targetIdx = lines.findIndex((l) => l === "Who this course is for:");
    const targetAudience: string[] = [];
    if (targetIdx >= 0) {
      for (let i = targetIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (/^(Show more|Show less|Students also|Report abuse|Privacy|By clicking)/.test(line)) break;
        if (line.length > 5 && line.length < 300) targetAudience.push(line);
      }
    }

    // Level
    let level: string | null = null;
    const levelLine = lines.find((l) => /^(Beginner|Intermediate|Advanced|All Levels)/i.test(l));
    if (levelLine) level = levelLine;

    // Duration hours
    let durationHours: number | null = null;
    const durLine = lines.find((l) => /[\d.]+\s*total\s*hour/i.test(l));
    if (durLine) {
      const m = durLine.match(/([\d.]+)\s*total\s*hour/i);
      if (m) durationHours = parseFloat(m[1]);
    } else if (totalDuration) {
      const hm = totalDuration.match(/(\d+)h\s*(\d+)?m?/);
      if (hm) durationHours = parseInt(hm[1], 10) + (parseInt(hm[2] || "0", 10) / 60);
    }

    // Image
    const ogImg = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
    const imageUrl = ogImg?.content ?? null;

    // Related topics (for further crawling)
    const relatedTopicSlugs = [...document.querySelectorAll("a")]
      .map((a) => a.href.match(/^https:\/\/www\.udemy\.com\/topic\/([a-z0-9-]+)/)?.[1])
      .filter((t): t is string => !!t)
      .filter((v, i, a) => a.indexOf(v) === i);

    return {
      course: {
        title,
        url: courseUrl,
        description,
        level,
        rating,
        reviewCount,
        durationHours,
        isFree,
        enrolled,
        imageUrl,
        language,
        metadata: {
          instructors,
          subtitle,
          price,
          whatYoullLearn,
          requirements,
          targetAudience,
          curriculum,
          lastUpdated,
          totalLectures,
          totalDuration,
          discoveredFrom: "",
        },
      },
      relatedTopicSlugs,
    };
  }, url);

  if (!data || !data.course.title || data.course.title === "Unknown") return null;
  return data.course as ScrapedCourse;
}

/** Scrape a course page and also return related topic slugs. */
async function deepScrapeWithTopics(
  url: string,
  discoveredFrom: string,
): Promise<{ course: ScrapedCourse | null; relatedTopics: string[] }> {
  const { context, close } = await freshContext();
  try {
    const page = await context.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("h1", { timeout: 15000 });
    await page.waitForTimeout(5000);

    // Scroll fully
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
    }

    // Expand sections
    const expandBtns = page.locator('button:has-text("Show more"), button:has-text("Expand all sections")');
    const btnCount = await expandBtns.count();
    for (let i = 0; i < Math.min(btnCount, 10); i++) {
      await expandBtns.nth(i).click().catch(() => {});
      await page.waitForTimeout(500);
    }

    const result = await page.evaluate((courseUrl: string) => {
      // === Inline scraping (same as scrapeCoursePage but returns related topics too) ===
      const lines = document.body.innerText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      const h1 = document.querySelector("h1");
      const title = h1?.textContent?.trim() ?? "Unknown";

      let subtitle: string | null = null;
      const titleIdx = lines.findIndex((l) => l === title);
      if (titleIdx >= 0) {
        const secondIdx = lines.indexOf(title, titleIdx + 1);
        const searchStart = secondIdx >= 0 ? secondIdx + 1 : titleIdx + 1;
        const nextLine = lines[searchStart];
        if (nextLine && !/^(Rating|Highest|Bestseller|Role Play|Hot & New|New)/.test(nextLine)) {
          subtitle = nextLine;
        }
      }

      let rating: number | null = null;
      const ratingLine = lines.find((l) => /^Rating:\s*[\d.]+\s*out\s*of/.test(l));
      if (ratingLine) { const m = ratingLine.match(/([\d.]+)\s*out/); if (m) rating = parseFloat(m[1]); }
      else { const ri = lines.findIndex((l) => /^\d\.\d$/.test(l)); if (ri >= 0) rating = parseFloat(lines[ri]); }

      let reviewCount: number | null = null;
      const rl = lines.find((l) => /\([\d,]+\s*rating/.test(l));
      if (rl) { const m = rl.match(/([\d,]+)\s*rating/); if (m) reviewCount = parseInt(m[1].replace(/,/g, ""), 10); }

      let enrolled: number | null = null;
      const el = lines.find((l) => /^[\d,]+\s*student/i.test(l));
      if (el) { const m = el.match(/([\d,]+)\s*student/i); if (m) enrolled = parseInt(m[1].replace(/,/g, ""), 10); }

      const ci = lines.findIndex((l) => l === "Created by");
      const instructors: string[] = ci >= 0 && lines[ci + 1] ? lines[ci + 1].split(",").map(s => s.trim()).filter(Boolean) : [];

      const updatedLine = lines.find((l) => /^Last updated/.test(l));
      let language = "English";
      if (updatedLine) { const ui = lines.indexOf(updatedLine); const ll = lines[ui + 1]; if (ll && /^[A-Z][a-z]+$/.test(ll)) language = ll; }

      const pl = lines.find((l) => /^(Free|(\$|€|£|₹|lei\s*)[\d,.]+)$/i.test(l));
      const isFree = pl ? /free/i.test(pl) : false;

      const li = lines.findIndex((l) => l === "What you'll learn");
      const whatYoullLearn: string[] = [];
      if (li >= 0) { for (let i = li + 1; i < lines.length; i++) { const line = lines[i]; if (/^(Explore related|Show more|Show less|Course content|Coding Exercises)/.test(line)) break; if (line.length > 10 && line.length < 300) whatYoullLearn.push(line); } }

      const coi = lines.findIndex((l) => l === "Course content");
      const curriculum: { section: string; lectures: number; duration: string }[] = [];
      let totalLectures: number | null = null;
      let totalDuration: string | null = null;
      if (coi >= 0) {
        const sl = lines[coi + 1];
        if (sl) { const lm = sl.match(/(\d+)\s*lecture/); if (lm) totalLectures = parseInt(lm[1], 10); const dm = sl.match(/([\dh\s]+\d+m)\s*total/); if (dm) totalDuration = dm[1].trim(); }
        for (let i = coi + 2; i < lines.length; i++) { const line = lines[i]; if (line === "Requirements" || line === "Description" || line === "Who this course is for:") break; if (line === "Expand all sections" || /^\d+ more section/.test(line)) continue; const st = lines[i + 1]; if (st && /^\d+\s*lecture/.test(st)) { const lm = st.match(/(\d+)\s*lecture/); const dm = st.match(/•\s*(.+)/); curriculum.push({ section: line, lectures: lm ? parseInt(lm[1], 10) : 0, duration: dm ? dm[1].trim() : "" }); i++; } }
      }

      const ri = lines.findIndex((l) => l === "Requirements");
      const requirements: string[] = [];
      if (ri >= 0) { for (let i = ri + 1; i < lines.length; i++) { const line = lines[i]; if (line === "Description" || line === "Who this course is for:" || line === "Show more") break; if (line.length > 5 && line.length < 300) requirements.push(line); } }

      const di = lines.findIndex((l, idx) => l === "Description" && idx > (coi || 0));
      let description: string | null = null;
      if (di >= 0) { const dl: string[] = []; for (let i = di + 1; i < lines.length; i++) { const line = lines[i]; if (line === "Who this course is for:" || line === "Show more" || line === "Show less") break; dl.push(line); } description = dl.join("\n").slice(0, 5000) || null; }
      if (!description) description = subtitle;

      const ti = lines.findIndex((l) => l === "Who this course is for:");
      const targetAudience: string[] = [];
      if (ti >= 0) { for (let i = ti + 1; i < lines.length; i++) { const line = lines[i]; if (/^(Show more|Show less|Students also|Report abuse|Privacy|By clicking)/.test(line)) break; if (line.length > 5 && line.length < 300) targetAudience.push(line); } }

      let level: string | null = null;
      const lvl = lines.find((l) => /^(Beginner|Intermediate|Advanced|All Levels)/i.test(l));
      if (lvl) level = lvl;

      let durationHours: number | null = null;
      const dur = lines.find((l) => /[\d.]+\s*total\s*hour/i.test(l));
      if (dur) { const m = dur.match(/([\d.]+)\s*total\s*hour/i); if (m) durationHours = parseFloat(m[1]); }
      else if (totalDuration) { const hm = totalDuration.match(/(\d+)h\s*(\d+)?m?/); if (hm) durationHours = parseInt(hm[1], 10) + (parseInt(hm[2] || "0", 10) / 60); }

      const ogImg = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
      const imageUrl = ogImg?.content ?? null;

      const relatedTopicSlugs = [...document.querySelectorAll("a")]
        .map((a) => a.href.match(/^https:\/\/www\.udemy\.com\/topic\/([a-z0-9-]+)/)?.[1])
        .filter((t): t is string => !!t)
        .filter((v, i, a) => a.indexOf(v) === i);

      return {
        course: { title, url: courseUrl, description, level, rating, reviewCount, durationHours, isFree, enrolled, imageUrl, language, metadata: { instructors, subtitle, price: pl ?? null, whatYoullLearn, requirements, targetAudience, curriculum, lastUpdated: updatedLine ?? null, totalLectures, totalDuration, discoveredFrom: "" } },
        relatedTopicSlugs,
      };
    }, url);

    if (!result || result.course.title === "Unknown" || result.course.title === "www.udemy.com") {
      return { course: null, relatedTopics: [] };
    }

    result.course.metadata.discoveredFrom = discoveredFrom;
    return { course: result.course as ScrapedCourse, relatedTopics: result.relatedTopicSlugs };
  } catch {
    return { course: null, relatedTopics: [] };
  } finally {
    await close();
  }
}

// ── DB upsert ────────────────────────────────────────────────────────

async function upsertCourse(course: ScrapedCourse) {
  const values = {
    title: course.title,
    url: course.url,
    provider: "Udemy" as const,
    description: course.description,
    level: course.level,
    rating: course.rating,
    reviewCount: course.reviewCount,
    durationHours: course.durationHours,
    isFree: course.isFree,
    enrolled: course.enrolled,
    imageUrl: course.imageUrl,
    language: course.language,
    metadata: course.metadata,
  };

  const [row] = await db
    .insert(externalCourses)
    .values(values)
    .onConflictDoUpdate({
      target: externalCourses.url,
      set: { ...values, updatedAt: new Date() },
    })
    .returning({ id: externalCourses.id });

  return row.id;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const discoveredUrls = new Map<string, string>(); // url → discovered-from topic
  const crawledTopics = new Set<string>();
  const topicQueue = [...SEED_TOPICS];

  // Phase 1: Crawl topic pages to discover course URLs
  console.log("Phase 1: Crawling topic pages for course discovery...\n");

  while (topicQueue.length > 0) {
    const topic = topicQueue.shift()!;
    if (crawledTopics.has(topic)) continue;
    crawledTopics.add(topic);

    process.stdout.write(`  /topic/${topic}/ ... `);
    const { courses, relatedTopics } = await crawlTopicPage(topic);
    console.log(`${courses.length} courses, ${relatedTopics.length} related topics`);

    for (const url of courses) {
      if (!discoveredUrls.has(url)) {
        discoveredUrls.set(url, topic);
      }
    }

    // Only follow related topics that seem relevant to vector DBs / RAG / embeddings
    const relevantTopicKeywords = [
      "vector", "embed", "rag", "retriev", "langchain", "llama", "pinecone",
      "chroma", "weaviate", "qdrant", "faiss", "search", "database", "ai-agent",
      "generative", "llm", "openai", "deep-learning", "nlp", "machine-learning",
    ];
    for (const rt of relatedTopics) {
      if (!crawledTopics.has(rt) && relevantTopicKeywords.some((kw) => rt.includes(kw))) {
        topicQueue.push(rt);
      }
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\nDiscovered ${discoveredUrls.size} unique courses from ${crawledTopics.size} topics\n`);

  if (discoveredUrls.size === 0) {
    console.log("No courses found — Cloudflare may be blocking topic pages.");
    return;
  }

  // Phase 2: Deep scrape each course
  console.log("Phase 2: Deep scraping courses...\n");
  let saved = 0;
  let skippedIrrelevant = 0;
  let blocked = 0;
  const courseEntries = [...discoveredUrls.entries()];

  for (const [i, [url, fromTopic]] of courseEntries.entries()) {
    const shortUrl = url.replace("https://www.udemy.com/course/", "").replace(/\/$/, "");
    console.log(`  [${i + 1}/${courseEntries.length}] ${shortUrl}`);

    const { course, relatedTopics } = await deepScrapeWithTopics(url, fromTopic);

    // Queue any new topics discovered from course pages
    for (const rt of relatedTopics) {
      if (!crawledTopics.has(rt)) {
        const relevantTopicKeywords = ["vector", "embed", "rag", "retriev", "langchain", "pinecone", "chroma", "weaviate", "qdrant", "faiss", "llm"];
        if (relevantTopicKeywords.some((kw) => rt.includes(kw))) {
          topicQueue.push(rt);
        }
      }
    }

    if (!course || course.title === "www.udemy.com") {
      console.log("    ✗ Cloudflare blocked");
      blocked++;
    } else if (!isRelevant(course)) {
      console.log(`    ✗ Not relevant: "${course.title}"`);
      skippedIrrelevant++;
    } else {
      const courseId = await upsertCourse(course);
      const slugs = matchSlugs(course);
      for (const { slug, relevance } of slugs) {
        await db.insert(lessonCourses).values({ lessonSlug: slug, courseId, relevance }).onConflictDoNothing();
      }

      console.log(`    ✓ "${course.title}"`);
      console.log(`      ${course.rating}★ (${course.reviewCount} reviews) · ${course.enrolled} students · ${course.durationHours}h`);
      console.log(`      by ${course.metadata.instructors.join(", ")} · ${course.metadata.curriculum.length} sections · ${course.metadata.whatYoullLearn.length} objectives`);
      console.log(`      → ${slugs.map((s) => `${s.slug}(${s.relevance})`).join(", ")}`);
      saved++;
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  // Phase 3: Crawl any newly discovered topics (from course pages)
  if (topicQueue.length > 0) {
    console.log(`\nPhase 3: Crawling ${topicQueue.length} newly discovered topics...\n`);
    const newUrls: [string, string][] = [];

    for (const topic of topicQueue) {
      if (crawledTopics.has(topic)) continue;
      crawledTopics.add(topic);

      process.stdout.write(`  /topic/${topic}/ ... `);
      const { courses } = await crawlTopicPage(topic);
      console.log(`${courses.length} courses`);

      for (const url of courses) {
        if (!discoveredUrls.has(url)) {
          discoveredUrls.set(url, topic);
          newUrls.push([url, topic]);
        }
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    if (newUrls.length > 0) {
      console.log(`\n  Deep scraping ${newUrls.length} newly discovered courses...\n`);
      for (const [j, [url, fromTopic]] of newUrls.entries()) {
        const shortUrl = url.replace("https://www.udemy.com/course/", "").replace(/\/$/, "");
        console.log(`  [${j + 1}/${newUrls.length}] ${shortUrl}`);

        const { course } = await deepScrapeWithTopics(url, fromTopic);

        if (!course || course.title === "www.udemy.com") {
          console.log("    ✗ Cloudflare blocked");
          blocked++;
        } else if (!isRelevant(course)) {
          console.log(`    ✗ Not relevant: "${course.title}"`);
          skippedIrrelevant++;
        } else {
          const courseId = await upsertCourse(course);
          const slugs = matchSlugs(course);
          for (const { slug, relevance } of slugs) {
            await db.insert(lessonCourses).values({ lessonSlug: slug, courseId, relevance }).onConflictDoNothing();
          }
          console.log(`    ✓ "${course.title}"`);
          console.log(`      ${course.rating}★ (${course.reviewCount} reviews) · ${course.enrolled} students · ${course.durationHours}h`);
          console.log(`      → ${slugs.map((s) => `${s.slug}(${s.relevance})`).join(", ")}`);
          saved++;
        }

        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Topics crawled:    ${crawledTopics.size}`);
  console.log(`Courses discovered: ${discoveredUrls.size}`);
  console.log(`Saved:             ${saved}`);
  console.log(`Skipped (irrelevant): ${skippedIrrelevant}`);
  console.log(`Blocked:           ${blocked}`);
  console.log("=".repeat(60));

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
