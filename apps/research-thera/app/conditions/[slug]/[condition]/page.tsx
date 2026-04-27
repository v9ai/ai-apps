"use client";

import { use } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Separator,
  Spinner,
  Text,
} from "@radix-ui/themes";
import { ArrowLeft, Heart } from "lucide-react";
import { words } from "lodash";
import Link from "next/link";
import {
  useConditionsQuery,
  useGetFamilyMemberQuery,
} from "../../../__generated__/hooks";
import { AuthGate } from "../../../components/AuthGate";
import { ConditionDeepResearchPanel } from "../../../components/ConditionDeepResearchPanel";

function slugify(name: string): string {
  return words(name).map((w) => w.toLowerCase()).join("-");
}

export default function PersonConditionDetailPage({
  params,
}: {
  params: Promise<{ slug: string; condition: string }>;
}) {
  const { slug, condition } = use(params);
  return (
    <AuthGate
      pageName="Condition detail"
      description="Sign in to view this condition."
    >
      <PersonConditionDetailContent person={slug} conditionSlug={condition} />
    </AuthGate>
  );
}

function PersonConditionDetailContent({
  person,
  conditionSlug,
}: {
  person: string;
  conditionSlug: string;
}) {
  const memberQ = useGetFamilyMemberQuery({ variables: { slug: person } });
  const conditionsQ = useConditionsQuery();

  const member = memberQ.data?.familyMember;
  const loading = memberQ.loading || conditionsQ.loading;
  const error = memberQ.error ?? conditionsQ.error;

  if (loading) {
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Box py="6">
        <Card>
          <Flex direction="column" gap="2" p="3">
            <Text color="red" weight="medium">
              Error loading page
            </Text>
            <Text size="2" color="gray">
              {error.message}
            </Text>
          </Flex>
        </Card>
      </Box>
    );
  }

  if (!member) {
    return (
      <NotFoundCard
        title="Person not found"
        body={`No family member with the slug "${person}".`}
        backHref="/conditions"
        backLabel="Back to all conditions"
      />
    );
  }

  const personConditions = (conditionsQ.data?.conditions ?? []).filter(
    (c) => c.familyMemberId === member.id,
  );
  const cond = personConditions.find((c) => slugify(c.name) === conditionSlug);

  const personDisplayName =
    member.firstName + (member.name ? ` (${member.name})` : "");

  if (!cond) {
    return (
      <NotFoundCard
        title="Condition not found"
        body={`${personDisplayName} has no condition matching "${conditionSlug}".`}
        backHref={`/conditions/${person}`}
        backLabel={`Back to ${member.firstName}'s conditions`}
      />
    );
  }

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="2">
          <Flex align="center" gap="2" wrap="wrap">
            <Link href="/conditions" style={{ textDecoration: "none" }}>
              <Text size="2" color="gray">
                Conditions
              </Text>
            </Link>
            <Text size="2" color="gray">
              ›
            </Text>
            <Link
              href={`/conditions/${person}`}
              style={{ textDecoration: "none" }}
            >
              <Text size="2" color="gray">
                {personDisplayName}
              </Text>
            </Link>
            <Text size="2" color="gray">
              ›
            </Text>
            <Text size="2" weight="medium">
              {cond.name}
            </Text>
          </Flex>
          <Flex align="center" gap="3" wrap="wrap">
            <Heart size={28} color="var(--indigo-10)" />
            <Heading size={{ initial: "6", md: "8" }} weight="bold">
              {cond.name}
            </Heading>
            <Badge color="indigo" variant="soft">
              Active
            </Badge>
          </Flex>
          <Text size="3" color="gray">
            Tracked for {personDisplayName}.
          </Text>
        </Flex>

        <Separator size="4" />

        <Card>
          <Flex direction="column" gap="3" p="2">
            <Flex direction="column" gap="1">
              <Text size="1" color="gray">
                Notes
              </Text>
              <Text size="3">
                {cond.notes && cond.notes.trim()
                  ? cond.notes
                  : "No notes recorded."}
              </Text>
            </Flex>
            <Separator size="4" />
            <Flex justify="between" gap="3" wrap="wrap">
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Added
                </Text>
                <Text size="2">
                  {new Date(cond.createdAt).toLocaleDateString()}
                </Text>
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Person
                </Text>
                <Text size="2">{personDisplayName}</Text>
              </Flex>
            </Flex>
          </Flex>
        </Card>

        <ConditionDeepResearchPanel
          conditionSlug={conditionSlug}
          memberSlug={person}
        />

        <Box>
          <Link
            href={`/conditions/${person}`}
            style={{ textDecoration: "none" }}
          >
            <Button variant="soft" color="gray">
              <ArrowLeft size={14} /> Back to {member.firstName}&apos;s
              conditions
            </Button>
          </Link>
        </Box>
      </Flex>
    </Box>
  );
}

function NotFoundCard({
  title,
  body,
  backHref,
  backLabel,
}: {
  title: string;
  body: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <Box py="9">
      <Flex direction="column" align="center" gap="3">
        <Heading size="4">{title}</Heading>
        <Text size="2" color="gray">
          {body}
        </Text>
        <Link href={backHref} style={{ textDecoration: "none" }}>
          <Button variant="soft">
            <ArrowLeft size={14} /> {backLabel}
          </Button>
        </Link>
      </Flex>
    </Box>
  );
}
