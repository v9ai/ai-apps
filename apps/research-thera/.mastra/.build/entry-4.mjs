import { neon } from '@neondatabase/serverless';
import OpenAI from 'openai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import crypto from 'crypto';

"use strict";
const sql = neon(process.env.NEON_DATABASE_URL);

"use strict";
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

"use strict";
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
async function getFamilyMemberShares(familyMemberId) {
  const rows = await sql`SELECT * FROM family_member_shares WHERE family_member_id = ${familyMemberId} ORDER BY created_at DESC`;
  return rows.map((row) => ({
    familyMemberId: row.family_member_id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    createdBy: row.created_by
  }));
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
async function deleteTherapyResearch(goalId) {
  const countRows = await sql`SELECT COUNT(*) as cnt FROM therapy_research WHERE goal_id = ${goalId}`;
  const count = Number(countRows[0]?.cnt ?? 0);
  await sql`DELETE FROM notes_research WHERE research_id IN (SELECT id FROM therapy_research WHERE goal_id = ${goalId})`;
  await sql`DELETE FROM therapy_research WHERE goal_id = ${goalId}`;
  return count;
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
  return getNoteById(noteId, userId);
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
async function getNoteShares(noteId) {
  const rows = await sql`SELECT * FROM note_shares WHERE note_id = ${noteId} ORDER BY created_at DESC`;
  return rows.map((row) => ({
    noteId: row.note_id,
    email: row.email,
    role: row.role,
    createdBy: row.created_by,
    createdAt: row.created_at
  }));
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
async function listTherapeuticQuestions(goalId, issueId, journalEntryId) {
  const rows = journalEntryId ? await sql`SELECT * FROM therapeutic_questions WHERE journal_entry_id = ${journalEntryId} ORDER BY created_at DESC` : issueId ? await sql`SELECT * FROM therapeutic_questions WHERE issue_id = ${issueId} ORDER BY created_at DESC` : goalId ? await sql`SELECT * FROM therapeutic_questions WHERE goal_id = ${goalId} ORDER BY created_at DESC` : [];
  return rows.map((row) => ({
    id: row.id,
    goalId: row.goal_id || null,
    issueId: row.issue_id || null,
    journalEntryId: row.journal_entry_id || null,
    question: row.question,
    researchId: row.research_id || null,
    researchTitle: row.research_title || null,
    rationale: row.rationale,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function insertTherapeuticQuestions(questions) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const inserted = [];
  for (const q of questions) {
    const rows = await sql`
      INSERT INTO therapeutic_questions (goal_id, issue_id, journal_entry_id, question, research_id, research_title, rationale, generated_at, created_at, updated_at)
      VALUES (${q.goalId ?? null}, ${q.issueId ?? null}, ${q.journalEntryId ?? null}, ${q.question}, ${q.researchId ?? null}, ${q.researchTitle ?? null}, ${q.rationale}, ${now}, ${now}, ${now})
      RETURNING *
    `;
    if (rows[0]) inserted.push(rows[0]);
  }
  return inserted.map((row) => ({
    id: row.id,
    goalId: row.goal_id || null,
    issueId: row.issue_id || null,
    journalEntryId: row.journal_entry_id || null,
    question: row.question,
    researchId: row.research_id || null,
    researchTitle: row.research_title || null,
    rationale: row.rationale,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function deleteTherapeuticQuestions(goalId, issueId, journalEntryId) {
  if (journalEntryId) {
    const rows = await sql`DELETE FROM therapeutic_questions WHERE journal_entry_id = ${journalEntryId} RETURNING id`;
    return rows.length;
  }
  if (issueId) {
    const rows = await sql`DELETE FROM therapeutic_questions WHERE issue_id = ${issueId} RETURNING id`;
    return rows.length;
  }
  if (goalId) {
    const rows = await sql`DELETE FROM therapeutic_questions WHERE goal_id = ${goalId} RETURNING id`;
    return rows.length;
  }
  return 0;
}
async function listRecommendedBooks(goalId) {
  const rows = await sql`
    SELECT * FROM recommended_books WHERE goal_id = ${goalId} ORDER BY created_at DESC
  `;
  return rows.map((row) => ({
    id: row.id,
    goalId: row.goal_id || null,
    title: row.title,
    authors: JSON.parse(row.authors || "[]"),
    year: row.year || null,
    isbn: row.isbn || null,
    description: row.description,
    whyRecommended: row.why_recommended,
    category: row.category,
    amazonUrl: row.amazon_url || null,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function insertRecommendedBooks(books) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const inserted = [];
  for (const b of books) {
    const authorsJson = JSON.stringify(b.authors);
    const rows = await sql`
      INSERT INTO recommended_books (goal_id, title, authors, year, isbn, description, why_recommended, category, amazon_url, generated_at, created_at, updated_at)
      VALUES (${b.goalId ?? null}, ${b.title}, ${authorsJson}, ${b.year ?? null}, ${b.isbn ?? null}, ${b.description}, ${b.whyRecommended}, ${b.category}, ${b.amazonUrl ?? null}, ${now}, ${now}, ${now})
      RETURNING *
    `;
    if (rows[0]) inserted.push(rows[0]);
  }
  return inserted.map((row) => ({
    id: row.id,
    goalId: row.goal_id || null,
    title: row.title,
    authors: JSON.parse(row.authors || "[]"),
    year: row.year || null,
    isbn: row.isbn || null,
    description: row.description,
    whyRecommended: row.why_recommended,
    category: row.category,
    amazonUrl: row.amazon_url || null,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function deleteRecommendedBooks(goalId) {
  const rows = await sql`DELETE FROM recommended_books WHERE goal_id = ${goalId} RETURNING id`;
  return rows.length;
}
async function getTextSegmentsForStory(storyId) {
  const rows = await sql`SELECT * FROM text_segments WHERE story_id = ${storyId} ORDER BY idx ASC`;
  return rows.map((row) => ({
    id: row.id,
    goalId: row.goal_id,
    storyId: row.story_id || null,
    idx: row.idx,
    text: row.text,
    createdAt: row.created_at
  }));
}
async function getAudioAssetsForStory(storyId) {
  const rows = await sql`SELECT * FROM audio_assets WHERE story_id = ${storyId} ORDER BY created_at DESC`;
  return rows.map((row) => ({
    id: row.id,
    createdBy: row.user_id,
    goalId: row.goal_id,
    storyId: row.story_id || null,
    language: row.language,
    voice: row.voice,
    mimeType: row.mime_type,
    manifest: safeJsonParse(row.manifest, { segmentCount: 0, segments: [] }),
    createdAt: row.created_at
  }));
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
function sanitizeInt(val) {
  if (val === void 0 || val === null || isNaN(val) || !isFinite(val))
    return null;
  return val;
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
async function getRelationshipsBidirectional(subjectType, subjectId, userId) {
  const rows = await sql`
    SELECT * FROM relationships
    WHERE user_id = ${userId} AND (
      (subject_type = ${subjectType} AND subject_id = ${subjectId}) OR
      (related_type = ${subjectType} AND related_id = ${subjectId})
    )
    ORDER BY created_at DESC`;
  return rows.map((row) => ({
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
async function getContactsForIssue(issueId, userId) {
  const rows = await sql`
    SELECT c.*
    FROM issue_contacts ic
    JOIN contacts c ON ic.contact_id = c.id
    WHERE ic.issue_id = ${issueId} AND ic.user_id = ${userId}
    ORDER BY ic.created_at DESC`;
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
async function linkContactToIssue(issueId, contactId, userId) {
  const existing = await sql`
    SELECT id FROM issue_contacts
    WHERE issue_id = ${issueId} AND contact_id = ${contactId} AND user_id = ${userId}
    LIMIT 1`;
  if (existing.length > 0) return existing[0].id;
  const rows = await sql`
    INSERT INTO issue_contacts (issue_id, contact_id, user_id, created_at)
    VALUES (${issueId}, ${contactId}, ${userId}, NOW())
    RETURNING id`;
  return rows[0].id;
}
async function unlinkContactFromIssue(issueId, contactId, userId) {
  await sql`
    DELETE FROM issue_contacts
    WHERE issue_id = ${issueId} AND contact_id = ${contactId} AND user_id = ${userId}`;
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

"use strict";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
async function embed(text) {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return res.data[0].embedding;
}
async function upsertResearchChunks(params) {
  const content = [
    params.title,
    params.abstract ?? "",
    ...params.keyFindings ?? [],
    ...params.techniques ?? []
  ].filter(Boolean).join("\n");
  console.log(
    `[RAG] Upserting ${params.entityType} ${params.entityId}: ${params.title}`
  );
  const embedding = await embed(content);
  const metadata = {
    keyFindings: params.keyFindings ?? [],
    techniques: params.techniques ?? []
  };
  await sql(
    `INSERT INTO research_embeddings (goal_id, entity_type, entity_id, title, content, embedding, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (entity_type, entity_id) DO UPDATE
       SET title = EXCLUDED.title,
           content = EXCLUDED.content,
           embedding = EXCLUDED.embedding,
           metadata = EXCLUDED.metadata,
           goal_id = EXCLUDED.goal_id`,
    [
      params.goalId ?? null,
      params.entityType,
      params.entityId,
      params.title,
      content,
      JSON.stringify(embedding),
      JSON.stringify(metadata)
    ]
  );
  return embedding.length;
}
async function retrieveGoalContext(goalId, query, topK = 10) {
  console.log(`[RAG] Querying goal ${goalId} context with: ${query}`);
  const queryEmbedding = await embed(query);
  const rows = await sql(
    `SELECT entity_type, entity_id, title, content, metadata,
            1 - (embedding <-> $1) AS similarity
     FROM research_embeddings
     WHERE goal_id = $2
     ORDER BY embedding <-> $1
     LIMIT $3`,
    [JSON.stringify(queryEmbedding), goalId, topK]
  );
  return rows;
}
async function upsertGoalChunks(params) {
  const content = [params.title, params.description ?? ""].filter(Boolean).join("\n");
  console.log(`[RAG] Upserting goal ${params.goalId} chunks`);
  const embedding = await embed(content);
  await sql(
    `INSERT INTO research_embeddings (goal_id, entity_type, entity_id, title, content, embedding, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (entity_type, entity_id) DO UPDATE
       SET title = EXCLUDED.title,
           content = EXCLUDED.content,
           embedding = EXCLUDED.embedding,
           goal_id = EXCLUDED.goal_id`,
    [
      params.goalId,
      "Goal",
      params.goalId,
      params.title,
      content,
      JSON.stringify(embedding),
      JSON.stringify({})
    ]
  );
}
async function upsertNoteChunks(params) {
  console.log(`[RAG] Upserting note ${params.noteId} chunks`);
  const embedding = await embed(params.content);
  await sql(
    `INSERT INTO research_embeddings (goal_id, entity_type, entity_id, title, content, embedding, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (entity_type, entity_id) DO UPDATE
       SET content = EXCLUDED.content,
           embedding = EXCLUDED.embedding,
           goal_id = EXCLUDED.goal_id`,
    [
      params.goalId,
      "Note",
      params.noteId,
      `Note ${params.noteId}`,
      params.content,
      JSON.stringify(embedding),
      JSON.stringify({})
    ]
  );
}
async function upsertQuestionChunks(params) {
  const content = `${params.question}
${params.rationale}`;
  console.log(`[RAG] Upserting question ${params.questionId} chunks`);
  const embedding = await embed(content);
  await sql(
    `INSERT INTO research_embeddings (goal_id, entity_type, entity_id, title, content, embedding, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (entity_type, entity_id) DO UPDATE
       SET title = EXCLUDED.title,
           content = EXCLUDED.content,
           embedding = EXCLUDED.embedding,
           goal_id = EXCLUDED.goal_id`,
    [
      params.goalId,
      "TherapeuticQuestion",
      params.questionId,
      params.question,
      content,
      JSON.stringify(embedding),
      JSON.stringify({})
    ]
  );
}
const ragTools = {
  upsertResearchChunks,
  retrieveGoalContext,
  upsertGoalChunks,
  upsertNoteChunks,
  upsertQuestionChunks
};

"use strict";
function normalizeDoi(doi) {
  if (!doi) return void 0;
  const d = doi.trim().toLowerCase();
  return d.replace(/^https?:\/\/(dx\.)?doi\.org\//, "").replace(/^doi:\s*/i, "").trim();
}
function stripJats(input) {
  if (!input) return void 0;
  const noTags = input.replace(/<\/?[^>]+>/g, " ");
  const decoded = noTags.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return decoded.replace(/\s+/g, " ").trim();
}
function titleFingerprint(title) {
  return title.toLowerCase().replace(/[\u2010-\u2015]/g, "-").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter((t) => t.length > 2).filter(
    (t) => ![
      "the",
      "and",
      "for",
      "with",
      "from",
      "into",
      "over",
      "under",
      "after",
      "before"
    ].includes(t)
  ).sort().join(" ");
}
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const waitMs = retryAfter ? parseInt(retryAfter) * 1e3 : Math.min(1e3 * Math.pow(2, attempt), 1e4);
        console.log(
          `Rate limited (429). Waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        const waitMs = Math.min(1e3 * Math.pow(2, attempt), 1e4);
        console.log(
          `Fetch error. Waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }
  throw lastError || new Error("Max retries exceeded");
}
function scoreCandidate(c, target) {
  let score = 0;
  const cTitle = (c.title || "").trim();
  const tTitle = (target.title || "").trim();
  if (!cTitle || !tTitle) return -1;
  const fpC = titleFingerprint(cTitle);
  const fpT = titleFingerprint(tTitle);
  const setC = new Set(fpC.split(" ").filter(Boolean));
  const setT = new Set(fpT.split(" ").filter(Boolean));
  let overlap = 0;
  for (const tok of setT) if (setC.has(tok)) overlap++;
  const denom = Math.max(1, setT.size);
  const overlapRatio = overlap / denom;
  score += overlapRatio * 70;
  if (target.year && c.year) {
    const diff = Math.abs(target.year - c.year);
    score += diff === 0 ? 15 : diff === 1 ? 8 : diff <= 3 ? 2 : -5;
  }
  if (c.doi) score += 8;
  if (c.abstract && stripJats(c.abstract)?.length) score += 5;
  if (c.authors && c.authors.length > 0) score += 2;
  if (c.source === "openalex") score += 4;
  if (c.source === "semantic_scholar") score += 3;
  if (c.source === "crossref") score += 2;
  if (c.source === "europepmc") score += 1;
  if (c.source === "arxiv") score += 0;
  if (c.source === "datacite") score -= 1;
  if (c.source === "pubmed") score -= 1;
  if (c.citationCount !== void 0 && c.citationCount > 0) {
    score += Math.min(Math.log10(c.citationCount) * 2, 8);
  }
  if (c.influentialCitationCount !== void 0 && c.influentialCitationCount > 0) {
    score += Math.min(c.influentialCitationCount * 0.5, 4);
  }
  if (c.tldr) score += 2;
  return score;
}
function pickBestCandidate(candidates, target) {
  if (!candidates.length) return null;
  let best = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const s = scoreCandidate(c, target);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  if (bestScore < 35) return null;
  return best;
}
async function searchCrossref(query, limit = 10) {
  try {
    const url = new URL("https://api.crossref.org/works");
    url.searchParams.set("query", query);
    url.searchParams.set("rows", limit.toString());
    url.searchParams.set(
      "select",
      "DOI,title,author,published,container-title,abstract,URL,type"
    );
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "AI-Therapist/1.0 (mailto:research@example.com)"
      }
    });
    if (!response.ok) {
      console.error(`Crossref API error: ${response.status}`);
      return [];
    }
    const data = await response.json();
    const items = data.message?.items || [];
    return items.map((item) => ({
      title: Array.isArray(item.title) ? item.title[0] : item.title || "Untitled",
      doi: item.DOI,
      url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : void 0),
      year: item.published?.["date-parts"]?.[0]?.[0],
      source: "crossref",
      authors: item.author?.map((a) => `${a.given || ""} ${a.family || ""}`.trim()).filter(Boolean),
      abstract: item.abstract,
      journal: Array.isArray(item["container-title"]) ? item["container-title"][0] : item["container-title"],
      publicationType: item.type
    }));
  } catch (error) {
    console.error("Error searching Crossref:", error);
    return [];
  }
}
async function searchPubMed(query, limit = 10) {
  try {
    const searchUrl = new URL(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    );
    searchUrl.searchParams.set("db", "pubmed");
    searchUrl.searchParams.set("term", query);
    searchUrl.searchParams.set("retmax", limit.toString());
    searchUrl.searchParams.set("retmode", "json");
    const searchResponse = await fetchWithRetry(searchUrl.toString());
    if (!searchResponse.ok) {
      console.error(`PubMed search error: ${searchResponse.status}`);
      return [];
    }
    const searchData = await searchResponse.json();
    const idList = searchData.esearchresult?.idlist || [];
    if (idList.length === 0) {
      return [];
    }
    const summaryUrl = new URL(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
    );
    summaryUrl.searchParams.set("db", "pubmed");
    summaryUrl.searchParams.set("id", idList.join(","));
    summaryUrl.searchParams.set("retmode", "json");
    const summaryResponse = await fetchWithRetry(summaryUrl.toString());
    if (!summaryResponse.ok) {
      console.error(`PubMed summary error: ${summaryResponse.status}`);
      return [];
    }
    const summaryData = await summaryResponse.json();
    const results = summaryData.result;
    return idList.map((id) => {
      const paper = results[id];
      if (!paper) return null;
      return {
        title: paper.title || "Untitled",
        doi: paper.elocationid?.split(" ").find((id2) => id2.startsWith("doi:"))?.replace("doi:", ""),
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        year: parseInt(paper.pubdate?.split(" ")[0]),
        source: "pubmed",
        authors: paper.authors?.map((a) => a.name) || [],
        journal: paper.fulljournalname || paper.source
      };
    }).filter(Boolean);
  } catch (error) {
    console.error("Error searching PubMed:", error);
    return [];
  }
}
const S2_FIELDS = "paperId,title,abstract,year,authors,externalIds,journal,url,tldr,citationCount,influentialCitationCount,fieldsOfStudy,isOpenAccess,openAccessPdf,publicationTypes";
function semanticScholarHeaders() {
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY;
  return key ? { "x-api-key": key } : {};
}
function mapS2Paper(paper) {
  return {
    title: paper.title || "Untitled",
    doi: paper.externalIds?.DOI,
    url: paper.url || (paper.externalIds?.DOI ? `https://doi.org/${paper.externalIds.DOI}` : paper.paperId ? `https://www.semanticscholar.org/paper/${paper.paperId}` : void 0),
    year: paper.year,
    source: "semantic_scholar",
    authors: paper.authors?.map((a) => a.name) || [],
    abstract: paper.abstract,
    journal: paper.journal?.name,
    publicationType: paper.publicationTypes?.[0],
    tldr: paper.tldr?.text,
    citationCount: paper.citationCount,
    influentialCitationCount: paper.influentialCitationCount,
    fieldsOfStudy: paper.fieldsOfStudy,
    isOpenAccess: paper.isOpenAccess,
    openAccessPdfUrl: paper.openAccessPdf?.url,
    s2PaperId: paper.paperId
  };
}
async function searchSemanticScholar(query, limit = 10) {
  try {
    const url = new URL(
      "https://api.semanticscholar.org/graph/v1/paper/search"
    );
    url.searchParams.set("query", query);
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("fields", S2_FIELDS);
    const response = await fetchWithRetry(url.toString(), {
      headers: semanticScholarHeaders()
    });
    if (!response.ok) {
      console.error(`Semantic Scholar search error: ${response.status}`);
      return [];
    }
    const data = await response.json();
    return (data.data || []).map(mapS2Paper);
  } catch (error) {
    console.error("Error searching Semantic Scholar:", error);
    return [];
  }
}
async function getSemanticScholarPaper(paperId) {
  try {
    const url = new URL(
      `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(paperId)}`
    );
    url.searchParams.set("fields", S2_FIELDS);
    const response = await fetchWithRetry(url.toString(), {
      headers: semanticScholarHeaders()
    });
    if (!response.ok) {
      if (response.status !== 404) {
        console.error(`Semantic Scholar paper lookup error: ${response.status}`);
      }
      return null;
    }
    return mapS2Paper(await response.json());
  } catch (error) {
    console.error("Error fetching Semantic Scholar paper:", error);
    return null;
  }
}
async function getSemanticScholarPapersBatch(paperIds) {
  if (paperIds.length === 0) return [];
  const results = [];
  for (let i = 0; i < paperIds.length; i += 500) {
    const chunk = paperIds.slice(i, i + 500);
    try {
      const url = new URL(
        "https://api.semanticscholar.org/graph/v1/paper/batch"
      );
      url.searchParams.set("fields", S2_FIELDS);
      const response = await fetchWithRetry(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...semanticScholarHeaders()
        },
        body: JSON.stringify({ ids: chunk })
      });
      if (!response.ok) {
        console.error(`Semantic Scholar batch error: ${response.status}`);
        continue;
      }
      const papers = await response.json();
      results.push(...papers.filter(Boolean).map(mapS2Paper));
    } catch (error) {
      console.error("Error in Semantic Scholar batch lookup:", error);
    }
  }
  return results;
}
async function getSemanticScholarRecommendations(paperId, limit = 20) {
  try {
    const url = new URL(
      `https://api.semanticscholar.org/recommendations/v1/papers/forpaper/${encodeURIComponent(paperId)}`
    );
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("fields", S2_FIELDS);
    const response = await fetchWithRetry(url.toString(), {
      headers: semanticScholarHeaders()
    });
    if (!response.ok) {
      if (response.status !== 404) {
        console.error(`Semantic Scholar recommendations error: ${response.status}`);
      }
      return [];
    }
    const data = await response.json();
    return (data.recommendedPapers || []).map(mapS2Paper);
  } catch (error) {
    console.error("Error fetching Semantic Scholar recommendations:", error);
    return [];
  }
}
async function getSemanticScholarCitations(paperId, limit = 25) {
  try {
    const url = new URL(
      `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(paperId)}/citations`
    );
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("fields", S2_FIELDS);
    const response = await fetchWithRetry(url.toString(), {
      headers: semanticScholarHeaders()
    });
    if (!response.ok) {
      console.error(`Semantic Scholar citations error: ${response.status}`);
      return [];
    }
    const data = await response.json();
    return (data.data || []).map((c) => c.citingPaper).filter(Boolean).map(mapS2Paper);
  } catch (error) {
    console.error("Error fetching Semantic Scholar citations:", error);
    return [];
  }
}
async function searchOpenAlex(query, limit = 10) {
  try {
    const apiKey = process.env.OPENALEX_API_KEY;
    if (!apiKey) {
      console.warn("OPENALEX_API_KEY not set, skipping OpenAlex");
      return [];
    }
    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", query);
    url.searchParams.set("per-page", limit.toString());
    url.searchParams.set(
      "mailto",
      process.env.UNPAYWALL_EMAIL || "research@example.com"
    );
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
    if (!response.ok) {
      console.error(`OpenAlex API error: ${response.status}`);
      return [];
    }
    const data = await response.json();
    const results = data.results || [];
    return results.map((work) => ({
      title: work.title || "Untitled",
      doi: work.doi?.replace("https://doi.org/", ""),
      url: work.doi || work.id,
      year: work.publication_year,
      source: "openalex",
      authors: work.authorships?.map((a) => a.author?.display_name).filter(Boolean) || [],
      abstract: work.abstract_inverted_index ? reconstructAbstract(work.abstract_inverted_index) : void 0,
      journal: work.primary_location?.source?.display_name || work.host_venue?.display_name
    }));
  } catch (error) {
    console.error("Error searching OpenAlex:", error);
    return [];
  }
}
function reconstructAbstract(invertedIndex) {
  const tokens = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      tokens.push({ word, pos });
    }
  }
  return tokens.sort((a, b) => a.pos - b.pos).map((t) => t.word).join(" ");
}
async function searchArxiv(query, limit = 10) {
  try {
    const url = new URL("http://export.arxiv.org/api/query");
    url.searchParams.set("search_query", `all:${query}`);
    url.searchParams.set("start", "0");
    url.searchParams.set("max_results", limit.toString());
    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`arXiv API error: ${response.status}`);
      return [];
    }
    const xml = await response.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    return entries.map((match) => {
      const entry = match[1];
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
      const publishedMatch = entry.match(/<published>(\d{4})/);
      const idMatch = entry.match(/<id>([^<]+)<\/id>/);
      const doiMatch = entry.match(/<arxiv:doi[^>]*>([^<]+)<\/arxiv:doi>/);
      const authorMatches = [
        ...entry.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)
      ];
      return {
        title: titleMatch?.[1]?.replace(/\s+/g, " ").trim() || "Untitled",
        doi: doiMatch?.[1]?.trim(),
        url: idMatch?.[1]?.trim(),
        year: publishedMatch?.[1] ? parseInt(publishedMatch[1]) : void 0,
        source: "arxiv",
        authors: authorMatches.map((m) => m[1].trim()),
        abstract: summaryMatch?.[1]?.replace(/\s+/g, " ").trim(),
        journal: "arXiv (preprint)"
      };
    });
  } catch (error) {
    console.error("Error searching arXiv:", error);
    return [];
  }
}
async function searchEuropePmc(query, limit = 10) {
  try {
    const url = new URL(
      "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
    );
    url.searchParams.set("query", query);
    url.searchParams.set("pageSize", limit.toString());
    url.searchParams.set("format", "json");
    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`Europe PMC API error: ${response.status}`);
      return [];
    }
    const data = await response.json();
    const results = data.resultList?.result || [];
    return results.map((paper) => ({
      title: paper.title || "Untitled",
      doi: paper.doi,
      url: paper.doi ? `https://doi.org/${paper.doi}` : paper.pmid ? `https://europepmc.org/article/MED/${paper.pmid}` : void 0,
      year: parseInt(paper.pubYear),
      source: "europepmc",
      authors: paper.authorString?.split(", ") || [],
      abstract: paper.abstractText,
      journal: paper.journalTitle
    }));
  } catch (error) {
    console.error("Error searching Europe PMC:", error);
    return [];
  }
}
async function searchDataCite(query, limit = 10) {
  try {
    const url = new URL("https://api.datacite.org/dois");
    url.searchParams.set("query", query);
    url.searchParams.set("page[size]", limit.toString());
    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`DataCite API error: ${response.status}`);
      return [];
    }
    const data = await response.json();
    const results = data.data || [];
    return results.map((item) => {
      const attrs = item.attributes;
      return {
        title: attrs.titles?.[0]?.title || "Untitled",
        doi: attrs.doi,
        url: attrs.url || `https://doi.org/${attrs.doi}`,
        year: attrs.publicationYear,
        source: "datacite",
        authors: attrs.creators?.map(
          (c) => c.name || `${c.givenName || ""} ${c.familyName || ""}`.trim()
        ).filter(Boolean) || [],
        abstract: attrs.descriptions?.find(
          (d) => d.descriptionType === "Abstract"
        )?.description,
        journal: attrs.container?.title || attrs.publisher
      };
    });
  } catch (error) {
    console.error("Error searching DataCite:", error);
    return [];
  }
}
async function getUnpaywallOaUrl(doi) {
  try {
    const email = process.env.UNPAYWALL_EMAIL;
    if (!email) {
      console.warn("UNPAYWALL_EMAIL not set, skipping Unpaywall lookup");
      return null;
    }
    const normalizedDoi = normalizeDoi(doi);
    if (!normalizedDoi) return null;
    const url = `https://api.unpaywall.org/v2/${normalizedDoi}?email=${email}`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status !== 404) {
        console.error(`Unpaywall API error: ${response.status}`);
      }
      return null;
    }
    const data = await response.json();
    return {
      oaUrl: data.best_oa_location?.url_for_pdf || data.best_oa_location?.url,
      oaStatus: data.oa_status
    };
  } catch (error) {
    console.error("Error fetching Unpaywall data:", error);
    return null;
  }
}
async function fetchDoiMetadata(doi) {
  try {
    const normalizedDoi = normalizeDoi(doi);
    if (!normalizedDoi) return null;
    const url = `https://doi.org/${normalizedDoi}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.citationstyles.csl+json"
      }
    });
    if (!response.ok) {
      console.error(`DOI content negotiation error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return {
      title: data.title || data["title-short"],
      doi: normalizedDoi,
      url: data.URL || `https://doi.org/${normalizedDoi}`,
      year: data.issued?.["date-parts"]?.[0]?.[0] || data.published?.["date-parts"]?.[0]?.[0],
      authors: data.author?.map((a) => `${a.given || ""} ${a.family || ""}`.trim()).filter(Boolean),
      abstract: data.abstract,
      journal: data["container-title"] || data.publisher
    };
  } catch (error) {
    console.error("Error fetching DOI metadata:", error);
    return null;
  }
}
async function fetchPubMedDoiAndAbstractByPmid(pmid) {
  const url = new URL(
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
  );
  url.searchParams.set("db", "pubmed");
  url.searchParams.set("id", pmid);
  url.searchParams.set("retmode", "xml");
  const response = await fetch(url.toString());
  if (!response.ok) return {};
  const xml = await response.text();
  const doiMatch = xml.match(
    /<ArticleId[^>]*IdType="doi"[^>]*>([\s\S]*?)<\/ArticleId>/i
  );
  const doi = doiMatch?.[1]?.trim();
  const abstractBlocks = [
    ...xml.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi)
  ].map(
    (m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  ).filter(Boolean);
  const abstract = abstractBlocks.length ? abstractBlocks.join("\n") : void 0;
  return { doi: normalizeDoi(doi), abstract };
}
async function fetchPaperDetails(candidate) {
  try {
    const enriched = candidate;
    if (enriched._enrichedAbstract) {
      return {
        ...candidate,
        abstract: enriched._enrichedAbstract,
        year: candidate.year || enriched._enrichedYear,
        journal: candidate.journal || enriched._enrichedVenue,
        authors: candidate.authors || enriched._enrichedAuthors || [],
        doi: normalizeDoi(candidate.doi)
      };
    }
    if (candidate.doi) {
      const url = `https://api.crossref.org/works/${encodeURIComponent(candidate.doi)}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "AI-Therapist/1.0 (mailto:research@example.com)"
        }
      });
      if (response.ok) {
        const data = await response.json();
        const item = data.message;
        return {
          ...candidate,
          title: candidate.title || (Array.isArray(item.title) ? item.title[0] : item.title),
          abstract: item.abstract || candidate.abstract || "Abstract not available",
          authors: candidate.authors || item.author?.map((a) => `${a.given || ""} ${a.family || ""}`.trim()).filter(Boolean) || [],
          year: candidate.year || item.published?.["date-parts"]?.[0]?.[0],
          journal: candidate.journal || (Array.isArray(item["container-title"]) ? item["container-title"][0] : item["container-title"])
        };
      }
    }
    if (candidate.source === "pubmed" && candidate.url) {
      const pmid = candidate.url.match(/\/(\d+)\//)?.[1];
      if (pmid) {
        const extra = await fetchPubMedDoiAndAbstractByPmid(pmid);
        return {
          ...candidate,
          doi: candidate.doi || extra.doi,
          abstract: extra.abstract || candidate.abstract || "Abstract not available",
          authors: candidate.authors || []
        };
      }
    }
    if (candidate.source === "semantic_scholar" && (candidate.doi || candidate.s2PaperId)) {
      const s2Id = candidate.doi ? `DOI:${candidate.doi}` : candidate.s2PaperId;
      const enriched2 = await getSemanticScholarPaper(s2Id);
      if (enriched2) {
        return {
          ...candidate,
          ...enriched2,
          // Preserve any already-set OA info from Unpaywall
          oaUrl: candidate.oaUrl ?? enriched2.openAccessPdfUrl,
          abstract: enriched2.abstract || candidate.abstract || "Abstract not available",
          authors: enriched2.authors?.length ? enriched2.authors : candidate.authors || []
        };
      }
    }
  } catch (error) {
    console.error("Error fetching paper details:", error);
  }
  if (candidate.doi) {
    const doiData = await fetchDoiMetadata(candidate.doi);
    if (doiData) {
      const merged = {
        ...candidate,
        title: candidate.title || doiData.title || "Untitled",
        abstract: stripJats(candidate.abstract || doiData.abstract) || "Abstract not available",
        authors: candidate.authors?.length ? candidate.authors : doiData.authors || [],
        year: candidate.year || doiData.year,
        journal: candidate.journal || doiData.journal,
        doi: normalizeDoi(candidate.doi)
      };
      const oaData = await getUnpaywallOaUrl(candidate.doi);
      return {
        ...merged,
        oaUrl: oaData?.oaUrl,
        oaStatus: oaData?.oaStatus
      };
    }
  }
  const result = {
    ...candidate,
    abstract: stripJats(candidate.abstract) || "Abstract not available",
    authors: candidate.authors || [],
    doi: normalizeDoi(candidate.doi)
  };
  if (candidate.doi) {
    const oaData = await getUnpaywallOaUrl(candidate.doi);
    if (oaData) {
      result.oaUrl = oaData.oaUrl;
      result.oaStatus = oaData.oaStatus;
    }
  }
  return result;
}
function dedupeCandidates(candidates) {
  const seen = /* @__PURE__ */ new Set();
  const unique = [];
  for (const c of candidates) {
    const doi = normalizeDoi(c.doi);
    const titleKey = c.title ? titleFingerprint(c.title) : "";
    const key = doi ? `doi:${doi}` : `t:${titleKey}`;
    if (!titleKey && !doi) continue;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ ...c, doi });
    }
  }
  return unique;
}
function filterBookChapters(candidates) {
  const excludedTypes = /* @__PURE__ */ new Set([
    "book-chapter",
    "book-section",
    "book-part",
    "reference-entry",
    // encyclopedia entries
    "book",
    "monograph",
    "edited-book",
    "reference-book"
  ]);
  return candidates.filter((c) => {
    if (!c.publicationType) return true;
    if (excludedTypes.has(c.publicationType)) {
      console.log(`\u{1F6AB} Filtered book chapter: "${c.title}" (type: ${c.publicationType})`);
      return false;
    }
    return true;
  });
}
function filterIrrelevantTitles(candidates) {
  const exclusionRegex = /\b(child|forensic|witness|court|legal|police|criminal|abuse|victim|testimony|investigative interview|law enforcement)\b/i;
  return candidates.filter((c) => {
    if (exclusionRegex.test(c.title)) {
      console.log(`\u{1F6AB} Filtered irrelevant title: "${c.title}"`);
      return false;
    }
    return true;
  });
}
function filterShortAbstracts(candidates, minLength = 200) {
  return candidates.filter((c) => {
    if (!c.abstract || c.abstract.length < minLength) {
      console.log(`\u{1F6AB} Filtered short/missing abstract: "${c.title}" (${c.abstract?.length || 0} chars)`);
      return false;
    }
    return true;
  });
}
function applyQualityFilters(candidates, opts) {
  const minAbstract = opts?.minAbstractLength ?? 200;
  let filtered = filterBookChapters(candidates);
  filtered = filterIrrelevantTitles(filtered);
  if (!opts?.skipAbstractCheck) {
    filtered = filterShortAbstracts(filtered, minAbstract);
  }
  console.log(`\u{1F4CA} Quality filter: ${candidates.length} \u2192 ${filtered.length} candidates`);
  return filtered;
}
async function resolvePaperByTitle(title, opts) {
  const limit = opts?.limitPerSource ?? 8;
  const [crossref, pubmed, semantic, openalex, arxiv, europepmc] = await Promise.all([
    searchCrossref(title, limit),
    searchPubMed(title, limit),
    searchSemanticScholar(title, limit),
    searchOpenAlex(title, limit),
    searchArxiv(title, limit),
    searchEuropePmc(title, limit)
  ]);
  const candidates = dedupeCandidates([
    ...crossref,
    ...pubmed,
    ...semantic,
    ...openalex,
    ...arxiv,
    ...europepmc
  ]);
  const best = pickBestCandidate(candidates, { title, year: opts?.year });
  if (!best) return null;
  const details = await fetchPaperDetails(best);
  if (details.source === "pubmed" && details.url) {
    const pmid = details.url.match(/\/(\d+)\//)?.[1];
    if (pmid) {
      const extra = await fetchPubMedDoiAndAbstractByPmid(pmid);
      return {
        ...details,
        doi: details.doi ?? extra.doi,
        abstract: details.abstract && details.abstract !== "Abstract not available" ? details.abstract : extra.abstract ?? details.abstract,
        authors: details.authors ?? []
      };
    }
  }
  return {
    ...details,
    abstract: stripJats(details.abstract) ?? "Abstract not available",
    doi: normalizeDoi(details.doi)
  };
}
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}
const sourceTools = {
  // Search functions
  searchCrossref,
  searchPubMed,
  searchSemanticScholar,
  searchOpenAlex,
  searchArxiv,
  searchEuropePmc,
  searchDataCite,
  // Semantic Scholar extended API
  getSemanticScholarPaper,
  getSemanticScholarPapersBatch,
  getSemanticScholarRecommendations,
  getSemanticScholarCitations,
  // Enrichment functions
  fetchPaperDetails,
  fetchPubMedDoiAndAbstractByPmid,
  fetchDoiMetadata,
  getUnpaywallOaUrl,
  // Resolution and deduplication
  dedupeCandidates,
  resolvePaperByTitle,
  pickBestCandidate,
  // Quality filters
  filterBookChapters,
  filterIrrelevantTitles,
  filterShortAbstracts,
  applyQualityFilters,
  // Utilities
  mapLimit,
  normalizeDoi,
  stripJats,
  titleFingerprint,
  scoreCandidate
};

"use strict";
const DEEPSEEK_API_BASE_URL = "https://api.deepseek.com";
const DEEPSEEK_MODELS = {
  CHAT: "deepseek-chat",
  REASONER: "deepseek-reasoner"
};
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
const _provider = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1"
});
const deepseekModel = (model = DEEPSEEK_MODELS.CHAT) => _provider(model);
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

"use strict";
const PlanSchema = z.object({
  goalType: z.string().describe(
    "Type of therapeutic/psychological goal (e.g., 'anxiety_reduction', 'denial_coping', 'behavioral_change')"
  ),
  keywords: z.array(z.string()).min(3),
  inclusion: z.array(z.string()).default([]),
  exclusion: z.array(z.string()).default([]),
  // Query pack (key for recall/volume)
  semanticScholarQueries: z.array(z.string()).min(2),
  crossrefQueries: z.array(z.string()).min(2),
  pubmedQueries: z.array(z.string()).min(1)
});
const ResearchExtractionSchema = z.object({
  domain: z.enum([
    "cbt",
    "act",
    "dbt",
    "behavioral",
    "psychodynamic",
    "somatic",
    "humanistic",
    // Pediatric / neurodevelopmental domains added based on clinical review
    "speech_language",
    "play_therapy",
    "aba",
    "parent_mediated",
    "neurodevelopmental",
    "other"
  ]),
  paperMeta: z.object({
    title: z.string(),
    authors: z.array(z.string()),
    year: z.number().int().nullable(),
    venue: z.string().nullable(),
    doi: z.string().nullable(),
    url: z.string().nullable()
  }),
  studyType: z.enum([
    "meta-analysis",
    "RCT",
    "field study",
    "lab study",
    "quasi-experimental",
    "review",
    "other"
  ]),
  populationContext: z.string().nullable(),
  interventionOrSkill: z.string().nullable(),
  keyFindings: z.array(z.string()),
  evidenceSnippets: z.array(
    z.object({
      findingIndex: z.number().int(),
      snippet: z.string()
    })
  ),
  practicalTakeaways: z.array(z.string()),
  relevanceScore: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  rejectReason: z.string().nullable()
});
const TherapyResearchSchema = z.object({
  therapeuticGoalType: z.string().describe(
    "Type of therapeutic goal (e.g., 'anxiety reduction', 'depression management')"
  ),
  title: z.string().describe("Paper title"),
  authors: z.array(z.string()).describe("Author names"),
  year: z.number().int().nullable().describe("Publication year"),
  journal: z.string().nullable().describe("Journal name"),
  doi: z.string().nullable().describe("DOI"),
  url: z.string().nullable().describe("URL"),
  abstract: z.string().nullable().describe("Abstract text"),
  keyFindings: z.array(z.string()).describe("Key findings relevant to the therapeutic goal (3-5 findings)"),
  therapeuticTechniques: z.array(z.string()).describe(
    "Specific therapeutic techniques mentioned (e.g., 'CBT', 'exposure therapy')"
  ),
  evidenceLevel: z.string().nullable().describe(
    "Evidence level: 'meta-analysis', 'RCT', 'cohort', 'case-study', or 'review'"
  ),
  relevanceScore: z.number().min(0).max(1).describe("Relevance to goal (0-1)"),
  extractedBy: z.string().describe("Extraction source identifier"),
  extractionConfidence: z.number().min(0).max(1).describe("Confidence in extraction (0-1)")
});
function convertLegacyToResearchSchema(legacy) {
  return {
    domain: "other",
    // default domain for legacy conversions
    paperMeta: {
      title: legacy.title,
      authors: legacy.authors,
      year: legacy.year,
      venue: legacy.journal,
      doi: legacy.doi,
      url: legacy.url
    },
    studyType: legacy.evidenceLevel ?? "other",
    populationContext: null,
    interventionOrSkill: legacy.therapeuticTechniques?.join(", ") ?? null,
    keyFindings: legacy.keyFindings,
    evidenceSnippets: legacy.keyFindings.map((finding, idx) => ({
      findingIndex: idx,
      snippet: finding
    })),
    practicalTakeaways: legacy.therapeuticTechniques ?? [],
    relevanceScore: legacy.relevanceScore,
    confidence: legacy.extractionConfidence,
    rejectReason: legacy.relevanceScore < 0.5 ? "below_relevance_threshold" : null
  };
}
async function planResearchQuery(params) {
  const { title, description, notes } = params;
  const { object } = await generateObject({
    schema: PlanSchema,
    prompt: `Plan a research query strategy for this therapeutic/psychological goal.

Goal: ${title}
Description: ${description}
Notes: ${notes.join("\n- ")}
${params.clinicalDomain ? `
Clinical Domain: ${params.clinicalDomain}` : ""}
${params.behaviorDirection ? `Behavior Direction: ${params.behaviorDirection}` : ""}
${params.developmentalTier ? `Developmental Tier: ${params.developmentalTier}` : ""}
${params.requiredKeywords?.length ? `Required Keywords (MUST appear in relevant papers): ${params.requiredKeywords.join(", ")}` : ""}
${params.excludedTopics?.length ? `Excluded Topics (do NOT search for these): ${params.excludedTopics.join(", ")}` : ""}

Generate MULTIPLE diverse queries to maximize recall from different psychological/therapy databases.

QUERY STRATEGY:
1. Semantic Scholar queries (min 2): Mix broad + specific, use synonyms and related constructs
2. Crossref queries (min 2): Use natural language phrases common in therapy/psychology literature
3. PubMed queries (min 1): Use MeSH terms and clinical psychology terminology

Focus on finding psychological research relevant to the specific therapeutic goal.
Include queries about: therapeutic interventions, mechanisms, evidence-based treatments, coping strategies.
${params.requiredKeywords?.length ? `
IMPORTANT: At least half of all generated queries MUST include one or more of these required keywords: ${params.requiredKeywords.join(", ")}` : ""}
${params.excludedTopics?.length ? `IMPORTANT: No query should target these excluded topics: ${params.excludedTopics.join(", ")}` : ""}`
  });
  return {
    ...object,
    inclusion: object.inclusion ?? [],
    exclusion: object.exclusion ?? []
  };
}
async function extractResearch(params) {
  const { goalTitle, goalDescription, goalType, paper } = params;
  const compiledPrompt = `Extract therapeutic research information from this paper.

Therapeutic Goal: ${goalTitle}
Goal Description: ${goalDescription}
Goal Type: ${goalType}
${params.patientAge ? `Target Patient Age: ${params.patientAge} years old` : ""}
${params.developmentalTier ? `Developmental Tier: ${params.developmentalTier}` : ""}

Paper:
Title: ${paper.title ?? ""}
Authors: ${(paper.authors ?? []).join(", ") || "Unknown"}
Year: ${paper.year ?? "Unknown"}
Journal: ${paper.journal ?? "Unknown"}
DOI: ${paper.doi ?? "None"}
URL: ${paper.url ?? ""}
Abstract: ${paper.abstract ?? ""}

Extract the following fields for the therapeutic research:
- domain: the therapy domain (cbt, act, dbt, behavioral, psychodynamic, somatic, humanistic, speech_language, play_therapy, aba, parent_mediated, neurodevelopmental, or other)
- paperMeta: title, authors, year, venue, doi, url
- studyType: meta-analysis, RCT, field study, lab study, quasi-experimental, review, or other
- populationContext: who was studied (null if not specified)
- interventionOrSkill: specific therapy technique or intervention studied (null if not specified)
- keyFindings: 3-5 findings directly from the abstract
- evidenceSnippets: array of {findingIndex, snippet}
- practicalTakeaways: 2-4 actionable insights for therapists/clients
- relevanceScore: 0-1 (how relevant to the therapeutic goal)
- confidence: 0-1 (confidence in extraction quality)
- rejectReason: reason for rejection or null

RELEVANCE SCORING RUBRIC (be strict):
- 1.0: Directly studies the exact behavior/condition in the therapeutic goal in the same population
- 0.8: Studies the same condition in a closely related population
- 0.6: Studies an adjacent condition using the same modality for the goal's population
- 0.4: Same modality but different condition or population
- 0.2: General clinical psychology with no specific relevance to this goal
- 0.1 or below: NOT about the specific clinical domain of this goal

STRICT FILTERING:
- Score 0.1 or lower if paper is about: forensic interviews, legal proceedings, homework completion, academic achievement, adult populations (when goal is for a child)
- Population mismatch: reduce score by 0.3 if study population age does not match ${params.patientAge ? `patient age (${params.patientAge} years, ${params.developmentalTier ?? "unknown"} tier)` : "the target population"}
- If abstract is missing or fewer than 300 characters, return relevanceScore=0, confidence=0, rejectReason='insufficient_abstract'
- Only extract findings EXPLICITLY stated in the abstract`;
  const schemaInstructions = `

REQUIRED JSON OUTPUT FORMAT:
{
  "domain": "cbt" | "act" | "dbt" | "behavioral" | "psychodynamic" | "somatic" | "humanistic" | "other",
  "paperMeta": {
    "title": "string",
    "authors": ["string"],
    "year": number | null,
    "venue": "string" | null,
    "doi": "string" | null,
    "url": "string" | null
  },
  "studyType": "meta-analysis" | "RCT" | "field study" | "lab study" | "quasi-experimental" | "review" | "other",
  "populationContext": "string" | null,
  "interventionOrSkill": "string" | null,
  "keyFindings": ["string"],
  "evidenceSnippets": [{ "findingIndex": number, "snippet": "string" }],
  "practicalTakeaways": ["string"],
  "relevanceScore": number (0-1),
  "confidence": number (0-1),
  "rejectReason": "string" | null
}

CRITICAL: Return VALID JSON ONLY. No markdown, no code blocks, no extra text.`;
  try {
    const { object } = await generateObject({
      schema: ResearchExtractionSchema,
      prompt: compiledPrompt + schemaInstructions
    });
    return object;
  } catch (err) {
    console.error(
      `\u26A0\uFE0F Schema validation failed for "${paper.title}". Falling back to legacy extraction.`
    );
    const legacyResult = await extractResearchLegacy({
      therapeuticGoalType: goalType,
      goalTitle,
      goalDescription,
      paper
    });
    return convertLegacyToResearchSchema(legacyResult);
  }
}
async function extractResearchLegacy(params) {
  const { therapeuticGoalType, goalTitle, goalDescription, paper } = params;
  const { object } = await generateObject({
    schema: TherapyResearchSchema,
    prompt: `Extract therapeutic research information from this paper.

Therapeutic Goal: ${goalTitle}
Goal Description: ${goalDescription}
Goal Type: ${therapeuticGoalType}

Paper:
Title: ${paper.title}
Authors: ${paper.authors?.join(", ") || "Unknown"}
Year: ${paper.year || "Unknown"}
Journal: ${paper.journal || "Unknown"}
DOI: ${paper.doi || "None"}
Abstract: ${paper.abstract}

CRITICAL: This should be THERAPEUTIC/PSYCHOLOGICAL research for clinical/counseling applications.

Extract:
1. Key findings (3-5) that are DIRECTLY relevant to the therapeutic goal
2. Specific therapeutic techniques mentioned (e.g., CBT, exposure therapy, mindfulness)
3. Evidence level (meta-analysis > RCT > cohort > case-study > review)
4. Relevance score (0-1) based on how well it addresses the THERAPEUTIC goal

RELEVANCE SCORING RUBRIC (be strict):
- 1.0: Directly studies the exact behavior/condition in the therapeutic goal in the same population
- 0.8: Studies the same condition in a closely related population
- 0.6: Studies an adjacent condition using the same modality for the goal's population
- 0.4: Same modality but different condition or population
- 0.2: General clinical psychology with no specific relevance to this goal
- 0.1 or below: NOT about the specific clinical domain of this goal

STRICT FILTERING:
- Score 0.1 or lower if paper is about: forensic interviews, legal proceedings, homework completion, academic achievement, adult populations (when goal is for a child), family therapy engagement (unless directly relevant)
- Score 0.1 or lower if NOT about the specific clinical domain of the therapeutic goal
- Score 0.8+ ONLY if directly studying the specific intervention for the goal type and population
- Population mismatch: reduce score by 0.3 if study population age does not match patient age
- Only extract findings EXPLICITLY stated in the abstract
- Do not infer or extrapolate beyond what is written
- Rate your extraction confidence honestly`
  });
  return {
    ...object,
    extractedBy: "pipeline:deepseek:v1"
  };
}
async function repairResearch(params) {
  const { extracted, abstract, feedback } = params;
  const { object } = await generateObject({
    schema: TherapyResearchSchema,
    prompt: `Repair this research extraction based on feedback.

Original Extraction:
${JSON.stringify(extracted, null, 2)}

Abstract:
${abstract}

Feedback:
${feedback}

Instructions:
- Remove or rewrite any unsupported claims
- Ensure every finding is directly supported by the abstract
- Be more conservative in claims
- Lower confidence if uncertain
- Keep only well-supported findings`
  });
  return {
    ...object,
    extractedBy: "pipeline:deepseek:v1-repaired"
  };
}
async function planResearchQueryLegacy(params) {
  const { title, description, notes } = params;
  const { object } = await generateObject({
    temperature: 1.5,
    schema: z.object({
      therapeuticGoalType: z.string().describe("Type of therapeutic goal"),
      keywords: z.array(z.string()).describe("Core search keywords (5-8 terms)"),
      semanticScholarQueries: z.array(z.string()).describe("20-40 diverse queries for Semantic Scholar"),
      crossrefQueries: z.array(z.string()).describe("20-45 queries for Crossref"),
      pubmedQueries: z.array(z.string()).describe("20-40 MeSH-friendly queries for PubMed"),
      inclusion: z.array(z.string()).describe("Inclusion criteria"),
      exclusion: z.array(z.string()).describe("Exclusion criteria")
    }),
    prompt: `Plan a research query strategy for this therapeutic/psychological goal.

Goal: ${title}
Description: ${description}
Notes: ${notes.join("\n- ")}

Generate MULTIPLE diverse queries to maximize recall from different psychological/therapy databases.

QUERY STRATEGY:
1. Semantic Scholar queries (20-40): Mix broad + specific, use synonyms and related constructs
2. Crossref queries (20-45): Use natural language phrases common in therapy/psychology literature
3. PubMed queries (20-40): Use MeSH terms and clinical psychology terminology

Focus on finding psychological research relevant to the specific therapeutic goal.
Include queries about: therapeutic interventions, mechanisms, evidence-based treatments, coping strategies.

Return 40-87 total queries across all sources for maximum recall.`
  });
  return object;
}
function sanitizePlan(plan) {
  return {
    ...plan,
    keywords: plan.keywords ?? [],
    semanticScholarQueries: plan.semanticScholarQueries ?? [],
    crossrefQueries: plan.crossrefQueries ?? [],
    pubmedQueries: plan.pubmedQueries ?? [],
    inclusion: plan.inclusion ?? [],
    exclusion: plan.exclusion ?? []
  };
}
const extractorTools = {
  extract: extractResearch,
  plan: planResearchQuery,
  repair: repairResearch,
  sanitize: sanitizePlan,
  // Legacy exports
  extractLegacy: extractResearchLegacy,
  planLegacy: planResearchQueryLegacy
};

"use strict";
async function extractClaims(text) {
  const schema = z.object({
    claims: z.array(z.string()).describe(
      "Atomic, testable claims extracted from the text. Each claim should be a single statement that can be verified independently."
    )
  });
  const result = await generateObject({
    schema,
    prompt: `Extract all factual claims from the following text. Make each claim:
1. Atomic (one testable statement)
2. Specific (include population, intervention, outcome where applicable)
3. Falsifiable (can be proven true or false)
4. Complete (doesn't require context from other claims)

Text:
${text}

Example transformations:
- "CBT helps anxiety" \u2192 "CBT reduces anxiety symptom severity in adults with generalized anxiety disorder"
- "Exercise improves mood" \u2192 "Regular aerobic exercise improves mood in adults with major depressive disorder"

Extract claims:`
  });
  return result.object.claims;
}
function stableClaimId(claim, scope) {
  const normalized = claim.trim().toLowerCase();
  const scopeStr = scope ? JSON.stringify(scope) : "";
  const hash = crypto.createHash("sha256").update(normalized + scopeStr).digest("hex").slice(0, 16);
  return `claim_${hash}`;
}
function bestSnippet(p) {
  const a = (p.abstract || "").trim();
  if (!a) return void 0;
  return a.length > 220 ? a.slice(0, 220) + "\u2026" : a;
}
function basicScore(claim, p) {
  const text = `${p.title} ${p.abstract ?? ""}`.toLowerCase();
  const tokens = claim.toLowerCase().split(/\W+/).filter(Boolean);
  const hits = tokens.filter((t) => text.includes(t)).length;
  return Math.min(1, hits / Math.max(6, tokens.length));
}
async function judgeEvidence(claim, paper) {
  const schema = z.object({
    polarity: z.enum(["supports", "contradicts", "mixed", "irrelevant"]).describe(
      "Does this paper support, contradict, provide mixed evidence for, or is irrelevant to the claim?"
    ),
    rationale: z.string().describe("Brief 1-2 sentence explanation"),
    score: z.number().min(0).max(1).describe("Confidence in this judgment (0-1)")
  });
  try {
    const result = await generateObject({
      schema,
      prompt: `Evaluate whether this research paper supports, contradicts, or is irrelevant to the claim.

Claim: "${claim}"

Paper:
Title: ${paper.title}
Authors: ${paper.authors.join(", ")}
Abstract: ${paper.abstract || "No abstract available"}

Respond with:
- polarity: supports/contradicts/mixed/irrelevant
- rationale: why (1-2 sentences)
- score: confidence 0-1`
    });
    return result.object;
  } catch (error) {
    console.error("Error judging evidence:", error);
    return {
      polarity: "irrelevant",
      rationale: "Error during evaluation",
      score: 0
    };
  }
}
function aggregateVerdict(evidence) {
  if (evidence.length === 0) {
    return { verdict: "insufficient", confidence: 0 };
  }
  const polarities = evidence.map((e) => e.polarity);
  const scores = evidence.map((e) => e.score ?? 0);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const supports = polarities.filter((p) => p === "supports").length;
  const contradicts = polarities.filter((p) => p === "contradicts").length;
  const mixed = polarities.filter((p) => p === "mixed").length;
  const relevant = supports + contradicts + mixed;
  if (relevant === 0) {
    return { verdict: "insufficient", confidence: Math.max(0.1, avgScore) };
  }
  const supportRatio = supports / relevant;
  const contradictRatio = contradicts / relevant;
  let verdict;
  if (supportRatio > 0.7) {
    verdict = "supported";
  } else if (contradictRatio > 0.7) {
    verdict = "contradicted";
  } else if (supportRatio + contradictRatio < 0.3) {
    verdict = "insufficient";
  } else {
    verdict = "mixed";
  }
  const evidenceStrength = Math.min(1, relevant / 5);
  const confidence = Math.min(0.95, avgScore * 0.7 + evidenceStrength * 0.3);
  return { verdict, confidence };
}
async function buildClaimCardsFromClaims(claims, opts) {
  const perSourceLimit = opts?.perSourceLimit ?? 10;
  const topK = opts?.topK ?? 6;
  const useLlmJudge = opts?.useLlmJudge ?? false;
  const sources = opts?.sources ?? ["crossref", "pubmed", "semantic_scholar"];
  const paperPool = opts?.paperPool;
  const poolConcurrency = Math.max(1, Math.min(8, opts?.poolConcurrency ?? 3));
  const enrichPool = opts?.enrichPool ?? true;
  const detailsCache = /* @__PURE__ */ new Map();
  const cacheKeyFor = (p) => {
    const doi = sourceTools.normalizeDoi(p.doi);
    if (doi) return `doi:${doi}`;
    const t = (p.title || "").trim();
    if (t) return `t:${sourceTools.titleFingerprint(t)}`;
    return `u:${p.url ?? Math.random().toString()}`;
  };
  const fetchDetailsCached = async (p) => {
    const key = cacheKeyFor(p);
    const cached = detailsCache.get(key);
    if (cached) return cached;
    const d = await sourceTools.fetchPaperDetails(p);
    detailsCache.set(key, d);
    return d;
  };
  const rankPoolForClaim = (claim, pool) => {
    const scored = pool.map((p) => {
      const score = basicScore(claim, p);
      return { p, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.map((x) => x.p);
  };
  const cards = [];
  let poolDetails = null;
  if (paperPool?.length) {
    const dedupedPool = sourceTools.dedupeCandidates(paperPool);
    if (!enrichPool) {
      poolDetails = dedupedPool.map((p) => ({
        ...p,
        abstract: p.abstract ?? "Abstract not available",
        authors: p.authors ?? [],
        doi: sourceTools.normalizeDoi(p.doi)
      }));
    } else {
      poolDetails = await sourceTools.mapLimit(
        dedupedPool,
        poolConcurrency,
        async (p) => {
          if (p.abstract && sourceTools.stripJats(p.abstract)?.length) {
            return {
              ...p,
              abstract: sourceTools.stripJats(p.abstract) ?? p.abstract,
              authors: p.authors ?? [],
              doi: sourceTools.normalizeDoi(p.doi)
            };
          }
          return fetchDetailsCached(p);
        }
      );
    }
  }
  for (const claim of claims) {
    const queries = [claim];
    let enriched = [];
    let sourceNames = [];
    if (poolDetails?.length) {
      const ranked = rankPoolForClaim(claim, poolDetails);
      enriched = ranked.slice(0, topK);
      sourceNames = ["linked_pool"];
    } else {
      const searchPromises = [];
      sourceNames = [];
      if (sources.includes("crossref")) {
        searchPromises.push(sourceTools.searchCrossref(claim, perSourceLimit));
        sourceNames.push("crossref");
      }
      if (sources.includes("pubmed")) {
        searchPromises.push(sourceTools.searchPubMed(claim, perSourceLimit));
        sourceNames.push("pubmed");
      }
      if (sources.includes("semantic_scholar")) {
        searchPromises.push(
          sourceTools.searchSemanticScholar(claim, perSourceLimit)
        );
        sourceNames.push("semantic_scholar");
      }
      if (sources.includes("openalex")) {
        searchPromises.push(sourceTools.searchOpenAlex(claim, perSourceLimit));
        sourceNames.push("openalex");
      }
      if (sources.includes("arxiv")) {
        searchPromises.push(sourceTools.searchArxiv(claim, perSourceLimit));
        sourceNames.push("arxiv");
      }
      if (sources.includes("europepmc")) {
        searchPromises.push(sourceTools.searchEuropePmc(claim, perSourceLimit));
        sourceNames.push("europepmc");
      }
      const results = await Promise.all(searchPromises);
      const allCandidates = results.flat();
      const candidates = sourceTools.dedupeCandidates(allCandidates);
      for (const c of candidates.slice(0, topK)) {
        const details = await sourceTools.fetchPaperDetails(c);
        enriched.push(details);
      }
    }
    const evidence = [];
    for (const p of enriched) {
      if (useLlmJudge) {
        const judgment = await judgeEvidence(claim, p);
        evidence.push({
          paper: p,
          polarity: judgment.polarity,
          excerpt: bestSnippet(p),
          rationale: judgment.rationale,
          score: judgment.score
        });
      } else {
        evidence.push({
          paper: p,
          polarity: "mixed",
          // Conservative default
          excerpt: bestSnippet(p),
          rationale: "Auto-mapped from abstract/title match",
          score: basicScore(claim, p)
        });
      }
    }
    const { verdict, confidence } = aggregateVerdict(evidence);
    cards.push({
      id: stableClaimId(claim),
      claim,
      verdict,
      confidence,
      evidence,
      queries,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      provenance: {
        generatedBy: "pipeline:claim-cards@1",
        model: useLlmJudge ? "deepseek-chat" : void 0,
        sourceTools: sourceNames
      }
    });
  }
  return cards;
}
async function buildClaimCardsFromText(text, opts) {
  const claims = await extractClaims(text);
  return buildClaimCardsFromClaims(claims, opts);
}
async function refreshClaimCard(card, opts) {
  const [refreshed] = await buildClaimCardsFromClaims([card.claim], opts);
  return {
    ...refreshed,
    id: card.id,
    // Keep original ID
    createdAt: card.createdAt,
    // Keep original creation time
    notes: card.notes
    // Preserve any notes
  };
}
async function saveClaimCard(card, noteId) {
  const confidenceInt = Math.round(card.confidence * 100);
  await sql`
    INSERT INTO claim_cards (id, note_id, claim, scope, verdict, confidence, evidence, queries, provenance, notes, created_at, updated_at)
    VALUES (${card.id}, ${noteId || null}, ${card.claim}, ${card.scope ? JSON.stringify(card.scope) : null}, ${card.verdict}, ${confidenceInt}, ${JSON.stringify(card.evidence)}, ${JSON.stringify(card.queries)}, ${JSON.stringify(card.provenance)}, ${card.notes || null}, ${card.createdAt}, ${card.updatedAt})
    ON CONFLICT (id) DO UPDATE SET
      claim = excluded.claim,
      scope = excluded.scope,
      verdict = excluded.verdict,
      confidence = excluded.confidence,
      evidence = excluded.evidence,
      queries = excluded.queries,
      provenance = excluded.provenance,
      notes = excluded.notes,
      updated_at = excluded.updated_at`;
  if (noteId) {
    await sql`INSERT INTO notes_claims (note_id, claim_id) VALUES (${noteId}, ${card.id}) ON CONFLICT DO NOTHING`;
  }
}
async function getClaimCard(claimId) {
  const rows = await sql`SELECT * FROM claim_cards WHERE id = ${claimId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    claim: row.claim,
    scope: row.scope ? JSON.parse(row.scope) : void 0,
    verdict: row.verdict,
    confidence: row.confidence / 100,
    evidence: JSON.parse(row.evidence),
    queries: JSON.parse(row.queries),
    provenance: JSON.parse(row.provenance),
    notes: row.notes || void 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function getClaimCardsForNote(noteId) {
  const rows = await sql`
    SELECT cc.* FROM claim_cards cc
    INNER JOIN notes_claims nc ON cc.id = nc.claim_id
    WHERE nc.note_id = ${noteId}
    ORDER BY cc.created_at DESC`;
  return rows.map((row) => ({
    id: row.id,
    claim: row.claim,
    scope: row.scope ? JSON.parse(row.scope) : void 0,
    verdict: row.verdict,
    confidence: row.confidence / 100,
    evidence: JSON.parse(row.evidence),
    queries: JSON.parse(row.queries),
    provenance: JSON.parse(row.provenance),
    notes: row.notes || void 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
async function deleteClaimCard(claimId) {
  await sql`DELETE FROM notes_claims WHERE claim_id = ${claimId}`;
  await sql`DELETE FROM claim_cards WHERE id = ${claimId}`;
}
const claimCardsTools = {
  // Core claim card generation
  extractClaims,
  buildClaimCardsFromClaims,
  buildClaimCardsFromText,
  refreshClaimCard,
  // Database persistence
  saveClaimCard,
  getClaimCard,
  getClaimCardsForNote,
  deleteClaimCard
};

"use strict";

export { claimCardsTools, db, extractorTools, ragTools, sourceTools };
