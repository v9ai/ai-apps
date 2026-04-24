"use client";

import { useEffect } from "react";
import { Card, Flex, Heading, Text, Button, Spinner } from "@radix-ui/themes";
import { LockClosedIcon } from "@radix-ui/react-icons";
import { authClient } from "@/app/lib/auth/client";
import { AuthDialog } from "./AuthDialog";

interface AuthGateProps {
  children: React.ReactNode;
  pageName: string;
  description?: string;
  signInHeading?: string;
  signInLabel?: string;
  createAccountLabel?: string;
}

export function AuthGate({
  children,
  pageName,
  description,
  signInHeading,
  signInLabel,
  createAccountLabel,
}: AuthGateProps) {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  useEffect(() => {
    document.title = `${pageName} | ResearchThera`;
    return () => {
      document.title = "ResearchThera.com";
    };
  }, [pageName]);

  if (isPending) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "240px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (!user) {
    return (
      <Flex justify="center" pt="9">
        <Card
          size="4"
          style={{
            maxWidth: 420,
            width: "100%",
            background: "var(--color-panel-solid)",
            border: "1px solid var(--gray-a4)",
          }}
        >
          <Flex direction="column" align="center" gap="5" py="4">
            <Flex
              align="center"
              justify="center"
              style={{
                width: 48,
                height: 48,
                background: "var(--indigo-a3)",
                borderRadius: "var(--radius-3)",
                flexShrink: 0,
              }}
            >
              <LockClosedIcon width="22" height="22" color="var(--indigo-11)" />
            </Flex>

            <Flex direction="column" align="center" gap="2">
              <Heading size="5" align="center">
                {signInHeading ?? `Sign in to access ${pageName}`}
              </Heading>
              <Text size="2" color="gray" align="center">
                {description ??
                  `Your ${pageName.toLowerCase()} is private and requires authentication.`}
              </Text>
            </Flex>

            <Flex gap="3">
              <AuthDialog
                trigger={
                  <Button size="3" color="indigo">
                    {signInLabel ?? "Sign in"}
                  </Button>
                }
                defaultMode="signin"
              />
              <AuthDialog
                trigger={
                  <Button size="3" variant="soft" color="gray">
                    {createAccountLabel ?? "Create account"}
                  </Button>
                }
                defaultMode="signup"
              />
            </Flex>
          </Flex>
        </Card>
      </Flex>
    );
  }

  return <>{children}</>;
}
