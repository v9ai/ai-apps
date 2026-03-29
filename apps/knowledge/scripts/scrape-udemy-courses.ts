/**
 * Scrape Udemy "vector databases" topic page + deep-scrape each course.
 * Run: pnpm scrape:udemy
 *
 * Uses Playwright Firefox to bypass Cloudflare bot detection.
 * Upserts into external_courses and maps to lesson slugs.
 */
import { webkit, type Page, type BrowserContext } from "playwright";
import { db } from "@/src/db";
import { externalCourses, lessonCourses } from "@/src/db/schema";

const TOPIC_URL = "https://www.udemy.com/topic/vector-databases/";
const DELAY_MS = 3000;
const MAX_RETRIES = 1;

const BROWSER_OPTS = {
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  viewport: { width: 1440 as const, height: 900 as const },
  locale: "en-US" as const,
};

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

  // Every course from this topic page maps to vector-databases at minimum
  if (!matches.find((m) => m.slug === "vector-databases")) {
    matches.push({ slug: "vector-databases", relevance: 0.5 });
  }

  return matches;
}

// ── Phase 1: Scrape topic listing ────────────────────────────────────

async function scrapeTopicPage(page: Page): Promise<string[]> {
  await page.goto(TOPIC_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(8000);

  // Dismiss cookie banner
  await page
    .click('[id*="onetrust-accept"], button:has-text("Accept")')
    .catch(() => {});

  // Scroll to load all courses
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
  }

  // Extract unique course URLs
  const urls = await page.evaluate(() => {
    const links = document.querySelectorAll("a");
    const urlSet = new Set<string>();
    links.forEach((a) => {
      const match = a.href.match(/(https:\/\/www\.udemy\.com\/course\/[^/?#]+)/);
      if (match) urlSet.add(match[1] + "/");
    });
    return [...urlSet];
  });

  return urls;
}

// ── Phase 2: Deep scrape each course page ────────────────────────────
// Uses innerText parsing — more resilient than DOM selectors on Udemy's
// frequently-changing React component class names.

async function scrapeCoursePage(page: Page, url: string): Promise<ScrapedCourse | null> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("h1", { timeout: 15000 });
  await page.waitForTimeout(5000);

  // Scroll to load lazy sections
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
  }

  // Expand "Show more" buttons for description / curriculum
  const expandBtns = page.locator('button:has-text("Show more"), button:has-text("Expand all sections")');
  const btnCount = await expandBtns.count();
  for (let i = 0; i < Math.min(btnCount, 10); i++) {
    await expandBtns.nth(i).click().catch(() => {});
    await page.waitForTimeout(500);
  }

  const data = await page.evaluate((courseUrl: string) => {
    const bodyText = document.body.innerText;
    const lines = bodyText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    // ── Title ──
    const h1 = document.querySelector("h1");
    const title = h1?.textContent?.trim() ?? "Unknown";

    // ── Subtitle (line after the duplicate title, before "Highest Rated" / "Bestseller" / "Rating:") ──
    let subtitle: string | null = null;
    const titleIdx = lines.findIndex((l) => l === title);
    if (titleIdx >= 0) {
      // Find next occurrence (the lead section shows title twice)
      const secondIdx = lines.indexOf(title, titleIdx + 1);
      const searchStart = secondIdx >= 0 ? secondIdx + 1 : titleIdx + 1;
      const nextLine = lines[searchStart];
      if (nextLine && !nextLine.startsWith("Rating") && !nextLine.startsWith("Highest") && !nextLine.startsWith("Bestseller")) {
        subtitle = nextLine;
      }
    }

    // ── Rating ──
    let rating: number | null = null;
    const ratingLine = lines.find((l) => /^Rating:\s*[\d.]+\s*out\s*of/.test(l));
    if (ratingLine) {
      const m = ratingLine.match(/([\d.]+)\s*out/);
      if (m) rating = parseFloat(m[1]);
    } else {
      // Fallback: standalone "4.5" line near "rating"
      const ratingIdx = lines.findIndex((l) => /^\d\.\d$/.test(l));
      if (ratingIdx >= 0) rating = parseFloat(lines[ratingIdx]);
    }

    // ── Review count ──
    let reviewCount: number | null = null;
    const reviewLine = lines.find((l) => /\([\d,]+\s*rating/.test(l));
    if (reviewLine) {
      const m = reviewLine.match(/([\d,]+)\s*rating/);
      if (m) reviewCount = parseInt(m[1].replace(/,/g, ""), 10);
    }

    // ── Enrolled ──
    let enrolled: number | null = null;
    const enrolledLine = lines.find((l) => /^[\d,]+\s*student/i.test(l));
    if (enrolledLine) {
      const m = enrolledLine.match(/([\d,]+)\s*student/i);
      if (m) enrolled = parseInt(m[1].replace(/,/g, ""), 10);
    }

    // ── Instructors ──
    const createdIdx = lines.findIndex((l) => l === "Created by");
    const instructors: string[] = [];
    if (createdIdx >= 0 && lines[createdIdx + 1]) {
      instructors.push(...lines[createdIdx + 1].split(",").map((s) => s.trim()).filter(Boolean));
    }

    // ── Last updated ──
    const updatedLine = lines.find((l) => /^Last updated/.test(l));
    const lastUpdated = updatedLine ?? null;

    // ── Language ──
    let language = "English";
    if (updatedLine) {
      const updIdx = lines.indexOf(updatedLine);
      const langLine = lines[updIdx + 1];
      if (langLine && /^[A-Z][a-z]+$/.test(langLine)) language = langLine;
    }

    // ── Price ──
    // Look for price patterns like "$19.99", "₹449", "Free", "lei 49.99"
    const priceLine = lines.find((l) => /^(Free|(\$|€|£|₹|lei\s*)[\d,.]+)$/i.test(l));
    const price = priceLine ?? null;
    const isFree = price ? /free/i.test(price) : false;

    // ── What you'll learn ──
    const learnIdx = lines.findIndex((l) => l === "What you'll learn");
    const whatYoullLearn: string[] = [];
    if (learnIdx >= 0) {
      for (let i = learnIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line === "Explore related topics" || line === "Show more" || line === "Show less" || line === "Course content") break;
        if (line.length > 10 && line.length < 300) whatYoullLearn.push(line);
      }
    }

    // ── Course content / Curriculum ──
    const contentIdx = lines.findIndex((l) => l === "Course content");
    const curriculum: { section: string; lectures: number; duration: string }[] = [];
    let totalLectures: number | null = null;
    let totalDuration: string | null = null;
    if (contentIdx >= 0) {
      // Summary line like "8 sections • 43 lectures • 7h 16m total length"
      const summaryLine = lines[contentIdx + 1];
      if (summaryLine) {
        const lm = summaryLine.match(/(\d+)\s*lecture/);
        if (lm) totalLectures = parseInt(lm[1], 10);
        const dm = summaryLine.match(/([\dh\s]+\d+m)\s*total/);
        if (dm) totalDuration = dm[1].trim();
      }

      // Parse sections — pattern: "SectionName\nN lectures • Xmin/Xhr"
      for (let i = contentIdx + 2; i < lines.length; i++) {
        const line = lines[i];
        if (line === "Requirements" || line === "Description" || line === "Who this course is for:") break;
        if (line === "Expand all sections") continue;
        // Check if next line is "N lectures • duration"
        const statsLine = lines[i + 1];
        if (statsLine && /^\d+\s*lecture/.test(statsLine)) {
          const lm = statsLine.match(/(\d+)\s*lecture/);
          const dm = statsLine.match(/•\s*(.+)/);
          curriculum.push({
            section: line,
            lectures: lm ? parseInt(lm[1], 10) : 0,
            duration: dm ? dm[1].trim() : "",
          });
          i++; // skip stats line
        }
      }
    }

    // ── Requirements ──
    const reqIdx = lines.findIndex((l) => l === "Requirements");
    const requirements: string[] = [];
    if (reqIdx >= 0) {
      for (let i = reqIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line === "Description" || line === "Who this course is for:" || line === "Show more") break;
        if (line.length > 5 && line.length < 300) requirements.push(line);
      }
    }

    // ── Description ──
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

    // ── Target audience ──
    const targetIdx = lines.findIndex((l) => l === "Who this course is for:");
    const targetAudience: string[] = [];
    if (targetIdx >= 0) {
      for (let i = targetIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line === "Show more" || line === "Show less" || line === "Students also bought" || line.startsWith("Privacy")) break;
        if (line.length > 5 && line.length < 300) targetAudience.push(line);
      }
    }

    // ── Level ──
    let level: string | null = null;
    const levelLine = lines.find((l) => /^(Beginner|Intermediate|Advanced|All Levels)/i.test(l));
    if (levelLine) level = levelLine;

    // ── Duration hours ──
    let durationHours: number | null = null;
    const durLine = lines.find((l) => /[\d.]+\s*total\s*hour/i.test(l));
    if (durLine) {
      const m = durLine.match(/([\d.]+)\s*total\s*hour/i);
      if (m) durationHours = parseFloat(m[1]);
    } else if (totalDuration) {
      // Parse "7h 16m" format
      const hm = totalDuration.match(/(\d+)h\s*(\d+)?m?/);
      if (hm) durationHours = parseInt(hm[1], 10) + (parseInt(hm[2] || "0", 10) / 60);
    }

    // ── Image ──
    const ogImg = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
    const imageUrl = ogImg?.content ?? null;

    return {
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
      },
    };
  }, url);

  if (!data || !data.title || data.title === "Unknown") return null;
  return data as ScrapedCourse;
}

