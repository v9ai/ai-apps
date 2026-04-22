"use client";

import { useEffect, useState } from "react";
import VaultUnlockDialog from "./VaultUnlockDialog";
import { useLockVaultMutation } from "@/app/__generated__/hooks";

export function VaultShortcut() {
  const [open, setOpen] = useState(false);

  const [lockVault] = useLockVaultMutation({
    refetchQueries: ["VaultStatus", "GetJournalEntries", "GetAllTags"],
  });

  useEffect(() => {
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
  }, [lockVault]);

  return <VaultUnlockDialog open={open} onOpenChange={setOpen} />;
}
