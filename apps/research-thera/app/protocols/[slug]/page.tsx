"use client";

import { use } from "react";
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
  Select,
  AlertDialog,
} from "@radix-ui/themes";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  useProtocolQuery,
  useUpdateProtocolStatusMutation,
  useDeleteSupplementMutation,
  ProtocolDocument,
} from "../../__generated__/hooks";
import { AuthGate } from "../../components/AuthGate";
import { AddSupplementForm } from "./add-supplement-form";
import { CognitiveBaselineForm } from "./cognitive-baseline-form";
import { CognitiveCheckInForm } from "./cognitive-check-in-form";

const STATUSES = ["active", "paused", "completed"];

export default function ProtocolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return (
    <AuthGate
      pageName="Protocol"
      description="Sign in to view this protocol."
    >
      <ProtocolDetailContent slug={slug} />
    </AuthGate>
  );
}

function ProtocolDetailContent({ slug }: { slug: string }) {
  const { data, loading, error } = useProtocolQuery({ variables: { slug } });
  const detail = data?.protocol;

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
        <Text color="red">Error loading protocol</Text>
        <Text size="1" color="gray">
          {error.message}
        </Text>
      </Flex>
    );
  }
  if (!detail) {
    return (
      <Flex direction="column" align="center" gap="3" py="9">
        <Heading size="4">Protocol not found</Heading>
        <Link href="/protocols">
          <Button variant="soft">Back to protocols</Button>
        </Link>
      </Flex>
    );
  }

  return <ProtocolDetail detail={detail} />;
}

type Detail = NonNullable<
  ReturnType<typeof useProtocolQuery>["data"]
>["protocol"];

function ProtocolDetail({ detail }: { detail: Detail }) {
  if (!detail) return null;
  const { protocol, supplements, baseline, checkIns } = detail;

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="2">
          <Link href="/protocols" style={{ textDecoration: "none" }}>
            <Flex align="center" gap="1">
              <ArrowLeft size={14} />
              <Text size="1" color="gray">
                All protocols
              </Text>
            </Flex>
          </Link>
          <Flex justify="between" align="start" wrap="wrap" gap="3">
            <Flex direction="column" gap="1">
              <Heading size="7" weight="bold">
                {protocol.name}
              </Heading>
              {protocol.startDate && (
                <Text size="2" color="gray">
                  Since {new Date(protocol.startDate).toLocaleDateString()}
                </Text>
              )}
            </Flex>
            <StatusSelector id={protocol.id} status={protocol.status} />
          </Flex>
          {protocol.targetAreas.length > 0 && (
            <Flex gap="1" wrap="wrap">
              {protocol.targetAreas.map((a) => (
                <Badge key={a} color="indigo" variant="soft" size="1">
                  {a}
                </Badge>
              ))}
            </Flex>
          )}
          {protocol.notes && (
            <Text size="2" color="gray">
              {protocol.notes}
            </Text>
          )}
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Supplements ({supplements.length})</Heading>
          {supplements.length > 0 && (
            <Flex direction="column" gap="2">
              {supplements.map((s) => (
                <SupplementRow
                  key={s.id}
                  id={s.id}
                  name={s.name}
                  dosage={s.dosage}
                  frequency={s.frequency}
                  mechanism={s.mechanism ?? null}
                  notes={s.notes ?? null}
                  url={s.url ?? null}
                />
              ))}
            </Flex>
          )}
          <AddSupplementForm protocolId={protocol.id} slug={protocol.slug} />
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Cognitive baseline</Heading>
          {baseline ? (
            <Card>
              <Flex direction="column" gap="2" p="2">
                <Text size="1" color="gray">
                  Recorded {new Date(baseline.recordedAt).toLocaleDateString()}
                </Text>
                <ScoreRow scores={baseline} />
              </Flex>
            </Card>
          ) : (
            <Text size="2" color="gray">
              No baseline recorded yet — capture one before starting check-ins.
            </Text>
          )}
          <CognitiveBaselineForm
            protocolId={protocol.id}
            slug={protocol.slug}
            existing={baseline ?? null}
          />
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Check-ins ({checkIns.length})</Heading>
          {checkIns.length > 0 && (
            <Flex direction="column" gap="2">
              {checkIns.map((c) => (
                <Card key={c.id}>
                  <Flex direction="column" gap="2" p="1">
                    <Text size="1" color="gray">
                      {new Date(c.recordedAt).toLocaleString()}
                    </Text>
                    <ScoreRow scores={c} />
                    {c.sideEffects && (
                      <Text size="1" color="amber">
                        Side effects: {c.sideEffects}
                      </Text>
                    )}
                    {c.notes && (
                      <Text size="2" color="gray">
                        {c.notes}
                      </Text>
                    )}
                  </Flex>
                </Card>
              ))}
            </Flex>
          )}
          <CognitiveCheckInForm
            protocolId={protocol.id}
            slug={protocol.slug}
          />
        </Flex>
      </Flex>
    </Box>
  );
}

