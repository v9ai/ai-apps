import * as Database from "better-sqlite3";
import * as path from "path";

const DB_PATH = process.env.POSTS_DB_PATH || path.join(process.cwd(), "data", "posts.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");

    _db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        linkedin_url TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        name TEXT NOT NULL,
        linkedin_url TEXT UNIQUE NOT NULL,
        headline TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER NOT NULL REFERENCES people(id),
        post_url TEXT,
        post_text TEXT,
        posted_date TEXT,
        reactions_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        reposts_count INTEGER DEFAULT 0,
        media_type TEXT DEFAULT 'none',
        is_repost INTEGER DEFAULT 0,
        original_author TEXT,
        author_name TEXT,
        author_url TEXT,
        scraped_at TEXT DEFAULT (datetime('now')),
        UNIQUE(person_id, post_url)
      );

      CREATE INDEX IF NOT EXISTS idx_people_company ON people(company_id);
      CREATE INDEX IF NOT EXISTS idx_posts_person ON posts(person_id);
    `);
  }
  return _db;
}

// ── Company operations ──

export function upsertCompany(slug: string, name: string, linkedinUrl: string | null): number {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM companies WHERE slug = ?").get(slug) as { id: number } | undefined;
  if (existing) return existing.id;

  const result = db.prepare(
    "INSERT INTO companies (slug, name, linkedin_url) VALUES (?, ?, ?)"
  ).run(slug, name, linkedinUrl);
  return result.lastInsertRowid as number;
}

export function getCompanyBySlug(slug: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM companies WHERE slug = ?").get(slug) as {
    id: number; slug: string; name: string; linkedin_url: string | null;
  } | undefined;
}

// ── People operations ──

export function upsertPerson(companyId: number, name: string, linkedinUrl: string, headline: string | null): number {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM people WHERE linkedin_url = ?").get(linkedinUrl) as { id: number } | undefined;
  if (existing) return existing.id;

  const result = db.prepare(
    "INSERT INTO people (company_id, name, linkedin_url, headline) VALUES (?, ?, ?, ?)"
  ).run(companyId, name, linkedinUrl, headline);
  return result.lastInsertRowid as number;
}

export function personHasPosts(linkedinUrl: string): boolean {
  const db = getDb();
  const row = db.prepare(`
    SELECT 1 FROM posts p
    JOIN people pe ON pe.id = p.person_id
    WHERE pe.linkedin_url = ?
    LIMIT 1
  `).get(linkedinUrl);
  return !!row;
}

// ── Post operations ──

export interface PostInput {
  post_url: string | null;
  post_text: string | null;
  posted_date: string | null;
  reactions_count: number;
  comments_count: number;
  reposts_count: number;
  media_type: string;
  is_repost: boolean;
  original_author: string | null;
  author_name: string | null;
  author_url: string | null;
}

export function insertPosts(personId: number, posts: PostInput[]): { inserted: number; duplicates: number } {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO posts
      (person_id, post_url, post_text, posted_date, reactions_count, comments_count,
       reposts_count, media_type, is_repost, original_author, author_name, author_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  const tx = db.transaction((items: PostInput[]) => {
    for (const p of items) {
      const result = stmt.run(
        personId, p.post_url, p.post_text, p.posted_date,
        p.reactions_count, p.comments_count, p.reposts_count,
        p.media_type, p.is_repost ? 1 : 0, p.original_author,
        p.author_name, p.author_url,
      );
      if (result.changes > 0) inserted++;
    }
  });

  tx(posts);
  return { inserted, duplicates: posts.length - inserted };
}

// ── Query operations ──

export function getCompanyPosts(slug: string) {
  const db = getDb();
  return db.prepare(`
    SELECT
      c.name AS company_name,
      c.slug AS company_slug,
      pe.name AS person_name,
      pe.linkedin_url AS person_linkedin_url,
      pe.headline AS person_headline,
      p.post_url,
      p.post_text,
      p.posted_date,
      p.reactions_count,
      p.comments_count,
      p.reposts_count,
      p.media_type,
      p.is_repost,
      p.original_author,
      p.author_name,
      p.author_url,
      p.scraped_at
    FROM posts p
    JOIN people pe ON pe.id = p.person_id
    JOIN companies c ON c.id = pe.company_id
    WHERE c.slug = ?
    ORDER BY p.scraped_at DESC
  `).all(slug);
}

export function getCompanyStats(slug: string) {
  const db = getDb();
  return db.prepare(`
    SELECT
      c.name AS company_name,
      c.slug,
      COUNT(DISTINCT pe.id) AS people_count,
      COUNT(p.id) AS posts_count,
      MIN(p.scraped_at) AS first_scraped,
      MAX(p.scraped_at) AS last_scraped
    FROM companies c
    LEFT JOIN people pe ON pe.company_id = c.id
    LEFT JOIN posts p ON p.person_id = pe.id
    WHERE c.slug = ?
    GROUP BY c.id
  `).get(slug);
}
