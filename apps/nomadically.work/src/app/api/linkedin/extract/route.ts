import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/admin";
import ogs from "open-graph-scraper";

const DEFAULT_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

async function extractOG(url: string) {
  const { result } = await ogs({
    url,
    fetchOptions: { headers: { "User-Agent": DEFAULT_UA } },
  });
  return {
    title: result.ogTitle,
    description: result.ogDescription,
    image: Array.isArray(result.ogImage) ? result.ogImage[0]?.url : undefined,
    url: result.ogUrl,
    siteName: result.ogSiteName,
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LINKEDIN_URL_RE =
  /^https?:\/\/(www\.)?linkedin\.com\/(posts|feed|pulse|in)\/.+/i;

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

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
    const og = await extractOG(url);

    const title = og.title ?? null;
    const description = og.description ?? null;
    const imageUrl = og.image ?? null;

    // Detect auth wall via missing content
    if (!title && !description) {
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

    // Parse author name from og:title (typically "AuthorName on LinkedIn: post title")
    let authorName: string | null = null;
    if (title) {
      const match = title.match(/^(.+?)\s+on\s+LinkedIn/i);
      authorName = match?.[1]?.trim() ?? null;
    }

    // Extract emails from description
    const emails = description ? [...new Set(description.match(EMAIL_RE) ?? [])] : [];

    // Fallback: derive name from first email prefix (e.g. ashwin@weareorbis.com → "Ashwin")
    if (!authorName && emails.length > 0) {
      const prefix = emails[0].split("@")[0];
      const parts = prefix.split(/[._+-]+/).filter(Boolean);
      if (parts.length > 0) {
        authorName = parts
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
          .join(" ");
      }
    }

    // Derive company name from email domain (e.g. weareorbis.com → "Weareorbis")
    let companyName: string | null = null;
    if (emails.length > 0) {
      const domain = emails[0].split("@")[1];
      if (domain) {
        const name = domain.split(".")[0];
        if (name && !["gmail", "yahoo", "hotmail", "outlook", "protonmail", "icloud"].includes(name.toLowerCase())) {
          companyName = name.charAt(0).toUpperCase() + name.slice(1);
        }
      }
    }

    return NextResponse.json({
      authorName,
      authorHeadline: null,
      postText: description,
      postUrl: url,
      profileUrl: null,
      emails,
      imageUrl,
      companyName,
      extractionQuality: "partial" as const,
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
