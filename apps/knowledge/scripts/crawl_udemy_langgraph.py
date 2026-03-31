#!/usr/bin/env python3
"""
Crawl all LangGraph courses on Udemy: metadata, curriculum, and reviews.
Uses Playwright with stealth to bypass Cloudflare, cookie-authenticated API.
Saves everything to a local SQLite database.

Strategy:
  1. Known course slugs from web search (Cloudflare blocks discovery)
  2. Open each course page in headed browser (passes Cloudflare after first challenge)
  3. Use browser-context fetch() for API calls (curriculum, reviews) with real cookies
"""

import json
import sqlite3
import time
import re
import os
from datetime import datetime

from playwright.sync_api import sync_playwright, Page

DB_PATH = "data/udemy_langgraph.db"

# All LangGraph course slugs discovered via web search
COURSE_SLUGS = [
    "langgraph",
    "complete-agentic-ai-bootcamp-with-langgraph-and-langchain",
    "langchain",
    "the-complete-langchain-langgraph-langsmith-course",
    "ultimate-rag-bootcamp-using-langchainlanggraph-langsmith",
    "agentic-ai-private-agentic-rag-with-langgraph-and-ollama",
    "production-ai-agents-with-javascript-langchain-langgraph",
    "langgraph-ai-agents-agentic-rag-multi-agent-systems",
    "langgraph-for-beginners",
    "langgraph-with-ollama",
    "langgraph-from-basics-to-advanced-ai-agents-with-llms",
    "langgraph-mastery-develop-llm-agents-with-langgraph",
    "langgraph-in-action-develop-advanced-ai-agents-with-llms",
    "ai-agents",
    "agentic-rag-with-langchain-and-langgraph",
]


def init_db(conn: sqlite3.Connection):
    conn.executescript("""
        DROP TABLE IF EXISTS reviews;
        DROP TABLE IF EXISTS curriculum;
        DROP TABLE IF EXISTS courses;

        CREATE TABLE courses (
            id              INTEGER PRIMARY KEY,
            title           TEXT,
            slug            TEXT UNIQUE,
            url             TEXT,
            headline        TEXT,
            description     TEXT,
            price           TEXT,
            num_subscribers INTEGER,
            avg_rating      REAL,
            num_reviews     INTEGER,
            num_lectures    INTEGER,
            content_length  TEXT,
            level           TEXT,
            category        TEXT,
            subcategory     TEXT,
            language        TEXT,
            instructor_name TEXT,
            instructor_url  TEXT,
            created         TEXT,
            last_updated    TEXT,
            image_url       TEXT,
            what_you_learn  TEXT,
            requirements    TEXT,
            target_audience TEXT,
            raw_json        TEXT,
            crawled_at      TEXT
        );

        CREATE TABLE curriculum (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id   INTEGER NOT NULL,
            section_idx INTEGER,
            section_title TEXT,
            item_idx    INTEGER,
            item_type   TEXT,
            title       TEXT,
            duration    TEXT,
            is_free     INTEGER DEFAULT 0,
            FOREIGN KEY (course_id) REFERENCES courses(id)
        );

        CREATE TABLE reviews (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id   INTEGER NOT NULL,
            rating      REAL,
            content     TEXT,
            author      TEXT,
            created     TEXT,
            helpful     INTEGER DEFAULT 0,
            FOREIGN KEY (course_id) REFERENCES courses(id)
        );
    """)
    conn.commit()


def wait_for_cloudflare(page: Page, timeout: int = 30):
    """Wait for Cloudflare challenge to resolve."""
    start = time.time()
    while time.time() - start < timeout:
        title = page.title()
        url = page.url
        # Check if we're past Cloudflare
        if "Just a moment" not in title and "challenge" not in url and "cloudflare" not in title.lower():
            return True
        time.sleep(1)
    return False


