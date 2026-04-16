"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { familyMemberDoctors, familyMembers, doctors } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function linkDoctorToFamilyMember(
  familyMemberId: string,
  doctorId: string,
): Promise<void> {
  const { userId } = await withAuth();

  const [member] = await db
    .select({ id: familyMembers.id, slug: familyMembers.slug })
    .from(familyMembers)
    .where(and(eq(familyMembers.id, familyMemberId), eq(familyMembers.userId, userId)));

  if (!member) return;

  const [doctor] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(and(eq(doctors.id, doctorId), eq(doctors.userId, userId)));

  if (!doctor) return;

  await db
    .insert(familyMemberDoctors)
    .values({ familyMemberId, doctorId })
    .onConflictDoNothing();

  revalidatePath(`/family/${member.slug}`);
  revalidatePath(`/doctors/${doctorId}`);
}

export async function unlinkDoctorFromFamilyMember(
  familyMemberId: string,
  doctorId: string,
): Promise<void> {
  const { userId } = await withAuth();

  const [member] = await db
    .select({ id: familyMembers.id, slug: familyMembers.slug })
    .from(familyMembers)
    .where(and(eq(familyMembers.id, familyMemberId), eq(familyMembers.userId, userId)));

  if (!member) return;

  const [doctor] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(and(eq(doctors.id, doctorId), eq(doctors.userId, userId)));

  if (!doctor) return;

  await db
    .delete(familyMemberDoctors)
    .where(
      and(
        eq(familyMemberDoctors.familyMemberId, familyMemberId),
        eq(familyMemberDoctors.doctorId, doctorId),
      ),
    );

  revalidatePath(`/family/${member.slug}`);
  revalidatePath(`/doctors/${doctorId}`);
}
