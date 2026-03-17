"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@radix-ui/themes";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await authClient.signOut();
    router.push("/auth/login");
  };

  return (
    <Button variant="soft" size="2" onClick={logout}>
      Sign out
    </Button>
  );
}
