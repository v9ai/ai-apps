"use client";

import {
  Box,
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  Separator,
  Spinner,
  Button,
  AlertDialog,
} from "@radix-ui/themes";
import { CalendarDays, Trash2 } from "lucide-react";
import {
  useAppointmentsQuery,
  useDeleteAppointmentMutation,
  useDoctorsQuery,
  useGetFamilyMembersQuery,
  AppointmentsDocument,
} from "../__generated__/hooks";
import { AuthGate } from "../components/AuthGate";
import { AddAppointmentForm } from "./add-appointment-form";

export default function AppointmentsPage() {
  return (
    <AuthGate
      pageName="Appointments"
      description="Track doctor visits across your family. Sign in to access your records."
    >
      <AppointmentsContent />
    </AuthGate>
  );
}

function AppointmentsContent() {
  const { data, loading, error } = useAppointmentsQuery();
  const { data: doctorsData } = useDoctorsQuery();
  const { data: familyData } = useGetFamilyMembersQuery();

  const appointments = data?.appointments ?? [];
  const doctors = doctorsData?.doctors ?? [];
  const family = familyData?.familyMembers ?? [];

  const doctorName = (id: string | null | undefined) =>
    id ? doctors.find((d) => d.id === id)?.name ?? null : null;
  const familyName = (id: number | null | undefined) =>
    id != null
      ? family.find((m) => m.id === id)?.firstName ?? null
      : null;

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            Appointments
          </Heading>
          <Text size="3" color="gray">
            Upcoming and past doctor visits.
          </Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Schedule an appointment</Heading>
          <AddAppointmentForm doctors={doctors} family={family} />
        </Flex>

        <Separator size="4" />

        {loading && (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        )}

        {error && (
          <Flex direction="column" align="center" p="6" gap="2">
            <Text color="red">Error loading appointments</Text>
            <Text size="1" color="gray">
              {error.message}
            </Text>
          </Flex>
        )}

        {!loading && !error && appointments.length === 0 && (
          <Flex direction="column" align="center" gap="3" py="9">
            <CalendarDays size={48} color="var(--gray-8)" />
            <Heading size="4">No appointments yet</Heading>
            <Text size="2" color="gray">
              Schedule one above to start tracking.
            </Text>
          </Flex>
        )}

        {!loading && !error && appointments.length > 0 && (
          <Flex direction="column" gap="3">
            <Heading size="4">All appointments ({appointments.length})</Heading>
            <Flex direction="column" gap="2">
              {appointments.map((a) => (
                <AppointmentRow
                  key={a.id}
                  id={a.id}
                  title={a.title}
                  provider={a.provider ?? null}
                  notes={a.notes ?? null}
                  appointmentDate={a.appointmentDate ?? null}
                  doctorName={doctorName(a.doctorId)}
                  familyMemberName={familyName(a.familyMemberId)}
                />
              ))}
            </Flex>
          </Flex>
        )}
      </Flex>
    </Box>
  );
}

function AppointmentRow({
  id,
  title,
  provider,
  notes,
  appointmentDate,
  doctorName,
  familyMemberName,
}: {
  id: string;
  title: string;
  provider: string | null;
  notes: string | null;
  appointmentDate: string | null;
  doctorName: string | null;
  familyMemberName: string | null;
}) {
  const [deleteAppointment, { loading: deleting }] = useDeleteAppointmentMutation({
    refetchQueries: [{ query: AppointmentsDocument }],
  });

  return (
    <Card>
      <Flex justify="between" align="start" gap="3">
        <Flex direction="column" gap="2" style={{ flexGrow: 1, minWidth: 0 }}>
          <Flex align="center" gap="2" wrap="wrap">
            <Text size="2" weight="medium">
              {title}
            </Text>
            {appointmentDate && (
              <Badge color="indigo" variant="soft" size="1">
                {appointmentDate}
              </Badge>
            )}
            {familyMemberName && (
              <Badge color="purple" variant="soft" size="1">
                For {familyMemberName}
              </Badge>
            )}
          </Flex>
          <Flex gap="2" wrap="wrap">
            {doctorName && (
              <Text size="1" color="gray">
                Doctor: {doctorName}
              </Text>
            )}
            {provider && (
              <Text size="1" color="gray">
                Provider: {provider}
              </Text>
            )}
          </Flex>
          {notes && (
            <Text size="1" color="gray">
              {notes}
            </Text>
          )}
        </Flex>

        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button
              variant="ghost"
              color="gray"
              size="1"
              disabled={deleting}
              aria-label="Delete appointment"
            >
              <Trash2 size={14} />
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="400px">
            <AlertDialog.Title>Delete appointment?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              This appointment will be permanently removed.
            </AlertDialog.Description>
            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button
                  color="red"
                  onClick={() => deleteAppointment({ variables: { id } })}
                >
                  Delete
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </Flex>
    </Card>
  );
}
