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
import { ArrowLeft, Trash2 } from "lucide-react";
import { useParams, useRouter, notFound } from "next/navigation";
import Link from "next/link";
import {
  useMedicationsQuery,
  useDeleteMedicationMutation,
  MedicationsDocument,
} from "../../../__generated__/hooks";
import { AuthGate } from "../../../components/AuthGate";

export default function MedicationDetailPage() {
  return (
    <AuthGate
      pageName="Medication"
      description="Sign in to view this medication."
    >
      <MedicationDetail />
    </AuthGate>
  );
}

function MedicationDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error } = useMedicationsQuery();
  const [deleteMed, { loading: deleting }] = useDeleteMedicationMutation({
    refetchQueries: [{ query: MedicationsDocument }],
    onCompleted: () => router.push("/medications"),
  });

  if (loading) {
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex direction="column" align="center" p="6" gap="2">
        <Text color="red">Error loading medication</Text>
        <Text size="1" color="gray">
          {error.message}
        </Text>
      </Flex>
    );
  }

  const med = data?.medications.find((m) => m.id === id);
  if (!med) notFound();

  return (
    <Box py="6">
      <Flex direction="column" gap="5">
        <Flex align="center" gap="2">
          <Link href="/medications">
            <Button variant="ghost" color="gray" size="2">
              <ArrowLeft size={14} /> Back
            </Button>
          </Link>
        </Flex>

        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            {med.name}
          </Heading>
          <Flex align="center" gap="2" wrap="wrap">
            {med.dosage && (
              <Badge color="blue" variant="soft">
                {med.dosage}
              </Badge>
            )}
            {med.frequency && (
              <Badge color="gray" variant="soft">
                {med.frequency}
              </Badge>
            )}
          </Flex>
        </Flex>

        <Separator size="4" />

        <Card>
          <Flex direction="column" gap="3">
            {med.notes && (
              <Flex direction="column" gap="1">
                <Text size="1" color="gray" weight="medium">
                  Notes
                </Text>
                <Text size="2" style={{ whiteSpace: "pre-wrap" }}>
                  {med.notes}
                </Text>
              </Flex>
            )}
            {(med.startDate || med.endDate) && (
              <Flex direction="column" gap="1">
                <Text size="1" color="gray" weight="medium">
                  Dates
                </Text>
                <Text size="2">
                  {med.startDate ?? "?"} → {med.endDate ?? "ongoing"}
                </Text>
              </Flex>
            )}
          </Flex>
        </Card>

        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button color="red" variant="soft" disabled={deleting}>
              <Trash2 size={14} /> Delete medication
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="400px">
            <AlertDialog.Title>Delete medication?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              {med.name} will be permanently removed.
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
                  onClick={() => deleteMed({ variables: { id: med.id } })}
                >
                  Delete
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </Flex>
    </Box>
  );
}
