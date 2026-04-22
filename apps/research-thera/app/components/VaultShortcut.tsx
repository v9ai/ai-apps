"use client";

import { useEffect, useState } from "react";
import VaultUnlockDialog from "./VaultUnlockDialog";
import { useLockVaultMutation } from "@/app/__generated__/hooks";
import { useVaultSession } from "@/app/hooks/useVaultSession";

export function VaultShortcut() {
  const [open, setOpen] = useState(false);
  const { available } = useVaultSession();

  const [lockVault] = useLockVaultMutation({
    refetchQueries: ["VaultStatus", "GetJournalEntries", "GetAllTags"],
  });

  useEffect(() => {
    if (!available) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        if (e.shiftKey) {
          void lockVault();
        } else {
          setOpen(true);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [lockVault, available]);

  if (!available) return null;
  return <VaultUnlockDialog open={open} onOpenChange={setOpen} />;
}
