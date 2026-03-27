import { describe, it, expect } from "vitest";
import {
  computeFlag,
  parseFormKeyValues,
  parseTextMarkers,
  parseMarkers,
} from "../parsers";

// ---------------------------------------------------------------------------
// computeFlag
// ---------------------------------------------------------------------------
describe("computeFlag", () => {
  it("returns normal for value within range", () => {
    expect(computeFlag("5.0", "3.5-5.5")).toBe("normal");
  });

  it("returns high for value above range", () => {
    expect(computeFlag("6.0", "3.5-5.5")).toBe("high");
  });

  it("returns low for value below range", () => {
    expect(computeFlag("2.0", "3.5-5.5")).toBe("low");
  });

  it("returns high for value above < threshold", () => {
    expect(computeFlag("10", "< 5")).toBe("high");
  });

  it("returns normal for value below < threshold", () => {
    expect(computeFlag("3", "< 5")).toBe("normal");
  });

  it("returns normal for non-numeric value", () => {
    expect(computeFlag("negative", "Negativ")).toBe("normal");
  });

  it("handles Romanian Nedetectabil — positive value is high", () => {
    expect(computeFlag("1.884", "Nedetectabil")).toBe("high");
  });

  it("handles Romanian Nedetectabil — zero is normal", () => {
    expect(computeFlag("0", "Nedetectabil")).toBe("normal");
  });

  it("handles comma as decimal separator", () => {
    expect(computeFlag("5,5", "3,5-7,0")).toBe("normal");
  });
});

// ---------------------------------------------------------------------------
// parseFormKeyValues — mirrors actual ADN_HBV.pdf Unstructured output
// ---------------------------------------------------------------------------
describe("parseFormKeyValues", () => {
  it("parses a Title + FormKeysValues pair", () => {
    const elements = [
      { type: "Title", text: "ADN virus hepatic B (ADN HBV) cantitativs" },
      {
        type: "FormKeysValues",
        text: "1.884 UI/mL 3,28 log UI/mL (Nedetectabil) (Nedetectabil)",
      },
    ];
    const markers = parseFormKeyValues(elements);
    expect(markers).toHaveLength(1);
    expect(markers[0].name).toBe("ADN virus hepatic B (ADN HBV) cantitativs");
    expect(markers[0].value).toBe("1.884");
    expect(markers[0].unit).toBe("UI/mL");
    expect(markers[0].reference_range).toBe("Nedetectabil");
    expect(markers[0].flag).toBe("high");
  });

  it("skips administrative fields (RECOLTAT, LUCRAT, etc.)", () => {
    const elements = [
      { type: "Title", text: "Some lab name" },
      { type: "FormKeysValues", text: "RECOLTAT 2026-01-15" },
    ];
    const markers = parseFormKeyValues(elements);
    expect(markers).toHaveLength(0);
  });

  it("skips pair when no numeric value is found", () => {
    const elements = [
      { type: "Title", text: "Note" },
      { type: "FormKeysValues", text: "See physician (no numeric data)" },
    ];
    const markers = parseFormKeyValues(elements);
    expect(markers).toHaveLength(0);
  });

  it("handles NarrativeText as name element", () => {
    const elements = [
      { type: "NarrativeText", text: "Hemoglobina" },
      { type: "FormKeysValues", text: "14.5 g/dL (12.0-16.0)" },
    ];
    const markers = parseFormKeyValues(elements);
    expect(markers).toHaveLength(1);
    expect(markers[0].name).toBe("Hemoglobina");
    expect(markers[0].flag).toBe("normal");
  });

  it("parses multiple markers", () => {
    const elements = [
      { type: "Title", text: "Hemoglobina" },
      { type: "FormKeysValues", text: "14.5 g/dL (12.0-16.0)" },
      { type: "Title", text: "Leucocite" },
      { type: "FormKeysValues", text: "12.0 10^3/µL (4.0-10.0)" },
    ];
    const markers = parseFormKeyValues(elements);
    expect(markers).toHaveLength(2);
    expect(markers[1].flag).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// parseTextMarkers
// ---------------------------------------------------------------------------
describe("parseTextMarkers", () => {
  it("parses tab/space-aligned text rows", () => {
    const text = "Hemoglobina      14.5  g/dL  12.0-16.0";
    const markers = parseTextMarkers(text);
    expect(markers).toHaveLength(1);
    expect(markers[0].name).toBe("Hemoglobina");
    expect(markers[0].value).toBe("14.5");
    expect(markers[0].unit).toBe("g/dL");
    expect(markers[0].reference_range).toBe("12.0-16.0");
    expect(markers[0].flag).toBe("normal");
  });

  it("returns empty array for unrecognized text", () => {
    expect(parseTextMarkers("Nothing useful here")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// parseMarkers — routing logic
// ---------------------------------------------------------------------------
describe("parseMarkers", () => {
  it("prefers HTML tables when present", () => {
    const elements = [
      {
        type: "Table",
        metadata: {
          text_as_html:
            "<table><tr><td>Hemoglobina</td><td>14.5</td><td>g/dL</td><td>12.0-16.0</td></tr></table>",
        },
      },
      { type: "Title", text: "ADN HBV" },
      { type: "FormKeysValues", text: "1.884 UI/mL (Nedetectabil)" },
    ];
    const markers = parseMarkers(elements);
    expect(markers[0].name).toBe("Hemoglobina");
  });

  it("falls back to FormKeysValues when no table", () => {
    const elements = [
      { type: "Title", text: "ADN HBV" },
      { type: "FormKeysValues", text: "1.884 UI/mL (Nedetectabil)" },
    ];
    const markers = parseMarkers(elements);
    expect(markers).toHaveLength(1);
    expect(markers[0].name).toBe("ADN HBV");
  });

  it("deduplicates markers with the same name", () => {
    const elements = [
      { type: "Title", text: "Hemoglobina" },
      { type: "FormKeysValues", text: "14.5 g/dL (12.0-16.0)" },
      { type: "Title", text: "Hemoglobina" },
      { type: "FormKeysValues", text: "14.5 g/dL (12.0-16.0)" },
    ];
    const markers = parseMarkers(elements);
    expect(markers).toHaveLength(1);
  });
});
