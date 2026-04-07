"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  brainHealthProtocols,
  protocolSupplements,
  cognitiveBaselines,
  cognitiveCheckIns,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ── Protocol CRUD ─────────────────────────────────────────────────

export async function addProtocol(formData: FormData) {
  const { userId } = await withAuth();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const notes = (formData.get("notes") as string)?.trim() || null;
  const targetAreas = formData.getAll("targetAreas") as string[];
  const startDate = (formData.get("startDate") as string) || null;

  await db.insert(brainHealthProtocols).values({
    userId,
    name,
    targetAreas,
    notes,
    startDate,
  });

  revalidatePath("/protocols");
}

export async function deleteProtocol(id: string) {
  const { userId } = await withAuth();

  const [protocol] = await db
    .select({ id: brainHealthProtocols.id })
    .from(brainHealthProtocols)
    .where(and(eq(brainHealthProtocols.id, id), eq(brainHealthProtocols.userId, userId)));

  if (!protocol) return;

  await db.delete(brainHealthProtocols).where(eq(brainHealthProtocols.id, id));
  revalidatePath("/protocols");
}

export async function updateProtocolStatus(id: string, status: string) {
  const { userId } = await withAuth();

  await db
    .update(brainHealthProtocols)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(brainHealthProtocols.id, id), eq(brainHealthProtocols.userId, userId)));

  revalidatePath(`/protocols/${id}`);
  revalidatePath("/protocols");
}

// ── Supplements ───────────────────────────────────────────────────

export async function addSupplement(protocolId: string, formData: FormData) {
  const { userId } = await withAuth();

  const [protocol] = await db
    .select({ id: brainHealthProtocols.id })
    .from(brainHealthProtocols)
    .where(and(eq(brainHealthProtocols.id, protocolId), eq(brainHealthProtocols.userId, userId)));

  if (!protocol) return;

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const dosage = (formData.get("dosage") as string)?.trim() || "";
  const frequency = (formData.get("frequency") as string)?.trim() || "";
  const mechanism = (formData.get("mechanism") as string)?.trim() || null;
  const targetAreas = formData.getAll("targetAreas") as string[];
  const notes = (formData.get("notes") as string)?.trim() || null;

  await db.insert(protocolSupplements).values({
    protocolId,
    name,
    dosage,
    frequency,
    mechanism,
    targetAreas,
    notes,
  });

  revalidatePath(`/protocols/${protocolId}`);
}

export async function deleteSupplement(id: string, protocolId: string) {
  await withAuth();
  await db.delete(protocolSupplements).where(eq(protocolSupplements.id, id));
  revalidatePath(`/protocols/${protocolId}`);
}

// ── Cognitive Tracking ────────────────────────────────────────────

export async function recordBaseline(protocolId: string, formData: FormData) {
  const { userId } = await withAuth();

  const [protocol] = await db
    .select({ id: brainHealthProtocols.id })
    .from(brainHealthProtocols)
    .where(and(eq(brainHealthProtocols.id, protocolId), eq(brainHealthProtocols.userId, userId)));

  if (!protocol) return;

  const scores = {
    memoryScore: parseFloat(formData.get("memoryScore") as string) || null,
    focusScore: parseFloat(formData.get("focusScore") as string) || null,
    processingSpeedScore: parseFloat(formData.get("processingSpeedScore") as string) || null,
    moodScore: parseFloat(formData.get("moodScore") as string) || null,
    sleepScore: parseFloat(formData.get("sleepScore") as string) || null,
  };

  await db
    .insert(cognitiveBaselines)
    .values({ protocolId, ...scores })
    .onConflictDoUpdate({
      target: cognitiveBaselines.protocolId,
      set: { ...scores, recordedAt: new Date() },
    });

  revalidatePath(`/protocols/${protocolId}`);
}

export async function recordCheckIn(protocolId: string, formData: FormData) {
  const { userId } = await withAuth();

  const [protocol] = await db
    .select({ id: brainHealthProtocols.id })
    .from(brainHealthProtocols)
    .where(and(eq(brainHealthProtocols.id, protocolId), eq(brainHealthProtocols.userId, userId)));

  if (!protocol) return;

  await db.insert(cognitiveCheckIns).values({
    protocolId,
    memoryScore: parseFloat(formData.get("memoryScore") as string) || null,
    focusScore: parseFloat(formData.get("focusScore") as string) || null,
    processingSpeedScore: parseFloat(formData.get("processingSpeedScore") as string) || null,
    moodScore: parseFloat(formData.get("moodScore") as string) || null,
    sleepScore: parseFloat(formData.get("sleepScore") as string) || null,
    sideEffects: (formData.get("sideEffects") as string)?.trim() || null,
    notes: (formData.get("notes") as string)?.trim() || null,
  });

  revalidatePath(`/protocols/${protocolId}`);
}
