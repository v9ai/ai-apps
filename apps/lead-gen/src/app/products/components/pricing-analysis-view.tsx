"use client";

import { Badge, Box, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { css } from "styled-system/css";
import type { PricingStrategyResult } from "@/lib/langgraph-client";

export type PricingAnalysis = PricingStrategyResult;

function formatPrice(p: number | null | undefined): string {
  if (p === null || p === undefined) return "Custom";
  if (p === 0) return "Free";
  return `$${p.toLocaleString()}`;
}

export function PricingAnalysisView({ data }: { data: PricingAnalysis }) {
  const tiers = data.model?.tiers ?? [];
  const addons = data.model?.addons ?? [];
  const risks = data.rationale?.risks ?? [];

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" gap="3" wrap="wrap">
        <Heading size="3">Pricing model</Heading>
        {data.model?.value_metric && (
          <Badge color="indigo" size="2">
            {data.model.value_metric}
          </Badge>
        )}
        {data.model?.model_type && (
          <Badge color="gray" size="2">
            {data.model.model_type}
          </Badge>
        )}
        {data.model?.free_offer && (
          <Badge color="green" size="1">
            {data.model.free_offer}
          </Badge>
        )}
      </Flex>

      {data.rationale?.recommendation && (
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
            Recommendation
          </Text>
          <Text size="2" as="p" className={css({ lineHeight: "1.6" })}>
            {data.rationale.recommendation}
          </Text>
        </Box>
      )}

      <Box>
        <Heading size="3" mb="2">
          Tiers ({tiers.length})
        </Heading>
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            gap: "3",
          })}
        >
          {tiers.map((t, i) => (
            <Box
              key={i}
              className={css({
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "sm",
                p: "4",
                display: "flex",
                flexDirection: "column",
                gap: "2",
              })}
            >
              <Flex justify="between" align="center" gap="2">
                <Text weight="bold" size="3">
                  {t.name}
                </Text>
                <Badge color="indigo" size="1">
                  {t.billing_unit}
                </Badge>
              </Flex>
              <Text size="5" weight="bold" className={css({ color: "accent.11" })}>
                {formatPrice(t.price_monthly_usd)}
                {t.price_monthly_usd ? (
                  <Text size="2" color="gray" weight="regular">
                    {" "}
                    /mo
                  </Text>
                ) : null}
              </Text>
              {t.target_persona && (
                <Text size="2" color="gray">
                  {t.target_persona}
                </Text>
              )}
              {t.included?.length > 0 && (
                <ul
                  className={css({
                    pl: "4",
                    color: "gray.12",
                    fontSize: "xs",
                    listStyle: "disc",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1",
                  })}
                >
                  {t.included.map((inc, j) => (
                    <li key={j}>{inc}</li>
                  ))}
                </ul>
              )}
              {t.limits?.length > 0 && (
                <Text size="1" color="gray" as="div">
                  Limits: {t.limits.join(", ")}
                </Text>
              )}
              {t.upgrade_trigger && (
                <Box
                  className={css({
                    mt: "2",
                    pt: "2",
                    borderTop: "1px solid",
                    borderColor: "ui.border",
                  })}
                >
                  <Text size="1" color="gray" as="div" weight="bold">
                    Upgrade trigger
                  </Text>
                  <Text size="2" as="p" className={css({ lineHeight: "1.5" })}>
                    {t.upgrade_trigger}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </div>
      </Box>

      {addons.length > 0 && (
        <Box>
          <Heading size="3" mb="2">
            Add-ons
          </Heading>
          <Flex gap="2" wrap="wrap">
            {addons.map((a, i) => (
              <Badge key={i} color="gray" size="2">
                {a}
              </Badge>
            ))}
          </Flex>
        </Box>
      )}

      {(data.rationale?.value_basis ||
        data.rationale?.competitor_benchmark ||
        data.rationale?.wtp_estimate) && (
        <>
          <Separator size="4" />
          <Box>
            <Heading size="3" mb="2">
              Rationale
            </Heading>
            <Flex direction="column" gap="2">
              {data.rationale?.value_basis && (
                <Box
                  className={css({
                    border: "1px solid",
                    borderColor: "ui.border",
                    borderRadius: "sm",
                    p: "3",
                  })}
                >
                  <Text weight="bold" size="2" as="div">
                    Value basis
                  </Text>
                  <Text color="gray" size="2" as="p" mt="1">
                    {data.rationale.value_basis}
                  </Text>
                </Box>
              )}
              {data.rationale?.competitor_benchmark && (
                <Box
                  className={css({
                    border: "1px solid",
                    borderColor: "ui.border",
                    borderRadius: "sm",
                    p: "3",
                  })}
                >
                  <Text weight="bold" size="2" as="div">
                    Competitor benchmark
                  </Text>
                  <Text color="gray" size="2" as="p" mt="1">
                    {data.rationale.competitor_benchmark}
                  </Text>
                </Box>
              )}
              {data.rationale?.wtp_estimate && (
                <Box
                  className={css({
                    border: "1px solid",
                    borderColor: "ui.border",
                    borderRadius: "sm",
                    p: "3",
                  })}
                >
                  <Text weight="bold" size="2" as="div">
                    Willingness to pay
                  </Text>
                  <Text color="gray" size="2" as="p" mt="1">
                    {data.rationale.wtp_estimate}
                  </Text>
                </Box>
              )}
            </Flex>
          </Box>
        </>
      )}

      {risks.length > 0 && (
        <Box>
          <Heading size="3" mb="2">
            Risks
          </Heading>
          <Flex direction="column" gap="2">
            {risks.map((r, i) => (
              <Box
                key={i}
                className={css({
                  border: "1px solid",
                  borderColor: "status.negativeBorder",
                  bg: "status.negativeSubtle",
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

      {data.model?.discounting_strategy && (
        <Box>
          <Heading size="3" mb="2">
            Discounting
          </Heading>
          <Text size="2" color="gray" as="p" className={css({ lineHeight: "1.5" })}>
            {data.model.discounting_strategy}
          </Text>
        </Box>
      )}
    </Flex>
  );
}
