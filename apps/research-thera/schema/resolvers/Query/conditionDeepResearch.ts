import type { QueryResolvers, ResolversTypes } from "./../../types.generated";
import { sql } from "@/src/db/neon";

type DeepResearchResult = NonNullable<ResolversTypes["ConditionDeepResearch"]>;

function normSlug(raw: string): string {
  // Mirror the frontend slugify (words joined with "-").
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const conditionDeepResearch: NonNullable<QueryResolvers['conditionDeepResearch']> = async (
  _parent,
  args,
  ctx,
): Promise<DeepResearchResult | null> => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const conditionSlug = normSlug(args.slug);
  const memberSlug = normSlug(args.memberSlug);
  if (!conditionSlug || !memberSlug) return null;

  const language = ((args.language ?? "ro") as string).trim().toLowerCase() || "ro";

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

  const rows = (await sql`
    SELECT id::text AS id, user_id, family_member_id, condition_slug,
           condition_name, language, pathophysiology, age_manifestations,
           evidence_based_treatments, comorbidities, red_flags,
           proximity_assessment, criteria_match, source_urls,
           fresh_until, generated_at, updated_at
    FROM condition_deep_research
    WHERE user_id = ${userEmail}
      AND family_member_id = ${fm.id}
      AND condition_slug = ${conditionSlug}
      AND language = ${language}
    ORDER BY updated_at DESC
    LIMIT 1
  `) as Array<{
    id: string;
    user_id: string;
    family_member_id: number | null;
    condition_slug: string;
    condition_name: string;
    language: string;
    pathophysiology: { summary: string; mechanisms: string[] } | null;
    age_manifestations: Array<{
      developmental_tier: string;
      manifestations: string[];
      notes: string | null;
    }> | null;
    evidence_based_treatments: Array<{
      name: string;
      category: string;
      evidence_level: string | null;
      age_appropriate: string | null;
      notes: string | null;
    }> | null;
    comorbidities: Array<{
      name: string;
      prevalence: string | null;
      notes: string | null;
    }> | null;
    red_flags: Array<{ flag: string; action: string | null }> | null;
    proximity_assessment: {
      score: number;
      label: string;
      confidence: string;
      rationale: string;
      supporting_evidence?: string[];
      contradicting_evidence?: string[];
      missing_evidence?: string[];
      recommended_next_step?: string | null;
    } | null;
    criteria_match: {
      framework?: string;
      criterion_a_inattention?: {
        matched_symptoms?: Array<{ symptom: string; evidence: string }>;
        matched_count?: number;
        threshold_met?: boolean;
      };
      criterion_a_hyperactivity_impulsivity?: {
        matched_symptoms?: Array<{ symptom: string; evidence: string }>;
        matched_count?: number;
        threshold_met?: boolean;
      };
      presentation?: string | null;
      criterion_b_age_onset?: { met?: boolean; evidence?: string | null };
      criterion_c_settings?: { met?: boolean; evidence?: string | null };
      criterion_d_impairment?: { met?: boolean; evidence?: string | null };
      criterion_e_differential?: {
        ruled_out?: boolean;
        notes?: string | null;
      };
    } | null;
    source_urls: string[] | null;
    fresh_until: string | null;
    generated_at: string;
    updated_at: string;
  }>;
  if (rows.length === 0) return null;
  const r = rows[0];

  return {
    id: r.id,
    conditionSlug: r.condition_slug,
    conditionName: r.condition_name,
    language: r.language,
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
    proximityAssessment: r.proximity_assessment
      ? {
          score: r.proximity_assessment.score,
          label: r.proximity_assessment.label,
          confidence: r.proximity_assessment.confidence,
          rationale: r.proximity_assessment.rationale,
          supportingEvidence: r.proximity_assessment.supporting_evidence ?? [],
          contradictingEvidence:
            r.proximity_assessment.contradicting_evidence ?? [],
          missingEvidence: r.proximity_assessment.missing_evidence ?? [],
          recommendedNextStep:
            r.proximity_assessment.recommended_next_step ?? null,
        }
      : null,
    criteriaMatch: r.criteria_match
      ? {
          framework: r.criteria_match.framework ?? "DSM-5 ADHD",
          presentation: r.criteria_match.presentation ?? null,
          criterionAInattention: r.criteria_match.criterion_a_inattention
            ? {
                matchedSymptoms: (
                  r.criteria_match.criterion_a_inattention.matched_symptoms ?? []
                ).map((s) => ({ symptom: s.symptom, evidence: s.evidence })),
                matchedCount:
                  r.criteria_match.criterion_a_inattention.matched_count ?? 0,
                thresholdMet:
                  r.criteria_match.criterion_a_inattention.threshold_met ??
                  false,
              }
            : null,
          criterionAHyperactivityImpulsivity: r.criteria_match
            .criterion_a_hyperactivity_impulsivity
            ? {
                matchedSymptoms: (
                  r.criteria_match.criterion_a_hyperactivity_impulsivity
                    .matched_symptoms ?? []
                ).map((s) => ({ symptom: s.symptom, evidence: s.evidence })),
                matchedCount:
                  r.criteria_match.criterion_a_hyperactivity_impulsivity
                    .matched_count ?? 0,
                thresholdMet:
                  r.criteria_match.criterion_a_hyperactivity_impulsivity
                    .threshold_met ?? false,
              }
            : null,
          criterionBAgeOnset: r.criteria_match.criterion_b_age_onset
            ? {
                met: r.criteria_match.criterion_b_age_onset.met ?? false,
                evidence:
                  r.criteria_match.criterion_b_age_onset.evidence ?? null,
              }
            : null,
          criterionCSettings: r.criteria_match.criterion_c_settings
            ? {
                met: r.criteria_match.criterion_c_settings.met ?? false,
                evidence:
                  r.criteria_match.criterion_c_settings.evidence ?? null,
              }
            : null,
          criterionDImpairment: r.criteria_match.criterion_d_impairment
            ? {
                met: r.criteria_match.criterion_d_impairment.met ?? false,
                evidence:
                  r.criteria_match.criterion_d_impairment.evidence ?? null,
              }
            : null,
          criterionEDifferential: r.criteria_match.criterion_e_differential
            ? {
                ruledOut:
                  r.criteria_match.criterion_e_differential.ruled_out ?? false,
                notes:
                  r.criteria_match.criterion_e_differential.notes ?? null,
              }
            : null,
        }
      : null,
    pathophysiology: r.pathophysiology
      ? {
          summary: r.pathophysiology.summary,
          mechanisms: r.pathophysiology.mechanisms ?? [],
        }
      : null,
    ageManifestations: (r.age_manifestations ?? []).map((m) => ({
      developmentalTier: m.developmental_tier,
      manifestations: m.manifestations ?? [],
      notes: m.notes,
    })),
    evidenceBasedTreatments: (r.evidence_based_treatments ?? []).map((t) => ({
      name: t.name,
      category: t.category,
      evidenceLevel: t.evidence_level,
      ageAppropriate: t.age_appropriate,
      notes: t.notes,
    })),
    comorbidities: (r.comorbidities ?? []).map((c) => ({
      name: c.name,
      prevalence: c.prevalence,
      notes: c.notes,
    })),
    redFlags: (r.red_flags ?? []).map((rf) => ({
      flag: rf.flag,
      action: rf.action,
    })),
    sourceUrls: r.source_urls ?? [],
    freshUntil: r.fresh_until,
    generatedAt: String(r.generated_at),
    updatedAt: String(r.updated_at),
  } as unknown as DeepResearchResult;
};