def extract_course_data(page: Page, slug: str):
    """Extract all course data from a loaded course page."""
    data = {
        "slug": slug,
        "url": f"https://www.udemy.com/course/{slug}/",
    }

    # Try JSON-LD first (most reliable)
    ld = page.evaluate("""() => {
        for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
            try {
                const d = JSON.parse(s.textContent);
                if (d['@type'] === 'Course') return d;
                if (Array.isArray(d)) {
                    const c = d.find(i => i['@type'] === 'Course');
                    if (c) return c;
                }
            } catch(e) {}
        }
        return null;
    }""")

    if ld:
        agg = ld.get("aggregateRating", {})
        creator = ld.get("creator", [])
        if isinstance(creator, list):
            creator = creator[0] if creator else {}
        data.update({
            "title": ld.get("name", ""),
            "headline": ld.get("description", ""),
            "avg_rating": float(agg.get("ratingValue", 0)),
            "num_reviews": int(agg.get("reviewCount", 0)),
            "image_url": ld.get("image", ""),
            "instructor_name": creator.get("name", ""),
        })

    # Extract from visible page elements
    page_data = page.evaluate("""() => {
        const txt = s => { try { return document.querySelector(s)?.textContent?.trim() || '' } catch(e) { return '' } };
        const all = s => { try { return [...document.querySelectorAll(s)].map(e => e.textContent?.trim()).filter(Boolean) } catch(e) { return [] } };

        const body = document.body?.textContent || '';
        const studentsMatch = body.match(/([\d,]+)\s*students?/i);
        const lecturesMatch = body.match(/(\d+)\s*lectures?/i);
        const hoursMatch = body.match(/([\d.]+)\s*(?:total\s+)?hours?\s+(?:of\s+)?(?:on-demand\s+)?video/i);

        return {
            title: txt('h1[data-purpose="lead-title"]') || txt('h1'),
            headline: txt('[data-purpose="lead-headline"]'),
            price: txt('[data-purpose="course-price-text"] span span'),
            num_subscribers: studentsMatch ? parseInt(studentsMatch[1].replace(/,/g, '')) : 0,
            num_lectures: lecturesMatch ? parseInt(lecturesMatch[1]) : 0,
            content_length: hoursMatch ? hoursMatch[1] + ' hours' : '',
            last_updated: txt('[data-purpose="last-update-date"] span'),
            level: txt('[data-purpose="course-level"]'),
            language: txt('[data-purpose="course-language"]'),
            what_you_learn: all('[data-purpose="objective"] span'),
            requirements: all('[data-purpose="prerequisites"] li'),
            target_audience: all('[data-purpose="target-audience"] li'),
            description: txt('[data-purpose="safely-set-inner-html:description"]'),
            instructor_name_page: txt('[data-purpose="instructor-name-top"] a'),
            instructor_url: (document.querySelector('[data-purpose="instructor-name-top"] a') || {}).href || '',
        };
    }""")

    if page_data:
        data["title"] = data.get("title") or page_data.get("title", "")
        data["headline"] = data.get("headline") or page_data.get("headline", "")
        data["price"] = page_data.get("price", "")
        data["num_subscribers"] = page_data.get("num_subscribers", 0)
        data["num_lectures"] = page_data.get("num_lectures", 0)
        data["content_length"] = page_data.get("content_length", "")
        data["last_updated"] = page_data.get("last_updated", "")
        data["level"] = page_data.get("level", "")
        data["language"] = page_data.get("language", "")
        data["description"] = page_data.get("description", "") or data.get("headline", "")
        data["instructor_name"] = data.get("instructor_name") or page_data.get("instructor_name_page", "")
        data["instructor_url"] = page_data.get("instructor_url", "")

        wyl = page_data.get("what_you_learn", [])
        data["what_you_learn"] = "\n".join(wyl) if isinstance(wyl, list) else str(wyl)
        reqs = page_data.get("requirements", [])
        data["requirements"] = "\n".join(reqs) if isinstance(reqs, list) else str(reqs)
        ta = page_data.get("target_audience", [])
        data["target_audience"] = "\n".join(ta) if isinstance(ta, list) else str(ta)

    # Extract course ID from page source (needed for API calls)
    course_id = page.evaluate("""() => {
        // Try various patterns to find course ID
        const body = document.body?.getAttribute('data-clp-course-id');
        if (body) return parseInt(body);

        // Check meta tags
        for (const m of document.querySelectorAll('meta')) {
            const content = m.getAttribute('content') || '';
            const name = m.getAttribute('name') || m.getAttribute('property') || '';
            if (name.includes('udemy_com:course:id') || name.includes('course_id')) {
                return parseInt(content);
            }
        }

        // Check inline scripts for course ID
        const scripts = document.querySelectorAll('script');
        for (const s of scripts) {
            const text = s.textContent || '';
            const m = text.match(/"id"\\s*:\\s*(\\d{4,})/);
            if (m) return parseInt(m[1]);
        }

        // Try from URL patterns in page
        const links = document.querySelectorAll('link[href*="api-2.0/courses/"]');
        for (const l of links) {
            const m = l.href.match(/courses\\/(\\d+)/);
            if (m) return parseInt(m[1]);
        }

        return null;
    }""")

    data["id"] = course_id
    return data


