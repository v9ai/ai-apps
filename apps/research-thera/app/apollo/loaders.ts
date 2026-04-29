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

export type GoalRow = {
  id: number;
  userId: string;
  familyMemberId: number | null;
  slug: string | null;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: string;
  priority: string;
  parentGoalId: number | null;
  createdBy: string | null;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
};

function toGoal(row: Record<string, unknown>): GoalRow {
  return {
    id: row.id as number,
    userId: row.user_id as string,
    familyMemberId: (row.family_member_id as number | null) ?? null,
    slug: (row.slug as string | null) ?? null,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    targetDate: (row.target_date as string | null) ?? null,
    status: row.status as string,
    priority: row.priority as string,
    parentGoalId: (row.parent_goal_id as number | null) ?? null,
    createdBy: (row.created_by as string | null) ?? null,
    tags: (row.tags as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export type DoctorRow = {
  id: string;
  userId: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
};

function toDoctor(row: Record<string, unknown>): DoctorRow {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    specialty: (row.specialty as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt:
      row.created_at instanceof Date
        ? (row.created_at as Date).toISOString()
        : (row.created_at as string),
  };
}

export type Loaders = {
  familyMember: DataLoader<number, FamilyMemberRow | null>;
  goal: DataLoader<number, GoalRow | null>;
  doctor: DataLoader<string, DoctorRow | null>;
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
    goal: new DataLoader<number, GoalRow | null>(
      async (ids) => {
        const rows = await neonSql`
          SELECT * FROM goals WHERE id = ANY(${ids as unknown as number[]}::int[])
        `;
        const byId = new Map<number, GoalRow>();
        for (const r of rows) byId.set(r.id as number, toGoal(r));
        return ids.map((id) => byId.get(id) ?? null);
      },
      { cache: true },
    ),
    doctor: new DataLoader<string, DoctorRow | null>(
      async (ids) => {
        const rows = await neonSql`
          SELECT * FROM doctors WHERE id = ANY(${ids as unknown as string[]}::uuid[])
        `;
        const byId = new Map<string, DoctorRow>();
        for (const r of rows) byId.set(r.id as string, toDoctor(r));
        return ids.map((id) => byId.get(id) ?? null);
      },
      { cache: true },
    ),
  };
}
