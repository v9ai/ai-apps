import React, { useEffect, useState } from "react";
import { Stack, Group, Button, Text, Alert, Badge } from "@mantine/core";

export default function PostsSection() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [serverUp, setServerUp] = useState<boolean | null>(null);
  const [stats, setStats] = useState<{ contacts: number; posts: number } | null>(null);

  // Check server health on mount
  useEffect(() => {
    fetch("http://localhost:9876/stats")
      .then((res) => {
        if (res.ok) {
          setServerUp(true);
          return res.json();
        }
        setServerUp(false);
        return null;
      })
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => setServerUp(false));
  }, []);

  // Listen for progress messages from background
  useEffect(() => {
    const listener = (message: any) => {
      if (message.action !== "postScrapingProgress") return;

      if (message.error) {
        setStatus(`Error: ${message.error}`);
        setLoading(false);
        return;
      }

      if (message.done) {
        const filtered = message.totalFiltered
          ? ` (${message.totalFiltered} noise filtered)`
          : "";
        setStatus(
          `Done! ${message.totalPosts} relevant posts from ${message.totalContacts} contacts${filtered}`,
        );
        setLoading(false);
        // Refresh stats
        fetch("http://localhost:9876/stats")
          .then((r) => r.json())
          .then(setStats)
          .catch(() => {});
        return;
      }

      if (message.current && message.total) {
        const filtered = message.postsFiltered
          ? ` | ${message.postsFiltered} filtered`
          : "";
        setStatus(
          `${message.current}/${message.total}: ${message.contactName} (${message.postsFound} kept${filtered})`,
        );
      }

      if (message.status) {
        setStatus(message.status);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    setStatus("Starting...");

    try {
      const response = await chrome.runtime.sendMessage({
        action: "startPostScraping",
      });
      if (!response.success) {
        setStatus(response.error || "Failed to start");
        setLoading(false);
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error starting scraper");
      setLoading(false);
    }
  };

  const handleStop = async () => {
    await chrome.runtime.sendMessage({ action: "stopPostScraping" });
    setStatus("Stopped");
    setLoading(false);
  };

  return (
    <Stack gap="xs">
      <Group gap="xs" justify="space-between">
        <Group gap="xs">
          <Badge
            size="xs"
            color={serverUp === true ? "green" : serverUp === false ? "red" : "gray"}
            variant="dot"
          >
            {serverUp === true ? "Server OK" : serverUp === false ? "Server Down" : "Checking..."}
          </Badge>
          {stats && (
            <Text size="xs" c="dimmed">
              {stats.contacts}C / {stats.posts}P
            </Text>
          )}
        </Group>
      </Group>

      <Group grow gap="xs">
        <Button
          onClick={handleStart}
          disabled={loading || serverUp !== true}
          color="teal"
          size="sm"
        >
          {loading ? "Scraping..." : "Scrape Posts"}
        </Button>
        {loading && (
          <Button onClick={handleStop} color="red" size="sm">
            Stop
          </Button>
        )}
      </Group>

      {status && (
        <Alert color="dark" radius="sm" p="xs">
          <Text size="xs" ta="center" c="white">
            {status}
          </Text>
        </Alert>
      )}
    </Stack>
  );
}
