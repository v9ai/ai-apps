import { normalizeDoi } from "./text";
import type { CslJsonResponse, PaperCandidate } from "./types";

const DOI_BASE = "https://doi.org";

/** Fetch CSL-JSON metadata for a DOI via content negotiation. */
export async function fetchDoiMetadata(
  doi: string,
): Promise<Partial<PaperCandidate> | null> {
  const normalized = normalizeDoi(doi);
  if (!normalized) return null;
  try {
    const resp = await fetch(`${DOI_BASE}/${normalized}`, {
      headers: { Accept: "application/vnd.citationstyles.csl+json" },
    });
    if (!resp.ok) {
      if (resp.status !== 404) {
        console.warn(`[DOI] ${resp.status} for ${normalized}`);
      }
      return null;
    }
    const data = (await resp.json()) as CslJsonResponse;
    const year =
      data.issued?.["date-parts"]?.[0]?.[0] ?? data.published?.["date-parts"]?.[0]?.[0];
    const authors = (data.author ?? [])
      .map((a) => a.name ?? `${a.given ?? ""} ${a.family ?? ""}`.trim())
      .filter((s) => s.length > 0);
    return {
      title: data.title ?? data["title-short"],
      doi: normalized,
      url: data.URL ?? `${DOI_BASE}/${normalized}`,
      year,
      authors,
      abstract: data.abstract,
      journal: data["container-title"] ?? data.publisher,
    };
  } catch (err) {
    console.error("[DOI] content negotiation failed:", err);
    return null;
  }
}
