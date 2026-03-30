import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { medications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Box, Button, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { deleteMedication } from "../actions";
import { redirect } from "next/navigation";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import { css } from "styled-system/css";

const twoColLayout = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "var(--space-5)",
  "@media (min-width: 768px)": {
    gridTemplateColumns: "7fr 3fr",
  },
});

const activeAccent = css({
  borderLeft: "3px solid var(--indigo-9)",
  paddingLeft: "var(--space-4)",
});

const inactiveAccent = css({
  borderLeft: "3px solid var(--gray-6)",
  paddingLeft: "var(--space-4)",
});

const metaRow = css({
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-1)",
});

const metaLabel = css({
  fontSize: "var(--font-size-1)",
  color: "var(--gray-9)",
  fontWeight: "500",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
});

function isMedicationActive(endDate: string | null): boolean {
  if (!endDate) return true;
  return new Date(endDate) >= new Date();
}

async function MedicationDetail({ id }: { id: string }) {
  const { userId } = await withAuth();

  const [medication] = await db
    .select()
    .from(medications)
    .where(eq(medications.id, id));

  if (!medication || medication.userId !== userId) notFound();

  const isActive = isMedicationActive(medication.endDate);
  const accentClass = isActive ? activeAccent : inactiveAccent;

  return (
    <>
      <Card>
        <Flex justify="between" align="start" gap="4">
          <div className={accentClass}>
            <Heading size="6">{medication.name}</Heading>
            <Flex align="center" gap="2" mt="1">
              <Text size="2" color="gray">
                Added {new Date(medication.createdAt).toLocaleDateString()}
              </Text>
              <Text size="1" color={isActive ? "indigo" : "gray"}>
                · {isActive ? "Active" : "Past"}
              </Text>
            </Flex>
          </div>
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
      </Card>

      <div className={twoColLayout}>
        <Flex direction="column" gap="4">
          <Card>
            <Flex direction="column" gap="4">
              <Heading size="3">Details</Heading>
              <Separator size="4" />

              {medication.dosage && (
                <div className={metaRow}>
                  <span className={metaLabel}>Dosage</span>
                  <Text size="3">{medication.dosage}</Text>
                </div>
              )}

              {medication.frequency && (
                <div className={metaRow}>
                  <span className={metaLabel}>Frequency</span>
                  <Text size="3">{medication.frequency}</Text>
                </div>
              )}

              {(medication.startDate || medication.endDate) && (
                <div className={metaRow}>
                  <span className={metaLabel}>Duration</span>
                  <Text size="3">
                    {medication.startDate
                      ? new Date(medication.startDate).toLocaleDateString()
                      : "?"}
                    {" — "}
                    {medication.endDate
                      ? new Date(medication.endDate).toLocaleDateString()
                      : "ongoing"}
                  </Text>
                </div>
              )}

              {!medication.dosage && !medication.frequency && !medication.startDate && !medication.endDate && (
                <Text size="2" color="gray">No details recorded.</Text>
              )}
            </Flex>
          </Card>

          {medication.notes ? (
            <Card>
              <Flex direction="column" gap="3">
                <Heading size="3">Notes</Heading>
                <Separator size="4" />
                <Text size="3">{medication.notes}</Text>
              </Flex>
            </Card>
          ) : (
            <Card>
              <Text size="2" color="gray">No notes added.</Text>
            </Card>
          )}
        </Flex>

        <Flex direction="column" gap="4">
          <Card>
            <Flex direction="column" gap="3">
              <Heading size="3">Summary</Heading>
              <Separator size="4" />

              <div className={metaRow}>
                <span className={metaLabel}>Status</span>
                <Text size="2" color={isActive ? "indigo" : "gray"} weight="medium">
                  {isActive ? "Active" : "Past"}
                </Text>
              </div>

              {medication.startDate && (
                <div className={metaRow}>
                  <span className={metaLabel}>Started</span>
                  <Text size="2">
                    {new Date(medication.startDate).toLocaleDateString()}
                  </Text>
                </div>
              )}

              {medication.endDate && (
                <div className={metaRow}>
                  <span className={metaLabel}>Ended</span>
                  <Text size="2">
                    {new Date(medication.endDate).toLocaleDateString()}
                  </Text>
                </div>
              )}

              <div className={metaRow}>
                <span className={metaLabel}>Recorded</span>
                <Text size="2">
                  {new Date(medication.createdAt).toLocaleDateString()}
                </Text>
              </div>
            </Flex>
          </Card>
        </Flex>
      </div>
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
    <Box py="8">
      <Flex direction="column" gap="5">
        <Button variant="ghost" size="1" asChild className={css({ alignSelf: "flex-start" })}>
          <Link href="/medications">
            <ChevronLeftIcon /> Back to medications
          </Link>
        </Button>

        <Suspense fallback={
          <Flex direction="column" gap="4">
            <Skeleton height="80px" />
            <div className={twoColLayout}>
              <Flex direction="column" gap="4">
                <Skeleton height="180px" />
                <Skeleton height="100px" />
              </Flex>
              <Skeleton height="200px" />
            </div>
          </Flex>
        }>
          <MedicationDetail id={id} />
        </Suspense>
      </Flex>
    </Box>
  );
}
