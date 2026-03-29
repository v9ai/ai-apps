#!/usr/bin/env npx tsx
/**
 * Scrape Udemy courses using Playwright (bypasses Cloudflare).
 *
 * Usage:
 *   # Scrape all courses from a topic page:
 *   npx tsx scripts/scrape-udemy.ts https://www.udemy.com/topic/vector-databases/
 *
 *   # Scrape specific course pages:
 *   npx tsx scripts/scrape-udemy.ts https://www.udemy.com/course/langchain/
 *
 *   # Override output path:
 *   npx tsx scripts/scrape-udemy.ts --out ./my-courses.json https://www.udemy.com/topic/vector-databases/
 *
 * Output JSON is consumed by: cargo run --bin scrape-courses -- --json data/courses.json
 */

import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

interface Course {
  course_id: string;
  title: string;
  url: string;
  description: string;
  instructor: string;
  level: string;
  rating: number;
  review_count: number;
  num_students: number;
  duration_hours: number;
  price: string;
  language: string;
  category: string;
  image_url: string;
  topics_json: string;
}

// ── CLI args ────────────────────────────────────────────────────────────

const cliArgs = process.argv.slice(2);
const scriptDir = dirname(new URL(import.meta.url).pathname);
let outPath = resolve(scriptDir, "../data/courses.json");
const urls: string[] = [];

for (let i = 0; i < cliArgs.length; i++) {
  if (cliArgs[i] === "--out" && cliArgs[i + 1]) {
    outPath = cliArgs[++i];
  } else if (cliArgs[i].startsWith("http")) {
    urls.push(cliArgs[i]);
  }
}

if (urls.length === 0) {
  console.error("Usage: npx tsx scripts/scrape-udemy.ts [--out path.json] <url...>");
  process.exit(1);
}

// ── HTML parsing helpers (runs in Node.js, not browser) ─────────────────

function extractMeta(html: string, name: string): string {
  // Match property="name" or name="name"
  for (const attr of ["property", "name"]) {
    const re = new RegExp(`<meta[^>]+${attr}="${name}"[^>]+content="([^"]*)"`, "i");
    const match = html.match(re);
    if (match?.[1]) return match[1].trim();
    // Try reversed attribute order
    const re2 = new RegExp(`<meta[^>]+content="([^"]*)"[^>]+${attr}="${name}"`, "i");
    const match2 = html.match(re2);
    if (match2?.[1]) return match2[1].trim();
  }
  return "";
}

function extractJsonLd(html: string): any {
  const re = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      // Direct Course object
      if (data?.["@type"] === "Course") return data;
      // @graph wrapper (Udemy's format)
      if (data?.["@graph"] && Array.isArray(data["@graph"])) {
        const found = data["@graph"].find((d: any) => d["@type"] === "Course");
        if (found) return found;
      }
      // Plain array
      if (Array.isArray(data)) {
        const found = data.find((d: any) => d["@type"] === "Course");
        if (found) return found;
      }
      // Fallback: has a name
      if (data?.name) return data;
    } catch {}
  }
  return null;
}

