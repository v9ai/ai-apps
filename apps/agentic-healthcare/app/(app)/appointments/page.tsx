import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { appointments, doctors, familyMembers } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { Badge, Box, Button, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { AddAppointmentForm } from "./add-form";
import { deleteAppointment } from "./actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { css } from "styled-system/css";

const now = new Date();

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
      <Flex direction="column" align="center" gap="4" py="9">
        <Calendar size={48} color="var(--gray-8)" />
        <Heading size="4" color="gray">No appointments yet</Heading>
        <Text size="2" color="gray">Add an appointment above to stay on top of your schedule.</Text>
      </Flex>
    );
  }

  const upcoming = rows.filter(
    (a) => !a.appointmentDate || new Date(a.appointmentDate) >= now
  );
  const past = rows.filter(
    (a) => a.appointmentDate && new Date(a.appointmentDate) < now
  );

  function AppointmentItem({ a, muted }: { a: typeof rows[0]; muted?: boolean }) {
    const dateObj = a.appointmentDate ? new Date(a.appointmentDate) : null;
    const month = dateObj
      ? dateObj.toLocaleDateString("en-US", { month: "short" })
      : null;
    const day = dateObj ? dateObj.getDate() : null;

    return (
      <Card
        key={a.id}
        asChild
        className={css({
          _hover: {
            transform: "translateY(-1px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          },
          transition: "all 150ms ease",
          opacity: muted ? "0.6" : "1",
        })}
      >
        <Link href={`/appointments/${a.id}`} style={{ textDecoration: "none" }}>
          <Flex gap="4" align="start">
            {/* Date badge */}
            {dateObj ? (
              <Flex
                direction="column"
                align="center"
                justify="center"
                className={css({
                  minWidth: "52px",
                  borderRadius: "8px",
                  padding: "8px 4px",
                  background: muted ? "var(--gray-4)" : "var(--indigo-9)",
                  flexShrink: "0",
                })}
              >
                <Text
                  size="1"
                  weight="bold"
                  className={css({ color: muted ? "var(--gray-9)" : "white", textTransform: "uppercase", letterSpacing: "0.05em" })}
                >
                  {month}
                </Text>
                <Text
                  size="5"
                  weight="bold"
                  className={css({ color: muted ? "var(--gray-9)" : "white", lineHeight: "1" })}
                >
                  {day}
                </Text>
              </Flex>
            ) : (
              <Flex
                align="center"
                justify="center"
                className={css({
                  minWidth: "52px",
                  height: "52px",
                  borderRadius: "8px",
                  background: "var(--gray-3)",
                  flexShrink: "0",
                })}
              >
                <Calendar size={20} color="var(--gray-8)" />
              </Flex>
            )}

            {/* Details */}
            <Flex direction="column" gap="1" className={css({ flex: "1", minWidth: "0" })}>
              <Text size="3" weight="bold" truncate>{a.title}</Text>
              {a.provider && (
                <Text size="2" color="gray">{a.provider}</Text>
              )}
              {a.notes && (
                <Text size="1" color="gray">
                  {a.notes.slice(0, 120)}{a.notes.length > 120 ? "…" : ""}
                </Text>
              )}
              {a.familyMemberName && (
                <Box mt="1">
                  <Badge color="purple" variant="soft" size="1">{a.familyMemberName}</Badge>
                </Box>
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
    );
  }

  return (
    <Flex direction="column" gap="6">
      {upcoming.length > 0 && (
        <Flex direction="column" gap="3">
          <Flex align="center" gap="2">
            <Heading size="4">Upcoming</Heading>
            <Badge color="indigo" variant="soft" size="1">{upcoming.length}</Badge>
          </Flex>
          <Flex direction="column" gap="2">
            {upcoming.map((a) => (
              <AppointmentItem key={a.id} a={a} />
            ))}
          </Flex>
        </Flex>
      )}

      {past.length > 0 && (
        <Flex direction="column" gap="3">
          <Flex align="center" gap="2">
            <Heading size="4" color="gray">Past</Heading>
            <Badge color="gray" variant="soft" size="1">{past.length}</Badge>
          </Flex>
          <Flex direction="column" gap="2">
            {past.map((a) => (
              <AppointmentItem key={a.id} a={a} muted />
            ))}
          </Flex>
        </Flex>
      )}
    </Flex>
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
      <Card variant="surface">
        <Flex direction="column" gap="3">
          <Heading size="4">Add an appointment</Heading>
          <AddAppointmentForm doctors={userDoctors} familyMembers={userFamilyMembers} />
        </Flex>
      </Card>

      <Suspense fallback={
        <Flex direction="column" gap="2">
          <Skeleton height="72px" />
          <Skeleton height="72px" />
          <Skeleton height="72px" />
        </Flex>
      }>
        <AppointmentsList />
      </Suspense>
    </>
  );
}

export default function AppointmentsPage() {
  return (
    <Box py="8" px="4">
      <Flex direction="column" gap="6">
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Flex direction="column" gap="1">
            <Heading size="7" weight="bold">Appointments</Heading>
            <Text size="2" color="gray">Manage your upcoming and past appointments.</Text>
          </Flex>
        </Flex>

        <Separator size="4" />

        <Suspense fallback={
          <Flex direction="column" gap="4">
            <Skeleton height="220px" />
          </Flex>
        }>
          <AppointmentsPageContent />
        </Suspense>
      </Flex>
    </Box>
  );
}
