"use client";

import { Flex, Text } from "@radix-ui/themes";
import { useSidebar } from "@/components/sidebar-provider";
import { authClient } from "@/lib/auth/client";

export function TenantSelect() {
  const { collapsed } = useSidebar();
  const { data: session, isPending } = authClient.useSession();

  if (isPending || !session) return null;

  return (
    <Flex
      align="center"
      gap="2"
      px="2"
      py="1"
      style={{
        width: "100%",
        justifyContent: collapsed ? "center" : "flex-start",
        minWidth: 0,
      }}
    >
      <Text
        size="1"
        weight="medium"
        style={{
          color: "var(--accent-11)",
          flexShrink: 0,
          width: 16,
          textAlign: "center",
        }}
      >
        V
      </Text>
      {!collapsed && (
        <Text
          size="2"
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          Vadim Nicolai
        </Text>
      )}
    </Flex>
  );
}
