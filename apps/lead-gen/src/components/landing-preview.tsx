"use client";

import Link from "next/link";
import { css } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { button } from "@/recipes/button";
import { Box, Flex, Heading, Text, Badge } from "@radix-ui/themes";
import { ArrowRightIcon } from "@radix-ui/react-icons";

/**
 * B2B lead generation preview.
 *
 * Shows sample scored leads from the pipeline with company info,
 * lead scores, extracted contacts, and industry tags.
 * Primary CTA: "view 300 scored leads" (solidGreen)
 * Secondary CTA: "how it works" (outline)
 */

const SCORED_LEADS_COUNT = 300;

const PREVIEW_LEADS = [
  {
    id: 1,
    company: "TechFlow GmbH",
    score: 0.94,
    domain: "techflow.de",
    classification: "high-fit" as const,
    contact: { name: "Maria Schmidt", title: "VP Engineering", email: "m.schmidt@techflow.de" },
    tags: ["SaaS", "DevTools", "Series B"],
  },
  {
    id: 2,
    company: "DataStream Ltd",
    score: 0.87,
    domain: "datastream.io",
    classification: "high-fit" as const,
    contact: { name: "James Chen", title: "CTO", email: "j.chen@datastream.io" },
    tags: ["Data Infrastructure", "FinTech", "Series A"],
  },
  {
    id: 3,
    company: "CloudNine Analytics",
    score: 0.82,
    domain: "cloudnine.com",
    classification: "medium-fit" as const,
    contact: { name: "Sarah Park", title: "Head of Engineering", email: "s.park@cloudnine.com" },
    tags: ["Analytics", "MLOps", "Seed"],
  },
] as const;

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 0.9 ? "green" : score >= 0.85 ? "cyan" : "orange";
  return (
    <Badge
      size="1"
      variant="soft"
      color={color}
      style={{ borderRadius: 0, fontVariantNumeric: "tabular-nums" }}
    >
      {score.toFixed(2)}
    </Badge>
  );
}

export function LandingPreview() {
  return (
    <section id="preview" className={css({ py: { base: "sectionMobile", lg: "section" }, scrollMarginTop: "56px" })}>
      <div className={container({ maxW: "breakpoint-lg" })}>
        {/* heading with pulsing dot (decorative, hidden from AT) */}
        <Flex align="center" gap="3" mt="2" mb="5">
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "var(--green-9)",
              animation: "landing-preview-pulse 2s ease-in-out infinite",
              flexShrink: 0,
            }}
          />
          <Heading
            as="h2"
            size="5"
            weight="bold"
            style={{ letterSpacing: "-0.02em", color: "var(--gray-12)" }}
          >
            live pipeline output
          </Heading>
        </Flex>

        {/* leads list with semantic structure */}
        <Box
          role="list"
          aria-label={`${PREVIEW_LEADS.length} sample scored leads`}
          style={{
            position: "relative",
            background: "var(--gray-2)",
            border: "1px solid var(--gray-6)",
            borderRadius: 0,
            overflow: "hidden",
          }}
        >
          {PREVIEW_LEADS.map((lead, i) => (
            <Box
              key={lead.id}
              role="listitem"
              aria-label={`${lead.company} — score ${lead.score}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "12px 16px",
                borderBottom:
                  i < PREVIEW_LEADS.length - 1
                    ? "1px solid var(--gray-6)"
                    : "none",
                background: "transparent",
                cursor: "default",
              }}
            >
              {/* content */}
              <Box style={{ flex: 1, minWidth: 0 }}>
                {/* line 1: company name + score badge + classification badge */}
                <Flex align="center" gap="2" wrap="wrap">
                  <Text
                    size="3"
                    weight="bold"
                    style={{
                      color: "var(--gray-12)",
                      letterSpacing: "-0.005em",
                      lineHeight: 1.4,
                    }}
                  >
                    {lead.company}
                  </Text>
                  <ScoreBadge score={lead.score} />
                  <Badge
                    size="1"
                    variant="soft"
                    color={lead.classification === "high-fit" ? "green" : "orange"}
                    style={{ borderRadius: 0 }}
                  >
                    {lead.classification}
                  </Badge>
                </Flex>

                {/* line 2: contact + source domain */}
                <Flex align="center" gap="2" mt="1" wrap="wrap">
                  <Text
                    size="2"
                    weight="medium"
                    style={{ color: "var(--gray-11)" }}
                  >
                    {lead.contact.name}, {lead.contact.title}
                  </Text>
                  <Text
                    size="2"
                    style={{ color: "var(--gray-9)" }}
                  >
                    — {lead.contact.email}
                  </Text>
                  <Badge
                    size="1"
                    variant="outline"
                    color="gray"
                    style={{ borderRadius: 0 }}
                  >
                    {lead.domain}
                  </Badge>
                </Flex>

                {/* line 3: industry tags */}
                <Flex
                  gap="2"
                  mt="2"
                  wrap="wrap"
                  role="list"
                  aria-label="Industry tags"
                >
                  {lead.tags.map((tag) => (
                    <Badge
                      key={tag}
                      size="1"
                      variant="surface"
                      color="gray"
                      style={{ borderRadius: 0 }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </Flex>
              </Box>
            </Box>
          ))}

          {/* fade overlay */}
          <Box
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 80,
              background:
                "linear-gradient(to bottom, transparent, var(--gray-2))",
              pointerEvents: "none",
            }}
          />
        </Box>

        {/* CTA pair: scored leads count + research fallback */}
        <div className={flex({ justify: "center", gap: "3", mt: "5" })}>
          <Link
            href="/companies"
            className={button({ variant: "solidGreen", size: "md" })}
          >
            view {SCORED_LEADS_COUNT} scored leads
            <ArrowRightIcon width={14} height={14} />
          </Link>
          <Link
            href="/how-it-works"
            className={button({ variant: "outline", size: "md" })}
          >
            how it works
          </Link>
        </div>

        {/* keyframes for pulse animation */}
        <style>{`
          @keyframes landing-preview-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    </section>
  );
}
