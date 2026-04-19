import { describe, expect, it } from "@jest/globals";
import { critique } from "../critique";
import type { ResearchPaper } from "../types";

function mk(over: Partial<ResearchPaper>): ResearchPaper {
  return {
    title: "T",
    authors: [],
    source: "semantic_scholar",
    source_id: "x",
    ...over,
  };
}

describe("critique", () => {
  it("reports empty corpus as low quality", () => {
    const c = critique([]);
    expect(c.quality_score).toBe(0);
    expect(c.issues.length).toBeGreaterThan(0);
  });

  it("scores a reasonable corpus above 0.4", () => {
    const papers: ResearchPaper[] = [
      mk({ year: 2015, source: "semantic_scholar", citation_count: 200, abstract_text: "a", fields_of_study: ["CS"] }),
      mk({ year: 2018, source: "open_alex", citation_count: 120, abstract_text: "b", fields_of_study: ["Physics"] }),
      mk({ year: 2021, source: "crossref", citation_count: 80, abstract_text: "c", fields_of_study: ["Bio"] }),
      mk({ year: 2023, source: "arxiv", citation_count: 30, abstract_text: "d", fields_of_study: ["CS"] }),
      mk({ year: 2016, source: "semantic_scholar", citation_count: 50, abstract_text: "e", fields_of_study: ["Math"] }),
    ];
    const c = critique(papers, { current_year: 2026 });
    expect(c.quality_score).toBeGreaterThan(0.4);
    expect(c.dimension_scores.source_diversity).toBeGreaterThan(0);
    expect(c.dimension_scores.authority).toBeGreaterThan(0);
  });

  it("flags recency bias", () => {
    const papers: ResearchPaper[] = Array.from({ length: 5 }, (_, i) =>
      mk({ year: 2026, source_id: String(i) }),
    );
    const c = critique(papers, { current_year: 2026 });
    expect(c.issues.some((s) => s.toLowerCase().includes("recency"))).toBe(true);
  });

  it("flags narrow year range", () => {
    const papers: ResearchPaper[] = [
      mk({ year: 2020 }),
      mk({ year: 2020 }),
      mk({ year: 2021 }),
      mk({ year: 2021 }),
      mk({ year: 2021 }),
    ];
    const c = critique(papers, { current_year: 2026 });
    expect(c.issues.some((s) => s.toLowerCase().includes("narrow time range"))).toBe(true);
  });
});
