"use client";

import { createClient } from "@/lib/supabase/client";
import { Button, Card, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
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
          <Heading size="6">New password</Heading>
          <Text size="2" color="gray">Enter your new password below</Text>
        </Flex>

        <form onSubmit={handleUpdatePassword}>
          <Flex direction="column" gap="4">
            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="medium" htmlFor="password">Password</Text>
              <TextField.Root
                id="password"
                type="password"
                placeholder="New password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Flex>

            {error && <Text size="2" color="red">{error}</Text>}

            <Button type="submit" disabled={isLoading} style={{ width: "100%" }}>
              {isLoading ? "Saving..." : "Save new password"}
            </Button>
          </Flex>
        </form>
      </Flex>
    </Card>
  );
}
