"use client";

import { useState } from "react";
import { Button, Dialog } from "@radix-ui/themes";
import { SettingsForm } from "./SettingsForm";

export function SettingsModal({
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
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button variant="ghost" size="2" style={{ cursor: "pointer" }}>
          ⚙ Settings
        </Button>
      </Dialog.Trigger>

      <Dialog.Content size="3" style={{ maxWidth: 540 }}>
        <Dialog.Title size="4">Settings</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          Customize your preferences
        </Dialog.Description>

        <div style={{ marginTop: 12 }}>
          <SettingsForm
            chronotype={chronotype}
            chunkSize={chunkSize}
            gamificationEnabled={gamificationEnabled}
            bufferPercentage={bufferPercentage}
            priorityWeights={priorityWeights}
          />
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
