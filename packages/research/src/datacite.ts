import { fetchJsonWithRetry } from "./retry";
import { normalizeDoi } from "./text";
import type { DataCiteItem, DataCiteResponse, PaperCandidate } from "./types";

const DEFAULT_BASE_URL = "https://api.datacite.org";

export interface DataCiteClientOptions {
  baseUrl?: string;
}

export class DataCiteClient {
  private readonly baseUrl: string;

  constructor(options: DataCiteClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  async search(query: string, pageSize = 10): Promise<PaperCandidate[]> {
    const resp = await fetchJsonWithRetry<DataCiteResponse>(
      `${this.baseUrl}/dois`,
      {
        params: { query, "page[size]": pageSize },
        apiName: "DataCite",
      },
    );
    return (resp.data ?? []).map(toCandidate);
  }
}

function toCandidate(item: DataCiteItem): PaperCandidate {
  const attrs = item.attributes ?? {};
  const doi = normalizeDoi(attrs.doi);
  const year = attrs.publicationYear;
  const authors = (attrs.creators ?? [])
    .map((c) => c.name ?? `${c.givenName ?? ""} ${c.familyName ?? ""}`.trim())
    .filter((n) => n.length > 0);
  const abstract = attrs.descriptions?.find(
    (d) => d.descriptionType === "Abstract",
  )?.description;
  return {
    title: attrs.titles?.[0]?.title ?? "Untitled",
    doi,
    url: attrs.url ?? (doi ? `https://doi.org/${doi}` : undefined),
    year,
    source: "datacite",
    authors,
    abstract,
    journal: attrs.container?.title ?? attrs.publisher,
  };
}

export async function searchDataCite(
  query: string,
  limit = 10,
): Promise<PaperCandidate[]> {
  try {
    return await new DataCiteClient().search(query, limit);
  } catch (err) {
    console.error("[DataCite] search failed:", err);
    return [];
  }
}
