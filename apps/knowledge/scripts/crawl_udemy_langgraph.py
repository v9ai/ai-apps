#!/usr/bin/env python3
"""
Crawl all LangGraph courses on Udemy: metadata, curriculum, and reviews.
Uses Playwright (headless Chromium) to bypass JS-rendering and anti-bot.
Saves everything to a local SQLite database.
"""

import json
import sqlite3
import time
import re
from datetime import datetime
from urllib.parse import quote_plus

from playwright.sync_api import sync_playwright, Page

DB_PATH = "data/udemy_langgraph.db"


# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------

def init_db(conn: sqlite3.Connection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS courses (
            id              INTEGER PRIMARY KEY,
            title           TEXT,
            slug            TEXT,
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

        CREATE TABLE IF NOT EXISTS curriculum (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id   INTEGER NOT NULL,
            section_idx INTEGER,
            section_title TEXT,
            item_idx    INTEGER,
            item_type   TEXT,          -- section / lecture
            title       TEXT,
            duration    TEXT,
            is_free     INTEGER DEFAULT 0,
            FOREIGN KEY (course_id) REFERENCES courses(id)
        );

        CREATE TABLE IF NOT EXISTS reviews (
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


# ---------------------------------------------------------------------------
# Intercept Udemy API calls made by the browser
# ---------------------------------------------------------------------------

def intercept_api_search(page: Page, query: str):
    """Navigate to Udemy search and collect course data from intercepted API calls."""
    captured = []

    def on_response(response):
        url = response.url
        if "/api-2.0/search-courses/" in url or ("/api-2.0/courses/" in url and "search" in url):
            try:
                data = response.json()
                if "results" in data:
                    captured.extend(data["results"])
                elif "courses" in data:
                    captured.extend(data["courses"])
            except Exception:
                pass

    page.on("response", on_response)
    search_url = f"https://www.udemy.com/courses/search/?q={quote_plus(query)}"
    print(f"  [browser] {search_url}")
    page.goto(search_url, wait_until="networkidle", timeout=60000)
    time.sleep(3)

    # Scroll to load more results
    for _ in range(5):
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(2)

    page.remove_listener("response", on_response)
    return captured


def collect_course_links(page: Page, query: str):
    """Scrape course links from search results page."""
    search_url = f"https://www.udemy.com/courses/search/?q={quote_plus(query)}"
    print(f"  [browser] {search_url}")
    page.goto(search_url, wait_until="networkidle", timeout=60000)
    time.sleep(3)

    # Scroll to load everything
    for _ in range(5):
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1.5)

    # Extract course links
    links = page.eval_on_selector_all(
        'a[href*="/course/"]',
        """els => [...new Set(els
            .map(e => e.getAttribute('href'))
            .filter(h => h && h.includes('/course/'))
            .map(h => {
                const m = h.match(/\\/course\\/([^/?#]+)/);
                return m ? m[1] : null;
            })
            .filter(Boolean)
        )]"""
    )
    return links


def scrape_course_page(page: Page, slug: str, conn: sqlite3.Connection):
    """Scrape a single course page for all details, curriculum, and reviews."""
    url = f"https://www.udemy.com/course/{slug}/"
    print(f"\n  [course] {url}")

    try:
        page.goto(url, wait_until="networkidle", timeout=60000)
    except Exception as e:
        print(f"    SKIP (navigation failed): {e}")
        return None
    time.sleep(3)

    # --- Extract JSON-LD structured data ---
    ld_data = None
    try:
        ld_scripts = page.query_selector_all('script[type="application/ld+json"]')
        for s in ld_scripts:
            txt = s.inner_text()
            try:
                parsed = json.loads(txt)
                if isinstance(parsed, dict) and parsed.get("@type") == "Course":
                    ld_data = parsed
                    break
                if isinstance(parsed, list):
                    for item in parsed:
                        if isinstance(item, dict) and item.get("@type") == "Course":
                            ld_data = item
                            break
            except json.JSONDecodeError:
                continue
    except Exception:
        pass

    # --- Extract from page directly ---
    course_id = abs(hash(slug)) % (10**9)

    title = ""
    try:
        title = page.inner_text('h1[data-purpose="lead-title"]')
    except Exception:
        try:
            title = page.inner_text("h1")
        except Exception:
            if ld_data:
                title = ld_data.get("name", slug)

    headline = ""
    try:
        headline = page.inner_text('[data-purpose="lead-headline"]')
    except Exception:
        if ld_data:
            headline = ld_data.get("description", "")

    # Rating & stats
    avg_rating = 0.0
    num_reviews = 0
    num_subscribers = 0
    num_lectures = 0
    content_length = ""
    level = ""
    language = ""

    if ld_data:
        agg = ld_data.get("aggregateRating", {})
        avg_rating = float(agg.get("ratingValue", 0))
        num_reviews = int(agg.get("reviewCount", 0))

    # Try to get stats from visible text
    try:
        stats_text = page.inner_text('[data-purpose="course-stat"]') if page.query_selector('[data-purpose="course-stat"]') else ""
    except Exception:
        stats_text = ""

    try:
        meta_text = page.content()
        m = re.search(r'([\d,]+)\s*students', meta_text)
        if m:
            num_subscribers = int(m.group(1).replace(",", ""))
        m = re.search(r'([\d.]+)\s*total hours', meta_text)
        if m:
            content_length = f"{m.group(1)} total hours"
        m = re.search(r'(\d+)\s*lectures', meta_text)
        if m:
            num_lectures = int(m.group(1))
    except Exception:
        pass

    # Price
    price = ""
    try:
        price_el = page.query_selector('[data-purpose="course-price-text"] span span')
        if price_el:
            price = price_el.inner_text().strip()
    except Exception:
        pass

    # Instructor
    instructor_name = ""
    instructor_url = ""
    if ld_data:
        creator = ld_data.get("creator", [])
        if isinstance(creator, list) and creator:
            instructor_name = creator[0].get("name", "")
        elif isinstance(creator, dict):
            instructor_name = creator.get("name", "")
    try:
        instr_el = page.query_selector('[data-purpose="instructor-name-top"] a')
        if instr_el:
            instructor_name = instr_el.inner_text().strip() or instructor_name
            instructor_url = instr_el.get_attribute("href") or ""
    except Exception:
        pass

    # Last updated
    last_updated = ""
    try:
        upd_el = page.query_selector('[data-purpose="last-update-date"] span')
        if upd_el:
            last_updated = upd_el.inner_text().strip()
    except Exception:
        pass

    # Image
    image_url = ""
    if ld_data:
        image_url = ld_data.get("image", "")

    # What you'll learn
    what_you_learn = ""
    try:
        items = page.query_selector_all('[data-purpose="objective"] span')
        if items:
            what_you_learn = "\n".join(i.inner_text().strip() for i in items)
    except Exception:
        pass

    # Description (full)
    description = headline
    try:
        desc_el = page.query_selector('[data-purpose="safely-set-inner-html:description"]')
        if desc_el:
            description = desc_el.inner_text().strip()
    except Exception:
        pass

    # Requirements
    requirements = ""
    try:
        req_items = page.query_selector_all('[data-purpose="prerequisites"] li')
        if req_items:
            requirements = "\n".join(r.inner_text().strip() for r in req_items)
    except Exception:
        pass

    # Target audience
    target_audience = ""
    try:
        ta_items = page.query_selector_all('[data-purpose="target-audience"] li')
        if ta_items:
            target_audience = "\n".join(t.inner_text().strip() for t in ta_items)
    except Exception:
        pass

    print(f"    Title: {title}")
    print(f"    Rating: {avg_rating} ({num_reviews} reviews), {num_subscribers} students")

    # Save course
    conn.execute("""
        INSERT OR REPLACE INTO courses
        (id, title, slug, url, headline, description, price, num_subscribers,
         avg_rating, num_reviews, num_lectures, content_length, level,
         category, subcategory, language, instructor_name, instructor_url,
         created, last_updated, image_url, what_you_learn, requirements,
         target_audience, raw_json, crawled_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        course_id, title, slug, url, headline, description, price, num_subscribers,
        avg_rating, num_reviews, num_lectures, content_length, level,
        "", "", language, instructor_name, instructor_url,
        "", last_updated, image_url, what_you_learn, requirements,
        target_audience, json.dumps(ld_data or {}), datetime.utcnow().isoformat(),
    ))
    conn.commit()

    # --- Curriculum ---
    print(f"    Fetching curriculum …")
    scrape_curriculum(page, course_id, conn)

    # --- Reviews ---
    print(f"    Fetching reviews …")
    scrape_reviews(page, course_id, slug, conn)

    return course_id


def scrape_curriculum(page: Page, course_id: int, conn: sqlite3.Connection):
    """Extract curriculum sections and lectures from the course page."""
    # First, try to expand all sections
    try:
        expand_btn = page.query_selector('button[data-purpose="expand-toggle"]')
        if expand_btn:
            expand_btn.click()
            time.sleep(2)
    except Exception:
        pass

    # Also try clicking "Show more" for sections
    try:
        show_more_btns = page.query_selector_all('[data-purpose="show-more"]')
        for btn in show_more_btns:
            try:
                btn.click()
                time.sleep(0.5)
            except Exception:
                pass
    except Exception:
        pass

    count = 0
    try:
        # Get all section panels
        sections = page.query_selector_all('[data-purpose="course-curriculum"] [class*="section"]')
        if not sections:
            sections = page.query_selector_all('[class*="accordion-panel"]')

        # Alternative: get the full curriculum text structure
        curriculum_el = page.query_selector('[data-purpose="course-curriculum"]')
        if curriculum_el:
            # Parse the curriculum structure
            inner_html = curriculum_el.inner_html()

            # Try structured extraction with section headers and lecture items
            section_headers = curriculum_el.query_selector_all('[class*="section--section-heading"]')
            if not section_headers:
                section_headers = curriculum_el.query_selector_all('button[class*="section"]')

            section_idx = 0
            all_rows = curriculum_el.query_selector_all('[class*="section--section-heading"], [class*="section--item"]')
            if not all_rows:
                all_rows = curriculum_el.query_selector_all('div[role="listitem"], button[aria-expanded]')

            current_section = "Main"
            item_idx = 0
            for row in all_rows:
                text = row.inner_text().strip()
                classes = row.get_attribute("class") or ""

                if "heading" in classes or row.evaluate("el => el.tagName") == "BUTTON":
                    # This is a section header
                    section_idx += 1
                    item_idx = 0
                    current_section = text.split("\n")[0].strip()
                    conn.execute("""
                        INSERT INTO curriculum
                        (course_id, section_idx, section_title, item_idx, item_type, title, duration, is_free)
                        VALUES (?,?,?,?,?,?,?,?)
                    """, (course_id, section_idx, current_section, 0, "section", current_section, "", 0))
                    count += 1
                else:
                    # This is a lecture item
                    item_idx += 1
                    lines = [l.strip() for l in text.split("\n") if l.strip()]
                    lec_title = lines[0] if lines else text
                    duration = ""
                    is_free = 0
                    for l in lines:
                        if re.match(r'\d+:\d+', l):
                            duration = l
                        if "Preview" in l or "preview" in l:
                            is_free = 1

                    conn.execute("""
                        INSERT INTO curriculum
                        (course_id, section_idx, section_title, item_idx, item_type, title, duration, is_free)
                        VALUES (?,?,?,?,?,?,?,?)
                    """, (course_id, section_idx, current_section, item_idx, "lecture", lec_title, duration, is_free))
                    count += 1

            conn.commit()

        if count == 0:
            # Fallback: just grab all text from curriculum area
            try:
                full_text = curriculum_el.inner_text() if curriculum_el else ""
                if full_text:
                    conn.execute("""
                        INSERT INTO curriculum
                        (course_id, section_idx, section_title, item_idx, item_type, title, duration, is_free)
                        VALUES (?,?,?,?,?,?,?,?)
                    """, (course_id, 0, "Full Curriculum", 0, "raw_text", full_text, "", 0))
                    conn.commit()
                    count = 1
            except Exception:
                pass

    except Exception as e:
        print(f"      curriculum error: {e}")

    print(f"      → {count} curriculum items")


def scrape_reviews(page: Page, course_id: int, slug: str, conn: sqlite3.Connection):
    """Scrape reviews, loading more pages via button clicks."""
    total = 0

    # Navigate to reviews section or use API intercept
    try:
        # First try scrolling to reviews on course page
        page.evaluate("""() => {
            const el = document.querySelector('[data-purpose="reviews"]') ||
                       document.querySelector('#reviews');
            if (el) el.scrollIntoView({behavior: 'instant'});
        }""")
        time.sleep(2)
    except Exception:
        pass

    # Try intercepting the reviews API endpoint
    review_data = []

    def capture_reviews(response):
        if "/reviews/" in response.url and "api" in response.url:
            try:
                data = response.json()
                if "results" in data:
                    review_data.extend(data["results"])
            except Exception:
                pass

    page.on("response", capture_reviews)

    # Try to trigger reviews loading by navigating to review-specific URL or clicking
    try:
        # Click "See more reviews" or pagination buttons
        for _ in range(20):  # Up to 20 pages of reviews
            next_btn = page.query_selector('[data-purpose="pagination-button-next"]') or \
                       page.query_selector('button:has-text("Show more reviews")') or \
                       page.query_selector('[class*="show-more-review"]')
            if not next_btn:
                break
            next_btn.click()
            time.sleep(2)
    except Exception:
        pass

    # Also try to load reviews via the reviews page URL pattern
    try:
        reviews_url = f"https://www.udemy.com/course/{slug}/reviews/"
        page.goto(reviews_url, wait_until="networkidle", timeout=30000)
        time.sleep(3)

        # Keep clicking "Show more" for reviews
        for _ in range(30):
            try:
                more_btn = page.query_selector('button:has-text("Show more")') or \
                           page.query_selector('[data-purpose="show-more-review-button"]')
                if not more_btn or not more_btn.is_visible():
                    break
                more_btn.click()
                time.sleep(1.5)
            except Exception:
                break
    except Exception:
        pass

    page.remove_listener("response", capture_reviews)

    # Save any API-intercepted reviews
    for r in review_data:
        user = r.get("user", {})
        conn.execute("""
            INSERT OR IGNORE INTO reviews
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
        total += 1

    # Also scrape visible reviews from the page DOM
    try:
        review_cards = page.query_selector_all('[class*="review-"] [class*="individual-review"]') or \
                       page.query_selector_all('[data-purpose="review-comment-content"]')

        if not review_cards:
            # Broader selector
            review_cards = page.query_selector_all('[class*="reviews--review"]')

        for card in review_cards:
            try:
                content = ""
                author = ""
                rating = 0.0
                created = ""

                # Try different selectors for review content
                content_el = card.query_selector('[data-purpose="review-comment-content"]') or \
                             card.query_selector('[class*="review-content"]')
                if content_el:
                    content = content_el.inner_text().strip()

                author_el = card.query_selector('[class*="review-author"]') or \
                            card.query_selector('[data-purpose="review-detail-user-name"]')
                if author_el:
                    author = author_el.inner_text().strip()

                # Rating from star icons
                stars = card.query_selector_all('[class*="star-rating"] [class*="star"]')
                if stars:
                    rating = len([s for s in stars if "filled" in (s.get_attribute("class") or "")])

                date_el = card.query_selector('[class*="review-date"]') or \
                          card.query_selector('time')
                if date_el:
                    created = date_el.inner_text().strip()

                if content:
                    conn.execute("""
                        INSERT OR IGNORE INTO reviews
                        (course_id, rating, content, author, created, helpful)
                        VALUES (?,?,?,?,?,?)
                    """, (course_id, rating, content, author, created, 0))
                    total += 1
            except Exception:
                continue
    except Exception as e:
        print(f"      review scrape error: {e}")

    conn.commit()
    print(f"      → {total} reviews saved")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=== Udemy LangGraph Crawler (Playwright) ===")
    print(f"DB: {DB_PATH}\n")

    conn = sqlite3.connect(DB_PATH)
    init_db(conn)

    # Clear old data for fresh crawl
    conn.executescript("DELETE FROM reviews; DELETE FROM curriculum; DELETE FROM courses;")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1440, "height": 900},
            locale="en-US",
        )
        page = context.new_page()

        # --- Step 1: Find all LangGraph course slugs ---
        all_slugs = set()
        for query in ["langgraph", "langgraph langchain", "langgraph agent", "langgraph python"]:
            print(f"[1] Searching: '{query}' …")
            slugs = collect_course_links(page, query)
            print(f"    → {len(slugs)} course links")
            all_slugs.update(slugs)
            time.sleep(2)

        # Filter: only keep slugs likely about LangGraph
        lang_slugs = [s for s in all_slugs if "langgraph" in s.lower() or "lang-graph" in s.lower()]
        other_slugs = [s for s in all_slugs if s not in lang_slugs]

        # Always include langgraph slugs; include others only if they look relevant
        final_slugs = lang_slugs + other_slugs
        print(f"\n  Total unique course slugs: {len(final_slugs)}")
        print(f"  LangGraph-specific: {len(lang_slugs)}")
        print(f"  Related: {len(other_slugs)}")

        # --- Step 2: Scrape each course ---
        for i, slug in enumerate(final_slugs, 1):
            print(f"\n[2] Course {i}/{len(final_slugs)}: {slug}")
            try:
                scrape_course_page(page, slug, conn)
            except Exception as e:
                print(f"    ERROR: {e}")
            time.sleep(3)

        browser.close()

    # --- Summary ---
    print("\n" + "=" * 50)
    print("[3] Final Summary")
    for table in ("courses", "curriculum", "reviews"):
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count} rows")

    # Show course titles
    print("\nCourses crawled:")
    for row in conn.execute("SELECT title, avg_rating, num_reviews, slug FROM courses ORDER BY avg_rating DESC"):
        print(f"  ★ {row[1]:.1f} ({row[2]} reviews) — {row[0]}")

    conn.close()
    print(f"\nDone! Database saved to {DB_PATH}")


if __name__ == "__main__":
    main()
