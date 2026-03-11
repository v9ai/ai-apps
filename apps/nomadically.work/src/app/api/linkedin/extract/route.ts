import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LINKEDIN_URL_RE =
  /^https?:\/\/(www\.)?linkedin\.com\/(posts|feed|pulse|in)\/.+/i;

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

function extractOgTag(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const match = html.match(re);
  if (match) return match[1];
  // Try reversed attribute order (content before property)
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`,
    "i",
  );
  return html.match(re2)?.[1] ?? null;
}

function extractProfileUrl(html: string): string | null {
  const match = html.match(
    /https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+/i,
  );
  return match?.[0] ?? null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { url: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { url } = body;
  if (!url || !LINKEDIN_URL_RE.test(url)) {
    return NextResponse.json(
      { error: "Invalid LinkedIn URL. Must be a linkedin.com post, feed, pulse, or profile URL." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    const finalUrl = response.url;

    // Detect auth wall redirect
    if (finalUrl.includes("authwall") || finalUrl.includes("login")) {
      return NextResponse.json({
        authorName: null,
        authorHeadline: null,
        postText: null,
        postUrl: url,
        emails: [],
        imageUrl: null,
        extractionQuality: "failed" as const,
        reason: "LinkedIn requires authentication. Please paste the post content manually.",
      });
    }

    const html = await response.text();

    const rawTitle = extractOgTag(html, "title");
    const rawDescription = extractOgTag(html, "description");
    const imageUrl = extractOgTag(html, "image");
    const profileUrl = extractProfileUrl(html);

    const title = rawTitle ? decodeHtmlEntities(rawTitle) : null;
    const description = rawDescription ? decodeHtmlEntities(rawDescription) : null;

    // Parse author name from og:title (typically "AuthorName on LinkedIn: post title")
    let authorName: string | null = null;
    if (title) {
      const match = title.match(/^(.+?)\s+on\s+LinkedIn/i);
      authorName = match?.[1]?.trim() ?? null;
    }

    // Extract emails from description
    const emails = description ? [...new Set(description.match(EMAIL_RE) ?? [])] : [];

    const hasContent = !!(title || description);

    return NextResponse.json({
      authorName,
      authorHeadline: null, // Not reliably available from OG tags
      postText: description,
      postUrl: url,
      profileUrl,
      emails,
      imageUrl,
      extractionQuality: hasContent ? "partial" : "failed",
    });
  } catch (err) {
    return NextResponse.json(
      {
        authorName: null,
        authorHeadline: null,
        postText: null,
        postUrl: url,
        emails: [],
        imageUrl: null,
        extractionQuality: "failed" as const,
        reason: err instanceof Error ? err.message : "Extraction failed",
      },
    );
  }
}
