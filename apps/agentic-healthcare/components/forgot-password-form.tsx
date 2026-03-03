"use client";

import { createClient } from "@/lib/supabase/client";
import { Button, Card, Callout, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card size="3" style={{ width: "100%", maxWidth: 400 }}>
        <Flex direction="column" gap="3">
          <Heading size="6">Check your email</Heading>
          <Text size="2" color="gray">
            If you registered with this email, you will receive a password reset link shortly.
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

            {error && <Text size="2" color="red">{error}</Text>}

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
