import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const MIGRATIONS_DIR = join(__dirname, "../migrations");

function readMigration(filename: string): string {
  return readFileSync(join(MIGRATIONS_DIR, filename), "utf-8");
}

// ---------------------------------------------------------------------------
// Migration file inventory
// ---------------------------------------------------------------------------
describe("migration files", () => {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();

  it("has all expected pgvector migrations", () => {
    const pgvectorFiles = files.filter(
      (f) =>
        f.includes("pgvector") ||
        f.includes("marker_embeddings") ||
        f.includes("condition_embeddings") ||
        f.includes("trend_detection") ||
        f.includes("hybrid_search") ||
        f.includes("switch_to_qwen") ||
        f.includes("medications") ||
        f.includes("symptoms") ||
        f.includes("appointments")
    );
    expect(pgvectorFiles).toContain("20260304000000_pgvector_embeddings.sql");
    expect(pgvectorFiles).toContain("20260305000000_marker_embeddings.sql");
    expect(pgvectorFiles).toContain("20260305100000_condition_embeddings.sql");
    expect(pgvectorFiles).toContain("20260305200000_trend_detection.sql");
    expect(pgvectorFiles).toContain("20260305300000_hybrid_search.sql");
    expect(pgvectorFiles).toContain("20260305400000_switch_to_qwen_1024.sql");
    expect(pgvectorFiles).toContain("20260305500000_medications.sql");
    expect(pgvectorFiles).toContain("20260305600000_symptoms.sql");
    expect(pgvectorFiles).toContain("20260305700000_appointments.sql");
  });

  it("migrations are in chronological order", () => {
    const timestamps = files.map((f) => f.split("_")[0]);
    const sorted = [...timestamps].sort();
    expect(timestamps).toEqual(sorted);
  });
});

// ---------------------------------------------------------------------------
// Medications migration
// ---------------------------------------------------------------------------
describe("medications migration", () => {
  const sql = readMigration("20260305500000_medications.sql");

  it("creates medications table", () => {
    expect(sql).toContain("create table public.medications");
  });

  it("has required columns", () => {
    expect(sql).toContain("user_id uuid");
    expect(sql).toContain("name text not null");
    expect(sql).toContain("dosage text");
    expect(sql).toContain("frequency text");
    expect(sql).toContain("notes text");
    expect(sql).toContain("start_date date");
    expect(sql).toContain("end_date date");
  });

  it("enables RLS", () => {
    expect(sql).toContain("enable row level security");
  });

  it("creates embedding table with vector(1024)", () => {
    expect(sql).toContain("create table public.medication_embeddings");
    expect(sql).toContain("vector(1024)");
  });

  it("creates HNSW index", () => {
    expect(sql).toContain("using hnsw");
    expect(sql).toContain("vector_cosine_ops");
  });

  it("creates match_medications RPC", () => {
    expect(sql).toContain("function public.match_medications");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("auth.uid()");
  });

  it("has ON DELETE CASCADE on medication_id FK", () => {
    expect(sql).toMatch(/references public\.medications\(id\) on delete cascade/);
  });

  it("has unique constraint on medication_id", () => {
    expect(sql).toMatch(/medication_id uuid.*not null unique/s);
  });
});

// ---------------------------------------------------------------------------
// Symptoms migration
// ---------------------------------------------------------------------------
describe("symptoms migration", () => {
  const sql = readMigration("20260305600000_symptoms.sql");

  it("creates symptoms table", () => {
    expect(sql).toContain("create table public.symptoms");
  });

  it("has severity check constraint", () => {
    expect(sql).toContain("check (severity in ('mild', 'moderate', 'severe'))");
  });

  it("has logged_at timestamp", () => {
    expect(sql).toContain("logged_at timestamptz");
  });

  it("enables RLS on both tables", () => {
    const rlsMatches = sql.match(/enable row level security/g);
    expect(rlsMatches?.length).toBe(2);
  });

  it("creates embedding table with vector(1024)", () => {
    expect(sql).toContain("create table public.symptom_embeddings");
    expect(sql).toContain("vector(1024)");
  });

  it("creates HNSW index", () => {
    expect(sql).toContain("using hnsw");
    expect(sql).toContain("vector_cosine_ops");
  });

  it("creates match_symptoms RPC with security invoker", () => {
    expect(sql).toContain("function public.match_symptoms");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("auth.uid()");
  });
});

// ---------------------------------------------------------------------------
// Appointments migration
// ---------------------------------------------------------------------------
describe("appointments migration", () => {
  const sql = readMigration("20260305700000_appointments.sql");

  it("creates appointments table", () => {
    expect(sql).toContain("create table public.appointments");
  });

  it("has required columns", () => {
    expect(sql).toContain("title text not null");
    expect(sql).toContain("provider text");
    expect(sql).toContain("notes text");
    expect(sql).toContain("appointment_date date");
  });

  it("enables RLS on both tables", () => {
    const rlsMatches = sql.match(/enable row level security/g);
    expect(rlsMatches?.length).toBe(2);
  });

  it("creates embedding table with vector(1024)", () => {
    expect(sql).toContain("create table public.appointment_embeddings");
    expect(sql).toContain("vector(1024)");
  });

  it("creates HNSW index", () => {
    expect(sql).toContain("using hnsw");
    expect(sql).toContain("vector_cosine_ops");
  });

  it("creates match_appointments RPC with security invoker", () => {
    expect(sql).toContain("function public.match_appointments");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("auth.uid()");
  });

  it("has ON DELETE CASCADE on appointment_id FK", () => {
    expect(sql).toMatch(/references public\.appointments\(id\) on delete cascade/);
  });
});

// ---------------------------------------------------------------------------
// Cross-migration consistency
// ---------------------------------------------------------------------------
describe("cross-migration consistency", () => {
  const medications = readMigration("20260305500000_medications.sql");
  const symptoms = readMigration("20260305600000_symptoms.sql");
  const appointments = readMigration("20260305700000_appointments.sql");

  it("all new migrations use vector(1024) consistently", () => {
    for (const sql of [medications, symptoms, appointments]) {
      expect(sql).toContain("vector(1024)");
      expect(sql).not.toContain("vector(1536)");
    }
  });

  it("all new RPCs use security invoker", () => {
    for (const sql of [medications, symptoms, appointments]) {
      expect(sql).toContain("security invoker");
    }
  });

  it("all new RPCs filter by auth.uid()", () => {
    for (const sql of [medications, symptoms, appointments]) {
      expect(sql).toContain("auth.uid()");
    }
  });

  it("all new RPCs use cosine distance operator", () => {
    for (const sql of [medications, symptoms, appointments]) {
      expect(sql).toContain("<=>");
    }
  });

  it("all new embedding tables have HNSW indexes", () => {
    for (const sql of [medications, symptoms, appointments]) {
      expect(sql).toContain("using hnsw");
    }
  });
});