// ── Phase 3: DB upsert ───────────────────────────────────────────────

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

/** Launch a fresh browser+context — Cloudflare tracks sessions, so one per course. */
async function freshContext(): Promise<{ context: BrowserContext; close: () => Promise<void> }> {
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext(BROWSER_OPTS);
  return { context, close: () => browser.close() };
}

async function main() {
  // Phase 1: Get course URLs from topic page
  console.log("Phase 1: Scraping topic listing...");
  const { context: topicCtx, close: closeTopicBrowser } = await freshContext();
  const topicPage = await topicCtx.newPage();
  let courseUrls: string[];
  try {
    courseUrls = await scrapeTopicPage(topicPage);
    console.log(`Found ${courseUrls.length} courses\n`);
    if (courseUrls.length === 0) {
      console.log("No courses found — Cloudflare may have blocked the request.");
      console.log("Page title:", await topicPage.title());
      return;
    }
  } finally {
    await closeTopicBrowser();
  }

  // Phase 2: Deep scrape each course in a FRESH browser (bypasses Cloudflare session tracking)
  console.log("Phase 2: Deep scraping + saving...\n");
  let success = 0;
  let failed = 0;

  for (const [i, url] of courseUrls.entries()) {
    const shortUrl = url.replace("https://www.udemy.com/course/", "").replace(/\/$/, "");
    console.log(`  [${i + 1}/${courseUrls.length}] ${shortUrl}`);

    let course: ScrapedCourse | null = null;
    const { context: courseCtx, close: closeCourseBrowser } = await freshContext();

    try {
      const coursePage = await courseCtx.newPage();
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          course = await scrapeCoursePage(coursePage, url);
          break;
        } catch (err: unknown) {
          if (attempt === MAX_RETRIES) {
            console.error(`    FAILED: ${err instanceof Error ? err.message : err}`);
          } else {
            await coursePage.waitForTimeout(5000);
          }
        }
      }
    } finally {
      await closeCourseBrowser();
    }

    if (course && course.title !== "www.udemy.com") {
      const courseId = await upsertCourse(course);
      const slugs = matchSlugs(course);
      for (const { slug, relevance } of slugs) {
        await db
          .insert(lessonCourses)
          .values({ lessonSlug: slug, courseId, relevance })
          .onConflictDoNothing();
      }

      console.log(`    "${course.title}"`);
      console.log(`    rating=${course.rating} reviews=${course.reviewCount} enrolled=${course.enrolled}`);
      console.log(`    duration=${course.durationHours}h level=${course.level}`);
      console.log(`    instructors: ${course.metadata.instructors.join(", ")}`);
      console.log(`    what you'll learn: ${course.metadata.whatYoullLearn.length} items`);
      console.log(`    curriculum: ${course.metadata.curriculum.length} sections`);
      console.log(`    → slugs: ${slugs.map((s) => `${s.slug}(${s.relevance})`).join(", ")}`);
      success++;
    } else {
      console.log("    Cloudflare blocked");
      failed++;
    }

    // Polite delay between fresh browsers
    if (i < courseUrls.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\nDone. ${success} saved, ${failed} failed.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
