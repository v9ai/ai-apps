"use client";

import {
  Flex,
  Card,
  Badge,
  Button,
  Text,
  AlertDialog,
} from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import {
  BehaviorObservationType,
  BehaviorIntensity,
} from "@/app/__generated__/hooks";

export type { BehaviorObservationType, BehaviorIntensity };

export interface BehaviorObservation {
  id: number;
  observedAt: string;
  observationType: BehaviorObservationType;
  frequency?: number | null;
  intensity?: BehaviorIntensity | null;
  context?: string | null;
  notes?: string | null;
  goalId?: number | null;
}

interface BehaviorObservationsListProps {
  observations: BehaviorObservation[];
  onDelete: (id: number) => void;
  deleting?: boolean;
}

const OBSERVATION_TYPE_LABELS: Record<BehaviorObservationType, string> = {
  [BehaviorObservationType.Refusal]: "Refusal",
  [BehaviorObservationType.TargetOccurred]: "Target Occurred",
  [BehaviorObservationType.Avoidance]: "Avoidance",
  [BehaviorObservationType.Partial]: "Partial",
};

const OBSERVATION_TYPE_COLORS: Record<
  BehaviorObservationType,
  "red" | "green" | "orange" | "blue"
> = {
  [BehaviorObservationType.Refusal]: "red",
  [BehaviorObservationType.TargetOccurred]: "green",
  [BehaviorObservationType.Avoidance]: "orange",
  [BehaviorObservationType.Partial]: "blue",
};

const INTENSITY_COLORS: Record<BehaviorIntensity, "green" | "yellow" | "red"> =
  {
    [BehaviorIntensity.Low]: "green",
    [BehaviorIntensity.Medium]: "yellow",
    [BehaviorIntensity.High]: "red",
  };

function formatObservedAt(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function BehaviorObservationsList({
  observations,
  onDelete,
  deleting = false,
}: BehaviorObservationsListProps) {
  if (observations.length === 0) {
    return (
      <Text size="2" color="gray">
        No behavior observations logged yet
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="2">
      {observations.map((obs) => (
        <Card key={obs.id}>
          <Flex justify="between" align="start" p="3" gap="3">
            {/* Left: type badge + date */}
            <Flex direction="column" gap="1" style={{ minWidth: 140 }}>
              <Badge
                color={OBSERVATION_TYPE_COLORS[obs.observationType]}
                variant="soft"
                size="1"
              >
                {OBSERVATION_TYPE_LABELS[obs.observationType]}
              </Badge>
              <Text size="1" color="gray">
                {formatObservedAt(obs.observedAt)}
              </Text>
            </Flex>

            {/* Middle: frequency, intensity, context */}
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Flex gap="2" align="center" wrap="wrap">
                {obs.frequency != null && (
                  <Text size="2" weight="medium">
                    {obs.frequency}x
                  </Text>
                )}
                {obs.intensity && (
                  <Badge
                    color={INTENSITY_COLORS[obs.intensity]}
                    variant="outline"
                    size="1"
                  >
                    {obs.intensity.charAt(0) +
                      obs.intensity.slice(1).toLowerCase()}
                  </Badge>
                )}
                {obs.context && (
                  <Text size="2" color="gray">
                    {obs.context}
                  </Text>
                )}
              </Flex>
              {obs.notes && (
                <Text size="1" color="gray">
                  {obs.notes}
                </Text>
              )}
            </Flex>

            {/* Right: delete button */}
            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <Button
                  variant="ghost"
                  color="red"
                  size="1"
                  disabled={deleting}
                  style={{ flexShrink: 0 }}
                >
                  <TrashIcon />
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Title>Delete Observation</AlertDialog.Title>
                <AlertDialog.Description>
                  Are you sure you want to delete this behavior observation?
                  This action cannot be undone.
                </AlertDialog.Description>
                <Flex gap="3" justify="end" mt="4">
                  <AlertDialog.Cancel>
                    <Button variant="soft" color="gray">
                      Cancel
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button
                      color="red"
                      disabled={deleting}
                      onClick={() => onDelete(obs.id)}
                    >
                      Delete
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </AlertDialog.Content>
            </AlertDialog.Root>
          </Flex>
        </Card>
      ))}
    </Flex>
  );
}
