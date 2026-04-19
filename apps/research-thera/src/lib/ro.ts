import { sql as neonSql } from "@/src/db/neon";

export const SEX_THERAPY_TAG = "sex-therapy";

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

function hasSexTherapy(tags: unknown): boolean {
  return parseTags(tags).includes(SEX_THERAPY_TAG);
}

export async function isSexTherapyGoal(input: {
  goalId?: number | null;
  issueId?: number | null;
  journalEntryId?: number | null;
  familyMemberId?: number | null;
}): Promise<boolean> {
  const { goalId, issueId, journalEntryId, familyMemberId } = input;

  if (goalId) {
    const rows = await neonSql`SELECT tags FROM goals WHERE id = ${goalId} LIMIT 1`;
    if (rows[0] && hasSexTherapy(rows[0].tags)) return true;
  }

  if (journalEntryId) {
    const rows = await neonSql`
      SELECT je.tags AS entry_tags, g.tags AS goal_tags
      FROM journal_entries je
      LEFT JOIN goals g ON g.id = je.goal_id
      WHERE je.id = ${journalEntryId}
      LIMIT 1
    `;
    if (rows[0] && (hasSexTherapy(rows[0].entry_tags) || hasSexTherapy(rows[0].goal_tags))) {
      return true;
    }
  }

  if (issueId) {
    const rows = await neonSql`
      SELECT g.tags AS goal_tags
      FROM issues i
      LEFT JOIN goals g ON g.family_member_id = i.family_member_id
      WHERE i.id = ${issueId}
    `;
    if (rows.some((r: Record<string, unknown>) => hasSexTherapy(r.goal_tags))) return true;
  }

  if (familyMemberId) {
    const rows = await neonSql`SELECT tags FROM goals WHERE family_member_id = ${familyMemberId}`;
    if (rows.some((r: Record<string, unknown>) => hasSexTherapy(r.tags))) return true;
  }

  return false;
}
