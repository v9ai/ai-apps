"use client";

import { Button } from "@radix-ui/themes";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  return (
    <Button
      variant="soft"
      color="gray"
      onClick={() =>
        signOut({
          fetchOptions: {
            onSuccess: () => {
              window.location.href = "/login";
            },
          },
        })
      }
    >
      Sign out
    </Button>
  );
}
