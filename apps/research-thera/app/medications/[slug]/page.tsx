"use client";

import {
  Box,
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  Separator,
  Spinner,
  Button,
  AlertDialog,
} from "@radix-ui/themes";
import { ArrowLeft, Info, Pill, RotateCcw, Trash2 } from "lucide-react";
import { words } from "lodash";
import Link from "next/link";
import { useParams, useRouter, notFound } from "next/navigation";
import {
  useMedicationsQuery,
  useDeleteMedicationMutation,
  useSetMedicationActiveMutation,
  MedicationsDocument,
} from "../../__generated__/hooks";
import { AuthGate } from "../../components/AuthGate";
import { MontelukastSafetyPanel } from "../../components/MontelukastSafetyPanel";

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

export function slugify(name: string): string {
  return (words(name)[0] ?? "").toLowerCase();
}

export default function MedicationSlugPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const personConfig = PERSONS[slug];

  return (
    <AuthGate
      pageName={
        personConfig ? `${personConfig.label}'s medications` : "Medication"
      }
      description="Sign in to access your records."
    >
      {personConfig ? (
        <PersonView label={personConfig.label} filter={personConfig.filter} />
      ) : (
        <MedicationDetail slug={slug} />
      )}
    </AuthGate>
  );
}

function PersonView({
  label,
  filter,
}: {
  label: string;
  filter: (name: string) => boolean;
}) {
  const { data, loading, error } = useMedicationsQuery();
  const meds = (data?.medications ?? []).filter((m) => filter(m.name));
  const current = meds.filter((m) => m.isActive);
  const past = meds.filter((m) => !m.isActive);

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            Medications · {label}
          </Heading>
          <Text size="3" color="gray">
            Medications filtered for {label}.
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
            <Heading size="4">No medications</Heading>
            <Text size="2" color="gray">
              Nothing matches {label}.
            </Text>
          </Flex>
        )}

        {!loading && !error && current.length > 0 && (
          <MedicationSection
            title={`Currently taking (${current.length})`}
            meds={current}
          />
        )}

        {!loading && !error && past.length > 0 && (
          <MedicationSection title={`Past (${past.length})`} meds={past} muted />
        )}
      </Flex>
    </Box>
  );
}

function MedicationSection({
  title,
  meds,
  muted = false,
}: {
  title: string;
  meds: ReadonlyArray<{
    id: string;
    name: string;
    dosage?: string | null;
    frequency?: string | null;
    notes?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    isActive: boolean;
  }>;
  muted?: boolean;
}) {
  return (
    <Flex direction="column" gap="3">
      <Heading size="4" color={muted ? "gray" : undefined}>
        {title}
      </Heading>
      <Flex
        direction="column"
        gap="3"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          opacity: muted ? 0.7 : 1,
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
    </Flex>
  );
}

