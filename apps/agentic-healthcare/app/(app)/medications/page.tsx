import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { medications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Box, Button, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { AddMedicationForm } from "./add-form";
import { deleteMedication } from "./actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { Pill } from "lucide-react";
import Link from "next/link";
import { css } from "styled-system/css";

const medicationGrid = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: "3",
});

const activeCard = css({
  borderLeft: "3px solid var(--indigo-9)",
  textDecoration: "none",
  transition: "box-shadow 0.15s ease, transform 0.15s ease",
  display: "block",
  _hover: {
    boxShadow: "0 4px 16px var(--shadow-3)",
    transform: "translateY(-1px)",
  },
});

const inactiveCard = css({
  borderLeft: "3px solid var(--gray-6)",
  textDecoration: "none",
  transition: "box-shadow 0.15s ease, transform 0.15s ease",
  display: "block",
  _hover: {
    boxShadow: "0 4px 16px var(--shadow-3)",
    transform: "translateY(-1px)",
  },
});

const emptyState = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-3)",
  padding: "var(--space-9) var(--space-4)",
  borderRadius: "var(--radius-3)",
  background: "var(--gray-2)",
  textAlign: "center",
});

function isMedicationActive(endDate: string | null): boolean {
  if (!endDate) return true;
  return new Date(endDate) >= new Date();
}

async function MedicationsList() {
  const { userId } = await withAuth();

  const rows = await db
    .select()
    .from(medications)
    .where(eq(medications.userId, userId))
    .orderBy(desc(medications.createdAt));

  if (!rows.length) {
    return (
      <div className={emptyState}>
        <Pill size={48} color="var(--gray-8)" />
        <Heading size="4">No medications yet</Heading>
        <Text size="2" color="gray">
          Add a medication to keep track of your prescriptions.
        </Text>
      </div>
    );
  }

  const active = rows.filter((m) => isMedicationActive(m.endDate));
  const inactive = rows.filter((m) => !isMedicationActive(m.endDate));

  return (
    <Flex direction="column" gap="6">
      {active.length > 0 && (
        <Flex direction="column" gap="3">
          <Flex align="center" gap="2">
            <Heading size="4">Active</Heading>
            <Text size="1" color="gray">({active.length})</Text>
          </Flex>
          <div className={medicationGrid}>
            {active.map((m) => (
              <Card key={m.id} asChild className={activeCard}>
                <Link href={`/medications/${m.id}`}>
                  <Flex justify="between" align="start">
                    <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 0 }}>
                      <Text size="2" weight="bold">{m.name}</Text>
                      {m.dosage && (
                        <Text size="1" color="indigo">
                          {m.dosage}{m.frequency ? ` · ${m.frequency}` : ""}
                        </Text>
                      )}
                      {m.startDate && (
                        <Text size="1" color="gray">
                          Since {new Date(m.startDate).toLocaleDateString()}
                        </Text>
                      )}
                      {m.notes && (
                        <Text size="1" color="gray" className={css({ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
                          {m.notes}
                        </Text>
                      )}
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
          </div>
        </Flex>
      )}

      {inactive.length > 0 && (
        <Flex direction="column" gap="3">
          <Flex align="center" gap="2">
            <Heading size="4">Past</Heading>
            <Text size="1" color="gray">({inactive.length})</Text>
          </Flex>
          <div className={medicationGrid}>
            {inactive.map((m) => (
              <Card key={m.id} asChild className={inactiveCard}>
                <Link href={`/medications/${m.id}`}>
                  <Flex justify="between" align="start">
                    <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 0 }}>
                      <Text size="2" weight="bold" color="gray">{m.name}</Text>
                      {m.dosage && (
                        <Text size="1" color="gray">
                          {m.dosage}{m.frequency ? ` · ${m.frequency}` : ""}
                        </Text>
                      )}
                      {m.endDate && (
                        <Text size="1" color="gray">
                          Ended {new Date(m.endDate).toLocaleDateString()}
                        </Text>
                      )}
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
          </div>
        </Flex>
      )}
    </Flex>
  );
}

export default function MedicationsPage() {
  return (
    <Box py="8">
      <Flex direction="column" gap="6">
        <Flex justify="between" align="center">
          <Flex direction="column" gap="1">
            <Heading size="7" weight="bold">Medications</Heading>
            <Text size="2" color="gray">Keep track of your current and past prescriptions.</Text>
          </Flex>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Heading size="4">Add a medication</Heading>
          </Flex>
          <AddMedicationForm />
        </Flex>

        <Separator size="4" />

        <Suspense fallback={
          <div className={medicationGrid}>
            <Skeleton height="88px" />
            <Skeleton height="88px" />
            <Skeleton height="88px" />
            <Skeleton height="88px" />
          </div>
        }>
          <MedicationsList />
        </Suspense>
      </Flex>
    </Box>
  );
}
