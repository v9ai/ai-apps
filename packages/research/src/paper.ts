import type {
  ArxivPaper,
  CoreWork,
  CrossrefWork,
  OpenAlexWork,
  ResearchPaper,
  ScholarPaper,
  ZenodoRecord,
} from "./types";

// ─── Normalizers ─────────────────────────────────────────────────────────────

export function fromScholar(p: ScholarPaper): ResearchPaper {
  const authors = (p.authors ?? [])
    .map((a) => a.name)
    .filter((n): n is string => !!n);
  const pdf_url = p.openAccessPdf?.url;
  const primary_category = p.fieldsOfStudy?.[0];
  return {
    title: p.title ?? "",
    abstract_text: p.abstract,
    authors,
    year: p.year,
    doi: undefined,
    citation_count: p.citationCount,
    url: p.url,
    pdf_url,
    source: "semantic_scholar",
    source_id: p.paperId ?? "",
    fields_of_study: p.fieldsOfStudy,
    published_date: p.publicationDate,
    primary_category,
    categories: p.fieldsOfStudy,
    venue: p.venue,
  };
}

export function fromOpenAlex(w: OpenAlexWork): ResearchPaper {
  const abstract_text = reconstructOpenAlexAbstract(w.abstract_inverted_index);
  const authorships = w.authorships ?? [];
  const authors = authorships
    .map((a) => a.author?.display_name)
    .filter((n): n is string => !!n);

  const affiliationSet = new Set<string>();
  for (const a of authorships) {
    for (const inst of a.institutions ?? []) {
      if (inst.display_name) affiliationSet.add(inst.display_name);
    }
  }
  const affiliations = affiliationSet.size ? [...affiliationSet] : undefined;

  const venue = w.primary_location?.source?.display_name;
  const pdf_url = w.primary_location?.pdf_url ?? w.open_access?.oa_url;
  const url = w.primary_location?.landing_page_url;

  return {
    title: w.title ?? "",
    abstract_text,
    authors,
    year: w.publication_year,
    doi: w.doi,
    citation_count: w.cited_by_count,
    url,
    pdf_url,
    source: "open_alex",
    source_id: w.id ?? "",
    published_date: w.publication_year != null ? String(w.publication_year) : undefined,
    affiliations,
    venue,
  };
}

function reconstructOpenAlexAbstract(
  index: Record<string, number[]> | undefined,
): string | undefined {
  if (!index) return undefined;
  const positions: [number, string][] = [];
  for (const [word, idxs] of Object.entries(index)) {
    for (const pos of idxs) positions.push([pos, word]);
  }
  if (positions.length === 0) return undefined;
  positions.sort((a, b) => a[0] - b[0]);
  return positions.map(([, w]) => w).join(" ");
}

export function fromCrossref(w: CrossrefWork): ResearchPaper {
  const title = w.title?.[0] ?? "";
  const authors = (w.author ?? [])
    .map((a) => {
      if (a.given && a.family) return `${a.given} ${a.family}`;
      if (a.family) return a.family;
      if (a.given) return a.given;
      return "";
    })
    .filter((s) => s !== "");

  const abstract_text = w.abstract ? stripHtml(w.abstract) : undefined;

  const dateParts = w.published?.["date-parts"]?.[0];
  const published_date = dateParts
    ? dateParts.map((p) => String(p).padStart(2, "0")).join("-")
    : undefined;
  const year = dateParts?.[0];

  const pdf_url = w.link?.find((l) => l.URL)?.URL;

  return {
    title,
    abstract_text,
    authors,
    year,
    doi: w.DOI,
    citation_count: w["is-referenced-by-count"],
    url: w.URL,
    pdf_url,
    source: "crossref",
    source_id: w.DOI ?? "",
    published_date,
  };
}

export function fromCore(w: CoreWork): ResearchPaper {
  const authors = (w.authors ?? [])
    .map((a) => a.name)
    .filter((n): n is string => !!n);
  const pdf_url = w.downloadUrl ?? w.sourceFulltextUrls?.[0];
  return {
    title: w.title ?? "",
    abstract_text: w.abstract,
    authors,
    year: w.yearPublished,
    doi: w.doi,
    citation_count: w.citationCount,
    pdf_url,
    source: "core",
    source_id: w.id != null ? String(w.id) : "",
    published_date: w.yearPublished != null ? String(w.yearPublished) : undefined,
  };
}

