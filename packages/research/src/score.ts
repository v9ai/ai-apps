import { stripJats, titleFingerprint } from "./text";
import type { PaperCandidate } from "./types";

/** Score a candidate's likelihood of being a match for `target`. */
export function scoreCandidate(
  c: PaperCandidate,
  target: { title: string; year?: number },
): number {
  const cTitle = (c.title ?? "").trim();
  const tTitle = (target.title ?? "").trim();
  if (!cTitle || !tTitle) return -1;

  const fpC = titleFingerprint(cTitle);
  const fpT = titleFingerprint(tTitle);
  const setC = new Set(fpC.split(" ").filter(Boolean));
  const setT = new Set(fpT.split(" ").filter(Boolean));

  let overlap = 0;
  for (const tok of setT) if (setC.has(tok)) overlap++;
  const overlapRatio = overlap / Math.max(1, setT.size);

  let score = overlapRatio * 70;

  if (target.year && c.year) {
    const diff = Math.abs(target.year - c.year);
    score += diff === 0 ? 15 : diff === 1 ? 8 : diff <= 3 ? 2 : -5;
  }

  if (c.doi) score += 8;
  if (c.abstract && stripJats(c.abstract)?.length) score += 5;
  if (c.authors && c.authors.length > 0) score += 2;

  switch (c.source) {
    case "openalex":
      score += 4;
      break;
    case "semantic_scholar":
      score += 3;
      break;
    case "crossref":
      score += 2;
      break;
    case "europepmc":
      score += 1;
      break;
    case "arxiv":
      break;
    case "datacite":
      score -= 1;
      break;
    case "pubmed":
      score -= 1;
      break;
    default:
      break;
  }

  if (c.citationCount !== undefined && c.citationCount > 0) {
    score += Math.min(Math.log10(c.citationCount) * 2, 8);
  }
  if (c.influentialCitationCount !== undefined && c.influentialCitationCount > 0) {
    score += Math.min(c.influentialCitationCount * 0.5, 4);
  }
  if (c.tldr) score += 2;

  return score;
}

/**
 * Pick the best candidate. Returns null when no candidate clears the similarity floor
 * (score < `minScore`, default 35).
 */
export function pickBestCandidate(
  candidates: PaperCandidate[],
  target: { title: string; year?: number },
  minScore = 35,
): PaperCandidate | null {
  if (!candidates.length) return null;
  let best: PaperCandidate | null = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const s = scoreCandidate(c, target);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return bestScore < minScore ? null : best;
}
