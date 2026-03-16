"use client";

import { Flex, Button, DropdownMenu, Avatar, Text } from "@radix-ui/themes";
import { authClient } from "@/app/lib/auth/client";
import { AuthDialog } from "./AuthDialog";

export default function UserMenu() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  if (isPending) return null;

  if (!user) {
    return (
      <Flex align="center" gap="4">
        <AuthDialog
          trigger={
            <Button variant="ghost" size="2">
              Sign in
            </Button>
          }
          defaultMode="signin"
        />
        <AuthDialog
          trigger={<Button size="2">Sign up</Button>}
          defaultMode="signup"
        />
      </Flex>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          aria-label="Open user menu"
        >
          <Avatar
            size="2"
            src={user.image ?? undefined}
            fallback={(user.name?.[0] ?? user.email[0]).toUpperCase()}
            radius="full"
          />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>
          <Text size="1" color="gray">
            {user.email}
          </Text>
        </DropdownMenu.Label>
        <DropdownMenu.Separator />
        <DropdownMenu.Item color="red" onClick={() => authClient.signOut()}>
          Sign out
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
