"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Link,
  Text,
  TextField,
} from "@radix-ui/themes";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn.email(
      { email, password },
      {
        onError: (ctx) => {
          setError(ctx.error.message);
          setLoading(false);
        },
        onSuccess: () => {
          window.location.href = "/app";
        },
      }
    );
  }

  return (
    <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
      <Card size="4" style={{ width: 400 }}>
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Heading size="6" align="center">
              Sign In
            </Heading>

            {error && (
              <Text color="red" size="2" align="center">
                {error}
              </Text>
            )}

            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="medium">
                Email
              </Text>
              <TextField.Root
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Flex>

            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="medium">
                Password
              </Text>
              <TextField.Root
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Flex>

            <Button type="submit" size="3" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <Text size="2" align="center">
              Don&apos;t have an account?{" "}
              <Link href="/signup">Sign up</Link>
            </Text>

            <Text size="2" align="center">
              <Link href="/how-it-works">How it works</Link>
            </Text>
          </Flex>
        </form>
      </Card>
    </Flex>
  );
}
