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
import { Pill, Trash2 } from "lucide-react";
import {
  useMedicationsQuery,
  useDeleteMedicationMutation,
  MedicationsDocument,
} from "../__generated__/hooks";
import { AuthGate } from "../components/AuthGate";
import { AddMedicationForm } from "./add-medication-form";

export default function MedicationsPage() {
  return (
    <AuthGate
      pageName="Medications"
      description="Track and manage your medications. Sign in to access your records."
    >
      <MedicationsContent />
    </AuthGate>
  );
}

function MedicationsContent() {
  const { data, loading, error } = useMedicationsQuery();
  const meds = data?.medications ?? [];

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            Medications
          </Heading>
          <Text size="3" color="gray">
            Track and manage your medications.
          </Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Add a medication</Heading>
          <AddMedicationForm />
        </Flex>

        <Separator size="4" />

        {loading && (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        )}

        {error && (
          <Flex direction="column" align="center" p="6" gap="2">
            <Text color="red">Error loading medications</Text>
            <Text size="1" color="gray">
              {error.message}
            </Text>
          </Flex>
        )}

        {!loading && !error && meds.length === 0 && (
          <Flex direction="column" align="center" gap="3" py="9">
            <Pill size={48} color="var(--gray-8)" />
            <Heading size="4">No medications yet</Heading>
            <Text size="2" color="gray">
              Add a medication above to start tracking.
            </Text>
          </Flex>
        )}

        {!loading && !error && meds.length > 0 && (
          <Flex direction="column" gap="3">
            <Heading size="4">Your medications ({meds.length})</Heading>
            <Flex
              direction="column"
              gap="3"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              }}
            >
              {meds.map((m) => (
                <MedicationCard
                  key={m.id}
                  id={m.id}
                  name={m.name}
                  dosage={m.dosage ?? null}
                  frequency={m.frequency ?? null}
                  notes={m.notes ?? null}
                  startDate={m.startDate ?? null}
                  endDate={m.endDate ?? null}
                />
              ))}
            </Flex>
          </Flex>
        )}
      </Flex>
    </Box>
  );
}

function MedicationCard({
  id,
  name,
  dosage,
  frequency,
  notes,
  startDate,
  endDate,
}: {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
}) {
  const [deleteMed, { loading: deleting }] = useDeleteMedicationMutation({
    refetchQueries: [{ query: MedicationsDocument }],
  });

  return (
    <Card>
      <Flex justify="between" align="start" gap="2">
        <Flex direction="column" gap="2" style={{ flexGrow: 1, minWidth: 0 }}>
          <Flex align="center" gap="2" wrap="wrap">
            <Text size="2" weight="medium">
              {name}
            </Text>
            {dosage && (
              <Badge color="blue" variant="soft" size="1">
                {dosage}
              </Badge>
            )}
          </Flex>
          {frequency && (
            <Text size="1" color="gray">
              {frequency}
            </Text>
          )}
          {notes && (
            <Text
              size="1"
              color="gray"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {notes}
            </Text>
          )}
          {(startDate || endDate) && (
            <Text size="1" color="gray">
              {startDate ?? "?"} → {endDate ?? "ongoing"}
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
              aria-label="Delete medication"
            >
              <Trash2 size={14} />
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="400px">
            <AlertDialog.Title>Delete medication?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              This medication will be permanently removed.
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
                  onClick={() => deleteMed({ variables: { id } })}
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
