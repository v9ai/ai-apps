import { createClient } from "@/lib/supabase/server";
import { Button, Flex, Text } from "@radix-ui/themes";
import Link from "next/link";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (user) {
    return (
      <Flex align="center" gap="3">
        <Text size="2" color="gray">{user.email}</Text>
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
