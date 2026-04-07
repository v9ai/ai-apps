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

export function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== repeatPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await authClient.signUp.email({
        name: name || email.split("@")[0],
        email,
        password,
      });
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
          <Heading size="6">Create account</Heading>
          <Text size="2" color="gray">
            Sign up to get started
          </Text>
        </Flex>

        <form onSubmit={handleSignUp}>
          <Flex direction="column" gap="5">
            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="bold" htmlFor="name">
                Name
              </Text>
              <TextField.Root
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Flex>

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
              <Text as="label" size="2" weight="bold" htmlFor="password">
                Password
              </Text>
              <TextField.Root
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Flex>

            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="bold" htmlFor="repeat-password">
                Confirm password
              </Text>
              <TextField.Root
                id="repeat-password"
                type="password"
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
              />
            </Flex>

            {error && (
              <Callout.Root color="red" size="1">
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            )}

            <Button type="submit" disabled={isLoading} style={{ width: "100%" }}>
              {isLoading && <Spinner />}
              {isLoading ? "Creating account..." : "Sign up"}
            </Button>
          </Flex>
        </form>

        <Text size="2" align="center" color="gray">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className={css({
              color: "var(--accent-9)",
              textDecoration: "none",
              _hover: { textDecoration: "underline" },
            })}
          >
            Sign in
          </Link>
        </Text>
      </Flex>
    </Card>
  );
}