export function fromArxiv(p: ArxivPaper): ResearchPaper {
  const year = p.published.slice(0, 4);
  const yearNum = /^\d{4}$/.test(year) ? Number(year) : undefined;
  const url = p.link_url ?? `https://arxiv.org/abs/${p.arxiv_id}`;
  const published_date = p.published.slice(0, 10) || undefined;
  const primary_category = p.categories[0];
  const categories = p.categories.length ? p.categories : undefined;
  const fields_of_study = p.categories.length ? p.categories : undefined;
  return {
    title: p.title.trim(),
    abstract_text: p.summary.trim(),
    authors: p.authors,
    year: yearNum,
    doi: p.doi,
    url,
    pdf_url: p.pdf_url,
    source: "arxiv",
    source_id: p.arxiv_id,
    fields_of_study,
    published_date,
    primary_category,
    categories,
  };
}

export function fromZenodo(r: ZenodoRecord): ResearchPaper {
  const pdf_url = zenodoPdfUrl(r);
  const url = r.links?.self_html;
  const source_id = r.id != null ? String(r.id) : "";
  const meta = r.metadata ?? {};
  const title = meta.title ?? r.title ?? "";
  const abstract_text = meta.description ? stripHtml(meta.description) : undefined;
  const authors = (meta.creators ?? [])
    .map((c) => c.name)
    .filter((n): n is string => !!n);
  const year = meta.publication_date?.slice(0, 4);
  const yearNum = year && /^\d{4}$/.test(year) ? Number(year) : undefined;
  const doi = meta.doi ?? r.doi;
  const rt = meta.resource_type;
  const primary_category = rt?.title ?? rt?.subtype;
  const cats: string[] = [];
  if (rt?.type) cats.push(rt.type);
  if (rt?.subtype) cats.push(rt.subtype);
  const categories = cats.length ? cats : undefined;

  return {
    title,
    abstract_text,
    authors,
    year: yearNum,
    doi,
    url,
    pdf_url,
    source: "zenodo",
    source_id,
    fields_of_study: meta.keywords,
    published_date: meta.publication_date,
    primary_category,
    categories,
  };
}

function zenodoPdfUrl(r: ZenodoRecord): string | undefined {
  return r.files?.find((f) => f.key?.endsWith(".pdf"))?.links?.self;
}

// ─── Dedup ───────────────────────────────────────────────────────────────────

/**
 * Remove near-duplicates by DOI (case-insensitive) and normalized title.
 * On collision, keeps the paper with more citations (tie → first seen).
 */
export function dedupePapers(papers: ResearchPaper[]): ResearchPaper[] {
  const byKey = new Map<string, ResearchPaper>();
  for (const p of papers) {
    const keys = dedupeKeys(p);
    let existing: ResearchPaper | undefined;
    let existingKey: string | undefined;
    for (const k of keys) {
      const hit = byKey.get(k);
      if (hit) {
        existing = hit;
        existingKey = k;
        break;
      }
    }
    if (!existing) {
      for (const k of keys) byKey.set(k, p);
      continue;
    }
    const winner = preferHigherCitations(existing, p);
    if (winner !== existing) {
      // Replace all keys pointing at existing with p, and add p's new keys.
      const existingKeys = dedupeKeys(existing);
      for (const k of existingKeys) byKey.delete(k);
      for (const k of keys) byKey.set(k, p);
    } else {
      // Still register any new keys from p so future dupes match.
      for (const k of keys) if (!byKey.has(k)) byKey.set(k, existing);
    }
    void existingKey;
  }
  const seen = new Set<ResearchPaper>();
  const out: ResearchPaper[] = [];
  for (const p of byKey.values()) {
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}

function dedupeKeys(p: ResearchPaper): string[] {
  const keys: string[] = [];
  if (p.doi) keys.push(`doi:${p.doi.toLowerCase().trim()}`);
  const t = normalizeTitle(p.title);
  if (t) keys.push(`title:${t}`);
  return keys;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function preferHigherCitations(a: ResearchPaper, b: ResearchPaper): ResearchPaper {
  const ca = a.citation_count;
  const cb = b.citation_count;
  if (ca != null && cb != null) return ca >= cb ? a : b;
  if (ca != null) return a;
  if (cb != null) return b;
  return a;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function stripHtml(input: string): string {
  let out = "";
  let inTag = false;
  for (const ch of input) {
    if (ch === "<") inTag = true;
    else if (ch === ">") inTag = false;
    else if (!inTag) out += ch;
  }
  return out.trim();
}
