import { sql as neonSql } from "./neon";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";

// ────────────────────────────────────────────────────────────────────
// Embedding pipeline (singleton — bge-large-en-v1.5, 1024-dim)
// Mirrors apps/agentic-healthcare/lib/embed.ts
// ────────────────────────────────────────────────────────────────────

let _pipeline: FeatureExtractionPipeline | null = null;

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!_pipeline) {
    const { pipeline } = await import("@huggingface/transformers");
    // @ts-expect-error — union too complex for HF transformers overloads
    _pipeline = await pipeline("feature-extraction", "Xenova/bge-large-en-v1.5", {
      dtype: "q8",
    });
  }
  return _pipeline;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

function vec(arr: number[]): string {
  return `[${arr.join(",")}]`;
}

// ────────────────────────────────────────────────────────────────────
// Dashboard summary — single round-trip count for all categories
// ────────────────────────────────────────────────────────────────────

export type HealthcareSummary = {
  bloodTestsCount: number;
  conditionsCount: number;
  medicationsCount: number;
  symptomsCount: number;
  appointmentsCount: number;
  doctorsCount: number;
  memoryEntriesCount: number;
  protocolsCount: number;
};

// ────────────────────────────────────────────────────────────────────
// Blood tests (rows only — embedding/upload happens in Python /upload)
// ────────────────────────────────────────────────────────────────────

export type BloodTest = {
  id: string;
  userId: string;
  familyMemberId: number | null;
  fileName: string;
  filePath: string;
  status: string;
  testDate: string | null;
  errorMessage: string | null;
  uploadedAt: string;
  markersCount: number;
};

function toBloodTest(r: Record<string, unknown>): BloodTest {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    familyMemberId:
      r.family_member_id == null ? null : Number(r.family_member_id),
    fileName: r.file_name as string,
    filePath: r.file_path as string,
    status: r.status as string,
    testDate:
      r.test_date instanceof Date
        ? r.test_date.toISOString().slice(0, 10)
        : (r.test_date as string | null) ?? null,
    errorMessage: (r.error_message as string | null) ?? null,
    uploadedAt:
      r.uploaded_at instanceof Date
        ? r.uploaded_at.toISOString()
        : (r.uploaded_at as string),
    markersCount: r.markers_count == null ? 0 : Number(r.markers_count),
  };
}

// ────────────────────────────────────────────────────────────────────
// Medical letters (PDFs uploaded against a doctor)
// ────────────────────────────────────────────────────────────────────

export type MedicalLetter = {
  id: string;
  userId: string;
  doctorId: string;
  fileName: string;
  filePath: string;
  description: string | null;
  letterDate: string | null;
  uploadedAt: string;
};

function toMedicalLetter(r: Record<string, unknown>): MedicalLetter {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    doctorId: r.doctor_id as string,
    fileName: r.file_name as string,
    filePath: r.file_path as string,
    description: (r.description as string | null) ?? null,
    letterDate:
      r.letter_date instanceof Date
        ? r.letter_date.toISOString().slice(0, 10)
        : (r.letter_date as string | null) ?? null,
    uploadedAt:
      r.uploaded_at instanceof Date
        ? r.uploaded_at.toISOString()
        : (r.uploaded_at as string),
  };
}

// ────────────────────────────────────────────────────────────────────
// Family documents (PDFs / Drive links scoped to a family member)
// ────────────────────────────────────────────────────────────────────

