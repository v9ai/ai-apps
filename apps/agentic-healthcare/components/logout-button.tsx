"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@radix-ui/themes";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button variant="soft" size="2" onClick={logout}>
      Sign out
    </Button>
  );
}
