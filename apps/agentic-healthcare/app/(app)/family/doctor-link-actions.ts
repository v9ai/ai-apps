"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { familyMemberDoctors, familyMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function linkDoctorToFamilyMember(formData: FormData) {
  const { userId } = await withAuth();

  const familyMemberId = formData.get("familyMemberId") as string;
  const doctorId = formData.get("doctorId") as string;

  if (!familyMemberId || !doctorId) return;

  // Verify the family member belongs to this user
  const [member] = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(and(eq(familyMembers.id, familyMemberId), eq(familyMembers.userId, userId)));

  if (!member) return;

  await db
    .insert(familyMemberDoctors)
    .values({ familyMemberId, doctorId })
    .onConflictDoNothing();

  revalidatePath(`/family/${familyMemberId}`);
}

export async function unlinkDoctorFromFamilyMember(formData: FormData) {
  const { userId } = await withAuth();

  const familyMemberId = formData.get("familyMemberId") as string;
  const doctorId = formData.get("doctorId") as string;

  if (!familyMemberId || !doctorId) return;

  // Verify the family member belongs to this user
  const [member] = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(and(eq(familyMembers.id, familyMemberId), eq(familyMembers.userId, userId)));

  if (!member) return;

  await db
    .delete(familyMemberDoctors)
    .where(
      and(
        eq(familyMemberDoctors.familyMemberId, familyMemberId),
        eq(familyMemberDoctors.doctorId, doctorId),
      ),
    );

  revalidatePath(`/family/${familyMemberId}`);
}
