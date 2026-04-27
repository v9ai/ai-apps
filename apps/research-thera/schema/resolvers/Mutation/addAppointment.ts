import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const addAppointment: NonNullable<MutationResolvers['addAppointment']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const title = args.input.title.trim();
  if (!title) throw new Error("Appointment title is required");

  const provider = args.input.provider?.trim() || null;
  const notes = args.input.notes?.trim() || null;
  const appointmentDate = args.input.appointmentDate || null;
  const doctorId = args.input.doctorId || null;
  const familyMemberId = args.input.familyMemberId ?? null;

  const appointment = await db.createAppointment({
    userId: userEmail,
    doctorId,
    familyMemberId,
    title,
    provider,
    notes,
    appointmentDate,
  });

  try {
    await db.embedAppointment(appointment.id, userEmail, title, {
      provider,
      notes,
      appointmentDate,
    });
  } catch (err) {
    console.error("[addAppointment] embedding failed:", err);
  }

  return appointment;
};
