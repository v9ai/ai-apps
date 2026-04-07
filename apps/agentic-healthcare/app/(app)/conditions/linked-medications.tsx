import { Badge, Callout, Card, Flex, Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Pill } from "lucide-react";
import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { conditionMedications, medications } from "@/lib/db/schema";
import { and, asc, eq, notInArray } from "drizzle-orm";
import { linkMedicationToCondition, unlinkMedicationFromCondition } from "./medication-link-actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { LinkMedicationForm } from "./link-medication-form";
import { QuickAddMedicationForm } from "./quick-add-medication-form";
import { css } from "styled-system/css";

const medCardClass = css({
  textDecoration: "none",
  transition: "box-shadow 0.15s ease",
  display: "block",
  _hover: {
    boxShadow: "0 2px 8px var(--shadow-3)",
  },
});

export async function LinkedMedications({ conditionId }: { conditionId: string }) {
  const { userId } = await withAuth();

  const linkedMeds = await db
    .select({
      id: medications.id,
      name: medications.name,
      dosage: medications.dosage,
      frequency: medications.frequency,
    })
    .from(conditionMedications)
    .innerJoin(medications, eq(conditionMedications.medicationId, medications.id))
    .where(eq(conditionMedications.conditionId, conditionId))
    .orderBy(asc(medications.name));

  const linkedIds = linkedMeds.map((m) => m.id);
  const availableMeds = await db
    .select({ id: medications.id, name: medications.name, dosage: medications.dosage })
    .from(medications)
    .where(
      linkedIds.length > 0
        ? and(eq(medications.userId, userId), notInArray(medications.id, linkedIds))
        : eq(medications.userId, userId),
    )
    .orderBy(asc(medications.name));

  return (
    <Card>
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Flex align="center" gap="2">
            <Pill size={16} style={{ color: "var(--indigo-11)" }} />
            <Heading size="3">Linked Medications</Heading>
            {linkedMeds.length > 0 && (
              <Badge color="indigo" variant="soft" size="1">
                {linkedMeds.length}
              </Badge>
            )}
          </Flex>
          <Text size="1" color="gray">
            Medications associated with this condition.
          </Text>
        </Flex>

        {linkedMeds.length === 0 ? (
          <Callout.Root color="gray">
            <Callout.Text>
              No medications linked yet. Add or link one below.
            </Callout.Text>
          </Callout.Root>
        ) : (
          <Flex direction="column" gap="2">
            {linkedMeds.map((m) => (
              <Card key={m.id} asChild variant="surface" className={medCardClass}>
                <Link href={`/medications/${m.id}`}>
                  <Flex justify="between" align="start">
                    <Flex direction="column" gap="1">
                      <Text size="2" weight="medium">{m.name}</Text>
                      {m.dosage && (
                        <Text size="1" color="indigo">
                          {m.dosage}{m.frequency ? ` \u00B7 ${m.frequency}` : ""}
                        </Text>
                      )}
                    </Flex>
                    <DeleteConfirmButton
                      action={unlinkMedicationFromCondition.bind(null, conditionId, m.id)}
                      description="This medication will be unlinked from this condition."
                      stopPropagation
                    />
                  </Flex>
                </Link>
              </Card>
            ))}
          </Flex>
        )}

        {availableMeds.length > 0 && (
          <LinkMedicationForm
            conditionId={conditionId}
            availableMedications={availableMeds}
            linkAction={linkMedicationToCondition}
          />
        )}

        <QuickAddMedicationForm conditionId={conditionId} />
      </Flex>
    </Card>
  );
}
