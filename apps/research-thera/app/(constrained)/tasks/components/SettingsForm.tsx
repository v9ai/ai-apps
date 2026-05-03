"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Flex,
  Select,
  Slider,
  Switch,
  Text,
} from "@radix-ui/themes";
import { useUpdateUserPreferencesMutation } from "@/app/__generated__/hooks";

export function SettingsForm({
  chronotype,
  chunkSize,
  gamificationEnabled,
  bufferPercentage,
  priorityWeights,
}: {
  chronotype: string;
  chunkSize: number;
  gamificationEnabled: boolean;
  bufferPercentage: number;
  priorityWeights: {
    deadlineUrgency: number;
    userValue: number;
    dependencyImpact: number;
    projectWeight: number;
  };
}) {
  const [chrono, setChrono] = useState(chronotype);
  const [chunk, setChunk] = useState(chunkSize);
  const [gamification, setGamification] = useState(gamificationEnabled);
  const [buffer, setBuffer] = useState(bufferPercentage);
  const [weights, setWeights] = useState(priorityWeights);
  const [saved, setSaved] = useState(false);

  const [updatePrefs, { loading: isPending }] = useUpdateUserPreferencesMutation({
    refetchQueries: ["GetUserPreferences"],
  });

  async function handleSave() {
    await updatePrefs({
      variables: {
        input: {
          chronotype: chrono,
          chunkSize: chunk,
          gamificationEnabled: gamification,
          bufferPercentage: buffer,
          priorityWeights: weights,
        },
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Flex direction="column" gap="4" style={{ maxWidth: 500 }}>
      <Card>
        <Flex direction="column" gap="4" style={{ padding: 8 }}>
          <Text size="3" weight="bold">Schedule</Text>

          <Flex direction="column" gap="1">
            <Text size="2">Chronotype</Text>
            <Select.Root value={chrono} onValueChange={setChrono}>
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="early_bird">Early Bird</Select.Item>
                <Select.Item value="intermediate">Intermediate</Select.Item>
                <Select.Item value="night_owl">Night Owl</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2">Buffer percentage: {buffer}%</Text>
            <Slider value={[buffer]} onValueChange={(v) => setBuffer(v[0])} min={0} max={50} step={5} />
          </Flex>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="4" style={{ padding: 8 }}>
          <Text size="3" weight="bold">Display</Text>

          <Flex direction="column" gap="1">
            <Text size="2">Chunk size (tasks per page): {chunk}</Text>
            <Slider value={[chunk]} onValueChange={(v) => setChunk(v[0])} min={3} max={12} step={1} />
          </Flex>

          <Flex align="center" justify="between">
            <Text size="2">Gamification (streaks, progress)</Text>
            <Switch checked={gamification} onCheckedChange={setGamification} />
          </Flex>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="4" style={{ padding: 8 }}>
          <Text size="3" weight="bold">Priority Weights</Text>
          <Text size="1" color="gray">Must sum to 1.0</Text>

          {(
            [
              ["deadlineUrgency", "Deadline Urgency"],
              ["userValue", "User Value"],
              ["dependencyImpact", "Dependency Impact"],
              ["projectWeight", "Project Weight"],
            ] as const
          ).map(([key, label]) => (
            <Flex key={key} direction="column" gap="1">
              <Text size="2">
                {label}: {weights[key].toFixed(2)}
              </Text>
              <Slider
                value={[weights[key] * 100]}
                onValueChange={(v) =>
                  setWeights((w) => ({ ...w, [key]: v[0] / 100 }))
                }
                min={0}
                max={100}
                step={5}
              />
            </Flex>
          ))}
        </Flex>
      </Card>

      <Flex gap="2" align="center">
        <Button onClick={handleSave} disabled={isPending} size="3">
          {isPending ? "Saving..." : "Save Settings"}
        </Button>
        {saved && <Text size="2" color="green">Saved!</Text>}
      </Flex>
    </Flex>
  );
}
