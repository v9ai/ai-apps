"use client";

import { authClient } from "@/lib/auth-client";
import { Button, Card, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdatePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
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
    <Card size="3" style={{ width: "100%", maxWidth: 400 }}>
      <Flex direction="column" gap="5">
        <Flex direction="column" gap="1">
          <Heading size="6">Change password</Heading>
          <Text size="2" color="gray">Enter your current and new password</Text>
        </Flex>

        <form onSubmit={handleUpdatePassword}>
          <Flex direction="column" gap="4">
            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="medium" htmlFor="current-password">Current password</Text>
              <TextField.Root
                id="current-password"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Flex>

            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="medium" htmlFor="new-password">New password</Text>
              <TextField.Root
                id="new-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
