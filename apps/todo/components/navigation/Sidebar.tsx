"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Box, Flex, Text, Avatar, Separator } from "@radix-ui/themes";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const navItems = [
  { label: "Tasks", href: "/app", icon: "☰" },
  { label: "How It Works", href: "/how-it-works", icon: "?" },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Box
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "var(--sidebar-width)",
        height: "100vh",
        borderRight: "1px solid var(--gray-a5)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Flex align="center" gap="2" style={{ padding: "8px 0 16px" }}>
        <Text size="5" weight="bold">
          Todo
        </Text>
      </Flex>

      <Separator size="4" />

      <Flex direction="column" gap="1" style={{ marginTop: "16px", flex: 1 }}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/app" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{ textDecoration: "none" }}
            >
              <Flex
                align="center"
                gap="3"
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  background: isActive
                    ? "var(--accent-a3)"
                    : "transparent",
                  cursor: "pointer",
                  transition: "background 150ms",
                }}
              >
                <Text size="2" style={{ width: 20, textAlign: "center" }}>
                  {item.icon}
                </Text>
                <Text
                  size="2"
                  weight={isActive ? "medium" : "regular"}
                  style={{
                    color: isActive
                      ? "var(--accent-11)"
                      : "var(--gray-11)",
                  }}
                >
                  {item.label}
                </Text>
              </Flex>
            </Link>
          );
        })}
      </Flex>

      <Separator size="4" />

      <Flex
        align="center"
        justify="between"
        style={{ padding: "12px 0 0" }}
      >
        <Flex align="center" gap="2">
          <Avatar size="2" fallback={userName[0]?.toUpperCase() ?? "U"} />
          <Text size="2" color="gray" truncate style={{ maxWidth: 120 }}>
            {userName}
          </Text>
        </Flex>
        <Text
          size="1"
          color="gray"
          style={{ cursor: "pointer" }}
          onClick={() => {
            signOut().then(() => router.push("/login"));
          }}
        >
          Sign out
        </Text>
      </Flex>
    </Box>
  );
}
