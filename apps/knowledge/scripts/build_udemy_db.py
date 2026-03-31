#!/usr/bin/env python3
"""
Build SQLite database from collected Udemy LangGraph course data.
Reads JSON files from data/ and populates data/udemy_langgraph.db.
"""

import json
import sqlite3
import glob
import os
from datetime import datetime

DB_PATH = "data/udemy_langgraph.db"
DATA_DIR = "data"


def init_db(conn: sqlite3.Connection):
    conn.executescript("""
        DROP TABLE IF EXISTS reviews;
        DROP TABLE IF EXISTS curriculum;
        DROP TABLE IF EXISTS courses;

        CREATE TABLE courses (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id       INTEGER,
            title           TEXT NOT NULL,
            slug            TEXT UNIQUE,
            url             TEXT,
            headline        TEXT,
            description     TEXT,
            price           TEXT,
            num_subscribers INTEGER DEFAULT 0,
            avg_rating      REAL DEFAULT 0,
            num_reviews     INTEGER DEFAULT 0,
            num_lectures    INTEGER DEFAULT 0,
            total_hours     REAL DEFAULT 0,
            content_length  TEXT,
            level           TEXT,
            category        TEXT,
            language        TEXT,
            instructor_name TEXT,
            instructor_title TEXT,
            instructor_bio  TEXT,
            last_updated    TEXT,
            image_url       TEXT,
            what_you_learn  TEXT,
            requirements    TEXT,
            target_audience TEXT,
            raw_json        TEXT,
            crawled_at      TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE curriculum (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id   INTEGER NOT NULL,
            section_idx INTEGER DEFAULT 0,
            section_title TEXT,
            item_idx    INTEGER DEFAULT 0,
            item_type   TEXT DEFAULT 'section',
            title       TEXT,
            duration    TEXT,
            FOREIGN KEY (course_id) REFERENCES courses(id)
        );

        CREATE TABLE reviews (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id   INTEGER NOT NULL,
            rating      REAL,
            content     TEXT,
            author      TEXT,
            source      TEXT,
            sentiment   TEXT,
            created     TEXT,
            FOREIGN KEY (course_id) REFERENCES courses(id)
        );

        CREATE INDEX idx_curriculum_course ON curriculum(course_id);
        CREATE INDEX idx_reviews_course ON reviews(course_id);
    """)
    conn.commit()


def slug_from_url(url: str) -> str:
    import re
    m = re.search(r'/course/([^/?#]+)', url)
    return m.group(1) if m else ""


