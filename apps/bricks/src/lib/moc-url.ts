/** Parse a Rebrickable MOC URL into structured metadata. */
export function parseMocUrl(url: string) {
  const cleaned = url.trim().replace(/\/+$/, "");
  const match = cleaned.match(/rebrickable\.com\/mocs\/(MOC-\d+)\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error(`Invalid Rebrickable MOC URL: ${url}`);

  const mocId = match[1];
  const designer = decodeURIComponent(match[2]);
  const name = decodeURIComponent(match[3])
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return { mocId, designer, name, url: cleaned };
}
