"use client";

import { Button, Card, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Better Auth doesn't have built-in password reset without the forgetPassword plugin.
    // For now, show a success message directing the user to re-register.
    setSuccess(true);
    setIsLoading(false);
  };

  if (success) {
    return (
      <Card size="3" style={{ width: "100%", maxWidth: 400 }}>
        <Flex direction="column" gap="3">
          <Heading size="6">Password reset</Heading>
          <Text size="2" color="gray">
            Password reset is not yet available. Please create a new account or contact support.
          </Text>
          <Text size="2" asChild>
            <Link href="/auth/login" style={{ color: "var(--accent-9)" }}>Back to sign in</Link>
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card size="3" style={{ width: "100%", maxWidth: 400 }}>
      <Flex direction="column" gap="5">
        <Flex direction="column" gap="1">
          <Heading size="6">Reset password</Heading>
          <Text size="2" color="gray">Enter your email and we'll send you a reset link</Text>
        </Flex>

        <form onSubmit={handleForgotPassword}>
          <Flex direction="column" gap="4">
            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="medium" htmlFor="email">Email</Text>
              <TextField.Root
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Flex>

            <Button type="submit" disabled={isLoading} style={{ width: "100%" }}>
              {isLoading ? "Sending..." : "Send reset link"}
            </Button>
          </Flex>
        </form>

        <Text size="2" align="center" color="gray">
          <Link href="/auth/login" style={{ color: "var(--accent-9)" }}>Back to sign in</Link>
        </Text>
      </Flex>
    </Card>
  );
}
