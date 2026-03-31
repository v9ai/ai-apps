import React, { useEffect, useState } from "react";
import { Stack, Group, Button, Text, Alert, Badge, Progress } from "@mantine/core";

type Phase = "connections" | "import" | "posts" | "companies" | null;

export default function PostsSection() {
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>(null);
  const [status, setStatus] = useState("");
  const [serverUp, setServerUp] = useState<boolean | null>(null);
  const [stats, setStats] = useState<{ contacts: number; posts: number } | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

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
        setPhase(null);
        setProgress(null);
        return;
      }

      if (message.done) {
        const filtered = message.totalFiltered
          ? ` (${message.totalFiltered.toLocaleString()} noise filtered)`
          : "";
        setStatus(
          `Done! ${message.totalPosts.toLocaleString()} relevant posts from ${message.totalContacts.toLocaleString()} contacts${filtered}`,
        );
        setLoading(false);
        setPhase(null);
        setProgress(null);
        // Refresh stats
        fetch("http://localhost:9876/stats")
          .then((r) => r.json())
          .then(setStats)
          .catch(() => {});
        return;
      }

      // Phase tracking
      if (message.phase) {
        setPhase(message.phase);
      }

      // Post scraping progress (phase 3)
      if (message.current && message.total) {
        setProgress({ current: message.current, total: message.total });
        const filtered = message.postsFiltered
          ? ` | ${message.postsFiltered.toLocaleString()} filtered`
          : "";
        setStatus(
          `${message.current.toLocaleString()}/${message.total.toLocaleString()}: ${message.contactName} (${message.postsFound.toLocaleString()} kept${filtered})`,
        );
      }

      // Generic status (phases 1 & 2)
      if (message.status) {
        setStatus(message.status);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    setPhase("connections");
    setStatus("Starting...");
    setProgress(null);

    try {
      const response = await chrome.runtime.sendMessage({
        action: "startFullPipeline",
      });
      if (!response.success) {
        setStatus(response.error || "Failed to start");
        setLoading(false);
        setPhase(null);
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error starting pipeline");
      setLoading(false);
      setPhase(null);
    }
  };

  const handleStop = async () => {
    await chrome.runtime.sendMessage({ action: "stopPostScraping" });
    setStatus("Stopped");
    setLoading(false);
    setPhase(null);
    setProgress(null);
  };

  const phaseLabel =
    phase === "connections" ? "1/3 Connections" :
    phase === "import" ? "2/3 Import" :
    phase === "posts" ? "3/3 Posts" : null;

  const progressPct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : null;

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
              {stats.contacts.toLocaleString()}C / {stats.posts.toLocaleString()}P
            </Text>
          )}
        </Group>
        {phaseLabel && (
          <Badge size="xs" color="teal" variant="light">
            {phaseLabel}
          </Badge>
        )}
      </Group>

      <Group grow gap="xs">
        <Button
          onClick={handleStart}
          disabled={loading || serverUp !== true}
          color="teal"
          size="sm"
        >
          {loading ? "Scraping..." : "Scrape All Posts"}
        </Button>
        {loading && (
          <Button onClick={handleStop} color="red" size="sm">
            Stop
          </Button>
        )}
      </Group>

      {phase === "posts" && progressPct !== null && (
        <Progress value={progressPct} color="teal" size="xs" />
      )}

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