def fetch_curriculum_api(page: Page, course_id: int):
    """Fetch curriculum via browser-authenticated API call."""
    if not course_id:
        return []

    items = page.evaluate("""async (courseId) => {
        const allItems = [];
        let pg = 1;
        while (pg <= 10) {
            try {
                const resp = await fetch(
                    `https://www.udemy.com/api-2.0/courses/${courseId}/public-curriculum-items/?page=${pg}&page_size=200`,
                    { headers: { 'Accept': 'application/json' }, credentials: 'include' }
                );
                if (!resp.ok) break;
                const data = await resp.json();
                if (!data.results || data.results.length === 0) break;
                allItems.push(...data.results);
                if (!data.next) break;
                pg++;
            } catch(e) { break; }
        }
        return allItems;
    }""", course_id)
    return items or []


def fetch_reviews_api(page: Page, course_id: int, max_pages: int = 100):
    """Fetch all reviews via browser-authenticated API call."""
    if not course_id:
        return []

    reviews = page.evaluate("""async ([courseId, maxPages]) => {
        const all = [];
        let pg = 1;
        while (pg <= maxPages) {
            try {
                const resp = await fetch(
                    `https://www.udemy.com/api-2.0/courses/${courseId}/reviews/?page=${pg}&page_size=50&fields[course_review]=@default,response`,
                    { headers: { 'Accept': 'application/json' }, credentials: 'include' }
                );
                if (!resp.ok) break;
                const data = await resp.json();
                if (!data.results || data.results.length === 0) break;
                all.push(...data.results);
                if (!data.next) break;
                pg++;
            } catch(e) { break; }
        }
        return all;
    }""", [course_id, max_pages])
    return reviews or []


