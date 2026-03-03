"use client";

import { createClient } from "@/lib/supabase/client";
import { Button, Card, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/protected");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card size="3" style={{ width: "100%", maxWidth: 400 }}>
      <Flex direction="column" gap="5">
        <Flex direction="column" gap="1">
          <Heading size="6">Sign in</Heading>
          <Text size="2" color="gray">Enter your email to sign in to your account</Text>
        </Flex>

        <form onSubmit={handleLogin}>
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

            <Flex direction="column" gap="1">
              <Flex justify="between" align="center">
                <Text as="label" size="2" weight="medium" htmlFor="password">Password</Text>
                <Text size="2" asChild>
                  <Link href="/auth/forgot-password" style={{ color: "var(--accent-9)" }}>
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

            {error && <Text size="2" color="red">{error}</Text>}

            <Button type="submit" disabled={isLoading} style={{ width: "100%" }}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </Flex>
        </form>

        <Text size="2" align="center" color="gray">
          No account?{" "}
          <Link href="/auth/sign-up" style={{ color: "var(--accent-9)" }}>Sign up</Link>
        </Text>
      </Flex>
    </Card>
  );
}
