#!/usr/bin/env python3
"""
Crawl all LangGraph courses on Udemy: metadata, curriculum, and reviews.
Saves everything to a local SQLite database.
"""

import json
import sqlite3
import time
import sys
import re
from datetime import datetime
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup

DB_PATH = "data/udemy_langgraph.db"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.udemy.com/",
}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)


# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------

def init_db(conn: sqlite3.Connection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS courses (
            id              INTEGER PRIMARY KEY,
            title           TEXT,
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
            raw_json        TEXT,
            crawled_at      TEXT
        );

        CREATE TABLE IF NOT EXISTS curriculum (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id   INTEGER NOT NULL,
            sort_order  INTEGER,
            item_type   TEXT,          -- chapter / lecture
            title       TEXT,
            description TEXT,
            content_summary TEXT,
            is_free     INTEGER DEFAULT 0,
            duration    TEXT,
            FOREIGN KEY (course_id) REFERENCES courses(id)
        );

        CREATE TABLE IF NOT EXISTS reviews (
            id          INTEGER PRIMARY KEY,
            course_id   INTEGER NOT NULL,
            rating      REAL,
            content     TEXT,
            author      TEXT,
            created     TEXT,
            modified    TEXT,
            FOREIGN KEY (course_id) REFERENCES courses(id)
        );
    """)
    conn.commit()


# ---------------------------------------------------------------------------
# Udemy API helpers  (public endpoints the browser uses)
# ---------------------------------------------------------------------------

API_BASE = "https://www.udemy.com/api-2.0"

COURSE_FIELDS = (
    "title,url,headline,description,price_text,num_subscribers,"
    "avg_rating,num_reviews,num_published_lectures,content_info_short,"
    "instructional_level,primary_category,primary_subcategory,"
    "locale,visible_instructors,created,last_update_date,image_480x270"
)


def search_courses(query: str = "langgraph"):
    """Return list of course dicts from Udemy search."""
    courses = []
    page = 1
    while True:
        url = (
            f"{API_BASE}/courses/"
            f"?search={quote_plus(query)}"
            f"&page={page}&page_size=60"
            f"&fields[course]={COURSE_FIELDS}"
        )
        print(f"  [search] page {page} …")
        resp = SESSION.get(url, timeout=30)
        if resp.status_code != 200:
            print(f"  [search] HTTP {resp.status_code}, trying page scrape fallback")
            return None  # signal to use fallback
        data = resp.json()
        results = data.get("results", [])
        if not results:
            break
        courses.extend(results)
        if not data.get("next"):
            break
        page += 1
        time.sleep(1.5)
    return courses


def fetch_curriculum(course_id: int):
    """Fetch public curriculum items for a course."""
    items = []
    page = 1
    while True:
        url = (
            f"{API_BASE}/courses/{course_id}/public-curriculum-items/"
            f"?page={page}&page_size=200"
        )
        resp = SESSION.get(url, timeout=30)
        if resp.status_code != 200:
            print(f"    [curriculum] HTTP {resp.status_code}")
            break
        data = resp.json()
        results = data.get("results", [])
        if not results:
            break
        items.extend(results)
        if not data.get("next"):
            break
        page += 1
        time.sleep(1)
    return items


def fetch_reviews(course_id: int, max_pages: int = 50):
    """Fetch all reviews for a course (paginated)."""
    reviews = []
    page = 1
    while page <= max_pages:
        url = (
            f"{API_BASE}/courses/{course_id}/reviews/"
            f"?page={page}&page_size=50"
        )
        resp = SESSION.get(url, timeout=30)
        if resp.status_code != 200:
            print(f"    [reviews] HTTP {resp.status_code}")
            break
        data = resp.json()
        results = data.get("results", [])
        if not results:
            break
        reviews.extend(results)
        if not data.get("next"):
            break
        page += 1
        time.sleep(1)
    return reviews


# ---------------------------------------------------------------------------
# Fallback: scrape search results page when API is blocked
# ---------------------------------------------------------------------------

def scrape_search_page(query: str = "langgraph"):
    """Scrape Udemy search results page for course URLs, then fetch each."""
    search_url = f"https://www.udemy.com/courses/search/?q={quote_plus(query)}"
    print(f"  [scrape] GET {search_url}")
    resp = SESSION.get(search_url, timeout=30)
    soup = BeautifulSoup(resp.text, "lxml")

    # Udemy embeds JSON state in a script tag
    courses = []

    # Try to extract from UD.config or server-data
    for script in soup.find_all("script", {"type": "application/json"}):
        try:
            blob = json.loads(script.string or "")
            courses = _extract_courses_from_blob(blob)
            if courses:
                return courses
        except (json.JSONDecodeError, TypeError):
            continue

    # Try data-component-args pattern
    for div in soup.find_all(attrs={"data-component-props": True}):
        try:
            blob = json.loads(div["data-component-props"])
            courses = _extract_courses_from_blob(blob)
            if courses:
                return courses
        except (json.JSONDecodeError, TypeError, KeyError):
            continue

    # Fallback: grab course links
    links = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/course/" in href and href not in links:
            links.add(href)

    # For each course link, fetch individual course page
    for link in sorted(links):
        slug = link.rstrip("/").split("/")[-1]
        course = scrape_course_page(slug)
        if course:
            courses.append(course)
        time.sleep(2)

    return courses


def _extract_courses_from_blob(blob, depth=0):
    """Recursively search JSON blob for course list."""
    if depth > 8:
        return []
    if isinstance(blob, list):
        # Check if this list contains course-like dicts
        if blob and isinstance(blob[0], dict) and "title" in blob[0] and ("id" in blob[0] or "url" in blob[0]):
            return blob
        for item in blob:
            result = _extract_courses_from_blob(item, depth + 1)
            if result:
                return result
    elif isinstance(blob, dict):
        # Look for keys that suggest course listings
        for key in ("results", "courses", "unit_items", "items", "searchResults"):
            if key in blob:
                result = _extract_courses_from_blob(blob[key], depth + 1)
                if result:
                    return result
        for v in blob.values():
            result = _extract_courses_from_blob(v, depth + 1)
            if result:
                return result
    return []


def scrape_course_page(slug: str):
    """Scrape an individual course page for metadata."""
    url = f"https://www.udemy.com/course/{slug}/"
    print(f"  [course] GET {url}")
    resp = SESSION.get(url, timeout=30)
    soup = BeautifulSoup(resp.text, "lxml")

    # Try JSON-LD
    for script in soup.find_all("script", {"type": "application/ld+json"}):
        try:
            ld = json.loads(script.string or "")
            if isinstance(ld, dict) and ld.get("@type") == "Course":
                return _ld_to_course(ld, slug, url)
            if isinstance(ld, list):
                for item in ld:
                    if isinstance(item, dict) and item.get("@type") == "Course":
                        return _ld_to_course(item, slug, url)
        except (json.JSONDecodeError, TypeError):
            continue

    return None


def _ld_to_course(ld: dict, slug: str, page_url: str):
    """Convert JSON-LD Course schema to our course dict."""
    provider = ld.get("provider", {})
    agg = ld.get("aggregateRating", {})
    instructor = ld.get("creator", [{}])
    if isinstance(instructor, list):
        instructor = instructor[0] if instructor else {}
    return {
        "id": abs(hash(slug)) % (10**9),  # synthetic ID
        "title": ld.get("name", ""),
        "url": f"/course/{slug}/",
        "headline": ld.get("description", ""),
        "description": ld.get("description", ""),
        "price_text": "",
        "num_subscribers": 0,
        "avg_rating": float(agg.get("ratingValue", 0)),
        "num_reviews": int(agg.get("reviewCount", 0)),
        "num_published_lectures": 0,
        "content_info_short": "",
        "instructional_level": "",
        "primary_category": {},
        "primary_subcategory": {},
        "locale": {},
        "visible_instructors": [{"title": instructor.get("name", ""), "url": ""}],
        "created": "",
        "last_update_date": "",
        "image_480x270": ld.get("image", ""),
        "_slug": slug,
    }


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def save_course(conn: sqlite3.Connection, c: dict):
    instructors = c.get("visible_instructors", [{}])
    instr = instructors[0] if instructors else {}
    cat = c.get("primary_category") or {}
    subcat = c.get("primary_subcategory") or {}
    locale = c.get("locale") or {}
    conn.execute("""
        INSERT OR REPLACE INTO courses
        (id, title, url, headline, description, price, num_subscribers,
         avg_rating, num_reviews, num_lectures, content_length, level,
         category, subcategory, language, instructor_name, instructor_url,
         created, last_updated, image_url, raw_json, crawled_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        c.get("id"),
        c.get("title", ""),
        "https://www.udemy.com" + c.get("url", ""),
        c.get("headline", ""),
        c.get("description", ""),
        c.get("price_text", ""),
        c.get("num_subscribers", 0),
        c.get("avg_rating", 0),
        c.get("num_reviews", 0),
        c.get("num_published_lectures", 0),
        c.get("content_info_short", ""),
        c.get("instructional_level", ""),
        cat.get("title", ""),
        subcat.get("title", ""),
        locale.get("title", "") if isinstance(locale, dict) else str(locale),
        instr.get("title", instr.get("name", "")),
        instr.get("url", ""),
        c.get("created", ""),
        c.get("last_update_date", ""),
        c.get("image_480x270", ""),
        json.dumps(c),
        datetime.utcnow().isoformat(),
    ))
    conn.commit()


