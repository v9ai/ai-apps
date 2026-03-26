"use client";

import Link from "next/link";
import { Box, Flex, Heading, Text, Badge, Button } from "@radix-ui/themes";

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
    <Box
      py="6"
      style={{
        borderTop: "1px solid var(--gray-6)",
      }}
    >
      {/* heading with pulsing dot */}
      <Flex align="center" gap="3" mt="2" mb="5">
        <span
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
      <Flex justify="center" mt="4">
        <Button
          asChild
          variant="ghost"
          color="gray"
          size="2"
          style={{ borderRadius: 0 }}
        >
          <Link href="/?showAll=true">see all leads</Link>
        </Button>
      </Flex>

      {/* keyframes for pulse animation */}
      <style>{`
        @keyframes landing-preview-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </Box>
  );
}
