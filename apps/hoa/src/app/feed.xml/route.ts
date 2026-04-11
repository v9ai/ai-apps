import {
  getAllPersonalities,
  getCategoryForPersonality,
} from "@/lib/personalities";
import { getEnrichment } from "@/lib/enrichment";

const SITE_URL = "https://humansofai.space";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  try {
    const personalities = getAllPersonalities();
    const pubDate = new Date().toUTCString();

    const items = personalities
      .map((p) => {
        const category = getCategoryForPersonality(p.slug);
        const enrichment = getEnrichment(p.slug);
        const imageUrl = enrichment?.imageUrl;

        return `    <item>
      <title>${escapeXml(p.name)}</title>
      <description>${escapeXml(p.description)}</description>
      <link>${SITE_URL}/person/${p.slug}</link>
      <guid isPermaLink="false">${escapeXml(p.slug)}</guid>${category ? `\n      <category>${escapeXml(category.title)}</category>` : ""}
      <pubDate>${pubDate}</pubDate>
      <dc:creator>${escapeXml(p.role)} at ${escapeXml(p.org)}</dc:creator>${imageUrl ? `\n      <enclosure url="${escapeXml(imageUrl)}" type="image/jpeg" length="0" />` : ""}
    </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Humans of AI</title>
    <description>Intimate portraits of the minds building artificial intelligence</description>
    <link>${SITE_URL}</link>
    <language>en-us</language>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <managingEditor>hello@humansofai.space</managingEditor>
    <webMaster>hello@humansofai.space</webMaster>
    <copyright>Copyright ${new Date().getFullYear()} Humans of AI</copyright>
    <generator>Next.js</generator>
    <image>
      <url>${SITE_URL}/favicon/apple-touch-icon.png</url>
      <title>Humans of AI</title>
      <link>${SITE_URL}</link>
    </image>
${items}
  </channel>
</rss>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=86400",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate RSS feed";
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Error</title><description>${escapeXml(message)}</description></channel></rss>`,
      {
        status: 500,
        headers: { "Content-Type": "application/xml; charset=utf-8" },
      },
    );
  }
}