function parseCourseHtml(html: string, pageUrl: string): Course {
  const jsonld = extractJsonLd(html);
  const slug = pageUrl.replace(/\/$/, "").split("/").pop() || "unknown";

  const title =
    jsonld?.name ||
    extractMeta(html, "og:title") ||
    (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "").trim()) ||
    slug;

  const description =
    jsonld?.description ||
    extractMeta(html, "og:description") ||
    extractMeta(html, "description") ||
    "";

  // Rating
  const rating = Number(jsonld?.aggregateRating?.ratingValue) || 0;
  const review_count =
    Number(jsonld?.aggregateRating?.reviewCount || jsonld?.aggregateRating?.ratingCount) || 0;

  // Instructor — Udemy uses "author" in JSON-LD, with "instructor" inside hasCourseInstance
  let instructor = "";
  const instrSource = jsonld?.author || jsonld?.instructor || jsonld?.hasCourseInstance?.instructor;
  if (instrSource) {
    if (Array.isArray(instrSource)) {
      instructor = instrSource.map((i: any) => i.name).filter(Boolean).join(", ");
    } else if (instrSource?.name) {
      instructor = instrSource.name;
    }
  }

  // Image
  const image_url = jsonld?.image || extractMeta(html, "og:image") || "";

  // Language
  const language = jsonld?.inLanguage || "English";

  // Category — from JSON-LD "about" or meta tag
  const aboutName = jsonld?.about?.name;
  const category =
    (Array.isArray(aboutName) ? aboutName[0] : aboutName) ||
    extractMeta(html, "udemy_com:category") ||
    "";

  // Level — prefer JSON-LD educationalLevel, fallback to text scan
  const lower = html.toLowerCase();
  let level = jsonld?.educationalLevel || "";
  if (!level) {
    if (lower.includes("all levels")) level = "All Levels";
    else if (lower.includes("beginner level")) level = "Beginner";
    else if (lower.includes("intermediate level")) level = "Intermediate";
    else if (lower.includes("advanced level")) level = "Advanced";
    else level = "All Levels";
  }

  // Duration — parse ISO 8601 courseWorkload (e.g. "PT7H16M"), fallback to text
  let duration_hours = 0;
  const workload = jsonld?.hasCourseInstance?.courseWorkload || "";
  const isoMatch = workload.match(/PT(\d+)H(?:(\d+)M)?/);
  if (isoMatch) {
    duration_hours = parseInt(isoMatch[1], 10) + (parseInt(isoMatch[2] || "0", 10) / 60);
    duration_hours = Math.round(duration_hours * 10) / 10;
  }
  if (!duration_hours) {
    const durationMatch = lower.match(/([\d.]+)\s*(?:total\s+)?hours?\s+(?:of\s+)?(?:video|on-demand)/);
    if (durationMatch) duration_hours = parseFloat(durationMatch[1]) || 0;
  }

  // Price
  let price = extractMeta(html, "udemy_com:price") || extractMeta(html, "product:price:amount") || "";
  if (price && !price.startsWith("$") && !price.startsWith("€")) {
    const curr = extractMeta(html, "product:price:currency") || "USD";
    price = `${price} ${curr}`;
  }

  // Students
  let num_students = 0;
  const studentsMatch = lower.match(/([\d,]+)\s+students/);
  if (studentsMatch) {
    num_students = parseInt(studentsMatch[1].replace(/,/g, ""), 10) || 0;
  }

  // Topics — parse "What you'll learn" list items
  const topics: string[] = [];
  // Look for objective spans
  const objRe = /data-purpose="objective"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/gi;
  let objMatch;
  while ((objMatch = objRe.exec(html)) !== null) {
    const text = objMatch[1].replace(/<[^>]+>/g, "").trim();
    if (text) topics.push(text);
  }

  return {
    course_id: slug,
    title,
    url: pageUrl,
    description,
    instructor,
    level,
    rating,
    review_count,
    num_students,
    duration_hours,
    price,
    language,
    category,
    image_url,
    topics_json: JSON.stringify(topics),
  };
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "en-US",
  });

  const allCourses: Course[] = [];

  // Collect all course URLs to scrape
  const courseUrls: string[] = [];

  for (const url of urls) {
    if (url.includes("/topic/")) {
      console.log(`Topic page: ${url}`);
      const found = await extractCourseUrls(context, url);
      console.log(`  Found ${found.length} course URLs`);
      courseUrls.push(...found);
    } else if (url.includes("/course/")) {
      courseUrls.push(url);
    } else {
      console.warn(`Skipping unrecognized URL: ${url}`);
    }
  }

  // Scrape each course in its own fresh context (Cloudflare challenge resolves
  // per-context for individual course pages in headless mode)
  for (const courseUrl of courseUrls) {
    const freshCtx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      locale: "en-US",
    });
    const course = await scrapeCourse(freshCtx, courseUrl);
    if (course) allCourses.push(course);
    await freshCtx.close();
    await sleep(2000);
  }

  await browser.close();

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(allCourses, null, 2));
  console.log(`\nWrote ${allCourses.length} courses to ${outPath}`);
}

// ── Topic page: extract course links ────────────────────────────────────

async function extractCourseUrls(context: any, topicUrl: string): Promise<string[]> {
  const page = await context.newPage();
  try {
    await page.goto(topicUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    // Wait for Cloudflare challenge to resolve, then course links to appear
    await page.waitForSelector('a[href*="/course/"]', { timeout: 30000 }).catch(() => {});

    // Scroll to load more
    for (let i = 0; i < 3; i++) {
      await page.evaluate("window.scrollBy(0, window.innerHeight)");
      await sleep(1000);
    }

    const html: string = await page.content();
    if (process.env.DEBUG) {
      writeFileSync("/tmp/udemy-topic-debug.html", html);
      console.log(`    [debug] Topic HTML dumped (${html.length} bytes)`);
    }
    const re = /href="(\/course\/[\w-]+\/?)" /gi;
    const set = new Set<string>();
    let m;
    while ((m = re.exec(html)) !== null) {
      set.add(`https://www.udemy.com${m[1].replace(/\/$/, "/")}`);
    }
    // Also catch full URLs
    const re2 = /href="(https:\/\/www\.udemy\.com\/course\/[\w-]+\/?)" /gi;
    while ((m = re2.exec(html)) !== null) {
      set.add(m[1].replace(/\/$/, "/"));
    }

    return [...set];
  } finally {
    await page.close();
  }
}

// ── Single course page ──────────────────────────────────────────────────

async function scrapeCourse(context: any, url: string): Promise<Course | null> {
  const page = await context.newPage();
  try {
    console.log(`  Scraping: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    // Wait for Cloudflare challenge to resolve
    for (let attempt = 0; attempt < 20; attempt++) {
      const title = await page.title();
      if (title && !title.includes("Just a moment") && title !== "www.udemy.com") {
        break;
      }
      await sleep(1000);
    }
    // Extra settle time for hydration
    await sleep(2000);

    const html: string = await page.content();
    // Debug: dump first course HTML to diagnose Cloudflare
    if (process.env.DEBUG) {
      writeFileSync("/tmp/udemy-debug.html", html);
      console.log(`    [debug] HTML dumped to /tmp/udemy-debug.html (${html.length} bytes)`);
    }
    const course = parseCourseHtml(html, url);

    console.log(`    ✓ ${course.title} — ${course.rating}★ (${course.review_count} reviews)`);
    return course;
  } catch (err: any) {
    console.error(`    ✗ ${url}: ${err.message}`);
    return null;
  } finally {
    await page.close();
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
