import { describe, expect, it } from "@jest/globals";
import { OpenAlexClient } from "../openalex";
import { SemanticScholarClient } from "../scholar";
import { searchPapers } from "../search";

const hasOpenAlex = true; // no key needed, but may be offline
const hasScholar = !!process.env.SEMANTIC_SCHOLAR_API_KEY;

const itif = (cond: boolean) => (cond ? it : it.skip);

describe("OpenAlex live", () => {
  itif(hasOpenAlex)(
    "returns at least one paper for a common query",
    async () => {
      const client = new OpenAlexClient({ mailto: process.env.RESEARCH_MAILTO });
      const resp = await client.search("retrieval augmented generation", 1, 5);
      expect(resp.results.length).toBeGreaterThan(0);
    },
    30000,
  );
});

describe("Semantic Scholar live", () => {
  itif(hasScholar)(
    "returns at least one paper",
    async () => {
      const client = new SemanticScholarClient({ apiKey: process.env.SEMANTIC_SCHOLAR_API_KEY });
      const resp = await client.searchBulk("transformer attention", { limit: 5 });
      expect(resp.data.length).toBeGreaterThan(0);
    },
    30000,
  );
});

describe("searchPapers live", () => {
  itif(hasOpenAlex)(
    "finds papers via the default fallback chain",
    async () => {
      const result = await searchPapers({ query: "graph neural networks", limit: 5 });
      expect(result.papers.length).toBeGreaterThan(0);
      expect(result.papers[0]!.title).toBeTruthy();
    },
    45000,
  );
});
