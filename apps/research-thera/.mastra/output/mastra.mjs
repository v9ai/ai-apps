import { Mastra } from '@mastra/core';
import { CloudflareDeployer } from '@mastra/deployer-cloudflare';
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { neon } from '@neondatabase/serverless';
import { createOpenAI } from '@ai-sdk/openai';

const sql = neon(process.env.NEON_DATABASE_URL);

function safeJsonParse(raw, fallback) {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    console.warn(
      `[safeJsonParse] Failed to parse JSON (${raw.length} chars): ${raw.slice(0, 120)}`
    );
    return fallback;
  }
}

function p(template, params) {
  let i = 0;
  const query = template.replace(/\?/g, () => `$${++i}`);
  return [query, params];
}
async function listFamilyMembers(userId) {
  const rows = await sql`SELECT * FROM family_members WHERE user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    slug: row.slug || null,
    firstName: row.first_name,
    name: row.name || null,
    ageYears: row.age_years || null,
    relationship: row.relationship || null,
    dateOfBirth: row.date_of_birth || null,
    bio: row.bio || null,
    email: row.email || null,
    phone: row.phone || null,
    location: row.location || null,
    occupation: row.occupation || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function getFamilyMember(id) {
  const rows = await sql`SELECT * FROM family_members WHERE id = ${id}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug || null,
    firstName: row.first_name,
    name: row.name || null,
    ageYears: row.age_years || null,
    relationship: row.relationship || null,
    dateOfBirth: row.date_of_birth || null,
    bio: row.bio || null,
    email: row.email || null,
    phone: row.phone || null,
    location: row.location || null,
    occupation: row.occupation || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function getSelfFamilyMember(userId) {
  const rows = await sql`SELECT * FROM family_members WHERE user_id = ${userId} AND relationship = 'self' LIMIT 1`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug || null,
    firstName: row.first_name,
    name: row.name || null,
    ageYears: row.age_years || null,
    relationship: row.relationship || null,
    dateOfBirth: row.date_of_birth || null,
    bio: row.bio || null,
    email: row.email || null,
    phone: row.phone || null,
    location: row.location || null,
    occupation: row.occupation || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function getFamilyMemberBySlug(slug, userId) {
  const rows = await sql`SELECT * FROM family_members WHERE slug = ${slug} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug || null,
    firstName: row.first_name,
    name: row.name || null,
    ageYears: row.age_years || null,
    relationship: row.relationship || null,
    dateOfBirth: row.date_of_birth || null,
    bio: row.bio || null,
    email: row.email || null,
    phone: row.phone || null,
    location: row.location || null,
    occupation: row.occupation || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function slugify(text) {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}
async function generateFamilyMemberSlug(firstName, userId) {
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
async function createFamilyMember(params) {
  const slug = await generateFamilyMemberSlug(params.firstName, params.userId);
  const rows = await sql`
    INSERT INTO family_members (user_id, slug, first_name, name, age_years, relationship, date_of_birth, bio, email, phone, location, occupation, created_at, updated_at)
    VALUES (${params.userId}, ${slug}, ${params.firstName}, ${params.name ?? null}, ${params.ageYears ?? null}, ${params.relationship ?? null}, ${params.dateOfBirth ?? null}, ${params.bio ?? null}, ${params.email ?? null}, ${params.phone ?? null}, ${params.location ?? null}, ${params.occupation ?? null}, NOW(), NOW())
    RETURNING id`;
  return rows[0].id;
}
async function updateFamilyMember(id, params) {
  const sets = [];
  const args = [];
  if (params.firstName !== void 0) {
    sets.push("first_name = ?");
    args.push(params.firstName);
  }
  if (params.name !== void 0) {
    sets.push("name = ?");
    args.push(params.name);
  }
  if (params.ageYears !== void 0) {
    sets.push("age_years = ?");
    args.push(params.ageYears);
  }
  if (params.relationship !== void 0) {
    sets.push("relationship = ?");
    args.push(params.relationship);
  }
  if (params.dateOfBirth !== void 0) {
    sets.push("date_of_birth = ?");
    args.push(params.dateOfBirth);
  }
  if (params.bio !== void 0) {
    sets.push("bio = ?");
    args.push(params.bio);
  }
  if (params.email !== void 0) {
    sets.push("email = ?");
    args.push(params.email);
  }
  if (params.phone !== void 0) {
    sets.push("phone = ?");
    args.push(params.phone);
  }
  if (params.location !== void 0) {
    sets.push("location = ?");
    args.push(params.location);
  }
  if (params.occupation !== void 0) {
    sets.push("occupation = ?");
    args.push(params.occupation);
  }
  if (sets.length === 0) return;
  sets.push("updated_at = NOW()");
  args.push(id);
  const [query, queryParams] = p(`UPDATE family_members SET ${sets.join(", ")} WHERE id = ?`, args);
  await sql(query, queryParams);
}
async function deleteFamilyMember(id) {
  await sql`DELETE FROM family_members WHERE id = ${id}`;
  return true;
}
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}
async function shareFamilyMember(familyMemberId, email, role, createdBy) {
  const normalizedEmail = normalizeEmail(email);
  await sql`
    INSERT INTO family_member_shares (family_member_id, email, role, created_by)
    VALUES (${familyMemberId}, ${normalizedEmail}, ${role}, ${createdBy})
    ON CONFLICT (family_member_id, email)
    DO UPDATE SET role = excluded.role`;
  const rows = await sql`SELECT * FROM family_member_shares WHERE family_member_id = ${familyMemberId} AND email = ${normalizedEmail}`;
  const row = rows[0];
  return {
    familyMemberId: row.family_member_id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    createdBy: row.created_by
  };
}
async function unshareFamilyMember(familyMemberId, email) {
  const normalizedEmail = normalizeEmail(email);
  await sql`DELETE FROM family_member_shares WHERE family_member_id = ${familyMemberId} AND email = ${normalizedEmail}`;
  return true;
}
async function getSharedFamilyMembers(viewerEmail) {
  const normalizedEmail = normalizeEmail(viewerEmail);
  const rows = await sql`
    SELECT fm.* FROM family_members fm
    JOIN family_member_shares s ON s.family_member_id = fm.id
    WHERE s.email = ${normalizedEmail}
    ORDER BY fm.updated_at DESC`;
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    name: row.name || null,
    ageYears: row.age_years || null,
    relationship: row.relationship || null,
    dateOfBirth: row.date_of_birth || null,
    bio: row.bio || null,
    email: row.email || null,
    phone: row.phone || null,
    location: row.location || null,
    occupation: row.occupation || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function getGoal(goalId, createdBy) {
  const rows = await sql`SELECT * FROM goals WHERE id = ${goalId} AND user_id = ${createdBy}`;
  if (rows.length === 0) {
    throw new Error(`Goal ${goalId} not found`);
  }
  const row = rows[0];
  return {
    id: row.id,
    familyMemberId: row.family_member_id,
    createdBy: row.user_id,
    slug: row.slug || null,
    title: row.title,
    description: row.description || null,
    status: row.status,
    parentGoalId: row.parent_goal_id || null,
    therapeuticText: row.therapeutic_text || null,
    therapeuticTextLanguage: row.therapeutic_text_language || null,
    therapeuticTextGeneratedAt: row.therapeutic_text_generated_at || null,
    storyLanguage: row.story_language || null,
    parentAdvice: row.parent_advice || null,
    parentAdviceLanguage: row.parent_advice_language || null,
    parentAdviceGeneratedAt: row.parent_advice_generated_at || null,
    priority: row.priority || "medium",
    targetDate: row.target_date || null,
    tags: safeJsonParse(row.tags, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function getGoalBySlug(slug, createdBy) {
  const rows = await sql`SELECT * FROM goals WHERE slug = ${slug} AND user_id = ${createdBy}`;
  if (rows.length === 0) {
    throw new Error(`Goal with slug "${slug}" not found`);
  }
  const row = rows[0];
  return {
    id: row.id,
    familyMemberId: row.family_member_id,
    createdBy: row.user_id,
    slug: row.slug || null,
    title: row.title,
    description: row.description || null,
    status: row.status,
    parentGoalId: row.parent_goal_id || null,
    therapeuticText: row.therapeutic_text || null,
    therapeuticTextLanguage: row.therapeutic_text_language || null,
    therapeuticTextGeneratedAt: row.therapeutic_text_generated_at || null,
    storyLanguage: row.story_language || null,
    parentAdvice: row.parent_advice || null,
    parentAdviceLanguage: row.parent_advice_language || null,
    parentAdviceGeneratedAt: row.parent_advice_generated_at || null,
    priority: row.priority || "medium",
    targetDate: row.target_date || null,
    tags: safeJsonParse(row.tags, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function listGoals(createdBy, familyMemberId, status, tag) {
  let sqlStr = `SELECT * FROM goals WHERE user_id = ?`;
  const args = [createdBy];
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
  const rows = await sql(query, params);
  return rows.map((row) => ({
    id: row.id,
    familyMemberId: row.family_member_id,
    createdBy: row.user_id,
    title: row.title,
    description: row.description || null,
    status: row.status,
    tags: safeJsonParse(row.tags, []),
    parentGoalId: row.parent_goal_id || null,
    storyLanguage: row.story_language || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function createGoal(params) {
  const status = "active";
  const rows = await sql`
    INSERT INTO goals (family_member_id, user_id, slug, title, description, status, parent_goal_id)
    VALUES (${params.familyMemberId}, ${params.createdBy}, ${params.slug || null}, ${params.title}, ${params.description || null}, ${status}, ${params.parentGoalId || null})
    RETURNING id`;
  return rows[0].id;
}
async function updateGoal(goalId, createdBy, updates) {
  const fields = [];
  const args = [];
  if (updates.slug !== void 0) {
    fields.push("slug = ?");
    args.push(updates.slug);
  }
  if (updates.familyMemberId !== void 0) {
    fields.push("family_member_id = ?");
    args.push(updates.familyMemberId);
  }
  if (updates.title !== void 0) {
    fields.push("title = ?");
    args.push(updates.title);
  }
  if (updates.description !== void 0) {
    fields.push("description = ?");
    args.push(updates.description);
  }
  if (updates.status !== void 0) {
    fields.push("status = ?");
    args.push(updates.status);
  }
  if (updates.priority !== void 0) {
    fields.push("priority = ?");
    args.push(updates.priority);
  }
  if (updates.targetDate !== void 0) {
    fields.push("target_date = ?");
    args.push(updates.targetDate);
  }
  if (updates.tags !== void 0) {
    fields.push("tags = ?");
    args.push(JSON.stringify(updates.tags));
  }
  if (updates.storyLanguage !== void 0) {
    fields.push("story_language = ?");
    args.push(updates.storyLanguage);
  }
  fields.push("updated_at = NOW()");
  args.push(goalId, createdBy);
  const [query, params] = p(`UPDATE goals SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await sql(query, params);
}
async function saveParentAdvice(goalId, userId, advice, language) {
  await sql`
    UPDATE goals
    SET parent_advice = ${advice},
        parent_advice_language = ${language},
        parent_advice_generated_at = ${(/* @__PURE__ */ new Date()).toISOString()},
        updated_at = NOW()
    WHERE id = ${goalId} AND user_id = ${userId}`;
}
async function upsertTherapyResearch(goalId, userId, research) {
  const dedupCol = goalId != null ? "goal_id" : research.feedbackId != null ? "feedback_id" : null;
  const dedupVal = goalId != null ? goalId : research.feedbackId != null ? research.feedbackId : null;
  let existingId = null;
  if (research.doi) {
    let doiRows;
    if (dedupCol) {
      const [q, params] = p(`SELECT id FROM therapy_research WHERE ${dedupCol} = ? AND doi = ?`, [dedupVal, research.doi]);
      doiRows = await sql(q, params);
    } else {
      doiRows = await sql`SELECT id FROM therapy_research WHERE goal_id IS NULL AND doi = ${research.doi}`;
    }
    if (doiRows.length > 0) existingId = doiRows[0].id;
  }
  if (!existingId) {
    let titleRows;
    if (dedupCol) {
      const [q, params] = p(`SELECT id FROM therapy_research WHERE ${dedupCol} = ? AND title = ?`, [dedupVal, research.title]);
      titleRows = await sql(q, params);
    } else {
      titleRows = await sql`SELECT id FROM therapy_research WHERE goal_id IS NULL AND title = ${research.title}`;
    }
    if (titleRows.length > 0) existingId = titleRows[0].id;
  }
  const authorsJson = JSON.stringify(
    (research.authors || []).filter((a) => typeof a === "string")
  );
  const keyFindingsJson = JSON.stringify(
    (research.keyFindings || []).filter((k) => typeof k === "string")
  );
  const techniquesJson = JSON.stringify(
    (research.therapeuticTechniques || []).filter(
      (t) => typeof t === "string"
    )
  );
  const sanitizeNumber = (value, defaultValue = 0) => {
    if (value === null || value === void 0) return null;
    if (!Number.isFinite(value)) return defaultValue;
    return value;
  };
  const rawRelevance = sanitizeNumber(research.relevanceScore, 0) ?? 0;
  const relevanceScore = rawRelevance <= 1 ? Math.round(rawRelevance * 100) : Math.round(rawRelevance);
  const rawConfidence = sanitizeNumber(research.extractionConfidence, 0) ?? 0;
  const extractionConfidence = rawConfidence <= 1 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence);
  if (existingId) {
    await sql`
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
    const rows = await sql`
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
async function listTherapyResearch(goalId, issueId, feedbackId, journalEntryId) {
  let sqlStr = `SELECT * FROM therapy_research WHERE `;
  const args = [];
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
  const rows = await sql(query, params);
  return rows.map((row) => ({
    id: row.id,
    goalId: row.goal_id || null,
    feedbackId: row.feedback_id || null,
    issueId: row.issue_id || null,
    journalEntryId: row.journal_entry_id || null,
    therapeuticGoalType: row.therapeutic_goal_type,
    title: row.title,
    authors: safeJsonParse(row.authors, []),
    year: row.year || null,
    journal: row.journal || null,
    doi: row.doi || null,
    url: row.url || null,
    abstract: row.abstract || null,
    keyFindings: safeJsonParse(row.key_findings, []),
    therapeuticTechniques: safeJsonParse(
      row.therapeutic_techniques,
      []
    ),
    evidenceLevel: row.evidence_level || null,
    relevanceScore: row.relevance_score / 100,
    extractedBy: row.extracted_by,
    extractionConfidence: row.extraction_confidence / 100,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function getResearchForNote(noteId) {
  const rows = await sql`
    SELECT tr.* FROM therapy_research tr
    INNER JOIN notes_research nr ON tr.id = nr.research_id
    WHERE nr.note_id = ${noteId}
    ORDER BY tr.relevance_score DESC, tr.created_at DESC`;
  return rows.map((row) => ({
    id: row.id,
    goalId: row.goal_id,
    therapeuticGoalType: row.therapeutic_goal_type,
    title: row.title,
    authors: safeJsonParse(row.authors, []),
    year: row.year || null,
    journal: row.journal || null,
    doi: row.doi || null,
    url: row.url || null,
    abstract: row.abstract || null,
    keyFindings: safeJsonParse(row.key_findings, []),
    therapeuticTechniques: safeJsonParse(
      row.therapeutic_techniques,
      []
    ),
    evidenceLevel: row.evidence_level || null,
    relevanceScore: row.relevance_score / 100,
    extractedBy: row.extracted_by,
    extractionConfidence: row.extraction_confidence / 100,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function getNoteById(noteId, userId) {
  const rows = await sql`SELECT * FROM notes WHERE id = ${noteId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    createdBy: row.user_id,
    noteType: row.note_type || null,
    slug: row.slug || null,
    title: row.title || null,
    content: row.content,
    tags: safeJsonParse(row.tags, []),
    visibility: row.visibility || "PRIVATE",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function getNoteBySlug(slug, userId) {
  const rows = await sql`SELECT * FROM notes WHERE slug = ${slug}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    createdBy: row.user_id,
    noteType: row.note_type || null,
    slug: row.slug || null,
    title: row.title || null,
    content: row.content,
    tags: safeJsonParse(row.tags, []),
    visibility: row.visibility || "PRIVATE",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function getAllNotesForUser(userId) {
  const rows = await sql`SELECT * FROM notes WHERE user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map((row) => ({
    id: row.id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    createdBy: row.user_id,
    noteType: row.note_type || null,
    slug: row.slug || null,
    title: row.title || null,
    content: row.content,
    tags: safeJsonParse(row.tags, []),
    visibility: row.visibility || "PRIVATE",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function listNotesForEntity(entityId, entityType, userId) {
  const rows = await sql`SELECT * FROM notes WHERE entity_id = ${entityId} AND entity_type = ${entityType} AND user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map((row) => ({
    id: row.id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    createdBy: row.user_id,
    noteType: row.note_type || null,
    slug: row.slug || null,
    title: row.title || null,
    content: row.content,
    tags: safeJsonParse(row.tags, []),
    visibility: row.visibility || "PRIVATE",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function createNote(params) {
  const tagsJson = JSON.stringify(params.tags);
  const slug = params.slug || params.content.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 50);
  const rows = await sql`
    INSERT INTO notes (entity_id, entity_type, user_id, note_type, slug, content, created_by, tags)
    VALUES (${params.entityId}, ${params.entityType}, ${params.userId}, ${params.noteType}, ${slug}, ${params.content}, ${params.createdBy}, ${tagsJson})
    RETURNING id`;
  return rows[0].id;
}
async function updateNote(noteId, userId, updates) {
  const fields = [];
  const args = [];
  if (updates.entityId !== void 0) {
    fields.push("entity_id = ?");
    args.push(updates.entityId);
  }
  if (updates.entityType !== void 0) {
    fields.push("entity_type = ?");
    args.push(updates.entityType);
  }
  if (updates.noteType !== void 0) {
    fields.push("note_type = ?");
    args.push(updates.noteType);
  }
  if (updates.content !== void 0) {
    fields.push("content = ?");
    args.push(updates.content);
  }
  if (updates.createdBy !== void 0) {
    fields.push("created_by = ?");
    args.push(updates.createdBy);
  }
  if (updates.tags !== void 0) {
    fields.push("tags = ?");
    args.push(JSON.stringify(updates.tags));
  }
  if (updates.title !== void 0) {
    fields.push("title = ?");
    args.push(updates.title);
  }
  fields.push("updated_at = NOW()");
  args.push(noteId, userId);
  const [query, params] = p(`UPDATE notes SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await sql(query, params);
}
async function linkResearchToNote(noteId, researchIds) {
  await sql`DELETE FROM notes_research WHERE note_id = ${noteId}`;
  for (const researchId of researchIds) {
    await sql`INSERT INTO notes_research (note_id, research_id) VALUES (${noteId}, ${researchId})`;
  }
}
async function canViewerReadNote(noteId, viewerEmail) {
  const ve = viewerEmail || "";
  const vn = normalizeEmail(ve);
  const rows = await sql`
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
  const ownerEmail = row.owner_email;
  const visibility = row.visibility;
  if (!canRead) {
    return { canRead: false, canEdit: false, reason: "FORBIDDEN" };
  }
  if (viewerEmail === ownerEmail) {
    return { canRead: true, canEdit: true, reason: "OWNER" };
  }
  if (visibility === "PUBLIC") {
    return { canRead: true, canEdit: false, reason: "PUBLIC" };
  }
  const shareRows = await sql`SELECT role FROM note_shares WHERE note_id = ${noteId} AND email = ${normalizeEmail(viewerEmail || "")}`;
  if (shareRows.length > 0) {
    const role = shareRows[0].role;
    return {
      canRead: true,
      canEdit: role === "EDITOR",
      reason: `SHARED_${role}`
    };
  }
  return { canRead: true, canEdit: false, reason: "SHARED" };
}
async function setNoteVisibility(noteId, visibility, userId) {
  await sql`UPDATE notes SET visibility = ${visibility}, updated_at = NOW() WHERE id = ${noteId} AND user_id = ${userId}`;
  return getNoteById(noteId);
}
async function shareNote(noteId, email, role, createdBy) {
  const normalizedEmail = normalizeEmail(email);
  await sql`
    INSERT INTO note_shares (note_id, email, role, created_by)
    VALUES (${noteId}, ${normalizedEmail}, ${role}, ${createdBy})
    ON CONFLICT (note_id, email)
    DO UPDATE SET role = excluded.role`;
  const rows = await sql`SELECT * FROM note_shares WHERE note_id = ${noteId} AND email = ${normalizedEmail}`;
  const row = rows[0];
  return {
    noteId: row.note_id,
    email: row.email,
    role: row.role,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}
async function unshareNote(noteId, email, userId) {
  const normalizedEmail = normalizeEmail(email);
  const rows = await sql`DELETE FROM note_shares WHERE note_id = ${noteId} AND email = ${normalizedEmail} RETURNING note_id`;
  return rows.length > 0;
}
async function getSharedNotes(viewerEmail) {
  const normalizedEmail = normalizeEmail(viewerEmail);
  const rows = await sql`
    SELECT n.*
    FROM notes n
    JOIN note_shares s ON s.note_id = n.id
    WHERE s.email = ${normalizedEmail}
    ORDER BY n.updated_at DESC`;
  return rows.map((row) => ({
    id: row.id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    createdBy: row.user_id,
    noteType: row.note_type || null,
    slug: row.slug || null,
    title: row.title || null,
    content: row.content,
    tags: safeJsonParse(row.tags, []),
    visibility: row.visibility || "PRIVATE",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
function mapStoryRow(row) {
  return {
    id: row.id,
    goalId: row.goal_id ?? null,
    issueId: row.issue_id ?? null,
    feedbackId: row.feedback_id ?? null,
    createdBy: row.user_id ?? null,
    content: row.content,
    language: row.language ?? null,
    minutes: row.minutes ?? null,
    audioKey: row.audio_key ?? null,
    audioUrl: row.audio_url ?? null,
    audioGeneratedAt: row.audio_generated_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function getAllStoriesForUser(createdBy) {
  const rows = await sql`SELECT * FROM stories WHERE user_id = ${createdBy} ORDER BY created_at DESC`;
  return rows.map(mapStoryRow);
}
async function listStories(goalId) {
  const rows = await sql`SELECT * FROM stories WHERE goal_id = ${goalId} ORDER BY created_at DESC`;
  return rows.map(mapStoryRow);
}
async function listStoriesForIssue(issueId) {
  const rows = await sql`SELECT * FROM stories WHERE issue_id = ${issueId} ORDER BY created_at DESC`;
  return rows.map(mapStoryRow);
}
async function listStoriesForFeedback(feedbackId) {
  const rows = await sql`SELECT * FROM stories WHERE feedback_id = ${feedbackId} ORDER BY created_at DESC`;
  return rows.map(mapStoryRow);
}
async function getStory(storyId) {
  const rows = await sql`SELECT * FROM stories WHERE id = ${storyId}`;
  if (rows.length === 0) return null;
  return mapStoryRow(rows[0]);
}
async function createStory(params) {
  const rows = await sql`
    INSERT INTO stories (goal_id, issue_id, feedback_id, user_id, content, language, minutes)
    VALUES (${params.goalId ?? null}, ${params.issueId ?? null}, ${params.feedbackId ?? null}, ${params.createdBy ?? null}, ${params.content}, ${params.language ?? null}, ${params.minutes ?? null})
    RETURNING *`;
  return mapStoryRow(rows[0]);
}
async function updateStory(storyId, createdBy, updates) {
  const fields = [];
  const args = [];
  if (updates.content !== void 0) {
    fields.push("content = ?");
    args.push(updates.content);
  }
  fields.push("updated_at = NOW()");
  args.push(storyId, createdBy);
  const [query, params] = p(`UPDATE stories SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await sql(query, params);
}
async function updateStoryAudio(id, audioKey, audioUrl) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await sql`UPDATE stories SET audio_key = ${audioKey}, audio_url = ${audioUrl}, audio_generated_at = ${now}, updated_at = ${now} WHERE id = ${id}`;
}
async function deleteStory(storyId, createdBy) {
  await sql`DELETE FROM stories WHERE id = ${storyId} AND (user_id = ${createdBy} OR user_id IS NULL)`;
}
async function cleanupStaleJobs(minutes = 15) {
  await sql`
    UPDATE generation_jobs
    SET status = 'FAILED',
        error = '{"message":"Job timed out — no progress updates received"}',
        updated_at = NOW()
    WHERE status = 'RUNNING'
      AND updated_at::timestamptz < NOW() - (${minutes} * INTERVAL '1 minute')`;
}
async function createGenerationJob(id, userId, type, goalId, storyId) {
  await sql`
    INSERT INTO generation_jobs (id, user_id, type, goal_id, story_id, status, progress)
    VALUES (${id}, ${userId}, ${type}, ${goalId ?? null}, ${storyId || null}, 'RUNNING', 0)`;
}
async function updateGenerationJob(id, updates) {
  const fields = [];
  const args = [];
  if (updates.status) {
    fields.push("status = ?");
    args.push(updates.status);
  }
  if (updates.progress !== void 0) {
    fields.push("progress = ?");
    args.push(updates.progress);
  }
  if (updates.storyId !== void 0) {
    fields.push("story_id = ?");
    args.push(updates.storyId);
  }
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
  await sql(query, params);
}
function parseJobError(raw) {
  try {
    const first = JSON.parse(raw);
    if (typeof first === "string") {
      try {
        const second = JSON.parse(first);
        if (second && typeof second === "object" && "message" in second) {
          return second;
        }
      } catch {
        return { message: first };
      }
    }
    if (first && typeof first === "object" && "message" in first) {
      return first;
    }
    return { message: String(first) };
  } catch {
    return { message: raw };
  }
}
async function listGenerationJobs(filters = {}) {
  const conditions = [];
  const args = [];
  if (filters.userId) {
    conditions.push("user_id = ?");
    args.push(filters.userId);
  }
  if (filters.goalId) {
    conditions.push("goal_id = ?");
    args.push(filters.goalId);
  }
  if (filters.status) {
    conditions.push("status = ?");
    args.push(filters.status);
  }
  let query = "SELECT * FROM generation_jobs";
  if (conditions.length > 0) query += ` WHERE ${conditions.join(" AND ")}`;
  query += " ORDER BY created_at DESC";
  const [q, params] = p(query, args);
  const rows = await sql(q, params);
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    type: row.type,
    goalId: row.goal_id,
    storyId: row.story_id || null,
    status: row.status,
    progress: row.progress,
    result: safeJsonParse(row.result, null),
    error: row.error ? parseJobError(row.error) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function getGenerationJob(id) {
  const rows = await sql`SELECT * FROM generation_jobs WHERE id = ${id}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    goalId: row.goal_id,
    storyId: row.story_id || null,
    status: row.status,
    progress: row.progress,
    result: safeJsonParse(row.result, null),
    error: row.error ? parseJobError(row.error) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function listJournalEntries(userId, opts) {
  let sqlStr = `SELECT * FROM journal_entries WHERE user_id = ?`;
  const args = [userId];
  if (opts?.familyMemberId) {
    sqlStr += ` AND family_member_id = ?`;
    args.push(opts.familyMemberId);
  }
  if (opts?.goalId) {
    sqlStr += ` AND goal_id = ?`;
    args.push(opts.goalId);
  }
  if (opts?.mood) {
    sqlStr += ` AND mood = ?`;
    args.push(opts.mood);
  }
  if (opts?.tag) {
    sqlStr += ` AND tags LIKE ?`;
    args.push(`%"${opts.tag}"%`);
  }
  if (opts?.fromDate) {
    sqlStr += ` AND entry_date >= ?`;
    args.push(opts.fromDate);
  }
  if (opts?.toDate) {
    sqlStr += ` AND entry_date <= ?`;
    args.push(opts.toDate);
  }
  sqlStr += ` ORDER BY entry_date DESC, created_at DESC`;
  const [query, params] = p(sqlStr, args);
  const rows = await sql(query, params);
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    familyMemberId: row.family_member_id || null,
    title: row.title || null,
    content: row.content,
    mood: row.mood || null,
    moodScore: row.mood_score || null,
    tags: safeJsonParse(row.tags, []),
    goalId: row.goal_id || null,
    isPrivate: row.is_private === 1,
    entryDate: row.entry_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function getJournalEntry(id, userId) {
  const rows = await sql`SELECT * FROM journal_entries WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    familyMemberId: row.family_member_id || null,
    title: row.title || null,
    content: row.content,
    mood: row.mood || null,
    moodScore: row.mood_score || null,
    tags: safeJsonParse(row.tags, []),
    goalId: row.goal_id || null,
    isPrivate: row.is_private === 1,
    entryDate: row.entry_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function createJournalEntry(params) {
  const tagsJson = JSON.stringify(params.tags || []);
  const isPrivate = params.isPrivate !== false ? 1 : 0;
  const rows = await sql`
    INSERT INTO journal_entries (user_id, family_member_id, title, content, mood, mood_score, tags, goal_id, is_private, entry_date, created_at, updated_at)
    VALUES (${params.userId}, ${params.familyMemberId ?? null}, ${params.title ?? null}, ${params.content}, ${params.mood ?? null}, ${params.moodScore ?? null}, ${tagsJson}, ${params.goalId ?? null}, ${isPrivate}, ${params.entryDate}, NOW(), NOW())
    RETURNING id`;
  return rows[0].id;
}
async function updateJournalEntry(id, userId, updates) {
  const fields = [];
  const args = [];
  if (updates.title !== void 0) {
    fields.push("title = ?");
    args.push(updates.title);
  }
  if (updates.content !== void 0) {
    fields.push("content = ?");
    args.push(updates.content);
  }
  if (updates.mood !== void 0) {
    fields.push("mood = ?");
    args.push(updates.mood);
  }
  if (updates.moodScore !== void 0) {
    fields.push("mood_score = ?");
    args.push(updates.moodScore);
  }
  if (updates.tags !== void 0) {
    fields.push("tags = ?");
    args.push(JSON.stringify(updates.tags));
  }
  if (updates.goalId !== void 0) {
    fields.push("goal_id = ?");
    args.push(updates.goalId);
  }
  if (updates.familyMemberId !== void 0) {
    fields.push("family_member_id = ?");
    args.push(updates.familyMemberId);
  }
  if (updates.isPrivate !== void 0) {
    fields.push("is_private = ?");
    args.push(updates.isPrivate ? 1 : 0);
  }
  if (updates.entryDate !== void 0) {
    fields.push("entry_date = ?");
    args.push(updates.entryDate);
  }
  if (fields.length === 0) return;
  fields.push("updated_at = NOW()");
  args.push(id, userId);
  const [query, params] = p(`UPDATE journal_entries SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await sql(query, params);
}
async function deleteJournalEntry(id, userId) {
  await sql`DELETE FROM journal_entries WHERE id = ${id} AND user_id = ${userId}`;
  return true;
}
async function createBehaviorObservation(params) {
  const safeFrequency = params.frequency !== null && params.frequency !== void 0 && !isNaN(params.frequency) && isFinite(params.frequency) ? params.frequency : null;
  const rows = await sql`
    INSERT INTO behavior_observations (family_member_id, goal_id, issue_id, user_id, observed_at, observation_type, frequency, intensity, context, notes, created_at, updated_at)
    VALUES (${params.familyMemberId}, ${params.goalId ?? null}, ${params.issueId ?? null}, ${params.userId}, ${params.observedAt}, ${params.observationType}, ${safeFrequency}, ${params.intensity ?? null}, ${params.context ?? null}, ${params.notes ?? null}, NOW(), NOW())
    RETURNING id`;
  return rows[0].id;
}
async function getBehaviorObservationsForFamilyMember(familyMemberId, userId, goalId) {
  let sqlStr = `SELECT * FROM behavior_observations WHERE family_member_id = ? AND user_id = ?`;
  const args = [familyMemberId, userId];
  if (goalId !== void 0) {
    sqlStr += ` AND goal_id = ?`;
    args.push(goalId);
  }
  sqlStr += ` ORDER BY observed_at DESC, created_at DESC`;
  const [query, params] = p(sqlStr, args);
  const rows = await sql(query, params);
  return rows.map((row) => ({
    id: row.id,
    familyMemberId: row.family_member_id,
    goalId: row.goal_id || null,
    userId: row.user_id,
    observedAt: row.observed_at,
    observationType: row.observation_type,
    frequency: row.frequency ?? null,
    intensity: row.intensity || null,
    context: row.context || null,
    notes: row.notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function getBehaviorObservation(id, userId) {
  const rows = await sql`SELECT * FROM behavior_observations WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    familyMemberId: row.family_member_id,
    goalId: row.goal_id || null,
    userId: row.user_id,
    observedAt: row.observed_at,
    observationType: row.observation_type,
    frequency: row.frequency ?? null,
    intensity: row.intensity || null,
    context: row.context || null,
    notes: row.notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function updateBehaviorObservation(id, userId, updates) {
  const fields = [];
  const args = [];
  if (updates.observedAt !== void 0) {
    fields.push("observed_at = ?");
    args.push(updates.observedAt);
  }
  if (updates.observationType !== void 0) {
    fields.push("observation_type = ?");
    args.push(updates.observationType);
  }
  if (updates.frequency !== void 0) {
    const safeFrequency = updates.frequency !== null && !isNaN(updates.frequency) && isFinite(updates.frequency) ? updates.frequency : null;
    fields.push("frequency = ?");
    args.push(safeFrequency);
  }
  if (updates.intensity !== void 0) {
    fields.push("intensity = ?");
    args.push(updates.intensity);
  }
  if (updates.context !== void 0) {
    fields.push("context = ?");
    args.push(updates.context);
  }
  if (updates.notes !== void 0) {
    fields.push("notes = ?");
    args.push(updates.notes);
  }
  if (fields.length === 0) return;
  fields.push("updated_at = NOW()");
  args.push(id, userId);
  const [query, params] = p(`UPDATE behavior_observations SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await sql(query, params);
}
async function deleteBehaviorObservation(id, userId) {
  await sql`DELETE FROM behavior_observations WHERE id = ${id} AND user_id = ${userId}`;
}
async function getIssueBehaviorObservations(issueId, userId) {
  const rows = await sql`SELECT * FROM behavior_observations WHERE issue_id = ${issueId} AND user_id = ${userId} ORDER BY observed_at DESC`;
  return rows.map((row) => ({
    id: row.id,
    familyMemberId: row.family_member_id,
    goalId: row.goal_id || null,
    issueId: row.issue_id || null,
    userId: row.user_id,
    observedAt: row.observed_at,
    observationType: row.observation_type,
    frequency: row.frequency ?? null,
    intensity: row.intensity || null,
    context: row.context || null,
    notes: row.notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function getContactsForUser(userId) {
  const rows = await sql`SELECT * FROM contacts WHERE user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    slug: row.slug || null,
    firstName: row.first_name,
    lastName: row.last_name || null,
    description: row.description || null,
    role: row.role || null,
    ageYears: row.age_years || null,
    notes: row.notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function getContact(id, userId) {
  const rows = await sql`SELECT * FROM contacts WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug || null,
    firstName: row.first_name,
    lastName: row.last_name || null,
    description: row.description || null,
    role: row.role || null,
    ageYears: row.age_years || null,
    notes: row.notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function getContactBySlug(slug, userId) {
  const rows = await sql`SELECT * FROM contacts WHERE slug = ${slug} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug || null,
    firstName: row.first_name,
    lastName: row.last_name || null,
    description: row.description || null,
    role: row.role || null,
    ageYears: row.age_years || null,
    notes: row.notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function generateContactSlug(firstName, userId) {
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
async function createContact(params) {
  const safeAge = params.ageYears !== void 0 && params.ageYears !== null && !isNaN(params.ageYears) && isFinite(params.ageYears) ? params.ageYears : null;
  const slug = await generateContactSlug(params.firstName, params.userId);
  const rows = await sql`
    INSERT INTO contacts (user_id, slug, first_name, last_name, description, role, age_years, notes, created_at, updated_at)
    VALUES (${params.userId}, ${slug}, ${params.firstName}, ${params.lastName ?? null}, ${params.description ?? null}, ${params.role ?? null}, ${safeAge}, ${params.notes ?? null}, NOW(), NOW())
    RETURNING id`;
  return rows[0].id;
}
async function updateContact(id, userId, updates) {
  const fields = [];
  const args = [];
  if (updates.firstName !== void 0) {
    fields.push("first_name = ?");
    args.push(updates.firstName);
  }
  if (updates.slug !== void 0 && updates.slug !== null) {
    fields.push("slug = ?");
    args.push(updates.slug);
  }
  if (updates.lastName !== void 0) {
    fields.push("last_name = ?");
    args.push(updates.lastName);
  }
  if (updates.description !== void 0) {
    fields.push("description = ?");
    args.push(updates.description);
  }
  if (updates.role !== void 0) {
    fields.push("role = ?");
    args.push(updates.role);
  }
  if (updates.ageYears !== void 0) {
    const safeAge = updates.ageYears !== null && !isNaN(updates.ageYears) && isFinite(updates.ageYears) ? updates.ageYears : null;
    fields.push("age_years = ?");
    args.push(safeAge);
  }
  if (updates.notes !== void 0) {
    fields.push("notes = ?");
    args.push(updates.notes);
  }
  if (fields.length === 0) return;
  fields.push("updated_at = NOW()");
  args.push(id, userId);
  const [query, params] = p(`UPDATE contacts SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await sql(query, params);
}
async function deleteContact(id, userId) {
  await sql`DELETE FROM contacts WHERE id = ${id} AND user_id = ${userId}`;
}
async function getRelationshipsForPerson(userId, subjectType, subjectId) {
  const rows = await sql`
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
    let related = null;
    if (row.related_type === "CONTACT" && row.c_id) {
      related = { id: row.c_id, type: "CONTACT", slug: row.c_slug || null, firstName: row.c_first_name, lastName: row.c_last_name || null };
    } else if (row.related_type === "FAMILY_MEMBER" && row.fm_id) {
      related = { id: row.fm_id, type: "FAMILY_MEMBER", slug: row.fm_slug || null, firstName: row.fm_first_name, lastName: row.fm_name || null };
    }
    return {
      id: row.id,
      userId: row.user_id,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      relatedType: row.related_type,
      relatedId: row.related_id,
      relationshipType: row.relationship_type,
      context: row.context || null,
      startDate: row.start_date || null,
      status: row.status || "active",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      related
    };
  });
}
async function getRelationship(id, userId) {
  const rows = await sql`SELECT * FROM relationships WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    relatedType: row.related_type,
    relatedId: row.related_id,
    relationshipType: row.relationship_type,
    context: row.context || null,
    startDate: row.start_date || null,
    status: row.status || "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function createRelationship(params) {
  const rows = await sql`
    INSERT INTO relationships (user_id, subject_type, subject_id, related_type, related_id, relationship_type, context, start_date, status, created_at, updated_at)
    VALUES (${params.userId}, ${params.subjectType}, ${params.subjectId}, ${params.relatedType}, ${params.relatedId}, ${params.relationshipType}, ${params.context ?? null}, ${params.startDate ?? null}, ${params.status ?? "active"}, NOW(), NOW())
    RETURNING id`;
  return rows[0].id;
}
async function updateRelationship(id, userId, updates) {
  const fields = [];
  const args = [];
  if (updates.relationshipType !== void 0) {
    fields.push("relationship_type = ?");
    args.push(updates.relationshipType);
  }
  if (updates.context !== void 0) {
    fields.push("context = ?");
    args.push(updates.context);
  }
  if (updates.startDate !== void 0) {
    fields.push("start_date = ?");
    args.push(updates.startDate);
  }
  if (updates.status !== void 0) {
    fields.push("status = ?");
    args.push(updates.status);
  }
  if (fields.length === 0) return;
  fields.push("updated_at = NOW()");
  args.push(id, userId);
  const [query, params] = p(`UPDATE relationships SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await sql(query, params);
}
async function deleteRelationship(id, userId) {
  await sql`DELETE FROM relationships WHERE id = ${id} AND user_id = ${userId}`;
}
async function getUserSettings(userId) {
  const rows = await sql`SELECT * FROM user_settings WHERE user_id = ${userId}`;
  if (rows.length === 0) {
    return { userId, storyLanguage: "English", storyMinutes: 10 };
  }
  const row = rows[0];
  return {
    userId: row.user_id,
    storyLanguage: row.story_language ?? "English",
    storyMinutes: row.story_minutes ?? 10
  };
}
async function upsertUserSettings(userId, storyLanguage, storyMinutes) {
  await sql`
    INSERT INTO user_settings (user_id, story_language, story_minutes, created_at, updated_at)
    VALUES (${userId}, ${storyLanguage}, ${storyMinutes}, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      story_language = excluded.story_language,
      story_minutes = excluded.story_minutes,
      updated_at = NOW()`;
  return { userId, storyLanguage, storyMinutes };
}
function mapTeacherFeedbackRow(row) {
  return {
    id: row.id,
    familyMemberId: row.family_member_id,
    userId: row.user_id,
    teacherName: row.teacher_name,
    subject: row.subject || null,
    feedbackDate: row.feedback_date,
    content: row.content,
    tags: safeJsonParse(row.tags, null),
    source: row.source || null,
    extracted: row.extracted === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function getTeacherFeedbacksForFamilyMember(familyMemberId, userId) {
  const rows = await sql`SELECT * FROM teacher_feedbacks WHERE family_member_id = ${familyMemberId} AND user_id = ${userId} ORDER BY feedback_date DESC, created_at DESC`;
  return rows.map(mapTeacherFeedbackRow);
}
async function getTeacherFeedback(id, userId) {
  const rows = await sql`SELECT * FROM teacher_feedbacks WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  return mapTeacherFeedbackRow(rows[0]);
}
async function createTeacherFeedback(params) {
  const rows = await sql`
    INSERT INTO teacher_feedbacks (family_member_id, user_id, teacher_name, subject, feedback_date, content, tags, source, extracted, created_at, updated_at)
    VALUES (${params.familyMemberId}, ${params.userId}, ${params.teacherName}, ${params.subject ?? null}, ${params.feedbackDate}, ${params.content}, ${params.tags ? JSON.stringify(params.tags) : null}, ${params.source ?? null}, 0, NOW(), NOW())
    RETURNING id`;
  return rows[0].id;
}
async function updateTeacherFeedback(id, userId, updates) {
  const fields = [];
  const args = [];
  if (updates.teacherName !== void 0) {
    fields.push("teacher_name = ?");
    args.push(updates.teacherName);
  }
  if (updates.subject !== void 0) {
    fields.push("subject = ?");
    args.push(updates.subject);
  }
  if (updates.feedbackDate !== void 0) {
    fields.push("feedback_date = ?");
    args.push(updates.feedbackDate);
  }
  if (updates.content !== void 0) {
    fields.push("content = ?");
    args.push(updates.content);
  }
  if (updates.tags !== void 0) {
    fields.push("tags = ?");
    args.push(updates.tags ? JSON.stringify(updates.tags) : null);
  }
  if (updates.source !== void 0) {
    fields.push("source = ?");
    args.push(updates.source);
  }
  if (updates.extracted !== void 0) {
    fields.push("extracted = ?");
    args.push(updates.extracted ? 1 : 0);
  }
  if (fields.length === 0) return;
  fields.push("updated_at = NOW()");
  args.push(id, userId);
  const [query, params] = p(`UPDATE teacher_feedbacks SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await sql(query, params);
}
async function deleteTeacherFeedback(id, userId) {
  await sql`DELETE FROM teacher_feedbacks WHERE id = ${id} AND user_id = ${userId}`;
}
async function markTeacherFeedbackExtracted(id, userId) {
  await sql`UPDATE teacher_feedbacks SET extracted = 1, updated_at = NOW() WHERE id = ${id} AND user_id = ${userId}`;
}
function mapContactFeedbackRow(row) {
  return {
    id: row.id,
    contactId: row.contact_id,
    familyMemberId: row.family_member_id,
    userId: row.user_id,
    subject: row.subject || null,
    feedbackDate: row.feedback_date,
    content: row.content,
    tags: safeJsonParse(row.tags, null),
    source: row.source || null,
    extracted: row.extracted === 1,
    extractedIssues: safeJsonParse(row.extracted_issues, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function getContactFeedbacks(contactId, familyMemberId, userId) {
  const rows = await sql`SELECT * FROM contact_feedbacks WHERE contact_id = ${contactId} AND family_member_id = ${familyMemberId} AND user_id = ${userId} ORDER BY feedback_date DESC, created_at DESC`;
  return rows.map(mapContactFeedbackRow);
}
async function getContactFeedback(id, userId) {
  const rows = await sql`SELECT * FROM contact_feedbacks WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  return mapContactFeedbackRow(rows[0]);
}
async function createContactFeedback(params) {
  const rows = await sql`
    INSERT INTO contact_feedbacks (contact_id, family_member_id, user_id, subject, feedback_date, content, tags, source, extracted, created_at, updated_at)
    VALUES (${params.contactId}, ${params.familyMemberId}, ${params.userId}, ${params.subject ?? null}, ${params.feedbackDate}, ${params.content}, ${params.tags ? JSON.stringify(params.tags) : null}, ${params.source ?? null}, 0, NOW(), NOW())
    RETURNING id`;
  return rows[0].id;
}
async function updateContactFeedback(id, userId, updates) {
  const fields = [];
  const args = [];
  if (updates.subject !== void 0) {
    fields.push("subject = ?");
    args.push(updates.subject);
  }
  if (updates.feedbackDate !== void 0) {
    fields.push("feedback_date = ?");
    args.push(updates.feedbackDate);
  }
  if (updates.content !== void 0) {
    fields.push("content = ?");
    args.push(updates.content);
  }
  if (updates.tags !== void 0) {
    fields.push("tags = ?");
    args.push(updates.tags ? JSON.stringify(updates.tags) : null);
  }
  if (updates.source !== void 0) {
    fields.push("source = ?");
    args.push(updates.source);
  }
  if (updates.extracted !== void 0) {
    fields.push("extracted = ?");
    args.push(updates.extracted ? 1 : 0);
  }
  if (fields.length === 0) return;
  fields.push("updated_at = NOW()");
  args.push(id, userId);
  const [query, params] = p(`UPDATE contact_feedbacks SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await sql(query, params);
}
async function deleteContactFeedback(id, userId) {
  await sql`DELETE FROM contact_feedbacks WHERE id = ${id} AND user_id = ${userId}`;
}
async function saveExtractedIssues(id, userId, issues) {
  await sql`UPDATE contact_feedbacks SET extracted_issues = ${JSON.stringify(issues)}, extracted = 1, updated_at = NOW() WHERE id = ${id} AND user_id = ${userId}`;
}
function mapIssueRow(row) {
  return {
    id: row.id,
    feedbackId: row.feedback_id,
    journalEntryId: row.journal_entry_id ?? null,
    familyMemberId: row.family_member_id,
    relatedFamilyMemberId: row.related_family_member_id ?? null,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    severity: row.severity,
    recommendations: safeJsonParse(row.recommendations, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function getAllIssues(userId) {
  const rows = await sql`SELECT * FROM issues WHERE user_id = ${userId} ORDER BY updated_at DESC`;
  return rows.map((r) => mapIssueRow(r));
}
async function getIssuesForFamilyMember(familyMemberId, feedbackId, userId) {
  let sqlStr = `SELECT * FROM issues WHERE family_member_id = ?`;
  const args = [familyMemberId];
  if (feedbackId !== void 0) {
    sqlStr += ` AND feedback_id = ?`;
    args.push(feedbackId);
  }
  if (userId !== void 0) {
    sqlStr += ` AND user_id = ?`;
    args.push(userId);
  }
  sqlStr += ` ORDER BY created_at DESC`;
  const [query, params] = p(sqlStr, args);
  const rows = await sql(query, params);
  return rows.map((r) => mapIssueRow(r));
}
async function getIssue(id, userId) {
  const rows = await sql`SELECT * FROM issues WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  return mapIssueRow(rows[0]);
}
async function createIssue(params) {
  const rows = await sql`
    INSERT INTO issues (feedback_id, journal_entry_id, family_member_id, user_id, title, description, category, severity, recommendations, created_at, updated_at)
    VALUES (${params.feedbackId ?? null}, ${params.journalEntryId ?? null}, ${params.familyMemberId}, ${params.userId}, ${params.title}, ${params.description}, ${params.category}, ${params.severity}, ${params.recommendations ? JSON.stringify(params.recommendations) : null}, NOW(), NOW())
    RETURNING id`;
  return rows[0].id;
}
async function getIssueByJournalEntryId(journalEntryId, userId) {
  const rows = await sql`SELECT * FROM issues WHERE journal_entry_id = ${journalEntryId} AND user_id = ${userId} LIMIT 1`;
  if (rows.length === 0) return null;
  return mapIssueRow(rows[0]);
}
async function updateIssue(id, userId, updates) {
  const fields = [];
  const args = [];
  if (updates.familyMemberId !== void 0) {
    fields.push("family_member_id = ?");
    args.push(updates.familyMemberId);
  }
  if (updates.relatedFamilyMemberId !== void 0) {
    fields.push("related_family_member_id = ?");
    args.push(updates.relatedFamilyMemberId ?? null);
  }
  if (updates.title !== void 0) {
    fields.push("title = ?");
    args.push(updates.title);
  }
  if (updates.description !== void 0) {
    fields.push("description = ?");
    args.push(updates.description);
  }
  if (updates.category !== void 0) {
    fields.push("category = ?");
    args.push(updates.category);
  }
  if (updates.severity !== void 0) {
    fields.push("severity = ?");
    args.push(updates.severity);
  }
  if (updates.recommendations !== void 0) {
    fields.push("recommendations = ?");
    args.push(updates.recommendations ? JSON.stringify(updates.recommendations) : null);
  }
  if (fields.length === 0) return;
  fields.push("updated_at = NOW()");
  args.push(id, userId);
  const [query, params] = p(`UPDATE issues SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, args);
  await sql(query, params);
}
async function deleteIssue(id, userId) {
  await sql`DELETE FROM issues WHERE id = ${id} AND user_id = ${userId}`;
}
async function saveIssuesToTable(feedbackId, familyMemberId, userId, issues) {
  const issueIds = [];
  await sql`DELETE FROM issues WHERE feedback_id = ${feedbackId} AND user_id = ${userId}`;
  for (const issue of issues) {
    const issueData = issue;
    const newId = await createIssue({
      feedbackId,
      familyMemberId,
      userId,
      title: issueData.title,
      description: issueData.description,
      category: issueData.category,
      severity: issueData.severity,
      recommendations: issueData.recommendations || null
    });
    issueIds.push(newId);
  }
  return issueIds;
}
async function linkIssues(issueId, linkedIssueId, userId, linkType = "related") {
  const existing = await sql`
    SELECT id FROM issue_links
    WHERE user_id = ${userId}
      AND ((issue_id = ${issueId} AND linked_issue_id = ${linkedIssueId})
        OR (issue_id = ${linkedIssueId} AND linked_issue_id = ${issueId}))
    LIMIT 1`;
  if (existing.length > 0) return existing[0].id;
  const rows = await sql`
    INSERT INTO issue_links (issue_id, linked_issue_id, link_type, user_id, created_at)
    VALUES (${issueId}, ${linkedIssueId}, ${linkType}, ${userId}, NOW())
    RETURNING id`;
  return rows[0].id;
}
async function unlinkIssues(issueId, linkedIssueId, userId) {
  await sql`
    DELETE FROM issue_links
    WHERE user_id = ${userId}
      AND ((issue_id = ${issueId} AND linked_issue_id = ${linkedIssueId})
        OR (issue_id = ${linkedIssueId} AND linked_issue_id = ${issueId}))`;
}
async function getLinkedIssues(issueId, userId) {
  const rows = await sql`
    SELECT il.id as link_id, il.link_type,
           i.*
    FROM issue_links il
    JOIN issues i ON (
      CASE WHEN il.issue_id = ${issueId} THEN il.linked_issue_id ELSE il.issue_id END
    ) = i.id
    WHERE il.user_id = ${userId}
      AND (il.issue_id = ${issueId} OR il.linked_issue_id = ${issueId})
    ORDER BY il.created_at DESC`;
  return rows.map((r) => ({
    linkId: r.link_id,
    linkType: r.link_type,
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
      updated_at: r.updated_at
    })
  }));
}
async function getScreenshotsForIssue(issueId, userId) {
  const rows = await sql`
    SELECT * FROM issue_screenshots
    WHERE issue_id = ${issueId} AND user_id = ${userId}
    ORDER BY created_at DESC`;
  return rows.map((row) => ({
    id: row.id,
    issueId: row.issue_id,
    userId: row.user_id,
    r2Key: row.r2_key,
    url: row.url,
    filename: row.filename,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    caption: row.caption || null,
    createdAt: row.created_at
  }));
}
async function addIssueScreenshot(params) {
  const rows = await sql`
    INSERT INTO issue_screenshots (issue_id, user_id, r2_key, url, filename, content_type, size_bytes, caption, created_at)
    VALUES (${params.issueId}, ${params.userId}, ${params.r2Key}, ${params.url}, ${params.filename}, ${params.contentType}, ${params.sizeBytes}, ${params.caption ?? null}, NOW())
    RETURNING *`;
  const row = rows[0];
  return {
    id: row.id,
    issueId: row.issue_id,
    userId: row.user_id,
    r2Key: row.r2_key,
    url: row.url,
    filename: row.filename,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    caption: row.caption || null,
    createdAt: row.created_at
  };
}
async function deleteIssueScreenshot(id, userId) {
  const rows = await sql`
    DELETE FROM issue_screenshots
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING r2_key`;
  if (rows.length === 0) return null;
  return rows[0].r2_key;
}
async function getGoalById(goalId) {
  const rows = await sql`SELECT * FROM goals WHERE id = ${goalId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    familyMemberId: row.family_member_id,
    createdBy: row.user_id,
    slug: row.slug || null,
    title: row.title,
    description: row.description || null,
    status: row.status,
    parentGoalId: row.parent_goal_id || null,
    therapeuticText: row.therapeutic_text || null,
    therapeuticTextLanguage: row.therapeutic_text_language || null,
    therapeuticTextGeneratedAt: row.therapeutic_text_generated_at || null,
    storyLanguage: row.story_language || null,
    parentAdvice: row.parent_advice || null,
    parentAdviceLanguage: row.parent_advice_language || null,
    parentAdviceGeneratedAt: row.parent_advice_generated_at || null,
    tags: safeJsonParse(row.tags, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function deleteNote(noteId, userEmail) {
  await sql`DELETE FROM notes_claims WHERE note_id = ${noteId}`;
  await sql`DELETE FROM notes_research WHERE note_id = ${noteId}`;
  await sql`DELETE FROM notes WHERE id = ${noteId} AND user_id = ${userEmail}`;
}
async function deleteGoal(goalId, userEmail) {
  await sql`DELETE FROM notes_claims WHERE note_id IN (SELECT id FROM notes WHERE entity_id = ${goalId} AND entity_type = 'Goal')`;
  await sql`DELETE FROM notes_research WHERE note_id IN (SELECT id FROM notes WHERE entity_id = ${goalId} AND entity_type = 'Goal')`;
  await sql`DELETE FROM notes WHERE entity_id = ${goalId} AND entity_type = 'Goal' AND user_id = ${userEmail}`;
  await sql`DELETE FROM therapeutic_questions WHERE goal_id = ${goalId}`;
  await sql`DELETE FROM recommended_books WHERE goal_id = ${goalId}`;
  await sql`DELETE FROM therapy_research WHERE goal_id = ${goalId}`;
  await sql`DELETE FROM text_segments WHERE goal_id = ${goalId}`;
  await sql`DELETE FROM audio_assets WHERE goal_id = ${goalId}`;
  await sql`DELETE FROM stories WHERE goal_id = ${goalId}`;
  await sql`DELETE FROM generation_jobs WHERE goal_id = ${goalId}`;
  await sql`DELETE FROM goals WHERE id = ${goalId} AND user_id = ${userEmail}`;
}
function mapDeepIssueAnalysisRow(row) {
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
    updatedAt: row.updated_at
  };
}
async function createDeepIssueAnalysis(params) {
  const rows = await sql`
    INSERT INTO deep_issue_analyses (family_member_id, trigger_issue_id, user_id, job_id, summary, pattern_clusters, timeline_analysis, family_system_insights, priority_recommendations, research_relevance, parent_advice, data_snapshot, model, created_at, updated_at)
    VALUES (${params.familyMemberId}, ${params.triggerIssueId ?? null}, ${params.userId}, ${params.jobId ?? null}, ${params.summary}, ${JSON.stringify(params.patternClusters)}, ${JSON.stringify(params.timelineAnalysis)}, ${JSON.stringify(params.familySystemInsights)}, ${JSON.stringify(params.priorityRecommendations)}, ${JSON.stringify(params.researchRelevance)}, ${JSON.stringify(params.parentAdvice)}, ${JSON.stringify(params.dataSnapshot)}, ${params.model ?? "deepseek-chat"}, NOW(), NOW())
    RETURNING id`;
  return rows[0].id;
}
async function getDeepIssueAnalysis(id, userId) {
  const rows = await sql`SELECT * FROM deep_issue_analyses WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  return mapDeepIssueAnalysisRow(rows[0]);
}
async function getDeepIssueAnalysesForFamilyMember(familyMemberId, userId) {
  const rows = await sql`SELECT * FROM deep_issue_analyses WHERE family_member_id = ${familyMemberId} AND user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map((r) => mapDeepIssueAnalysisRow(r));
}
async function deleteDeepIssueAnalysis(id, userId) {
  await sql`DELETE FROM deep_issue_analyses WHERE id = ${id} AND user_id = ${userId}`;
}
async function getContactFeedbacksForFamilyMember(familyMemberId, userId) {
  const rows = await sql`SELECT * FROM contact_feedbacks WHERE family_member_id = ${familyMemberId} AND user_id = ${userId} ORDER BY feedback_date DESC, created_at DESC`;
  return rows.map(mapContactFeedbackRow);
}
async function getIssuesReferencingFamilyMember(familyMemberId, userId) {
  const rows = await sql`SELECT * FROM issues WHERE related_family_member_id = ${familyMemberId} AND user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map((r) => mapIssueRow(r));
}
async function getResearchForFamilyMemberIssues(issueIds) {
  if (issueIds.length === 0) return [];
  const placeholders = issueIds.map(() => "?").join(",");
  const sqlStr = `SELECT * FROM therapy_research WHERE issue_id IN (${placeholders}) ORDER BY relevance_score DESC`;
  const [query, params] = p(sqlStr, issueIds);
  const rows = await sql(query, params);
  return rows.map((row) => ({
    id: row.id,
    goalId: row.goal_id || null,
    issueId: row.issue_id || null,
    title: row.title,
    keyFindings: safeJsonParse(row.key_findings, []),
    therapeuticTechniques: safeJsonParse(row.therapeutic_techniques, []),
    evidenceLevel: row.evidence_level || null
  }));
}
async function listHabits(userId, status, familyMemberId) {
  const rows = await sql`SELECT * FROM habits WHERE user_id = ${userId} ORDER BY created_at DESC`;
  let all = rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id || null,
    familyMemberId: row.family_member_id || null,
    issueId: row.issue_id || null,
    title: row.title,
    description: row.description || null,
    frequency: row.frequency,
    targetCount: row.target_count,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
  if (status) all = all.filter((h) => h.status === status);
  if (familyMemberId) all = all.filter((h) => h.familyMemberId === familyMemberId);
  return all;
}
async function getHabit(id, userId) {
  const rows = await sql`SELECT * FROM habits WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id || null,
    familyMemberId: row.family_member_id || null,
    issueId: row.issue_id || null,
    title: row.title,
    description: row.description || null,
    frequency: row.frequency,
    targetCount: row.target_count,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function createHabit(input) {
  const rows = await sql`
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
  return rows[0].id;
}
async function updateHabit(id, userId, input) {
  await sql`
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
async function deleteHabit(id, userId) {
  await sql`DELETE FROM habits WHERE id = ${id} AND user_id = ${userId}`;
}
async function logHabit(input) {
  const rows = await sql`
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
  return rows[0].id;
}
async function deleteHabitLog(id, userId) {
  await sql`DELETE FROM habit_logs WHERE id = ${id} AND user_id = ${userId}`;
}
async function listHabitLogs(habitId, userId) {
  const rows = await sql`
    SELECT * FROM habit_logs WHERE habit_id = ${habitId} AND user_id = ${userId} ORDER BY logged_date DESC
  `;
  return rows.map((row) => ({
    id: row.id,
    habitId: row.habit_id,
    userId: row.user_id,
    loggedDate: row.logged_date,
    count: row.count,
    notes: row.notes || null,
    createdAt: row.created_at
  }));
}
async function getTodayLogForHabit(habitId, userId, today) {
  const rows = await sql`
    SELECT * FROM habit_logs WHERE habit_id = ${habitId} AND user_id = ${userId} AND logged_date = ${today}
  `;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    habitId: row.habit_id,
    userId: row.user_id,
    loggedDate: row.logged_date,
    count: row.count,
    notes: row.notes || null,
    createdAt: row.created_at
  };
}
async function getAllTags(userId) {
  const rows = await sql`
    SELECT DISTINCT tag FROM (
      SELECT jsonb_array_elements_text(tags::jsonb) AS tag FROM journal_entries WHERE user_id = ${userId} AND tags IS NOT NULL AND tags != '[]'
      UNION
      SELECT jsonb_array_elements_text(tags::jsonb) AS tag FROM goals WHERE user_id = ${userId} AND tags IS NOT NULL AND tags != '[]'
    ) t ORDER BY tag
  `;
  return rows.map((r) => r.tag);
}
async function getJournalAnalysis(journalEntryId, userId) {
  const rows = await sql`SELECT * FROM journal_analyses WHERE journal_entry_id = ${journalEntryId} AND user_id = ${userId} ORDER BY created_at DESC LIMIT 1`;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    journalEntryId: r.journal_entry_id,
    userId: r.user_id,
    summary: r.summary,
    emotionalLandscape: safeJsonParse(r.emotional_landscape, {}),
    therapeuticInsights: safeJsonParse(r.therapeutic_insights, []),
    actionableRecommendations: safeJsonParse(r.actionable_recommendations, []),
    reflectionPrompts: safeJsonParse(r.reflection_prompts, []),
    model: r.model,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}
async function getJournalAnalysisPublic(journalEntryId) {
  const rows = await sql`SELECT * FROM journal_analyses WHERE journal_entry_id = ${journalEntryId} ORDER BY created_at DESC LIMIT 1`;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    journalEntryId: r.journal_entry_id,
    summary: r.summary,
    actionableRecommendations: safeJsonParse(r.actionable_recommendations, []),
    createdAt: r.created_at
  };
}
async function createJournalAnalysis(data) {
  const rows = await sql`
    INSERT INTO journal_analyses (journal_entry_id, user_id, summary, emotional_landscape, therapeutic_insights, actionable_recommendations, reflection_prompts, model)
    VALUES (${data.journalEntryId}, ${data.userId}, ${data.summary}, ${JSON.stringify(data.emotionalLandscape)}, ${JSON.stringify(data.therapeuticInsights)}, ${JSON.stringify(data.actionableRecommendations)}, ${JSON.stringify(data.reflectionPrompts)}, ${data.model ?? "deepseek-chat"})
    RETURNING id`;
  return rows[0].id;
}
async function deleteJournalAnalysis(journalEntryId, userId) {
  await sql`DELETE FROM journal_analyses WHERE journal_entry_id = ${journalEntryId} AND user_id = ${userId}`;
}
async function getDiscussionGuide(journalEntryId, userId) {
  const rows = await sql`SELECT * FROM discussion_guides WHERE journal_entry_id = ${journalEntryId} AND user_id = ${userId} ORDER BY created_at DESC LIMIT 1`;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    journalEntryId: r.journal_entry_id,
    userId: r.user_id,
    childAge: r.child_age || null,
    behaviorSummary: r.behavior_summary,
    developmentalContext: safeJsonParse(r.developmental_context, {}),
    conversationStarters: safeJsonParse(r.conversation_starters, []),
    talkingPoints: safeJsonParse(r.talking_points, []),
    languageGuide: safeJsonParse(r.language_guide, { whatToSay: [], whatNotToSay: [] }),
    anticipatedReactions: safeJsonParse(r.anticipated_reactions, []),
    followUpPlan: safeJsonParse(r.follow_up_plan, []),
    model: r.model,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}
async function getDiscussionGuidePublic(journalEntryId) {
  const rows = await sql`SELECT * FROM discussion_guides WHERE journal_entry_id = ${journalEntryId} ORDER BY created_at DESC LIMIT 1`;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    journalEntryId: r.journal_entry_id,
    childAge: r.child_age || null,
    behaviorSummary: r.behavior_summary,
    developmentalContext: safeJsonParse(r.developmental_context, {}),
    conversationStarters: safeJsonParse(r.conversation_starters, []),
    talkingPoints: safeJsonParse(r.talking_points, []),
    languageGuide: safeJsonParse(r.language_guide, { whatToSay: [], whatNotToSay: [] }),
    anticipatedReactions: safeJsonParse(r.anticipated_reactions, []),
    followUpPlan: safeJsonParse(r.follow_up_plan, []),
    model: r.model,
    createdAt: r.created_at
  };
}
async function getJournalEntryPublic(id) {
  const rows = await sql`SELECT je.title, fm.first_name, fm.name FROM journal_entries je LEFT JOIN family_members fm ON je.family_member_id = fm.id WHERE je.id = ${id}`;
  if (rows.length === 0) return null;
  return {
    title: rows[0].title || null,
    familyMemberFirstName: rows[0].first_name || null,
    familyMemberName: rows[0].name || null
  };
}
async function createDiscussionGuide(data) {
  const rows = await sql`
    INSERT INTO discussion_guides (journal_entry_id, user_id, child_age, behavior_summary, developmental_context, conversation_starters, talking_points, language_guide, anticipated_reactions, follow_up_plan, model)
    VALUES (${data.journalEntryId}, ${data.userId}, ${data.childAge ?? null}, ${data.behaviorSummary}, ${JSON.stringify(data.developmentalContext)}, ${JSON.stringify(data.conversationStarters)}, ${JSON.stringify(data.talkingPoints)}, ${JSON.stringify(data.languageGuide)}, ${JSON.stringify(data.anticipatedReactions)}, ${JSON.stringify(data.followUpPlan)}, ${data.model ?? "deepseek-chat"})
    RETURNING id`;
  return rows[0].id;
}
async function deleteDiscussionGuide(journalEntryId, userId) {
  await sql`DELETE FROM discussion_guides WHERE journal_entry_id = ${journalEntryId} AND user_id = ${userId}`;
}
async function createConversation({
  issueId,
  userId,
  title
}) {
  const rows = await sql`
    INSERT INTO conversations (issue_id, user_id, title)
    VALUES (${issueId}, ${userId}, ${title ?? null})
    RETURNING id
  `;
  return rows[0].id;
}
async function getConversation(id, userId) {
  const rows = await sql`
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
    id: row.id,
    issueId: row.issue_id,
    userId: row.user_id,
    title: row.title || null,
    messages: row.messages.map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function listConversationsForIssue(issueId, userId) {
  const rows = await sql`
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
    id: row.id,
    issueId: row.issue_id,
    userId: row.user_id,
    title: row.title || null,
    messages: row.messages.map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function deleteConversation(id, userId) {
  await sql`DELETE FROM conversations WHERE id = ${id} AND user_id = ${userId}`;
}
async function addConversationMessage({
  conversationId,
  role,
  content
}) {
  const rows = await sql`
    INSERT INTO conversation_messages (conversation_id, role, content)
    VALUES (${conversationId}, ${role}, ${content})
    RETURNING id
  `;
  await sql`UPDATE conversations SET updated_at = NOW() WHERE id = ${conversationId}`;
  return rows[0].id;
}
async function listAffirmations(familyMemberId, userId) {
  const rows = await sql`SELECT * FROM affirmations WHERE family_member_id = ${familyMemberId} AND user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map((row) => ({
    id: row.id,
    familyMemberId: row.family_member_id,
    userId: row.user_id,
    text: row.text,
    category: row.category,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function getAffirmation(id, userId) {
  const rows = await sql`SELECT * FROM affirmations WHERE id = ${id} AND user_id = ${userId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    familyMemberId: row.family_member_id,
    userId: row.user_id,
    text: row.text,
    category: row.category,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function createAffirmation(input) {
  const rows = await sql`
    INSERT INTO affirmations (family_member_id, user_id, text, category)
    VALUES (
      ${input.familyMemberId},
      ${input.userId},
      ${input.text},
      ${input.category ?? "encouragement"}
    )
    RETURNING id
  `;
  return rows[0].id;
}
async function updateAffirmation(id, userId, input) {
  await sql`
    UPDATE affirmations SET
      text = COALESCE(${input.text ?? null}, text),
      category = COALESCE(${input.category ?? null}, category),
      is_active = COALESCE(${input.isActive != null ? input.isActive ? 1 : 0 : null}, is_active),
      updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
  `;
}
async function deleteAffirmation(id, userId) {
  await sql`DELETE FROM affirmations WHERE id = ${id} AND user_id = ${userId}`;
}
const db = {
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
  getJournalAnalysisPublic,
  createJournalAnalysis,
  deleteJournalAnalysis,
  // Discussion Guides
  getDiscussionGuide,
  getDiscussionGuidePublic,
  getJournalEntryPublic,
  createDiscussionGuide,
  deleteDiscussionGuide,
  // Conversations
  createConversation,
  getConversation,
  listConversationsForIssue,
  deleteConversation,
  addConversationMessage,
  // Affirmations
  listAffirmations,
  getAffirmation,
  createAffirmation,
  updateAffirmation,
  deleteAffirmation
};

const DEEPSEEK_API_BASE_URL = "https://api.deepseek.com";
const DEEPSEEK_MODELS = {
  CHAT: "deepseek-chat"};
class DeepSeekClient {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || "";
    if (!this.apiKey)
      throw new Error("DEEPSEEK_API_KEY environment variable is required");
    this.baseURL = DEEPSEEK_API_BASE_URL;
  }
  async chat(request) {
    const resp = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ ...request, stream: false })
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(
        body.error?.message || `DeepSeek HTTP ${resp.status}`
      );
    }
    return body;
  }
}
let _client = null;
function getDefaultClient() {
  if (!_client) _client = new DeepSeekClient();
  return _client;
}
createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1"
});
async function generateObject({
  schema,
  prompt,
  model = DEEPSEEK_MODELS.CHAT,
  temperature,
  max_tokens
}) {
  const response = await getDefaultClient().chat({
    model,
    messages: [
      { role: "system", content: "Respond with valid JSON." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature,
    max_tokens
  });
  if (!response.choices?.length) {
    throw new Error(`DeepSeek returned no choices: ${JSON.stringify(response).slice(0, 300)}`);
  }
  const content = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  return { object: schema.parse(parsed) };
}

const habitInputSchema = z.object({
  family_member_id: z.number().int().optional(),
  issue_id: z.number().int().optional(),
  user_email: z.string().email(),
  count: z.number().int().min(1).max(20).default(5)
});
const habitSchema = z.object({
  title: z.string().max(120),
  description: z.string().nullable().optional(),
  frequency: z.enum(["daily", "weekly"]).default("daily"),
  targetCount: z.number().int().min(1).max(10).default(1)
});
const habitOutputSchema = z.object({
  habits: z.array(
    habitSchema.extend({ id: z.number().int() })
  ),
  error: z.string().optional()
});
const collectedSchema = z.object({
  prompt: z.string(),
  resolvedFamilyMemberId: z.number().int().nullable(),
  issueId: z.number().int().nullable(),
  userEmail: z.string(),
  count: z.number().int(),
  error: z.string().optional()
});
const generatedSchema = collectedSchema.extend({
  habits: z.array(habitSchema)
});
const collectData = createStep({
  id: "collect_data",
  inputSchema: habitInputSchema,
  outputSchema: collectedSchema,
  execute: async ({ inputData }) => {
    const { user_email, count } = inputData;
    const issueId = inputData.issue_id ?? null;
    let resolvedFamilyMemberId = inputData.family_member_id ?? null;
    if (!issueId && !resolvedFamilyMemberId) {
      return {
        prompt: "",
        resolvedFamilyMemberId: null,
        issueId,
        userEmail: user_email,
        count,
        error: "Either issue_id or family_member_id is required"
      };
    }
    let focalIssueContext = "";
    if (issueId) {
      const issueRows = await sql`
        SELECT id, title, description, category, severity, recommendations, family_member_id
        FROM issues WHERE id = ${issueId} AND user_id = ${user_email}
      `;
      if (issueRows.length === 0) {
        return {
          prompt: "",
          resolvedFamilyMemberId: null,
          issueId,
          userEmail: user_email,
          count,
          error: `Issue ${issueId} not found`
        };
      }
      const issue = issueRows[0];
      if (!resolvedFamilyMemberId && issue.family_member_id) {
        resolvedFamilyMemberId = issue.family_member_id;
      }
      const recs = issue.recommendations ? JSON.parse(issue.recommendations) : [];
      const focalLines = [
        `Title: ${issue.title}`,
        `Category: ${issue.category}`,
        `Severity: ${issue.severity}`
      ];
      if (issue.description) {
        focalLines.push(`Description: ${issue.description.slice(0, 400)}`);
      }
      if (recs.length > 0) {
        focalLines.push("Existing recommendations:");
        for (const r of recs.slice(0, 5)) focalLines.push(`  - ${r}`);
      }
      const researchRows = await sql`
        SELECT title, key_findings, therapeutic_techniques FROM therapy_research
        WHERE issue_id = ${issueId} ORDER BY relevance_score DESC LIMIT 5
      `;
      if (researchRows.length > 0) {
        focalLines.push("Related research:");
        for (const r of researchRows) {
          focalLines.push(`  Paper: ${r.title}`);
          const kf = r.key_findings ? JSON.parse(r.key_findings) : [];
          if (kf.length > 0) focalLines.push(`    Key findings: ${kf.slice(0, 2).join("; ")}`);
          const tt = r.therapeutic_techniques ? JSON.parse(r.therapeutic_techniques) : [];
          if (tt.length > 0) focalLines.push(`    Techniques: ${tt.slice(0, 3).join("; ")}`);
        }
      }
      focalIssueContext = focalLines.join("\n");
    }
    let profileContext = "";
    let goalsContext = "";
    let otherIssuesContext = "";
    let charsContext = "";
    let existingHabits = [];
    if (resolvedFamilyMemberId) {
      const fmRows = await sql`
        SELECT first_name, age_years, date_of_birth, relationship, bio
        FROM family_members WHERE id = ${resolvedFamilyMemberId} AND user_id = ${user_email}
      `;
      if (fmRows.length > 0) {
        const fm = fmRows[0];
        const parts2 = [`Name: ${fm.first_name}`];
        if (fm.age_years) parts2.push(`Age: ${fm.age_years} years old`);
        if (fm.date_of_birth) parts2.push(`Date of birth: ${fm.date_of_birth}`);
        if (fm.relationship) parts2.push(`Relationship: ${fm.relationship}`);
        if (fm.bio) parts2.push(`Bio: ${fm.bio.slice(0, 200)}`);
        profileContext = parts2.join("\n");
      }
      const goalRows = await sql`
        SELECT title, description, priority FROM goals
        WHERE family_member_id = ${resolvedFamilyMemberId} AND user_id = ${user_email} AND status = 'active'
        ORDER BY created_at DESC LIMIT 6
      `;
      if (goalRows.length > 0) {
        goalsContext = goalRows.map((r) => {
          const head = `- [${String(r.priority).toUpperCase()}] ${r.title}`;
          return r.description ? `${head}: ${r.description.slice(0, 100)}` : head;
        }).join("\n");
      }
      const otherIssueRows = issueId ? await sql`
            SELECT title, category, severity FROM issues
            WHERE family_member_id = ${resolvedFamilyMemberId} AND user_id = ${user_email} AND id != ${issueId}
            ORDER BY created_at DESC LIMIT 8
          ` : await sql`
            SELECT title, category, severity FROM issues
            WHERE family_member_id = ${resolvedFamilyMemberId} AND user_id = ${user_email}
            ORDER BY created_at DESC LIMIT 8
          `;
      if (otherIssueRows.length > 0) {
        otherIssuesContext = otherIssueRows.map((r) => `- [${String(r.severity).toUpperCase()}] ${r.title} (${r.category})`).join("\n");
      }
      const charRows = await sql`
        SELECT title, category, severity FROM family_member_characteristics
        WHERE family_member_id = ${resolvedFamilyMemberId} AND user_id = ${user_email} LIMIT 8
      `;
      if (charRows.length > 0) {
        charsContext = charRows.map((r) => {
          const head = `- ${r.title} (${r.category})`;
          return r.severity ? `${head} \u2014 ${r.severity}` : head;
        }).join("\n");
      }
      const existingRows = await sql`
        SELECT title FROM habits
        WHERE family_member_id = ${resolvedFamilyMemberId} AND user_id = ${user_email} AND status = 'active'
      `;
      existingHabits = existingRows.map((r) => r.title);
    }
    const focusIntro = issueId && focalIssueContext ? `You are a therapeutic habit coach. Generate personalized, evidence-based habits specifically designed to address the following issue. Create exactly ${count} habits that directly target the root causes and symptoms of this issue.` : `You are a therapeutic habit coach. Generate personalized, evidence-based habits for the following person. Create exactly ${count} distinct habits tailored to their specific goals, issues, and characteristics.`;
    const directive = focalIssueContext ? "directly address the Target Issue above" : "address the person's goals and challenges";
    const parts = [focusIntro, ""];
    if (focalIssueContext) parts.push("## Target Issue (PRIMARY FOCUS)", focalIssueContext, "");
    if (profileContext) parts.push("## Person Profile", profileContext, "");
    if (goalsContext) parts.push("## Active Therapeutic Goals", goalsContext, "");
    if (otherIssuesContext) parts.push("## Other Known Issues (context only)", otherIssuesContext, "");
    if (charsContext) parts.push("## Characteristics", charsContext, "");
    if (existingHabits.length > 0) {
      parts.push(
        "## Already Tracking (do NOT suggest these again)",
        existingHabits.map((h) => `- ${h}`).join("\n"),
        ""
      );
    }
    parts.push(
      "## Instructions",
      `Generate exactly ${count} habit suggestions that:`,
      `- ${directive}`,
      "- Are age-appropriate and realistic",
      "- Mix daily (most) and weekly habits",
      "- Have a target count of 1 unless repetition clearly helps (e.g. breathing exercises \xD73)",
      "- Are specific and actionable (not vague like 'be more positive')",
      "- Do NOT duplicate any existing habits listed above",
      "",
      "Respond with a JSON object:",
      '{"habits": [',
      '  {"title": "...", "description": "...", "frequency": "daily" or "weekly", "targetCount": 1-5}',
      "]}",
      "",
      "Keep titles concise (3-6 words). Descriptions explain the therapeutic benefit (1-2 sentences)."
    );
    return {
      prompt: parts.join("\n"),
      resolvedFamilyMemberId,
      issueId,
      userEmail: user_email,
      count
    };
  }
});
const generate = createStep({
  id: "generate",
  inputSchema: collectedSchema,
  outputSchema: generatedSchema,
  execute: async ({ inputData }) => {
    if (inputData.error) return { ...inputData, habits: [] };
    const { object } = await generateObject({
      schema: z.object({ habits: z.array(habitSchema) }),
      prompt: inputData.prompt,
      temperature: 0.7,
      max_tokens: 2048
    });
    const normalised = object.habits.filter((h) => h && h.title).slice(0, inputData.count).map((h) => {
      const freq = h.frequency === "weekly" ? "weekly" : "daily";
      return {
        title: h.title.slice(0, 120),
        description: h.description ? h.description.slice(0, 400) : null,
        frequency: freq,
        targetCount: Math.max(1, Math.min(h.targetCount ?? 1, 10))
      };
    });
    if (normalised.length === 0) {
      return { ...inputData, habits: [], error: "No valid habits in DeepSeek response" };
    }
    return { ...inputData, habits: normalised };
  }
});
const persist = createStep({
  id: "persist",
  inputSchema: generatedSchema,
  outputSchema: habitOutputSchema,
  execute: async ({ inputData }) => {
    if (inputData.error || inputData.habits.length === 0) {
      return { habits: [], error: inputData.error };
    }
    const inserted = [];
    for (const h of inputData.habits) {
      const id = await createHabit({
        userId: inputData.userEmail,
        familyMemberId: inputData.resolvedFamilyMemberId ?? null,
        issueId: inputData.issueId ?? null,
        title: h.title,
        description: h.description ?? null,
        frequency: h.frequency,
        targetCount: h.targetCount
      });
      inserted.push({ ...h, id });
    }
    return { habits: inserted };
  }
});
const habitsWorkflow = createWorkflow({
  id: "habits",
  inputSchema: habitInputSchema,
  outputSchema: habitOutputSchema
}).then(collectData).then(generate).then(persist).commit();

const PORTED_WORKFLOWS = {
  habits: habitsWorkflow
};
const mastra = new Mastra({
  workflows: PORTED_WORKFLOWS,
  deployer: new CloudflareDeployer({
    name: "research-thera-mastra",
    vars: { NODE_ENV: "production" }
  }),
  server: {
    apiRoutes: [
      {
        path: "/runs/wait",
        method: "POST",
        handler: async (c) => {
          const body = await c.req.json();
          const assistantId = body.assistant_id;
          if (!assistantId) {
            return c.json({ error: "assistant_id required" }, 400);
          }
          if (!(assistantId in PORTED_WORKFLOWS)) {
            const fallback = process.env.LANGGRAPH_FALLBACK_URL;
            if (!fallback) {
              return c.json(
                { error: `workflow "${assistantId}" not ported and no LANGGRAPH_FALLBACK_URL set` },
                404
              );
            }
            const resp = await fetch(`${fallback}/runs/wait`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body)
            });
            return new Response(resp.body, {
              status: resp.status,
              headers: resp.headers
            });
          }
          const workflow = PORTED_WORKFLOWS[assistantId];
          const run = await workflow.createRun();
          const result = await run.start({ inputData: body.input ?? {} });
          if (result.status === "success") {
            return c.json(result.result);
          }
          return c.json(
            { error: `workflow ${assistantId} finished with status ${result.status}`, details: result },
            500
          );
        }
      }
    ]
  }
});

export { db as d, generateObject as g, mastra as m, sql as s };
