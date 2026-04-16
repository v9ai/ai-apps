"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { familyDocuments, familyMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { uploadFile, deleteFile } from "@/lib/storage";

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

  // Handle file upload to R2
  let fileName: string | null = null;
  let filePath: string | null = null;
  const file = formData.get("file") as File | null;
  if (file && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    fileName = file.name;
    filePath = `family-documents/${userId}/${familyMemberId}/${Date.now()}-${file.name}`;
    await uploadFile(filePath, buffer, file.type);
  }

  await db.insert(familyDocuments).values({
    userId,
    familyMemberId,
    title,
    documentType,
    documentDate,
    source,
    content,
    externalUrl,
    fileName,
    filePath,
  });

  revalidatePath(`/family/${member.slug}`);
}

export async function deleteFamilyDocument(documentId: string, familyMemberSlug: string) {
  const { userId } = await withAuth();

  const [doc] = await db
    .select({ id: familyDocuments.id, filePath: familyDocuments.filePath })
    .from(familyDocuments)
    .where(and(eq(familyDocuments.id, documentId), eq(familyDocuments.userId, userId)));

  if (!doc) return;

  if (doc.filePath) {
    await deleteFile(doc.filePath);
  }

  await db
    .delete(familyDocuments)
    .where(eq(familyDocuments.id, documentId));

  revalidatePath(`/family/${familyMemberSlug}`);
}
