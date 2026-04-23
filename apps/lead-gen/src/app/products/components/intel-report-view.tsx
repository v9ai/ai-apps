"use client";

import { Badge, Box, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import { useRunFullProductIntelAsyncMutation } from "@/__generated__/hooks";
import type { ProductIntelReportResult } from "@/lib/langgraph-client";

export type IntelReport = ProductIntelReportResult;

export function IntelReportView({
  data,
  productId,
  isAdmin,
}: {
  data: IntelReport;
  productId: number;
  isAdmin: boolean;
}) {
  const [runIntel, runIntelState] = useRunFullProductIntelAsyncMutation();

  async function onRerun() {
    const res = await runIntel({ variables: { id: productId } });
    const runId = res.data?.runFullProductIntelAsync?.runId;
    if (runId) {
      console.log("[intel] rerun started runId=", runId);
    }
  }

  const priorities = data.top_3_priorities ?? [];
  const risks = data.key_risks ?? [];
  const wins = data.quick_wins ?? [];
  const profile = data.product_profile;

  return (
    <Flex direction="column" gap="5">
      {data.tldr && (
        <Box
          className={css({
            bg: "accent.3",
            border: "1px solid",
            borderColor: "accent.8",
            borderRadius: "md",
            p: "4",
          })}
        >
          <Text weight="bold" size="2" as="div" mb="1">
            TL;DR
          </Text>
          <Text size="3" as="p" className={css({ lineHeight: "1.6" })}>
            {data.tldr}
          </Text>
        </Box>
      )}

      {isAdmin && (
        <Flex gap="2" align="center">
          <button
            type="button"
            onClick={onRerun}
            disabled={runIntelState.loading}
            className={button({ variant: "solid", size: "sm" })}
          >
            <MagicWandIcon />
            <span className={css({ ml: "1" })}>
              {runIntelState.loading ? "Starting…" : "Re-run full pipeline"}
            </span>
          </button>
          {runIntelState.data?.runFullProductIntelAsync?.runId && (
            <Badge color="gray" size="1">
              run {runIntelState.data.runFullProductIntelAsync.runId.slice(0, 8)}
            </Badge>
          )}
        </Flex>
      )}

      {runIntelState.error && (
        <Text color="red" as="p">
          {runIntelState.error.message}
        </Text>
      )}

      {priorities.length > 0 && (
        <Box>
          <Heading size="3" mb="2">
            Top 3 priorities
          </Heading>
          <Flex direction="column" gap="2">
            {priorities.map((p, i) => (
              <Flex
                key={i}
                gap="3"
                align="start"
                className={css({
                  border: "1px solid",
                  borderColor: "ui.border",
                  borderRadius: "sm",
                  p: "3",
                })}
              >
                <Text
                  size="1"
                  weight="bold"
                  className={css({
                    color: "accent.11",
                    bg: "accent.3",
                    px: "2",
                    py: "1",
                    borderRadius: "sm",
                    flexShrink: 0,
                  })}
                >
                  {i + 1}
                </Text>
                <Text size="2" as="p" className={css({ lineHeight: "1.5" })}>
                  {p}
                </Text>
              </Flex>
            ))}
          </Flex>
        </Box>
      )}

      {risks.length > 0 && (
        <Box>
          <Heading size="3" mb="2">
            Key risks
          </Heading>
          <Flex direction="column" gap="2">
            {risks.map((r, i) => (
              <Box
                key={i}
                className={css({
                  border: "1px solid",
                  borderColor: "ui.border",
                  borderRadius: "sm",
                  p: "3",
                })}
              >
                <Flex gap="2" align="start">
                  <Badge color="orange" size="1">
                    risk
                  </Badge>
                  <Text size="2" as="p" className={css({ lineHeight: "1.5" })}>
                    {r}
                  </Text>
                </Flex>
              </Box>
            ))}
          </Flex>
        </Box>
      )}

      {wins.length > 0 && (
        <Box>
          <Heading size="3" mb="2">
            Quick wins
          </Heading>
          <Flex direction="column" gap="2">
            {wins.map((w, i) => (
              <Box
                key={i}
                className={css({
                  border: "1px solid",
                  borderColor: "ui.border",
                  borderRadius: "sm",
                  p: "3",
                })}
              >
                <Flex gap="2" align="start">
                  <Badge color="green" size="1">
                    win
                  </Badge>
                  <Text size="2" as="p" className={css({ lineHeight: "1.5" })}>
                    {w}
                  </Text>
                </Flex>
              </Box>
            ))}
          </Flex>
        </Box>
      )}

      {profile && (
        <>
          <Separator size="4" />
          <Box>
            <Heading size="3" mb="2">
              Product profile
            </Heading>
            <Flex direction="column" gap="2">
              {profile.one_liner && (
                <Text size="3" as="p" className={css({ lineHeight: "1.5" })}>
                  {profile.one_liner}
                </Text>
              )}
              <Flex gap="2" wrap="wrap">
                {profile.category && (
                  <Badge color="indigo" size="1">
                    {profile.category}
                  </Badge>
                )}
                {profile.stated_audience && (
                  <Badge color="gray" size="1">
                    {profile.stated_audience}
                  </Badge>
                )}
                {profile.visible_pricing && (
                  <Badge color="gray" size="1">
                    {profile.visible_pricing}
                  </Badge>
                )}
              </Flex>
              {profile.core_jobs?.length > 0 && (
                <Box mt="2">
                  <Text size="1" color="gray" weight="bold" as="div">
                    Core jobs
                  </Text>
                  <ul
                    className={css({
                      pl: "4",
                      color: "gray.12",
                      fontSize: "sm",
                      listStyle: "disc",
                    })}
                  >
                    {profile.core_jobs.map((j, i) => (
                      <li key={i}>{j}</li>
                    ))}
                  </ul>
                </Box>
              )}
              {profile.key_features?.length > 0 && (
                <Box mt="2">
                  <Text size="1" color="gray" weight="bold" as="div">
                    Key features
                  </Text>
                  <Flex gap="1" wrap="wrap" mt="1">
                    {profile.key_features.map((f, i) => (
                      <Badge key={i} color="gray" size="1">
                        {f}
                      </Badge>
                    ))}
                  </Flex>
                </Box>
              )}
              {profile.tech_signals?.length > 0 && (
                <Box mt="2">
                  <Text size="1" color="gray" weight="bold" as="div">
                    Tech signals
                  </Text>
                  <Flex gap="1" wrap="wrap" mt="1">
                    {profile.tech_signals.map((s, i) => (
                      <Badge key={i} color="gray" size="1">
                        {s}
                      </Badge>
                    ))}
                  </Flex>
                </Box>
              )}
            </Flex>
          </Box>
        </>
      )}
    </Flex>
  );
}
