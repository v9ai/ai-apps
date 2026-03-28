"use client";

import { GearIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { Flex, Text } from "@radix-ui/themes";
import { Button } from "@/components/ui";
import { authClient } from "@/lib/auth/client";
import { AuthDialog } from "@/components/AuthDialog";

export function AuthHeader() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <Text size="1" color="gray" style={{ paddingLeft: 4, paddingRight: 4 }}>
        …
      </Text>
    );
  }

  if (!session) {
    return (
      <Flex direction="column" gap="2">
        <AuthDialog
          trigger={
            <Button variant="ghost" size="sm" style={{ width: "100%" }}>
              sign in
            </Button>
          }
          defaultMode="signin"
        />
        <AuthDialog
          trigger={
            <Button variant="solid" size="sm" style={{ width: "100%" }}>
              sign up
            </Button>
          }
          defaultMode="signup"
        />
      </Flex>
    );
  }

  const displayName = session.user.name || session.user.email;

  return (
    <Flex direction="column" gap="2">
      <Text
        size="1"
        color="gray"
        truncate
        title={displayName ?? undefined}
      >
        {displayName}
      </Text>
      <Flex align="center" gap="2">
        <Link href="/settings" style={{ display: "flex", alignItems: "center" }}>
          <GearIcon width={14} height={14} style={{ color: "var(--gray-9)" }} />
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => authClient.signOut()}
        >
          sign out
        </Button>
      </Flex>
    </Flex>
  );
}
