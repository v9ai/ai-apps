"use client";

import {
  Box,
  Flex,
  Heading,
  Text,
  Separator,
  Spinner,
} from "@radix-ui/themes";
import { ShieldAlert } from "lucide-react";
import { useAllergiesQuery } from "@/app/__generated__/hooks";
import { AuthGate } from "@/app/components/AuthGate";
import { AddAllergyForm } from "./add-allergy-form";
import { AllergyCard } from "./allergy-card";

export default function AllergiesPage() {
  return (
    <AuthGate
      pageName="Allergies & Intolerances"
      description="Track and manage your allergies and intolerances. Sign in to access your records."
    >
      <AllergiesContent />
    </AuthGate>
  );
}

function AllergiesContent() {
  const { data, loading, error } = useAllergiesQuery();
  const allergies = data?.allergies ?? [];

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            Allergies &amp; Intolerances
          </Heading>
          <Text size="3" color="gray">
            Track and manage your allergies and intolerances.
          </Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Add an entry</Heading>
          <AddAllergyForm />
        </Flex>

        <Separator size="4" />

        {loading && (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        )}

        {error && (
          <Flex direction="column" align="center" p="6" gap="2">
            <Text color="red">Error loading allergies</Text>
            <Text size="1" color="gray">
              {error.message}
            </Text>
          </Flex>
        )}

        {!loading && !error && allergies.length === 0 && (
          <Flex direction="column" align="center" gap="3" py="9">
            <ShieldAlert size={48} color="var(--gray-8)" />
            <Heading size="4">No allergies or intolerances yet</Heading>
            <Text size="2" color="gray">
              Add an entry above to start tracking.
            </Text>
          </Flex>
        )}

        {!loading && !error && allergies.length > 0 && (
          <Flex direction="column" gap="3">
            <Heading size="4">Your entries ({allergies.length})</Heading>
            <Flex
              direction="column"
              gap="3"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              }}
            >
              {allergies.map((a) => (
                <AllergyCard
                  key={a.id}
                  id={a.id}
                  kind={a.kind}
                  name={a.name}
                  severity={a.severity ?? null}
                  notes={a.notes ?? null}
                  createdAt={a.createdAt}
                  personLabel={
                    a.familyMember?.firstName ?? a.familyMember?.name ?? null
                  }
                  personSlug={a.familyMember?.slug ?? null}
                />
              ))}
            </Flex>
          </Flex>
        )}
      </Flex>
    </Box>
  );
}
