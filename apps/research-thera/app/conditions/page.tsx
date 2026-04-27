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
import { Heart, Trash2 } from "lucide-react";
import {
  useConditionsQuery,
  useDeleteConditionMutation,
  ConditionsDocument,
} from "../__generated__/hooks";
import { AuthGate } from "../components/AuthGate";
import { AddConditionForm } from "./add-condition-form";

export default function ConditionsPage() {
  return (
    <AuthGate
      pageName="Conditions"
      description="Track and manage your health conditions. Sign in to access your records."
    >
      <ConditionsContent />
    </AuthGate>
  );
}

function ConditionsContent() {
  const { data, loading, error } = useConditionsQuery();
  const conditions = data?.conditions ?? [];

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            Conditions
          </Heading>
          <Text size="3" color="gray">
            Track and manage your health conditions.
          </Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Add a condition</Heading>
          <AddConditionForm />
        </Flex>

        <Separator size="4" />

        {loading && (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        )}

        {error && (
          <Flex direction="column" align="center" p="6" gap="2">
            <Text color="red">Error loading conditions</Text>
            <Text size="1" color="gray">
              {error.message}
            </Text>
          </Flex>
        )}

        {!loading && !error && conditions.length === 0 && (
          <Flex direction="column" align="center" gap="3" py="9">
            <Heart size={48} color="var(--gray-8)" />
            <Heading size="4">No conditions yet</Heading>
            <Text size="2" color="gray">
              Add a condition above to start tracking your health.
            </Text>
          </Flex>
        )}

        {!loading && !error && conditions.length > 0 && (
          <Flex direction="column" gap="3">
            <Heading size="4">Your conditions ({conditions.length})</Heading>
            <Flex
              direction="column"
              gap="3"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              }}
            >
              {conditions.map((c) => (
                <ConditionCard
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  notes={c.notes ?? null}
                  createdAt={c.createdAt}
                />
              ))}
            </Flex>
          </Flex>
        )}
      </Flex>
    </Box>
  );
}

function ConditionCard({
  id,
  name,
  notes,
  createdAt,
}: {
  id: string;
  name: string;
  notes: string | null;
  createdAt: string;
}) {
  const [deleteCondition, { loading: deleting }] = useDeleteConditionMutation({
    refetchQueries: [{ query: ConditionsDocument }],
  });

  return (
    <Card>
      <Flex justify="between" align="start" gap="2">
        <Flex direction="column" gap="2" style={{ flexGrow: 1, minWidth: 0 }}>
          <Flex align="center" gap="2" wrap="wrap">
            <Text size="2" weight="medium">
              {name}
            </Text>
            <Badge color="indigo" variant="soft" size="1">
              Active
            </Badge>
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
              aria-label="Delete condition"
            >
              <Trash2 size={14} />
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="400px">
            <AlertDialog.Title>Delete condition?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              This condition will be permanently removed.
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
                  onClick={() => deleteCondition({ variables: { id } })}
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
