import { describe, expect, it } from "@jest/globals";
import { normalizeDoi, stripJats, titleFingerprint } from "../text";

describe("normalizeDoi", () => {
  it("lowercases and strips doi.org URL prefixes", () => {
    expect(normalizeDoi("https://doi.org/10.1000/ABC")).toBe("10.1000/abc");
    expect(normalizeDoi("HTTPS://DX.DOI.ORG/10.1000/XYZ")).toBe("10.1000/xyz");
    expect(normalizeDoi("doi:10.1/abc")).toBe("10.1/abc");
    expect(normalizeDoi("  10.1/QWE  ")).toBe("10.1/qwe");
  });
  it("returns undefined for empty/undefined", () => {
    expect(normalizeDoi(undefined)).toBeUndefined();
    expect(normalizeDoi("")).toBeUndefined();
    expect(normalizeDoi("   ")).toBeUndefined();
  });
});

describe("stripJats", () => {
  it("removes tags and decodes entities", () => {
    expect(stripJats("<jats:p>Hello &amp; bye</jats:p>")).toBe("Hello & bye");
    expect(stripJats("<p>Body <em>text</em>.</p>")).toBe("Body text .");
  });
});

describe("titleFingerprint", () => {
  it("is stable across punctuation/case/order", () => {
    const a = titleFingerprint("Attention Is All You Need");
    const b = titleFingerprint("attention,  is all you need!");
    expect(a).toBe(b);
  });
  it("drops short tokens and stopwords", () => {
    expect(titleFingerprint("The CAT and the Mat")).not.toContain("the");
    expect(titleFingerprint("The CAT and the Mat")).not.toContain("and");
  });
});