function MedicationDetail({ slug }: { slug: string }) {
  const router = useRouter();
  const { data, loading, error } = useMedicationsQuery();
  const [deleteMed, { loading: deleting }] = useDeleteMedicationMutation({
    refetchQueries: [{ query: MedicationsDocument }],
    onCompleted: () => router.push("/medications"),
  });

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
        <Text color="red">Error loading medication</Text>
        <Text size="1" color="gray">
          {error.message}
        </Text>
      </Flex>
    );
  }

  const med = data?.medications.find((m) => slugify(m.name) === slug);
  if (!med) notFound();

  const isMontelukast = /singulair|montelukast/i.test(med.name);

  return (
    <Box py="6">
      <Flex direction="column" gap="5">
        <Flex align="center" gap="2">
          <Link href="/medications">
            <Button variant="ghost" color="gray" size="2">
              <ArrowLeft size={14} /> Back
            </Button>
          </Link>
        </Flex>

        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            {med.name}
          </Heading>
          <Flex align="center" gap="2" wrap="wrap">
            {med.dosage && (
              <Badge color="blue" variant="soft">
                {med.dosage}
              </Badge>
            )}
            {med.frequency && (
              <Badge color="gray" variant="soft">
                {med.frequency}
              </Badge>
            )}
          </Flex>
        </Flex>

        <Separator size="4" />

        <Card>
          <Flex direction="column" gap="3">
            {med.notes && (
              <Flex direction="column" gap="1">
                <Text size="1" color="gray" weight="medium">
                  Notes
                </Text>
                <Text size="2" style={{ whiteSpace: "pre-wrap" }}>
                  {med.notes}
                </Text>
              </Flex>
            )}
            {(med.startDate || med.endDate) && (
              <Flex direction="column" gap="1">
                <Text size="1" color="gray" weight="medium">
                  Dates
                </Text>
                <Text size="2">
                  {med.startDate ?? "?"} → {med.endDate ?? "ongoing"}
                </Text>
              </Flex>
            )}
          </Flex>
        </Card>

        {isMontelukast && <MontelukastSafetyPanel />}

        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button color="red" variant="soft" disabled={deleting}>
              <Trash2 size={14} /> Delete medication
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="400px">
            <AlertDialog.Title>Delete medication?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              {med.name} will be permanently removed.
            </AlertDialog.Description>
            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button
                  color="red"
                  onClick={() => deleteMed({ variables: { id: med.id } })}
                >
                  Delete
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </Flex>
    </Box>
  );
}

export function MedicationCard({
  id,
  name,
  dosage,
  frequency,
  notes,
  startDate,
  endDate,
  isActive,
}: {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}) {
  const [deleteMed, { loading: deleting }] = useDeleteMedicationMutation({
    refetchQueries: [{ query: MedicationsDocument }],
  });
  const [setActive, { loading: toggling }] = useSetMedicationActiveMutation({
    refetchQueries: [{ query: MedicationsDocument }],
  });

  return (
    <Card>
      <Flex justify="between" align="start" gap="2">
        <Link
          href={`/medications/${slugify(name)}`}
          style={{
            flexGrow: 1,
            minWidth: 0,
            color: "inherit",
            textDecoration: "none",
          }}
        >
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2" wrap="wrap">
              <Text size="2" weight="medium">
                {name}
              </Text>
              {dosage && (
                <Badge color="blue" variant="soft" size="1">
                  {dosage}
                </Badge>
              )}
            </Flex>
            {frequency && (
              <Text size="1" color="gray">
                {frequency}
              </Text>
            )}
            {notes && (
              <Text
                size="1"
                color="gray"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {notes}
              </Text>
            )}
            {(startDate || endDate) && (
              <Text size="1" color="gray">
                {startDate ?? "?"} → {endDate ?? "ongoing"}
              </Text>
            )}
          </Flex>
        </Link>

        <Flex direction="column" align="end" gap="1" style={{ flexShrink: 0 }}>
          {slugify(name) === "singulair" && (
            <Link
              href="/medications/singulair"
              aria-label="Singulair patient information leaflet"
              style={{
                display: "inline-flex",
                color: "var(--gray-11)",
                padding: 4,
              }}
            >
              <Info size={14} />
            </Link>
          )}
          <Button
            variant="ghost"
            color="gray"
            size="1"
            disabled={toggling}
            aria-label={isActive ? "Mark as past" : "Mark as currently taking"}
            title={isActive ? "Mark as past" : "Mark as currently taking"}
            onClick={() =>
              setActive({ variables: { id, isActive: !isActive } })
            }
          >
            <RotateCcw size={14} />
          </Button>
          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button
                variant="ghost"
                color="gray"
                size="1"
                disabled={deleting}
                aria-label="Delete medication"
              >
                <Trash2 size={14} />
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content maxWidth="400px">
              <AlertDialog.Title>Delete medication?</AlertDialog.Title>
              <AlertDialog.Description size="2">
                This medication will be permanently removed.
              </AlertDialog.Description>
              <Flex gap="3" mt="4" justify="end">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button
                    color="red"
                    onClick={() => deleteMed({ variables: { id } })}
                  >
                    Delete
                  </Button>
                </AlertDialog.Action>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </Flex>
      </Flex>
    </Card>
  );
}
