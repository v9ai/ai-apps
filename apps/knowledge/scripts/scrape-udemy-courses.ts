/**
 * Scrape Udemy "vector databases" topic page + deep-scrape each course.
 * Run: pnpm scrape:udemy
 *
 * Uses Playwright to bypass Udemy's SPA/403 protection.
 * Upserts into external_courses and maps to lesson slugs.
 */
import { chromium, type Page } from "playwright";
import { db } from "@/src/db";
import { externalCourses, lessonCourses } from "@/src/db/schema";

const TOPIC_URL = "https://www.udemy.com/topic/vector-databases/";
const DELAY_MS = 2500; // polite delay between course page visits
const MAX_RETRIES = 2;

// ── Types ────────────────────────────────────────────────────────────

interface CourseMetadata {
  instructors: string[];
  subtitle: string | null;
  price: string | null;
  whatYoullLearn: string[];
  requirements: string[];
  curriculum: { section: string; lectures: number; duration: string }[];
  lastUpdated: string | null;
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
  await page.goto(TOPIC_URL, { waitUntil: "networkidle", timeout: 30000 });

  // Dismiss cookie banner
  await page
    .click('[data-purpose="accept-cookies"], [id*="onetrust-accept"], button:has-text("Accept")')
    .catch(() => {});

  // Wait for course cards
  await page.waitForSelector('a[href*="/course/"]', { timeout: 15000 });

  // Scroll + "Show more" to load all courses
  let previousCount = 0;
  let stableRounds = 0;
  while (stableRounds < 3) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);

    const showMore = page.locator(
      'button:has-text("Show more"), [data-purpose="show-more"]',
    );
    if (await showMore.isVisible().catch(() => false)) {
      await showMore.click();
      await page.waitForTimeout(2000);
    }

    const currentCount = await page.locator('a[href*="/course/"]').count();
    if (currentCount === previousCount) stableRounds++;
    else stableRounds = 0;
    previousCount = currentCount;
  }

  // Extract unique course URLs
  const urls = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/course/"]');
    const urlSet = new Set<string>();
    links.forEach((a) => {
      const href = (a as HTMLAnchorElement).href;
      const match = href.match(/(https:\/\/www\.udemy\.com\/course\/[^/?#]+)/);
      if (match) urlSet.add(match[1] + "/");
    });
    return [...urlSet];
  });

  return urls;
}

// ── Phase 2: Deep scrape each course page ────────────────────────────

