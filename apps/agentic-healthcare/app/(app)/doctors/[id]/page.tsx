import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { doctors, appointments } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Box, Badge, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { deleteDoctor } from "../actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { Calendar } from "lucide-react";

async function DoctorDetail({ id }: { id: string }) {
  const { userId } = await withAuth();

  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.id, id));

  if (!doctor || doctor.userId !== userId) notFound();

  const relatedAppointments = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.userId, userId), eq(appointments.doctorId, id)))
    .orderBy(desc(appointments.appointmentDate));

  return (
    <>
      <Flex justify="between" align="start">
        <Flex direction="column" gap="1">
          <Heading size="6">{doctor.name}</Heading>
          {doctor.specialty && <Badge color="blue" variant="soft">{doctor.specialty}</Badge>}
        </Flex>
        <DeleteConfirmButton
          action={async () => {
            "use server";
            await deleteDoctor(id);
            redirect("/doctors");
          }}
          description="This doctor will be permanently deleted."
          variant="icon-red"
        />
      </Flex>

      <Separator size="4" />

      <Flex direction="column" gap="3">
        {doctor.phone && (
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" color="gray">Phone</Text>
            <Text size="3">{doctor.phone}</Text>
          </Flex>
        )}
        {doctor.email && (
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" color="gray">Email</Text>
            <Text size="3">{doctor.email}</Text>
          </Flex>
        )}
        {doctor.address && (
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" color="gray">Address / Clinic</Text>
            <Text size="3">{doctor.address}</Text>
          </Flex>
        )}
        {doctor.notes && (
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" color="gray">Notes</Text>
            <Text size="3" style={{ whiteSpace: "pre-wrap" }}>{doctor.notes}</Text>
          </Flex>
        )}
        {!doctor.phone && !doctor.email && !doctor.address && !doctor.notes && (
          <Text size="2" color="gray">No additional details.</Text>
        )}
      </Flex>

      {relatedAppointments.length > 0 && (
        <>
          <Separator size="4" />
          <Flex direction="column" gap="2">
            <Heading size="4">Appointments</Heading>
            {relatedAppointments.map((a) => (
              <Card key={a.id} asChild className="card-hover">
                <Link href={`/appointments/${a.id}`} style={{ textDecoration: "none" }}>
                  <Flex align="center" gap="2">
                    <Calendar size={14} color="var(--gray-8)" />
                    <Text size="2" weight="medium">{a.title}</Text>
                    {a.appointmentDate && (
                      <Text size="1" color="gray">
                        {new Date(a.appointmentDate).toLocaleDateString()}
                      </Text>
                    )}
                  </Flex>
                </Link>
              </Card>
            ))}
          </Flex>
        </>
      )}
    </>
  );
}

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Box py="8" style={{ maxWidth: 600, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Text size="2" asChild>
          <Link href="/doctors" style={{ color: "var(--gray-9)" }}>
            ← Back
          </Link>
        </Text>
        <Suspense fallback={
          <Flex direction="column" gap="4">
            <Skeleton height="32px" width="200px" />
            <Skeleton height="120px" />
          </Flex>
        }>
          <DoctorDetail id={id} />
        </Suspense>
      </Flex>
    </Box>
  );
}
