export function coerceExternalUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export function prettyUrl(raw?: string | null): string {
  if (!raw) return "";
  return raw.trim().replace(/^https?:\/\//i, "").replace(/\/+$/g, "");
}

export function scoreColor(score?: number | null): "green" | "amber" | "red" | "gray" {
  if (score == null || !Number.isFinite(score)) return "gray";
  if (score >= 0.7) return "green";
  if (score >= 0.4) return "amber";
  return "red";
}

const META_TAG_PREFIXES = [
  "leadgen-",
  "cpn-",
  "ml-",
  "score:",
  "stage:",
  "source:",
];

export function cleanContactTags(tags: string[] | null | undefined): string[] {
  return (tags ?? []).filter((t) => {
    if (!t) return false;
    if (META_TAG_PREFIXES.some((p) => t.startsWith(p))) return false;
    if (t.length > 28) return false;
    return true;
  });
}

export function fullName(firstName?: string | null, lastName?: string | null): string {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim();
}

export function initialsOf(firstName?: string | null, lastName?: string | null): string {
  const f = (firstName ?? "").trim();
  const l = (lastName ?? "").trim();
  return `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase() || "?";
}

export function safeDate(raw?: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatExperienceRange(
  startDate?: string | null,
  endDate?: string | null,
): string {
  const fmt = (d?: string | null) => {
    const date = safeDate(d);
    if (!date) return "";
    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  };
  const s = fmt(startDate);
  const e = endDate ? fmt(endDate) : "Present";
  if (!s && !e) return "";
  return `${s}${s && e ? " — " : ""}${e}`;
}

export type EmailVerificationTone = "green" | "amber" | "red" | "gray";

export function emailVerificationTone(
  emailVerified: boolean,
  nbResult?: string | null,
): EmailVerificationTone {
  if (emailVerified) return "green";
  if (!nbResult) return "gray";
  const lower = nbResult.toLowerCase();
  if (lower.includes("invalid") || lower.includes("undeliverable")) return "red";
  if (lower.includes("risky") || lower.includes("unknown") || lower.includes("catch")) {
    return "amber";
  }
  return "gray";
}
