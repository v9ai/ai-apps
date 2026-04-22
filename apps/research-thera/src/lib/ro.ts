import { sql as neonSql } from "@/src/db/neon";

export const ROMANIAN_INSTRUCTION =
  "IMPORTANT: Respond entirely in Romanian. Every string field in your JSON output must be written in natural, fluent Romanian. Do not translate proper nouns, people's names, or citation identifiers.";

export function withRo(prompt: string, isRo: boolean): string {
  return isRo ? `${ROMANIAN_INSTRUCTION}\n\n${prompt}` : prompt;
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === "string");
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

async function loadTagRules(userId: string): Promise<Map<string, string>> {
  const rows = await neonSql`
    SELECT tag, language FROM tag_language_rules WHERE user_id = ${userId}
  `;
  const map = new Map<string, string>();
  for (const r of rows as Array<{ tag: string; language: string }>) {
    map.set(r.tag, r.language);
  }
  return map;
}

function languageForTags(tags: unknown, rules: Map<string, string>): string | null {
  for (const tag of parseTags(tags)) {
    const lang = rules.get(tag);
    if (lang) return lang;
  }
  return null;
}

export async function resolveGoalLanguage(input: {
  /** Caller's user_id (UUID from neon_auth.user.id). */
  userId?: string;
  /** @deprecated use `userId`. Kept for backward compat with resolvers that
   * still pass the legacy email-form identifier. After the user_id → UUID
   * consolidation (migration 0004) both names hold the same UUID value. */
  userEmail?: string;
  goalId?: number | null;
  issueId?: number | null;
  journalEntryId?: number | null;
  familyMemberId?: number | null;
}): Promise<string> {
  const { goalId, issueId, journalEntryId, familyMemberId } = input;
  const userId = input.userId ?? input.userEmail;
  if (!userId) return "en";

  const rules = await loadTagRules(userId);
  if (rules.size === 0) return "en";

  if (goalId) {
    const rows = await neonSql`SELECT tags FROM goals WHERE id = ${goalId} LIMIT 1`;
    const lang = rows[0] ? languageForTags(rows[0].tags, rules) : null;
    if (lang) return lang;
  }

  if (journalEntryId) {
    const rows = await neonSql`
      SELECT je.tags AS entry_tags, g.tags AS goal_tags
      FROM journal_entries je
      LEFT JOIN goals g ON g.id = je.goal_id
      WHERE je.id = ${journalEntryId}
      LIMIT 1
    `;
    if (rows[0]) {
      const lang = languageForTags(rows[0].entry_tags, rules) ?? languageForTags(rows[0].goal_tags, rules);
      if (lang) return lang;
    }
  }

  if (issueId) {
    const rows = await neonSql`
      SELECT g.tags AS goal_tags
      FROM issues i
      LEFT JOIN goals g ON g.family_member_id = i.family_member_id
      WHERE i.id = ${issueId}
    `;
    for (const r of rows as Array<Record<string, unknown>>) {
      const lang = languageForTags(r.goal_tags, rules);
      if (lang) return lang;
    }
  }

  if (familyMemberId) {
    const rows = await neonSql`SELECT tags FROM goals WHERE family_member_id = ${familyMemberId}`;
    for (const r of rows as Array<Record<string, unknown>>) {
      const lang = languageForTags(r.tags, rules);
      if (lang) return lang;
    }
  }

  return "en";
}

export async function isRoGoal(input: {
  /** Caller's user_id (UUID). */
  userId?: string;
  /** @deprecated use `userId`. */
  userEmail?: string;
  goalId?: number | null;
  issueId?: number | null;
  journalEntryId?: number | null;
  familyMemberId?: number | null;
}): Promise<boolean> {
  return (await resolveGoalLanguage(input)) === "ro";
}