def save_course(conn: sqlite3.Connection, data: dict):
    conn.execute("""
        INSERT OR REPLACE INTO courses
        (id, title, slug, url, headline, description, price, num_subscribers,
         avg_rating, num_reviews, num_lectures, content_length, level,
         category, subcategory, language, instructor_name, instructor_url,
         created, last_updated, image_url, what_you_learn, requirements,
         target_audience, raw_json, crawled_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        data.get("id"),
        data.get("title", ""),
        data.get("slug", ""),
        data.get("url", ""),
        data.get("headline", ""),
        data.get("description", ""),
        data.get("price", ""),
        data.get("num_subscribers", 0),
        data.get("avg_rating", 0),
        data.get("num_reviews", 0),
        data.get("num_lectures", 0),
        data.get("content_length", ""),
        data.get("level", ""),
        data.get("category", ""),
        data.get("subcategory", ""),
        data.get("language", ""),
        data.get("instructor_name", ""),
        data.get("instructor_url", ""),
        data.get("created", ""),
        data.get("last_updated", ""),
        data.get("image_url", ""),
        data.get("what_you_learn", ""),
        data.get("requirements", ""),
        data.get("target_audience", ""),
        json.dumps(data, default=str),
        datetime.utcnow().isoformat(),
    ))
    conn.commit()


def save_curriculum(conn: sqlite3.Connection, course_id: int, items: list):
    section_idx = 0
    section_title = ""
    item_idx = 0

    for item in items:
        cls = item.get("_class", "")
        if cls == "chapter":
            section_idx += 1
            item_idx = 0
            section_title = item.get("title", "")
            conn.execute("""
                INSERT INTO curriculum
                (course_id, section_idx, section_title, item_idx, item_type, title, duration, is_free)
                VALUES (?,?,?,?,?,?,?,?)
            """, (course_id, section_idx, section_title, 0, "section", section_title, "", 0))
        else:
            item_idx += 1
            duration = ""
            asset = item.get("asset", {})
            if asset and isinstance(asset, dict):
                length = asset.get("length", asset.get("time_estimation", 0))
                if isinstance(length, (int, float)) and length > 0:
                    mins, secs = divmod(int(length), 60)
                    duration = f"{mins}:{secs:02d}"
                elif length:
                    duration = str(length)
            conn.execute("""
                INSERT INTO curriculum
                (course_id, section_idx, section_title, item_idx, item_type, title, duration, is_free)
                VALUES (?,?,?,?,?,?,?,?)
            """, (course_id, section_idx, section_title, item_idx, cls or "lecture",
                  item.get("title", ""), duration, 1 if item.get("is_free") else 0))
    conn.commit()


def save_reviews(conn: sqlite3.Connection, course_id: int, reviews: list):
    for r in reviews:
        user = r.get("user", {})
        conn.execute("""
            INSERT INTO reviews
            (course_id, rating, content, author, created, helpful)
            VALUES (?,?,?,?,?,?)
        """, (
            course_id,
            r.get("rating", 0),
            r.get("content", ""),
            user.get("title", user.get("display_name", "")),
            r.get("created", ""),
            r.get("num_helpful", 0),
        ))
    conn.commit()


def main():
    print("=== Udemy LangGraph Crawler ===")
    print(f"DB: {DB_PATH}")
    print(f"Courses to crawl: {len(COURSE_SLUGS)}\n")

    conn = sqlite3.connect(DB_PATH)
    init_db(conn)

    with sync_playwright() as p:
        # Use headed browser for Cloudflare challenge pass
        browser = p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--window-size=1440,900",
            ],
        )
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1440, "height": 900},
            locale="en-US",
        )
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            window.chrome = { runtime: {} };
        """)
        page = context.new_page()

        # First, visit Udemy home to establish session & pass Cloudflare
        print("[0] Establishing session with Udemy …")
        page.goto("https://www.udemy.com/", wait_until="domcontentloaded", timeout=30000)
        cf_passed = wait_for_cloudflare(page, timeout=30)
        if cf_passed:
            print("    Cloudflare passed ✓")
        else:
            print("    Cloudflare may still be blocking — will retry per page")
        time.sleep(3)

        # Process each course
        for i, slug in enumerate(COURSE_SLUGS, 1):
            print(f"\n[{i}/{len(COURSE_SLUGS)}] {slug}")

            # Navigate to course page
            url = f"https://www.udemy.com/course/{slug}/"
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
            except Exception as e:
                print(f"  SKIP (timeout): {e}")
                continue

            if not wait_for_cloudflare(page, timeout=15):
                print("  SKIP (Cloudflare blocked)")
                continue

            time.sleep(3)

            # Check if we actually landed on a course page
            page_title = page.title()
            if "404" in page_title or "not found" in page_title.lower():
                print("  SKIP (404)")
                continue

            # Extract course data
            print("  Extracting course data …")
            data = extract_course_data(page, slug)
            course_id = data.get("id")
            print(f"  Title: {data.get('title', '???')}")
            print(f"  ID: {course_id}")
            print(f"  Rating: {data.get('avg_rating', 0)} ({data.get('num_reviews', 0)} reviews)")
            print(f"  Students: {data.get('num_subscribers', 0)}")

            save_course(conn, data)

            if course_id:
                # Curriculum
                print("  Fetching curriculum …")
                curriculum = fetch_curriculum_api(page, course_id)
                print(f"    → {len(curriculum)} items")
                if curriculum:
                    save_curriculum(conn, course_id, curriculum)

                # Reviews
                print("  Fetching reviews …")
                reviews = fetch_reviews_api(page, course_id)
                print(f"    → {len(reviews)} reviews")
                if reviews:
                    save_reviews(conn, course_id, reviews)
            else:
                print("  ⚠ No course ID found — skipping API calls")

            time.sleep(2)

        browser.close()

    # Summary
    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    for table in ("courses", "curriculum", "reviews"):
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count} rows")

    print("\nCourses:")
    for row in conn.execute("""
        SELECT title, avg_rating, num_reviews, num_subscribers, slug
        FROM courses ORDER BY avg_rating DESC
    """):
        print(f"  ★ {row[1]:.1f} ({row[2]} reviews, {row[3]} students) — {row[0]}")

    conn.close()
    print(f"\nDatabase saved to {DB_PATH}")


if __name__ == "__main__":
    main()
