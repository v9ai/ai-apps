export const EXCLUDED_EMAIL_DOMAINS = ["vadim.blog"] as const;

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.toLowerCase().trim();
}

export function isExcludedDomain(email: string): boolean {
  if (!email || !email.includes("@")) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return EXCLUDED_EMAIL_DOMAINS.includes(domain as (typeof EXCLUDED_EMAIL_DOMAINS)[number]);
}

export function validateContactEmail(email: string | null | undefined): string | null {
  if (!email) return "Email is required";
  if (!email.includes("@")) return "Invalid email format";
  const [local, domain] = email.split("@");
  if (!local || !domain) return "Invalid email format";
  if (isExcludedDomain(email)) {
    return `Cannot use ${domain} domain for contacts - this is your own domain`;
  }
  return null;
}

export function filterValidContactEmails(
  emails: Array<{ id?: number | string; email: string | null; name?: string }>
): Array<{ id?: number | string; email: string; name?: string }> {
  return emails.filter((item) => {
    if (!item.email) return false;
    const error = validateContactEmail(item.email);
    if (error) {
      console.warn(
        `Skipping invalid email ${item.email} for ${item.name ?? item.id ?? "unknown"}: ${error}`
      );
      return false;
    }
    return true;
  }) as Array<{ id?: number | string; email: string; name?: string }>;
}

export function extractEmailDomain(email: string): string | null {
  if (!email || !email.includes("@")) return null;
  return email.split("@")[1]?.toLowerCase() ?? null;
}
