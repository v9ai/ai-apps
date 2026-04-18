import { config } from "dotenv";
config({ path: ".env.local" });

import { and, asc, eq, isNull, like, or, sql as dsql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../src/db/schema";

const { contacts } = schema;

const neonUrl = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
if (!neonUrl) {
  console.error("NEON_DATABASE_URL not set");
  process.exit(1);
}
const sqlClient = neon(neonUrl);
const db = drizzle(sqlClient, { schema });

const RESERVED = new Set([
  "contact",
  "postmaster",
  "abuse",
  "hostmaster",
  "admin",
  "noreply",
  "no-reply",
]);

function sanitize(raw: string | null | undefined): string {
  return (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 64);
}

async function aliasTaken(alias: string): Promise<boolean> {
  if (RESERVED.has(alias)) return true;
  const [row] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.forwarding_alias, alias))
    .limit(1);
  return Boolean(row);
}

async function pickAlias(
  first: string,
  last: string,
  id: number,
): Promise<string> {
  const f = sanitize(first);
  const l = sanitize(last);
  const li = l.slice(0, 1);

  const candidates: string[] = [];
  if (f) {
    candidates.push(f);
    if (li) candidates.push(`${f}.${li}`);
    if (l && l !== f) candidates.push(`${f}.${l}`);
    for (let n = 2; n <= 99; n++) candidates.push(`${f}${n}`);
  } else if (l) {
    candidates.push(l);
    for (let n = 2; n <= 99; n++) candidates.push(`${l}${n}`);
  }
  candidates.push(`user${id}`);

  for (const c of candidates) {
    if (!c) continue;
    if (!(await aliasTaken(c))) return c;
  }
  throw new Error(`no alias found for contact ${id}`);
}

async function main() {
  const rows = await db
    .select({
      id: contacts.id,
      first_name: contacts.first_name,
      last_name: contacts.last_name,
      email: contacts.email,
    })
    .from(contacts)
    .where(
      and(
        like(contacts.tags, "%cpn-outreach%"),
        isNull(contacts.forwarding_alias),
        or(eq(contacts.do_not_contact, false), isNull(contacts.do_not_contact)),
      ),
    )
    .orderBy(asc(contacts.id));

  const eligible = rows.filter((r) => r.email && r.email.trim() !== "");
  console.log(`processing ${eligible.length} contacts`);

  const sample: Array<{
    id: number;
    name: string;
    email: string;
    alias: string;
  }> = [];
  let n = 0;
  for (const r of eligible) {
    const alias = await pickAlias(r.first_name, r.last_name, r.id);
    await db
      .update(contacts)
      .set({ forwarding_alias: alias, updated_at: new Date().toISOString() })
      .where(eq(contacts.id, r.id));
    n++;
    if (sample.length < 10) {
      sample.push({
        id: r.id,
        name: `${r.first_name} ${r.last_name}`.trim(),
        email: r.email!,
        alias,
      });
    }
    if (n % 50 === 0) console.log(`  ${n}/${eligible.length}`);
  }

  console.log(`\ndone: ${n} aliased\n`);
  console.log("first 10 assignments:");
  for (const s of sample) {
    console.log(`  [${s.id}] ${s.name} <${s.email}>  →  ${s.alias}@vadim.blog`);
  }

  // silence unused import lint
  void dsql;
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
