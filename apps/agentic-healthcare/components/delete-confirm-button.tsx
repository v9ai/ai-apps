"use client";

import { useRef } from "react";
import { AlertDialog, Button, Flex, IconButton } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";

type DeleteConfirmButtonProps = {
  action: (formData: FormData) => void;
  description: string;
  variant?: "icon-ghost" | "icon-red" | "button";
  stopPropagation?: boolean;
};

export function DeleteConfirmButton({
  action,
  description,
  variant = "icon-ghost",
  stopPropagation = false,
}: DeleteConfirmButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <span onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}>
          {variant === "button" ? (
            <Button type="button" color="red" variant="soft" size="1">
              Delete
            </Button>
          ) : variant === "icon-red" ? (
            <IconButton type="button" variant="soft" color="red" size="2" aria-label="Delete">
              <Cross2Icon />
            </IconButton>
          ) : (
            <IconButton type="button" variant="ghost" color="gray" size="1" aria-label="Remove">
              <Cross2Icon />
            </IconButton>
          )}
        </span>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="400px">
        <AlertDialog.Title>Are you sure?</AlertDialog.Title>
        <AlertDialog.Description size="2">
          {description}
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button
              variant="solid"
              color="red"
              onClick={() => formRef.current?.requestSubmit()}
            >
              Delete
            </Button>
          </AlertDialog.Action>
        </Flex>
        <form ref={formRef} action={action} style={{ display: "none" }} />
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
