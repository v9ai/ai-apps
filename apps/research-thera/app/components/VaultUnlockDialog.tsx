"use client";

import { useState } from "react";
import { Button, Dialog, Flex, Text, TextField } from "@radix-ui/themes";
import { useUnlockVaultMutation } from "@/app/__generated__/hooks";

interface VaultUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked?: () => void;
}

export default function VaultUnlockDialog({
  open,
  onOpenChange,
  onUnlocked,
}: VaultUnlockDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [unlockVault, { loading }] = useUnlockVaultMutation({
    onCompleted: (data) => {
      if (data?.unlockVault?.unlocked) {
        setPin("");
        setError(null);
        onOpenChange(false);
        onUnlocked?.();
      } else {
        setError(data?.unlockVault?.message || "Invalid PIN");
      }
    },
    onError: () => {
      setError("Something went wrong");
    },
    refetchQueries: ["VaultStatus", "GetJournalEntries", "GetAllTags"],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError("Enter your PIN");
      return;
    }
    setError(null);
    await unlockVault({ variables: { pin } });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPin("");
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <Dialog.Content style={{ maxWidth: 360 }}>
        <Dialog.Title>Enter PIN</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Session PIN required.
        </Dialog.Description>

        <form onSubmit={handleSubmit} autoComplete="off">
          <Flex direction="column" gap="3">
            <TextField.Root
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              autoFocus
              disabled={loading}
              autoComplete="off"
            />
            {error && (
              <Text color="red" size="2">
                {error}
              </Text>
            )}
            <Flex gap="3" justify="end" mt="2">
              <Dialog.Close>
                <Button variant="soft" color="gray" disabled={loading} type="button">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={loading || !pin}>
                {loading ? "…" : "Unlock"}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
