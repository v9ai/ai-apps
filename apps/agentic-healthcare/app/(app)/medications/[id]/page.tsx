import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { medications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Box, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { deleteMedication } from "../actions";
import { redirect } from "next/navigation";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";

async function MedicationDetail({ id }: { id: string }) {
  const { userId } = await withAuth();

  const [medication] = await db
    .select()
    .from(medications)
    .where(eq(medications.id, id));

  if (!medication || medication.userId !== userId) notFound();

  return (
    <>
      <Flex justify="between" align="start">
        <Flex direction="column" gap="1">
          <Heading size="6">{medication.name}</Heading>
          <Text size="2" color="gray">
            Added {new Date(medication.createdAt).toLocaleDateString()}
          </Text>
        </Flex>
        <DeleteConfirmButton
          action={async () => {
            "use server";
            await deleteMedication(id);
            redirect("/medications");
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
        {(medication.startDate || medication.endDate) && (
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" color="gray">Duration</Text>
            <Text size="3">
              {medication.startDate ? new Date(medication.startDate).toLocaleDateString() : "?"}
              {" — "}
              {medication.endDate ? new Date(medication.endDate).toLocaleDateString() : "ongoing"}
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
          <Link href="/medications" style={{ color: "var(--gray-9)" }}>
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
