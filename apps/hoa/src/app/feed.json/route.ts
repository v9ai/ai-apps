import { NextResponse } from "next/server";
import {
  getAllPersonalities,
  getCategoryForPersonality,
  getAvatarUrl,
} from "@/lib/personalities";

const SITE_URL = "https://humansofai.space";

export async function GET() {
  try {
    const personalities = getAllPersonalities();

    const items = personalities.map((p) => {
      const category = getCategoryForPersonality(p.slug);
      const avatarUrl = getAvatarUrl(p);

      const item: Record<string, unknown> = {
        id: p.slug,
        url: `${SITE_URL}/person/${p.slug}`,
        title: p.name,
        content_text: `${p.role} at ${p.org}. ${p.description}`,
        summary: p.description,
        authors: [{ name: p.name }],
      };

      if (category) {
        item.tags = [category.title];
      }

      if (avatarUrl) {
        item.image = avatarUrl;
      }

      return item;
    });

    const feed = {
      version: "https://jsonfeed.org/version/1.1",
      title: "Humans of AI",
      description: "Intimate portraits of the minds building artificial intelligence",
      home_page_url: SITE_URL,
      feed_url: `${SITE_URL}/feed.json`,
      language: "en-US",
      icon: `${SITE_URL}/favicon/apple-touch-icon.png`,
      favicon: `${SITE_URL}/favicon/favicon-32x32.png`,
      authors: [{ name: "Humans of AI", url: SITE_URL }],
      items,
    };

    return NextResponse.json(feed, {
      headers: {
        "Content-Type": "application/feed+json; charset=utf-8",
        "Cache-Control": "public, s-maxage=86400",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate JSON feed";
    return NextResponse.json(
      {
        version: "https://jsonfeed.org/version/1.1",
        title: "Humans of AI",
        items: [],
        _error: message,
      },
      { status: 500 },
    );
  }
}
