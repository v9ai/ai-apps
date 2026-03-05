import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Box, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { deleteAppointment } from "../actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";

async function AppointmentDetail({ id }: { id: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: appointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single();

  if (!appointment || appointment.user_id !== user.id) notFound();

  return (
    <>
      <Flex justify="between" align="start">
        <Flex direction="column" gap="1">
          <Heading size="6">{appointment.title}</Heading>
          <Text size="2" color="gray">
            {appointment.provider && `${appointment.provider} · `}
            {appointment.appointment_date
              ? new Date(appointment.appointment_date).toLocaleDateString()
              : `Added ${new Date(appointment.created_at).toLocaleDateString()}`}
          </Text>
        </Flex>
        <DeleteConfirmButton
          action={async () => {
            "use server";
            await deleteAppointment(id);
            redirect("/protected/appointments");
          }}
          description="This appointment will be permanently deleted."
          variant="icon-red"
        />
      </Flex>

      <Separator size="4" />

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
          <Link href="/protected/appointments" style={{ color: "var(--gray-9)" }}>
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
