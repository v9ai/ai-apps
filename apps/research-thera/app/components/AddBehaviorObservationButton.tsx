"use client";

import { useState } from "react";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  TextArea,
  Select,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import {
  useCreateBehaviorObservationMutation,
  BehaviorObservationType,
  BehaviorIntensity,
} from "@/app/__generated__/hooks";

interface AddBehaviorObservationButtonProps {
  familyMemberId: number;
  refetchQueries?: string[];
  size?: "1" | "2" | "3";
}

const today = () => new Date().toISOString().split("T")[0];

const defaultForm = () => ({
  observedAt: today(),
  observationType: BehaviorObservationType.TargetOccurred as BehaviorObservationType,
  frequency: "",
  intensity: "" as BehaviorIntensity | "",
  context: "",
  notes: "",
});

export default function AddBehaviorObservationButton({
  familyMemberId,
  refetchQueries: extraRefetchQueries,
  size = "2",
}: AddBehaviorObservationButtonProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);

  const [createObservation, { loading }] = useCreateBehaviorObservationMutation(
    {
      onCompleted: () => {
        setOpen(false);
        setForm(defaultForm);
        setError(null);
      },
      onError: (err) => setError(err.message),
      refetchQueries: [
        "GetBehaviorObservations",
        ...(extraRefetchQueries ?? []),
      ],
    },
  );

  const resetForm = () => {
    setForm(defaultForm);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.observedAt) {
      setError("Please select an observation date");
      return;
    }

    try {
      await createObservation({
        variables: {
          input: {
            familyMemberId,
            observedAt: form.observedAt,
            observationType: form.observationType,
            frequency: form.frequency ? parseInt(form.frequency, 10) : undefined,
            intensity: form.intensity || undefined,
            context: form.context.trim() || undefined,
            notes: form.notes.trim() || undefined,
          },
        },
      });
    } catch (err) {
      console.error("Failed to create behavior observation:", err);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <Dialog.Trigger>
        <Button size={size}>
          <PlusIcon width="16" height="16" />
          Log Observation
        </Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 500 }}>
        <Dialog.Title>Log Behavior Observation</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Record a behavioral observation for this family member.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Date *
              </Text>
              <TextField.Root
                type="date"
                value={form.observedAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, observedAt: e.target.value }))
                }
                required
                disabled={loading}
              />
            </label>

            <Flex direction="column" gap="1">
              <Text as="div" size="2" weight="medium">
                Observation Type *
              </Text>
              <Select.Root
                value={form.observationType}
                onValueChange={(value) =>
                  setForm((f) => ({
                    ...f,
                    observationType: value as BehaviorObservationType,
                  }))
                }
                disabled={loading}
              >
                <Select.Trigger style={{ width: "100%" }} />
                <Select.Content>
                  <Select.Item value={BehaviorObservationType.Refusal}>
                    Refusal
                  </Select.Item>
                  <Select.Item value={BehaviorObservationType.TargetOccurred}>
                    Target Occurred
                  </Select.Item>
                  <Select.Item value={BehaviorObservationType.Avoidance}>
                    Avoidance
                  </Select.Item>
                  <Select.Item value={BehaviorObservationType.Partial}>
                    Partial
                  </Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Frequency
              </Text>
              <TextField.Root
                type="number"
                placeholder="How many times?"
                min="0"
                value={form.frequency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, frequency: e.target.value }))
                }
                disabled={loading}
              />
            </label>

            <Flex direction="column" gap="1">
              <Text as="div" size="2" weight="medium">
                Intensity
              </Text>
              <Select.Root
                value={form.intensity || "none"}
                onValueChange={(value) =>
                  setForm((f) => ({
                    ...f,
                    intensity:
                      value === "none" ? "" : (value as BehaviorIntensity),
                  }))
                }
                disabled={loading}
              >
                <Select.Trigger
                  placeholder="Select intensity..."
                  style={{ width: "100%" }}
                />
                <Select.Content>
                  <Select.Item value="none">Not specified</Select.Item>
                  <Select.Item value={BehaviorIntensity.Low}>Low</Select.Item>
                  <Select.Item value={BehaviorIntensity.Medium}>
                    Medium
                  </Select.Item>
                  <Select.Item value={BehaviorIntensity.High}>High</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Context
              </Text>
              <TextField.Root
                placeholder="Where / in what situation?"
                value={form.context}
                onChange={(e) =>
                  setForm((f) => ({ ...f, context: e.target.value }))
                }
                disabled={loading}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Notes
              </Text>
              <TextArea
                placeholder="Additional notes..."
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={3}
                disabled={loading}
              />
            </label>

            {error && (
              <Text color="red" size="2">
                {error}
              </Text>
            )}

            <Flex gap="3" justify="end" mt="4">
              <Dialog.Close>
                <Button variant="soft" color="gray" disabled={loading}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Log Observation"}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