export type FamilyDocument = {
  id: string;
  userId: string;
  familyMemberId: number;
  title: string;
  documentType: string;
  documentDate: string | null;
  source: string | null;
  content: string | null;
  externalUrl: string | null;
  fileName: string | null;
  filePath: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

function toFamilyDocument(r: Record<string, unknown>): FamilyDocument {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    familyMemberId: Number(r.family_member_id),
    title: r.title as string,
    documentType: r.document_type as string,
    documentDate:
      r.document_date instanceof Date
        ? r.document_date.toISOString().slice(0, 10)
        : (r.document_date as string | null) ?? null,
    source: (r.source as string | null) ?? null,
    content: (r.content as string | null) ?? null,
    externalUrl: (r.external_url as string | null) ?? null,
    fileName: (r.file_name as string | null) ?? null,
    filePath: (r.file_path as string | null) ?? null,
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

export async function listFamilyDocuments(
  familyMemberId: number,
  userId: string,
): Promise<FamilyDocument[]> {
  const rows = await neonSql`
    SELECT id, user_id, family_member_id, title, document_type, document_date,
           source, content, external_url, file_name, file_path, metadata, created_at
    FROM family_documents
    WHERE family_member_id = ${familyMemberId} AND user_id = ${userId}
    ORDER BY COALESCE(document_date::timestamptz, created_at) DESC
  `;
  return rows.map(toFamilyDocument);
}

export async function listMedicalLetters(
  doctorId: string,
  userId: string,
): Promise<MedicalLetter[]> {
  const rows = await neonSql`
    SELECT id, user_id, doctor_id, file_name, file_path, description, letter_date, uploaded_at
    FROM medical_letters
    WHERE doctor_id = ${doctorId} AND user_id = ${userId}
    ORDER BY COALESCE(letter_date::timestamptz, uploaded_at) DESC
  `;
  return rows.map(toMedicalLetter);
}

export async function getMedicalLetter(
  id: string,
  userId: string,
): Promise<MedicalLetter | null> {
  const rows = await neonSql`
    SELECT id, user_id, doctor_id, file_name, file_path, description, letter_date, uploaded_at
    FROM medical_letters
    WHERE id = ${id} AND user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ? toMedicalLetter(rows[0]) : null;
}

export async function createMedicalLetter(params: {
  userId: string;
  doctorId: string;
  fileName: string;
  filePath: string;
  description: string | null;
  letterDate: string | null;
}): Promise<MedicalLetter> {
  const rows = await neonSql`
    INSERT INTO medical_letters (user_id, doctor_id, file_name, file_path, description, letter_date)
    VALUES (${params.userId}, ${params.doctorId}, ${params.fileName}, ${params.filePath}, ${params.description}, ${params.letterDate})
    RETURNING id, user_id, doctor_id, file_name, file_path, description, letter_date, uploaded_at
  `;
  return toMedicalLetter(rows[0]);
}

export async function deleteMedicalLetterRow(
  id: string,
  userId: string,
): Promise<void> {
  await neonSql`
    DELETE FROM medical_letters
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

export async function getDoctor(
  id: string,
  userId: string,
): Promise<Doctor | null> {
  const rows = await neonSql`
    SELECT id, user_id, name, specialty, phone, email, address, notes, created_at
    FROM doctors
    WHERE id = ${id} AND user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ? toDoctor(rows[0]) : null;
}

export async function listBloodTests(userId: string): Promise<BloodTest[]> {
  const rows = await neonSql`
    SELECT t.id, t.user_id, t.family_member_id, t.file_name, t.file_path, t.status, t.test_date,
           t.error_message, t.uploaded_at,
           COALESCE(m.cnt, 0) AS markers_count
    FROM blood_tests t
    LEFT JOIN (
      SELECT test_id, COUNT(*)::int AS cnt
      FROM blood_markers
      GROUP BY test_id
    ) m ON m.test_id = t.id
    WHERE t.user_id = ${userId}
    ORDER BY COALESCE(t.test_date::timestamptz, t.uploaded_at) DESC
  `;
  return rows.map(toBloodTest);
}

export async function getBloodTestsForFamilyMember(
  familyMemberId: number,
  userId: string,
): Promise<BloodTest[]> {
  const rows = await neonSql`
    SELECT t.id, t.user_id, t.family_member_id, t.file_name, t.file_path, t.status, t.test_date,
           t.error_message, t.uploaded_at,
           COALESCE(m.cnt, 0) AS markers_count
    FROM blood_tests t
    LEFT JOIN (
      SELECT test_id, COUNT(*)::int AS cnt
      FROM blood_markers
      GROUP BY test_id
    ) m ON m.test_id = t.id
    WHERE t.family_member_id = ${familyMemberId} AND t.user_id = ${userId}
    ORDER BY COALESCE(t.test_date::timestamptz, t.uploaded_at) DESC
  `;
  return rows.map(toBloodTest);
}

export async function getHealthcareSummary(
  userId: string,
): Promise<HealthcareSummary> {
  const rows = await neonSql`
    SELECT
      (SELECT COUNT(*)::int FROM blood_tests WHERE user_id = ${userId}) AS blood_tests_count,
      (SELECT COUNT(*)::int FROM conditions WHERE user_id = ${userId}) AS conditions_count,
      (SELECT COUNT(*)::int FROM medications WHERE user_id = ${userId}) AS medications_count,
      (SELECT COUNT(*)::int FROM symptoms WHERE user_id = ${userId}) AS symptoms_count,
      (SELECT COUNT(*)::int FROM appointments WHERE user_id = ${userId}) AS appointments_count,
      (SELECT COUNT(*)::int FROM doctors WHERE user_id = ${userId}) AS doctors_count,
      (SELECT COUNT(*)::int FROM memory_entries WHERE user_id = ${userId}) AS memory_entries_count,
      (SELECT COUNT(*)::int FROM brain_health_protocols WHERE user_id = ${userId}) AS protocols_count
  `;
  const r = rows[0];
  return {
    bloodTestsCount: Number(r.blood_tests_count ?? 0),
    conditionsCount: Number(r.conditions_count ?? 0),
    medicationsCount: Number(r.medications_count ?? 0),
    symptomsCount: Number(r.symptoms_count ?? 0),
    appointmentsCount: Number(r.appointments_count ?? 0),
    doctorsCount: Number(r.doctors_count ?? 0),
    memoryEntriesCount: Number(r.memory_entries_count ?? 0),
    protocolsCount: Number(r.protocols_count ?? 0),
  };
}

// ────────────────────────────────────────────────────────────────────
// Conditions
// ────────────────────────────────────────────────────────────────────

export type Condition = {
  id: string;
  userId: string;
  familyMemberId: number | null;
  diagnosingDoctorId: string | null;
  name: string;
  notes: string | null;
  createdAt: string;
};

function toCondition(r: Record<string, unknown>): Condition {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    familyMemberId:
      r.family_member_id == null ? null : Number(r.family_member_id),
    diagnosingDoctorId: (r.diagnosing_doctor_id as string | null) ?? null,
    name: r.name as string,
    notes: (r.notes as string | null) ?? null,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

export async function listConditions(userId: string): Promise<Condition[]> {
  const rows = await neonSql`
    SELECT id, user_id, family_member_id, diagnosing_doctor_id, name, notes, created_at
    FROM conditions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows.map(toCondition);
}

export async function getCondition(
  id: string,
  userId: string,
): Promise<Condition | null> {
  const rows = await neonSql`
    SELECT id, user_id, family_member_id, diagnosing_doctor_id, name, notes, created_at
    FROM conditions
    WHERE id = ${id} AND user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ? toCondition(rows[0]) : null;
}

export async function createCondition(params: {
  userId: string;
  name: string;
  notes: string | null;
  familyMemberId?: number | null;
  diagnosingDoctorId?: string | null;
}): Promise<Condition> {
  const rows = await neonSql`
    INSERT INTO conditions (user_id, family_member_id, diagnosing_doctor_id, name, notes)
    VALUES (
      ${params.userId},
      ${params.familyMemberId ?? null},
      ${params.diagnosingDoctorId ?? null},
      ${params.name},
      ${params.notes}
    )
    RETURNING id, user_id, family_member_id, diagnosing_doctor_id, name, notes, created_at
  `;
  return toCondition(rows[0]);
}

export async function deleteCondition(id: string, userId: string): Promise<void> {
  await neonSql`
    DELETE FROM conditions
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

function formatCondition(name: string, notes: string | null): string {
  return notes
    ? `Health condition: ${name}\nNotes: ${notes}`
    : `Health condition: ${name}`;
}

export async function embedCondition(
  conditionId: string,
  userId: string,
  name: string,
  notes: string | null,
): Promise<void> {
  const content = formatCondition(name, notes);
  const embedding = await generateEmbedding(content);
  await neonSql`
    INSERT INTO condition_embeddings (condition_id, user_id, content, embedding)
    VALUES (${conditionId}, ${userId}, ${content}, ${vec(embedding)}::vector)
    ON CONFLICT (condition_id) DO UPDATE
      SET content = EXCLUDED.content,
          embedding = EXCLUDED.embedding
  `;
}

// ────────────────────────────────────────────────────────────────────
// Medications
// ────────────────────────────────────────────────────────────────────

export type Medication = {
  id: string;
  userId: string;
  familyMemberId: number | null;
  name: string;
  dosage: string | null;
  frequency: string | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
};

function toMedication(r: Record<string, unknown>): Medication {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    familyMemberId:
      r.family_member_id == null ? null : Number(r.family_member_id),
    name: r.name as string,
    dosage: (r.dosage as string | null) ?? null,
    frequency: (r.frequency as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    startDate:
      r.start_date instanceof Date
        ? r.start_date.toISOString().slice(0, 10)
        : (r.start_date as string | null) ?? null,
    endDate:
      r.end_date instanceof Date
        ? r.end_date.toISOString().slice(0, 10)
        : (r.end_date as string | null) ?? null,
    isActive: r.is_active as boolean,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

export async function listMedications(userId: string): Promise<Medication[]> {
  const rows = await neonSql`
    SELECT id, user_id, family_member_id, name, dosage, frequency, notes, start_date, end_date, is_active, created_at
    FROM medications
    WHERE user_id = ${userId}
    ORDER BY is_active DESC, created_at DESC
  `;
  return rows.map(toMedication);
}

export async function getMedicationById(
  id: string,
  userId: string,
): Promise<Medication | null> {
  const rows = await neonSql`
    SELECT id, user_id, family_member_id, name, dosage, frequency, notes, start_date, end_date, is_active, created_at
    FROM medications
    WHERE id = ${id} AND user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ? toMedication(rows[0]) : null;
}

export async function createMedication(params: {
  userId: string;
  familyMemberId?: number | null;
  name: string;
  dosage: string | null;
  frequency: string | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive?: boolean;
}): Promise<Medication> {
  const rows = await neonSql`
    INSERT INTO medications (user_id, family_member_id, name, dosage, frequency, notes, start_date, end_date, is_active)
    VALUES (${params.userId}, ${params.familyMemberId ?? null}, ${params.name}, ${params.dosage}, ${params.frequency}, ${params.notes}, ${params.startDate}, ${params.endDate}, ${params.isActive ?? true})
    RETURNING id, user_id, family_member_id, name, dosage, frequency, notes, start_date, end_date, is_active, created_at
  `;
  return toMedication(rows[0]);
}

export async function setMedicationActive(
  id: string,
  userId: string,
  isActive: boolean,
): Promise<Medication | null> {
  const rows = await neonSql`
    UPDATE medications
    SET is_active = ${isActive}
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, user_id, family_member_id, name, dosage, frequency, notes, start_date, end_date, is_active, created_at
  `;
  return rows[0] ? toMedication(rows[0]) : null;
}

export async function deleteMedication(id: string, userId: string): Promise<void> {
  await neonSql`
    DELETE FROM medications
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

function formatMedication(
  name: string,
  dosage: string | null,
  frequency: string | null,
  notes: string | null,
): string {
  const lines = [`Medication: ${name}`];
  if (dosage) lines.push(`Dosage: ${dosage}`);
  if (frequency) lines.push(`Frequency: ${frequency}`);
  if (notes) lines.push(`Notes: ${notes}`);
  return lines.join("\n");
}

export async function embedMedication(
  medicationId: string,
  userId: string,
  name: string,
  opts: {
    dosage: string | null;
    frequency: string | null;
    notes: string | null;
  },
): Promise<void> {
  const content = formatMedication(name, opts.dosage, opts.frequency, opts.notes);
  const embedding = await generateEmbedding(content);
  await neonSql`
    INSERT INTO medication_embeddings (medication_id, user_id, content, embedding)
    VALUES (${medicationId}, ${userId}, ${content}, ${vec(embedding)}::vector)
    ON CONFLICT (medication_id) DO UPDATE
      SET content = EXCLUDED.content,
          embedding = EXCLUDED.embedding
  `;
}

// ────────────────────────────────────────────────────────────────────
// Symptoms
// ────────────────────────────────────────────────────────────────────

export type Symptom = {
  id: string;
  userId: string;
  description: string;
  severity: string | null;
  loggedAt: string;
  createdAt: string;
};

function toSymptom(r: Record<string, unknown>): Symptom {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    description: r.description as string,
    severity: (r.severity as string | null) ?? null,
    loggedAt:
      r.logged_at instanceof Date
        ? r.logged_at.toISOString()
        : (r.logged_at as string),
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

export async function listSymptoms(userId: string): Promise<Symptom[]> {
  const rows = await neonSql`
    SELECT id, user_id, description, severity, logged_at, created_at
    FROM symptoms
    WHERE user_id = ${userId}
    ORDER BY logged_at DESC
  `;
  return rows.map(toSymptom);
}

export async function createSymptom(params: {
  userId: string;
  description: string;
  severity: string | null;
  loggedAt: string | null;
}): Promise<Symptom> {
  const loggedAt = params.loggedAt ?? new Date().toISOString();
  const rows = await neonSql`
    INSERT INTO symptoms (user_id, description, severity, logged_at)
    VALUES (${params.userId}, ${params.description}, ${params.severity}, ${loggedAt})
    RETURNING id, user_id, description, severity, logged_at, created_at
  `;
  return toSymptom(rows[0]);
}

export async function deleteSymptom(id: string, userId: string): Promise<void> {
  await neonSql`
    DELETE FROM symptoms
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

function formatSymptom(
  description: string,
  severity: string | null,
  loggedAt: string | null,
): string {
  const lines = [`Symptom: ${description}`];
  if (severity) lines.push(`Severity: ${severity}`);
  if (loggedAt) lines.push(`Date: ${loggedAt}`);
  return lines.join("\n");
}

export async function embedSymptom(
  symptomId: string,
  userId: string,
  description: string,
  opts: { severity: string | null; loggedAt: string | null },
): Promise<void> {
  const content = formatSymptom(description, opts.severity, opts.loggedAt);
  const embedding = await generateEmbedding(content);
  await neonSql`
    INSERT INTO symptom_embeddings (symptom_id, user_id, content, embedding)
    VALUES (${symptomId}, ${userId}, ${content}, ${vec(embedding)}::vector)
    ON CONFLICT (symptom_id) DO UPDATE
      SET content = EXCLUDED.content,
          embedding = EXCLUDED.embedding
  `;
}

// ────────────────────────────────────────────────────────────────────
// Allergies & Intolerances
// ────────────────────────────────────────────────────────────────────

export type AllergyKind = "allergy" | "intolerance";

export type Allergy = {
  id: string;
  userId: string;
  familyMemberId: number | null;
  kind: AllergyKind;
  name: string;
  severity: string | null;
  notes: string | null;
  createdAt: string;
};

function toAllergy(r: Record<string, unknown>): Allergy {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    familyMemberId:
      r.family_member_id == null ? null : Number(r.family_member_id),
    kind: ((r.kind as string) === "intolerance" ? "intolerance" : "allergy"),
    name: r.name as string,
    severity: (r.severity as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

export async function listAllergies(userId: string): Promise<Allergy[]> {
  const rows = await neonSql`
    SELECT id, user_id, family_member_id, kind, name, severity, notes, created_at
    FROM allergies
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows.map(toAllergy);
}

export async function createAllergy(params: {
  userId: string;
  familyMemberId: number | null;
  kind: AllergyKind;
  name: string;
  severity: string | null;
  notes: string | null;
}): Promise<Allergy> {
  const rows = await neonSql`
    INSERT INTO allergies (user_id, family_member_id, kind, name, severity, notes)
    VALUES (${params.userId}, ${params.familyMemberId}, ${params.kind}, ${params.name}, ${params.severity}, ${params.notes})
    RETURNING id, user_id, family_member_id, kind, name, severity, notes, created_at
  `;
  return toAllergy(rows[0]);
}

export async function deleteAllergy(id: string, userId: string): Promise<void> {
  await neonSql`
    DELETE FROM allergies
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

function formatAllergy(
  kind: AllergyKind,
  name: string,
  severity: string | null,
  notes: string | null,
): string {
  const lines = [`${kind === "intolerance" ? "Intolerance" : "Allergy"}: ${name}`];
  if (severity) lines.push(`Severity: ${severity}`);
  if (notes) lines.push(`Notes: ${notes}`);
  return lines.join("\n");
}

export async function embedAllergy(
  allergyId: string,
  userId: string,
  kind: AllergyKind,
  name: string,
  opts: { severity: string | null; notes: string | null },
): Promise<void> {
  const content = formatAllergy(kind, name, opts.severity, opts.notes);
  const embedding = await generateEmbedding(content);
  await neonSql`
    INSERT INTO allergy_embeddings (allergy_id, user_id, content, embedding)
    VALUES (${allergyId}, ${userId}, ${content}, ${vec(embedding)}::vector)
    ON CONFLICT (allergy_id) DO UPDATE
      SET content = EXCLUDED.content,
          embedding = EXCLUDED.embedding
  `;
}

// ────────────────────────────────────────────────────────────────────
// Doctors
// ────────────────────────────────────────────────────────────────────

export type Doctor = {
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

function toDoctor(r: Record<string, unknown>): Doctor {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    name: r.name as string,
    specialty: (r.specialty as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    address: (r.address as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

export async function listDoctors(userId: string): Promise<Doctor[]> {
  const rows = await neonSql`
    SELECT id, user_id, name, specialty, phone, email, address, notes, created_at
    FROM doctors
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows.map(toDoctor);
}

export async function createDoctor(params: {
  userId: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}): Promise<Doctor> {
  const rows = await neonSql`
    INSERT INTO doctors (user_id, name, specialty, phone, email, address, notes)
    VALUES (${params.userId}, ${params.name}, ${params.specialty}, ${params.phone}, ${params.email}, ${params.address}, ${params.notes})
    RETURNING id, user_id, name, specialty, phone, email, address, notes, created_at
  `;
  return toDoctor(rows[0]);
}

export async function deleteDoctor(id: string, userId: string): Promise<void> {
  await neonSql`
    DELETE FROM doctors
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

// ────────────────────────────────────────────────────────────────────
// Appointments
// ────────────────────────────────────────────────────────────────────

export type Appointment = {
  id: string;
  userId: string;
  doctorId: string | null;
  familyMemberId: number | null;
  title: string;
  provider: string | null;
  notes: string | null;
  appointmentDate: string | null;
  createdAt: string;
};

function toAppointment(r: Record<string, unknown>): Appointment {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    doctorId: (r.doctor_id as string | null) ?? null,
    familyMemberId:
      r.family_member_id == null ? null : (r.family_member_id as number),
    title: r.title as string,
    provider: (r.provider as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    appointmentDate:
      r.appointment_date instanceof Date
        ? r.appointment_date.toISOString().slice(0, 10)
        : (r.appointment_date as string | null) ?? null,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

export async function listAppointments(userId: string): Promise<Appointment[]> {
  const rows = await neonSql`
    SELECT id, user_id, doctor_id, family_member_id, title, provider, notes, appointment_date, created_at
    FROM appointments
    WHERE user_id = ${userId}
    ORDER BY appointment_date DESC NULLS LAST, created_at DESC
  `;
  return rows.map(toAppointment);
}

export async function createAppointment(params: {
  userId: string;
  doctorId: string | null;
  familyMemberId: number | null;
  title: string;
  provider: string | null;
  notes: string | null;
  appointmentDate: string | null;
}): Promise<Appointment> {
  const rows = await neonSql`
    INSERT INTO appointments (user_id, doctor_id, family_member_id, title, provider, notes, appointment_date)
    VALUES (${params.userId}, ${params.doctorId}, ${params.familyMemberId}, ${params.title}, ${params.provider}, ${params.notes}, ${params.appointmentDate})
    RETURNING id, user_id, doctor_id, family_member_id, title, provider, notes, appointment_date, created_at
  `;
  return toAppointment(rows[0]);
}

export async function deleteAppointment(id: string, userId: string): Promise<void> {
  await neonSql`
    DELETE FROM appointments
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

function formatAppointment(
  title: string,
  provider: string | null,
  notes: string | null,
  appointmentDate: string | null,
): string {
  const lines = [`Appointment: ${title}`];
  if (provider) lines.push(`Provider: ${provider}`);
  if (appointmentDate) lines.push(`Date: ${appointmentDate}`);
  if (notes) lines.push(`Notes: ${notes}`);
  return lines.join("\n");
}

export async function embedAppointment(
  appointmentId: string,
  userId: string,
  title: string,
  opts: {
    provider: string | null;
    notes: string | null;
    appointmentDate: string | null;
  },
): Promise<void> {
  const content = formatAppointment(
    title,
    opts.provider,
    opts.notes,
    opts.appointmentDate,
  );
  const embedding = await generateEmbedding(content);
  await neonSql`
    INSERT INTO appointment_embeddings (appointment_id, user_id, content, embedding)
    VALUES (${appointmentId}, ${userId}, ${content}, ${vec(embedding)}::vector)
    ON CONFLICT (appointment_id) DO UPDATE
      SET content = EXCLUDED.content,
          embedding = EXCLUDED.embedding
  `;
}

// ────────────────────────────────────────────────────────────────────
// Brain / Memory Tracking
// ────────────────────────────────────────────────────────────────────

export type MemoryEntry = {
  id: string;
  userId: string;
  overallScore: number | null;
  shortTermScore: number | null;
  longTermScore: number | null;
  workingMemoryScore: number | null;
  recallSpeed: number | null;
  category: string;
  description: string | null;
  context: string | null;
  protocolId: string | null;
  loggedAt: string;
  createdAt: string;
};

export type MemoryBaseline = {
  id: string;
  userId: string;
  overallScore: number | null;
  shortTermScore: number | null;
  longTermScore: number | null;
  workingMemoryScore: number | null;
  recallSpeed: number | null;
  recordedAt: string;
};

function toMemoryEntry(r: Record<string, unknown>): MemoryEntry {
  const num = (k: string) =>
    r[k] == null ? null : Number(r[k] as number | string);
  return {
    id: r.id as string,
    userId: r.user_id as string,
    overallScore: num("overall_score"),
    shortTermScore: num("short_term_score"),
    longTermScore: num("long_term_score"),
    workingMemoryScore: num("working_memory_score"),
    recallSpeed: num("recall_speed"),
    category: r.category as string,
    description: (r.description as string | null) ?? null,
    context: (r.context as string | null) ?? null,
    protocolId: (r.protocol_id as string | null) ?? null,
    loggedAt:
      r.logged_at instanceof Date
        ? r.logged_at.toISOString()
        : (r.logged_at as string),
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

function toMemoryBaseline(r: Record<string, unknown>): MemoryBaseline {
  const num = (k: string) =>
    r[k] == null ? null : Number(r[k] as number | string);
  return {
    id: r.id as string,
    userId: r.user_id as string,
    overallScore: num("overall_score"),
    shortTermScore: num("short_term_score"),
    longTermScore: num("long_term_score"),
    workingMemoryScore: num("working_memory_score"),
    recallSpeed: num("recall_speed"),
    recordedAt:
      r.recorded_at instanceof Date
        ? r.recorded_at.toISOString()
        : (r.recorded_at as string),
  };
}

export async function listMemoryEntries(userId: string): Promise<MemoryEntry[]> {
  const rows = await neonSql`
    SELECT id, user_id, overall_score, short_term_score, long_term_score,
           working_memory_score, recall_speed, category, description, context,
           protocol_id, logged_at, created_at
    FROM memory_entries
    WHERE user_id = ${userId}
    ORDER BY logged_at DESC
  `;
  return rows.map(toMemoryEntry);
}

export async function getMemoryBaseline(
  userId: string,
): Promise<MemoryBaseline | null> {
  const rows = await neonSql`
    SELECT id, user_id, overall_score, short_term_score, long_term_score,
           working_memory_score, recall_speed, recorded_at
    FROM memory_baseline
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ? toMemoryBaseline(rows[0]) : null;
}

export async function createMemoryEntry(params: {
  userId: string;
  category: string;
  description: string | null;
  context: string | null;
  protocolId: string | null;
  overallScore: number | null;
  shortTermScore: number | null;
  longTermScore: number | null;
  workingMemoryScore: number | null;
  recallSpeed: number | null;
}): Promise<MemoryEntry> {
  const rows = await neonSql`
    INSERT INTO memory_entries (
      user_id, category, description, context, protocol_id,
      overall_score, short_term_score, long_term_score, working_memory_score, recall_speed
    )
    VALUES (
      ${params.userId}, ${params.category}, ${params.description}, ${params.context}, ${params.protocolId},
      ${params.overallScore}, ${params.shortTermScore}, ${params.longTermScore}, ${params.workingMemoryScore}, ${params.recallSpeed}
    )
    RETURNING id, user_id, overall_score, short_term_score, long_term_score,
              working_memory_score, recall_speed, category, description, context,
              protocol_id, logged_at, created_at
  `;
  return toMemoryEntry(rows[0]);
}

export async function deleteMemoryEntry(
  id: string,
  userId: string,
): Promise<void> {
  await neonSql`
    DELETE FROM memory_entries
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

export async function upsertMemoryBaseline(params: {
  userId: string;
  overallScore: number | null;
  shortTermScore: number | null;
  longTermScore: number | null;
  workingMemoryScore: number | null;
  recallSpeed: number | null;
}): Promise<MemoryBaseline> {
  const rows = await neonSql`
    INSERT INTO memory_baseline (
      user_id, overall_score, short_term_score, long_term_score, working_memory_score, recall_speed
    )
    VALUES (
      ${params.userId}, ${params.overallScore}, ${params.shortTermScore}, ${params.longTermScore}, ${params.workingMemoryScore}, ${params.recallSpeed}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      overall_score = EXCLUDED.overall_score,
      short_term_score = EXCLUDED.short_term_score,
      long_term_score = EXCLUDED.long_term_score,
      working_memory_score = EXCLUDED.working_memory_score,
      recall_speed = EXCLUDED.recall_speed,
      recorded_at = NOW()
    RETURNING id, user_id, overall_score, short_term_score, long_term_score,
              working_memory_score, recall_speed, recorded_at
  `;
  return toMemoryBaseline(rows[0]);
}

// ────────────────────────────────────────────────────────────────────
// Brain Health Protocols
// ────────────────────────────────────────────────────────────────────

export type Protocol = {
  id: string;
  userId: string;
  name: string;
  slug: string;
  targetAreas: string[];
  status: string;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  supplementCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ProtocolSupplement = {
  id: string;
  protocolId: string;
  name: string;
  dosage: string;
  frequency: string;
  mechanism: string | null;
  targetAreas: string[];
  notes: string | null;
  url: string | null;
  createdAt: string;
};

export type CognitiveBaseline = {
  id: string;
  protocolId: string;
  memoryScore: number | null;
  focusScore: number | null;
  processingSpeedScore: number | null;
  moodScore: number | null;
  sleepScore: number | null;
  recordedAt: string;
};

export type CognitiveCheckIn = {
  id: string;
  protocolId: string;
  memoryScore: number | null;
  focusScore: number | null;
  processingSpeedScore: number | null;
  moodScore: number | null;
  sleepScore: number | null;
  sideEffects: string | null;
  notes: string | null;
  recordedAt: string;
};

export type ResearchPaperRow = {
  id: string;
  doi: string | null;
  source: string;
  sourceId: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  tldr: string | null;
  url: string | null;
  pdfUrl: string | null;
  citationCount: number | null;
  fieldsOfStudy: string[] | null;
  venue: string | null;
  rerankScore: number | null;
  createdAt: string;
};

function toProtocol(r: Record<string, unknown>): Protocol {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    name: r.name as string,
    slug: r.slug as string,
    targetAreas: Array.isArray(r.target_areas)
      ? (r.target_areas as string[])
      : [],
    status: r.status as string,
    notes: (r.notes as string | null) ?? null,
    startDate:
      r.start_date instanceof Date
        ? r.start_date.toISOString().slice(0, 10)
        : (r.start_date as string | null) ?? null,
    endDate:
      r.end_date instanceof Date
        ? r.end_date.toISOString().slice(0, 10)
        : (r.end_date as string | null) ?? null,
    supplementCount:
      r.supplement_count == null ? 0 : Number(r.supplement_count),
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
    updatedAt:
      r.updated_at instanceof Date
        ? r.updated_at.toISOString()
        : (r.updated_at as string),
  };
}

function toSupplement(r: Record<string, unknown>): ProtocolSupplement {
  return {
    id: r.id as string,
    protocolId: r.protocol_id as string,
    name: r.name as string,
    dosage: r.dosage as string,
    frequency: r.frequency as string,
    mechanism: (r.mechanism as string | null) ?? null,
    targetAreas: Array.isArray(r.target_areas)
      ? (r.target_areas as string[])
      : [],
    notes: (r.notes as string | null) ?? null,
    url: (r.url as string | null) ?? null,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

function toCognitiveBaseline(r: Record<string, unknown>): CognitiveBaseline {
  const num = (k: string) =>
    r[k] == null ? null : Number(r[k] as number | string);
  return {
    id: r.id as string,
    protocolId: r.protocol_id as string,
    memoryScore: num("memory_score"),
    focusScore: num("focus_score"),
    processingSpeedScore: num("processing_speed_score"),
    moodScore: num("mood_score"),
    sleepScore: num("sleep_score"),
    recordedAt:
      r.recorded_at instanceof Date
        ? r.recorded_at.toISOString()
        : (r.recorded_at as string),
  };
}

function toCheckIn(r: Record<string, unknown>): CognitiveCheckIn {
  const num = (k: string) =>
    r[k] == null ? null : Number(r[k] as number | string);
  return {
    id: r.id as string,
    protocolId: r.protocol_id as string,
    memoryScore: num("memory_score"),
    focusScore: num("focus_score"),
    processingSpeedScore: num("processing_speed_score"),
    moodScore: num("mood_score"),
    sleepScore: num("sleep_score"),
    sideEffects: (r.side_effects as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    recordedAt:
      r.recorded_at instanceof Date
        ? r.recorded_at.toISOString()
        : (r.recorded_at as string),
  };
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function listProtocols(userId: string): Promise<Protocol[]> {
  const rows = await neonSql`
    SELECT p.id, p.user_id, p.name, p.slug, p.target_areas, p.status, p.notes,
           p.start_date, p.end_date, p.created_at, p.updated_at,
           COALESCE(s.cnt, 0) AS supplement_count
    FROM brain_health_protocols p
    LEFT JOIN (
      SELECT protocol_id, COUNT(*)::int AS cnt
      FROM protocol_supplements
      GROUP BY protocol_id
    ) s ON s.protocol_id = p.id
    WHERE p.user_id = ${userId}
    ORDER BY p.created_at DESC
  `;
  return rows.map(toProtocol);
}

export async function getProtocolBySlug(
  slug: string,
  userId: string,
): Promise<Protocol | null> {
  const rows = await neonSql`
    SELECT p.id, p.user_id, p.name, p.slug, p.target_areas, p.status, p.notes,
           p.start_date, p.end_date, p.created_at, p.updated_at,
           COALESCE(s.cnt, 0) AS supplement_count
    FROM brain_health_protocols p
    LEFT JOIN (
      SELECT protocol_id, COUNT(*)::int AS cnt
      FROM protocol_supplements
      GROUP BY protocol_id
    ) s ON s.protocol_id = p.id
    WHERE p.slug = ${slug} AND p.user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ? toProtocol(rows[0]) : null;
}

export async function listSupplements(
  protocolId: string,
): Promise<ProtocolSupplement[]> {
  const rows = await neonSql`
    SELECT id, protocol_id, name, dosage, frequency, mechanism, target_areas, notes, url, created_at
    FROM protocol_supplements
    WHERE protocol_id = ${protocolId}
    ORDER BY created_at ASC
  `;
  return rows.map(toSupplement);
}

export async function getCognitiveBaseline(
  protocolId: string,
): Promise<CognitiveBaseline | null> {
  const rows = await neonSql`
    SELECT id, protocol_id, memory_score, focus_score, processing_speed_score,
           mood_score, sleep_score, recorded_at
    FROM cognitive_baselines
    WHERE protocol_id = ${protocolId}
    LIMIT 1
  `;
  return rows[0] ? toCognitiveBaseline(rows[0]) : null;
}

export async function listCheckIns(
  protocolId: string,
): Promise<CognitiveCheckIn[]> {
  const rows = await neonSql`
    SELECT id, protocol_id, memory_score, focus_score, processing_speed_score,
           mood_score, sleep_score, side_effects, notes, recorded_at
    FROM cognitive_check_ins
    WHERE protocol_id = ${protocolId}
    ORDER BY recorded_at DESC
  `;
  return rows.map(toCheckIn);
}

export async function createProtocol(params: {
  userId: string;
  name: string;
  notes: string | null;
  targetAreas: string[];
  startDate: string | null;
}): Promise<Protocol> {
  let slug = toSlug(params.name);
  // Slug collision handling — append short suffix if needed
  const existing = await neonSql`
    SELECT 1 FROM brain_health_protocols WHERE slug = ${slug} LIMIT 1
  `;
  if (existing.length > 0) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const rows = await neonSql`
    INSERT INTO brain_health_protocols (user_id, name, slug, target_areas, notes, start_date)
    VALUES (${params.userId}, ${params.name}, ${slug}, ${JSON.stringify(params.targetAreas)}::jsonb, ${params.notes}, ${params.startDate})
    RETURNING id, user_id, name, slug, target_areas, status, notes, start_date, end_date, created_at, updated_at
  `;
  return toProtocol({ ...rows[0], supplement_count: 0 });
}

export async function deleteProtocol(id: string, userId: string): Promise<void> {
  await neonSql`
    DELETE FROM brain_health_protocols WHERE id = ${id} AND user_id = ${userId}
  `;
}

export async function updateProtocolStatus(
  id: string,
  userId: string,
  status: string,
): Promise<Protocol | null> {
  const rows = await neonSql`
    UPDATE brain_health_protocols
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, user_id, name, slug, target_areas, status, notes, start_date, end_date, created_at, updated_at
  `;
  return rows[0] ? toProtocol({ ...rows[0], supplement_count: 0 }) : null;
}

export async function assertOwnsProtocol(
  protocolId: string,
  userId: string,
): Promise<boolean> {
  const rows = await neonSql`
    SELECT 1 FROM brain_health_protocols
    WHERE id = ${protocolId} AND user_id = ${userId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function createSupplement(params: {
  protocolId: string;
  name: string;
  dosage: string;
  frequency: string;
  mechanism: string | null;
  targetAreas: string[];
  notes: string | null;
  url: string | null;
}): Promise<ProtocolSupplement> {
  const rows = await neonSql`
    INSERT INTO protocol_supplements (
      protocol_id, name, dosage, frequency, mechanism, target_areas, notes, url
    )
    VALUES (
      ${params.protocolId}, ${params.name}, ${params.dosage}, ${params.frequency},
      ${params.mechanism}, ${JSON.stringify(params.targetAreas)}::jsonb, ${params.notes}, ${params.url}
    )
    RETURNING id, protocol_id, name, dosage, frequency, mechanism, target_areas, notes, url, created_at
  `;
  return toSupplement(rows[0]);
}

export async function deleteSupplement(id: string): Promise<void> {
  await neonSql`DELETE FROM protocol_supplements WHERE id = ${id}`;
}

export async function upsertCognitiveBaseline(params: {
  protocolId: string;
  memoryScore: number | null;
  focusScore: number | null;
  processingSpeedScore: number | null;
  moodScore: number | null;
  sleepScore: number | null;
}): Promise<CognitiveBaseline> {
  const rows = await neonSql`
    INSERT INTO cognitive_baselines (
      protocol_id, memory_score, focus_score, processing_speed_score, mood_score, sleep_score
    )
    VALUES (
      ${params.protocolId}, ${params.memoryScore}, ${params.focusScore},
      ${params.processingSpeedScore}, ${params.moodScore}, ${params.sleepScore}
    )
    ON CONFLICT (protocol_id) DO UPDATE SET
      memory_score = EXCLUDED.memory_score,
      focus_score = EXCLUDED.focus_score,
      processing_speed_score = EXCLUDED.processing_speed_score,
      mood_score = EXCLUDED.mood_score,
      sleep_score = EXCLUDED.sleep_score,
      recorded_at = NOW()
    RETURNING id, protocol_id, memory_score, focus_score, processing_speed_score,
              mood_score, sleep_score, recorded_at
  `;
  return toCognitiveBaseline(rows[0]);
}

export async function createCheckIn(params: {
  protocolId: string;
  memoryScore: number | null;
  focusScore: number | null;
  processingSpeedScore: number | null;
  moodScore: number | null;
  sleepScore: number | null;
  sideEffects: string | null;
  notes: string | null;
}): Promise<CognitiveCheckIn> {
  const rows = await neonSql`
    INSERT INTO cognitive_check_ins (
      protocol_id, memory_score, focus_score, processing_speed_score, mood_score, sleep_score,
      side_effects, notes
    )
    VALUES (
      ${params.protocolId}, ${params.memoryScore}, ${params.focusScore},
      ${params.processingSpeedScore}, ${params.moodScore}, ${params.sleepScore},
      ${params.sideEffects}, ${params.notes}
    )
    RETURNING id, protocol_id, memory_score, focus_score, processing_speed_score,
              mood_score, sleep_score, side_effects, notes, recorded_at
  `;
  return toCheckIn(rows[0]);
}
