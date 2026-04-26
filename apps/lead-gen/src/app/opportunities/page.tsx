import { db } from "@/db";
import { opportunities, companies, contacts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { fetchD1Opportunities } from "@/lib/d1-opportunities";
import { OpportunitiesClient } from "./opportunities-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OpportunitiesPage() {
  const [rows, d1Pending] = await Promise.all([
    db
      .select({
        id: opportunities.id,
        title: opportunities.title,
        url: opportunities.url,
        source: opportunities.source,
        status: opportunities.status,
        reward_text: opportunities.reward_text,
        reward_usd: opportunities.reward_usd,
        score: opportunities.score,
        tags: opportunities.tags,
        applied: opportunities.applied,
        applied_at: opportunities.applied_at,
        application_status: opportunities.application_status,
        first_seen: opportunities.first_seen,
        created_at: opportunities.created_at,
        company_name: companies.name,
        company_key: companies.key,
        contact_first: contacts.first_name,
        contact_last: contacts.last_name,
        contact_slug: contacts.slug,
        contact_position: contacts.position,
      })
      .from(opportunities)
      .leftJoin(companies, eq(opportunities.company_id, companies.id))
      .leftJoin(contacts, eq(opportunities.contact_id, contacts.id))
      .orderBy(desc(opportunities.created_at)),
    fetchD1Opportunities(),
  ]);

  return <OpportunitiesClient opportunities={rows} d1Pending={d1Pending} />;
}
