"use client";

import {
  Box,
  Card,
  Flex,
  Grid,
  Heading,
  Text,
  Spinner,
  Separator,
} from "@radix-ui/themes";
import {
  Activity,
  Brain,
  CalendarDays,
  Droplets,
  Heart,
  Pill,
  Stethoscope,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useHealthcareSummaryQuery } from "../__generated__/hooks";
import { AuthGate } from "../components/AuthGate";

type Section = {
  label: string;
  href: string;
  Icon: LucideIcon;
  color: string;
};

const sections: Section[] = [
  { label: "Blood Tests", href: "/blood-tests", Icon: Droplets, color: "var(--red-9)" },
  { label: "Conditions", href: "/conditions", Icon: Heart, color: "var(--pink-9)" },
  { label: "Medications", href: "/medications", Icon: Pill, color: "var(--blue-9)" },
  { label: "Symptoms", href: "/symptoms", Icon: Activity, color: "var(--orange-9)" },
  { label: "Appointments", href: "/appointments", Icon: CalendarDays, color: "var(--indigo-9)" },
  { label: "Doctors", href: "/doctors", Icon: Stethoscope, color: "var(--cyan-9)" },
  { label: "Brain Memory", href: "/brain-memory", Icon: Brain, color: "var(--purple-9)" },
  { label: "Protocols", href: "/protocols", Icon: Sparkles, color: "var(--green-9)" },
];

export default function DashboardPage() {
  return (
    <AuthGate
      pageName="Dashboard"
      description="Your health snapshot at a glance. Sign in to access your dashboard."
    >
      <DashboardContent />
    </AuthGate>
  );
}

function DashboardContent() {
  const { data, loading, error } = useHealthcareSummaryQuery();
  const summary = data?.healthcareSummary;

  const counts: Record<string, number> = summary
    ? {
        "/blood-tests": summary.bloodTestsCount,
        "/conditions": summary.conditionsCount,
        "/medications": summary.medicationsCount,
        "/symptoms": summary.symptomsCount,
        "/appointments": summary.appointmentsCount,
        "/doctors": summary.doctorsCount,
        "/brain-memory": summary.memoryEntriesCount,
        "/protocols": summary.protocolsCount,
      }
    : {};

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Box style={{ borderLeft: "3px solid var(--indigo-9)", paddingLeft: 16 }}>
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            Health Dashboard
          </Heading>
          <Text size="3" color="gray">
            Your health records at a glance.
          </Text>
        </Box>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Overview</Heading>
          {loading && (
            <Flex justify="center" py="6">
              <Spinner size="3" />
            </Flex>
          )}
          {error && (
            <Flex direction="column" align="center" p="6" gap="2">
              <Text color="red">Error loading summary</Text>
              <Text size="1" color="gray">
                {error.message}
              </Text>
            </Flex>
          )}
          {!loading && !error && summary && (
            <Grid columns={{ initial: "2", sm: "3", md: "4" }} gap="3">
              {sections.map((s) => (
                <StatCard
                  key={s.href}
                  label={s.label}
                  href={s.href}
                  count={counts[s.href] ?? 0}
                  Icon={s.Icon}
                  color={s.color}
                />
              ))}
            </Grid>
          )}
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Flex align="center" gap="2">
            <TrendingUp size={20} color="var(--gray-9)" />
            <Heading size="4">Health Trajectory</Heading>
          </Flex>
          <Card>
            <Flex direction="column" align="center" gap="2" p="4">
              <Text size="2" color="gray">
                Trajectory analysis arrives once the Python service is wired up.
              </Text>
              <Text size="1" color="gray">
                Upload blood tests via /blood-tests to start building a
                trajectory.
              </Text>
            </Flex>
          </Card>
        </Flex>
      </Flex>
    </Box>
  );
}

function StatCard({
  label,
  href,
  count,
  Icon,
  color,
}: {
  label: string;
  href: string;
  count: number;
  Icon: LucideIcon;
  color: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <Card
        style={{
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        <Flex direction="column" gap="2" align="center" p="2">
          <Icon size={20} color={color} />
          <Text as="div" size="7" weight="bold" align="center">
            {count}
          </Text>
          <Text as="div" size="1" color="gray" align="center">
            {label}
          </Text>
        </Flex>
      </Card>
    </Link>
  );
}
