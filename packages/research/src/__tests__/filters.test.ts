import { describe, expect, it } from "@jest/globals";
import {
  applyQualityFilters,
  filterBookChapters,
  filterShortAbstracts,
} from "../filters";
import { dedupeCandidates } from "../candidate";
import type { PaperCandidate } from "../types";

function cand(over: Partial<PaperCandidate>): PaperCandidate {
  return { title: "T", source: "crossref", ...over };
}

describe("filterBookChapters", () => {
  it("removes book-chapter / book-section / reference-entry types", () => {
    const a = cand({ publicationType: "journal-article", title: "A" });
    const b = cand({ publicationType: "book-chapter", title: "B" });
    const c = cand({ publicationType: "reference-entry", title: "C" });
    const d = cand({ title: "D" }); // no type → kept
    expect(filterBookChapters([a, b, c, d]).map((x) => x.title)).toEqual(["A", "D"]);
  });
});

describe("filterShortAbstracts", () => {
  it("drops candidates with missing or short abstracts", () => {
    const a = cand({ title: "A", abstract: "x".repeat(300) });
    const b = cand({ title: "B", abstract: "short" });
    const c = cand({ title: "C" });
    expect(filterShortAbstracts([a, b, c], 200).map((x) => x.title)).toEqual(["A"]);
  });
});

describe("applyQualityFilters", () => {
  it("runs book + abstract filters together and accepts extra filters", () => {
    const input: PaperCandidate[] = [
      cand({ title: "A", abstract: "x".repeat(300), publicationType: "journal-article" }),
      cand({ title: "B", abstract: "x".repeat(300), publicationType: "book" }),
      cand({ title: "KeywordDropMe", abstract: "x".repeat(300), publicationType: "journal-article" }),
    ];
    const dropKeyword = (cs: PaperCandidate[]) => cs.filter((c) => !/KeywordDropMe/.test(c.title));
    const out = applyQualityFilters(input, { extraFilters: [dropKeyword] });
    expect(out.map((c) => c.title)).toEqual(["A"]);
  });

  it("can skip the abstract check", () => {
    const input: PaperCandidate[] = [cand({ title: "A", abstract: "short", publicationType: "journal-article" })];
    const out = applyQualityFilters(input, { skipAbstractCheck: true });
    expect(out.length).toBe(1);
  });
});

describe("dedupeCandidates", () => {
  it("dedupes by normalized DOI (URL form equivalent)", () => {
    const a = cand({ title: "A", doi: "https://doi.org/10.1/ABC" });
    const b = cand({ title: "A variant", doi: "10.1/abc" });
    const out = dedupeCandidates([a, b]);
    expect(out.length).toBe(1);
    expect(out[0]!.doi).toBe("10.1/abc");
  });
  it("dedupes by title fingerprint when DOI missing", () => {
    const a = cand({ title: "Hello, World!" });
    const b = cand({ title: "hello world" });
    expect(dedupeCandidates([a, b]).length).toBe(1);
  });
});
