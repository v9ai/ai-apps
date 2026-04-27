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
import { ShieldAlert, Trash2 } from "lucide-react";
import {
  useAllergiesQuery,
  useDeleteAllergyMutation,
  AllergiesDocument,
  AllergyKind,
} from "../__generated__/hooks";
import { AuthGate } from "../components/AuthGate";
import { AddAllergyForm } from "./add-allergy-form";

export default function AllergiesPage() {
  return (
    <AuthGate
      pageName="Allergies & Intolerances"
      description="Track and manage your allergies and intolerances. Sign in to access your records."
    >
      <AllergiesContent />
    </AuthGate>
  );
}

function AllergiesContent() {
  const { data, loading, error } = useAllergiesQuery();
  const allergies = data?.allergies ?? [];

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            Allergies &amp; Intolerances
          </Heading>
          <Text size="3" color="gray">
            Track and manage your allergies and intolerances.
          </Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Add an entry</Heading>
          <AddAllergyForm />
        </Flex>

        <Separator size="4" />

        {loading && (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        )}

        {error && (
          <Flex direction="column" align="center" p="6" gap="2">
            <Text color="red">Error loading allergies</Text>
            <Text size="1" color="gray">
              {error.message}
            </Text>
          </Flex>
        )}

        {!loading && !error && allergies.length === 0 && (
          <Flex direction="column" align="center" gap="3" py="9">
            <ShieldAlert size={48} color="var(--gray-8)" />
            <Heading size="4">No allergies or intolerances yet</Heading>
            <Text size="2" color="gray">
              Add an entry above to start tracking.
            </Text>
          </Flex>
        )}

        {!loading && !error && allergies.length > 0 && (
          <Flex direction="column" gap="3">
            <Heading size="4">Your entries ({allergies.length})</Heading>
            <Flex
              direction="column"
              gap="3"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              }}
            >
              {allergies.map((a) => (
                <AllergyCard
                  key={a.id}
                  id={a.id}
                  kind={a.kind}
                  name={a.name}
                  severity={a.severity ?? null}
                  notes={a.notes ?? null}
                  createdAt={a.createdAt}
                />
              ))}
            </Flex>
          </Flex>
        )}
      </Flex>
    </Box>
  );
}

function AllergyCard({
  id,
  kind,
  name,
  severity,
  notes,
  createdAt,
}: {
  id: string;
  kind: AllergyKind;
  name: string;
  severity: string | null;
  notes: string | null;
  createdAt: string;
}) {
  const [deleteAllergy, { loading: deleting }] = useDeleteAllergyMutation({
    refetchQueries: [{ query: AllergiesDocument }],
  });

  const isIntolerance = kind === AllergyKind.Intolerance;

  return (
    <Card>
      <Flex justify="between" align="start" gap="2">
        <Flex direction="column" gap="2" style={{ flexGrow: 1, minWidth: 0 }}>
          <Flex align="center" gap="2" wrap="wrap">
            <Text size="2" weight="medium">
              {name}
            </Text>
            <Badge
              color={isIntolerance ? "amber" : "red"}
              variant="soft"
              size="1"
            >
              {isIntolerance ? "Intolerance" : "Allergy"}
            </Badge>
            {severity && (
              <Badge color="gray" variant="outline" size="1">
                {severity}
              </Badge>
            )}
          </Flex>
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
          <Text size="1" color="gray">
            Added {new Date(createdAt).toLocaleDateString()}
          </Text>
        </Flex>

        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button
              variant="ghost"
              color="gray"
              size="1"
              disabled={deleting}
              aria-label="Delete entry"
            >
              <Trash2 size={14} />
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="400px">
            <AlertDialog.Title>Delete entry?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              This entry will be permanently removed.
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
                  onClick={() => deleteAllergy({ variables: { id } })}
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
