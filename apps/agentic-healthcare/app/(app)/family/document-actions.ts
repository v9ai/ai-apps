"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { familyDocuments, familyMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function addFamilyDocument(familyMemberId: string, formData: FormData) {
  const { userId } = await withAuth();

  const [member] = await db
    .select({ id: familyMembers.id, slug: familyMembers.slug })
    .from(familyMembers)
    .where(and(eq(familyMembers.id, familyMemberId), eq(familyMembers.userId, userId)));

  if (!member) return;

  const title = (formData.get("title") as string)?.trim();
  if (!title) return;

  const documentType = (formData.get("document_type") as string) || "other";
  const documentDate = (formData.get("document_date") as string) || null;
  const source = (formData.get("source") as string)?.trim() || null;
  const content = (formData.get("content") as string)?.trim() || null;
  const externalUrl = (formData.get("external_url") as string)?.trim() || null;

  await db.insert(familyDocuments).values({
    userId,
    familyMemberId,
    title,
    documentType,
    documentDate,
    source,
    content,
    externalUrl,
  });

  revalidatePath(`/family/${member.slug}`);
}

export async function deleteFamilyDocument(documentId: string, familyMemberSlug: string) {
  const { userId } = await withAuth();

  await db
    .delete(familyDocuments)
    .where(and(eq(familyDocuments.id, documentId), eq(familyDocuments.userId, userId)));

  revalidatePath(`/family/${familyMemberSlug}`);
}
