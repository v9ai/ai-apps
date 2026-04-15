import { db } from "@/db";
import { opportunities, companies, contacts } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";
import { OpportunityDetailClient } from "./opportunity-detail-client";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rows = await db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      url: opportunities.url,
      source: opportunities.source,
      status: opportunities.status,
      reward_usd: opportunities.reward_usd,
      reward_text: opportunities.reward_text,
      start_date: opportunities.start_date,
      end_date: opportunities.end_date,
      deadline: opportunities.deadline,
      first_seen: opportunities.first_seen,
      last_seen: opportunities.last_seen,
      score: opportunities.score,
      raw_context: opportunities.raw_context,
      metadata: opportunities.metadata,
      applied: opportunities.applied,
      applied_at: opportunities.applied_at,
      application_status: opportunities.application_status,
      application_notes: opportunities.application_notes,
      tags: opportunities.tags,
      created_at: opportunities.created_at,
      updated_at: opportunities.updated_at,
      company_name: companies.name,
      company_key: companies.key,
      company_website: companies.website,
      company_category: companies.category,
      contact_first: contacts.first_name,
      contact_last: contacts.last_name,
      contact_slug: contacts.slug,
      contact_position: contacts.position,
      contact_linkedin: contacts.linkedin_url,
      contact_email: contacts.email,
    })
    .from(opportunities)
    .leftJoin(companies, eq(opportunities.company_id, companies.id))
    .leftJoin(contacts, eq(opportunities.contact_id, contacts.id))
    .where(eq(opportunities.id, id))
    .limit(1);

  if (rows.length === 0) notFound();

  // Load contacts tagged with this opportunity (sourced candidates)
  const sourcedCandidates = await db
    .select({
      id: contacts.id,
      first_name: contacts.first_name,
      last_name: contacts.last_name,
      slug: contacts.slug,
      email: contacts.email,
      company: contacts.company,
      position: contacts.position,
      github_handle: contacts.github_handle,
      tags: contacts.tags,
      authority_score: contacts.authority_score,
      bio: sql<string | null>`substring(${contacts.ai_profile}::text from 1 for 200)`,
    })
    .from(contacts)
    .where(sql`${contacts.tags}::text LIKE ${"%" + `opp:${id}` + "%"}`)
    .orderBy(desc(contacts.authority_score))
    .limit(100);

  return (
    <Suspense
      fallback={
        <Container size="3" p="8">
          <Text color="gray">Loading...</Text>
        </Container>
      }
    >
      <OpportunityDetailClient
        opportunity={rows[0]}
        sourcedCandidates={sourcedCandidates}
      />
    </Suspense>
  );
}
