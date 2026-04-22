import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NEON_DATABASE_URL);

// Print the one malformed row so we can inspect & fix
const bad = await sql.query(
  `SELECT id, first_name, last_name, tags FROM contacts
   WHERE tags IS NOT NULL AND tags <> ''
     AND substring(tags FROM 1 FOR 2) = E'[\\\\'`,
);
console.log("malformed row(s):", bad.length);
bad.forEach((r) => console.log("  id", r.id, r.first_name, r.last_name, "→", r.tags));

// The tags value is a JSON-encoded string (i.e. the whole string was
// JSON.stringify'd once more than it should have been). Decoding with
// JSON.parse once gives the true intended JSON array string.
if (bad.length === 1) {
  const r = bad[0];
  const fixed = JSON.parse(r.tags);
  console.log("decoded →", typeof fixed, JSON.stringify(fixed));
  // Write the corrected JSON array string back.
  await sql.query("UPDATE contacts SET tags = $1 WHERE id = $2", [fixed, r.id]);
  console.log("row", r.id, "updated.");
}
