"use client";

import {
  AlertDialog,
  Badge,
  Button,
  Card,
  Flex,
  Text,
} from "@radix-ui/themes";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import {
  AllergiesDocument,
  AllergyKind,
  useDeleteAllergyMutation,
} from "../__generated__/hooks";

export function AllergyCard({
  id,
  kind,
  name,
  severity,
  notes,
  createdAt,
  personLabel,
  personSlug,
}: {
  id: string;
  kind: AllergyKind;
  name: string;
  severity: string | null;
  notes: string | null;
  createdAt: string;
  personLabel: string | null;
  personSlug?: string | null;
}) {
  const [deleteAllergy, { loading: deleting }] = useDeleteAllergyMutation({
    refetchQueries: [{ query: AllergiesDocument }],
  });

  const isIntolerance = kind === AllergyKind.Intolerance;

  const personBadge = personLabel ? (
    <Badge color="cyan" variant="soft" size="1">
      {personLabel}
    </Badge>
  ) : null;

  return (
    <Card>
      <Flex justify="between" align="start" gap="2">
        <Flex direction="column" gap="2" style={{ flexGrow: 1, minWidth: 0 }}>
          <Flex align="center" gap="2" wrap="wrap">
            {personBadge &&
              (personSlug ? (
                <Link
                  href={`/allergies/${personSlug}`}
                  style={{ textDecoration: "none" }}
                >
                  {personBadge}
                </Link>
              ) : (
                personBadge
              ))}
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
