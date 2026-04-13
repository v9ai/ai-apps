/** ── Trip date window (single source of truth) ──────────────────────── */
export const CHECK_IN  = "2026-05-31";
export const CHECK_OUT = "2026-06-07";

/** Derived from CHECK_IN / CHECK_OUT */
export const NIGHTS = 7;
export const DAYS   = 7;

export const CHECK_IN_LABEL  = { en: "31 May", ro: "31 mai" } as const;
export const CHECK_OUT_LABEL = { en: "7 Jun",  ro: "7 iun" }  as const;

export const DATE_RANGE_LABEL = {
  en: `${CHECK_IN_LABEL.en} – ${CHECK_OUT_LABEL.en} 2026`,
  ro: `${CHECK_IN_LABEL.ro} – ${CHECK_OUT_LABEL.ro} 2026`,
} as const;

/** ── Recommended tier ─────────────────────────────────────────────── */
export const RECOMMENDED_TIER = 1;  // 0 = budget, 1 = mid-range, 2 = comfort
