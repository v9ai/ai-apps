/**
 * OpenAlex Abstract Enrichment
 * 
 * OpenAlex provides abstracts via inverted index that Crossref often lacks.
 * This tool fetches and reconstructs abstracts from DOIs.
 */

export type OpenAlexWork = {
  abstract_inverted_index?: Record<string, number[]>;
  publication_year?: number;
  host_venue?: { display_name?: string };
  authorships?: Array<{ author?: { display_name?: string } }>;
};

/**
 * Reconstruct abstract from OpenAlex inverted index
 */
function reconstructAbstract(inv?: Record<string, number[]>): string {
  if (!inv) return "";
  
  const positions: Array<[number, string]> = [];
  for (const [word, idxs] of Object.entries(inv)) {
    for (const i of idxs) {
      positions.push([i, word]);
    }
  }
  
  positions.sort((a, b) => a[0] - b[0]);
  return positions.map(([, w]) => w).join(" ").trim();
}

/**
 * Fetch abstract and metadata from OpenAlex by DOI
 */
export async function fetchOpenAlexAbstractByDoi(doi: string): Promise<{
  abstract?: string;
  venue?: string | null;
  year?: number | null;
  authors?: string[];
}> {
  try {
    const clean = doi.toLowerCase().replace(/^doi:\s*/i, "").trim();
    const url = `https://api.openalex.org/works/doi:${encodeURIComponent(clean)}`;

    const res = await fetch(url, {
      headers: {
        "accept": "application/json",
        "user-agent": "AI-Therapist/1.0 (mailto:research@example.com)",
      },
    });

    if (!res.ok) {
      if (res.status !== 404) {
        console.warn(`OpenAlex API error for ${doi}: ${res.status}`);
      }
      return {};
    }

    const data = (await res.json()) as OpenAlexWork;
    const abstract = reconstructAbstract(data.abstract_inverted_index);

    return {
      abstract: abstract || undefined,
      venue: data.host_venue?.display_name ?? null,
      year: data.publication_year ?? null,
      authors: data.authorships?.map(a => a.author?.display_name).filter(Boolean) as string[] ?? [],
    };
  } catch (error) {
    console.error(`Error fetching OpenAlex abstract for ${doi}:`, error);
    return {};
  }
}

/**
 * Batch fetch abstracts for multiple DOIs
 */
export async function batchFetchOpenAlexAbstracts(
  dois: string[],
  concurrency: number = 10,
): Promise<Map<string, { abstract?: string; venue?: string | null; year?: number | null }>> {
  const results = new Map();
  
  // Process in batches to avoid rate limiting
  for (let i = 0; i < dois.length; i += concurrency) {
    const batch = dois.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (doi) => ({
        doi,
        data: await fetchOpenAlexAbstractByDoi(doi),
      })),
    );
    
    for (const { doi, data } of batchResults) {
      if (data.abstract) {
        results.set(doi, data);
      }
    }
    
    // Small delay between batches
    if (i + concurrency < dois.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

export const openAlexTools = {
  fetchAbstractByDoi: fetchOpenAlexAbstractByDoi,
  batchFetchAbstracts: batchFetchOpenAlexAbstracts,
};
