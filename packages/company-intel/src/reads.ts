import { eq, ilike, sql } from "drizzle-orm";
import type { CompanyIntelDB } from "./db";
import {
  companies,
  companyFacts,
  contacts,
  type Company,
  type CompanyFact,
  type Contact,
} from "./schema";

export async function getCompanyByKey(
  db: CompanyIntelDB,
  key: string,
): Promise<Company | null> {
  const [row] = await db
    .select()
    .from(companies)
    .where(eq(companies.key, key))
    .limit(1);
  return row ?? null;
}

export async function getCompanyById(
  db: CompanyIntelDB,
  id: number,
): Promise<Company | null> {
  const [row] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);
  return row ?? null;
}

export async function listFactsByCompany(
  db: CompanyIntelDB,
  companyId: number,
): Promise<CompanyFact[]> {
  return db
    .select()
    .from(companyFacts)
    .where(eq(companyFacts.company_id, companyId));
}

export async function listContactsByCompany(
  db: CompanyIntelDB,
  companyId: number,
): Promise<Contact[]> {
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.company_id, companyId));
}

export interface CompanyIntel {
  company: Company;
  facts: CompanyFact[];
  contacts: Contact[];
}

export async function getCompanyIntel(
  db: CompanyIntelDB,
  key: string,
): Promise<CompanyIntel | null> {
  const company = await getCompanyByKey(db, key);
  if (!company) return null;
  const [facts, contactRows] = await Promise.all([
    listFactsByCompany(db, company.id),
    listContactsByCompany(db, company.id),
  ]);
  return { company, facts, contacts: contactRows };
}

// Best-effort lookup by name/url. Tries:
//   1. domain extracted from url → canonical_domain or website match
//   2. slug of name → exact key match
//   3. name → case-insensitive match
// Returns null when no confident match.
export async function resolveCompanyKey(
  db: CompanyIntelDB,
  input: { name?: string | null; url?: string | null },
): Promise<string | null> {
  const domain = extractDomain(input.url);
  if (domain) {
    const [byDomain] = await db
      .select({ key: companies.key })
      .from(companies)
      .where(
        sql`${companies.canonical_domain} = ${domain} OR ${companies.website} ILIKE ${"%" + domain + "%"}`,
      )
      .limit(1);
    if (byDomain) return byDomain.key;
  }
  if (input.name) {
    const slug = slugify(input.name);
    if (slug) {
      const [exact] = await db
        .select({ key: companies.key })
        .from(companies)
        .where(eq(companies.key, slug))
        .limit(1);
      if (exact) return exact.key;
    }
    const [byName] = await db
      .select({ key: companies.key })
      .from(companies)
      .where(ilike(companies.name, input.name))
      .limit(1);
    if (byName) return byName.key;
  }
  return null;
}

function extractDomain(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+(inc|llc|ltd|co)\.?$/i, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
