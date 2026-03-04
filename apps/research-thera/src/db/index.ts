import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { d1 } from "./d1";
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_DATABASE_ID,
  CLOUDFLARE_D1_TOKEN,
} from "@/src/config/d1";

// Note: For D1, drizzle ORM integration requires a D1Database binding
// This is typically available in Cloudflare Workers runtime
// For now, we'll use the raw D1 client for queries

// Placeholder for when running in Cloudflare Workers context
export const db = null as any;

/**
 * Database operations for goals, research, questions, notes, and jobs
 */

// ============================================
// Family Members
// ============================================

export async function listFamilyMembers(userId: string) {
  const result = await d1.execute({
    sql: `SELECT * FROM family_members WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });
  return result.rows.map((row) => ({
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

export async function getFamilyMember(id: number) {
  const result = await d1.execute({
    sql: `SELECT * FROM family_members WHERE id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
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
  };
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
  const result = await d1.execute({
    sql: `INSERT INTO family_members (user_id, first_name, name, age_years, relationship, date_of_birth, bio, email, phone, location, occupation, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id`,
    args: [
      params.userId,
      params.firstName,
      params.name ?? null,
      params.ageYears ?? null,
      params.relationship ?? null,
      params.dateOfBirth ?? null,
      params.bio ?? null,
      params.email ?? null,
      params.phone ?? null,
      params.location ?? null,
      params.occupation ?? null,
    ],
  });
  return result.rows[0].id as number;
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

  if (params.firstName !== undefined) {
    sets.push("first_name = ?");
    args.push(params.firstName);
  }
  if (params.name !== undefined) {
    sets.push("name = ?");
    args.push(params.name);
  }
  if (params.ageYears !== undefined) {
    sets.push("age_years = ?");
    args.push(params.ageYears);
  }
  if (params.relationship !== undefined) {
    sets.push("relationship = ?");
    args.push(params.relationship);
  }
  if (params.dateOfBirth !== undefined) {
    sets.push("date_of_birth = ?");
    args.push(params.dateOfBirth);
  }
  if (params.bio !== undefined) {
    sets.push("bio = ?");
    args.push(params.bio);
  }
  if (params.email !== undefined) {
    sets.push("email = ?");
    args.push(params.email);
  }
  if (params.phone !== undefined) {
    sets.push("phone = ?");
    args.push(params.phone);
  }
  if (params.location !== undefined) {
    sets.push("location = ?");
    args.push(params.location);
  }
  if (params.occupation !== undefined) {
    sets.push("occupation = ?");
    args.push(params.occupation);
  }

  if (sets.length === 0) return;

  sets.push("updated_at = CURRENT_TIMESTAMP");
  args.push(id);

  await d1.execute({
    sql: `UPDATE family_members SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function deleteFamilyMember(id: number): Promise<boolean> {
  await d1.execute({
    sql: `DELETE FROM family_members WHERE id = ?`,
    args: [id],
  });
  return true;
}

// ============================================
// Family Member Shares
// ============================================

export async function shareFamilyMember(
  familyMemberId: number,
  email: string,
  role: "VIEWER" | "EDITOR",
  createdBy: string,
) {
  const normalizedEmail = normalizeEmail(email);
  await d1.execute({
    sql: `INSERT INTO family_member_shares (family_member_id, email, role, created_by)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(family_member_id, email)
          DO UPDATE SET role = excluded.role`,
    args: [familyMemberId, normalizedEmail, role, createdBy],
  });
  const result = await d1.execute({
    sql: `SELECT * FROM family_member_shares WHERE family_member_id = ? AND email = ?`,
    args: [familyMemberId, normalizedEmail],
  });
  const row = result.rows[0];
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
  await d1.execute({
    sql: `DELETE FROM family_member_shares WHERE family_member_id = ? AND email = ?`,
    args: [familyMemberId, normalizedEmail],
  });
  return true;
}

export async function getFamilyMemberShares(familyMemberId: number) {
  const result = await d1.execute({
    sql: `SELECT * FROM family_member_shares WHERE family_member_id = ? ORDER BY created_at DESC`,
    args: [familyMemberId],
  });
  return result.rows.map((row) => ({
    familyMemberId: row.family_member_id as number,
    email: row.email as string,
    role: row.role as "VIEWER" | "EDITOR",
    createdAt: row.created_at as string,
    createdBy: row.created_by as string,
  }));
}

export async function getSharedFamilyMembers(viewerEmail: string) {
  const normalizedEmail = normalizeEmail(viewerEmail);
  const result = await d1.execute({
    sql: `SELECT fm.* FROM family_members fm
          JOIN family_member_shares s ON s.family_member_id = fm.id
          WHERE s.email = ?
          ORDER BY fm.updated_at DESC`,
    args: [normalizedEmail],
  });
  return result.rows.map((row) => ({
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
  const result = await d1.execute({
    sql: `SELECT * FROM goals WHERE id = ? AND user_id = ?`,
    args: [goalId, createdBy],
  });

  if (result.rows.length === 0) {
    throw new Error(`Goal ${goalId} not found`);
  }

  const row = result.rows[0];
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
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getGoalBySlug(slug: string, createdBy: string) {
  const result = await d1.execute({
    sql: `SELECT * FROM goals WHERE slug = ? AND user_id = ?`,
    args: [slug, createdBy],
  });

  if (result.rows.length === 0) {
    throw new Error(`Goal with slug "${slug}" not found`);
  }

  const row = result.rows[0];
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
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listGoals(
  createdBy: string,
  familyMemberId?: number,
  status?: string,
) {
  let sql = `SELECT * FROM goals WHERE user_id = ?`;
  const args: any[] = [createdBy];

  if (familyMemberId) {
    sql += ` AND family_member_id = ?`;
    args.push(familyMemberId);
  }

  if (status) {
    sql += ` AND status = ?`;
    args.push(status);
  }

  sql += ` ORDER BY created_at DESC`;

  const result = await d1.execute({ sql, args });
  return result.rows.map((row) => ({
    id: row.id as number,
    familyMemberId: row.family_member_id as number,
    createdBy: row.user_id as string,
    title: row.title as string,
    description: (row.description as string) || null,
    status: row.status as string,
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

  const result = await d1.execute({
    sql: `INSERT INTO goals (family_member_id, user_id, slug, title, description, status, parent_goal_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          RETURNING id`,
    args: [
      params.familyMemberId,
      params.createdBy,
      params.slug || null,
      params.title,
      params.description || null,
      status,
      params.parentGoalId || null,
    ],
  });

  return result.rows[0].id as number;
}

export async function updateGoal(
  goalId: number,
  createdBy: string,
  updates: {
    slug?: string;
    familyMemberId?: number;
    title?: string;
    description?: string | null;
    status?: string;
    storyLanguage?: string | null;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.slug !== undefined) {
    fields.push("slug = ?");
    args.push(updates.slug);
  }

  if (updates.familyMemberId !== undefined) {
    fields.push("family_member_id = ?");
    args.push(updates.familyMemberId);
  }

  if (updates.title !== undefined) {
    fields.push("title = ?");
    args.push(updates.title);
  }

  if (updates.description !== undefined) {
    fields.push("description = ?");
    args.push(updates.description);
  }

  if (updates.status !== undefined) {
    fields.push("status = ?");
    args.push(updates.status);
  }

  if (updates.storyLanguage !== undefined) {
    fields.push("story_language = ?");
    args.push(updates.storyLanguage);
  }

  fields.push("updated_at = datetime('now')");
  args.push(goalId, createdBy);

  await d1.execute({
    sql: `UPDATE goals SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });
}

// ============================================
// Therapy Research
// ============================================

export async function upsertTherapyResearch(
  goalId: number,
  userId: string,
  research: {
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
  // Check if exists by DOI or title
  let existingId: number | null = null;

  if (research.doi) {
    const checkDoi = await d1.execute({
      sql: `SELECT id FROM therapy_research WHERE goal_id = ? AND doi = ?`,
      args: [goalId, research.doi],
    });
    if (checkDoi.rows.length > 0) {
      existingId = checkDoi.rows[0].id as number;
    }
  }

  if (!existingId) {
    const checkTitle = await d1.execute({
      sql: `SELECT id FROM therapy_research WHERE goal_id = ? AND title = ?`,
      args: [goalId, research.title],
    });
    if (checkTitle.rows.length > 0) {
      existingId = checkTitle.rows[0].id as number;
    }
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

  // Validate and sanitize numeric values - SQLite doesn't support NaN or Infinity
  const sanitizeNumber = (
    value: number | undefined | null,
    defaultValue: number = 0,
  ): number | null => {
    if (value === null || value === undefined) return null;
    if (!Number.isFinite(value)) return defaultValue;
    return value;
  };

  const relevanceScore = sanitizeNumber(research.relevanceScore, 0);
  const extractionConfidence = sanitizeNumber(research.extractionConfidence, 0);

  if (existingId) {
    // Update existing
    await d1.execute({
      sql: `UPDATE therapy_research 
            SET therapeutic_goal_type = ?,
                authors = ?,
                year = ?,
                journal = ?,
                doi = ?,
                url = ?,
                abstract = ?,
                key_findings = ?,
                therapeutic_techniques = ?,
                evidence_level = ?,
                relevance_score = ?,
                extracted_by = ?,
                extraction_confidence = ?,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        research.therapeuticGoalType,
        authorsJson,
        research.year || null,
        research.journal || null,
        research.doi || null,
        research.url || null,
        research.abstract || null,
        keyFindingsJson,
        techniquesJson,
        research.evidenceLevel || null,
        relevanceScore,
        research.extractedBy,
        extractionConfidence,
        existingId,
      ],
    });
    return existingId;
  } else {
    // Insert new
    const result = await d1.execute({
      sql: `INSERT INTO therapy_research (
              goal_id, therapeutic_goal_type, title, authors, year, journal, doi, url,
              abstract, key_findings, therapeutic_techniques, evidence_level,
              relevance_score, extracted_by, extraction_confidence
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id`,
      args: [
        goalId,
        research.therapeuticGoalType,
        research.title,
        authorsJson,
        research.year || null,
        research.journal || null,
        research.doi || null,
        research.url || null,
        research.abstract || null,
        keyFindingsJson,
        techniquesJson,
        research.evidenceLevel || null,
        relevanceScore,
        research.extractedBy,
        extractionConfidence,
      ],
    });
    if (!result.rows || result.rows.length === 0) {
      throw new Error("Failed to insert therapy research: no ID returned");
    }
    return Number(result.rows[0].id);
  }
}

export async function listTherapyResearch(goalId: number) {
  const result = await d1.execute({
    sql: `SELECT * FROM therapy_research WHERE goal_id = ? ORDER BY relevance_score DESC, created_at DESC`,
    args: [goalId],
  });

  return result.rows.map((row) => ({
    id: row.id as number,
    goalId: row.goal_id as number,
    therapeuticGoalType: row.therapeutic_goal_type as string,
    title: row.title as string,
    authors: JSON.parse(row.authors as string) as string[],
    year: (row.year as number) || null,
    journal: (row.journal as string) || null,
    doi: (row.doi as string) || null,
    url: (row.url as string) || null,
    abstract: (row.abstract as string) || null,
    keyFindings: JSON.parse(row.key_findings as string) as string[],
    therapeuticTechniques: JSON.parse(
      row.therapeutic_techniques as string,
    ) as string[],
    evidenceLevel: (row.evidence_level as string) || null,
    relevanceScore: row.relevance_score as number,
    extractedBy: row.extracted_by as string,
    extractionConfidence: row.extraction_confidence as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function deleteTherapyResearch(goalId: number): Promise<number> {
  // Count research rows before deleting
  const countResult = await d1.execute({
    sql: `SELECT COUNT(*) as cnt FROM therapy_research WHERE goal_id = ?`,
    args: [goalId],
  });
  const count = (countResult.rows[0]?.cnt as number) ?? 0;

  // Delete linked notes_research rows first
  await d1.execute({
    sql: `DELETE FROM notes_research WHERE research_id IN (SELECT id FROM therapy_research WHERE goal_id = ?)`,
    args: [goalId],
  });

  // Delete the research rows
  await d1.execute({
    sql: `DELETE FROM therapy_research WHERE goal_id = ?`,
    args: [goalId],
  });

  return count;
}

export async function getResearchForNote(noteId: number) {
  const result = await d1.execute({
    sql: `SELECT tr.* FROM therapy_research tr
          INNER JOIN notes_research nr ON tr.id = nr.research_id
          WHERE nr.note_id = ?
          ORDER BY tr.relevance_score DESC, tr.created_at DESC`,
    args: [noteId],
  });

  return result.rows.map((row) => ({
    id: row.id as number,
    goalId: row.goal_id as number,
    therapeuticGoalType: row.therapeutic_goal_type as string,
    title: row.title as string,
    authors: JSON.parse(row.authors as string) as string[],
    year: (row.year as number) || null,
    journal: (row.journal as string) || null,
    doi: (row.doi as string) || null,
    url: (row.url as string) || null,
    abstract: (row.abstract as string) || null,
    keyFindings: JSON.parse(row.key_findings as string) as string[],
    therapeuticTechniques: JSON.parse(
      row.therapeutic_techniques as string,
    ) as string[],
    evidenceLevel: (row.evidence_level as string) || null,
    relevanceScore: row.relevance_score as number,
    extractedBy: row.extracted_by as string,
    extractionConfidence: row.extraction_confidence as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

// ============================================
// Notes
// ============================================

export async function getNoteById(noteId: number, userId: string) {
  const result = await d1.execute({
    sql: `SELECT * FROM notes WHERE id = ?`,
    args: [noteId],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id as number,
    entityId: row.entity_id as number,
    entityType: row.entity_type as string,
    createdBy: row.user_id as string,
    noteType: (row.note_type as string) || null,
    slug: (row.slug as string) || null,
    title: (row.title as string) || null,
    content: row.content as string,
    tags: row.tags ? JSON.parse(row.tags as string) : [],
    visibility: (row.visibility as string) || "PRIVATE",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getNoteBySlug(slug: string, userId: string) {
  const result = await d1.execute({
    sql: `SELECT * FROM notes WHERE slug = ?`,
    args: [slug],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id as number,
    entityId: row.entity_id as number,
    entityType: row.entity_type as string,
    createdBy: row.user_id as string,
    noteType: (row.note_type as string) || null,
    slug: (row.slug as string) || null,
    title: (row.title as string) || null,
    content: row.content as string,
    tags: row.tags ? JSON.parse(row.tags as string) : [],
    visibility: (row.visibility as string) || "PRIVATE",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getAllNotesForUser(userId: string) {
  const result = await d1.execute({
    sql: `SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });

  return result.rows.map((row) => ({
    id: row.id as number,
    entityId: row.entity_id as number,
    entityType: row.entity_type as string,
    createdBy: row.user_id as string,
    noteType: (row.note_type as string) || null,
    slug: (row.slug as string) || null,
    title: (row.title as string) || null,
    content: row.content as string,
    tags: row.tags ? JSON.parse(row.tags as string) : [],
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
  const result = await d1.execute({
    sql: `SELECT * FROM notes WHERE entity_id = ? AND entity_type = ? AND user_id = ? ORDER BY created_at DESC`,
    args: [entityId, entityType, userId],
  });

  return result.rows.map((row) => ({
    id: row.id as number,
    entityId: row.entity_id as number,
    entityType: row.entity_type as string,
    createdBy: row.user_id as string,
    noteType: (row.note_type as string) || null,
    slug: (row.slug as string) || null,
    title: (row.title as string) || null,
    content: row.content as string,
    tags: row.tags ? JSON.parse(row.tags as string) : [],
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

  // Auto-generate slug from content if not provided
  const slug =
    params.slug ||
    params.content
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 50);

  const result = await d1.execute({
    sql: `INSERT INTO notes (entity_id, entity_type, user_id, note_type, slug, content, created_by, tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id`,
    args: [
      params.entityId,
      params.entityType,
      params.userId,
      params.noteType,
      slug,
      params.content,
      params.createdBy,
      tagsJson,
    ],
  });

  return result.rows[0].id as number;
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
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.entityId !== undefined) {
    fields.push("entity_id = ?");
    args.push(updates.entityId);
  }

  if (updates.entityType !== undefined) {
    fields.push("entity_type = ?");
    args.push(updates.entityType);
  }

  if (updates.noteType !== undefined) {
    fields.push("note_type = ?");
    args.push(updates.noteType);
  }

  if (updates.content !== undefined) {
    fields.push("content = ?");
    args.push(updates.content);
  }

  if (updates.createdBy !== undefined) {
    fields.push("created_by = ?");
    args.push(updates.createdBy);
  }

  if (updates.tags !== undefined) {
    fields.push("tags = ?");
    args.push(JSON.stringify(updates.tags));
  }

  fields.push("updated_at = datetime('now')");
  args.push(noteId, userId);

  await d1.execute({
    sql: `UPDATE notes SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });
}

export async function linkResearchToNote(
  noteId: number,
  researchIds: number[],
) {
  // First, remove existing links
  await d1.execute({
    sql: `DELETE FROM notes_research WHERE note_id = ?`,
    args: [noteId],
  });

  // Then add new links
  for (const researchId of researchIds) {
    await d1.execute({
      sql: `INSERT INTO notes_research (note_id, research_id) VALUES (?, ?)`,
      args: [noteId, researchId],
    });
  }
}

// ============================================
// Note Access Control & Sharing
// ============================================

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function canViewerReadNote(
  noteId: number,
  viewerEmail: string | null,
): Promise<{ canRead: boolean; canEdit: boolean; reason: string }> {
  const result = await d1.execute({
    sql: `
      SELECT
        n.visibility,
        n.user_id as owner_email,
        CASE
          WHEN n.visibility = 'PUBLIC' THEN 1
          WHEN n.user_id = ? THEN 1
          WHEN EXISTS (
            SELECT 1 FROM note_shares s
            WHERE s.note_id = n.id AND s.email = ?
          ) THEN 1
          ELSE 0
        END AS can_read
      FROM notes n
      WHERE n.id = ?
      LIMIT 1;
    `,
    args: [viewerEmail || "", normalizeEmail(viewerEmail || ""), noteId],
  });

  if (result.rows.length === 0) {
    return { canRead: false, canEdit: false, reason: "NOT_FOUND" };
  }

  const row = result.rows[0];
  const canRead = (row.can_read as number) === 1;
  const ownerEmail = row.owner_email as string;
  const visibility = row.visibility as string;

  if (!canRead) {
    return { canRead: false, canEdit: false, reason: "FORBIDDEN" };
  }

  // Check if viewer is owner
  if (viewerEmail === ownerEmail) {
    return { canRead: true, canEdit: true, reason: "OWNER" };
  }

  // Check if public
  if (visibility === "PUBLIC") {
    return { canRead: true, canEdit: false, reason: "PUBLIC" };
  }

  // Check share role
  const shareResult = await d1.execute({
    sql: `SELECT role FROM note_shares WHERE note_id = ? AND email = ?`,
    args: [noteId, normalizeEmail(viewerEmail || "")],
  });

  if (shareResult.rows.length > 0) {
    const role = shareResult.rows[0].role as string;
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
  await d1.execute({
    sql: `UPDATE notes SET visibility = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
    args: [visibility, noteId, userId],
  });

  return getNoteById(noteId, userId);
}

export async function shareNote(
  noteId: number,
  email: string,
  role: "READER" | "EDITOR",
  createdBy: string,
) {
  const normalizedEmail = normalizeEmail(email);

  await d1.execute({
    sql: `
      INSERT INTO note_shares (note_id, email, role, created_by)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(note_id, email)
      DO UPDATE SET role = excluded.role
    `,
    args: [noteId, normalizedEmail, role, createdBy],
  });

  const result = await d1.execute({
    sql: `SELECT * FROM note_shares WHERE note_id = ? AND email = ?`,
    args: [noteId, normalizedEmail],
  });

  const row = result.rows[0];
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

  const result = await d1.execute({
    sql: `DELETE FROM note_shares WHERE note_id = ? AND email = ? RETURNING id`,
    args: [noteId, normalizedEmail],
  });

  return result.rows.length > 0;
}

export async function getNoteShares(noteId: number) {
  const result = await d1.execute({
    sql: `SELECT * FROM note_shares WHERE note_id = ? ORDER BY created_at DESC`,
    args: [noteId],
  });

  return result.rows.map((row) => ({
    noteId: row.note_id as number,
    email: row.email as string,
    role: row.role as string,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  }));
}

export async function getSharedNotes(viewerEmail: string) {
  const normalizedEmail = normalizeEmail(viewerEmail);

  const result = await d1.execute({
    sql: `
      SELECT n.*
      FROM notes n
      JOIN note_shares s ON s.note_id = n.id
      WHERE s.email = ?
      ORDER BY n.updated_at DESC
    `,
    args: [normalizedEmail],
  });

  return result.rows.map((row) => ({
    id: row.id as number,
    entityId: row.entity_id as number,
    entityType: row.entity_type as string,
    createdBy: row.user_id as string,
    noteType: (row.note_type as string) || null,
    slug: (row.slug as string) || null,
    title: (row.title as string) || null,
    content: row.content as string,
    tags: row.tags ? JSON.parse(row.tags as string) : [],
    visibility: (row.visibility as string) || "PRIVATE",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

// ============================================
// Stories
// ============================================

export async function getAllStoriesForUser(createdBy: string) {
  const result = await d1.execute({
    sql: `SELECT * FROM stories WHERE user_id = ? ORDER BY created_at DESC`,
    args: [createdBy],
  });

  return result.rows.map((row) => ({
    id: row.id as number,
    goalId: row.goal_id as number,
    createdBy: row.user_id as string,
    content: row.content as string,
    audioKey: row.audio_key as string | null,
    audioUrl: row.audio_url as string | null,
    audioGeneratedAt: row.audio_generated_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function listStories(goalId: number, createdBy: string) {
  const result = await d1.execute({
    sql: `SELECT * FROM stories WHERE goal_id = ? AND user_id = ? ORDER BY created_at DESC`,
    args: [goalId, createdBy],
  });

  return result.rows.map((row) => ({
    id: row.id as number,
    goalId: row.goal_id as number,
    createdBy: row.user_id as string,
    content: row.content as string,
    audioKey: row.audio_key as string | null,
    audioUrl: row.audio_url as string | null,
    audioGeneratedAt: row.audio_generated_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function getStory(storyId: number, createdBy: string) {
  const result = await d1.execute({
    sql: `SELECT * FROM stories WHERE id = ? AND user_id = ?`,
    args: [storyId, createdBy],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id as number,
    goalId: row.goal_id as number,
    createdBy: row.user_id as string,
    content: row.content as string,
    audioKey: row.audio_key as string | null,
    audioUrl: row.audio_url as string | null,
    audioGeneratedAt: row.audio_generated_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createStory(params: {
  goalId: number;
  createdBy: string;
  content: string;
}) {
  const result = await d1.execute({
    sql: `INSERT INTO stories (goal_id, user_id, content)
          VALUES (?, ?, ?)
          RETURNING id`,
    args: [params.goalId, params.createdBy, params.content],
  });

  return result.rows[0].id as number;
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

  if (updates.content !== undefined) {
    fields.push("content = ?");
    args.push(updates.content);
  }

  fields.push("updated_at = datetime('now')");
  args.push(storyId, createdBy);

  await d1.execute({
    sql: `UPDATE stories SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });
}

export async function deleteStory(storyId: number, createdBy: string) {
  await d1.execute({
    sql: `DELETE FROM stories WHERE id = ? AND user_id = ?`,
    args: [storyId, createdBy],
  });
}

// ============================================
// Generation Jobs
// ============================================

export async function createGenerationJob(
  id: string,
  userId: string,
  type: "AUDIO" | "RESEARCH" | "QUESTIONS" | "LONGFORM",
  goalId: number,
  storyId?: number,
) {
  await d1.execute({
    sql: `INSERT INTO generation_jobs (id, user_id, type, goal_id, story_id, status, progress)
          VALUES (?, ?, ?, ?, ?, 'RUNNING', 0)`,
    args: [id, userId, type, goalId, storyId || null],
  });
}

export async function updateGenerationJob(
  id: string,
  updates: {
    status?: "RUNNING" | "SUCCEEDED" | "FAILED";
    progress?: number;
    result?: any;
    error?: any;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.status) {
    fields.push("status = ?");
    args.push(updates.status);
  }

  if (updates.progress !== undefined) {
    fields.push("progress = ?");
    args.push(updates.progress);
  }

  if (updates.result) {
    fields.push("result = ?");
    // updates.result is already a JSON string (callers pass JSON.stringify output)
    args.push(typeof updates.result === "string" ? updates.result : JSON.stringify(updates.result));
  }

  if (updates.error) {
    fields.push("error = ?");
    // updates.error is already a JSON string (callers pass JSON.stringify output)
    args.push(typeof updates.error === "string" ? updates.error : JSON.stringify(updates.error));
  }

  fields.push("updated_at = datetime('now')");
  args.push(id);

  await d1.execute({
    sql: `UPDATE generation_jobs SET ${fields.join(", ")} WHERE id = ?`,
    args,
  });
}

/**
 * Safely parses a job error stored in D1.
 * Handles legacy double-encoded values (where JSON.stringify was applied to an
 * already-serialized string) as well as correctly single-encoded values.
 * Always returns an object with at least { message: string }.
 */
function parseJobError(raw: string): { message: string; code?: string; details?: string } {
  try {
    const first = JSON.parse(raw);
    // If the first parse returns a string, it was double-encoded — parse again
    if (typeof first === "string") {
      try {
        const second = JSON.parse(first);
        if (second && typeof second === "object" && "message" in second) {
          return second as { message: string; code?: string; details?: string };
        }
      } catch {
        // Inner string is not JSON — treat it as the message
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

export async function getGenerationJob(id: string) {
  const result = await d1.execute({
    sql: `SELECT * FROM generation_jobs WHERE id = ?`,
    args: [id],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as string,
    goalId: row.goal_id as number,
    storyId: (row.story_id as number) || null,
    status: row.status as string,
    progress: row.progress as number,
    result: row.result ? JSON.parse(row.result as string) : null,
    error: row.error ? parseJobError(row.error as string) : null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ============================================
// Therapeutic Questions
// ============================================

export async function listTherapeuticQuestions(goalId: number) {
  const result = await d1.execute({
    sql: `SELECT * FROM therapeutic_questions WHERE goal_id = ? ORDER BY created_at DESC`,
    args: [goalId],
  });

  return result.rows.map((row) => ({
    id: row.id as number,
    goalId: row.goal_id as number,
    question: row.question as string,
    researchId: (row.research_id as number) || null,
    researchTitle: (row.research_title as string) || null,
    rationale: row.rationale as string,
    generatedAt: row.generated_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

// ============================================
// Goal Stories
// ============================================

export async function createGoalStory(
  goalId: number,
  language: string,
  minutes: number,
  text: string,
) {
  const result = await d1.execute({
    sql: `INSERT INTO goal_stories (goal_id, language, minutes, text)
          VALUES (?, ?, ?, ?)
          RETURNING *`,
    args: [goalId, language, minutes, text],
  });

  const row = result.rows[0];
  return {
    id: row.id as number,
    goalId: row.goal_id as number,
    language: row.language as string,
    minutes: row.minutes as number,
    text: row.text as string,
    audioKey: (row.audio_key as string) || null,
    audioUrl: (row.audio_url as string) || null,
    audioGeneratedAt: (row.audio_generated_at as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getGoalStory(id: number) {
  const result = await d1.execute({
    sql: `SELECT * FROM goal_stories WHERE id = ?`,
    args: [id],
  });

  if (result.rows.length === 0) {
    throw new Error(`GoalStory ${id} not found`);
  }

  const row = result.rows[0];
  return {
    id: row.id as number,
    goalId: row.goal_id as number,
    language: row.language as string,
    minutes: row.minutes as number,
    text: row.text as string,
    audioKey: (row.audio_key as string) || null,
    audioUrl: (row.audio_url as string) || null,
    audioGeneratedAt: (row.audio_generated_at as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function updateGoalStoryAudio(
  id: number,
  audioKey: string,
  audioUrl: string,
) {
  const now = new Date().toISOString();
  await d1.execute({
    sql: `UPDATE goal_stories SET audio_key = ?, audio_url = ?, audio_generated_at = ?, updated_at = ? WHERE id = ?`,
    args: [audioKey, audioUrl, now, now, id],
  });
}

export async function listGoalStories(goalId: number) {
  const result = await d1.execute({
    sql: `SELECT * FROM goal_stories WHERE goal_id = ? ORDER BY created_at DESC`,
    args: [goalId],
  });

  return result.rows.map((row) => ({
    id: row.id as number,
    goalId: row.goal_id as number,
    language: row.language as string,
    minutes: row.minutes as number,
    text: row.text as string,
    audioKey: (row.audio_key as string) || null,
    audioUrl: (row.audio_url as string) || null,
    audioGeneratedAt: (row.audio_generated_at as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function getTextSegmentsForStory(storyId: number) {
  const result = await d1.execute({
    sql: `SELECT * FROM text_segments WHERE story_id = ? ORDER BY idx ASC`,
    args: [storyId],
  });

  return result.rows.map((row) => ({
    id: row.id as number,
    goalId: row.goal_id as number,
    storyId: (row.story_id as number) || null,
    idx: row.idx as number,
    text: row.text as string,
    createdAt: row.created_at as string,
  }));
}

export async function getAudioAssetsForStory(storyId: number) {
  const result = await d1.execute({
    sql: `SELECT * FROM audio_assets WHERE story_id = ? ORDER BY created_at DESC`,
    args: [storyId],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    createdBy: row.user_id as string,
    goalId: row.goal_id as number,
    storyId: (row.story_id as number) || null,
    language: row.language as string,
    voice: row.voice as string,
    mimeType: row.mime_type as string,
    manifest: JSON.parse(row.manifest as string),
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
    fromDate?: string;
    toDate?: string;
  },
) {
  let sql = `SELECT * FROM journal_entries WHERE user_id = ?`;
  const args: any[] = [userId];

  if (opts?.familyMemberId) {
    sql += ` AND family_member_id = ?`;
    args.push(opts.familyMemberId);
  }
  if (opts?.goalId) {
    sql += ` AND goal_id = ?`;
    args.push(opts.goalId);
  }
  if (opts?.mood) {
    sql += ` AND mood = ?`;
    args.push(opts.mood);
  }
  if (opts?.fromDate) {
    sql += ` AND entry_date >= ?`;
    args.push(opts.fromDate);
  }
  if (opts?.toDate) {
    sql += ` AND entry_date <= ?`;
    args.push(opts.toDate);
  }

  sql += ` ORDER BY entry_date DESC, created_at DESC`;

  const result = await d1.execute({ sql, args });
  return result.rows.map((row) => ({
    id: row.id as number,
    userId: row.user_id as string,
    familyMemberId: (row.family_member_id as number) || null,
    title: (row.title as string) || null,
    content: row.content as string,
    mood: (row.mood as string) || null,
    moodScore: (row.mood_score as number) || null,
    tags: row.tags ? JSON.parse(row.tags as string) : [],
    goalId: (row.goal_id as number) || null,
    isPrivate: (row.is_private as number) === 1,
    entryDate: row.entry_date as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function getJournalEntry(id: number, userId: string) {
  const result = await d1.execute({
    sql: `SELECT * FROM journal_entries WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as number,
    userId: row.user_id as string,
    familyMemberId: (row.family_member_id as number) || null,
    title: (row.title as string) || null,
    content: row.content as string,
    mood: (row.mood as string) || null,
    moodScore: (row.mood_score as number) || null,
    tags: row.tags ? JSON.parse(row.tags as string) : [],
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
  const result = await d1.execute({
    sql: `INSERT INTO journal_entries (user_id, family_member_id, title, content, mood, mood_score, tags, goal_id, is_private, entry_date, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id`,
    args: [
      params.userId,
      params.familyMemberId ?? null,
      params.title ?? null,
      params.content,
      params.mood ?? null,
      params.moodScore ?? null,
      tagsJson,
      params.goalId ?? null,
      isPrivate,
      params.entryDate,
    ],
  });
  return result.rows[0].id as number;
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

  if (updates.title !== undefined) {
    fields.push("title = ?");
    args.push(updates.title);
  }
  if (updates.content !== undefined) {
    fields.push("content = ?");
    args.push(updates.content);
  }
  if (updates.mood !== undefined) {
    fields.push("mood = ?");
    args.push(updates.mood);
  }
  if (updates.moodScore !== undefined) {
    fields.push("mood_score = ?");
    args.push(updates.moodScore);
  }
  if (updates.tags !== undefined) {
    fields.push("tags = ?");
    args.push(JSON.stringify(updates.tags));
  }
  if (updates.goalId !== undefined) {
    fields.push("goal_id = ?");
    args.push(updates.goalId);
  }
  if (updates.familyMemberId !== undefined) {
    fields.push("family_member_id = ?");
    args.push(updates.familyMemberId);
  }
  if (updates.isPrivate !== undefined) {
    fields.push("is_private = ?");
    args.push(updates.isPrivate ? 1 : 0);
  }
  if (updates.entryDate !== undefined) {
    fields.push("entry_date = ?");
    args.push(updates.entryDate);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  args.push(id, userId);

  await d1.execute({
    sql: `UPDATE journal_entries SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });
}

export async function deleteJournalEntry(
  id: number,
  userId: string,
): Promise<boolean> {
  await d1.execute({
    sql: `DELETE FROM journal_entries WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  return true;
}

// ============================================
// Behavior Observations
// ============================================

export async function getBehaviorObservationsForFamilyMember(
  familyMemberId: number,
  userId: string,
  goalId?: number,
) {
  let sql = `SELECT * FROM behavior_observations WHERE family_member_id = ? AND user_id = ?`;
  const args: any[] = [familyMemberId, userId];

  if (goalId !== undefined) {
    sql += ` AND goal_id = ?`;
    args.push(goalId);
  }

  sql += ` ORDER BY observed_at DESC, created_at DESC`;

  const result = await d1.execute({ sql, args });
  return result.rows.map((row) => ({
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
  const result = await d1.execute({
    sql: `SELECT * FROM behavior_observations WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
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

export async function createBehaviorObservation(params: {
  familyMemberId: number;
  goalId?: number | null;
  characteristicId?: number | null;
  userId: string;
  observedAt: string;
  observationType: string;
  frequency?: number | null;
  intensity?: string | null;
  context?: string | null;
  notes?: string | null;
}): Promise<number> {
  const safeFrequency =
    params.frequency !== undefined &&
    params.frequency !== null &&
    !isNaN(params.frequency) &&
    isFinite(params.frequency)
      ? params.frequency
      : null;

  const result = await d1.execute({
    sql: `INSERT INTO behavior_observations (family_member_id, goal_id, characteristic_id, user_id, observed_at, observation_type, frequency, intensity, context, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id`,
    args: [
      params.familyMemberId,
      params.goalId ?? null,
      params.characteristicId ?? null,
      params.userId,
      params.observedAt,
      params.observationType,
      safeFrequency,
      params.intensity ?? null,
      params.context ?? null,
      params.notes ?? null,
    ],
  });
  return result.rows[0].id as number;
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

  if (updates.observedAt !== undefined) {
    fields.push("observed_at = ?");
    args.push(updates.observedAt);
  }
  if (updates.observationType !== undefined) {
    fields.push("observation_type = ?");
    args.push(updates.observationType);
  }
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
  if (updates.intensity !== undefined) {
    fields.push("intensity = ?");
    args.push(updates.intensity);
  }
  if (updates.context !== undefined) {
    fields.push("context = ?");
    args.push(updates.context);
  }
  if (updates.notes !== undefined) {
    fields.push("notes = ?");
    args.push(updates.notes);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  args.push(id, userId);

  await d1.execute({
    sql: `UPDATE behavior_observations SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });
}

export async function deleteBehaviorObservation(
  id: number,
  userId: string,
): Promise<void> {
  await d1.execute({
    sql: `DELETE FROM behavior_observations WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
}

// ============================================
// Family Member Characteristics
// ============================================

export async function getCharacteristicsForFamilyMember(
  familyMemberId: number,
  userId: string,
  category?: string,
) {
  let sql = `SELECT * FROM family_member_characteristics WHERE family_member_id = ? AND user_id = ?`;
  const args: any[] = [familyMemberId, userId];

  if (category !== undefined) {
    sql += ` AND category = ?`;
    args.push(category);
  }

  sql += ` ORDER BY created_at ASC`;

  const result = await d1.execute({ sql, args });
  return result.rows.map(mapCharacteristicRow);
}

function mapCharacteristicRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    familyMemberId: row.family_member_id as number,
    userId: row.user_id as string,
    category: row.category as string,
    title: row.title as string,
    description: (row.description as string) || null,
    severity: (row.severity as string) || null,
    frequencyPerWeek: (row.frequency_per_week as number) ?? null,
    durationWeeks: (row.duration_weeks as number) ?? null,
    ageOfOnset: (row.age_of_onset as number) ?? null,
    impairmentDomains: row.impairment_domains
      ? JSON.parse(row.impairment_domains as string)
      : [],
    formulationStatus: (row.formulation_status as string) || "DRAFT",
    externalizedName: (row.externalized_name as string) || null,
    strengths: (row.strengths as string) || null,
    riskTier: (row.risk_tier as string) || "NONE",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getCharacteristic(id: number, userId: string) {
  const result = await d1.execute({
    sql: `SELECT * FROM family_member_characteristics WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  if (result.rows.length === 0) return null;
  return mapCharacteristicRow(result.rows[0]);
}

export async function createCharacteristic(params: {
  familyMemberId: number;
  userId: string;
  category: string;
  title: string;
  description?: string | null;
  severity?: string | null;
  frequencyPerWeek?: number | null;
  durationWeeks?: number | null;
  ageOfOnset?: number | null;
  impairmentDomains?: string[] | null;
  formulationStatus?: string | null;
  externalizedName?: string | null;
  strengths?: string | null;
  riskTier?: string | null;
}): Promise<number> {
  const safeFreq = sanitizeInt(params.frequencyPerWeek);
  const safeDuration = sanitizeInt(params.durationWeeks);
  const safeAge = sanitizeInt(params.ageOfOnset);

  const result = await d1.execute({
    sql: `INSERT INTO family_member_characteristics (family_member_id, user_id, category, title, description, severity, frequency_per_week, duration_weeks, age_of_onset, impairment_domains, formulation_status, externalized_name, strengths, risk_tier, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id`,
    args: [
      params.familyMemberId,
      params.userId,
      params.category,
      params.title,
      params.description ?? null,
      params.severity ?? null,
      safeFreq,
      safeDuration,
      safeAge,
      params.impairmentDomains ? JSON.stringify(params.impairmentDomains) : null,
      params.formulationStatus ?? "DRAFT",
      params.externalizedName ?? null,
      params.strengths ?? null,
      params.riskTier ?? "NONE",
    ],
  });
  return result.rows[0].id as number;
}

function sanitizeInt(val: number | null | undefined): number | null {
  if (val === undefined || val === null || isNaN(val) || !isFinite(val))
    return null;
  return val;
}

export async function updateCharacteristic(
  id: number,
  userId: string,
  updates: {
    category?: string;
    title?: string;
    description?: string | null;
    severity?: string | null;
    frequencyPerWeek?: number | null;
    durationWeeks?: number | null;
    ageOfOnset?: number | null;
    impairmentDomains?: string[] | null;
    formulationStatus?: string | null;
    externalizedName?: string | null;
    strengths?: string | null;
    riskTier?: string | null;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.category !== undefined) {
    fields.push("category = ?");
    args.push(updates.category);
  }
  if (updates.title !== undefined) {
    fields.push("title = ?");
    args.push(updates.title);
  }
  if (updates.description !== undefined) {
    fields.push("description = ?");
    args.push(updates.description);
  }
  if (updates.severity !== undefined) {
    fields.push("severity = ?");
    args.push(updates.severity);
  }
  if (updates.frequencyPerWeek !== undefined) {
    fields.push("frequency_per_week = ?");
    args.push(sanitizeInt(updates.frequencyPerWeek));
  }
  if (updates.durationWeeks !== undefined) {
    fields.push("duration_weeks = ?");
    args.push(sanitizeInt(updates.durationWeeks));
  }
  if (updates.ageOfOnset !== undefined) {
    fields.push("age_of_onset = ?");
    args.push(sanitizeInt(updates.ageOfOnset));
  }
  if (updates.impairmentDomains !== undefined) {
    fields.push("impairment_domains = ?");
    args.push(
      updates.impairmentDomains
        ? JSON.stringify(updates.impairmentDomains)
        : null,
    );
  }
  if (updates.formulationStatus !== undefined) {
    fields.push("formulation_status = ?");
    args.push(updates.formulationStatus);
  }
  if (updates.externalizedName !== undefined) {
    fields.push("externalized_name = ?");
    args.push(updates.externalizedName);
  }
  if (updates.strengths !== undefined) {
    fields.push("strengths = ?");
    args.push(updates.strengths);
  }
  if (updates.riskTier !== undefined) {
    fields.push("risk_tier = ?");
    args.push(updates.riskTier);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  args.push(id, userId);

  await d1.execute({
    sql: `UPDATE family_member_characteristics SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });
}

export async function deleteCharacteristic(
  id: number,
  userId: string,
): Promise<void> {
  await d1.execute({
    sql: `DELETE FROM family_member_characteristics WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
}

// ============================================
// Characteristic Behavior Observations
// ============================================

export async function getCharacteristicBehaviorObservations(
  characteristicId: number,
  userId: string,
) {
  const result = await d1.execute({
    sql: `SELECT * FROM behavior_observations WHERE characteristic_id = ? AND user_id = ? ORDER BY observed_at DESC`,
    args: [characteristicId, userId],
  });
  return result.rows.map((row) => ({
    id: row.id as number,
    familyMemberId: row.family_member_id as number,
    goalId: (row.goal_id as number) || null,
    characteristicId: (row.characteristic_id as number) || null,
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
// Unique Outcomes
// ============================================

export async function getUniqueOutcomesForCharacteristic(
  characteristicId: number,
  userId: string,
) {
  const result = await d1.execute({
    sql: `SELECT * FROM unique_outcomes WHERE characteristic_id = ? AND user_id = ? ORDER BY observed_at DESC`,
    args: [characteristicId, userId],
  });
  return result.rows.map((row) => ({
    id: row.id as number,
    characteristicId: row.characteristic_id as number,
    userId: row.user_id as string,
    observedAt: row.observed_at as string,
    description: row.description as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function getUniqueOutcome(id: number, userId: string) {
  const result = await d1.execute({
    sql: `SELECT * FROM unique_outcomes WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as number,
    characteristicId: row.characteristic_id as number,
    userId: row.user_id as string,
    observedAt: row.observed_at as string,
    description: row.description as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createUniqueOutcome(params: {
  characteristicId: number;
  userId: string;
  observedAt: string;
  description: string;
}): Promise<number> {
  const result = await d1.execute({
    sql: `INSERT INTO unique_outcomes (characteristic_id, user_id, observed_at, description, created_at, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id`,
    args: [
      params.characteristicId,
      params.userId,
      params.observedAt,
      params.description,
    ],
  });
  return result.rows[0].id as number;
}

export async function updateUniqueOutcome(
  id: number,
  userId: string,
  updates: {
    observedAt?: string;
    description?: string;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.observedAt !== undefined) {
    fields.push("observed_at = ?");
    args.push(updates.observedAt);
  }
  if (updates.description !== undefined) {
    fields.push("description = ?");
    args.push(updates.description);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  args.push(id, userId);

  await d1.execute({
    sql: `UPDATE unique_outcomes SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });
}

export async function deleteUniqueOutcome(
  id: number,
  userId: string,
): Promise<void> {
  await d1.execute({
    sql: `DELETE FROM unique_outcomes WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
}

// ============================================
// Bidirectional Relationships
// ============================================

export async function getRelationshipsBidirectional(
  subjectType: string,
  subjectId: number,
  userId: string,
) {
  const result = await d1.execute({
    sql: `SELECT * FROM relationships
          WHERE user_id = ? AND (
            (subject_type = ? AND subject_id = ?) OR
            (related_type = ? AND related_id = ?)
          )
          ORDER BY created_at DESC`,
    args: [userId, subjectType, subjectId, subjectType, subjectId],
  });
  return result.rows.map((row) => ({
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
  const result = await d1.execute({
    sql: `SELECT * FROM contacts WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });
  return result.rows.map((row) => ({
    id: row.id as number,
    userId: row.user_id as string,
    firstName: row.first_name as string,
    lastName: (row.last_name as string) || null,
    role: (row.role as string) || null,
    ageYears: (row.age_years as number) || null,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function getContact(id: number, userId: string) {
  const result = await d1.execute({
    sql: `SELECT * FROM contacts WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as number,
    userId: row.user_id as string,
    firstName: row.first_name as string,
    lastName: (row.last_name as string) || null,
    role: (row.role as string) || null,
    ageYears: (row.age_years as number) || null,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createContact(params: {
  userId: string;
  firstName: string;
  lastName?: string | null;
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

  const result = await d1.execute({
    sql: `INSERT INTO contacts (user_id, first_name, last_name, role, age_years, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id`,
    args: [
      params.userId,
      params.firstName,
      params.lastName ?? null,
      params.role ?? null,
      safeAge,
      params.notes ?? null,
    ],
  });
  return result.rows[0].id as number;
}

export async function updateContact(
  id: number,
  userId: string,
  updates: {
    firstName?: string;
    lastName?: string | null;
    role?: string | null;
    ageYears?: number | null;
    notes?: string | null;
  },
) {
  const fields: string[] = [];
  const args: any[] = [];

  if (updates.firstName !== undefined) {
    fields.push("first_name = ?");
    args.push(updates.firstName);
  }
  if (updates.lastName !== undefined) {
    fields.push("last_name = ?");
    args.push(updates.lastName);
  }
  if (updates.role !== undefined) {
    fields.push("role = ?");
    args.push(updates.role);
  }
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
  if (updates.notes !== undefined) {
    fields.push("notes = ?");
    args.push(updates.notes);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  args.push(id, userId);

  await d1.execute({
    sql: `UPDATE contacts SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });
}

export async function deleteContact(
  id: number,
  userId: string,
): Promise<void> {
  await d1.execute({
    sql: `DELETE FROM contacts WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
}

// ============================================
// Relationships
// ============================================

export async function getRelationshipsForPerson(
  userId: string,
  subjectType: string,
  subjectId: number,
) {
  const result = await d1.execute({
    sql: `SELECT * FROM relationships
          WHERE user_id = ? AND (
            (subject_type = ? AND subject_id = ?) OR
            (related_type = ? AND related_id = ?)
          )
          ORDER BY created_at DESC`,
    args: [userId, subjectType, subjectId, subjectType, subjectId],
  });
  return result.rows.map((row) => ({
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

export async function getRelationship(id: number, userId: string) {
  const result = await d1.execute({
    sql: `SELECT * FROM relationships WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
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
  const result = await d1.execute({
    sql: `INSERT INTO relationships (user_id, subject_type, subject_id, related_type, related_id, relationship_type, context, start_date, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id`,
    args: [
      params.userId,
      params.subjectType,
      params.subjectId,
      params.relatedType,
      params.relatedId,
      params.relationshipType,
      params.context ?? null,
      params.startDate ?? null,
      params.status ?? "active",
    ],
  });
  return result.rows[0].id as number;
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

  if (updates.relationshipType !== undefined) {
    fields.push("relationship_type = ?");
    args.push(updates.relationshipType);
  }
  if (updates.context !== undefined) {
    fields.push("context = ?");
    args.push(updates.context);
  }
  if (updates.startDate !== undefined) {
    fields.push("start_date = ?");
    args.push(updates.startDate);
  }
  if (updates.status !== undefined) {
    fields.push("status = ?");
    args.push(updates.status);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  args.push(id, userId);

  await d1.execute({
    sql: `UPDATE relationships SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });
}

export async function deleteRelationship(
  id: number,
  userId: string,
): Promise<void> {
  await d1.execute({
    sql: `DELETE FROM relationships WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
}

// ============================================
// User Settings
// ============================================

export async function getUserSettings(
  userId: string,
): Promise<{ userId: string; storyLanguage: string; storyMinutes: number }> {
  const result = await d1.execute({
    sql: `SELECT * FROM user_settings WHERE user_id = ?`,
    args: [userId],
  });
  if (result.rows.length === 0) {
    return { userId, storyLanguage: "English", storyMinutes: 10 };
  }
  const row = result.rows[0];
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
  await d1.execute({
    sql: `INSERT INTO user_settings (user_id, story_language, story_minutes, created_at, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id) DO UPDATE SET
            story_language = excluded.story_language,
            story_minutes = excluded.story_minutes,
            updated_at = CURRENT_TIMESTAMP`,
    args: [userId, storyLanguage, storyMinutes],
  });
  return { userId, storyLanguage, storyMinutes };
}

export const d1Tools = {
  // Family Members
  listFamilyMembers,
  getFamilyMember,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  // Family Member Shares
  shareFamilyMember,
  unshareFamilyMember,
  getFamilyMemberShares,
  getSharedFamilyMembers,
  // Goals
  getGoal,
  getGoalBySlug,
  listGoals,
  createGoal,
  updateGoal,
  upsertTherapyResearch,
  listTherapyResearch,
  getResearchForNote,
  getNoteById,
  getNoteBySlug,
  getAllNotesForUser,
  listNotesForEntity,
  createNote,
  updateNote,
  linkResearchToNote,
  canViewerReadNote,
  setNoteVisibility,
  shareNote,
  unshareNote,
  getNoteShares,
  getSharedNotes,
  getAllStoriesForUser,
  listStories,
  getStory,
  createStory,
  updateStory,
  deleteStory,
  createGenerationJob,
  updateGenerationJob,
  getGenerationJob,
  listTherapeuticQuestions,
  createGoalStory,
  getGoalStory,
  updateGoalStoryAudio,
  listGoalStories,
  getTextSegmentsForStory,
  getAudioAssetsForStory,
  // Journal Entries
  listJournalEntries,
  getJournalEntry,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  // Behavior Observations
  getBehaviorObservationsForFamilyMember,
  getBehaviorObservation,
  createBehaviorObservation,
  updateBehaviorObservation,
  deleteBehaviorObservation,
  // Family Member Characteristics
  getCharacteristicsForFamilyMember,
  getCharacteristic,
  createCharacteristic,
  updateCharacteristic,
  deleteCharacteristic,
  getCharacteristicBehaviorObservations,
  // Unique Outcomes
  getUniqueOutcomesForCharacteristic,
  getUniqueOutcome,
  createUniqueOutcome,
  updateUniqueOutcome,
  deleteUniqueOutcome,
  // Bidirectional Relationships
  getRelationshipsBidirectional,
  // Contacts
  getContactsForUser,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  // Relationships
  getRelationshipsForPerson,
  getRelationship,
  createRelationship,
  updateRelationship,
  deleteRelationship,
  // User Settings
  getUserSettings,
  upsertUserSettings,
};

// Export d1 client for direct database access
export { d1 };
