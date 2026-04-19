import { describe, expect, it } from "@jest/globals";
import {
  dedupePapers,
  fromArxiv,
  fromCore,
  fromCrossref,
  fromOpenAlex,
  fromScholar,
  fromZenodo,
  stripHtml,
} from "../paper";
import type {
  ArxivPaper,
  CoreWork,
  CrossrefWork,
  OpenAlexWork,
  ResearchPaper,
  ScholarPaper,
  ZenodoRecord,
} from "../types";

describe("fromScholar", () => {
  it("normalizes a Scholar payload", () => {
    const s: ScholarPaper = {
      paperId: "abc123",
      title: "Attention Is All You Need",
      abstract: "The dominant sequence transduction...",
      year: 2017,
      citationCount: 100000,
      authors: [{ name: "Ashish Vaswani" }, { name: "Noam Shazeer" }, {}],
      fieldsOfStudy: ["Computer Science"],
      openAccessPdf: { url: "https://example.com/paper.pdf" },
      url: "https://example.com/paper",
      venue: "NeurIPS",
      publicationDate: "2017-06-12",
    };
    const r = fromScholar(s);
    expect(r.source).toBe("semantic_scholar");
    expect(r.source_id).toBe("abc123");
    expect(r.title).toBe("Attention Is All You Need");
    expect(r.authors).toEqual(["Ashish Vaswani", "Noam Shazeer"]);
    expect(r.citation_count).toBe(100000);
    expect(r.pdf_url).toBe("https://example.com/paper.pdf");
    expect(r.primary_category).toBe("Computer Science");
    expect(r.venue).toBe("NeurIPS");
  });
});

describe("fromOpenAlex", () => {
  it("reconstructs the inverted-index abstract", () => {
    const w: OpenAlexWork = {
      id: "https://openalex.org/W1",
      title: "Example",
      publication_year: 2021,
      cited_by_count: 7,
      authorships: [
        {
          author: { display_name: "Alice" },
          institutions: [{ display_name: "MIT" }],
        },
      ],
      abstract_inverted_index: {
        Hello: [0],
        world: [1],
        today: [2],
      },
      primary_location: {
        source: { display_name: "Nature" },
        pdf_url: "https://example.com/x.pdf",
        landing_page_url: "https://example.com/x",
      },
    };
    const r = fromOpenAlex(w);
    expect(r.abstract_text).toBe("Hello world today");
    expect(r.venue).toBe("Nature");
    expect(r.affiliations).toEqual(["MIT"]);
    expect(r.pdf_url).toBe("https://example.com/x.pdf");
    expect(r.url).toBe("https://example.com/x");
    expect(r.citation_count).toBe(7);
    expect(r.source).toBe("open_alex");
  });
});

describe("fromCrossref", () => {
  it("strips JATS and derives year/date", () => {
    const w: CrossrefWork = {
      DOI: "10.1000/xyz",
      title: ["Cross Paper"],
      abstract: "<jats:p>Body <em>text</em>.</jats:p>",
      author: [{ given: "Jane", family: "Doe" }, { family: "Smith" }],
      published: { "date-parts": [[2020, 3, 5]] },
      "is-referenced-by-count": 42,
      URL: "https://doi.org/10.1000/xyz",
    };
    const r = fromCrossref(w);
    expect(r.doi).toBe("10.1000/xyz");
    expect(r.source_id).toBe("10.1000/xyz");
    expect(r.year).toBe(2020);
    expect(r.published_date).toBe("2020-03-05");
    expect(r.authors).toEqual(["Jane Doe", "Smith"]);
    expect(r.abstract_text).toBe("Body text.");
    expect(r.citation_count).toBe(42);
  });
});

describe("fromCore", () => {
  it("normalizes a CORE work", () => {
    const w: CoreWork = {
      id: 555,
      title: "Core Paper",
      abstract: "Abs",
      authors: [{ name: "A" }],
      yearPublished: 2018,
      citationCount: 3,
      downloadUrl: "https://example.com/p.pdf",
    };
    const r = fromCore(w);
    expect(r.source).toBe("core");
    expect(r.source_id).toBe("555");
    expect(r.pdf_url).toBe("https://example.com/p.pdf");
    expect(r.year).toBe(2018);
  });
});

describe("fromArxiv", () => {
  it("derives year from published, uses default url", () => {
    const p: ArxivPaper = {
      arxiv_id: "2106.00001",
      title: "  Title  ",
      summary: "  Abs  ",
      authors: ["X"],
      published: "2021-06-01T00:00:00Z",
      categories: ["cs.LG", "cs.AI"],
      pdf_url: "https://arxiv.org/pdf/2106.00001.pdf",
    };
    const r = fromArxiv(p);
    expect(r.year).toBe(2021);
    expect(r.published_date).toBe("2021-06-01");
    expect(r.title).toBe("Title");
    expect(r.abstract_text).toBe("Abs");
    expect(r.primary_category).toBe("cs.LG");
    expect(r.url).toBe("https://arxiv.org/abs/2106.00001");
    expect(r.source).toBe("arxiv");
  });
});

describe("fromZenodo", () => {
  it("extracts pdf from files and strips HTML", () => {
    const z: ZenodoRecord = {
      id: 99,
      doi: "10.5281/zenodo.99",
      metadata: {
        title: "Z Paper",
        description: "<p>Hello</p>",
        publication_date: "2022-05-01",
        creators: [{ name: "Zoe" }],
      },
      files: [
        { key: "data.csv", links: { self: "https://example.com/data.csv" } },
        { key: "paper.pdf", links: { self: "https://example.com/paper.pdf" } },
      ],
      links: { self_html: "https://zenodo.org/records/99" },
    };
    const r = fromZenodo(z);
    expect(r.source).toBe("zenodo");
    expect(r.source_id).toBe("99");
    expect(r.year).toBe(2022);
    expect(r.pdf_url).toBe("https://example.com/paper.pdf");
    expect(r.abstract_text).toBe("Hello");
    expect(r.url).toBe("https://zenodo.org/records/99");
  });
});

describe("stripHtml", () => {
  it("removes tags and trims", () => {
    expect(stripHtml("  <b>Hi</b>  ")).toBe("Hi");
    expect(stripHtml("<p>a <i>b</i> c</p>")).toBe("a b c");
  });
});

describe("dedupePapers", () => {
  const base = (over: Partial<ResearchPaper>): ResearchPaper => ({
    title: "T",
    authors: [],
    source: "semantic_scholar",
    source_id: "x",
    ...over,
  });

  it("dedupes by DOI (case-insensitive) and keeps higher citation count", () => {
    const a = base({ doi: "10.1/ABC", citation_count: 5, title: "A" });
    const b = base({ doi: "10.1/abc", citation_count: 50, title: "B" });
    const out = dedupePapers([a, b]);
    expect(out.length).toBe(1);
    expect(out[0]!.citation_count).toBe(50);
  });

  it("dedupes by normalized title", () => {
    const a = base({ title: "Hello, World!", citation_count: 1 });
    const b = base({ title: "hello world", citation_count: 9 });
    const out = dedupePapers([a, b]);
    expect(out.length).toBe(1);
    expect(out[0]!.citation_count).toBe(9);
  });

  it("keeps distinct papers", () => {
    const a = base({ title: "One", doi: "10.1/a" });
    const b = base({ title: "Two", doi: "10.1/b" });
    expect(dedupePapers([a, b]).length).toBe(2);
  });
});
