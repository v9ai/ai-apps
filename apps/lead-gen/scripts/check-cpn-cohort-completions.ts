import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NEON_DATABASE_URL!);

const REQUIRED_COURSES = [
  "Introduction to agent skills",
  "Building with the Claude API",
  "Introduction to Model Context Protocol",
  "Claude Code in Action",
];

// Cohort = anyone who received a CPN training-path email OR was assigned a @vadim.blog alias
const cohort = (await sql`
  SELECT DISTINCT c.id, c.first_name, c.last_name, c.email, c.alias_email
  FROM contacts c
  LEFT JOIN contact_emails ce ON ce.contact_id = c.id
  WHERE c.alias_email IS NOT NULL
     OR ce.tags LIKE '%cpn-training-path%'
     OR ce.tags LIKE '%cpn-email-ready%'
  ORDER BY c.first_name
`) as Array<{
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  alias_email: string | null;
}>;

console.log(`Cohort size: ${cohort.length}\n`);

interface Status {
  name: string;
  email: string;
  alias: string | null;
  completions: Record<string, string | null>;
  complete: boolean;
  missing: string[];
  extras: string[];
}

const results: Status[] = [];

for (const c of cohort) {
  const name = `${c.first_name} ${c.last_name ?? ""}`.trim();

  const emails = (await sql`
    SELECT received_at, subject
    FROM received_emails
    WHERE subject ILIKE '%completion of%'
      AND (
        matched_contact_id = ${c.id}
        ${c.alias_email ? sql`OR to_emails::text ILIKE ${"%" + c.alias_email + "%"}` : sql``}
      )
    ORDER BY received_at ASC
  `) as Array<{ received_at: string; subject: string }>;

  const completions: Record<string, string | null> = {};
  for (const course of REQUIRED_COURSES) {
    const hit = emails.find((e) =>
      e.subject.toLowerCase().includes(`completion of ${course.toLowerCase()}`),
    );
    completions[course] = hit ? hit.received_at : null;
  }

  // Any completion emails that don't match a required course
  const extras = emails
    .filter((e) => {
      const subj = e.subject.toLowerCase();
      return !REQUIRED_COURSES.some((rc) =>
        subj.includes(`completion of ${rc.toLowerCase()}`),
      );
    })
    .map((e) => e.subject);

  const missing = REQUIRED_COURSES.filter((rc) => !completions[rc]);
  const complete = missing.length === 0;

  results.push({
    name,
    email: c.email,
    alias: c.alias_email,
    completions,
    complete,
    missing,
    extras,
  });
}

// Print summary table
console.log("── CPN cohort completion status ──\n");
for (const r of results) {
  const mark = r.complete ? "✓" : "✗";
  console.log(`${mark} ${r.name} <${r.email}>${r.alias ? ` (${r.alias})` : ""}`);
  for (const course of REQUIRED_COURSES) {
    const when = r.completions[course];
    const cm = when ? "  ✓" : "  ✗";
    console.log(`   ${cm} ${course}${when ? "  " + when : "  — not completed"}`);
  }
  if (r.extras.length > 0) {
    console.log(`   ⚠ off-path completions: ${r.extras.join(", ")}`);
  }
  console.log();
}

const done = results.filter((r) => r.complete).length;
console.log(`── Summary: ${done}/${results.length} complete ──`);
for (const r of results) {
  console.log(
    `  ${r.complete ? "✓" : "✗"} ${r.name.padEnd(30)} ${
      r.complete ? "all 4 done" : `missing: ${r.missing.join(", ")}`
    }`,
  );
}
