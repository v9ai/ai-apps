import type { PaperCandidate } from "./types";

const BOOK_CHAPTER_TYPES = new Set([
  "book-chapter",
  "book-section",
  "book-part",
  "reference-entry",
  "book",
  "monograph",
  "edited-book",
  "reference-book",
]);

/** Drop book chapters and book-like publication types. */
export function filterBookChapters(candidates: PaperCandidate[]): PaperCandidate[] {
  return candidates.filter((c) => {
    if (!c.publicationType) return true;
    return !BOOK_CHAPTER_TYPES.has(c.publicationType);
  });
}

/** Drop candidates whose abstract is missing or shorter than `minLength` chars. */
export function filterShortAbstracts(
  candidates: PaperCandidate[],
  minLength = 200,
): PaperCandidate[] {
  return candidates.filter(
    (c) => typeof c.abstract === "string" && c.abstract.length >= minLength,
  );
}

export interface QualityFilterOptions {
  minAbstractLength?: number;
  skipAbstractCheck?: boolean;
  /** Caller-supplied extra filters (e.g. domain-specific keyword exclusions). */
  extraFilters?: Array<(c: PaperCandidate[]) => PaperCandidate[]>;
}

/** Compose package filters + caller-supplied filters into a single pipeline. */
export function applyQualityFilters(
  candidates: PaperCandidate[],
  opts: QualityFilterOptions = {},
): PaperCandidate[] {
  let out = filterBookChapters(candidates);
  for (const fn of opts.extraFilters ?? []) out = fn(out);
  if (!opts.skipAbstractCheck) {
    out = filterShortAbstracts(out, opts.minAbstractLength ?? 200);
  }
  return out;
}
