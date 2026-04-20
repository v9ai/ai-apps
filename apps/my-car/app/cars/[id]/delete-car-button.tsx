"use client";

import { useState, useTransition } from "react";
import { Button } from "@radix-ui/themes";
import { deleteCarAction } from "@/lib/actions/cars";

export function DeleteCarButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleClick() {
    if (!confirm("Delete this car and all its photos + service records?")) return;
    setError("");
    startTransition(async () => {
      try {
        await deleteCarAction(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete");
      }
    });
  }

  return (
    <div>
      <Button
        variant="soft"
        color="red"
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? "Deleting..." : "Delete car"}
      </Button>
      {error && <div style={{ color: "var(--red-11)", fontSize: 12 }}>{error}</div>}
    </div>
  );
}
