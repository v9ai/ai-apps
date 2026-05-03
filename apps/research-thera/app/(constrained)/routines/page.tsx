"use client";

import NextLink from "next/link";
import {
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Callout,
} from "@radix-ui/themes";
import { InfoCircledIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { useGetFamilyMembersQuery } from "@/app/__generated__/hooks";
import { AuthGate } from "@/app/components/AuthGate";

function RoutinesIndex() {
  const { data, loading, error } = useGetFamilyMembersQuery();
  const members = (data?.familyMembers ?? []).filter((m) => !!m.slug);

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" justify="between" wrap="wrap" gap="3">
        <Heading size="6">Routines</Heading>
      </Flex>

      <Callout.Root color="indigo" variant="surface">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          A routine groups active habits by cadence. Pick a family member to view their
          daily and weekly routine.
        </Callout.Text>
      </Callout.Root>

      {loading ? (
        <Flex justify="center" py="6">
          <Spinner size="3" />
        </Flex>
      ) : error ? (
        <Card>
          <Text color="red" m="2">
            {error.message}
          </Text>
        </Card>
      ) : members.length === 0 ? (
        <Card>
          <Flex direction="column" gap="2" p="2">
            <Text size="2" color="gray">
              No family members with a slug yet. Add someone on the{" "}
              <NextLink href="/family" style={{ textDecoration: "underline" }}>
                Family page
              </NextLink>{" "}
              to start building their routine.
            </Text>
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="2">
          {members.map((m) => {
            const displayName = m.name || m.firstName || m.slug;
            return (
              <Card key={m.id} asChild>
                <NextLink
                  href={`/routines/${m.slug}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Flex align="center" justify="between" gap="3" p="2">
                    <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
                      <Text weight="medium">{displayName}</Text>
                      <Flex gap="2" wrap="wrap">
                        {m.relationship ? (
                          <Badge variant="soft" color="indigo" size="1">
                            {m.relationship}
                          </Badge>
                        ) : null}
                        {m.ageYears ? (
                          <Badge variant="soft" color="gray" size="1">
                            {m.ageYears} y/o
                          </Badge>
                        ) : null}
                      </Flex>
                    </Flex>
                    <ChevronRightIcon />
                  </Flex>
                </NextLink>
              </Card>
            );
          })}
        </Flex>
      )}
    </Flex>
  );
}

export default function RoutinesPage() {
  return (
    <AuthGate pageName="Routines">
      <RoutinesIndex />
    </AuthGate>
  );
}
