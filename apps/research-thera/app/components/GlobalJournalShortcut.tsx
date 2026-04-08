"use client";

import { useEffect, useState } from "react";
import AddJournalEntryButton from "./AddJournalEntryButton";

export function GlobalJournalShortcut() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <AddJournalEntryButton
      controlledOpen={open}
      onControlledOpenChange={setOpen}
    />
  );
}
