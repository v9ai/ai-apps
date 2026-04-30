"use client";

import { Badge, Box, Flex, Separator, Text } from "@radix-ui/themes";
import { css } from "styled-system/css";
import { SectionCard, SectionHeading } from "./view-chrome";

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
): "red" | "orange" | "amber" {
  if (s === "high") return "red";
  if (s === "medium") return "orange";
  return "amber";
}

function fitColor(fit: number): "green" | "indigo" | "amber" | "gray" {
  if (fit >= 0.8) return "green";
  if (fit >= 0.6) return "indigo";
  if (fit >= 0.4) return "amber";
  return "gray";
}

const eyebrowStyle = css({
  color: "accent.11",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: "medium",
  fontSize: "xs",
});

const facetBadgeRow = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "1.5",
});

/**
 * Score bar — thin horizontal indicator. Fills from left in accent color,
 * with the unfilled portion in subtle gray. Used for criteria scores so the
 * eye can scan relative strength across rows without re-reading numbers.
 */
function ScoreBar({ value, color = "indigo" }: { value: number; color?: "indigo" | "green" }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  const fillBg = color === "green" ? "green.9" : "indigo.9";
  const trackBg = color === "green" ? "green.3" : "indigo.3";
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={css({
        position: "relative",
        height: "4px",
        bg: trackBg,
        borderRadius: "full",
        overflow: "hidden",
        w: "full",
      })}
    >
      <div
        aria-hidden="true"
        className={css({
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          bg: fillBg,
          borderRadius: "full",
          transition: "width 200ms ease",
        })}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function IcpAnalysisView({ data }: { data: IcpAnalysis }) {
  const fitPct = (data.weighted_total * 100).toFixed(0);
  const heroColor = fitColor(data.weighted_total);
  const sortedSegments = [...data.segments].sort((a, b) => b.fit - a.fit);

  return (
    <Flex direction="column" gap="7">
      {/* Hero: weighted fit is the punchline */}
      <Box
        className={css({
          bg: "accent.2",
          border: "1px solid",
          borderColor: "accent.6",
          borderRadius: "lg",
          p: "6",
          position: "relative",
          overflow: "hidden",
          _before: {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: "4px",
            bg: "accent.9",
          },
        })}
      >
        <Flex
          direction={{ initial: "column", sm: "row" }}
          align={{ initial: "start", sm: "center" }}
          justify="between"
          gap="4"
        >
          <Flex direction="column" gap="2">
            <Text className={eyebrowStyle}>Weighted ICP fit</Text>
            <Text size="2" color="gray" as="p" className={css({ maxWidth: "60ch" })}>
              Composite score across {Object.keys(data.criteria_scores).length} criteria.
              Higher is a sharper, more actionable target.
            </Text>
          </Flex>
          <Flex align="baseline" gap="2">
            <Text
              className={css({
                fontSize: "6xl",
                fontWeight: "bold",
                color: "gray.12",
                lineHeight: "none",
                letterSpacing: "-0.04em",
                fontVariantNumeric: "tabular-nums",
              })}
            >
              {fitPct}
            </Text>
            <Text
              className={css({
                fontSize: "2xl",
                color: "gray.10",
                fontWeight: "medium",
              })}
            >
              %
            </Text>
            <Badge color={heroColor} variant="solid" size="2" radius="full" ml="2">
              {heroColor === "green"
                ? "strong"
                : heroColor === "indigo"
                  ? "promising"
                  : heroColor === "amber"
                    ? "needs work"
                    : "weak"}
            </Badge>
          </Flex>
        </Flex>
      </Box>

      {/* Criteria — supporting evidence with score bars */}
      <Box>
        <SectionHeading
          eyebrow="How it scored"
          title="Criteria"
          count={Object.keys(data.criteria_scores).length}
          description="Each criterion contributes to the weighted total above. Confidence reflects how sure the model is in its score."
        />
        <Flex direction="column" gap="2">
          {Object.entries(data.criteria_scores).map(([key, c]) => (
            <SectionCard key={key}>
              <Flex direction="column" gap="2">
                <Flex justify="between" align="center" gap="3">
                  <Text weight="bold" size="2" className={css({ color: "gray.12" })}>
                    {CRITERION_LABELS[key] ?? key}
                  </Text>
                  <Flex gap="2" align="center">
                    <Text
                      size="1"
                      color="gray"
                      className={css({ fontVariantNumeric: "tabular-nums" })}
                    >
                      conf {(c.confidence * 100).toFixed(0)}%
                    </Text>
                    <Text
                      size="3"
                      weight="bold"
                      className={css({
                        color: "indigo.11",
                        fontVariantNumeric: "tabular-nums",
                      })}
                    >
                      {(c.score * 100).toFixed(0)}%
                    </Text>
                  </Flex>
                </Flex>
                <ScoreBar value={c.score} />
                {c.justification && (
                  <Text color="gray" size="2" as="p" className={css({ lineHeight: "1.55" })}>
                    {c.justification}
                  </Text>
                )}
                {c.evidence?.length > 0 && (
                  <ul
                    className={css({
                      listStyle: "none",
                      p: 0,
                      m: 0,
                      mt: "1",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1",
                    })}
                  >
                    {c.evidence.map((e, i) => (
                      <li
                        key={i}
                        className={css({
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "2",
                          fontSize: "xs",
                          color: "gray.11",
                        })}
                      >
                        <span aria-hidden="true" className={css({ color: "gray.9", mt: "0.5" })}>
                          ›
                        </span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Flex>
            </SectionCard>
          ))}
        </Flex>
      </Box>

      <Separator size="4" />

      {/* Segments — ranked by fit, ordinal chip mirrors positioning */}
      {sortedSegments.length > 0 && (
        <Box>
          <SectionHeading
            eyebrow="Who to target"
            title="Segments"
            count={sortedSegments.length}
            description="Buyer segments ordered by fit. Top of list = where to spend the next dollar."
          />
          <Flex direction="column" gap="2">
            {sortedSegments.map((s, i) => (
              <SectionCard key={i} emphasized={i === 0}>
                <Flex direction="column" gap="2">
                  <Flex justify="between" gap="3" align="center">
                    <Flex align="center" gap="3">
                      <Text
                        size="1"
                        className={css({
                          color: "accent.11",
                          bg: "accent.3",
                          border: "1px solid",
                          borderColor: "accent.6",
                          px: "2",
                          py: "1",
                          borderRadius: "sm",
                          flexShrink: 0,
                          fontVariantNumeric: "tabular-nums",
                          minWidth: "28px",
                          textAlign: "center",
                          fontWeight: "bold",
                          fontSize: "xs",
                        })}
                      >
                        {i + 1}
                      </Text>
                      <Text weight="bold" size="3" className={css({ color: "gray.12" })}>
                        {s.name}
                      </Text>
                    </Flex>
                    <Badge
                      color={fitColor(s.fit)}
                      size="2"
                      variant="soft"
                      radius="full"
                    >
                      fit {(s.fit * 100).toFixed(0)}%
                    </Badge>
                  </Flex>
                  {(s.industry || s.stage || s.geo) && (
                    <Flex className={facetBadgeRow}>
                      {s.industry && (
                        <Badge color="gray" size="1" variant="surface">
                          {s.industry}
                        </Badge>
                      )}
                      {s.stage && (
                        <Badge color="gray" size="1" variant="surface">
                          {s.stage}
                        </Badge>
                      )}
                      {s.geo && (
                        <Badge color="gray" size="1" variant="surface">
                          {s.geo}
                        </Badge>
                      )}
                    </Flex>
                  )}
                  {s.reasoning && (
                    <Text color="gray" size="2" as="p" className={css({ lineHeight: "1.55" })}>
                      {s.reasoning}
                    </Text>
                  )}
                </Flex>
              </SectionCard>
            ))}
          </Flex>
        </Box>
      )}

      {/* Personas — supporting context for each segment */}
      {data.personas.length > 0 && (
        <Box>
          <SectionHeading
            eyebrow="Who to email"
            title="Personas"
            count={data.personas.length}
            description="Buyer roles inside the target segments. Channel hints inform outreach selection."
          />
          <Box
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
              gap: "2",
            })}
          >
            {data.personas.map((p, i) => (
              <SectionCard key={i}>
                <Flex direction="column" gap="2">
                  <Text weight="bold" size="2" className={css({ color: "gray.12" })}>
                    {p.title}
                  </Text>
                  <Flex className={facetBadgeRow}>
                    {p.seniority && (
                      <Badge color="gray" size="1" variant="surface">
                        {p.seniority}
                      </Badge>
                    )}
                    {p.department && (
                      <Badge color="gray" size="1" variant="surface">
                        {p.department}
                      </Badge>
                    )}
                    {p.channel && (
                      <Badge color="indigo" size="1" variant="soft">
                        via {p.channel}
                      </Badge>
                    )}
                  </Flex>
                  {p.pain && (
                    <Text
                      color="gray"
                      size="2"
                      as="p"
                      className={css({ lineHeight: "1.55" })}
                    >
                      <Text
                        size="1"
                        className={css({
                          color: "amber.11",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          fontWeight: "medium",
                          mr: "2",
                        })}
                      >
                        Pain
                      </Text>
                      {p.pain}
                    </Text>
                  )}
                </Flex>
              </SectionCard>
            ))}
          </Box>
        </Box>
      )}

      {/* Anti-ICP + deal-breakers grouped — both are "do not pursue" */}
      {(data.anti_icp.length > 0 || data.deal_breakers.length > 0) && (
        <Box
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
            gap: "5",
          })}
        >
          {data.anti_icp.length > 0 && (
            <Box>
              <SectionHeading
                eyebrow="Disqualify"
                title="Anti-ICP"
                count={data.anti_icp.length}
                description="Who this is not for."
              />
              <ul className={css({ listStyle: "none", p: 0, m: 0 })}>
                {data.anti_icp.map((a, i) => (
                  <li
                    key={i}
                    className={css({
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "3",
                      py: "2",
                      borderBottom: "1px solid",
                      borderColor: "ui.border",
                      _last: { borderBottom: "none" },
                    })}
                  >
                    <span
                      aria-hidden="true"
                      className={css({
                        color: "red.10",
                        mt: "1",
                        flexShrink: 0,
                      })}
                    >
                      ✕
                    </span>
                    <Text size="2" className={css({ lineHeight: "1.55", color: "gray.12" })}>
                      {a}
                    </Text>
                  </li>
                ))}
              </ul>
            </Box>
          )}

          {data.deal_breakers.length > 0 && (
            <Box>
              <SectionHeading
                eyebrow="Hard blockers"
                title="Deal-breakers"
                count={data.deal_breakers.length}
                description="Reasons a deal will fail even if the segment fits."
              />
              <Flex direction="column" gap="2">
                {data.deal_breakers.map((d, i) => (
                  <SectionCard key={i}>
                    <Flex direction="column" gap="2">
                      <Flex justify="between" gap="2" align="center">
                        <Text
                          weight="bold"
                          size="2"
                          className={css({ color: "gray.12" })}
                        >
                          {d.name}
                        </Text>
                        <Badge
                          color={severityColor(d.severity)}
                          size="1"
                          variant="solid"
                          radius="full"
                        >
                          {d.severity}
                        </Badge>
                      </Flex>
                      {d.reason && (
                        <Text
                          color="gray"
                          size="2"
                          as="p"
                          className={css({ lineHeight: "1.55" })}
                        >
                          {d.reason}
                        </Text>
                      )}
                    </Flex>
                  </SectionCard>
                ))}
              </Flex>
            </Box>
          )}
        </Box>
      )}

    </Flex>
  );
}
