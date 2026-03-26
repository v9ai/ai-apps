"use client";

import Link from "next/link";
import { css } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { Box, Flex, Heading, Text, Badge, Button } from "@radix-ui/themes";

/**
 * Improvement 3: LandingPreview wrapped in proper section + container.
 *
 * Previously unused or floating without a container. Now sits between
 * pipeline (mechanism) and features (differentiators) to complete the
 * persuasion arc: promise → mechanism → evidence → differentiators → CTA.
 * Real pipeline output data makes the abstract pipeline concrete.
 */

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
    <section
      className={css({
        pb: { base: "sectionMobile", lg: "section" },
      })}
    >
      <div className={container({ maxW: "breakpoint-lg" })}>
        {/* heading with pulsing dot */}
        <Flex align="center" gap="3" mb="5">
          <span
            className={css({
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "status.positive",
              flexShrink: 0,
              animation: "landing-preview-pulse 2s ease-in-out infinite",
            })}
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

        {/* cards container */}
        <Box
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
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "16px 20px",
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
                <Flex gap="2" mt="2" wrap="wrap">
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

        {/* see all leads button */}
        <div className={flex({ justify: "center", mt: "4" })}>
          <Button
            asChild
            variant="ghost"
            color="gray"
            size="2"
            style={{ borderRadius: 0 }}
          >
            <Link href="/jobs">see all leads</Link>
          </Button>
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