def save_curriculum_items(conn: sqlite3.Connection, course_id: int, items: list):
    for i, item in enumerate(items):
        conn.execute("""
            INSERT OR REPLACE INTO curriculum
            (course_id, sort_order, item_type, title, description,
             content_summary, is_free, duration)
            VALUES (?,?,?,?,?,?,?,?)
        """, (
            course_id,
            item.get("sort_order", i),
            item.get("_class", ""),
            item.get("title", ""),
            item.get("description", ""),
            item.get("content_summary", ""),
            1 if item.get("is_free") else 0,
            str(item.get("content_summary", "")),
        ))
    conn.commit()


def save_reviews_batch(conn: sqlite3.Connection, course_id: int, reviews: list):
    for r in reviews:
        user = r.get("user", {})
        conn.execute("""
            INSERT OR REPLACE INTO reviews
            (id, course_id, rating, content, author, created, modified)
            VALUES (?,?,?,?,?,?,?)
        """, (
            r.get("id", abs(hash(r.get("content", ""))) % (10**9)),
            course_id,
            r.get("rating", 0),
            r.get("content", ""),
            user.get("title", user.get("display_name", "")),
            r.get("created", ""),
            r.get("modified", ""),
        ))
    conn.commit()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print(f"=== Udemy LangGraph Crawler ===")
    print(f"DB: {DB_PATH}\n")

    conn = sqlite3.connect(DB_PATH)
    init_db(conn)

    # --- Search for courses ---
    print("[1/3] Searching for LangGraph courses …")
    courses = search_courses("langgraph")

    if courses is None:
        # API blocked, use scrape fallback
        print("  API blocked — falling back to page scraping …")
        courses = scrape_search_page("langgraph")

    if not courses:
        print("  No courses found. Trying broader search …")
        courses = search_courses("lang graph ai")
        if courses is None:
            courses = scrape_search_page("lang graph ai")

    # Also search related terms to be thorough
    for extra_query in ["langgraph langchain agent", "langgraph python"]:
        print(f"\n  Also searching: '{extra_query}' …")
        extra = search_courses(extra_query)
        if extra is None:
            extra = scrape_search_page(extra_query)
        if extra:
            existing_ids = {c.get("id") for c in courses}
            for c in extra:
                if c.get("id") not in existing_ids:
                    courses.append(c)
                    existing_ids.add(c.get("id"))
        time.sleep(2)

    print(f"\n  Found {len(courses)} unique courses total.\n")

    # --- Process each course ---
    for i, course in enumerate(courses, 1):
        cid = course.get("id")
        title = course.get("title", "???")
        print(f"[2/3] Course {i}/{len(courses)}: {title}")

        # Save course metadata
        save_course(conn, course)

        # Fetch & save curriculum
        print(f"  Fetching curriculum …")
        curriculum = fetch_curriculum(cid)
        print(f"    → {len(curriculum)} items")
        if curriculum:
            save_curriculum_items(conn, cid, curriculum)
        time.sleep(1)

        # Fetch & save reviews
        print(f"  Fetching reviews …")
        reviews = fetch_reviews(cid)
        print(f"    → {len(reviews)} reviews")
        if reviews:
            save_reviews_batch(conn, cid, reviews)

        print()
        time.sleep(2)

    # --- Summary ---
    print("[3/3] Summary")
    for table in ("courses", "curriculum", "reviews"):
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count} rows")

    conn.close()
    print(f"\nDone! Database saved to {DB_PATH}")


if __name__ == "__main__":
    main()
