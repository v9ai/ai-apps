"use client";

import { Select, Flex, Text } from "@radix-ui/themes";
import { useSidebar } from "@/components/sidebar-provider";
import { useTenant } from "@/components/tenant-provider";
import { TENANTS, getTenantMeta, type TenantKey } from "@/lib/tenants";

export function TenantSelect() {
  const { tenant, setTenant } = useTenant();
  const { collapsed } = useSidebar();
  const meta = getTenantMeta(tenant);

  return (
    <Select.Root
      value={tenant}
      onValueChange={(v) => setTenant(v as TenantKey)}
      size="1"
    >
      <Select.Trigger
        variant="soft"
        color="gray"
        style={{
          width: "100%",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        {collapsed ? (
          <Text size="2" weight="medium">
            {meta.initial}
          </Text>
        ) : (
          <Flex align="center" gap="2" style={{ minWidth: 0 }}>
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
              {meta.initial}
            </Text>
            <Text
              size="2"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {meta.label}
            </Text>
          </Flex>
        )}
      </Select.Trigger>
      <Select.Content position="popper" side="top" align="start">
        {TENANTS.map((t) => (
          <Select.Item key={t.key} value={t.key}>
            {t.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