async function scrapeCoursePage(page: Page, url: string): Promise<ScrapedCourse | null> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("h1", { timeout: 15000 });

  // Expand description / curriculum sections
  const expandButtons = page.locator(
    '[data-purpose="show-more"] button, button:has-text("Show more"), button[data-purpose="expand-toggle"]',
  );
  const btnCount = await expandButtons.count();
  for (let i = 0; i < Math.min(btnCount, 10); i++) {
    await expandButtons.nth(i).click().catch(() => {});
    await page.waitForTimeout(300);
  }

  // Extract all data in one evaluate call
  const data = await page.evaluate((courseUrl: string) => {
    const $ = (sel: string) => document.querySelector(sel);
    const $$ = (sel: string) => [...document.querySelectorAll(sel)];
    const text = (sel: string) => $(sel)?.textContent?.trim() ?? null;
    const parseNum = (s: string | null) => {
      if (!s) return null;
      const cleaned = s.replace(/[^0-9.]/g, "");
      const n = parseFloat(cleaned);
      return isNaN(n) ? null : n;
    };

    // Title
    const title =
      text('[data-purpose="lead-title"]') ??
      text("h1") ??
      "Unknown";

    // Subtitle
    const subtitle =
      text('[data-purpose="lead-headline"]') ??
      text('[class*="clp-lead__headline"]') ??
      null;

    // Rating
    const ratingText =
      text('[data-purpose="rating-number"]') ??
      text('[class*="star-rating--rating-number"]');
    const rating = parseNum(ratingText);

    // Review count — look for text like "(12,345 ratings)"
    let reviewCount: number | null = null;
    const ratingEl = $('[data-purpose="rating-number"]') ?? $('[class*="star-rating--rating-number"]');
    if (ratingEl?.parentElement) {
      const siblings = ratingEl.parentElement.textContent ?? "";
      const rMatch = siblings.match(/([\d,]+)\s*rating/i);
      if (rMatch) reviewCount = parseInt(rMatch[1].replace(/,/g, ""), 10);
    }

    // Enrolled students
    let enrolled: number | null = null;
    const enrolledEl = $$("*").find((el) =>
      el.textContent?.match(/[\d,]+\s*student/i) && el.children.length === 0,
    );
    if (enrolledEl) {
      const eMatch = enrolledEl.textContent!.match(/([\d,]+)\s*student/i);
      if (eMatch) enrolled = parseInt(eMatch[1].replace(/,/g, ""), 10);
    }

    // Price
    const priceText =
      text('[data-purpose="course-price-text"] span') ??
      text('[data-purpose="buy-this-course-button"]') ??
      text('[class*="base-price"]') ??
      null;
    const isFree = !!(priceText && /free/i.test(priceText));

    // Level
    const levelEl = $$("*").find((el) =>
      /^(beginner|intermediate|advanced|all levels)/i.test(el.textContent?.trim() ?? "") &&
      el.children.length === 0,
    );
    const level = levelEl?.textContent?.trim() ?? null;

    // Duration — look for "X total hours"
    let durationHours: number | null = null;
    const durationEl = $$("*").find((el) =>
      /[\d.]+\s*total\s*hour/i.test(el.textContent ?? "") && el.children.length === 0,
    );
    if (durationEl) {
      const dMatch = durationEl.textContent!.match(/([\d.]+)\s*total\s*hour/i);
      if (dMatch) durationHours = parseFloat(dMatch[1]);
    }

    // Description
    const description =
      text('[data-purpose="safely-set-inner-html:description"]') ??
      text('[class*="clp-lead__element-text"]') ??
      text('[data-purpose="course-description"]') ??
      subtitle;

    // What you'll learn
    const whatYoullLearn = $$('[data-purpose="objective-text"], [class*="what-you-will-learn"] li span')
      .map((el) => el.textContent?.trim())
      .filter(Boolean) as string[];

    // Requirements
    const requirements = $$(
      '[data-purpose="requirements"] li, [class*="requirement"] li',
    )
      .map((el) => el.textContent?.trim())
      .filter(Boolean) as string[];

    // Curriculum sections
    const curriculum: { section: string; lectures: number; duration: string }[] = [];
    const sections = $$('[data-purpose="curriculum-section-container"], [class*="section--section"]');
    for (const sec of sections) {
      const sectionTitle = sec.querySelector('[class*="section-title"], span')?.textContent?.trim() ?? "";
      const statsText = sec.textContent ?? "";
      const lectureMatch = statsText.match(/(\d+)\s*lecture/i);
      const durationMatch = statsText.match(/(\d+h?\s*\d*m?(?:in)?)/i);
      curriculum.push({
        section: sectionTitle,
        lectures: lectureMatch ? parseInt(lectureMatch[1], 10) : 0,
        duration: durationMatch ? durationMatch[1] : "",
      });
    }

    // Instructors
    const instructors = $$(
      '[data-purpose="instructor-name-top"] a, [class*="instructor"] a[href*="/user/"]',
    )
      .map((el) => el.textContent?.trim())
      .filter(Boolean) as string[];

    // Image
    const imageUrl =
      ($ ('meta[property="og:image"]') as HTMLMetaElement | null)?.content ??
      ($$("img").find((img) =>
        (img as HTMLImageElement).src?.includes("img-c/course"),
      ) as HTMLImageElement | null)?.src ??
      null;

    // Language
    const langMeta = ($('meta[property="og:locale"]') as HTMLMetaElement | null)?.content;
    const language = langMeta ? (langMeta.startsWith("en") ? "English" : langMeta) : "English";

    // Last updated
    const lastUpdated = $$("*")
      .find((el) => /last updated/i.test(el.textContent ?? "") && el.children.length === 0)
      ?.textContent?.trim() ?? null;

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
        price: priceText,
        whatYoullLearn,
        requirements,
        curriculum,
        lastUpdated,
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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    // Phase 1
    console.log("Phase 1: Scraping topic listing...");
    const courseUrls = await scrapeTopicPage(page);
    console.log(`Found ${courseUrls.length} courses\n`);

    if (courseUrls.length === 0) {
      console.log("No courses found. The page structure may have changed.");
      console.log("Dumping page title for debugging:");
      console.log(await page.title());
      return;
    }

    // Phase 2 + 3
    console.log("Phase 2: Deep scraping + saving...\n");
    let success = 0;
    let failed = 0;

    for (const [i, url] of courseUrls.entries()) {
      const shortUrl = url.replace("https://www.udemy.com/course/", "").replace(/\/$/, "");
      console.log(`  [${i + 1}/${courseUrls.length}] ${shortUrl}`);

      let course: ScrapedCourse | null = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          course = await scrapeCoursePage(page, url);
          break;
        } catch (err: unknown) {
          if (attempt === MAX_RETRIES) {
            console.error(`    FAILED: ${err instanceof Error ? err.message : err}`);
          } else {
            await page.waitForTimeout(3000);
          }
        }
      }

      if (course) {
        const courseId = await upsertCourse(course);
        const slugs = matchSlugs(course);
        for (const { slug, relevance } of slugs) {
          await db
            .insert(lessonCourses)
            .values({ lessonSlug: slug, courseId, relevance })
            .onConflictDoNothing();
        }
        console.log(
          `    "${course.title}" → ${slugs.map((s) => s.slug).join(", ")}`,
        );
        success++;
      } else {
        failed++;
      }

      await page.waitForTimeout(DELAY_MS);
    }

    console.log(`\nDone. ${success} saved, ${failed} failed.`);
  } finally {
    await browser.close();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
