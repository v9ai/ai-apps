const FALLBACK_PROD_URL = "https://researchthera.com";

export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const prodDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prodDomain) return `https://${prodDomain}`;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  if (process.env.NODE_ENV === "production") return FALLBACK_PROD_URL;
  return "http://localhost:3000";
}
