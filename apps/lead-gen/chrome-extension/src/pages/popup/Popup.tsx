import React from "react";
import {
  MantineProvider,
  AppShell,
  Group,
  Title,
  Text,
} from "@mantine/core";
import logo from "@assets/img/logo.svg";
import PostsSection from "./posts-section";

export default function Popup() {
  return (
    <MantineProvider>
      <AppShell
        header={{ height: 60 }}
        footer={{ height: 40 }}
        padding="md"
        style={{ width: 384, height: 500 }}
      >
        <AppShell.Header
          p="md"
          bg="dark.8"
          style={{ borderBottom: "1px solid var(--mantine-color-dark-4)" }}
        >
          <Group>
            <img src={logo} style={{ height: 32, width: 32 }} alt="logo" />
            <Title order={4} c="white">
              Lead Gen
            </Title>
          </Group>
        </AppShell.Header>

        <AppShell.Main bg="dark.9" style={{ overflow: "auto" }}>
          <PostsSection />
        </AppShell.Main>

        <AppShell.Footer
          p="xs"
          bg="dark.8"
          style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}
        >
          <Text size="xs" c="gray.3" ta="center">
            {import.meta.env.VITE_API_BASE_URL || "localhost:3004"}
          </Text>
        </AppShell.Footer>
      </AppShell>
    </MantineProvider>
  );
}
