import fs from "fs";

import { resolveContentFile } from "./articles";

export interface Reference {
  title: string;
  authors?: string;
  year?: number;
  url: string;
  venue?: string;
}

/* ── helpers ────────────────────────────────────────────────────── */

export function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[""''"`]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scholarUrl(title: string, authors?: string, year?: number): string {
  const parts = [title];
  if (authors) parts.push(authors);
  if (year) parts.push(String(year));
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(parts.join(" "))}`;
}

const STOP_AUTHORS = new Set([
  "search", "section", "phase", "step", "part", "chapter", "version",
  "table", "figure", "tier", "stage", "level", "act", "various",
  "emerging", "likely", "current", "unknown", "date", "regional",
]);

function isFalseAuthor(s: string): boolean {
  return STOP_AUTHORS.has(s.toLowerCase().trim());
}

function isValidTitle(t: string): boolean {
  if (t.length < 15) return false;
  const lo = t.toLowerCase();
  if (lo.startsWith("search needed")) return false;
  if (lo.startsWith("emerging research")) return false;
  if (lo.startsWith("likely ")) return false;
  if (/^\d{4}[-–]\d{4}$/.test(t.trim())) return false;
  return true;
}

function isYearRange(s: string): boolean {
  return /\d{4}\s*[-–]\s*\d{4}/.test(s);
}

function validYear(y: number): boolean {
  return y >= 1950 && y <= 2030;
}

/* ── extractor 1: numbered reference lists ──────────────────────── */

function extractNumberedRefs(content: string): Reference[] {
  const refs: Reference[] = [];

  // 1. "Title" (Authors, Year) or (Authors, Venue Year)
  const re1 = /^\d+\.\s+"([^"]{15,})"\s*\(([^)]+)\)/gm;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(content)) !== null) {
    const title = m[1].trim();
    const paren = m[2].trim();
    if (!isValidTitle(title)) continue;

    const ym = paren.match(/(\d{4})\s*$/);
    if (!ym || isYearRange(paren)) continue;
    const year = parseInt(ym[1], 10);
    if (!validYear(year)) continue;

    const before = paren.slice(0, ym.index).replace(/,\s*$/, "").trim();
    let authors: string | undefined;
    let venue: string | undefined;

    const vm = before.match(
      /,\s*((?:AAAI|NeurIPS|ICML|ICLR|KDD|CVPR|ICCV|ECCV|ACL|WWW|SIGIR|IEEE|ACM)\b.*)$/i,
    );
    if (vm) {
      authors = before.slice(0, vm.index).trim() || undefined;
      venue = vm[1].trim();
    } else {
      authors = before || undefined;
    }
    if (authors && isFalseAuthor(authors)) continue;
    refs.push({ title, authors, year, venue, url: scholarUrl(title, authors, year) });
  }

  // 2. "Title" by Author (Year)
  const re2 = /^\d+\.\s+"([^"]{15,})"\s+by\s+([^(]+?)\s*\((\d{4})\)/gm;
  while ((m = re2.exec(content)) !== null) {
    const title = m[1].trim();
    const authors = m[2].trim();
    const year = parseInt(m[3], 10);
    if (!isValidTitle(title) || !validYear(year) || isFalseAuthor(authors)) continue;
    refs.push({ title, authors, year, url: scholarUrl(title, authors, year) });
  }

  // 3. Standalone "Title" (no author)
  const re3 = /^\d+\.\s+"([^"]{15,})"\s*$/gm;
  while ((m = re3.exec(content)) !== null) {
    const title = m[1].trim();
    if (!isValidTitle(title)) continue;
    refs.push({ title, url: scholarUrl(title) });
  }

  return refs;
}

/* ── extractor 2: markdown tables with Title column ─────────────── */

function extractTableRefs(content: string): Reference[] {
  const refs: Reference[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes("|")) continue;

    const cells = line.split("|").map((c) => c.trim());
    let titleIdx = -1,
      authorsIdx = -1,
      yearIdx = -1,
      venueIdx = -1;

    for (let j = 0; j < cells.length; j++) {
      const lo = cells[j].toLowerCase();
      if (lo === "title") titleIdx = j;
      else if (lo === "authors") authorsIdx = j;
      else if (lo === "year") yearIdx = j;
      else if (lo === "venue" || lo === "journal") venueIdx = j;
    }
    if (titleIdx === -1) continue;

    // separator row
    const sep = lines[i + 1];
    if (!sep || !sep.includes("---")) continue;

    for (let r = i + 2; r < lines.length; r++) {
      const row = lines[r];
      if (!row.includes("|")) break;
      const rc = row.split("|").map((c) => c.trim());

      const title = rc[titleIdx]?.replace(/\*\*/g, "").trim();
      if (!title || !isValidTitle(title)) continue;

      const authors = authorsIdx >= 0 ? rc[authorsIdx]?.replace(/\*\*/g, "").trim() || undefined : undefined;
      const yearStr = yearIdx >= 0 ? rc[yearIdx]?.trim() : undefined;
      const year = yearStr ? parseInt(yearStr, 10) : undefined;
      const venue = venueIdx >= 0 ? rc[venueIdx]?.replace(/\*\*/g, "").trim() || undefined : undefined;

      if (year !== undefined && (!validYear(year) || isNaN(year))) continue;
      refs.push({
        title,
        authors,
        year: year && !isNaN(year) ? year : undefined,
        venue,
        url: scholarUrl(title, authors, year && !isNaN(year) ? year : undefined),
      });
    }
  }
  return refs;
}

/* ── extractor 3: bold author-year **Author (Year)**: ───────────── */

function extractBoldAuthorYear(content: string): Reference[] {
  const refs: Reference[] = [];
  const re =
    /\*\*([A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F'.&, ]+?(?:\s+et\s+al\.?)?)\s*\((\d{4})\)\*\*(?::\s*(?:"([^"]+)"|([^\n*]+)))?/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(content)) !== null) {
    const authors = m[1].trim();
    const year = parseInt(m[2], 10);
    const quoted = m[3]?.trim();
    const desc = m[4]?.trim();

    if (!validYear(year) || isFalseAuthor(authors)) continue;

    const title = (quoted && isValidTitle(quoted)) ? quoted : (desc && isValidTitle(desc)) ? desc : undefined;
    refs.push({
      title: title || `${authors} (${year})`,
      authors,
      year,
      url: scholarUrl(title || authors, authors, year),
    });
  }
  return refs;
}

/* ── extractor 4: parenthetical citations (Author, Year) ───────── */

function extractParenthetical(content: string): Reference[] {
  const refs: Reference[] = [];
  const re =
    /\(([A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F']+(?:\s*(?:&|and)\s*[A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F']+)?(?:\s+et\s+al\.?)?),\s*(\d{4})\)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(content)) !== null) {
    const authors = m[1].trim();
    const year = parseInt(m[2], 10);
    if (!validYear(year) || isFalseAuthor(authors) || isYearRange(m[0])) continue;
    refs.push({
      title: `${authors} (${year})`,
      authors,
      year,
      url: scholarUrl(authors, undefined, year),
    });
  }
  return refs;
}

/* ── extractor 5: narrative citations  Author (Year)  ───────────── */

function extractNarrativeCitations(content: string): Reference[] {
  const refs: Reference[] = [];
  // Narrative: "Author (Year)" in running text, NOT preceded by **
  const re =
    /(?:^|(?<=[\s,;:(]))([A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F']+(?:\s*(?:&|and)\s*[A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F']+)?(?:\s+et\s+al\.?)?)\s+\((\d{4})\)/gm;
  let m: RegExpExecArray | null;

  while ((m = re.exec(content)) !== null) {
    const authors = m[1].trim();
    const year = parseInt(m[2], 10);
    if (!validYear(year) || isFalseAuthor(authors)) continue;

    // Skip if this is inside a bold marker (** before the author)
    const before = content.slice(Math.max(0, m.index - 3), m.index);
    if (before.includes("**")) continue;

    refs.push({
      title: `${authors} (${year})`,
      authors,
      year,
      url: scholarUrl(authors, undefined, year),
    });
  }
  return refs;
}

/* ── dedup ──────────────────────────────────────────────────────── */

function dedup(refs: Reference[]): Reference[] {
  const byKey = new Map<string, Reference>();

  for (const r of refs) {
    const tKey = normalizeTitle(r.title);
    const ayKey = r.authors && r.year
      ? `ay:${r.authors.toLowerCase().replace(/\s+/g, " ")}:${r.year}`
      : null;

    const existing = byKey.get(tKey) || (ayKey ? byKey.get(ayKey) : null);

    const score = (ref: Reference) =>
      (ref.authors ? 1 : 0) + (ref.year ? 1 : 0) + (ref.venue ? 1 : 0) + (ref.title.length > 30 ? 1 : 0);

    if (!existing || score(r) > score(existing)) {
      byKey.set(tKey, r);
      if (ayKey) byKey.set(ayKey, r);
    }
  }

  // collect unique values
  const unique = new Map<string, Reference>();
  for (const r of byKey.values()) {
    const uk = `${normalizeTitle(r.title)}::${r.year ?? ""}`;
    if (!unique.has(uk)) unique.set(uk, r);
  }
  return Array.from(unique.values());
}

/* ── public API ─────────────────────────────────────────────────── */

export function extractReferences(content: string): Reference[] {
  return dedup([
    ...extractNumberedRefs(content),
    ...extractTableRefs(content),
    ...extractBoldAuthorYear(content),
    ...extractParenthetical(content),
    ...extractNarrativeCitations(content),
  ]);
}

const cache = new Map<string, Reference[]>();

export function getReferencesForSlug(slug: string): Reference[] {
  if (cache.has(slug)) return cache.get(slug)!;
  const file = resolveContentFile(slug);
  if (!file || !fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, "utf-8");
  const refs = extractReferences(content);
  cache.set(slug, refs);
  return refs;
}
