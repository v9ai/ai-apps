"use client";

import { Badge, Box, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { css } from "styled-system/css";

export type IcpCriterion = {
  score: number;
  confidence: number;
  justification: string;
  evidence: string[];
};
export type IcpSegment = {
  name: string;
  industry?: string;
  stage?: string;
  geo?: string;
  fit: number;
  reasoning: string;
};
export type IcpPersona = {
  title: string;
  seniority?: string;
  department?: string;
  pain: string;
  channel?: string;
};
export type IcpDealBreaker = {
  name: string;
  severity: "low" | "medium" | "high";
  reason: string;
};
export type IcpAnalysis = {
  criteria_scores: Record<string, IcpCriterion>;
  weighted_total: number;
  segments: IcpSegment[];
  personas: IcpPersona[];
  anti_icp: string[];
  deal_breakers: IcpDealBreaker[];
};

const CRITERION_LABELS: Record<string, string> = {
  segment_clarity: "Segment Clarity",
  buyer_persona_specificity: "Buyer Persona Specificity",
  pain_solution_fit: "Pain–Solution Fit",
  distribution_gtm_signal: "Distribution / GTM Signal",
  anti_icp_clarity: "Anti-ICP Clarity",
};

function severityColor(
  s: IcpDealBreaker["severity"],
): "red" | "orange" | "yellow" {
  if (s === "high") return "red";
  if (s === "medium") return "orange";
  return "yellow";
}

export function IcpAnalysisView({ data }: { data: IcpAnalysis }) {
  return (
    <Flex direction="column" gap="6">
      <Flex align="center" gap="3">
        <Heading size="4">Weighted fit</Heading>
        <Badge color="indigo" size="2">
          {(data.weighted_total * 100).toFixed(0)}%
        </Badge>
      </Flex>

      <Box>
        <Heading size="4" mb="2">
          Criteria
        </Heading>
        <Flex direction="column" gap="2">
          {Object.entries(data.criteria_scores).map(([key, c]) => (
            <Box
              key={key}
              className={css({
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "sm",
                p: "3",
              })}
            >
              <Flex justify="between" align="center" gap="2">
                <Text weight="bold" size="2">
                  {CRITERION_LABELS[key] ?? key}
                </Text>
                <Flex gap="2" align="center">
                  <Badge color="gray" size="1">
                    conf {(c.confidence * 100).toFixed(0)}%
                  </Badge>
                  <Badge color="indigo" size="1">
                    {(c.score * 100).toFixed(0)}%
                  </Badge>
                </Flex>
              </Flex>
              {c.justification && (
                <Text color="gray" size="2" as="p" mt="1">
                  {c.justification}
                </Text>
              )}
              {c.evidence?.length > 0 && (
                <ul
                  className={css({
                    mt: "2",
                    pl: "4",
                    color: "gray.11",
                    fontSize: "xs",
                    listStyle: "disc",
                  })}
                >
                  {c.evidence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </Box>
          ))}
        </Flex>
      </Box>

      <Separator size="4" />

      <Box>
        <Heading size="4" mb="2">
          Segments ({data.segments.length})
        </Heading>
        <Flex direction="column" gap="2">
          {data.segments.map((s, i) => (
            <Box
              key={i}
              className={css({
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "sm",
                p: "3",
              })}
            >
              <Flex justify="between" gap="2" align="center">
                <Text weight="bold" size="2">
                  {s.name}
                </Text>
                <Badge color="indigo" size="1">
                  fit {(s.fit * 100).toFixed(0)}%
                </Badge>
              </Flex>
              <Flex gap="2" mt="1" wrap="wrap">
                {s.industry && (
                  <Badge color="gray" size="1">
                    {s.industry}
                  </Badge>
                )}
                {s.stage && (
                  <Badge color="gray" size="1">
                    {s.stage}
                  </Badge>
                )}
                {s.geo && (
                  <Badge color="gray" size="1">
                    {s.geo}
                  </Badge>
                )}
              </Flex>
              {s.reasoning && (
                <Text color="gray" size="2" as="p" mt="1">
                  {s.reasoning}
                </Text>
              )}
            </Box>
          ))}
        </Flex>
      </Box>

      <Box>
        <Heading size="4" mb="2">
          Personas ({data.personas.length})
        </Heading>
        <Flex direction="column" gap="2">
          {data.personas.map((p, i) => (
            <Box
              key={i}
              className={css({
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "sm",
                p: "3",
              })}
            >
              <Text weight="bold" size="2">
                {p.title}
              </Text>
              <Flex gap="2" mt="1" wrap="wrap">
                {p.seniority && (
                  <Badge color="gray" size="1">
                    {p.seniority}
                  </Badge>
                )}
                {p.department && (
                  <Badge color="gray" size="1">
                    {p.department}
                  </Badge>
                )}
                {p.channel && (
                  <Badge color="indigo" size="1">
                    via {p.channel}
                  </Badge>
                )}
              </Flex>
              {p.pain && (
                <Text color="gray" size="2" as="p" mt="1">
                  Pain: {p.pain}
                </Text>
              )}
            </Box>
          ))}
        </Flex>
      </Box>

      <Box>
        <Heading size="4" mb="2">
          Anti-ICP (who it is NOT for)
        </Heading>
        <ul
          className={css({
            pl: "4",
            color: "gray.11",
            fontSize: "sm",
            listStyle: "disc",
          })}
        >
          {data.anti_icp.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </Box>

      {data.deal_breakers.length > 0 && (
        <Box>
          <Heading size="4" mb="2">
            Deal-breakers
          </Heading>
          <Flex direction="column" gap="2">
            {data.deal_breakers.map((d, i) => (
              <Box
                key={i}
                className={css({
                  border: "1px solid",
                  borderColor: "ui.border",
                  borderRadius: "sm",
                  p: "3",
                })}
              >
                <Flex justify="between" gap="2" align="center">
                  <Text weight="bold" size="2">
                    {d.name}
                  </Text>
                  <Badge color={severityColor(d.severity)} size="1">
                    {d.severity}
                  </Badge>
                </Flex>
                {d.reason && (
                  <Text color="gray" size="2" as="p" mt="1">
                    {d.reason}
                  </Text>
                )}
              </Box>
            ))}
          </Flex>
        </Box>
      )}
    </Flex>
  );
}
