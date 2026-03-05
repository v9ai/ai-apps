import { createClient } from "@/lib/supabase/server";
import { Avatar, Box, Button, Flex, Text } from "@radix-ui/themes";
import Link from "next/link";
import { LogoutButton } from "./logout-button";

function truncateEmail(email: string, max = 20): string {
  if (email.length <= max) return email;
  return email.slice(0, max) + "\u2026";
}

export async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (user) {
    const email = (user.email as string) ?? "";
    const initial = email.charAt(0).toUpperCase();

    return (
      <Flex align="center" gap="3">
        <Box
          px="3"
          py="1"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            borderRadius: "var(--radius-4)",
            border: "1px solid var(--gray-a5)",
            backgroundColor: "var(--gray-a2)",
          }}
        >
          <Avatar
            size="1"
            radius="full"
            fallback={initial}
            color="indigo"
          />
          <Text size="1" color="gray" title={email}>
            {truncateEmail(email)}
          </Text>
        </Box>
        <LogoutButton />
      </Flex>
    );
  }

  return (
    <Flex gap="2">
      <Button variant="outline" size="2" asChild>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button size="2" asChild>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </Flex>
  );
}
