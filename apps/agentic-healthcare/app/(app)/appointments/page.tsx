import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { appointments, doctors, familyMembers } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { Badge, Box, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { AddAppointmentForm } from "./add-form";
import { deleteAppointment } from "./actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { Calendar } from "lucide-react";
import Link from "next/link";

async function AppointmentsList() {
  const { userId } = await withAuth();

  const rows = await db
    .select({
      id: appointments.id,
      title: appointments.title,
      provider: appointments.provider,
      notes: appointments.notes,
      appointmentDate: appointments.appointmentDate,
      familyMemberName: familyMembers.name,
    })
    .from(appointments)
    .leftJoin(familyMembers, eq(appointments.familyMemberId, familyMembers.id))
    .where(eq(appointments.userId, userId))
    .orderBy(desc(appointments.appointmentDate));

  if (!rows.length) {
    return (
      <Flex direction="column" align="center" gap="3" py="6">
        <Calendar size={48} color="var(--gray-8)" />
        <Heading size="4">No appointments yet</Heading>
        <Text size="2" color="gray">Add an appointment above to stay on top of your schedule.</Text>
      </Flex>
    );
  }

  return (
    <>
      <Separator size="4" />
      <Flex direction="column" gap="2">
        <Heading size="4">Your appointments</Heading>
        {rows.map((a) => (
          <Card key={a.id} asChild className="card-hover">
            <Link href={`/appointments/${a.id}`} style={{ textDecoration: "none" }}>
              <Flex justify="between" align="start">
                <Flex direction="column" gap="1">
                  <Text size="2" weight="medium">{a.title}</Text>
                  {a.provider && <Text size="1" color="gray">{a.provider}</Text>}
                  {a.appointmentDate && (
                    <Text size="1" color="gray">
                      {new Date(a.appointmentDate).toLocaleDateString()}
                    </Text>
                  )}
                  {a.notes && (
                    <Text size="1" color="gray">
                      {a.notes.slice(0, 100)}{a.notes.length > 100 ? "..." : ""}
                    </Text>
                  )}
                  {a.familyMemberName && (
                    <Badge color="purple" variant="soft" size="1">{a.familyMemberName}</Badge>
                  )}
                </Flex>
                <DeleteConfirmButton
                  action={deleteAppointment.bind(null, a.id)}
                  description="This appointment will be permanently removed."
                  stopPropagation
                />
              </Flex>
            </Link>
          </Card>
        ))}
      </Flex>
    </>
  );
}

async function AppointmentsPageContent() {
  const { userId } = await withAuth();

  const [userDoctors, userFamilyMembers] = await Promise.all([
    db
      .select({ id: doctors.id, name: doctors.name, specialty: doctors.specialty })
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .orderBy(asc(doctors.name)),
    db
      .select({ id: familyMembers.id, name: familyMembers.name, relationship: familyMembers.relationship })
      .from(familyMembers)
      .where(eq(familyMembers.userId, userId))
      .orderBy(asc(familyMembers.name)),
  ]);

  return (
    <>
      <Flex direction="column" gap="3">
        <Heading size="4">Add an appointment</Heading>
        <AddAppointmentForm doctors={userDoctors} familyMembers={userFamilyMembers} />
      </Flex>

      <Suspense fallback={
        <Flex direction="column" gap="2">
          <Skeleton height="52px" />
          <Skeleton height="52px" />
          <Skeleton height="52px" />
        </Flex>
      }>
        <AppointmentsList />
      </Suspense>
    </>
  );
}

export default function AppointmentsPage() {
  return (
    <Box py="8" style={{ maxWidth: 600, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size="7" weight="bold">Appointments</Heading>
          <Text size="2" color="gray">Manage your upcoming and past appointments.</Text>
        </Flex>

        <Separator size="4" />

        <Suspense fallback={
          <Flex direction="column" gap="3">
            <Skeleton height="200px" />
          </Flex>
        }>
          <AppointmentsPageContent />
        </Suspense>
      </Flex>
    </Box>
  );
}
