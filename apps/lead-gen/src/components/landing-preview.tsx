"use client";

import Link from "next/link";
import { css } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { button } from "@/recipes/button";
import { Box, Flex, Heading, Text, Badge } from "@radix-ui/themes";
import { ArrowRightIcon } from "@radix-ui/react-icons";

/**
 * CTA Improvement 4: Urgency-driven preview CTA.
 *
 * - "see all leads" (vague) -> "view 27 EU-remote matches" (specific, FOMO)
 * - Uses solidGreen variant for visual differentiation from hero CTA
 * - Added secondary "how it works" outline link to catch research-mode visitors
 * - Live count number creates specificity = credibility
 */

const EU_REMOTE_COUNT = 27;

const PREVIEW_LEADS = [
  {
    id: 1,
    title: "Senior AI Engineer — Remote EU",
    company: "Pento",
    source: "ashby",
    classification: "eu-remote",
    skills: ["Python", "LLM", "MLOps"],
  },
  {
    id: 2,
    title: "Staff ML Platform Engineer",
    company: "Canonical",
    source: "greenhouse",
    classification: "eu-remote",
    skills: ["Kubernetes", "PyTorch", "Go"],
  },
  {
    id: 3,
    title: "Lead Data Scientist",
    company: "Factorial",
    source: "lever",
    classification: "eu-remote",
    skills: ["NLP", "Spark", "Terraform"],
  },
] as const;

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
          aria-label={`${PREVIEW_LEADS.length} sample pipeline leads`}
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
              aria-label={`${lead.title} at ${lead.company}`}
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
                {/* line 1: title + classification badge */}
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
                    {lead.title}
                  </Text>
                  <Badge
                    size="1"
                    variant="soft"
                    color="green"
                    style={{ borderRadius: 0 }}
                  >
                    {lead.classification}
                  </Badge>
                </Flex>

                {/* line 2: company + source */}
                <Flex align="center" gap="2" mt="1">
                  <Text
                    size="2"
                    weight="medium"
                    style={{ color: "var(--gray-11)" }}
                  >
                    {lead.company}
                  </Text>
                  <Badge
                    size="1"
                    variant="outline"
                    color="gray"
                    style={{ borderRadius: 0 }}
                  >
                    {lead.source}
                  </Badge>
                </Flex>

                {/* line 3: skill tags */}
                <Flex
                  gap="2"
                  mt="2"
                  wrap="wrap"
                  role="list"
                  aria-label="Required skills"
                >
                  {lead.skills.map((skill) => (
                    <Badge
                      key={skill}
                      size="1"
                      variant="surface"
                      color="gray"
                      style={{ borderRadius: 0 }}
                    >
                      {skill}
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

        {/* CTA pair: specific count for urgency + research fallback */}
        <div className={flex({ justify: "center", gap: "3", mt: "5" })}>
          <Link
            href="/jobs?filter=eu-remote"
            className={button({ variant: "solidGreen", size: "md" })}
          >
            view {EU_REMOTE_COUNT} EU-remote matches
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
