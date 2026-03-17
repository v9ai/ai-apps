import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { medications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Box, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { AddMedicationForm } from "./add-form";
import { deleteMedication } from "./actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { Pill } from "lucide-react";
import Link from "next/link";

async function MedicationsList() {
  const { userId } = await withAuth();

  const rows = await db
    .select()
    .from(medications)
    .where(eq(medications.userId, userId))
    .orderBy(desc(medications.createdAt));

  if (!rows.length) {
    return (
      <Flex direction="column" align="center" gap="3" py="6">
        <Pill size={48} color="var(--gray-8)" />
        <Heading size="4">No medications yet</Heading>
        <Text size="2" color="gray">Add a medication above to keep track of your prescriptions.</Text>
      </Flex>
    );
  }

  return (
    <>
      <Separator size="4" />
      <Flex direction="column" gap="2">
        <Heading size="4">Your medications</Heading>
        {rows.map((m) => (
          <Card key={m.id} asChild className="card-hover">
            <Link href={`/protected/medications/${m.id}`} style={{ textDecoration: "none" }}>
              <Flex justify="between" align="start">
                <Flex direction="column" gap="1">
                  <Text size="2" weight="medium">{m.name}</Text>
                  {m.dosage && (
                    <Text size="1" color="gray">
                      {m.dosage}{m.frequency ? ` - ${m.frequency}` : ""}
                    </Text>
                  )}
                  {m.notes && <Text size="1" color="gray">{m.notes}</Text>}
                </Flex>
                <DeleteConfirmButton
                  action={deleteMedication.bind(null, m.id)}
                  description="This medication will be permanently removed."
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

export default function MedicationsPage() {
  return (
    <Box py="8" style={{ maxWidth: 600, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size="7" weight="bold">Medications</Heading>
          <Text size="2" color="gray">Keep track of your current and past medications.</Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Add a medication</Heading>
          <AddMedicationForm />
        </Flex>

        <Suspense fallback={
          <Flex direction="column" gap="2">
            <Skeleton height="52px" />
            <Skeleton height="52px" />
            <Skeleton height="52px" />
          </Flex>
        }>
          <MedicationsList />
        </Suspense>
      </Flex>
    </Box>
  );
}
