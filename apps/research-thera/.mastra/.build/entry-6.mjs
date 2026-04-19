"use strict";
function reconstructAbstract(inv) {
  if (!inv) return "";
  const positions = [];
  for (const [word, idxs] of Object.entries(inv)) {
    for (const i of idxs) {
      positions.push([i, word]);
    }
  }
  positions.sort((a, b) => a[0] - b[0]);
  return positions.map(([, w]) => w).join(" ").trim();
}
async function fetchOpenAlexAbstractByDoi(doi) {
  try {
    const clean = doi.toLowerCase().replace(/^doi:\s*/i, "").trim();
    const url = `https://api.openalex.org/works/doi:${encodeURIComponent(clean)}`;
    const res = await fetch(url, {
      headers: {
        "accept": "application/json",
        "user-agent": "AI-Therapist/1.0 (mailto:research@example.com)"
      }
    });
    if (!res.ok) {
      if (res.status !== 404) {
        console.warn(`OpenAlex API error for ${doi}: ${res.status}`);
      }
      return {};
    }
    const data = await res.json();
    const abstract = reconstructAbstract(data.abstract_inverted_index);
    return {
      abstract: abstract || void 0,
      venue: data.host_venue?.display_name ?? null,
      year: data.publication_year ?? null,
      authors: data.authorships?.map((a) => a.author?.display_name).filter(Boolean) ?? []
    };
  } catch (error) {
    console.error(`Error fetching OpenAlex abstract for ${doi}:`, error);
    return {};
  }
}
async function batchFetchOpenAlexAbstracts(dois, concurrency = 10) {
  const results = /* @__PURE__ */ new Map();
  for (let i = 0; i < dois.length; i += concurrency) {
    const batch = dois.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (doi) => ({
        doi,
        data: await fetchOpenAlexAbstractByDoi(doi)
      }))
    );
    for (const { doi, data } of batchResults) {
      if (data.abstract) {
        results.set(doi, data);
      }
    }
    if (i + concurrency < dois.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  return results;
}
const openAlexTools = {
  fetchAbstractByDoi: fetchOpenAlexAbstractByDoi,
  batchFetchAbstracts: batchFetchOpenAlexAbstracts
};

export { batchFetchOpenAlexAbstracts, fetchOpenAlexAbstractByDoi, openAlexTools };
