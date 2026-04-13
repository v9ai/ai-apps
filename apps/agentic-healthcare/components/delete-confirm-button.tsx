"use client";

import { Button, IconButton } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";

type DeleteConfirmButtonProps = {
  action: (formData: FormData) => void;
  description: string;
  variant?: "icon-ghost" | "icon-red" | "button";
  stopPropagation?: boolean;
};

export function DeleteConfirmButton({
  action,
  variant = "icon-ghost",
  stopPropagation = false,
}: DeleteConfirmButtonProps) {
  return (
    <form action={action} style={{ display: "inline" }}>
      <span onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}>
        {variant === "button" ? (
          <Button type="submit" color="red" variant="soft" size="1">
            Delete
          </Button>
        ) : variant === "icon-red" ? (
          <IconButton type="submit" variant="soft" color="red" size="2" aria-label="Delete">
            <Cross2Icon />
          </IconButton>
        ) : (
          <IconButton type="submit" variant="ghost" color="gray" size="1" aria-label="Remove">
            <Cross2Icon />
          </IconButton>
        )}
      </span>
    </form>
  );
}
