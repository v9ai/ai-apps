"use client";

import { use } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Separator,
  Spinner,
  Text,
} from "@radix-ui/themes";
import { ArrowLeft, ShieldAlert, Pill, Heart } from "lucide-react";
import Link from "next/link";
import {
  useAllergiesQuery,
  useConditionsQuery,
  useGetFamilyMemberQuery,
  useMedicationsQuery,
} from "../../__generated__/hooks";
import { Card } from "@radix-ui/themes";
import { AuthGate } from "../../components/AuthGate";
import { AddAllergyForm } from "../add-allergy-form";
import { AllergyCard } from "../allergy-card";

export default function PersonAllergiesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return (
    <AuthGate
      pageName="Allergies"
      description="Sign in to view this person's allergies."
    >
      <PersonAllergiesContent slug={slug} />
    </AuthGate>
  );
}

function PersonAllergiesContent({ slug }: { slug: string }) {
  const {
    data: memberData,
    loading: memberLoading,
    error: memberError,
  } = useGetFamilyMemberQuery({ variables: { slug } });
  const {
    data: allergiesData,
    loading: allergiesLoading,
    error: allergiesError,
  } = useAllergiesQuery();
  const {
    data: medsData,
    loading: medsLoading,
    error: medsError,
  } = useMedicationsQuery();
  const {
    data: conditionsData,
    loading: conditionsLoading,
    error: conditionsError,
  } = useConditionsQuery();

  const member = memberData?.familyMember;
  const loading =
    memberLoading || allergiesLoading || medsLoading || conditionsLoading;
  const error =
    memberError ?? allergiesError ?? medsError ?? conditionsError;

  if (loading) {
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex direction="column" align="center" p="6" gap="2">
        <Text color="red">Error loading allergies</Text>
        <Text size="1" color="gray">
          {error.message}
        </Text>
      </Flex>
    );
  }

  if (!member) {
    return (
      <Flex direction="column" align="center" gap="3" py="9">
        <Heading size="4">Person not found</Heading>
        <Text size="2" color="gray">
          We couldn&apos;t find anyone with the slug &ldquo;{slug}&rdquo;.
        </Text>
        <Link href="/allergies">
          <Button variant="soft">
            <ArrowLeft size={14} /> Back to all allergies
          </Button>
        </Link>
      </Flex>
    );
  }

  const personAllergies = (allergiesData?.allergies ?? []).filter(
    (a) => a.familyMemberId === member.id,
  );
  const personMedications = (medsData?.medications ?? []).filter(
    (m) => m.familyMemberId === member.id,
  );
  const personConditions = (conditionsData?.conditions ?? []).filter(
    (c) => c.familyMemberId === member.id,
  );
  const personDisplayName = member.firstName + (member.name ? ` (${member.name})` : "");

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="2">
          <Link href="/allergies" style={{ textDecoration: "none" }}>
            <Flex align="center" gap="1">
              <ArrowLeft size={14} color="var(--gray-10)" />
              <Text size="2" color="gray">
                All allergies
              </Text>
            </Flex>
          </Link>
          <Flex align="center" gap="3" wrap="wrap">
            <Heading size={{ initial: "6", md: "8" }} weight="bold">
              {personDisplayName}
            </Heading>
            {member.relationship && (
              <Badge color="cyan" variant="soft">
                {member.relationship}
              </Badge>
            )}
          </Flex>
          <Text size="3" color="gray">
            Allergies &amp; intolerances for {member.firstName}.
          </Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Add an entry for {member.firstName}</Heading>
          <AddAllergyForm lockedFamilyMemberId={member.id} />
        </Flex>

        <Separator size="4" />

        {personAllergies.length === 0 ? (
          <Flex direction="column" align="center" gap="3" py="9">
            <ShieldAlert size={48} color="var(--gray-8)" />
            <Heading size="4">
              No allergies recorded for {member.firstName} yet
            </Heading>
            <Text size="2" color="gray">
              Add an entry above to start tracking.
            </Text>
          </Flex>
        ) : (
          <Flex direction="column" gap="3">
            <Heading size="4">
              Entries ({personAllergies.length})
            </Heading>
            <Flex
              direction="column"
              gap="3"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              }}
            >
              {personAllergies.map((a) => (
                <AllergyCard
                  key={a.id}
                  id={a.id}
                  kind={a.kind}
                  name={a.name}
                  severity={a.severity ?? null}
                  notes={a.notes ?? null}
                  createdAt={a.createdAt}
                  personLabel={null}
                />
              ))}
            </Flex>
          </Flex>
        )}

        {personConditions.length > 0 && (
          <>
            <Separator size="4" />
            <Flex direction="column" gap="3">
              <Flex align="center" gap="2">
                <Heart size={18} color="var(--gray-11)" />
                <Heading size="4">
                  Conditions ({personConditions.length})
                </Heading>
              </Flex>
              <Flex
                direction="column"
                gap="3"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                }}
              >
                {personConditions.map((c) => (
                  <ConditionCard
                    key={c.id}
                    name={c.name}
                    notes={c.notes ?? null}
                    createdAt={c.createdAt}
                  />
                ))}
              </Flex>
            </Flex>
          </>
        )}

        {personMedications.length > 0 && (
          <>
            <Separator size="4" />
            <Flex direction="column" gap="3">
              <Flex align="center" gap="2">
                <Pill size={18} color="var(--gray-11)" />
                <Heading size="4">
                  Medications ({personMedications.length})
                </Heading>
              </Flex>
              <Flex
                direction="column"
                gap="3"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                }}
              >
                {personMedications.map((m) => (
                  <MedicationCard
                    key={m.id}
                    id={m.id}
                    name={m.name}
                    dosage={m.dosage ?? null}
                    frequency={m.frequency ?? null}
                    notes={m.notes ?? null}
                    startDate={m.startDate ?? null}
                    endDate={m.endDate ?? null}
                  />
                ))}
              </Flex>
            </Flex>
          </>
        )}
      </Flex>
    </Box>
  );
}

function ConditionCard({
  name,
  notes,
  createdAt,
}: {
  name: string;
  notes: string | null;
  createdAt: string;
}) {
  return (
    <Card>
      <Flex direction="column" gap="2">
        <Flex align="center" gap="2" wrap="wrap">
          <Text size="2" weight="medium">
            {name}
          </Text>
          <Badge color="indigo" variant="soft" size="1">
            Active
          </Badge>
        </Flex>
        {notes && (
          <Text
            size="1"
            color="gray"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {notes}
          </Text>
        )}
        <Text size="1" color="gray">
          Recorded {new Date(createdAt).toLocaleDateString()}
        </Text>
      </Flex>
    </Card>
  );
}

function MedicationCard({
  id,
  name,
  dosage,
  frequency,
  notes,
  startDate,
  endDate,
}: {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
}) {
  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  return (
    <Link
      href={`/medications/m/${id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <Card style={{ cursor: "pointer", height: "100%" }}>
        <Flex direction="column" gap="2">
        <Flex align="center" gap="2" wrap="wrap">
          <Text size="2" weight="medium">
            {name}
          </Text>
          {dosage && (
            <Badge color="indigo" variant="soft" size="1">
              {dosage}
            </Badge>
          )}
          {frequency && (
            <Badge color="gray" variant="outline" size="1">
              {frequency}
            </Badge>
          )}
        </Flex>
        {(start || end) && (
          <Text size="1" color="gray">
            {start ?? "—"} → {end ?? "ongoing"}
          </Text>
        )}
        {notes && (
          <Text
            size="1"
            color="gray"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {notes}
          </Text>
        )}
        </Flex>
      </Card>
    </Link>
  );
}
