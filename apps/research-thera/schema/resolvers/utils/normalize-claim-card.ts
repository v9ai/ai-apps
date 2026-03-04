/**
 * Normalizers to convert raw claim card tool output into GraphQL-compliant ClaimCard types.
 * Ensures UI can always render without special-casing missing fields.
 */

type GqlClaimCard = {
  id: string;
  claim: string;
  scope?: any;
  verdict:
    | "UNVERIFIED"
    | "SUPPORTED"
    | "CONTRADICTED"
    | "MIXED"
    | "INSUFFICIENT";
  confidence: number;
  evidence: Array<{
    paper: {
      title: string;
      doi?: string | null;
      url?: string | null;
      year?: number | null;
      source: string;
      authors?: string[] | null;
      abstract?: string | null;
      journal?: string | null;
      oaUrl?: string | null;
      oaStatus?: string | null;
    };
    polarity: "SUPPORTS" | "CONTRADICTS" | "MIXED" | "IRRELEVANT";
    excerpt?: string | null;
    rationale?: string | null;
    score?: number | null;
    locator?: {
      section?: string | null;
      page?: number | null;
      url?: string | null;
    } | null;
  }>;
  queries: string[];
  createdAt: string;
  updatedAt: string;
  provenance: {
    generatedBy: string;
    model?: string | null;
    sourceTools: string[];
  };
  notes?: string | null;
};

const trim = (s: unknown, max = 520) => {
  const t = typeof s === "string" ? s : "";
  return t.length <= max ? t : t.slice(0, max - 1) + "…";
};

const normalizeVerdict = (v: unknown): GqlClaimCard["verdict"] => {
  const s = (typeof v === "string" ? v : "").toUpperCase().trim();
  if (s === "SUPPORTED") return "SUPPORTED";
  if (s === "CONTRADICTED") return "CONTRADICTED";
  if (s === "MIXED") return "MIXED";
  if (s === "INSUFFICIENT") return "INSUFFICIENT";
  return "UNVERIFIED";
};

const normalizePolarity = (
  p: unknown,
): GqlClaimCard["evidence"][number]["polarity"] => {
  const s = (typeof p === "string" ? p : "").toUpperCase().trim();
  if (s === "SUPPORTS") return "SUPPORTS";
  if (s === "CONTRADICTS") return "CONTRADICTS";
  if (s === "MIXED") return "MIXED";
  return "IRRELEVANT";
};

/**
 * Convert whatever claimCardsTools returns into your GraphQL ClaimCard shape.
 * Call this right before returning from the resolver.
 */
export function toGqlClaimCards(
  rawCards: any[],
  nowIso = new Date().toISOString(),
): GqlClaimCard[] {
  return (rawCards ?? []).map((c: any, idx: number) => {
    const evidenceRaw = Array.isArray(c?.evidence) ? c.evidence : [];

    const evidence = evidenceRaw.map((e: any) => {
      const paperRaw = e?.paper ?? e?.document ?? e?.source ?? {};

      // Ensure required fields for PaperCandidate
      const title =
        (paperRaw?.title ?? e?.title ?? "").toString().trim() ||
        `Untitled source ${idx + 1}`;
      const source = (
        paperRaw?.source ??
        e?.sourceName ??
        "unknown"
      ).toString();

      // Locator url fallback: prefer OA url, then url, then doi resolver
      const doi = paperRaw?.doi ?? null;
      const url = paperRaw?.url ?? null;
      const oaUrl = paperRaw?.oaUrl ?? null;
      const locatorUrl =
        e?.locator?.url ??
        oaUrl ??
        url ??
        (doi ? `https://doi.org/${String(doi).trim()}` : null);

      return {
        paper: {
          title,
          doi,
          url,
          year: paperRaw?.year ?? null,
          source,
          authors: Array.isArray(paperRaw?.authors) ? paperRaw.authors : null,
          abstract: paperRaw?.abstract ?? null,
          journal: paperRaw?.journal ?? null,
          oaUrl,
          oaStatus: paperRaw?.oaStatus ?? null,
        },
        polarity: normalizePolarity(e?.polarity),
        excerpt: trim(e?.excerpt ?? e?.quote ?? e?.text, 700) || null,
        rationale: trim(e?.rationale, 500) || null,
        score: typeof e?.score === "number" ? e.score : null,
        locator: {
          section: e?.locator?.section ?? null,
          page: typeof e?.locator?.page === "number" ? e.locator.page : null,
          url: locatorUrl,
        },
      };
    });

    return {
      id: (c?.id ?? `${c?.claim ?? "claim"}-${idx}`).toString(),
      claim: (c?.claim ?? c?.statement ?? "").toString(),
      scope: c?.scope ?? null,
      verdict: normalizeVerdict(c?.verdict),
      confidence: typeof c?.confidence === "number" ? c.confidence : 0,
      evidence,
      queries: Array.isArray(c?.queries) ? c.queries : [],
      createdAt: c?.createdAt ?? nowIso,
      updatedAt: c?.updatedAt ?? nowIso,
      provenance: {
        generatedBy: c?.provenance?.generatedBy ?? "claimCardsTools",
        model: c?.provenance?.model ?? null,
        sourceTools: Array.isArray(c?.provenance?.sourceTools)
          ? c.provenance.sourceTools
          : [],
      },
      notes: c?.notes ?? null,
    };
  });
}
