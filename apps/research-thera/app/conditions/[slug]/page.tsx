"use client";

import { use } from "react";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Separator,
  Spinner,
  Text,
  Badge,
  AlertDialog,
} from "@radix-ui/themes";
import { ArrowLeft, Heart, Trash2 } from "lucide-react";
import { words } from "lodash";
import Link from "next/link";

function slugify(name: string): string {
  return words(name).map((w) => w.toLowerCase()).join("-");
}
import {
  useConditionsQuery,
  useDeleteConditionMutation,
  useGetFamilyMemberQuery,
  ConditionsDocument,
} from "../../__generated__/hooks";
import { AuthGate } from "../../components/AuthGate";

export default function PersonConditionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return (
    <AuthGate
      pageName="Conditions"
      description="Sign in to view this person's conditions."
    >
      <PersonConditionsContent slug={slug} />
    </AuthGate>
  );
}

function PersonConditionsContent({ slug }: { slug: string }) {
  const {
    data: memberData,
    loading: memberLoading,
    error: memberError,
  } = useGetFamilyMemberQuery({ variables: { slug } });
  const {
    data: conditionsData,
    loading: conditionsLoading,
    error: conditionsError,
  } = useConditionsQuery();

  const member = memberData?.familyMember;
  const loading = memberLoading || conditionsLoading;
  const error = memberError ?? conditionsError;

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
        <Text color="red">Error loading conditions</Text>
        <Text size="1" color="gray">
          {error.message}
        </Text>
      </Flex>
    );
  }

  if (!member) {
    return (
      <Flex direction="column" align="center" gap="3" py="9">
        <Heading size="4">Person not found</Heading>
        <Text size="2" color="gray">
          We couldn&apos;t find anyone with the slug &ldquo;{slug}&rdquo;.
        </Text>
        <Link href="/conditions">
          <Button variant="soft">
            <ArrowLeft size={14} /> Back to all conditions
          </Button>
        </Link>
      </Flex>
    );
  }

  const personConditions = (conditionsData?.conditions ?? []).filter(
    (c) => c.familyMemberId === member.id,
  );
  const personDisplayName =
    member.firstName + (member.name ? ` (${member.name})` : "");

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="2">
          <Link href="/conditions" style={{ textDecoration: "none" }}>
            <Flex align="center" gap="1">
              <ArrowLeft size={14} color="var(--gray-10)" />
              <Text size="2" color="gray">
                All conditions
              </Text>
            </Flex>
          </Link>
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            {personDisplayName}&apos;s conditions
          </Heading>
          <Text size="3" color="gray">
            Health conditions tracked for {personDisplayName}.
          </Text>
        </Flex>

        <Separator size="4" />

        {personConditions.length === 0 ? (
          <Flex direction="column" align="center" gap="3" py="9">
            <Heart size={48} color="var(--gray-8)" />
            <Heading size="4">No conditions yet</Heading>
            <Text size="2" color="gray">
              {personDisplayName} has no conditions on file.
            </Text>
          </Flex>
        ) : (
          <Flex direction="column" gap="3">
            <Heading size="4">
              Conditions ({personConditions.length})
            </Heading>
            <Box
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "var(--space-3)",
              }}
            >
              {personConditions.map((c) => (
                <ConditionCard
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  notes={c.notes ?? null}
                  createdAt={c.createdAt}
                  detailHref={`/conditions/${slug}/${slugify(c.name)}`}
                />
              ))}
            </Box>
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
  detailHref,
}: {
  id: string;
  name: string;
  notes: string | null;
  createdAt: string;
  detailHref: string;
}) {
  const [deleteCondition, { loading: deleting }] = useDeleteConditionMutation({
    refetchQueries: [{ query: ConditionsDocument }],
  });

  return (
    <Card>
      <Flex justify="between" align="start" gap="2">
        <Flex direction="column" gap="2" style={{ flexGrow: 1, minWidth: 0 }}>
          <Flex align="center" gap="2" wrap="wrap">
            <Link href={detailHref} style={{ textDecoration: "none" }}>
              <Text size="2" weight="medium">
                {name}
              </Text>
            </Link>
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
