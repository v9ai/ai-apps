import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Box, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { deleteMedication } from "../actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";

async function MedicationDetail({ id }: { id: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: medication } = await supabase
    .from("medications")
    .select("*")
    .eq("id", id)
    .single();

  if (!medication || medication.user_id !== user.id) notFound();

  return (
    <>
      <Flex justify="between" align="start">
        <Flex direction="column" gap="1">
          <Heading size="6">{medication.name}</Heading>
          <Text size="2" color="gray">
            Added {new Date(medication.created_at).toLocaleDateString()}
          </Text>
        </Flex>
        <DeleteConfirmButton
          action={async () => {
            "use server";
            await deleteMedication(id);
            redirect("/protected/medications");
          }}
          description="This medication will be permanently deleted."
          variant="icon-red"
        />
      </Flex>

      <Separator size="4" />

      <Flex direction="column" gap="3">
        {medication.dosage && (
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" color="gray">Dosage</Text>
            <Text size="3">{medication.dosage}</Text>
          </Flex>
        )}
        {medication.frequency && (
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" color="gray">Frequency</Text>
            <Text size="3">{medication.frequency}</Text>
          </Flex>
        )}
        {(medication.start_date || medication.end_date) && (
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" color="gray">Duration</Text>
            <Text size="3">
              {medication.start_date ? new Date(medication.start_date).toLocaleDateString() : "?"}
              {" — "}
              {medication.end_date ? new Date(medication.end_date).toLocaleDateString() : "ongoing"}
            </Text>
          </Flex>
        )}
        {medication.notes ? (
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" color="gray">Notes</Text>
            <Text size="3">{medication.notes}</Text>
          </Flex>
        ) : (
          <Text size="2" color="gray">No notes added.</Text>
        )}
      </Flex>
    </>
  );
}

export default async function MedicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Box py="8" style={{ maxWidth: 600, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Text size="2" asChild>
          <Link href="/protected/medications" style={{ color: "var(--gray-9)" }}>
            ← Back
          </Link>
        </Text>
        <Suspense fallback={
          <Flex direction="column" gap="4">
            <Skeleton height="32px" width="200px" />
            <Skeleton height="120px" />
          </Flex>
        }>
          <MedicationDetail id={id} />
        </Suspense>
      </Flex>
    </Box>
  );
}
