"use client";

import { Flex, Heading, Text, Card, Spinner, Badge, Link as RadixLink } from "@radix-ui/themes";
import { AuthGate } from "@/app/components/AuthGate";
import { useGetGoalQuery } from "@/app/__generated__/hooks";

function MexiBuilderCard() {
  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Flex align="center" gap="2" wrap="wrap">
          <Heading size="4">MEXI</Heading>
          <Badge color="indigo" variant="soft">
            Builder option
          </Badge>
          <Badge color="gray" variant="soft">
            LSF specialist
          </Badge>
        </Flex>
        <Text size="2" color="gray">
          Producător român specializat 100% pe Light Steel Frame, cu fabrică
          proprie în Oradea și rețea națională de parteneri (acoperă Brașov).
        </Text>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            De ce e o opțiune serioasă
          </Text>
          <Text size="2" color="gray">
            • 1.000+ construcții finalizate (RO, Italia seismică, Norvegia cu
            sarcini mari de zăpadă)
          </Text>
          <Text size="2" color="gray">
            • Garanție pe viață contractuală pentru fiecare construcție
          </Text>
          <Text size="2" color="gray">
            • Profile C/Z/U dublu-galvanizate, 1.5–3.5 mm, cold-formed
          </Text>
          <Text size="2" color="gray">
            • 1.100+ proiecte tipizate în catalog — operațional matur
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Proiecte casă + garaj relevante
          </Text>
          <Text size="2" color="gray">
            • B III 5 — 80 m² (parter, garaj 21 m², 2 dormitoare)
          </Text>
          <Text size="2" color="gray">
            • B XII (1–5) — 149 m² cu garaj integrat (5 variante de fațadă)
          </Text>
          <RadixLink
            href="https://structurausoara.ro/categorii/cu-garaj/"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            Catalog "cu garaj"
          </RadixLink>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Contact
          </Text>
          <Text size="2" color="gray">
            Dorel Cherecheș (Ro/Hu): +40 773 751 610
          </Text>
          <Text size="2" color="gray">
            Szilárd Palásti (Ro/Hu): +40 749 011 448
          </Text>
          <RadixLink
            href="https://www.casemexi.ro/contact"
            target="_blank"
            rel="noopener noreferrer"
            size="2"
          >
            casemexi.ro/contact
          </RadixLink>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            De cerut în ofertă (Brașov)
          </Text>
          <Text size="2" color="gray">
            • Calcul seismic explicit pentru zona Brașov
          </Text>
          <Text size="2" color="gray">
            • Grosime profile ≥ 2.0 mm pe elemente portante, zincare Z275 min
          </Text>
          <Text size="2" color="gray">
            • Document de garanție în scris (text exact, nu doar nr. de ani)
          </Text>
          <Text size="2" color="gray">
            • Ofertă la cheie cu transport Oradea → Brașov inclus
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
}

function HouseContent() {
  const { data, loading, error } = useGetGoalQuery({
    variables: { slug: "house" },
  });

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  const goal = data?.goal;

  return (
    <Flex direction="column" gap="4" p="4">
      <Heading size="6">House</Heading>
      <Card>
        <Flex direction="column" gap="2" p="4">
          {error ? (
            <Text color="red">Error: {error.message}</Text>
          ) : !goal ? (
            <Text color="gray">
              No goal with slug &quot;house&quot; found. Create a goal with slug
              &quot;house&quot; in /goals to populate this page.
            </Text>
          ) : (
            <>
              <Text size="2" color="gray">
                Tied to goal
              </Text>
              <Heading size="4">{goal.title}</Heading>
              <Text color="gray">Empty for now.</Text>
            </>
          )}
        </Flex>
      </Card>
      <MexiBuilderCard />
    </Flex>
  );
}

export default function HousePage() {
  return (
    <AuthGate pageName="House" description="Sign in to view the household.">
      <HouseContent />
    </AuthGate>
  );
}
