import { db } from "@/db";
import { opportunities, companies, contacts } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";
import { OpportunityDetailClient } from "./opportunity-detail-client";
import { ContactAIProfileSchema } from "@/lib/ai-contact-enrichment";
import {
  computeCandidateMatchScore,
  type MatchBreakdown,
} from "@/lib/candidate-match-scoring";

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
      contact_id: contacts.id,
    })
    .from(opportunities)
    .leftJoin(companies, eq(opportunities.company_id, companies.id))
    .leftJoin(contacts, eq(opportunities.contact_id, contacts.id))
    .where(eq(opportunities.id, id))
    .limit(1);

  if (rows.length === 0) notFound();

  const opp = rows[0];

  // Load contacts tagged with this opportunity — fetch full ai_profile for scoring
  const rawCandidates = await db
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
      ai_profile: contacts.ai_profile,
    })
    .from(contacts)
    .where(sql`${contacts.tags}::text LIKE ${"%" + `opp:${id}` + "%"}`)
    .limit(500);

  // Parse opportunity data for scoring
  const oppTags: string[] = opp.tags ? JSON.parse(opp.tags) : [];
  const oppData = { tags: oppTags, raw_context: opp.raw_context };

  // Score each candidate against this opportunity and sort by match score
  const sourcedCandidates = rawCandidates
    .map((c) => {
      const cTags: string[] = c.tags ? JSON.parse(c.tags) : [];
      let aiProfile = null;
      if (c.ai_profile) {
        try {
          const parsed = ContactAIProfileSchema.safeParse(JSON.parse(c.ai_profile));
          if (parsed.success) aiProfile = parsed.data;
        } catch { /* ignore parse errors */ }
      }

      const match = computeCandidateMatchScore(
        {
          tags: cTags,
          authority_score: c.authority_score,
          ai_profile: aiProfile,
          github_handle: c.github_handle,
          position: c.position,
        },
        oppData,
      );

      return {
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        slug: c.slug,
        email: c.email,
        company: c.company,
        position: c.position,
        github_handle: c.github_handle,
        tags: c.tags,
        authority_score: c.authority_score,
        match_score: match.score,
        match_breakdown: match,
        github_activity_score: aiProfile?.github_activity_score ?? null,
        github_public_repos: aiProfile?.github_public_repos ?? null,
        github_followers: aiProfile?.github_followers ?? null,
        github_recent_push_count: aiProfile?.github_recent_push_count ?? null,
        experience_level: aiProfile?.experience_level ?? null,
        specialization: aiProfile?.specialization ?? null,
      };
    })
    .sort((a, b) => b.match_score - a.match_score);

  return (
    <Suspense
      fallback={
        <Container size="3" p="8">
          <Text color="gray">Loading...</Text>
        </Container>
      }
    >
      <OpportunityDetailClient
        opportunity={opp}
        sourcedCandidates={sourcedCandidates}
      />
    </Suspense>
  );
}
