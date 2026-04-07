"use client";

import { authClient } from "@/lib/auth-client";
import {
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  Spinner,
  Text,
  TextField,
} from "@radix-ui/themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { css } from "styled-system/css";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) throw new Error(error.message);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      size="3"
      className={css({ width: "100%", maxWidth: "420px" })}
    >
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size="6">Sign in</Heading>
          <Text size="2" color="gray">
            Enter your email to sign in to your account
          </Text>
        </Flex>

        <form onSubmit={handleLogin}>
          <Flex direction="column" gap="5">
            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="bold" htmlFor="email">
                Email
              </Text>
              <TextField.Root
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Flex>

            <Flex direction="column" gap="1">
              <Flex justify="between" align="center">
                <Text as="label" size="2" weight="bold" htmlFor="password">
                  Password
                </Text>
                <Text size="2" asChild>
                  <Link
                    href="/auth/forgot-password"
                    className={css({
                      color: "var(--accent-9)",
                      textDecoration: "none",
                      _hover: { textDecoration: "underline" },
                    })}
                  >
                    Forgot password?
                  </Link>
                </Text>
              </Flex>
              <TextField.Root
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Flex>

            {error && (
              <Callout.Root color="red" size="1">
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            )}

            <Button type="submit" disabled={isLoading} style={{ width: "100%" }}>
              {isLoading && <Spinner />}
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </Flex>
        </form>

        <Text size="2" align="center" color="gray">
          No account?{" "}
          <Link
            href="/auth/sign-up"
            className={css({
              color: "var(--accent-9)",
              textDecoration: "none",
              _hover: { textDecoration: "underline" },
            })}
          >
            Sign up
          </Link>
        </Text>
      </Flex>
    </Card>
  );
}
