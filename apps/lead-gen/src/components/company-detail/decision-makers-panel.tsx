"use client";

import * as React from "react";
import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Box, Callout, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { CheckCircledIcon, InfoCircledIcon, PersonIcon, StarFilledIcon } from "@radix-ui/react-icons";
import {
  useGetContactsQuery,
  useFindDecisionMakerMutation,
  useCreateDraftCampaignMutation,
} from "@/__generated__/hooks";
import { Button } from "@/components/ui";
import { css } from "styled-system/css";

type Props = {
  companyId: number;
  companyKey: string;
  isAdmin: boolean;
};

function seniorityColor(
  seniority: string | null | undefined,
): "red" | "orange" | "yellow" | "blue" | "gray" {
  switch (seniority) {
    case "C-level":
    case "Founder":
      return "red";
    case "Partner":
    case "VP":
      return "orange";
    case "Director":
      return "yellow";
    case "Manager":
      return "blue";
    default:
      return "gray";
  }
}

export function DecisionMakersPanel({ companyId, companyKey, isAdmin }: Props) {
  const router = useRouter();

  const { data, loading, refetch } = useGetContactsQuery({
    variables: { companyId, limit: 200 },
    skip: !isAdmin,
    fetchPolicy: "cache-first",
  });

  const contacts = data?.contacts?.contacts ?? [];

  const ranked = useMemo(
    () =>
      [...contacts]
        .filter((c) => (c.authorityScore ?? 0) > 0 || c.isDecisionMaker)
        .sort((a, b) => (b.authorityScore ?? 0) - (a.authorityScore ?? 0)),
    [contacts],
  );

  const classified = useMemo(
    () => ranked.filter((c) => c.isDecisionMaker),
    [ranked],
  );

  const top = classified[0] ?? null;

  const [findDecisionMaker, { loading: classifying, error: classifyError }] =
    useFindDecisionMakerMutation({
      onCompleted: () => {
        void refetch();
      },
    });

  const [createDraftCampaign, { loading: drafting }] =
    useCreateDraftCampaignMutation();

  const handleClassify = useCallback(() => {
    void findDecisionMaker({ variables: { id: companyId, key: companyKey } });
  }, [companyId, companyKey, findDecisionMaker]);

  const handleDraftCampaign = useCallback(
    async (dm: { firstName: string; lastName: string; email: string }) => {
      try {
        await createDraftCampaign({
          variables: {
            input: {
              name: `Decision maker — ${dm.firstName} ${dm.lastName}`.trim(),
              companyId,
              recipientEmails: [dm.email],
            },
          },
        });
        router.push(`/companies/${companyKey}/campaigns`);
      } catch (e) {
        console.error("Draft campaign error:", e);
      }
    },
    [companyId, companyKey, createDraftCampaign, router],
  );

  if (!isAdmin) return null;

  if (loading && contacts.length === 0) {
    return (
      <Card variant="surface">
        <Box p="4">
          <Text size="2" color="gray">
            Loading decision makers…
          </Text>
        </Box>
      </Card>
    );
  }

  if (contacts.length === 0) {
    return null;
  }

  if (!top) {
    return (
      <Card variant="surface">
        <Box p="4">
          <Flex
            direction={{ initial: "column", sm: "row" }}
            justify="between"
            align={{ initial: "stretch", sm: "center" }}
            gap="3"
          >
            <Flex direction="column" gap="1">
              <Flex align="center" gap="2">
                <PersonIcon />
                <Heading size="3">Decision makers</Heading>
              </Flex>
              <Text size="2" color="gray">
                {contacts.length} contact{contacts.length === 1 ? "" : "s"} on file — none classified yet.
              </Text>
            </Flex>
            <Button
              variant="solid"
              size="sm"
              onClick={handleClassify}
              loading={classifying}
              loadingText="Classifying…"
            >
              <PersonIcon />
              Classify decision makers
            </Button>
          </Flex>
          {classifyError && (
            <Callout.Root color="red" mt="3">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>{classifyError.message}</Callout.Text>
            </Callout.Root>
          )}
        </Box>
      </Card>
    );
  }

  const others = classified.slice(1);
  const fullRankingCount = ranked.length;

  return (
    <Card variant="surface">
      <Box p="4">
        <Flex
          direction={{ initial: "column", sm: "row" }}
          justify="between"
          align={{ initial: "stretch", sm: "start" }}
          gap="4"
        >
          <Flex direction="column" gap="3" minWidth="0" flexGrow="1">
            <Flex align="center" gap="2" wrap="wrap">
              <Badge color="green" variant="solid">
                <StarFilledIcon /> DM
              </Badge>
              <Heading size="4">
                <Link
                  href={`/contacts/${top.slug ?? top.id}`}
                  className={css({ color: "inherit", _hover: { textDecoration: "underline" } })}
                >
                  {top.firstName} {top.lastName}
                </Link>
              </Heading>
              <Badge color="gray" variant="soft">
                authority {((top.authorityScore ?? 0) * 100).toFixed(0)}%
              </Badge>
              {top.seniority && (
                <Badge color={seniorityColor(top.seniority)} variant="soft">
                  {top.seniority}
                </Badge>
              )}
              {top.department && top.department !== "Other" && (
                <Badge color="gray" variant="outline">
                  {top.department}
                </Badge>
              )}
            </Flex>
            {top.position && (
              <Text size="2" color="gray">
                {top.position}
              </Text>
            )}
            {top.dmReasons && top.dmReasons.length > 0 && (
              <Box>
                <Text size="1" color="gray" weight="bold">
                  WHY
                </Text>
                <ul className={css({ mt: "1", pl: "4", listStyle: "disc" })}>
                  {top.dmReasons.map((r, i) => (
                    <li key={i}>
                      <Text size="2">{r}</Text>
                    </li>
                  ))}
                </ul>
              </Box>
            )}
          </Flex>
          <Flex direction="column" gap="2" align="end">
            <Button
              variant="solid"
              size="sm"
              disabled={!top.email || drafting}
              loading={drafting}
              loadingText="Drafting…"
              title={top.email ? undefined : "No email on file for this contact"}
              onClick={() => {
                if (!top.email) return;
                void handleDraftCampaign({
                  firstName: top.firstName,
                  lastName: top.lastName,
                  email: top.email,
                });
              }}
            >
              <CheckCircledIcon />
              Draft campaign
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClassify}
              loading={classifying}
              loadingText="Reclassifying…"
            >
              Reclassify
            </Button>
          </Flex>
        </Flex>

        {classifyError && (
          <Callout.Root color="red" mt="3">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>{classifyError.message}</Callout.Text>
          </Callout.Root>
        )}

        {others.length > 0 && (
          <Box mt="3">
            <Text size="1" color="gray" weight="bold">
              OTHER DECISION MAKERS ({others.length})
            </Text>
            <Flex direction="column" gap="1" mt="2">
              {others.slice(0, 5).map((c) => (
                <Flex key={c.id} justify="between" align="center" gap="3">
                  <Text size="2">
                    <Link
                      href={`/contacts/${c.slug ?? c.id}`}
                      className={css({ color: "inherit", _hover: { textDecoration: "underline" } })}
                    >
                      {c.firstName} {c.lastName}
                    </Link>
                    {c.position && (
                      <Text as="span" size="1" color="gray" ml="2">
                        — {c.position}
                      </Text>
                    )}
                  </Text>
                  <Text size="1" color="gray">
                    {((c.authorityScore ?? 0) * 100).toFixed(0)}%
                  </Text>
                </Flex>
              ))}
            </Flex>
          </Box>
        )}

        {fullRankingCount > 1 && (
          <details className={css({ mt: "4" })}>
            <summary
              className={css({
                cursor: "pointer",
                fontSize: "xs",
                color: "gray.11",
                fontWeight: "bold",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              })}
            >
              Full ranking ({fullRankingCount})
            </summary>
            <Flex direction="column" gap="1" mt="2">
              {ranked.map((c) => (
                <Flex key={c.id} justify="between" align="center" gap="3">
                  <Text size="2">
                    <span className={css({ width: "1em", display: "inline-block" })}>
                      {c.isDecisionMaker ? "★" : ""}
                    </span>{" "}
                    <Link
                      href={`/contacts/${c.slug ?? c.id}`}
                      className={css({ color: "inherit", _hover: { textDecoration: "underline" } })}
                    >
                      {c.firstName} {c.lastName}
                    </Link>
                    {c.position && (
                      <Text as="span" size="1" color="gray" ml="2">
                        — {c.position}
                      </Text>
                    )}
                  </Text>
                  <Text size="1" color="gray">
                    {((c.authorityScore ?? 0) * 100).toFixed(0)}%
                  </Text>
                </Flex>
              ))}
            </Flex>
          </details>
        )}
      </Box>
    </Card>
  );
}
