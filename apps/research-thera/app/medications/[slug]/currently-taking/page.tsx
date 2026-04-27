"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  Separator,
  Spinner,
  Text,
} from "@radix-ui/themes";
import { ArrowLeft, Pill } from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useMedicationsQuery } from "../../../__generated__/hooks";
import { AuthGate } from "../../../components/AuthGate";
import { MedicationCard } from "../page";

const PERSONS: Record<
  string,
  { label: string; filter: (name: string) => boolean }
> = {
  me: {
    label: "Me",
    filter: (name) => !name.toLowerCase().startsWith("singulair"),
  },
  bogdan: {
    label: "Bogdan",
    filter: (name) => name.toLowerCase().startsWith("singulair"),
  },
};

export default function CurrentlyTakingPage() {
  const { slug } = useParams<{ slug: string }>();
  const personConfig = PERSONS[slug];
  if (!personConfig) notFound();

  return (
    <AuthGate
      pageName={`${personConfig.label} — currently taking`}
      description="Sign in to access your records."
    >
      <View slug={slug} label={personConfig.label} filter={personConfig.filter} />
    </AuthGate>
  );
}

function View({
  slug,
  label,
  filter,
}: {
  slug: string;
  label: string;
  filter: (name: string) => boolean;
}) {
  const { data, loading, error } = useMedicationsQuery();
  const meds = (data?.medications ?? [])
    .filter((m) => m.isActive && filter(m.name))
    .slice()
    .sort(byExpirationAsc);

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex align="center" gap="2">
          <Link href={`/medications/${slug}`}>
            <Button variant="ghost" color="gray" size="2">
              <ArrowLeft size={14} /> All medications
            </Button>
          </Link>
        </Flex>

        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            Currently taking · {label}
          </Heading>
          <Text size="3" color="gray">
            Sorted by expiration, soonest first.
          </Text>
        </Flex>

        <Separator size="4" />

        {loading && (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        )}

        {error && (
          <Flex direction="column" align="center" p="6" gap="2">
            <Text color="red">Error loading medications</Text>
            <Text size="1" color="gray">
              {error.message}
            </Text>
          </Flex>
        )}

        {!loading && !error && meds.length === 0 && (
          <Flex direction="column" align="center" gap="3" py="9">
            <Pill size={48} color="var(--gray-8)" />
            <Heading size="4">Nothing currently taken</Heading>
          </Flex>
        )}

        {!loading && !error && meds.length > 0 && (
          <Flex
            direction="column"
            gap="3"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            }}
          >
            {meds.map((m) => (
              <MedicationCard
                key={m.id}
                id={m.id}
                name={m.name}
                dosage={m.dosage ?? null}
                frequency={m.frequency ?? null}
                notes={m.notes ?? null}
                startDate={m.startDate ?? null}
                endDate={m.endDate ?? null}
                isActive={m.isActive}
              />
            ))}
          </Flex>
        )}
      </Flex>
    </Box>
  );
}

function byExpirationAsc(
  a: { endDate?: string | null },
  b: { endDate?: string | null },
): number {
  if (a.endDate && b.endDate) return a.endDate.localeCompare(b.endDate);
  if (a.endDate) return -1;
  if (b.endDate) return 1;
  return 0;
}
