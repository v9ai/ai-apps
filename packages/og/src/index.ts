import ogs from "open-graph-scraper";

export interface OGResult {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
}

const DEFAULT_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

export async function extractOG(
  url: string,
  userAgent = DEFAULT_UA
): Promise<OGResult> {
  const { result } = await ogs({
    url,
    fetchOptions: { headers: { "User-Agent": userAgent } },
  });
  return {
    title: result.ogTitle,
    description: result.ogDescription,
    image: Array.isArray(result.ogImage) ? result.ogImage[0]?.url : undefined,
    url: result.ogUrl,
    siteName: result.ogSiteName,
  };
}

/** Extract the og:title (display name) from a URL */
export async function extractName(url: string): Promise<string | undefined> {
  const { title } = await extractOG(url);
  return title;
}
