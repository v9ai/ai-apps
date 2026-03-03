"use client";

import { createClient } from "@/lib/supabase/client";
import { Button, Card, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm() {
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
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/protected` },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
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
          <Heading size="6">Create account</Heading>
          <Text size="2" color="gray">Sign up to get started</Text>
        </Flex>

        <form onSubmit={handleSignUp}>
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
              <Text as="label" size="2" weight="medium" htmlFor="password">Password</Text>
              <TextField.Root
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Flex>

            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="medium" htmlFor="repeat-password">Confirm password</Text>
              <TextField.Root
                id="repeat-password"
                type="password"
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
              />
            </Flex>

            {error && <Text size="2" color="red">{error}</Text>}

            <Button type="submit" disabled={isLoading} style={{ width: "100%" }}>
              {isLoading ? "Creating account..." : "Sign up"}
            </Button>
          </Flex>
        </form>

        <Text size="2" align="center" color="gray">
          Already have an account?{" "}
          <Link href="/auth/login" style={{ color: "var(--accent-9)" }}>Sign in</Link>
        </Text>
      </Flex>
    </Card>
  );
}
