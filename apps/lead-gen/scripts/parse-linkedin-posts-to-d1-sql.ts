import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, type HTMLElement } from "node-html-parser";

const COMPANY_KEY = "durlston-partners";
const AUTHOR_KIND = "company";
const INPUT = join(process.cwd(), "linkedin-posts.txt");
const OUTPUT = join(process.cwd(), "edge/seeds/durlston-partners-posts.sql");

interface ExtractedPost {
  postUrl: string | null;
  postText: string;
  postedDate: string | null;
  reactionsCount: number;
  commentsCount: number;
  repostsCount: number;
  mediaType: string;
  isRepost: boolean;
  originalAuthor: string | null;
  authorName: string | null;
  authorUrl: string | null;
}

function textOf(el: HTMLElement | null): string {
  return (el?.textContent || "").trim();
}

function firstMatchingButtonCount(post: HTMLElement, re: RegExp): number {
  const candidates = post.querySelectorAll("button, a");
  for (const c of candidates) {
    const txt = c.textContent || "";
    if (re.test(txt) && /\d/.test(txt)) {
      const n = parseInt(txt.replace(/[^0-9]/g, ""), 10);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function extract(root: HTMLElement): ExtractedPost[] {
  // Use a Set to dedupe overlapping selector matches (.feed-shared-update-v2 + .occludable-update can both match the same node).
  const seen = new Set<HTMLElement>();
  const posts: ExtractedPost[] = [];

  const candidates = [
    ...root.querySelectorAll(".feed-shared-update-v2"),
    ...root.querySelectorAll(".occludable-update"),
  ];

  for (const postEl of candidates) {
    if (seen.has(postEl)) continue;
    seen.add(postEl);

    if (postEl.querySelector(".feed-shared-update-v2__ad-badge")) continue;
    if (postEl.querySelector('[data-test-id="feed-shared-update-v2__sponsored"]'))
      continue;

    const textEl =
      postEl.querySelector(".feed-shared-update-v2__description") ||
      postEl.querySelector(".update-components-text") ||
      postEl.querySelector(".feed-shared-text__text-view") ||
      postEl.querySelector(".feed-shared-inline-show-more-text");
    const postText = textOf(textEl);

    const timeEl = postEl.querySelector("time");
    const postedDate =
      timeEl?.getAttribute("datetime") ||
      textOf(postEl.querySelector(".update-components-actor__sub-description")) ||
      null;

    const reactionsEl =
      postEl.querySelector(".social-details-social-counts__reactions-count") ||
      postEl.querySelector('[data-test-id="social-actions__reaction-count"]');
    const reactionsCount =
      parseInt((reactionsEl?.textContent || "0").replace(/[^0-9]/g, ""), 10) || 0;

    const commentsCount = firstMatchingButtonCount(postEl, /comment/i);
    const repostsCount = firstMatchingButtonCount(postEl, /repost/i);

    let mediaType = "none";
    if (postEl.querySelector("video") || postEl.querySelector(".update-components-linkedin-video"))
      mediaType = "video";
    else if (postEl.querySelector(".update-components-article")) mediaType = "article";
    else if (postEl.querySelector(".update-components-document")) mediaType = "document";
    else if (postEl.querySelector(".update-components-poll")) mediaType = "poll";
    else if (
      postEl.querySelector(".feed-shared-image") ||
      postEl.querySelector(".update-components-image") ||
      postEl.querySelector(".ivm-image-view-model")
    )
      mediaType = "image";

    const headerEl =
      postEl.querySelector(".update-components-header__text-view") ||
      postEl.querySelector(".update-components-header");
    const isRepost = /reposted/i.test(headerEl?.textContent || "");
    const originalAuthor = isRepost
      ? textOf(postEl.querySelector(".update-components-actor__name")) || null
      : null;

    const authorName = textOf(postEl.querySelector(".update-components-actor__name")) || null;
    const authorLinkEl =
      postEl.querySelector(".update-components-actor__container-link") ||
      postEl.querySelector(".update-components-actor__meta-link");
    const authorHref = authorLinkEl?.getAttribute("href") || null;
    const authorUrl = authorHref ? authorHref.split("?")[0] : null;

    const urn =
      postEl.getAttribute("data-urn") ||
      postEl.querySelector("[data-urn]")?.getAttribute("data-urn") ||
      null;
    const postUrl = urn ? `https://www.linkedin.com/feed/update/${urn}/` : null;

    posts.push({
      postUrl,
      postText,
      postedDate,
      reactionsCount,
      commentsCount,
      repostsCount,
      mediaType,
      isRepost,
      originalAuthor,
      authorName,
      authorUrl,
    });
  }

  return posts;
}

function sqlString(v: string | null | undefined): string {
  if (v == null) return "NULL";
  // Collapse whitespace inside post text so each INSERT stays on one line.
  const collapsed = v.replace(/\r/g, "").replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
  return `'${collapsed.replace(/'/g, "''")}'`;
}

function toInsert(p: ExtractedPost): string {
  const cols = [
    "company_key",
    "author_kind",
    "author_name",
    "author_url",
    "post_url",
    "post_text",
    "posted_date",
    "reactions_count",
    "comments_count",
    "reposts_count",
    "media_type",
    "is_repost",
    "original_author",
  ];
  const vals = [
    sqlString(COMPANY_KEY),
    sqlString(AUTHOR_KIND),
    sqlString(p.authorName),
    sqlString(p.authorUrl),
    sqlString(p.postUrl),
    sqlString(p.postText),
    sqlString(p.postedDate),
    String(p.reactionsCount),
    String(p.commentsCount),
    String(p.repostsCount),
    sqlString(p.mediaType),
    p.isRepost ? "1" : "0",
    sqlString(p.originalAuthor),
  ];
  return `INSERT OR IGNORE INTO posts (${cols.join(", ")}) VALUES (${vals.join(", ")});`;
}

function main() {
  const html = readFileSync(INPUT, "utf8");
  const root = parse(html, { lowerCaseTagName: false, comment: false });
  const all = extract(root);
  const withUrl = all.filter((p) => p.postUrl);

  // Each post is wrapped by both .occludable-update and .feed-shared-update-v2;
  // querySelectorAll returns both wrappers. Dedupe by post_url, preferring
  // the row with the longest post_text (more complete extraction wins).
  const byUrl = new Map<string, ExtractedPost>();
  for (const p of withUrl) {
    const existing = byUrl.get(p.postUrl!);
    if (!existing || (p.postText?.length || 0) > (existing.postText?.length || 0)) {
      byUrl.set(p.postUrl!, p);
    }
  }
  const unique = [...byUrl.values()];

  const lines: string[] = [];
  lines.push(`-- ${unique.length} posts for company_key='${COMPANY_KEY}'`);
  lines.push(`-- Generated from linkedin-posts.txt (${all.length} elements parsed, ${withUrl.length} with URN, deduped to ${unique.length})`);
  lines.push("");
  for (const p of unique) lines.push(toInsert(p));
  writeFileSync(OUTPUT, lines.join("\n") + "\n", "utf8");

  console.log(`Parsed: ${all.length} elements`);
  console.log(`With URN: ${withUrl.length}`);
  console.log(`Unique posts: ${unique.length}`);
  console.log(`Wrote ${OUTPUT}`);
}

main();
