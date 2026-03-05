import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Box, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { AddAppointmentForm } from "./add-form";
import { deleteAppointment } from "./actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { Calendar } from "lucide-react";
import Link from "next/link";

async function AppointmentsList() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .order("appointment_date", { ascending: false, nullsFirst: false });

  if (!appointments?.length) {
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
        {appointments.map((a) => (
          <Card key={a.id} asChild className="card-hover">
            <Link href={`/protected/appointments/${a.id}`} style={{ textDecoration: "none" }}>
              <Flex justify="between" align="start">
                <Flex direction="column" gap="1">
                  <Text size="2" weight="medium">{a.title}</Text>
                  {a.provider && <Text size="1" color="gray">{a.provider}</Text>}
                  {a.appointment_date && (
                    <Text size="1" color="gray">
                      {new Date(a.appointment_date).toLocaleDateString()}
                    </Text>
                  )}
                  {a.notes && (
                    <Text size="1" color="gray">
                      {a.notes.slice(0, 100)}{a.notes.length > 100 ? "..." : ""}
                    </Text>
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

export default function AppointmentsPage() {
  return (
    <Box py="8" style={{ maxWidth: 600, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size="7" weight="bold">Appointments</Heading>
          <Text size="2" color="gray">Manage your upcoming and past appointments.</Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Add an appointment</Heading>
          <AddAppointmentForm />
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
      </Flex>
    </Box>
  );
}
