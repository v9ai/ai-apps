import DataLoader from "dataloader";
import { sql as neonSql } from "@/src/db/neon";

export type FamilyMemberRow = {
  id: number;
  userId: string;
  slug: string | null;
  firstName: string;
  name: string | null;
  ageYears: number | null;
  relationship: string | null;
  dateOfBirth: string | null;
  bio: string | null;
  allergies: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  occupation: string | null;
  createdAt: string;
  updatedAt: string;
};

function toFamilyMember(row: Record<string, unknown>): FamilyMemberRow {
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
    allergies: (row.allergies as string) || null,
    email: (row.email as string) || null,
    phone: (row.phone as string) || null,
    location: (row.location as string) || null,
    occupation: (row.occupation as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export type Loaders = {
  familyMember: DataLoader<number, FamilyMemberRow | null>;
};

export function createLoaders(): Loaders {
  return {
    familyMember: new DataLoader<number, FamilyMemberRow | null>(
      async (ids) => {
        const rows = await neonSql`
          SELECT * FROM family_members WHERE id = ANY(${ids as unknown as number[]}::int[])
        `;
        const byId = new Map<number, FamilyMemberRow>();
        for (const r of rows) byId.set(r.id as number, toFamilyMember(r));
        return ids.map((id) => byId.get(id) ?? null);
      },
      { cache: true },
    ),
  };
}
