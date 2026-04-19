import { describe, expect, it } from "@jest/globals";
import { pickBestCandidate, scoreCandidate } from "../score";
import type { PaperCandidate } from "../types";

function cand(over: Partial<PaperCandidate>): PaperCandidate {
  return { title: "T", source: "crossref", ...over };
}

describe("scoreCandidate", () => {
  it("rewards title overlap + exact year match", () => {
    const target = { title: "Attention Is All You Need", year: 2017 };
    const good = cand({
      title: "Attention Is All You Need",
      year: 2017,
      doi: "10.1/abc",
      abstract: "Transformers ...",
      authors: ["Vaswani"],
      source: "semantic_scholar",
      citationCount: 100000,
    });
    const poor = cand({ title: "Unrelated paper", year: 1990, source: "datacite" });
    expect(scoreCandidate(good, target)).toBeGreaterThan(scoreCandidate(poor, target) + 40);
  });
});

describe("pickBestCandidate", () => {
  const target = { title: "Transformer architecture", year: 2017 };
  const a = cand({ title: "Transformer architecture", year: 2017, source: "openalex", doi: "10.1/a" });
  const b = cand({ title: "Unrelated random noise", year: 2000, source: "arxiv" });

  it("returns the top match above the floor", () => {
    expect(pickBestCandidate([a, b], target)?.doi).toBe("10.1/a");
  });

  it("returns null when nothing clears the floor", () => {
    expect(pickBestCandidate([b], { title: "Totally different subject line here", year: 2024 })).toBeNull();
  });

  it("returns null for empty candidates", () => {
    expect(pickBestCandidate([], target)).toBeNull();
  });
});
