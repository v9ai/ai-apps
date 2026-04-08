import { sql as neonSql } from "./neon";
import { safeJsonParse } from "../lib/safe-json";

/**
 * Convert a SQL string with `?` placeholders to PostgreSQL `$N` style,
 * returning the converted query and the params array unchanged.
 */
function p(template: string, params: any[]): [string, any[]] {
  let i = 0;
  const query = template.replace(/\?/g, () => `$${++i}`);
  return [query, params];
}

/**
 * Database operations for goals, research, questions, notes, and jobs
 */

// ============================================
// Family Members
// ============================================

export async function listFamilyMembers(userId: string) {
  const rows = await neonSql`SELECT * FROM family_members WHERE user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map((row) => ({
    id: row.id as number,
    userId: row.user_id as string,
    slug: (row.slug as string) || null,
    firstName: row.first_name as string,
    name: (row.name as string) || null,
    ageYears: (row.age_years as number) || null,
    relationship: (row.relationship as string) || null,
    dateOfBirth: (row.date_of_birth as string) || null,
    bio: (row.bio as string) || null,
    email: (row.email as string) || null,
    phone: (row.phone as string) || null,
    location: (row.location as string) || null,
    occupation: (row.occupation as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function getFamilyMember(id: number) {
  const rows = await neonSql`SELECT * FROM family_members WHERE id = ${id}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as number,
    userId: row.user_id as string,
    slug: (row.slug as string) || null,
    firstName: row.first_name as string,
    name: (row.name as string) || null,
    ageYears: (row.age_years as number) || null,
    relationship: (row.relationship as string) || null,
    dateOfBirth: (row.date_of_birth as string) || null,
    bio: (row.bio as string) || null,
    email: (row.email as string) || null,
    phone: (row.phone as string) || null,
    location: (row.location as string) || null,
    occupation: (row.occupation as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getSelfFamilyMember(userId: string) {
  const rows = await neonSql`SELECT * FROM family_members WHERE user_id = ${userId} AND relationship = 'self' LIMIT 1`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as number,
    userId: row.user_id as string,
    slug: (row.slug as string) || null,
    firstName: row.first_name as string,
    name: (row.name as string) || null,
    ageYears: (row.age_years as number) || null,
    relationship: (row.relationship as string) || null,
    dateOfBirth: (row.date_of_birth as string) || null,
    bio: (row.bio as string) || null,
    email: (row.email as string) || null,
    phone: (row.phone as string) || null,
    location: (row.location as string) || null,
    occupation: (row.occupation as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getFamilyMemberBySlug(slug: string, userId: string) {
  const rows = await neonSql`SELECT * FROM family_members WHERE slug = ${slug} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as number,
    userId: row.user_id as string,
    slug: (row.slug as string) || null,
    firstName: row.first_name as string,
    name: (row.name as string) || null,
    ageYears: (row.age_years as number) || null,
    relationship: (row.relationship as string) || null,
    dateOfBirth: (row.date_of_birth as string) || null,
    bio: (row.bio as string) || null,
    email: (row.email as string) || null,
    phone: (row.phone as string) || null,
    location: (row.location as string) || null,
    occupation: (row.occupation as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function generateFamilyMemberSlug(firstName: string, userId: string): Promise<string> {
  const base = slugify(firstName);
  if (!base) return `member-${Date.now()}`;

  const existing = await getFamilyMemberBySlug(base, userId);
  if (!existing) return base;

  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    const check = await getFamilyMemberBySlug(candidate, userId);
    if (!check) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function createFamilyMember(params: {
  userId: string;
  firstName: string;
  name?: string | null;
  ageYears?: number | null;
  relationship?: string | null;
  dateOfBirth?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  occupation?: string | null;
}): Promise<number> {
  const slug = await generateFamilyMemberSlug(params.firstName, params.userId);
  const rows = await neonSql`
    INSERT INTO family_members (user_id, slug, first_name, name, age_years, relationship, date_of_birth, bio, email, phone, location, occupation, created_at, updated_at)
    VALUES (${params.userId}, ${slug}, ${params.firstName}, ${params.name ?? null}, ${params.ageYears ?? null}, ${params.relationship ?? null}, ${params.dateOfBirth ?? null}, ${params.bio ?? null}, ${params.email ?? null}, ${params.phone ?? null}, ${params.location ?? null}, ${params.occupation ?? null}, NOW(), NOW())
    RETURNING id`;
  return rows[0].id as number;
}

export async function updateFamilyMember(
  id: number,
  params: {
    firstName?: string;
    name?: string | null;
    ageYears?: number | null;
    relationship?: string | null;
    dateOfBirth?: string | null;
    bio?: string | null;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    occupation?: string | null;
  },
) {
  const sets: string[] = [];
  const args: any[] = [];

  if (params.firstName !== undefined) { sets.push("first_name = ?"); args.push(params.firstName); }
  if (params.name !== undefined) { sets.push("name = ?"); args.push(params.name); }
  if (params.ageYears !== undefined) { sets.push("age_years = ?"); args.push(params.ageYears); }
  if (params.relationship !== undefined) { sets.push("relationship = ?"); args.push(params.relationship); }
  if (params.dateOfBirth !== undefined) { sets.push("date_of_birth = ?"); args.push(params.dateOfBirth); }
  if (params.bio !== undefined) { sets.push("bio = ?"); args.push(params.bio); }
  if (params.email !== undefined) { sets.push("email = ?"); args.push(params.email); }
  if (params.phone !== undefined) { sets.push("phone = ?"); args.push(params.phone); }
  if (params.location !== undefined) { sets.push("location = ?"); args.push(params.location); }
  if (params.occupation !== undefined) { sets.push("occupation = ?"); args.push(params.occupation); }

  if (sets.length === 0) return;

  sets.push("updated_at = NOW()");
  args.push(id);

  const [query, queryParams] = p(`UPDATE family_members SET ${sets.join(", ")} WHERE id = ?`, args);
  await neonSql(query, queryParams);
}

export async function deleteFamilyMember(id: number): Promise<boolean> {
  await neonSql`DELETE FROM family_members WHERE id = ${id}`;
  return true;
}

// ============================================
// Family Member Shares
// ============================================

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function shareFamilyMember(
  familyMemberId: number,
  email: string,
  role: "VIEWER" | "EDITOR",
  createdBy: string,
) {
  const normalizedEmail = normalizeEmail(email);
  await neonSql`
    INSERT INTO family_member_shares (family_member_id, email, role, created_by)
    VALUES (${familyMemberId}, ${normalizedEmail}, ${role}, ${createdBy})
    ON CONFLICT (family_member_id, email)
    DO UPDATE SET role = excluded.role`;
  const rows = await neonSql`SELECT * FROM family_member_shares WHERE family_member_id = ${familyMemberId} AND email = ${normalizedEmail}`;
  const row = rows[0];
  return {
    familyMemberId: row.family_member_id as number,
    email: row.email as string,
    role: row.role as "VIEWER" | "EDITOR",
    createdAt: row.created_at as string,
    createdBy: row.created_by as string,
  };
}

export async function unshareFamilyMember(
  familyMemberId: number,
  email: string,
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  await neonSql`DELETE FROM family_member_shares WHERE family_member_id = ${familyMemberId} AND email = ${normalizedEmail}`;
  return true;
}

export async function getFamilyMemberShares(familyMemberId: number) {
  const rows = await neonSql`SELECT * FROM family_member_shares WHERE family_member_id = ${familyMemberId} ORDER BY created_at DESC`;
  return rows.map((row) => ({
    familyMemberId: row.family_member_id as number,
    email: row.email as string,
    role: row.role as "VIEWER" | "EDITOR",
    createdAt: row.created_at as string,
    createdBy: row.created_by as string,
  }));
}

export async function getSharedFamilyMembers(viewerEmail: string) {
  const normalizedEmail = normalizeEmail(viewerEmail);
  const rows = await neonSql`
    SELECT fm.* FROM family_members fm
    JOIN family_member_shares s ON s.family_member_id = fm.id
    WHERE s.email = ${normalizedEmail}
    ORDER BY fm.updated_at DESC`;
  return rows.map((row) => ({
    id: row.id as number,
    userId: row.user_id as string,
    firstName: row.first_name as string,
    name: (row.name as string) || null,
    ageYears: (row.age_years as number) || null,
    relationship: (row.relationship as string) || null,
    dateOfBirth: (row.date_of_birth as string) || null,
    bio: (row.bio as string) || null,
    email: (row.email as string) || null,
    phone: (row.phone as string) || null,
    location: (row.location as string) || null,
    occupation: (row.occupation as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

// ============================================
// Goals
// ============================================

export async function getGoal(goalId: number, createdBy: string) {
  const rows = await neonSql`SELECT * FROM goals WHERE id = ${goalId} AND user_id = ${createdBy}`;

  if (rows.length === 0) {
    throw new Error(`Goal ${goalId} not found`);
  }

  const row = rows[0];
  return {
    id: row.id as number,
    familyMemberId: row.family_member_id as number,
    createdBy: row.user_id as string,
    slug: (row.slug as string) || null,
    title: row.title as string,
    description: (row.description as string) || null,
    status: row.status as string,
    parentGoalId: (row.parent_goal_id as number) || null,
    therapeuticText: (row.therapeutic_text as string) || null,
    therapeuticTextLanguage: (row.therapeutic_text_language as string) || null,
    therapeuticTextGeneratedAt:
      (row.therapeutic_text_generated_at as string) || null,
    storyLanguage: (row.story_language as string) || null,
    parentAdvice: (row.parent_advice as string) || null,
    parentAdviceLanguage: (row.parent_advice_language as string) || null,
    parentAdviceGeneratedAt: (row.parent_advice_generated_at as string) || null,
    priority: (row.priority as string) || "medium",
    targetDate: (row.target_date as string) || null,
    tags: safeJsonParse(row.tags as string, []),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getGoalBySlug(slug: string, createdBy: string) {
  const rows = await neonSql`SELECT * FROM goals WHERE slug = ${slug} AND user_id = ${createdBy}`;

  if (rows.length === 0) {
    throw new Error(`Goal with slug "${slug}" not found`);
  }

  const row = rows[0];
  return {
    id: row.id as number,
    familyMemberId: row.family_member_id as number,
    createdBy: row.user_id as string,
    slug: (row.slug as string) || null,
    title: row.title as string,
    description: (row.description as string) || null,
    status: row.status as string,
    parentGoalId: (row.parent_goal_id as number) || null,
    therapeuticText: (row.therapeutic_text as string) || null,
    therapeuticTextLanguage: (row.therapeutic_text_language as string) || null,
    therapeuticTextGeneratedAt:
      (row.therapeutic_text_generated_at as string) || null,
    storyLanguage: (row.story_language as string) || null,
    parentAdvice: (row.parent_advice as string) || null,
    parentAdviceLanguage: (row.parent_advice_language as string) || null,
    parentAdviceGeneratedAt: (row.parent_advice_generated_at as string) || null,
    priority: (row.priority as string) || "medium",
    targetDate: (row.target_date as string) || null,
    tags: safeJsonParse(row.tags as string, []),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listGoals(
  createdBy: string,
  familyMemberId?: number,
  status?: string,
  tag?: string,
) {
  let sqlStr = `SELECT * FROM goals WHERE user_id = ?`;
  const args: any[] = [createdBy];

  if (familyMemberId) {
    sqlStr += ` AND family_member_id = ?`;
    args.push(familyMemberId);
  }

  if (status) {
    sqlStr += ` AND status = ?`;
    args.push(status);
  }

  if (tag) {
    sqlStr += ` AND tags LIKE ?`;
    args.push(`%"${tag}"%`);
  }

  sqlStr += ` ORDER BY created_at DESC`;

  const [query, params] = p(sqlStr, args);
  const rows = await neonSql(query, params);
  return rows.map((row) => ({
    id: row.id as number,
    familyMemberId: row.family_member_id as number,
    createdBy: row.user_id as string,
    title: row.title as string,
    description: (row.description as string) || null,
    status: row.status as string,
    tags: safeJsonParse(row.tags as string, []),
    parentGoalId: (row.parent_goal_id as number) || null,
    storyLanguage: (row.story_language as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function createGoal(params: {
  familyMemberId: number;
  createdBy: string;
  slug?: string;
  title: string;
  description?: string | null;
  parentGoalId?: number | null;
}) {
  const status = "active";
  const rows = await neonSql`
    INSERT INTO goals (family_member_id, user_id, slug, title, description, status, parent_goal_id)
    VALUES (${params.familyMemberId}, ${params.createdBy}, ${params.slug || null}, ${params.title}, ${params.description || null}, ${status}, ${params.parentGoalId || null})
    RETURNING id`;
  return rows[0].id as number;
}

export async function updateGoal(
  goalId: number,
  createdBy: string,
  updates: {
    slug?: string;
    familyMemberId?: number | null;
    title?: string;
    description?: string | null;
    status?: string;
    priority?: string;
    targetDate?: string | null;
    tags?: string[];
    storyLanguage?: string | null;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.slug !== undefined) { fields.push("slug = ?"); args.push(updates.slug); }
  if (updates.familyMemberId !== undefined) { fields.push("family_member_id = ?"); args.push(updates.familyMemberId); }
  if (updates.title !== undefined) { fields.push("title = ?"); args.push(updates.title); }
  if (updates.description !== undefined) { fields.push("description = ?"); args.push(updates.description); }
  if (updates.status !== undefined) { fields.push("status = ?"); args.push(updates.status); }
  if (updates.priority !== undefined) { fields.push("priority = ?"); args.push(updates.priority); }
  if (updates.targetDate !== undefined) { fields.push("target_date = ?"); args.push(updates.targetDate); }
  if (updates.tags !== undefined) { fields.push("tags = ?"); args.push(JSON.stringify(updates.tags)); }
  if (updates.storyLanguage !== undefined) { fields.push("story_language = ?"); args.push(updates.storyLanguage); }

  fields.push("updated_at = NOW()");
  args.push(goalId, createdBy);

  const [query, params] = p(`UPDATE goals SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await neonSql(query, params);
}

export async function saveParentAdvice(
  goalId: number,
  userId: string,
  advice: string,
  language: string,
) {
  await neonSql`
    UPDATE goals
    SET parent_advice = ${advice},
        parent_advice_language = ${language},
        parent_advice_generated_at = ${new Date().toISOString()},
        updated_at = NOW()
    WHERE id = ${goalId} AND user_id = ${userId}`;
}

// ============================================
// Therapy Research
// ============================================

export async function upsertTherapyResearch(
  goalId: number | null | undefined,
  userId: string,
  research: {
    issueId?: number | null;
    feedbackId?: number | null;
    journalEntryId?: number | null;
    therapeuticGoalType: string;
    title: string;
    authors: string[];
    year?: number | null;
    journal?: string | null;
    doi?: string | null;
    url?: string | null;
    abstract?: string | null;
    keyFindings: string[];
    therapeuticTechniques: string[];
    evidenceLevel?: string | null;
    relevanceScore: number;
    extractedBy: string;
    extractionConfidence: number;
  },
) {
  const dedupCol = goalId != null ? "goal_id" : (research.feedbackId != null ? "feedback_id" : null);
  const dedupVal = goalId != null ? goalId : (research.feedbackId != null ? research.feedbackId : null);

  let existingId: number | null = null;

  if (research.doi) {
    let doiRows;
    if (dedupCol) {
      const [q, params] = p(`SELECT id FROM therapy_research WHERE ${dedupCol} = ? AND doi = ?`, [dedupVal, research.doi]);
      doiRows = await neonSql(q, params);
    } else {
      doiRows = await neonSql`SELECT id FROM therapy_research WHERE goal_id IS NULL AND doi = ${research.doi}`;
    }
    if (doiRows.length > 0) existingId = doiRows[0].id as number;
  }

  if (!existingId) {
    let titleRows;
    if (dedupCol) {
      const [q, params] = p(`SELECT id FROM therapy_research WHERE ${dedupCol} = ? AND title = ?`, [dedupVal, research.title]);
      titleRows = await neonSql(q, params);
    } else {
      titleRows = await neonSql`SELECT id FROM therapy_research WHERE goal_id IS NULL AND title = ${research.title}`;
    }
    if (titleRows.length > 0) existingId = titleRows[0].id as number;
  }

  const authorsJson = JSON.stringify(
    (research.authors || []).filter((a: any) => typeof a === "string"),
  );
  const keyFindingsJson = JSON.stringify(
    (research.keyFindings || []).filter((k: any) => typeof k === "string"),
  );
  const techniquesJson = JSON.stringify(
    (research.therapeuticTechniques || []).filter(
      (t: any) => typeof t === "string",
    ),
  );

  const sanitizeNumber = (
    value: number | undefined | null,
    defaultValue: number = 0,
  ): number | null => {
    if (value === null || value === undefined) return null;
    if (!Number.isFinite(value)) return defaultValue;
    return value;
  };

  const rawRelevance = sanitizeNumber(research.relevanceScore, 0) ?? 0;
  const relevanceScore = rawRelevance <= 1 ? Math.round(rawRelevance * 100) : Math.round(rawRelevance);
  const rawConfidence = sanitizeNumber(research.extractionConfidence, 0) ?? 0;
  const extractionConfidence = rawConfidence <= 1 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence);

  if (existingId) {
    await neonSql`
      UPDATE therapy_research
      SET feedback_id = ${research.feedbackId ?? null},
          issue_id = ${research.issueId ?? null},
          journal_entry_id = ${research.journalEntryId ?? null},
          therapeutic_goal_type = ${research.therapeuticGoalType},
          authors = ${authorsJson},
          year = ${research.year || null},
          journal = ${research.journal || null},
          doi = ${research.doi || null},
          url = ${research.url || null},
          abstract = ${research.abstract || null},
          key_findings = ${keyFindingsJson},
          therapeutic_techniques = ${techniquesJson},
          evidence_level = ${research.evidenceLevel || null},
          relevance_score = ${relevanceScore},
          extracted_by = ${research.extractedBy},
          extraction_confidence = ${extractionConfidence},
          updated_at = NOW()
      WHERE id = ${existingId}`;
    return existingId;
  } else {
    const rows = await neonSql`
      INSERT INTO therapy_research (
        goal_id, feedback_id, issue_id, journal_entry_id, therapeutic_goal_type, title, authors, year, journal, doi, url,
        abstract, key_findings, therapeutic_techniques, evidence_level,
        relevance_score, extracted_by, extraction_confidence
      ) VALUES (
        ${goalId ?? null}, ${research.feedbackId ?? null}, ${research.issueId ?? null}, ${research.journalEntryId ?? null},
        ${research.therapeuticGoalType}, ${research.title}, ${authorsJson},
        ${research.year || null}, ${research.journal || null}, ${research.doi || null},
        ${research.url || null}, ${research.abstract || null}, ${keyFindingsJson},
        ${techniquesJson}, ${research.evidenceLevel || null},
        ${relevanceScore}, ${research.extractedBy}, ${extractionConfidence}
      ) RETURNING id`;
    if (!rows || rows.length === 0) {
      throw new Error("Failed to insert therapy research: no ID returned");
    }
    return Number(rows[0].id);
  }
}

export async function listTherapyResearch(goalId?: number, issueId?: number, feedbackId?: number, journalEntryId?: number) {
  let sqlStr = `SELECT * FROM therapy_research WHERE `;
  const args: any[] = [];

  if (journalEntryId != null) {
    sqlStr += `journal_entry_id = ?`;
    args.push(journalEntryId);
  } else if (feedbackId != null) {
    sqlStr += `feedback_id = ?`;
    args.push(feedbackId);
  } else if (issueId != null && goalId != null) {
    sqlStr += `(issue_id = ? OR goal_id = ?)`;
    args.push(issueId, goalId);
  } else if (issueId != null) {
    sqlStr += `issue_id = ?`;
    args.push(issueId);
  } else if (goalId != null) {
    sqlStr += `goal_id = ?`;
    args.push(goalId);
  } else {
    return [];
  }

  sqlStr += ` ORDER BY relevance_score DESC, created_at DESC`;

  const [query, params] = p(sqlStr, args);
  const rows = await neonSql(query, params);

  return rows.map((row) => ({
    id: row.id as number,
    goalId: (row.goal_id as number) || null,
    feedbackId: (row.feedback_id as number) || null,
    issueId: (row.issue_id as number) || null,
    journalEntryId: (row.journal_entry_id as number) || null,
    therapeuticGoalType: row.therapeutic_goal_type as string,
    title: row.title as string,
    authors: safeJsonParse(row.authors as string, []) as string[],
    year: (row.year as number) || null,
    journal: (row.journal as string) || null,
    doi: (row.doi as string) || null,
    url: (row.url as string) || null,
    abstract: (row.abstract as string) || null,
    keyFindings: safeJsonParse(row.key_findings as string, []) as string[],
    therapeuticTechniques: safeJsonParse(
      row.therapeutic_techniques as string, [],
    ) as string[],
    evidenceLevel: (row.evidence_level as string) || null,
    relevanceScore: (row.relevance_score as number) / 100,
    extractedBy: row.extracted_by as string,
    extractionConfidence: (row.extraction_confidence as number) / 100,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function deleteTherapyResearch(goalId: number): Promise<number> {
  const countRows = await neonSql`SELECT COUNT(*) as cnt FROM therapy_research WHERE goal_id = ${goalId}`;
  const count = Number(countRows[0]?.cnt ?? 0);

  await neonSql`DELETE FROM notes_research WHERE research_id IN (SELECT id FROM therapy_research WHERE goal_id = ${goalId})`;
  await neonSql`DELETE FROM therapy_research WHERE goal_id = ${goalId}`;

  return count;
}

export async function getResearchForNote(noteId: number) {
  const rows = await neonSql`
    SELECT tr.* FROM therapy_research tr
    INNER JOIN notes_research nr ON tr.id = nr.research_id
    WHERE nr.note_id = ${noteId}
    ORDER BY tr.relevance_score DESC, tr.created_at DESC`;

  return rows.map((row) => ({
    id: row.id as number,
    goalId: row.goal_id as number,
    therapeuticGoalType: row.therapeutic_goal_type as string,
    title: row.title as string,
    authors: safeJsonParse(row.authors as string, []) as string[],
    year: (row.year as number) || null,
    journal: (row.journal as string) || null,
    doi: (row.doi as string) || null,
    url: (row.url as string) || null,
    abstract: (row.abstract as string) || null,
    keyFindings: safeJsonParse(row.key_findings as string, []) as string[],
    therapeuticTechniques: safeJsonParse(
      row.therapeutic_techniques as string, [],
    ) as string[],
    evidenceLevel: (row.evidence_level as string) || null,
    relevanceScore: (row.relevance_score as number) / 100,
    extractedBy: row.extracted_by as string,
    extractionConfidence: (row.extraction_confidence as number) / 100,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

// ============================================
// Notes
// ============================================

export async function getNoteById(noteId: number, userId: string) {
  const rows = await neonSql`SELECT * FROM notes WHERE id = ${noteId}`;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id as number,
    entityId: row.entity_id as number,
    entityType: row.entity_type as string,
    createdBy: row.user_id as string,
    noteType: (row.note_type as string) || null,
    slug: (row.slug as string) || null,
    title: (row.title as string) || null,
    content: row.content as string,
    tags: safeJsonParse(row.tags as string, []),
    visibility: (row.visibility as string) || "PRIVATE",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getNoteBySlug(slug: string, userId: string) {
  const rows = await neonSql`SELECT * FROM notes WHERE slug = ${slug}`;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id as number,
    entityId: row.entity_id as number,
    entityType: row.entity_type as string,
    createdBy: row.user_id as string,
    noteType: (row.note_type as string) || null,
    slug: (row.slug as string) || null,
    title: (row.title as string) || null,
    content: row.content as string,
    tags: safeJsonParse(row.tags as string, []),
    visibility: (row.visibility as string) || "PRIVATE",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getAllNotesForUser(userId: string) {
  const rows = await neonSql`SELECT * FROM notes WHERE user_id = ${userId} ORDER BY created_at DESC`;

  return rows.map((row) => ({
    id: row.id as number,
    entityId: row.entity_id as number,
    entityType: row.entity_type as string,
    createdBy: row.user_id as string,
    noteType: (row.note_type as string) || null,
    slug: (row.slug as string) || null,
    title: (row.title as string) || null,
    content: row.content as string,
    tags: safeJsonParse(row.tags as string, []),
    visibility: (row.visibility as string) || "PRIVATE",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function listNotesForEntity(
  entityId: number,
  entityType: string,
  userId: string,
) {
  const rows = await neonSql`SELECT * FROM notes WHERE entity_id = ${entityId} AND entity_type = ${entityType} AND user_id = ${userId} ORDER BY created_at DESC`;

  return rows.map((row) => ({
    id: row.id as number,
    entityId: row.entity_id as number,
    entityType: row.entity_type as string,
    createdBy: row.user_id as string,
    noteType: (row.note_type as string) || null,
    slug: (row.slug as string) || null,
    title: (row.title as string) || null,
    content: row.content as string,
    tags: safeJsonParse(row.tags as string, []),
    visibility: (row.visibility as string) || "PRIVATE",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function createNote(params: {
  entityId: number;
  entityType: string;
  userId: string;
  content: string;
  slug?: string | null;
  noteType: string | null;
  createdBy: string | null;
  tags: string[];
}) {
  const tagsJson = JSON.stringify(params.tags);
  const slug =
    params.slug ||
    params.content
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 50);

  const rows = await neonSql`
    INSERT INTO notes (entity_id, entity_type, user_id, note_type, slug, content, created_by, tags)
    VALUES (${params.entityId}, ${params.entityType}, ${params.userId}, ${params.noteType}, ${slug}, ${params.content}, ${params.createdBy}, ${tagsJson})
    RETURNING id`;

  return rows[0].id as number;
}

export async function updateNote(
  noteId: number,
  userId: string,
  updates: {
    entityId?: number;
    entityType?: string;
    noteType?: string | null;
    content?: string;
    createdBy?: string | null;
    tags?: string[];
    title?: string | null;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.entityId !== undefined) { fields.push("entity_id = ?"); args.push(updates.entityId); }
  if (updates.entityType !== undefined) { fields.push("entity_type = ?"); args.push(updates.entityType); }
  if (updates.noteType !== undefined) { fields.push("note_type = ?"); args.push(updates.noteType); }
  if (updates.content !== undefined) { fields.push("content = ?"); args.push(updates.content); }
  if (updates.createdBy !== undefined) { fields.push("created_by = ?"); args.push(updates.createdBy); }
  if (updates.tags !== undefined) { fields.push("tags = ?"); args.push(JSON.stringify(updates.tags)); }
  if (updates.title !== undefined) { fields.push("title = ?"); args.push(updates.title); }

  fields.push("updated_at = NOW()");
  args.push(noteId, userId);

  const [query, params] = p(`UPDATE notes SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await neonSql(query, params);
}

export async function linkResearchToNote(
  noteId: number,
  researchIds: number[],
) {
  await neonSql`DELETE FROM notes_research WHERE note_id = ${noteId}`;

  for (const researchId of researchIds) {
    await neonSql`INSERT INTO notes_research (note_id, research_id) VALUES (${noteId}, ${researchId})`;
  }
}

// ============================================
// Note Access Control & Sharing
// ============================================

export async function canViewerReadNote(
  noteId: number,
  viewerEmail: string | null,
): Promise<{ canRead: boolean; canEdit: boolean; reason: string }> {
  const ve = viewerEmail || "";
  const vn = normalizeEmail(ve);
  const rows = await neonSql`
    SELECT
      n.visibility,
      n.user_id as owner_email,
      CASE
        WHEN n.visibility = 'PUBLIC' THEN 1
        WHEN n.user_id = ${ve} THEN 1
        WHEN EXISTS (
          SELECT 1 FROM note_shares s
          WHERE s.note_id = n.id AND s.email = ${vn}
        ) THEN 1
        ELSE 0
      END AS can_read
    FROM notes n
    WHERE n.id = ${noteId}
    LIMIT 1`;

  if (rows.length === 0) {
    return { canRead: false, canEdit: false, reason: "NOT_FOUND" };
  }

  const row = rows[0];
  const canRead = Number(row.can_read) === 1;
  const ownerEmail = row.owner_email as string;
  const visibility = row.visibility as string;

  if (!canRead) {
    return { canRead: false, canEdit: false, reason: "FORBIDDEN" };
  }

  if (viewerEmail === ownerEmail) {
    return { canRead: true, canEdit: true, reason: "OWNER" };
  }

  if (visibility === "PUBLIC") {
    return { canRead: true, canEdit: false, reason: "PUBLIC" };
  }

  const shareRows = await neonSql`SELECT role FROM note_shares WHERE note_id = ${noteId} AND email = ${normalizeEmail(viewerEmail || "")}`;

  if (shareRows.length > 0) {
    const role = shareRows[0].role as string;
    return {
      canRead: true,
      canEdit: role === "EDITOR",
      reason: `SHARED_${role}`,
    };
  }

  return { canRead: true, canEdit: false, reason: "SHARED" };
}

export async function setNoteVisibility(
  noteId: number,
  visibility: "PRIVATE" | "PUBLIC",
  userId: string,
) {
  await neonSql`UPDATE notes SET visibility = ${visibility}, updated_at = NOW() WHERE id = ${noteId} AND user_id = ${userId}`;
  return getNoteById(noteId, userId);
}

export async function shareNote(
  noteId: number,
  email: string,
  role: "READER" | "EDITOR",
  createdBy: string,
) {
  const normalizedEmail = normalizeEmail(email);

  await neonSql`
    INSERT INTO note_shares (note_id, email, role, created_by)
    VALUES (${noteId}, ${normalizedEmail}, ${role}, ${createdBy})
    ON CONFLICT (note_id, email)
    DO UPDATE SET role = excluded.role`;

  const rows = await neonSql`SELECT * FROM note_shares WHERE note_id = ${noteId} AND email = ${normalizedEmail}`;

  const row = rows[0];
  return {
    noteId: row.note_id as number,
    email: row.email as string,
    role: row.role as string,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

export async function unshareNote(
  noteId: number,
  email: string,
  userId: string,
) {
  const normalizedEmail = normalizeEmail(email);
  const rows = await neonSql`DELETE FROM note_shares WHERE note_id = ${noteId} AND email = ${normalizedEmail} RETURNING note_id`;
  return rows.length > 0;
}

export async function getNoteShares(noteId: number) {
  const rows = await neonSql`SELECT * FROM note_shares WHERE note_id = ${noteId} ORDER BY created_at DESC`;

  return rows.map((row) => ({
    noteId: row.note_id as number,
    email: row.email as string,
    role: row.role as string,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  }));
}

export async function getSharedNotes(viewerEmail: string) {
  const normalizedEmail = normalizeEmail(viewerEmail);

  const rows = await neonSql`
    SELECT n.*
    FROM notes n
    JOIN note_shares s ON s.note_id = n.id
    WHERE s.email = ${normalizedEmail}
    ORDER BY n.updated_at DESC`;

  return rows.map((row) => ({
    id: row.id as number,
    entityId: row.entity_id as number,
    entityType: row.entity_type as string,
    createdBy: row.user_id as string,
    noteType: (row.note_type as string) || null,
    slug: (row.slug as string) || null,
    title: (row.title as string) || null,
    content: row.content as string,
    tags: safeJsonParse(row.tags as string, []),
    visibility: (row.visibility as string) || "PRIVATE",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

// ============================================
// Stories
// ============================================

function mapStoryRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    goalId: (row.goal_id as number) ?? null,
    issueId: (row.issue_id as number) ?? null,
    feedbackId: (row.feedback_id as number) ?? null,
    createdBy: (row.user_id as string) ?? null,
    content: row.content as string,
    language: (row.language as string) ?? null,
    minutes: (row.minutes as number) ?? null,
    audioKey: (row.audio_key as string) ?? null,
    audioUrl: (row.audio_url as string) ?? null,
    audioGeneratedAt: (row.audio_generated_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getAllStoriesForUser(createdBy: string) {
  const rows = await neonSql`SELECT * FROM stories WHERE user_id = ${createdBy} ORDER BY created_at DESC`;
  return rows.map(mapStoryRow);
}

export async function listStories(goalId: number) {
  const rows = await neonSql`SELECT * FROM stories WHERE goal_id = ${goalId} ORDER BY created_at DESC`;
  return rows.map(mapStoryRow);
}

export async function listStoriesForIssue(issueId: number) {
  const rows = await neonSql`SELECT * FROM stories WHERE issue_id = ${issueId} ORDER BY created_at DESC`;
  return rows.map(mapStoryRow);
}

export async function listStoriesForFeedback(feedbackId: number) {
  const rows = await neonSql`SELECT * FROM stories WHERE feedback_id = ${feedbackId} ORDER BY created_at DESC`;
  return rows.map(mapStoryRow);
}

export async function getStory(storyId: number) {
  const rows = await neonSql`SELECT * FROM stories WHERE id = ${storyId}`;
  if (rows.length === 0) return null;
  return mapStoryRow(rows[0]);
}

export async function createStory(params: {
  goalId?: number | null;
  issueId?: number | null;
  feedbackId?: number | null;
  createdBy?: string | null;
  content: string;
  language?: string | null;
  minutes?: number | null;
}) {
  const rows = await neonSql`
    INSERT INTO stories (goal_id, issue_id, feedback_id, user_id, content, language, minutes)
    VALUES (${params.goalId ?? null}, ${params.issueId ?? null}, ${params.feedbackId ?? null}, ${params.createdBy ?? null}, ${params.content}, ${params.language ?? null}, ${params.minutes ?? null})
    RETURNING *`;
  return mapStoryRow(rows[0]);
}

export async function updateStory(
  storyId: number,
  createdBy: string,
  updates: {
    content?: string;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.content !== undefined) { fields.push("content = ?"); args.push(updates.content); }

  fields.push("updated_at = NOW()");
  args.push(storyId, createdBy);

  const [query, params] = p(`UPDATE stories SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await neonSql(query, params);
}

export async function updateStoryAudio(id: number, audioKey: string, audioUrl: string) {
  const now = new Date().toISOString();
  await neonSql`UPDATE stories SET audio_key = ${audioKey}, audio_url = ${audioUrl}, audio_generated_at = ${now}, updated_at = ${now} WHERE id = ${id}`;
}

export async function deleteStory(storyId: number, createdBy: string) {
  await neonSql`DELETE FROM stories WHERE id = ${storyId} AND (user_id = ${createdBy} OR user_id IS NULL)`;
}

// ============================================
// Generation Jobs
// ============================================

export async function cleanupStaleJobs(minutes = 15): Promise<void> {
  await neonSql`
    UPDATE generation_jobs
    SET status = 'FAILED',
        error = '{"message":"Job timed out — no progress updates received"}',
        updated_at = NOW()
    WHERE status = 'RUNNING'
      AND updated_at::timestamptz < NOW() - (${minutes} * INTERVAL '1 minute')`;
}

export async function createGenerationJob(
  id: string,
  userId: string,
  type: "AUDIO" | "RESEARCH" | "QUESTIONS" | "LONGFORM" | "DEEP_ANALYSIS",
  goalId?: number | null,
  storyId?: number,
) {
  await neonSql`
    INSERT INTO generation_jobs (id, user_id, type, goal_id, story_id, status, progress)
    VALUES (${id}, ${userId}, ${type}, ${goalId ?? null}, ${storyId || null}, 'RUNNING', 0)`;
}

export async function updateGenerationJob(
  id: string,
  updates: {
    status?: "RUNNING" | "SUCCEEDED" | "FAILED";
    progress?: number;
    result?: any;
    error?: any;
    storyId?: number;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.status) { fields.push("status = ?"); args.push(updates.status); }
  if (updates.progress !== undefined) { fields.push("progress = ?"); args.push(updates.progress); }
  if (updates.storyId !== undefined) { fields.push("story_id = ?"); args.push(updates.storyId); }
  if (updates.result) {
    fields.push("result = ?");
    args.push(typeof updates.result === "string" ? updates.result : JSON.stringify(updates.result));
  }
  if (updates.error) {
    fields.push("error = ?");
    args.push(typeof updates.error === "string" ? updates.error : JSON.stringify(updates.error));
  }

  fields.push("updated_at = NOW()");
  args.push(id);

  const [query, params] = p(`UPDATE generation_jobs SET ${fields.join(", ")} WHERE id = ?`, args);
  await neonSql(query, params);
}

function parseJobError(raw: string): { message: string; code?: string; details?: string } {
  try {
    const first = JSON.parse(raw);
    if (typeof first === "string") {
      try {
        const second = JSON.parse(first);
        if (second && typeof second === "object" && "message" in second) {
          return second as { message: string; code?: string; details?: string };
        }
      } catch {
        return { message: first };
      }
    }
    if (first && typeof first === "object" && "message" in first) {
      return first as { message: string; code?: string; details?: string };
    }
    return { message: String(first) };
  } catch {
    return { message: raw };
  }
}

export async function listGenerationJobs(filters: { userId?: string; goalId?: number; status?: string } = {}) {
  const conditions: string[] = [];
  const args: any[] = [];

  if (filters.userId) { conditions.push("user_id = ?"); args.push(filters.userId); }
  if (filters.goalId) { conditions.push("goal_id = ?"); args.push(filters.goalId); }
  if (filters.status) { conditions.push("status = ?"); args.push(filters.status); }

  let query = "SELECT * FROM generation_jobs";
  if (conditions.length > 0) query += ` WHERE ${conditions.join(" AND ")}`;
  query += " ORDER BY created_at DESC";

  const [q, params] = p(query, args);
  const rows = await neonSql(q, params);

  return rows.map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as any,
    goalId: row.goal_id as number,
    storyId: (row.story_id as number) || null,
    status: row.status as any,
    progress: row.progress as number,
    result: safeJsonParse(row.result as string, null),
    error: row.error ? parseJobError(row.error as string) : null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function getGenerationJob(id: string) {
  const rows = await neonSql`SELECT * FROM generation_jobs WHERE id = ${id}`;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as string,
    goalId: row.goal_id as number,
    storyId: (row.story_id as number) || null,
    status: row.status as string,
    progress: row.progress as number,
    result: safeJsonParse(row.result as string, null),
    error: row.error ? parseJobError(row.error as string) : null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ============================================
// Therapeutic Questions
// ============================================

export async function listTherapeuticQuestions(goalId?: number, issueId?: number, journalEntryId?: number) {
  const rows = journalEntryId
    ? await neonSql`SELECT * FROM therapeutic_questions WHERE journal_entry_id = ${journalEntryId} ORDER BY created_at DESC`
    : issueId
      ? await neonSql`SELECT * FROM therapeutic_questions WHERE issue_id = ${issueId} ORDER BY created_at DESC`
      : goalId
        ? await neonSql`SELECT * FROM therapeutic_questions WHERE goal_id = ${goalId} ORDER BY created_at DESC`
        : [];

  return rows.map((row) => ({
    id: row.id as number,
    goalId: (row.goal_id as number) || null,
    issueId: (row.issue_id as number) || null,
    journalEntryId: (row.journal_entry_id as number) || null,
    question: row.question as string,
    researchId: (row.research_id as number) || null,
    researchTitle: (row.research_title as string) || null,
    rationale: row.rationale as string,
    generatedAt: row.generated_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function insertTherapeuticQuestions(
  questions: Array<{
    goalId?: number;
    issueId?: number;
    journalEntryId?: number;
    question: string;
    researchId?: number;
    researchTitle?: string;
    rationale: string;
  }>,
) {
  const now = new Date().toISOString();
  const inserted = [];
  for (const q of questions) {
    const rows = await neonSql`
      INSERT INTO therapeutic_questions (goal_id, issue_id, journal_entry_id, question, research_id, research_title, rationale, generated_at, created_at, updated_at)
      VALUES (${q.goalId ?? null}, ${q.issueId ?? null}, ${q.journalEntryId ?? null}, ${q.question}, ${q.researchId ?? null}, ${q.researchTitle ?? null}, ${q.rationale}, ${now}, ${now}, ${now})
      RETURNING *
    `;
    if (rows[0]) inserted.push(rows[0]);
  }
  return inserted.map((row) => ({
    id: row.id as number,
    goalId: (row.goal_id as number) || null,
    issueId: (row.issue_id as number) || null,
    journalEntryId: (row.journal_entry_id as number) || null,
    question: row.question as string,
    researchId: (row.research_id as number) || null,
    researchTitle: (row.research_title as string) || null,
    rationale: row.rationale as string,
    generatedAt: row.generated_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function deleteTherapeuticQuestions(goalId?: number, issueId?: number, journalEntryId?: number) {
  if (journalEntryId) {
    const rows = await neonSql`DELETE FROM therapeutic_questions WHERE journal_entry_id = ${journalEntryId} RETURNING id`;
    return rows.length;
  }
  if (issueId) {
    const rows = await neonSql`DELETE FROM therapeutic_questions WHERE issue_id = ${issueId} RETURNING id`;
    return rows.length;
  }
  if (goalId) {
    const rows = await neonSql`DELETE FROM therapeutic_questions WHERE goal_id = ${goalId} RETURNING id`;
    return rows.length;
  }
  return 0;
}


export async function getTextSegmentsForStory(storyId: number) {
  const rows = await neonSql`SELECT * FROM text_segments WHERE story_id = ${storyId} ORDER BY idx ASC`;

  return rows.map((row) => ({
    id: row.id as number,
    goalId: row.goal_id as number,
    storyId: (row.story_id as number) || null,
    idx: row.idx as number,
    text: row.text as string,
    createdAt: row.created_at as string,
  }));
}

export async function getAudioAssetsForStory(storyId: number) {
  const rows = await neonSql`SELECT * FROM audio_assets WHERE story_id = ${storyId} ORDER BY created_at DESC`;

  return rows.map((row) => ({
    id: row.id as string,
    createdBy: row.user_id as string,
    goalId: row.goal_id as number,
    storyId: (row.story_id as number) || null,
    language: row.language as string,
    voice: row.voice as string,
    mimeType: row.mime_type as string,
    manifest: safeJsonParse(row.manifest as string, { segmentCount: 0, segments: [] }),
    createdAt: row.created_at as string,
  }));
}

// ============================================
// Journal Entries
// ============================================

export async function listJournalEntries(
  userId: string,
  opts?: {
    familyMemberId?: number;
    goalId?: number;
    mood?: string;
    tag?: string;
    fromDate?: string;
    toDate?: string;
  },
) {
  let sqlStr = `SELECT * FROM journal_entries WHERE user_id = ?`;
  const args: any[] = [userId];

  if (opts?.familyMemberId) { sqlStr += ` AND family_member_id = ?`; args.push(opts.familyMemberId); }
  if (opts?.goalId) { sqlStr += ` AND goal_id = ?`; args.push(opts.goalId); }
  if (opts?.mood) { sqlStr += ` AND mood = ?`; args.push(opts.mood); }
  if (opts?.tag) { sqlStr += ` AND tags LIKE ?`; args.push(`%"${opts.tag}"%`); }
  if (opts?.fromDate) { sqlStr += ` AND entry_date >= ?`; args.push(opts.fromDate); }
  if (opts?.toDate) { sqlStr += ` AND entry_date <= ?`; args.push(opts.toDate); }

  sqlStr += ` ORDER BY entry_date DESC, created_at DESC`;

  const [query, params] = p(sqlStr, args);
  const rows = await neonSql(query, params);
  return rows.map((row) => ({
    id: row.id as number,
    userId: row.user_id as string,
    familyMemberId: (row.family_member_id as number) || null,
    title: (row.title as string) || null,
    content: row.content as string,
    mood: (row.mood as string) || null,
    moodScore: (row.mood_score as number) || null,
    tags: safeJsonParse(row.tags as string, []),
    goalId: (row.goal_id as number) || null,
    isPrivate: (row.is_private as number) === 1,
    entryDate: row.entry_date as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function getJournalEntry(id: number, userId: string) {
  const rows = await neonSql`SELECT * FROM journal_entries WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as number,
    userId: row.user_id as string,
    familyMemberId: (row.family_member_id as number) || null,
    title: (row.title as string) || null,
    content: row.content as string,
    mood: (row.mood as string) || null,
    moodScore: (row.mood_score as number) || null,
    tags: safeJsonParse(row.tags as string, []),
    goalId: (row.goal_id as number) || null,
    isPrivate: (row.is_private as number) === 1,
    entryDate: row.entry_date as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createJournalEntry(params: {
  userId: string;
  familyMemberId?: number | null;
  title?: string | null;
  content: string;
  mood?: string | null;
  moodScore?: number | null;
  tags?: string[];
  goalId?: number | null;
  isPrivate?: boolean;
  entryDate: string;
}): Promise<number> {
  const tagsJson = JSON.stringify(params.tags || []);
  const isPrivate = params.isPrivate !== false ? 1 : 0;
  const rows = await neonSql`
    INSERT INTO journal_entries (user_id, family_member_id, title, content, mood, mood_score, tags, goal_id, is_private, entry_date, created_at, updated_at)
    VALUES (${params.userId}, ${params.familyMemberId ?? null}, ${params.title ?? null}, ${params.content}, ${params.mood ?? null}, ${params.moodScore ?? null}, ${tagsJson}, ${params.goalId ?? null}, ${isPrivate}, ${params.entryDate}, NOW(), NOW())
    RETURNING id`;
  return rows[0].id as number;
}

export async function updateJournalEntry(
  id: number,
  userId: string,
  updates: {
    title?: string | null;
    content?: string;
    mood?: string | null;
    moodScore?: number | null;
    tags?: string[];
    goalId?: number | null;
    familyMemberId?: number | null;
    isPrivate?: boolean;
    entryDate?: string;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.title !== undefined) { fields.push("title = ?"); args.push(updates.title); }
  if (updates.content !== undefined) { fields.push("content = ?"); args.push(updates.content); }
  if (updates.mood !== undefined) { fields.push("mood = ?"); args.push(updates.mood); }
  if (updates.moodScore !== undefined) { fields.push("mood_score = ?"); args.push(updates.moodScore); }
  if (updates.tags !== undefined) { fields.push("tags = ?"); args.push(JSON.stringify(updates.tags)); }
  if (updates.goalId !== undefined) { fields.push("goal_id = ?"); args.push(updates.goalId); }
  if (updates.familyMemberId !== undefined) { fields.push("family_member_id = ?"); args.push(updates.familyMemberId); }
  if (updates.isPrivate !== undefined) { fields.push("is_private = ?"); args.push(updates.isPrivate ? 1 : 0); }
  if (updates.entryDate !== undefined) { fields.push("entry_date = ?"); args.push(updates.entryDate); }

  if (fields.length === 0) return;

  fields.push("updated_at = NOW()");
  args.push(id, userId);

  const [query, params] = p(`UPDATE journal_entries SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await neonSql(query, params);
}

export async function deleteJournalEntry(
  id: number,
  userId: string,
): Promise<boolean> {
  await neonSql`DELETE FROM journal_entries WHERE id = ${id} AND user_id = ${userId}`;
  return true;
}

// ============================================
// Behavior Observations
// ============================================

export async function createBehaviorObservation(params: {
  familyMemberId: number;
  goalId?: number | null;
  issueId?: number | null;
  userId: string;
  observedAt: string;
  observationType: string;
  frequency?: number | null;
  intensity?: string | null;
  context?: string | null;
  notes?: string | null;
}): Promise<number> {
  const safeFrequency =
    params.frequency !== null &&
    params.frequency !== undefined &&
    !isNaN(params.frequency) &&
    isFinite(params.frequency)
      ? params.frequency
      : null;
  const rows = await neonSql`
    INSERT INTO behavior_observations (family_member_id, goal_id, issue_id, user_id, observed_at, observation_type, frequency, intensity, context, notes, created_at, updated_at)
    VALUES (${params.familyMemberId}, ${params.goalId ?? null}, ${params.issueId ?? null}, ${params.userId}, ${params.observedAt}, ${params.observationType}, ${safeFrequency}, ${params.intensity ?? null}, ${params.context ?? null}, ${params.notes ?? null}, NOW(), NOW())
    RETURNING id`;
  return rows[0].id as number;
}

export async function getBehaviorObservationsForFamilyMember(
  familyMemberId: number,
  userId: string,
  goalId?: number,
) {
  let sqlStr = `SELECT * FROM behavior_observations WHERE family_member_id = ? AND user_id = ?`;
  const args: any[] = [familyMemberId, userId];

  if (goalId !== undefined) { sqlStr += ` AND goal_id = ?`; args.push(goalId); }

  sqlStr += ` ORDER BY observed_at DESC, created_at DESC`;

  const [query, params] = p(sqlStr, args);
  const rows = await neonSql(query, params);
  return rows.map((row) => ({
    id: row.id as number,
    familyMemberId: row.family_member_id as number,
    goalId: (row.goal_id as number) || null,
    userId: row.user_id as string,
    observedAt: row.observed_at as string,
    observationType: row.observation_type as string,
    frequency: (row.frequency as number) ?? null,
    intensity: (row.intensity as string) || null,
    context: (row.context as string) || null,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function getBehaviorObservation(id: number, userId: string) {
  const rows = await neonSql`SELECT * FROM behavior_observations WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as number,
    familyMemberId: row.family_member_id as number,
    goalId: (row.goal_id as number) || null,
    userId: row.user_id as string,
    observedAt: row.observed_at as string,
    observationType: row.observation_type as string,
    frequency: (row.frequency as number) ?? null,
    intensity: (row.intensity as string) || null,
    context: (row.context as string) || null,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function updateBehaviorObservation(
  id: number,
  userId: string,
  updates: {
    observedAt?: string;
    observationType?: string;
    frequency?: number | null;
    intensity?: string | null;
    context?: string | null;
    notes?: string | null;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.observedAt !== undefined) { fields.push("observed_at = ?"); args.push(updates.observedAt); }
  if (updates.observationType !== undefined) { fields.push("observation_type = ?"); args.push(updates.observationType); }
  if (updates.frequency !== undefined) {
    const safeFrequency =
      updates.frequency !== null &&
      !isNaN(updates.frequency) &&
      isFinite(updates.frequency)
        ? updates.frequency
        : null;
    fields.push("frequency = ?");
    args.push(safeFrequency);
  }
  if (updates.intensity !== undefined) { fields.push("intensity = ?"); args.push(updates.intensity); }
  if (updates.context !== undefined) { fields.push("context = ?"); args.push(updates.context); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); args.push(updates.notes); }

  if (fields.length === 0) return;

  fields.push("updated_at = NOW()");
  args.push(id, userId);

  const [query, params] = p(`UPDATE behavior_observations SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await neonSql(query, params);
}

export async function deleteBehaviorObservation(
  id: number,
  userId: string,
): Promise<void> {
  await neonSql`DELETE FROM behavior_observations WHERE id = ${id} AND user_id = ${userId}`;
}

function sanitizeInt(val: number | null | undefined): number | null {
  if (val === undefined || val === null || isNaN(val) || !isFinite(val))
    return null;
  return val;
}

// ============================================
// Issue Behavior Observations
// ============================================

export async function getIssueBehaviorObservations(
  issueId: number,
  userId: string,
) {
  const rows = await neonSql`SELECT * FROM behavior_observations WHERE issue_id = ${issueId} AND user_id = ${userId} ORDER BY observed_at DESC`;
  return rows.map((row) => ({
    id: row.id as number,
    familyMemberId: row.family_member_id as number,
    goalId: (row.goal_id as number) || null,
    issueId: (row.issue_id as number) || null,
    userId: row.user_id as string,
    observedAt: row.observed_at as string,
    observationType: row.observation_type as string,
    frequency: (row.frequency as number) ?? null,
    intensity: (row.intensity as string) || null,
    context: (row.context as string) || null,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

// ============================================
// Bidirectional Relationships
// ============================================

export async function getRelationshipsBidirectional(
  subjectType: string,
  subjectId: number,
  userId: string,
) {
  const rows = await neonSql`
    SELECT * FROM relationships
    WHERE user_id = ${userId} AND (
      (subject_type = ${subjectType} AND subject_id = ${subjectId}) OR
      (related_type = ${subjectType} AND related_id = ${subjectId})
    )
    ORDER BY created_at DESC`;
  return rows.map((row) => ({
    id: row.id as number,
    userId: row.user_id as string,
    subjectType: row.subject_type as string,
    subjectId: row.subject_id as number,
    relatedType: row.related_type as string,
    relatedId: row.related_id as number,
    relationshipType: row.relationship_type as string,
    context: (row.context as string) || null,
    startDate: (row.start_date as string) || null,
    status: (row.status as string) || "active",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

// ============================================
// Contacts
// ============================================

export async function getContactsForUser(userId: string) {
  const rows = await neonSql`SELECT * FROM contacts WHERE user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map((row) => ({
    id: row.id as number,
    userId: row.user_id as string,
    slug: (row.slug as string) || null,
    firstName: row.first_name as string,
    lastName: (row.last_name as string) || null,
    description: (row.description as string) || null,
    role: (row.role as string) || null,
    ageYears: (row.age_years as number) || null,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function getContact(id: number, userId: string) {
  const rows = await neonSql`SELECT * FROM contacts WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as number,
    userId: row.user_id as string,
    slug: (row.slug as string) || null,
    firstName: row.first_name as string,
    lastName: (row.last_name as string) || null,
    description: (row.description as string) || null,
    role: (row.role as string) || null,
    ageYears: (row.age_years as number) || null,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getContactBySlug(slug: string, userId: string) {
  const rows = await neonSql`SELECT * FROM contacts WHERE slug = ${slug} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as number,
    userId: row.user_id as string,
    slug: (row.slug as string) || null,
    firstName: row.first_name as string,
    lastName: (row.last_name as string) || null,
    description: (row.description as string) || null,
    role: (row.role as string) || null,
    ageYears: (row.age_years as number) || null,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

async function generateContactSlug(firstName: string, userId: string): Promise<string> {
  const base = slugify(firstName);
  if (!base) return `contact-${Date.now()}`;

  const existing = await getContactBySlug(base, userId);
  if (!existing) return base;

  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    const check = await getContactBySlug(candidate, userId);
    if (!check) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function createContact(params: {
  userId: string;
  firstName: string;
  lastName?: string | null;
  description?: string | null;
  role?: string | null;
  ageYears?: number | null;
  notes?: string | null;
}): Promise<number> {
  const safeAge =
    params.ageYears !== undefined &&
    params.ageYears !== null &&
    !isNaN(params.ageYears) &&
    isFinite(params.ageYears)
      ? params.ageYears
      : null;

  const slug = await generateContactSlug(params.firstName, params.userId);
  const rows = await neonSql`
    INSERT INTO contacts (user_id, slug, first_name, last_name, description, role, age_years, notes, created_at, updated_at)
    VALUES (${params.userId}, ${slug}, ${params.firstName}, ${params.lastName ?? null}, ${params.description ?? null}, ${params.role ?? null}, ${safeAge}, ${params.notes ?? null}, NOW(), NOW())
    RETURNING id`;
  return rows[0].id as number;
}

export async function updateContact(
  id: number,
  userId: string,
  updates: {
    firstName?: string;
    lastName?: string | null;
    slug?: string | null;
    description?: string | null;
    role?: string | null;
    ageYears?: number | null;
    notes?: string | null;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.firstName !== undefined) { fields.push("first_name = ?"); args.push(updates.firstName); }
  if (updates.slug !== undefined && updates.slug !== null) { fields.push("slug = ?"); args.push(updates.slug); }
  if (updates.lastName !== undefined) { fields.push("last_name = ?"); args.push(updates.lastName); }
  if (updates.description !== undefined) { fields.push("description = ?"); args.push(updates.description); }
  if (updates.role !== undefined) { fields.push("role = ?"); args.push(updates.role); }
  if (updates.ageYears !== undefined) {
    const safeAge =
      updates.ageYears !== null &&
      !isNaN(updates.ageYears) &&
      isFinite(updates.ageYears)
        ? updates.ageYears
        : null;
    fields.push("age_years = ?");
    args.push(safeAge);
  }
  if (updates.notes !== undefined) { fields.push("notes = ?"); args.push(updates.notes); }

  if (fields.length === 0) return;

  fields.push("updated_at = NOW()");
  args.push(id, userId);

  const [query, params] = p(`UPDATE contacts SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await neonSql(query, params);
}

export async function deleteContact(
  id: number,
  userId: string,
): Promise<void> {
  await neonSql`DELETE FROM contacts WHERE id = ${id} AND user_id = ${userId}`;
}

// ============================================
// Relationships
// ============================================

export async function getRelationshipsForPerson(
  userId: string,
  subjectType: string,
  subjectId: number,
) {
  const rows = await neonSql`
    SELECT
      r.*,
      c.id AS c_id, c.slug AS c_slug, c.first_name AS c_first_name, c.last_name AS c_last_name,
      fm.id AS fm_id, fm.slug AS fm_slug, fm.first_name AS fm_first_name, fm.name AS fm_name
    FROM relationships r
    LEFT JOIN contacts c
      ON c.id = r.related_id AND r.related_type = 'CONTACT' AND c.user_id = ${userId}
    LEFT JOIN family_members fm
      ON fm.id = r.related_id AND r.related_type = 'FAMILY_MEMBER'
    WHERE r.user_id = ${userId} AND (
      (r.subject_type = ${subjectType} AND r.subject_id = ${subjectId}) OR
      (r.related_type = ${subjectType} AND r.related_id = ${subjectId})
    )
    ORDER BY r.created_at DESC`;
  return rows.map((row) => {
    let related: { id: number; type: string; slug: string | null; firstName: string; lastName: string | null } | null = null;
    if (row.related_type === 'CONTACT' && row.c_id) {
      related = { id: row.c_id as number, type: 'CONTACT', slug: (row.c_slug as string) || null, firstName: row.c_first_name as string, lastName: (row.c_last_name as string) || null };
    } else if (row.related_type === 'FAMILY_MEMBER' && row.fm_id) {
      related = { id: row.fm_id as number, type: 'FAMILY_MEMBER', slug: (row.fm_slug as string) || null, firstName: row.fm_first_name as string, lastName: (row.fm_name as string) || null };
    }
    return {
      id: row.id as number,
      userId: row.user_id as string,
      subjectType: row.subject_type as string,
      subjectId: row.subject_id as number,
      relatedType: row.related_type as string,
      relatedId: row.related_id as number,
      relationshipType: row.relationship_type as string,
      context: (row.context as string) || null,
      startDate: (row.start_date as string) || null,
      status: (row.status as string) || "active",
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      related,
    };
  });
}

export async function getRelationship(id: number, userId: string) {
  const rows = await neonSql`SELECT * FROM relationships WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as number,
    userId: row.user_id as string,
    subjectType: row.subject_type as string,
    subjectId: row.subject_id as number,
    relatedType: row.related_type as string,
    relatedId: row.related_id as number,
    relationshipType: row.relationship_type as string,
    context: (row.context as string) || null,
    startDate: (row.start_date as string) || null,
    status: (row.status as string) || "active",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createRelationship(params: {
  userId: string;
  subjectType: string;
  subjectId: number;
  relatedType: string;
  relatedId: number;
  relationshipType: string;
  context?: string | null;
  startDate?: string | null;
  status?: string | null;
}): Promise<number> {
  const rows = await neonSql`
    INSERT INTO relationships (user_id, subject_type, subject_id, related_type, related_id, relationship_type, context, start_date, status, created_at, updated_at)
    VALUES (${params.userId}, ${params.subjectType}, ${params.subjectId}, ${params.relatedType}, ${params.relatedId}, ${params.relationshipType}, ${params.context ?? null}, ${params.startDate ?? null}, ${params.status ?? "active"}, NOW(), NOW())
    RETURNING id`;
  return rows[0].id as number;
}

export async function updateRelationship(
  id: number,
  userId: string,
  updates: {
    relationshipType?: string;
    context?: string | null;
    startDate?: string | null;
    status?: string | null;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.relationshipType !== undefined) { fields.push("relationship_type = ?"); args.push(updates.relationshipType); }
  if (updates.context !== undefined) { fields.push("context = ?"); args.push(updates.context); }
  if (updates.startDate !== undefined) { fields.push("start_date = ?"); args.push(updates.startDate); }
  if (updates.status !== undefined) { fields.push("status = ?"); args.push(updates.status); }

  if (fields.length === 0) return;

  fields.push("updated_at = NOW()");
  args.push(id, userId);

  const [query, params] = p(`UPDATE relationships SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await neonSql(query, params);
}

export async function deleteRelationship(
  id: number,
  userId: string,
): Promise<void> {
  await neonSql`DELETE FROM relationships WHERE id = ${id} AND user_id = ${userId}`;
}

// ============================================
// User Settings
// ============================================

export async function getUserSettings(
  userId: string,
): Promise<{ userId: string; storyLanguage: string; storyMinutes: number }> {
  const rows = await neonSql`SELECT * FROM user_settings WHERE user_id = ${userId}`;
  if (rows.length === 0) {
    return { userId, storyLanguage: "English", storyMinutes: 10 };
  }
  const row = rows[0];
  return {
    userId: row.user_id as string,
    storyLanguage: (row.story_language as string) ?? "English",
    storyMinutes: (row.story_minutes as number) ?? 10,
  };
}

export async function upsertUserSettings(
  userId: string,
  storyLanguage: string,
  storyMinutes: number,
): Promise<{ userId: string; storyLanguage: string; storyMinutes: number }> {
  await neonSql`
    INSERT INTO user_settings (user_id, story_language, story_minutes, created_at, updated_at)
    VALUES (${userId}, ${storyLanguage}, ${storyMinutes}, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      story_language = excluded.story_language,
      story_minutes = excluded.story_minutes,
      updated_at = NOW()`;
  return { userId, storyLanguage, storyMinutes };
}

// ============================================
// Teacher Feedbacks
// ============================================

function mapTeacherFeedbackRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    familyMemberId: row.family_member_id as number,
    userId: row.user_id as string,
    teacherName: row.teacher_name as string,
    subject: (row.subject as string) || null,
    feedbackDate: row.feedback_date as string,
    content: row.content as string,
    tags: safeJsonParse(row.tags as string, null),
    source: (row.source as string) || null,
    extracted: (row.extracted as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getTeacherFeedbacksForFamilyMember(
  familyMemberId: number,
  userId: string,
) {
  const rows = await neonSql`SELECT * FROM teacher_feedbacks WHERE family_member_id = ${familyMemberId} AND user_id = ${userId} ORDER BY feedback_date DESC, created_at DESC`;
  return rows.map(mapTeacherFeedbackRow);
}

export async function getTeacherFeedback(id: number, userId: string) {
  const rows = await neonSql`SELECT * FROM teacher_feedbacks WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  return mapTeacherFeedbackRow(rows[0]);
}

export async function createTeacherFeedback(params: {
  familyMemberId: number;
  userId: string;
  teacherName: string;
  subject?: string | null;
  feedbackDate: string;
  content: string;
  tags?: string[] | null;
  source?: string | null;
}): Promise<number> {
  const rows = await neonSql`
    INSERT INTO teacher_feedbacks (family_member_id, user_id, teacher_name, subject, feedback_date, content, tags, source, extracted, created_at, updated_at)
    VALUES (${params.familyMemberId}, ${params.userId}, ${params.teacherName}, ${params.subject ?? null}, ${params.feedbackDate}, ${params.content}, ${params.tags ? JSON.stringify(params.tags) : null}, ${params.source ?? null}, 0, NOW(), NOW())
    RETURNING id`;
  return rows[0].id as number;
}

export async function updateTeacherFeedback(
  id: number,
  userId: string,
  updates: {
    teacherName?: string;
    subject?: string | null;
    feedbackDate?: string;
    content?: string;
    tags?: string[] | null;
    source?: string | null;
    extracted?: boolean;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.teacherName !== undefined) { fields.push("teacher_name = ?"); args.push(updates.teacherName); }
  if (updates.subject !== undefined) { fields.push("subject = ?"); args.push(updates.subject); }
  if (updates.feedbackDate !== undefined) { fields.push("feedback_date = ?"); args.push(updates.feedbackDate); }
  if (updates.content !== undefined) { fields.push("content = ?"); args.push(updates.content); }
  if (updates.tags !== undefined) { fields.push("tags = ?"); args.push(updates.tags ? JSON.stringify(updates.tags) : null); }
  if (updates.source !== undefined) { fields.push("source = ?"); args.push(updates.source); }
  if (updates.extracted !== undefined) { fields.push("extracted = ?"); args.push(updates.extracted ? 1 : 0); }

  if (fields.length === 0) return;

  fields.push("updated_at = NOW()");
  args.push(id, userId);

  const [query, params] = p(`UPDATE teacher_feedbacks SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await neonSql(query, params);
}

export async function deleteTeacherFeedback(
  id: number,
  userId: string,
): Promise<void> {
  await neonSql`DELETE FROM teacher_feedbacks WHERE id = ${id} AND user_id = ${userId}`;
}

export async function markTeacherFeedbackExtracted(
  id: number,
  userId: string,
): Promise<void> {
  await neonSql`UPDATE teacher_feedbacks SET extracted = 1, updated_at = NOW() WHERE id = ${id} AND user_id = ${userId}`;
}

// ─── Contact Feedbacks ───────────────────────────────────────

function mapContactFeedbackRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    contactId: row.contact_id as number,
    familyMemberId: row.family_member_id as number,
    userId: row.user_id as string,
    subject: (row.subject as string) || null,
    feedbackDate: row.feedback_date as string,
    content: row.content as string,
    tags: safeJsonParse(row.tags as string, null),
    source: (row.source as string) || null,
    extracted: (row.extracted as number) === 1,
    extractedIssues: safeJsonParse<any[] | null>(row.extracted_issues as string, null),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getContactFeedbacks(
  contactId: number,
  familyMemberId: number,
  userId: string,
) {
  const rows = await neonSql`SELECT * FROM contact_feedbacks WHERE contact_id = ${contactId} AND family_member_id = ${familyMemberId} AND user_id = ${userId} ORDER BY feedback_date DESC, created_at DESC`;
  return rows.map(mapContactFeedbackRow);
}

export async function getContactFeedback(id: number, userId: string) {
  const rows = await neonSql`SELECT * FROM contact_feedbacks WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  return mapContactFeedbackRow(rows[0]);
}

export async function createContactFeedback(params: {
  contactId: number;
  familyMemberId: number;
  userId: string;
  subject?: string | null;
  feedbackDate: string;
  content: string;
  tags?: string[] | null;
  source?: string | null;
}): Promise<number> {
  const rows = await neonSql`
    INSERT INTO contact_feedbacks (contact_id, family_member_id, user_id, subject, feedback_date, content, tags, source, extracted, created_at, updated_at)
    VALUES (${params.contactId}, ${params.familyMemberId}, ${params.userId}, ${params.subject ?? null}, ${params.feedbackDate}, ${params.content}, ${params.tags ? JSON.stringify(params.tags) : null}, ${params.source ?? null}, 0, NOW(), NOW())
    RETURNING id`;
  return rows[0].id as number;
}

export async function updateContactFeedback(
  id: number,
  userId: string,
  updates: {
    subject?: string | null;
    feedbackDate?: string;
    content?: string;
    tags?: string[] | null;
    source?: string | null;
    extracted?: boolean;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.subject !== undefined) { fields.push("subject = ?"); args.push(updates.subject); }
  if (updates.feedbackDate !== undefined) { fields.push("feedback_date = ?"); args.push(updates.feedbackDate); }
  if (updates.content !== undefined) { fields.push("content = ?"); args.push(updates.content); }
  if (updates.tags !== undefined) { fields.push("tags = ?"); args.push(updates.tags ? JSON.stringify(updates.tags) : null); }
  if (updates.source !== undefined) { fields.push("source = ?"); args.push(updates.source); }
  if (updates.extracted !== undefined) { fields.push("extracted = ?"); args.push(updates.extracted ? 1 : 0); }

  if (fields.length === 0) return;

  fields.push("updated_at = NOW()");
  args.push(id, userId);

  const [query, params] = p(`UPDATE contact_feedbacks SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await neonSql(query, params);
}

export async function deleteContactFeedback(
  id: number,
  userId: string,
): Promise<void> {
  await neonSql`DELETE FROM contact_feedbacks WHERE id = ${id} AND user_id = ${userId}`;
}

export async function saveExtractedIssues(
  id: number,
  userId: string,
  issues: unknown[],
): Promise<void> {
  await neonSql`UPDATE contact_feedbacks SET extracted_issues = ${JSON.stringify(issues)}, extracted = 1, updated_at = NOW() WHERE id = ${id} AND user_id = ${userId}`;
}

// ============================================
// Issues
// ============================================

interface IssueRow {
  id: number;
  feedback_id: number;
  journal_entry_id: number | null;
  family_member_id: number;
  related_family_member_id: number | null;
  user_id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  recommendations: string | null;
  created_at: string;
  updated_at: string;
}

interface Issue {
  id: number;
  feedbackId: number;
  journalEntryId: number | null;
  familyMemberId: number;
  relatedFamilyMemberId: number | null;
  userId: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  recommendations: string[] | null;
  createdAt: string;
  updatedAt: string;
}

function mapIssueRow(row: IssueRow): Issue {
  return {
    id: row.id as number,
    feedbackId: row.feedback_id as number,
    journalEntryId: (row.journal_entry_id as number) ?? null,
    familyMemberId: row.family_member_id as number,
    relatedFamilyMemberId: (row.related_family_member_id as number) ?? null,
    userId: row.user_id as string,
    title: row.title as string,
    description: row.description as string,
    category: row.category as string,
    severity: row.severity as string,
    recommendations: safeJsonParse(row.recommendations as string, null),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getAllIssues(userId: string) {
  const rows = await neonSql`SELECT * FROM issues WHERE user_id = ${userId} ORDER BY updated_at DESC`;
  return rows.map((r) => mapIssueRow(r as IssueRow));
}

export async function getIssuesForFamilyMember(
  familyMemberId: number,
  feedbackId?: number,
  userId?: string,
) {
  let sqlStr = `SELECT * FROM issues WHERE family_member_id = ?`;
  const args: any[] = [familyMemberId];

  if (feedbackId !== undefined) { sqlStr += ` AND feedback_id = ?`; args.push(feedbackId); }
  if (userId !== undefined) { sqlStr += ` AND user_id = ?`; args.push(userId); }

  sqlStr += ` ORDER BY created_at DESC`;

  const [query, params] = p(sqlStr, args);
  const rows = await neonSql(query, params);
  return rows.map((r) => mapIssueRow(r as IssueRow));
}

export async function getIssue(id: number, userId: string) {
  const rows = await neonSql`SELECT * FROM issues WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  return mapIssueRow(rows[0] as IssueRow);
}

export async function createIssue(params: {
  feedbackId?: number | null;
  journalEntryId?: number | null;
  familyMemberId: number;
  userId: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  recommendations?: string[] | null;
}): Promise<number> {
  const rows = await neonSql`
    INSERT INTO issues (feedback_id, journal_entry_id, family_member_id, user_id, title, description, category, severity, recommendations, created_at, updated_at)
    VALUES (${params.feedbackId ?? null}, ${params.journalEntryId ?? null}, ${params.familyMemberId}, ${params.userId}, ${params.title}, ${params.description}, ${params.category}, ${params.severity}, ${params.recommendations ? JSON.stringify(params.recommendations) : null}, NOW(), NOW())
    RETURNING id`;
  return rows[0].id as number;
}

export async function getIssueByJournalEntryId(journalEntryId: number, userId: string) {
  const rows = await neonSql`SELECT * FROM issues WHERE journal_entry_id = ${journalEntryId} AND user_id = ${userId} LIMIT 1`;
  if (rows.length === 0) return null;
  return mapIssueRow(rows[0] as IssueRow);
}

export async function updateIssue(
  id: number,
  userId: string,
  updates: {
    familyMemberId?: number;
    relatedFamilyMemberId?: number | null;
    title?: string;
    description?: string;
    category?: string;
    severity?: string;
    recommendations?: string[] | null;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.familyMemberId !== undefined) { fields.push("family_member_id = ?"); args.push(updates.familyMemberId); }
  if (updates.relatedFamilyMemberId !== undefined) { fields.push("related_family_member_id = ?"); args.push(updates.relatedFamilyMemberId ?? null); }
  if (updates.title !== undefined) { fields.push("title = ?"); args.push(updates.title); }
  if (updates.description !== undefined) { fields.push("description = ?"); args.push(updates.description); }
  if (updates.category !== undefined) { fields.push("category = ?"); args.push(updates.category); }
  if (updates.severity !== undefined) { fields.push("severity = ?"); args.push(updates.severity); }
  if (updates.recommendations !== undefined) {
    fields.push("recommendations = ?");
    args.push(updates.recommendations ? JSON.stringify(updates.recommendations) : null);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = NOW()");
  args.push(id, userId);

  const [query, params] = p(`UPDATE issues SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await neonSql(query, params);
}

export async function deleteIssue(id: number, userId: string): Promise<void> {
  await neonSql`DELETE FROM issues WHERE id = ${id} AND user_id = ${userId}`;
}

export async function saveIssuesToTable(
  feedbackId: number,
  familyMemberId: number,
  userId: string,
  issues: unknown[],
): Promise<number[]> {
  const issueIds: number[] = [];

  await neonSql`DELETE FROM issues WHERE feedback_id = ${feedbackId} AND user_id = ${userId}`;

  for (const issue of issues) {
    const issueData = issue as {
      title: string;
      description: string;
      category: string;
      severity: string;
      recommendations?: string[];
    };

    const newId = await createIssue({
      feedbackId,
      familyMemberId,
      userId,
      title: issueData.title,
      description: issueData.description,
      category: issueData.category,
      severity: issueData.severity,
      recommendations: issueData.recommendations || null,
    });

    issueIds.push(newId);
  }

  return issueIds;
}

// Issue Links
export async function linkIssues(
  issueId: number,
  linkedIssueId: number,
  userId: string,
  linkType: string = "related",
): Promise<number> {
  // Check for existing link in either direction
  const existing = await neonSql`
    SELECT id FROM issue_links
    WHERE user_id = ${userId}
      AND ((issue_id = ${issueId} AND linked_issue_id = ${linkedIssueId})
        OR (issue_id = ${linkedIssueId} AND linked_issue_id = ${issueId}))
    LIMIT 1`;
  if (existing.length > 0) return existing[0].id as number;

  const rows = await neonSql`
    INSERT INTO issue_links (issue_id, linked_issue_id, link_type, user_id, created_at)
    VALUES (${issueId}, ${linkedIssueId}, ${linkType}, ${userId}, NOW())
    RETURNING id`;
  return rows[0].id as number;
}

export async function unlinkIssues(
  issueId: number,
  linkedIssueId: number,
  userId: string,
): Promise<void> {
  await neonSql`
    DELETE FROM issue_links
    WHERE user_id = ${userId}
      AND ((issue_id = ${issueId} AND linked_issue_id = ${linkedIssueId})
        OR (issue_id = ${linkedIssueId} AND linked_issue_id = ${issueId}))`;
}

export async function getLinkedIssues(
  issueId: number,
  userId: string,
): Promise<Array<{ linkId: number; linkType: string; issue: ReturnType<typeof mapIssueRow> }>> {
  const rows = await neonSql`
    SELECT il.id as link_id, il.link_type,
           i.*
    FROM issue_links il
    JOIN issues i ON (
      CASE WHEN il.issue_id = ${issueId} THEN il.linked_issue_id ELSE il.issue_id END
    ) = i.id
    WHERE il.user_id = ${userId}
      AND (il.issue_id = ${issueId} OR il.linked_issue_id = ${issueId})
    ORDER BY il.created_at DESC`;
  return rows.map((r: any) => ({
    linkId: r.link_id as number,
    linkType: r.link_type as string,
    issue: mapIssueRow({
      id: r.id,
      feedback_id: r.feedback_id,
      journal_entry_id: r.journal_entry_id,
      family_member_id: r.family_member_id,
      related_family_member_id: r.related_family_member_id,
      user_id: r.user_id,
      title: r.title,
      description: r.description,
      category: r.category,
      severity: r.severity,
      recommendations: r.recommendations,
      created_at: r.created_at,
      updated_at: r.updated_at,
    } as IssueRow),
  }));
}

export async function getContactsForIssue(issueId: number, userId: string) {
  const rows = await neonSql`
    SELECT c.*
    FROM issue_contacts ic
    JOIN contacts c ON ic.contact_id = c.id
    WHERE ic.issue_id = ${issueId} AND ic.user_id = ${userId}
    ORDER BY ic.created_at DESC`;
  return rows.map((row: any) => ({
    id: row.id as number,
    userId: row.user_id as string,
    slug: (row.slug as string) || null,
    firstName: row.first_name as string,
    lastName: (row.last_name as string) || null,
    description: (row.description as string) || null,
    role: (row.role as string) || null,
    ageYears: (row.age_years as number) || null,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function linkContactToIssue(
  issueId: number,
  contactId: number,
  userId: string,
): Promise<number> {
  const existing = await neonSql`
    SELECT id FROM issue_contacts
    WHERE issue_id = ${issueId} AND contact_id = ${contactId} AND user_id = ${userId}
    LIMIT 1`;
  if (existing.length > 0) return existing[0].id as number;

  const rows = await neonSql`
    INSERT INTO issue_contacts (issue_id, contact_id, user_id, created_at)
    VALUES (${issueId}, ${contactId}, ${userId}, NOW())
    RETURNING id`;
  return rows[0].id as number;
}

export async function unlinkContactFromIssue(
  issueId: number,
  contactId: number,
  userId: string,
): Promise<void> {
  await neonSql`
    DELETE FROM issue_contacts
    WHERE issue_id = ${issueId} AND contact_id = ${contactId} AND user_id = ${userId}`;
}

// ============================================
// Issue Screenshots
// ============================================

export async function getScreenshotsForIssue(issueId: number, userId: string) {
  const rows = await neonSql`
    SELECT * FROM issue_screenshots
    WHERE issue_id = ${issueId} AND user_id = ${userId}
    ORDER BY created_at DESC`;
  return rows.map((row) => ({
    id: row.id as number,
    issueId: row.issue_id as number,
    userId: row.user_id as string,
    r2Key: row.r2_key as string,
    url: row.url as string,
    filename: row.filename as string,
    contentType: row.content_type as string,
    sizeBytes: row.size_bytes as number,
    caption: (row.caption as string) || null,
    createdAt: row.created_at as string,
  }));
}

export async function addIssueScreenshot(params: {
  issueId: number;
  userId: string;
  r2Key: string;
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  caption?: string | null;
}) {
  const rows = await neonSql`
    INSERT INTO issue_screenshots (issue_id, user_id, r2_key, url, filename, content_type, size_bytes, caption, created_at)
    VALUES (${params.issueId}, ${params.userId}, ${params.r2Key}, ${params.url}, ${params.filename}, ${params.contentType}, ${params.sizeBytes}, ${params.caption ?? null}, NOW())
    RETURNING *`;
  const row = rows[0];
  return {
    id: row.id as number,
    issueId: row.issue_id as number,
    userId: row.user_id as string,
    r2Key: row.r2_key as string,
    url: row.url as string,
    filename: row.filename as string,
    contentType: row.content_type as string,
    sizeBytes: row.size_bytes as number,
    caption: (row.caption as string) || null,
    createdAt: row.created_at as string,
  };
}

export async function deleteIssueScreenshot(id: number, userId: string): Promise<string | null> {
  const rows = await neonSql`
    DELETE FROM issue_screenshots
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING r2_key`;
  if (rows.length === 0) return null;
  return rows[0].r2_key as string;
}

export async function getGoalById(goalId: number) {
  const rows = await neonSql`SELECT * FROM goals WHERE id = ${goalId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as number,
    familyMemberId: row.family_member_id as number,
    createdBy: row.user_id as string,
    slug: (row.slug as string) || null,
    title: row.title as string,
    description: (row.description as string) || null,
    status: row.status as string,
    parentGoalId: (row.parent_goal_id as number) || null,
    therapeuticText: (row.therapeutic_text as string) || null,
    therapeuticTextLanguage: (row.therapeutic_text_language as string) || null,
    therapeuticTextGeneratedAt: (row.therapeutic_text_generated_at as string) || null,
    storyLanguage: (row.story_language as string) || null,
    parentAdvice: (row.parent_advice as string) || null,
    parentAdviceLanguage: (row.parent_advice_language as string) || null,
    parentAdviceGeneratedAt: (row.parent_advice_generated_at as string) || null,
    tags: safeJsonParse(row.tags as string, []),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function deleteNote(noteId: number, userEmail: string): Promise<void> {
  await neonSql`DELETE FROM notes_claims WHERE note_id = ${noteId}`;
  await neonSql`DELETE FROM notes_research WHERE note_id = ${noteId}`;
  await neonSql`DELETE FROM notes WHERE id = ${noteId} AND user_id = ${userEmail}`;
}

export async function deleteGoal(goalId: number, userEmail: string): Promise<void> {
  await neonSql`DELETE FROM notes_claims WHERE note_id IN (SELECT id FROM notes WHERE entity_id = ${goalId} AND entity_type = 'Goal')`;
  await neonSql`DELETE FROM notes_research WHERE note_id IN (SELECT id FROM notes WHERE entity_id = ${goalId} AND entity_type = 'Goal')`;
  await neonSql`DELETE FROM notes WHERE entity_id = ${goalId} AND entity_type = 'Goal' AND user_id = ${userEmail}`;
  await neonSql`DELETE FROM therapeutic_questions WHERE goal_id = ${goalId}`;
  await neonSql`DELETE FROM therapy_research WHERE goal_id = ${goalId}`;
  await neonSql`DELETE FROM text_segments WHERE goal_id = ${goalId}`;
  await neonSql`DELETE FROM audio_assets WHERE goal_id = ${goalId}`;
  await neonSql`DELETE FROM stories WHERE goal_id = ${goalId}`;
  await neonSql`DELETE FROM generation_jobs WHERE goal_id = ${goalId}`;
  await neonSql`DELETE FROM goals WHERE id = ${goalId} AND user_id = ${userEmail}`;
}

// ============================================
// Deep Issue Analyses
// ============================================

interface DeepIssueAnalysisRow {
  id: number;
  family_member_id: number;
  trigger_issue_id: number | null;
  user_id: string;
  job_id: string | null;
  summary: string;
  pattern_clusters: string;
  timeline_analysis: string;
  family_system_insights: string;
  priority_recommendations: string;
  research_relevance: string;
  parent_advice: string;
  data_snapshot: string;
  model: string;
  created_at: string;
  updated_at: string;
}

function mapDeepIssueAnalysisRow(row: DeepIssueAnalysisRow) {
  return {
    id: row.id,
    familyMemberId: row.family_member_id,
    triggerIssueId: row.trigger_issue_id,
    userId: row.user_id,
    jobId: row.job_id,
    summary: row.summary,
    patternClusters: safeJsonParse(row.pattern_clusters, []),
    timelineAnalysis: safeJsonParse(row.timeline_analysis, {}),
    familySystemInsights: safeJsonParse(row.family_system_insights, {}),
    priorityRecommendations: safeJsonParse(row.priority_recommendations, []),
    researchRelevance: safeJsonParse(row.research_relevance, []),
    parentAdvice: safeJsonParse(row.parent_advice, []),
    dataSnapshot: safeJsonParse(row.data_snapshot, {}),
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createDeepIssueAnalysis(params: {
  familyMemberId: number;
  triggerIssueId?: number | null;
  userId: string;
  jobId?: string | null;
  summary: string;
  patternClusters: unknown[];
  timelineAnalysis: unknown;
  familySystemInsights: unknown[];
  priorityRecommendations: unknown[];
  researchRelevance: unknown[];
  parentAdvice: unknown[];
  dataSnapshot: unknown;
  model?: string;
}): Promise<number> {
  const rows = await neonSql`
    INSERT INTO deep_issue_analyses (family_member_id, trigger_issue_id, user_id, job_id, summary, pattern_clusters, timeline_analysis, family_system_insights, priority_recommendations, research_relevance, parent_advice, data_snapshot, model, created_at, updated_at)
    VALUES (${params.familyMemberId}, ${params.triggerIssueId ?? null}, ${params.userId}, ${params.jobId ?? null}, ${params.summary}, ${JSON.stringify(params.patternClusters)}, ${JSON.stringify(params.timelineAnalysis)}, ${JSON.stringify(params.familySystemInsights)}, ${JSON.stringify(params.priorityRecommendations)}, ${JSON.stringify(params.researchRelevance)}, ${JSON.stringify(params.parentAdvice)}, ${JSON.stringify(params.dataSnapshot)}, ${params.model ?? "deepseek-chat"}, NOW(), NOW())
    RETURNING id`;
  return rows[0].id as number;
}

export async function getDeepIssueAnalysis(id: number, userId: string) {
  const rows = await neonSql`SELECT * FROM deep_issue_analyses WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  return mapDeepIssueAnalysisRow(rows[0] as unknown as DeepIssueAnalysisRow);
}

export async function getDeepIssueAnalysesForFamilyMember(familyMemberId: number, userId: string) {
  const rows = await neonSql`SELECT * FROM deep_issue_analyses WHERE family_member_id = ${familyMemberId} AND user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map((r) => mapDeepIssueAnalysisRow(r as unknown as DeepIssueAnalysisRow));
}

export async function deleteDeepIssueAnalysis(id: number, userId: string): Promise<void> {
  await neonSql`DELETE FROM deep_issue_analyses WHERE id = ${id} AND user_id = ${userId}`;
}

// Helper: all contact feedbacks for a family member (no contactId filter)
export async function getContactFeedbacksForFamilyMember(familyMemberId: number, userId: string) {
  const rows = await neonSql`SELECT * FROM contact_feedbacks WHERE family_member_id = ${familyMemberId} AND user_id = ${userId} ORDER BY feedback_date DESC, created_at DESC`;
  return rows.map(mapContactFeedbackRow);
}

// Helper: issues where this family member is the relatedFamilyMemberId
export async function getIssuesReferencingFamilyMember(familyMemberId: number, userId: string) {
  const rows = await neonSql`SELECT * FROM issues WHERE related_family_member_id = ${familyMemberId} AND user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map((r) => mapIssueRow(r as IssueRow));
}

// Helper: all research for a family member (across all their issues)
export async function getResearchForFamilyMemberIssues(issueIds: number[]) {
  if (issueIds.length === 0) return [];
  const placeholders = issueIds.map(() => "?").join(",");
  const sqlStr = `SELECT * FROM therapy_research WHERE issue_id IN (${placeholders}) ORDER BY relevance_score DESC`;
  const [query, params] = p(sqlStr, issueIds);
  const rows = await neonSql(query, params);
  return rows.map((row) => ({
    id: row.id as number,
    goalId: (row.goal_id as number) || null,
    issueId: (row.issue_id as number) || null,
    title: row.title as string,
    keyFindings: safeJsonParse(row.key_findings as string, []) as string[],
    therapeuticTechniques: safeJsonParse(row.therapeutic_techniques as string, []) as string[],
    evidenceLevel: (row.evidence_level as string) || null,
  }));
}

// ============================================
// Habits
// ============================================

export async function listHabits(userId: string, status?: string, familyMemberId?: number) {
  const rows = await neonSql`SELECT * FROM habits WHERE user_id = ${userId} ORDER BY created_at DESC`;
  let all = rows.map((row) => ({
    id: row.id as number,
    userId: row.user_id as string,
    goalId: (row.goal_id as number) || null,
    familyMemberId: (row.family_member_id as number) || null,
    issueId: (row.issue_id as number) || null,
    title: row.title as string,
    description: (row.description as string) || null,
    frequency: row.frequency as string,
    targetCount: row.target_count as number,
    status: row.status as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
  if (status) all = all.filter((h) => h.status === status);
  if (familyMemberId) all = all.filter((h) => h.familyMemberId === familyMemberId);
  return all;
}

export async function getHabit(id: number, userId: string) {
  const rows = await neonSql`SELECT * FROM habits WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as number,
    userId: row.user_id as string,
    goalId: (row.goal_id as number) || null,
    familyMemberId: (row.family_member_id as number) || null,
    issueId: (row.issue_id as number) || null,
    title: row.title as string,
    description: (row.description as string) || null,
    frequency: row.frequency as string,
    targetCount: row.target_count as number,
    status: row.status as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createHabit(input: {
  userId: string;
  goalId?: number | null;
  familyMemberId?: number | null;
  issueId?: number | null;
  title: string;
  description?: string | null;
  frequency?: string;
  targetCount?: number;
}) {
  const rows = await neonSql`
    INSERT INTO habits (user_id, goal_id, family_member_id, issue_id, title, description, frequency, target_count)
    VALUES (
      ${input.userId},
      ${input.goalId ?? null},
      ${input.familyMemberId ?? null},
      ${input.issueId ?? null},
      ${input.title},
      ${input.description ?? null},
      ${input.frequency ?? "daily"},
      ${input.targetCount ?? 1}
    )
    RETURNING id
  `;
  return rows[0].id as number;
}

export async function updateHabit(
  id: number,
  userId: string,
  input: {
    title?: string | null;
    description?: string | null;
    frequency?: string | null;
    targetCount?: number | null;
    status?: string | null;
    goalId?: number | null;
  },
) {
  await neonSql`
    UPDATE habits SET
      title = COALESCE(${input.title ?? null}, title),
      description = COALESCE(${input.description ?? null}, description),
      frequency = COALESCE(${input.frequency ?? null}, frequency),
      target_count = COALESCE(${input.targetCount ?? null}, target_count),
      status = COALESCE(${input.status ?? null}, status),
      goal_id = COALESCE(${input.goalId ?? null}, goal_id),
      updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

export async function deleteHabit(id: number, userId: string) {
  await neonSql`DELETE FROM habits WHERE id = ${id} AND user_id = ${userId}`;
}

export async function logHabit(input: {
  habitId: number;
  userId: string;
  loggedDate: string;
  count?: number;
  notes?: string | null;
}) {
  const rows = await neonSql`
    INSERT INTO habit_logs (habit_id, user_id, logged_date, count, notes)
    VALUES (
      ${input.habitId},
      ${input.userId},
      ${input.loggedDate},
      ${input.count ?? 1},
      ${input.notes ?? null}
    )
    RETURNING id
  `;
  return rows[0].id as number;
}

export async function deleteHabitLog(id: number, userId: string) {
  await neonSql`DELETE FROM habit_logs WHERE id = ${id} AND user_id = ${userId}`;
}

export async function listHabitLogs(habitId: number, userId: string) {
  const rows = await neonSql`
    SELECT * FROM habit_logs WHERE habit_id = ${habitId} AND user_id = ${userId} ORDER BY logged_date DESC
  `;
  return rows.map((row) => ({
    id: row.id as number,
    habitId: row.habit_id as number,
    userId: row.user_id as string,
    loggedDate: row.logged_date as string,
    count: row.count as number,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
  }));
}

export async function getTodayLogForHabit(habitId: number, userId: string, today: string) {
  const rows = await neonSql`
    SELECT * FROM habit_logs WHERE habit_id = ${habitId} AND user_id = ${userId} AND logged_date = ${today}
  `;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id as number,
    habitId: row.habit_id as number,
    userId: row.user_id as string,
    loggedDate: row.logged_date as string,
    count: row.count as number,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
  };
}

// ============================================
// Tags
// ============================================

export async function getAllTags(userId: string): Promise<string[]> {
  const rows = await neonSql`
    SELECT DISTINCT tag FROM (
      SELECT jsonb_array_elements_text(tags::jsonb) AS tag FROM journal_entries WHERE user_id = ${userId} AND tags IS NOT NULL AND tags != '[]'
      UNION
      SELECT jsonb_array_elements_text(tags::jsonb) AS tag FROM goals WHERE user_id = ${userId} AND tags IS NOT NULL AND tags != '[]'
    ) t ORDER BY tag
  `;
  return rows.map((r) => r.tag as string);
}

// ============================================
// Journal Analyses
// ============================================

export async function getJournalAnalysis(journalEntryId: number, userId: string) {
  const rows = await neonSql`SELECT * FROM journal_analyses WHERE journal_entry_id = ${journalEntryId} AND user_id = ${userId} ORDER BY created_at DESC LIMIT 1`;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id as number,
    journalEntryId: r.journal_entry_id as number,
    userId: r.user_id as string,
    summary: r.summary as string,
    emotionalLandscape: safeJsonParse(r.emotional_landscape as string, {}),
    therapeuticInsights: safeJsonParse(r.therapeutic_insights as string, []),
    actionableRecommendations: safeJsonParse(r.actionable_recommendations as string, []),
    reflectionPrompts: safeJsonParse(r.reflection_prompts as string, []),
    model: r.model as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function createJournalAnalysis(data: {
  journalEntryId: number;
  userId: string;
  summary: string;
  emotionalLandscape: unknown;
  therapeuticInsights: unknown;
  actionableRecommendations: unknown;
  reflectionPrompts: unknown;
  model?: string;
}) {
  const rows = await neonSql`
    INSERT INTO journal_analyses (journal_entry_id, user_id, summary, emotional_landscape, therapeutic_insights, actionable_recommendations, reflection_prompts, model)
    VALUES (${data.journalEntryId}, ${data.userId}, ${data.summary}, ${JSON.stringify(data.emotionalLandscape)}, ${JSON.stringify(data.therapeuticInsights)}, ${JSON.stringify(data.actionableRecommendations)}, ${JSON.stringify(data.reflectionPrompts)}, ${data.model ?? "deepseek-chat"})
    RETURNING id`;
  return rows[0].id as number;
}

export async function deleteJournalAnalysis(journalEntryId: number, userId: string): Promise<void> {
  await neonSql`DELETE FROM journal_analyses WHERE journal_entry_id = ${journalEntryId} AND user_id = ${userId}`;
}

// ============================================
// Conversations
// ============================================

export async function createConversation({
  issueId,
  userId,
  title,
}: {
  issueId: number;
  userId: string;
  title?: string;
}): Promise<number> {
  const rows = await neonSql`
    INSERT INTO conversations (issue_id, user_id, title)
    VALUES (${issueId}, ${userId}, ${title ?? null})
    RETURNING id
  `;
  return rows[0].id as number;
}

export async function getConversation(id: number, userId: string) {
  const rows = await neonSql`
    SELECT c.*, COALESCE(
      json_agg(m ORDER BY m.created_at ASC) FILTER (WHERE m.id IS NOT NULL),
      '[]'
    ) AS messages
    FROM conversations c
    LEFT JOIN conversation_messages m ON m.conversation_id = c.id
    WHERE c.id = ${id} AND c.user_id = ${userId}
    GROUP BY c.id
  `;
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    id: row.id as number,
    issueId: row.issue_id as number,
    userId: row.user_id as string,
    title: (row.title as string) || null,
    messages: (row.messages as any[]).map((m) => ({
      id: m.id as number,
      conversationId: m.conversation_id as number,
      role: m.role as string,
      content: m.content as string,
      createdAt: m.created_at as string,
    })),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listConversationsForIssue(issueId: number, userId: string) {
  const rows = await neonSql`
    SELECT c.*, COALESCE(
      json_agg(m ORDER BY m.created_at ASC) FILTER (WHERE m.id IS NOT NULL),
      '[]'
    ) AS messages
    FROM conversations c
    LEFT JOIN conversation_messages m ON m.conversation_id = c.id
    WHERE c.issue_id = ${issueId} AND c.user_id = ${userId}
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;
  return rows.map((row) => ({
    id: row.id as number,
    issueId: row.issue_id as number,
    userId: row.user_id as string,
    title: (row.title as string) || null,
    messages: (row.messages as any[]).map((m) => ({
      id: m.id as number,
      conversationId: m.conversation_id as number,
      role: m.role as string,
      content: m.content as string,
      createdAt: m.created_at as string,
    })),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function deleteConversation(id: number, userId: string): Promise<void> {
  await neonSql`DELETE FROM conversations WHERE id = ${id} AND user_id = ${userId}`;
}

export async function addConversationMessage({
  conversationId,
  role,
  content,
}: {
  conversationId: number;
  role: string;
  content: string;
}): Promise<number> {
  const rows = await neonSql`
    INSERT INTO conversation_messages (conversation_id, role, content)
    VALUES (${conversationId}, ${role}, ${content})
    RETURNING id
  `;
  // Touch updated_at on the conversation
  await neonSql`UPDATE conversations SET updated_at = NOW() WHERE id = ${conversationId}`;
  return rows[0].id as number;
}

// ============================================
// Namespace export
// ============================================

export const db = {
  // Family Members
  listFamilyMembers,
  getFamilyMember,
  getSelfFamilyMember,
  getFamilyMemberBySlug,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  shareFamilyMember,
  unshareFamilyMember,
  getSharedFamilyMembers,
  // Goals
  getGoal,
  getGoalById,
  getGoalBySlug,
  listGoals,
  createGoal,
  updateGoal,
  saveParentAdvice,
  deleteGoal,
  // Tags
  getAllTags,
  // Research
  upsertTherapyResearch,
  listTherapyResearch,
  getResearchForNote,
  // Notes
  getNoteById,
  getNoteBySlug,
  getAllNotesForUser,
  listNotesForEntity,
  createNote,
  updateNote,
  deleteNote,
  linkResearchToNote,
  canViewerReadNote,
  setNoteVisibility,
  shareNote,
  unshareNote,
  getSharedNotes,
  // Stories
  getAllStoriesForUser,
  listStories,
  listStoriesForIssue,
  listStoriesForFeedback,
  getStory,
  createStory,
  updateStory,
  updateStoryAudio,
  deleteStory,
  // Generation Jobs
  cleanupStaleJobs,
  createGenerationJob,
  updateGenerationJob,
  getGenerationJob,
  listGenerationJobs,
  // Journal
  listJournalEntries,
  getJournalEntry,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  // Behavior Observations
  createBehaviorObservation,
  getBehaviorObservationsForFamilyMember,
  getBehaviorObservation,
  updateBehaviorObservation,
  deleteBehaviorObservation,
  getIssueBehaviorObservations,
  // Contacts
  getContactsForUser,
  getContact,
  getContactBySlug,
  createContact,
  updateContact,
  deleteContact,
  // Relationships
  getRelationshipsForPerson,
  getRelationship,
  createRelationship,
  updateRelationship,
  deleteRelationship,
  // Settings
  getUserSettings,
  upsertUserSettings,
  // Teacher Feedbacks
  getTeacherFeedbacksForFamilyMember,
  getTeacherFeedback,
  createTeacherFeedback,
  updateTeacherFeedback,
  deleteTeacherFeedback,
  markTeacherFeedbackExtracted,
  // Contact Feedbacks
  getContactFeedbacks,
  getContactFeedback,
  createContactFeedback,
  updateContactFeedback,
  deleteContactFeedback,
  saveExtractedIssues,
  // Issues
  getAllIssues,
  getIssuesForFamilyMember,
  getIssue,
  getIssueByJournalEntryId,
  createIssue,
  updateIssue,
  deleteIssue,
  saveIssuesToTable,
  // Issue Links
  linkIssues,
  unlinkIssues,
  getLinkedIssues,
  // Issue Screenshots
  getScreenshotsForIssue,
  addIssueScreenshot,
  deleteIssueScreenshot,
  // Deep Issue Analyses
  createDeepIssueAnalysis,
  getDeepIssueAnalysis,
  getDeepIssueAnalysesForFamilyMember,
  deleteDeepIssueAnalysis,
  getContactFeedbacksForFamilyMember,
  getIssuesReferencingFamilyMember,
  getResearchForFamilyMemberIssues,
  // Habits
  listHabits,
  getHabit,
  createHabit,
  updateHabit,
  deleteHabit,
  logHabit,
  deleteHabitLog,
  listHabitLogs,
  getTodayLogForHabit,
  // Journal Analyses
  getJournalAnalysis,
  createJournalAnalysis,
  deleteJournalAnalysis,
  // Conversations
  createConversation,
  getConversation,
  listConversationsForIssue,
  deleteConversation,
  addConversationMessage,
};

