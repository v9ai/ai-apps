"use client";

import { css } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { button } from "@/recipes/button";
import { badge } from "@/recipes/badge";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { Box, Flex, Text, Badge } from "@radix-ui/themes";

/**
 * Improvement 5: Closing section — consolidated CTAs + credibility signals.
 *
 * Dual CTAs (explore pipeline + browse leads) appear here at the bottom
 * instead of competing in the hero. This follows the "closing argument"
 * pattern: after seeing promise, mechanism, proof, and differentiators,
 * the user is ready to act.
 *
 * Tech stack badges and open-source callout moved here from LandingFeatures
 * where they were buried mid-page. As credibility signals, they belong
 * at the decision point — right before the user clicks.
 */

const techStack = [
  "Next.js 16",
  "Neon PostgreSQL",
  "Cloudflare Workers",
  "DeepSeek",
  "LangGraph",
  "LanceDB",
  "GraphQL",
  "Drizzle ORM",
];

const badgeStyle: React.CSSProperties = {
  borderRadius: 0,
  textTransform: "lowercase" as const,
};

export function LandingClosing() {
  return (
    <section
      className={css({
        pt: { base: "sectionMobile", lg: "section" },
        pb: { base: "sectionMobile", lg: "section" },
        borderTop: "1px solid",
        borderColor: "ui.border",
      })}
    >
      <div className={container({ maxW: "breakpoint-lg" })}>
        {/* --- headline --- */}
        <h2
          className={css({
            fontSize: { base: "2xl", md: "3xl" },
            fontWeight: "bold",
            color: "ui.heading",
            letterSpacing: "tighter",
            lineHeight: "snug",
            textAlign: "center",
            maxW: "520px",
            mx: "auto",
          })}
        >
          start finding leads before they hit the job boards
        </h2>

        {/* --- dual CTAs --- */}
        <div className={flex({ justify: "center", gap: "3", mt: "6" })}>
          <Link
            href="/how-it-works"
            className={button({ variant: "solid", size: "lg" })}
          >
            explore pipeline
            <ArrowRightIcon width={14} height={14} />
          </Link>
          <Link
            href="/companies"
            className={button({ variant: "ghost", size: "lg" })}
          >
            browse leads
          </Link>
        </div>

        {/* --- tech stack badges --- */}
        <div
          className={css({
            mt: "8",
            textAlign: "center",
          })}
        >
          <Text
            as="p"
            size="1"
            weight="medium"
            mb="3"
            style={{ color: "var(--gray-8)", textTransform: "lowercase" }}
          >
            tech stack
          </Text>
          <Flex gap="2" wrap="wrap" justify="center">
            {techStack.map((tech) => (
              <Badge
                key={tech}
                variant="outline"
                color="gray"
                size="1"
                style={badgeStyle}
              >
                {tech.toLowerCase()}
              </Badge>
            ))}
          </Flex>
        </div>

        {/* --- open source callout --- */}
        <Box
          mt="6"
          py="4"
          px="5"
          style={{
            border: "1px solid var(--green-9)",
            borderRadius: 0,
            background: "transparent",
          }}
        >
          <Flex align="center" justify="between" wrap="wrap" gap="3">
            <Text size="2" style={{ color: "var(--gray-11)" }}>
              fully open source — explore the architecture
            </Text>
            <Link
              href="/how-it-works"
              className={css({
                color: "status.positive",
                fontSize: "sm",
                textDecoration: "none",
                textTransform: "lowercase",
                fontWeight: "medium",
                borderBottom: "1px solid",
                borderColor: "status.positive",
                pb: "1px",
                _hover: {
                  opacity: 0.8,
                },
              })}
            >
              how it works
            </Link>
          </Flex>
        </Box>
      </div>
    </section>
  );
}
