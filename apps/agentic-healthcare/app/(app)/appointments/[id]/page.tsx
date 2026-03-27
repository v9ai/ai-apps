import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { appointments, familyMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge, Box, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { deleteAppointment } from "../actions";
import { redirect } from "next/navigation";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";

async function AppointmentDetail({ id }: { id: string }) {
  const { userId } = await withAuth();

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, id));

  if (!appointment || appointment.userId !== userId) notFound();

  const familyMember = appointment.familyMemberId
    ? await db
        .select({ id: familyMembers.id, name: familyMembers.name, relationship: familyMembers.relationship })
        .from(familyMembers)
        .where(eq(familyMembers.id, appointment.familyMemberId))
        .then((rows) => rows[0] ?? null)
    : null;

  return (
    <>
      <Flex justify="between" align="start">
        <Flex direction="column" gap="1">
          <Heading size="6">{appointment.title}</Heading>
          <Text size="2" color="gray">
            {appointment.provider && `${appointment.provider} · `}
            {appointment.appointmentDate
              ? new Date(appointment.appointmentDate).toLocaleDateString()
              : `Added ${new Date(appointment.createdAt).toLocaleDateString()}`}
          </Text>
        </Flex>
        <DeleteConfirmButton
          action={async () => {
            "use server";
            await deleteAppointment(id);
            redirect("/appointments");
          }}
          description="This appointment will be permanently deleted."
          variant="icon-red"
        />
      </Flex>

      <Separator size="4" />

      {familyMember && (
        <Flex direction="column" gap="1">
          <Text size="2" weight="medium" color="gray">For</Text>
          <Flex align="center" gap="2">
            <Text size="3" asChild>
              <Link href={`/family/${familyMember.id}`}>{familyMember.name}</Link>
            </Text>
            {familyMember.relationship && (
              <Badge color="blue" radius="full" size="1">{familyMember.relationship}</Badge>
            )}
          </Flex>
        </Flex>
      )}

      {appointment.notes ? (
        <Flex direction="column" gap="1">
          <Text size="2" weight="medium" color="gray">Notes</Text>
          <Text size="3" style={{ whiteSpace: "pre-wrap" }}>{appointment.notes}</Text>
        </Flex>
      ) : (
        <Text size="2" color="gray">No notes added.</Text>
      )}
    </>
  );
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Box py="8" style={{ maxWidth: 600, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Text size="2" asChild>
          <Link href="/appointments" style={{ color: "var(--gray-9)" }}>
            ← Back
          </Link>
        </Text>
        <Suspense fallback={
          <Flex direction="column" gap="4">
            <Skeleton height="32px" width="200px" />
            <Skeleton height="120px" />
          </Flex>
        }>
          <AppointmentDetail id={id} />
        </Suspense>
      </Flex>
    </Box>
  );
}
