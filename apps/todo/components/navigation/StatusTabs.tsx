"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Flex, Text } from "@radix-ui/themes";

const tabs = [
  { key: "inbox", label: "Inbox", icon: "+" },
  { key: "active", label: "Active", icon: "▶" },
  { key: "completed", label: "Completed", icon: "✓" },
] as const;

export function StatusTabs({
  counts,
}: {
  counts: { inbox: number; active: number; completed: number };
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const current = searchParams.get("status") ?? "inbox";

  return (
    <Flex gap="2">
      {tabs.map((tab) => {
        const isActive = current === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => {
              const params = new URLSearchParams();
              if (tab.key !== "inbox") params.set("status", tab.key);
              router.push(`/${params.size ? `?${params}` : ""}`);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid",
              borderColor: isActive ? "var(--accent-8)" : "var(--gray-a5)",
              background: isActive ? "var(--accent-a3)" : "transparent",
              color: isActive ? "var(--accent-11)" : "var(--gray-11)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "var(--font-size-2)",
              fontWeight: isActive ? 500 : 400,
              transition: "all 150ms",
            }}
          >
            <span style={{ fontSize: "0.85em" }}>{tab.icon}</span>
            {tab.label}
            <Text
              size="1"
              color="gray"
              style={{
                background: "var(--gray-a3)",
                borderRadius: 999,
                padding: "0 6px",
                minWidth: 20,
                textAlign: "center",
              }}
            >
              {counts[tab.key]}
            </Text>
          </button>
        );
      })}
    </Flex>
  );
}
