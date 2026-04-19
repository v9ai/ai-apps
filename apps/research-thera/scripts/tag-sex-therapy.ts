import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { sql } from "../src/db/neon";

const REGEX =
  "(sex|sexual|sexuality|libido|intimacy|intimate|erotic|desire|arousal|orgasm|porn|masturbat|couples therapy|partner sex|relational sex)";
const TAG = "sex-therapy";

function parseTags(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as string[];
  try {
    const parsed = JSON.parse(raw as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type Row = { id: number; tags: unknown };

async function tagTable(
  name: string,
  selectRows: () => Promise<Row[]>,
  updateRow: (id: number, tagsJson: string) => Promise<unknown>,
) {
  const rows = await selectRows();
  let already = 0;
  let added = 0;
  for (const row of rows) {
    const tags = parseTags(row.tags);
    if (tags.includes(TAG)) {
      already++;
      continue;
    }
    tags.push(TAG);
    await updateRow(row.id, JSON.stringify(tags));
    added++;
  }
  console.log(
    `${name}: matched=${rows.length}, already-tagged=${already}, newly-tagged=${added}`,
  );
}

async function main() {
  console.log(`Applying tag "${TAG}" to entries matching: ${REGEX}\n`);

  await tagTable(
    "goals",
    () =>
      sql`
        SELECT id, tags
        FROM goals
        WHERE (COALESCE(title,'') || ' ' || COALESCE(description,'') || ' ' || COALESCE(therapeutic_text,'')) ~* ${REGEX}
      ` as Promise<Row[]>,
    (id, tagsJson) =>
      sql`UPDATE goals SET tags = ${tagsJson} WHERE id = ${id}`,
  );

  await tagTable(
    "notes",
    () =>
      sql`
        SELECT id, tags
        FROM notes
        WHERE (COALESCE(title,'') || ' ' || COALESCE(content,'')) ~* ${REGEX}
      ` as Promise<Row[]>,
    (id, tagsJson) =>
      sql`UPDATE notes SET tags = ${tagsJson} WHERE id = ${id}`,
  );

  await tagTable(
    "journal_entries",
    () =>
      sql`
        SELECT id, tags
        FROM journal_entries
        WHERE (COALESCE(title,'') || ' ' || COALESCE(content,'')) ~* ${REGEX}
      ` as Promise<Row[]>,
    (id, tagsJson) =>
      sql`UPDATE journal_entries SET tags = ${tagsJson} WHERE id = ${id}`,
  );

  await tagTable(
    "teacher_feedbacks",
    () =>
      sql`
        SELECT id, tags
        FROM teacher_feedbacks
        WHERE (COALESCE(subject,'') || ' ' || COALESCE(content,'')) ~* ${REGEX}
      ` as Promise<Row[]>,
    (id, tagsJson) =>
      sql`UPDATE teacher_feedbacks SET tags = ${tagsJson} WHERE id = ${id}`,
  );

  await tagTable(
    "contact_feedbacks",
    () =>
      sql`
        SELECT id, tags
        FROM contact_feedbacks
        WHERE (COALESCE(subject,'') || ' ' || COALESCE(content,'')) ~* ${REGEX}
      ` as Promise<Row[]>,
    (id, tagsJson) =>
      sql`UPDATE contact_feedbacks SET tags = ${tagsJson} WHERE id = ${id}`,
  );
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
