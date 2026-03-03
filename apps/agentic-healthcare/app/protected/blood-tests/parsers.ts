export type Marker = {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  flag: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function computeFlag(value: string, reference_range: string): string {
  const num = parseFloat(value.replace(",", "."));
  if (isNaN(num)) return "normal";

  // If reference is "undetectable / negative" and we have a value → high
  if (/nedetectabil|undetectable|negativ|negative/i.test(reference_range)) {
    return num > 0 ? "high" : "normal";
  }

  const ltMatch = reference_range.match(/^[<＜≤]\s*([\d.,]+)/);
  const gtMatch = reference_range.match(/^[>＞≥]\s*([\d.,]+)/);
  if (ltMatch) return num >= parseFloat(ltMatch[1].replace(",", ".")) ? "high" : "normal";
  if (gtMatch) return num <= parseFloat(gtMatch[1].replace(",", ".")) ? "low" : "normal";

  const rangeMatch = reference_range.match(/([\d.,]+)\s*[-–]\s*([\d.,]+)/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1].replace(",", "."));
    const high = parseFloat(rangeMatch[2].replace(",", "."));
    if (!isNaN(low) && !isNaN(high)) {
      if (num < low) return "low";
      if (num > high) return "high";
    }
  }
  return "normal";
}

/** Parse HTML tables (e.g. standard lab panels) */
function parseHtmlTable(html: string): Marker[] {
  const markers: Marker[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(stripHtml(cellMatch[1]));
    }
    if (cells.length < 2) continue;
    const [name, value, unit = "", reference_range = ""] = cells;
    if (!name || !/\d/.test(value) || /^\d/.test(name)) continue;
    markers.push({
      name: name.trim(),
      value: value.trim(),
      unit: unit.trim(),
      reference_range: reference_range.trim(),
      flag: computeFlag(value, reference_range),
    });
  }
  return markers;
}

/** Parse Title + FormKeysValues pairs (Romanian/European lab format) */
export function parseFormKeyValues(
  elements: Array<{ [k: string]: any }>
): Marker[] {
  const markers: Marker[] = [];

  const SKIP_PATTERN =
    /^(RECOLTAT|LUCRAT|GENERAT|CNP|ADRESA|TRIMIS|ANTECEDENT|Data|Pagina)/i;

  for (let i = 0; i < elements.length - 1; i++) {
    const el = elements[i];
    const next = elements[i + 1];

    if (
      (el.type === "Title" || el.type === "NarrativeText") &&
      next?.type === "FormKeysValues"
    ) {
      const name = el.text?.trim() ?? "";
      const valueText = next.text?.trim() ?? "";

      if (!name || !valueText || SKIP_PATTERN.test(valueText)) continue;

      // Extract first numeric token + its unit
      const valueMatch = valueText.match(/([\d.,]+)\s*([\w/µ%µgLdlUIuimlog]+)/);
      if (!valueMatch) continue;

      const value = valueMatch[1];
      const unit = valueMatch[2];

      // Last parenthetical is typically the reference
      const refs = [...valueText.matchAll(/\(([^)]+)\)/g)];
      const reference_range = refs.length > 0 ? refs[refs.length - 1][1] : "";

      markers.push({
        name,
        value,
        unit,
        reference_range,
        flag: computeFlag(value, reference_range),
      });
      i++; // skip the FormKeysValues element
    }
  }

  return markers;
}

/** Flexible line-based text parser (tab / multi-space separated) */
export function parseTextMarkers(text: string): Marker[] {
  const markers: Marker[] = [];
  const pattern =
    /^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 \-/().]+?)\s{2,}([\d.,]+)\s+([\w/µ%µgLdlUIuIU]+)\s+([\d.,]+\s*[-–]\s*[\d.,]+|[<>≤≥＜＞]\s*[\d.,]+)/gm;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const [, name, value, unit, reference_range] = match;
    markers.push({
      name: name.trim(),
      value: value.trim(),
      unit: unit.trim(),
      reference_range: reference_range.trim(),
      flag: computeFlag(value, reference_range),
    });
  }
  return markers;
}

export function parseMarkers(
  elements: Array<{ [k: string]: any }>
): Marker[] {
  // 1. HTML tables
  const tableMarkers: Marker[] = [];
  for (const el of elements) {
    if (el.type === "Table" && el.metadata?.text_as_html) {
      tableMarkers.push(...parseHtmlTable(el.metadata.text_as_html));
    }
  }
  if (tableMarkers.length > 0) return dedupe(tableMarkers);

  // 2. Title + FormKeysValues pairs (European lab format)
  const fkvMarkers = parseFormKeyValues(elements);
  if (fkvMarkers.length > 0) return dedupe(fkvMarkers);

  // 3. Text fallback
  const text = elements.map((el) => el.text ?? "").join("\n");
  return dedupe(parseTextMarkers(text));
}

function dedupe(markers: Marker[]): Marker[] {
  const seen = new Set<string>();
  return markers.filter((m) => {
    if (seen.has(m.name)) return false;
    seen.add(m.name);
    return true;
  });
}