def import_course(conn: sqlite3.Connection, c: dict) -> int:
    """Import a single course dict, return the local DB id."""
    slug = slug_from_url(c.get("url", ""))
    instructor = c.get("instructor", {})
    if isinstance(instructor, str):
        instructor = {"name": instructor}

    what_you_learn = c.get("what_you_will_learn", c.get("what_youll_learn", c.get("what_you_learn", [])))
    if isinstance(what_you_learn, list):
        what_you_learn = "\n".join(what_you_learn)

    requirements = c.get("prerequisites", c.get("requirements", []))
    if isinstance(requirements, list):
        requirements = "\n".join(requirements)

    price = c.get("price", "")
    if isinstance(price, dict):
        price = price.get("note", price.get("current", ""))

    target_audience = c.get("target_audience", c.get("who_is_this_for", []))
    if isinstance(target_audience, list):
        target_audience = "\n".join(target_audience)

    cursor = conn.execute("""
        INSERT OR REPLACE INTO courses
        (course_id, title, slug, url, headline, description, price,
         num_subscribers, avg_rating, num_reviews, num_lectures, total_hours,
         content_length, level, category, language,
         instructor_name, instructor_title, instructor_bio,
         last_updated, image_url, what_you_learn, requirements,
         target_audience, raw_json, crawled_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        c.get("course_id"),
        c.get("title", ""),
        slug,
        c.get("url", ""),
        c.get("headline", ""),
        c.get("description", ""),
        price,
        c.get("num_students", c.get("num_subscribers", 0)),
        c.get("rating", c.get("avg_rating", 0)),
        c.get("num_reviews", 0),
        c.get("num_lectures", 0),
        c.get("total_hours", 0),
        c.get("content_length", ""),
        c.get("level", ""),
        c.get("category", ""),
        c.get("language", "English"),
        instructor.get("name", "") if isinstance(instructor, dict) else str(instructor),
        (instructor.get("title", "") or instructor.get("role", "") or instructor.get("tagline", "")) if isinstance(instructor, dict) else "",
        instructor.get("bio", "") if isinstance(instructor, dict) else "",
        c.get("last_updated", ""),
        c.get("image_url", ""),
        what_you_learn,
        requirements,
        target_audience,
        json.dumps(c, default=str),
        datetime.utcnow().isoformat(),
    ))
    conn.commit()
    return cursor.lastrowid


def import_curriculum(conn: sqlite3.Connection, course_db_id: int, sections: list):
    """Import curriculum sections (list of section title strings)."""
    for idx, section in enumerate(sections, 1):
        if isinstance(section, str):
            conn.execute("""
                INSERT INTO curriculum (course_id, section_idx, section_title, item_idx, item_type, title)
                VALUES (?,?,?,?,?,?)
            """, (course_db_id, idx, section, 0, "section", section))
        elif isinstance(section, dict):
            conn.execute("""
                INSERT INTO curriculum (course_id, section_idx, section_title, item_idx, item_type, title, duration)
                VALUES (?,?,?,?,?,?,?)
            """, (course_db_id, section.get("section_idx", idx),
                  section.get("section_title", section.get("title", "")),
                  section.get("item_idx", 0),
                  section.get("item_type", "section"),
                  section.get("title", ""),
                  section.get("duration", "")))
    conn.commit()


def import_reviews(conn: sqlite3.Connection, course_db_id: int, reviews: list):
    """Import reviews for a course."""
    for r in reviews:
        if isinstance(r, str):
            conn.execute("""
                INSERT INTO reviews (course_id, content, source) VALUES (?,?,?)
            """, (course_db_id, r, "web_search"))
        elif isinstance(r, dict):
            conn.execute("""
                INSERT INTO reviews (course_id, rating, content, author, source, sentiment, created)
                VALUES (?,?,?,?,?,?,?)
            """, (
                course_db_id,
                r.get("rating"),
                r.get("quote", r.get("content", r.get("text", ""))),
                r.get("author", ""),
                r.get("source", "web_search"),
                r.get("sentiment", ""),
                r.get("created", r.get("date", "")),
            ))
    conn.commit()


def main():
    print(f"=== Building Udemy LangGraph SQLite DB ===")
    print(f"DB: {DB_PATH}\n")

    conn = sqlite3.connect(DB_PATH)
    init_db(conn)

    # Find all JSON data files
    json_files = sorted(glob.glob(os.path.join(DATA_DIR, "udemy_courses*.json")))
    if not json_files:
        print("No JSON data files found in data/")
        return

    all_courses = []
    seen_slugs = set()

    for jf in json_files:
        print(f"Reading {jf} …")
        with open(jf) as f:
            data = json.load(f)
        if isinstance(data, list):
            for c in data:
                slug = slug_from_url(c.get("url", ""))
                if slug and slug not in seen_slugs:
                    all_courses.append(c)
                    seen_slugs.add(slug)
                elif not slug:
                    all_courses.append(c)
        elif isinstance(data, dict):
            slug = slug_from_url(data.get("url", ""))
            if slug not in seen_slugs:
                all_courses.append(data)
                seen_slugs.add(slug)

    print(f"\nTotal unique courses: {len(all_courses)}\n")

    for c in all_courses:
        title = c.get("title", "???")
        slug = slug_from_url(c.get("url", ""))
        print(f"  Importing: {title} [{slug}]")

        db_id = import_course(conn, c)

        # Curriculum
        sections = c.get("curriculum_sections", c.get("curriculum", []))
        if sections:
            import_curriculum(conn, db_id, sections)
            print(f"    → {len(sections)} curriculum sections")

        # Reviews
        reviews = c.get("reviews", [])
        if reviews:
            import_reviews(conn, db_id, reviews)
            print(f"    → {len(reviews)} reviews")

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for table in ("courses", "curriculum", "reviews"):
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count} rows")

    print("\nCourses by rating:")
    for row in conn.execute("""
        SELECT title, avg_rating, num_reviews, num_subscribers, instructor_name, slug
        FROM courses ORDER BY avg_rating DESC
    """):
        print(f"  ★ {row[1]:.2f} | {row[2]:>5} reviews | {row[3]:>6} students | {row[4]} — {row[0]}")

    conn.close()
    print(f"\nDone! Database: {DB_PATH}")


if __name__ == "__main__":
    main()
