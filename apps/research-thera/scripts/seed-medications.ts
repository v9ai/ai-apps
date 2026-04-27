/**
 * Seed 12 medications into production for nicolai.vadim@gmail.com so they show
 * at https://researchthera.com/medications/me.
 *
 * Run: pnpm tsx scripts/seed-medications.ts
 *
 * Env required:
 *   NEON_DATABASE_URL — production target (wandering-dew-31821015 / neondb)
 *
 * Idempotent: skips items whose `name` already exists for this user.
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

if (!process.env.NEON_DATABASE_URL) {
  throw new Error("NEON_DATABASE_URL is required (.env.local)");
}

const USER_ID = "nicolai.vadim@gmail.com";

type Item = {
  name: string;
  brand?: string;
  expiration?: string | null;
  lot?: string;
  notes?: string;
};

const ITEMS: Item[] = [
  {
    name: "Vitamin B Complex Forte",
    brand: "Dr.Max",
    notes: "batch/exp code visible on foil back but not legible from photo",
  },
  { name: "Ocean Plus", brand: "Ocean Plus" },
  { name: "Magnesium 500 Depot", brand: "Doppelherz aktiv" },
  {
    name: "Lemon Balm (Melissa officinalis)",
    brand: "Vitaking",
    expiration: "2026-09-11",
  },
  { name: "Melatonină", brand: "Dr.Max" },
  { name: "Happy Sleep", brand: "Dr.Max" },
  { name: "Hepatoprotect Forte (Silimarină 150 mg)", brand: "Biofarm" },
  {
    name: "Premium KSM-66 Ashwagandha",
    brand: "Boost4Life",
    expiration: "2026-09",
    lot: "0903N",
  },
  {
    name: "Rhodiola Rosavins (bottle A)",
    brand: "Zenyth",
    expiration: "2026-07-16",
    lot: "1707",
  },
  {
    name: "Rhodiola Rosavins (bottle B)",
    brand: "Zenyth",
    expiration: "2027-03-16",
    lot: "1703",
  },
  {
    name: "Passiflora Extract",
    brand: "Rotta Natura",
    expiration: "2027-02",
    lot: "58-13",
  },
  {
    name: "Unidentified box (barcode 5425010391910)",
    expiration: "2026-08",
    lot: "24H17",
  },
];

const FULL_DATE = /^\d{4}-\d{2}-\d{2}$/;

function buildNotes(item: Item): string | null {
  const lines: string[] = [];
  if (item.brand) lines.push(`Brand: ${item.brand}`);
  if (item.lot) lines.push(`Lot: ${item.lot}`);
  if (item.expiration && !FULL_DATE.test(item.expiration)) {
    lines.push(`Expires: ${item.expiration}`);
  }
  if (item.notes) lines.push(item.notes);
  return lines.length ? lines.join("\n") : null;
}

function buildEndDate(item: Item): string | null {
  return item.expiration && FULL_DATE.test(item.expiration)
    ? item.expiration
    : null;
}

async function main() {
  const { db } = await import("../src/db");

  const existing = await db.listMedications(USER_ID);
  const existingNames = new Set(existing.map((m) => m.name));

  let created = 0;
  let skipped = 0;
  let embedFailed = 0;

  for (const item of ITEMS) {
    if (existingNames.has(item.name)) {
      console.log(`skip (exists): ${item.name}`);
      skipped++;
      continue;
    }

    const notes = buildNotes(item);
    const endDate = buildEndDate(item);

    const med = await db.createMedication({
      userId: USER_ID,
      familyMemberId: null,
      name: item.name,
      dosage: null,
      frequency: null,
      notes,
      startDate: null,
      endDate,
    });

    console.log(`created ${med.id}  ${med.name}`);
    created++;

    try {
      await db.embedMedication(med.id, USER_ID, med.name, {
        dosage: null,
        frequency: null,
        notes,
      });
    } catch (err) {
      embedFailed++;
      console.warn(`  embed failed for ${med.name}:`, (err as Error).message);
    }
  }

  console.log(
    `\ndone — created=${created}  skipped=${skipped}  embed_failed=${embedFailed}  total=${ITEMS.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