function StatusSelector({ id, status }: { id: string; status: string }) {
  const [updateStatus, { loading }] = useUpdateProtocolStatusMutation();
  return (
    <Select.Root
      value={status}
      onValueChange={(value) =>
        updateStatus({ variables: { id, status: value } })
      }
      disabled={loading}
    >
      <Select.Trigger />
      <Select.Content>
        {STATUSES.map((s) => (
          <Select.Item key={s} value={s}>
            {s}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

function SupplementRow({
  id,
  name,
  dosage,
  frequency,
  mechanism,
  notes,
  url,
}: {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  mechanism: string | null;
  notes: string | null;
  url: string | null;
}) {
  const [deleteSupp, { loading: deleting }] = useDeleteSupplementMutation({
    refetchQueries: [{ query: ProtocolDocument }],
  });

  return (
    <Card>
      <Flex justify="between" align="start" gap="3">
        <Flex direction="column" gap="1" style={{ flexGrow: 1, minWidth: 0 }}>
          <Flex align="center" gap="2" wrap="wrap">
            <Text size="2" weight="medium">
              {name}
            </Text>
            <Badge color="blue" variant="soft" size="1">
              {dosage}
            </Badge>
            <Text size="1" color="gray">
              {frequency}
            </Text>
          </Flex>
          {mechanism && (
            <Text size="1" color="gray">
              {mechanism}
            </Text>
          )}
          {notes && (
            <Text size="1" color="gray">
              {notes}
            </Text>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12, color: "var(--indigo-11)" }}
            >
              {new URL(url).hostname}
            </a>
          )}
        </Flex>

        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button
              variant="ghost"
              color="gray"
              size="1"
              disabled={deleting}
              aria-label="Delete supplement"
            >
              <Trash2 size={14} />
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="400px">
            <AlertDialog.Title>Remove supplement?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              This supplement will be permanently removed from the protocol.
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
                  onClick={() => deleteSupp({ variables: { id } })}
                >
                  Delete
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </Flex>
    </Card>
  );
}

type Scores = {
  memoryScore?: number | null;
  focusScore?: number | null;
  processingSpeedScore?: number | null;
  moodScore?: number | null;
  sleepScore?: number | null;
};

function ScoreRow({ scores }: { scores: Scores }) {
  const fields: Array<[string, number | null | undefined]> = [
    ["Memory", scores.memoryScore],
    ["Focus", scores.focusScore],
    ["Speed", scores.processingSpeedScore],
    ["Mood", scores.moodScore],
    ["Sleep", scores.sleepScore],
  ];
  return (
    <Flex gap="3" wrap="wrap">
      {fields.map(([label, v]) => (
        <Flex key={label} direction="column" gap="0">
          <Text size="1" color="gray">
            {label}
          </Text>
          <Text size="2" weight="medium">
            {v == null ? "—" : v}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
}
