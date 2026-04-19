import { fetchWithRetry } from "./retry";
import { normalizeDoi } from "./text";
import type { UnpaywallResponse } from "./types";

const DEFAULT_BASE_URL = "https://api.unpaywall.org/v2";

export interface UnpaywallClientOptions {
  /** Required by the Unpaywall API. */
  email: string;
  baseUrl?: string;
}

export class UnpaywallClient {
  private readonly baseUrl: string;
  private readonly email: string;

  constructor(options: UnpaywallClientOptions) {
    if (!options.email) throw new Error("UnpaywallClient requires an email");
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.email = options.email;
  }

  async getOa(doi: string): Promise<{ oaUrl?: string; oaStatus?: string } | null> {
    const normalized = normalizeDoi(doi);
    if (!normalized) return null;
    const resp = await fetchWithRetry(`${this.baseUrl}/${normalized}`, {
      params: { email: this.email },
      apiName: "Unpaywall",
    });
    if (!resp.ok) {
      if (resp.status !== 404) {
        console.warn(`[Unpaywall] ${resp.status} for ${normalized}`);
      }
      return null;
    }
    const data = (await resp.json()) as UnpaywallResponse;
    return {
      oaUrl: data.best_oa_location?.url_for_pdf ?? data.best_oa_location?.url,
      oaStatus: data.oa_status,
    };
  }
}

export async function getUnpaywallOaUrl(
  doi: string,
): Promise<{ oaUrl?: string; oaStatus?: string } | null> {
  const email = process.env.UNPAYWALL_EMAIL ?? process.env.RESEARCH_MAILTO;
  if (!email) return null;
  try {
    return await new UnpaywallClient({ email }).getOa(doi);
  } catch (err) {
    console.error("[Unpaywall] lookup failed:", err);
    return null;
  }
}
