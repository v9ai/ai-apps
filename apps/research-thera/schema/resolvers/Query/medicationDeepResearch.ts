import type { QueryResolvers, ResolversTypes } from "./../../types.generated";
import { sql } from "@/src/db/neon";

type DeepResearchResult = NonNullable<ResolversTypes["MedicationDeepResearch"]>;

function normSlug(raw: string): string {
  const m = raw.trim().toLowerCase().match(/^[a-z0-9]+/);
  return m ? m[0] : "";
}

export const medicationDeepResearch: QueryResolvers['medicationDeepResearch'] = async (_parent, args, ctx): Promise<DeepResearchResult | null> => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const slug = normSlug(args.slug);
  const memberSlug = normSlug(args.memberSlug);
  if (!slug || !memberSlug) return null;

  // 1. Resolve the family member by slug for this user.
  const fmRows = (await sql`
    SELECT id, user_id, slug, first_name, name, age_years, relationship,
           date_of_birth, bio, allergies, email, phone, location, occupation,
           created_at, updated_at
    FROM family_members
    WHERE user_id = ${userEmail} AND slug = ${memberSlug}
    LIMIT 1
  `) as Array<{
    id: number;
    user_id: string;
    slug: string;
    first_name: string;
    name: string | null;
    age_years: number | null;
    relationship: string | null;
    date_of_birth: string | null;
    bio: string | null;
    allergies: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    occupation: string | null;
    created_at: string;
    updated_at: string;
  }>;
  if (fmRows.length === 0) return null;
  const fm = fmRows[0];

  // 2. Find the most recent medication row matching slug for this family member.
  const medRows = (await sql`
    SELECT id::text AS id, user_id, family_member_id, name, dosage, frequency,
           notes, start_date, end_date, created_at,
           COALESCE(is_active, TRUE) AS is_active
    FROM medications
    WHERE user_id = ${userEmail}
      AND family_member_id = ${fm.id}
      AND lower(split_part(name, ' ', 1)) = ${slug}
    ORDER BY created_at DESC
    LIMIT 1
  `) as Array<{
    id: string;
    user_id: string;
    family_member_id: number | null;
    name: string;
    dosage: string | null;
    frequency: string | null;
    notes: string | null;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
    is_active: boolean;
  }>;
  if (medRows.length === 0) return null;
  const med = medRows[0];

  // 3. Drug-level facts (parallel).
  const [pharmRows, indicationRows, dosingRows, aeRows, inxRows] = await Promise.all([
    sql`SELECT drug_slug, generic_name, brand_names, atc_code, moa, half_life, peak_time, metabolism, excretion, source_url, updated_at FROM medication_pharmacology WHERE drug_slug = ${slug} LIMIT 1`,
    sql`SELECT id, drug_slug, kind, condition, evidence_level, source, source_url, confidence FROM medication_indications WHERE drug_slug = ${slug} ORDER BY kind, condition`,
    sql`SELECT id, drug_slug, population, age_band, weight_band, dose_text, frequency, max_daily, source_url FROM medication_dosing WHERE drug_slug = ${slug} ORDER BY population, age_band`,
    sql`SELECT id, drug_slug, event, frequency_band, severity, source_url FROM medication_adverse_events WHERE drug_slug = ${slug} ORDER BY CASE frequency_band WHEN 'black_box' THEN 0 WHEN 'common' THEN 1 WHEN 'uncommon' THEN 2 ELSE 3 END, event`,
    sql`SELECT id, drug_slug, interacting_drug, severity, mechanism, recommendation, source_url FROM medication_interactions WHERE drug_slug = ${slug} ORDER BY CASE severity WHEN 'contraindicated' THEN 0 WHEN 'major' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END, interacting_drug`,
  ]);

  // 4. Correlations + join to underlying issue/journal entry.
  const correlationRows = (await sql`
    SELECT
      mc.id,
      mc.medication_id::text AS medication_id,
      mc.family_member_id,
      mc.related_entity_type,
      mc.related_entity_id,
      mc.correlation_type,
      mc.confidence,
      mc.rationale,
      mc.matched_fact,
      mc.created_at,
      CASE
        WHEN mc.related_entity_type = 'issue'         THEN i.title
        WHEN mc.related_entity_type = 'journal_entry' THEN je.title
      END AS related_title,
      CASE
        WHEN mc.related_entity_type = 'issue'         THEN i.description
        WHEN mc.related_entity_type = 'journal_entry' THEN je.content
      END AS related_description,
      CASE
        WHEN mc.related_entity_type = 'journal_entry' THEN je.entry_date::text
        ELSE NULL
      END AS related_date
    FROM medication_correlations mc
    LEFT JOIN issues          i  ON mc.related_entity_type = 'issue'         AND mc.related_entity_id = i.id
    LEFT JOIN journal_entries je ON mc.related_entity_type = 'journal_entry' AND mc.related_entity_id = je.id
    WHERE mc.medication_id = ${med.id}::uuid
    ORDER BY mc.confidence DESC, mc.id ASC
  `) as Array<Record<string, unknown>>;

  const result = {
    medication: {
      id: med.id,
      userId: med.user_id,
      familyMemberId: med.family_member_id,
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      notes: med.notes,
      startDate: med.start_date,
      endDate: med.end_date,
      isActive: med.is_active,
      createdAt: med.created_at,
      familyMember: null, // Resolved by Medication.familyMember if requested
    },
    familyMember: {
      id: fm.id,
      userId: fm.user_id,
      slug: fm.slug,
      firstName: fm.first_name,
      name: fm.name,
      ageYears: fm.age_years,
      relationship: fm.relationship,
      dateOfBirth: fm.date_of_birth,
      bio: fm.bio,
      allergies: fm.allergies,
      email: fm.email,
      phone: fm.phone,
      location: fm.location,
      occupation: fm.occupation,
      createdAt: fm.created_at,
      updatedAt: fm.updated_at,
    },
    pharmacology: pharmRows[0]
      ? {
          drugSlug: (pharmRows[0] as { drug_slug: string }).drug_slug,
          genericName: (pharmRows[0] as { generic_name: string | null }).generic_name,
          brandNames: ((pharmRows[0] as { brand_names: unknown }).brand_names as string[]) ?? [],
          atcCode: (pharmRows[0] as { atc_code: string | null }).atc_code,
          moa: (pharmRows[0] as { moa: string | null }).moa,
          halfLife: (pharmRows[0] as { half_life: string | null }).half_life,
          peakTime: (pharmRows[0] as { peak_time: string | null }).peak_time,
          metabolism: (pharmRows[0] as { metabolism: string | null }).metabolism,
          excretion: (pharmRows[0] as { excretion: string | null }).excretion,
          sourceUrl: (pharmRows[0] as { source_url: string | null }).source_url,
          updatedAt: String((pharmRows[0] as { updated_at: unknown }).updated_at),
        }
      : null,
    indications: indicationRows.map((r) => ({
      id: String((r as { id: number }).id),
      drugSlug: (r as { drug_slug: string }).drug_slug,
      kind: (r as { kind: string }).kind,
      condition: (r as { condition: string }).condition,
      evidenceLevel: (r as { evidence_level: string | null }).evidence_level,
      source: (r as { source: string | null }).source,
      sourceUrl: (r as { source_url: string | null }).source_url,
      confidence: (r as { confidence: number | null }).confidence,
    })),
    dosing: dosingRows.map((r) => ({
      id: String((r as { id: number }).id),
      drugSlug: (r as { drug_slug: string }).drug_slug,
      population: (r as { population: string }).population,
      ageBand: (r as { age_band: string | null }).age_band,
      weightBand: (r as { weight_band: string | null }).weight_band,
      doseText: (r as { dose_text: string }).dose_text,
      frequency: (r as { frequency: string | null }).frequency,
      maxDaily: (r as { max_daily: string | null }).max_daily,
      sourceUrl: (r as { source_url: string | null }).source_url,
    })),
    adverseEvents: aeRows.map((r) => ({
      id: String((r as { id: number }).id),
      drugSlug: (r as { drug_slug: string }).drug_slug,
      event: (r as { event: string }).event,
      frequencyBand: (r as { frequency_band: string }).frequency_band,
      severity: (r as { severity: string | null }).severity,
      sourceUrl: (r as { source_url: string | null }).source_url,
    })),
    interactions: inxRows.map((r) => ({
      id: String((r as { id: number }).id),
      drugSlug: (r as { drug_slug: string }).drug_slug,
      interactingDrug: (r as { interacting_drug: string }).interacting_drug,
      severity: (r as { severity: string }).severity,
      mechanism: (r as { mechanism: string | null }).mechanism,
      recommendation: (r as { recommendation: string | null }).recommendation,
      sourceUrl: (r as { source_url: string | null }).source_url,
    })),
    correlations: correlationRows.map((r) => ({
      id: String(r.id),
      medicationId: String(r.medication_id),
      familyMemberId: r.family_member_id as number | null,
      relatedEntityType: r.related_entity_type as string,
      relatedEntityId: r.related_entity_id as number,
      correlationType: r.correlation_type as string,
      confidence: r.confidence as number,
      rationale: r.rationale as string | null,
      matchedFact: r.matched_fact as string | null,
      relatedTitle: r.related_title as string | null,
      relatedDescription: r.related_description as string | null,
      relatedDate: r.related_date as string | null,
      createdAt: String(r.created_at),
    })),
  };
  return result as unknown as DeepResearchResult;
};
