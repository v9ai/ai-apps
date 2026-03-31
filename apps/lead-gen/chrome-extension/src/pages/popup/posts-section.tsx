import React, { useEffect, useState } from "react";
import { Stack, Group, Button, Text, Alert, Badge, Progress } from "@mantine/core";

const SEARCH_URL =
  "https://www.linkedin.com/search/results/content/?keywords=react%20AI%20ML%20fully%20remote%20contract&origin=FACETED_SEARCH&sortBy=%5B%22relevance%22%5D&datePosted=%5B%22past-week%22%5D";

type Phase = "jobs" | "connections" | "import" | "posts" | "companies" | null;

const PHASE_LABELS: Record<string, string> = {
  jobs: "1/5 Jobs",
  connections: "2/5 Connections",
  import: "3/5 Import",
  posts: "4/5 Posts",
  companies: "5/5 Companies",
};

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

  // Listen for progress
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
        const parts: string[] = [];
        if (message.totalPosts) parts.push(`${message.totalPosts.toLocaleString()} posts`);
        if (message.totalContacts) parts.push(`from ${message.totalContacts.toLocaleString()} contacts`);
        if (message.totalFiltered) parts.push(`${message.totalFiltered.toLocaleString()} filtered`);
        if (message.totalCompanies) parts.push(`${message.totalCompanies.toLocaleString()} companies`);
        setStatus(parts.length > 0 ? `Done! ${parts.join(", ")}` : "Done!");
        setLoading(false);
        setPhase(null);
        setProgress(null);
        fetch("http://localhost:9876/stats")
          .then((r) => r.json())
          .then(setStats)
          .catch(() => {});
        return;
      }

      if (message.phase) setPhase(message.phase);

      if (message.current && message.total) {
        setProgress({ current: message.current, total: message.total });
        const filtered = message.postsFiltered
          ? ` | ${message.postsFiltered.toLocaleString()} filtered`
          : "";
        setStatus(
          `${message.current.toLocaleString()}/${message.total.toLocaleString()}: ${message.contactName} (${message.postsFound.toLocaleString()} kept${filtered})`,
        );
      }

      if (message.status) setStatus(message.status);
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    setPhase("jobs");
    setStatus("Starting...");
    setProgress(null);

    try {
      const response = await chrome.runtime.sendMessage({
        action: "startUnifiedPipeline",
        searchUrl: SEARCH_URL,
      });
      if (!response.success) {
        setStatus(response.error || "Failed to start");
        setLoading(false);
        setPhase(null);
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error");
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

  const phaseLabel = phase ? PHASE_LABELS[phase] ?? null : null;

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
            {serverUp === true ? "Server OK" : serverUp === false ? "Offline" : "..."}
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
          disabled={loading}
          color="teal"
          size="sm"
        >
          {loading ? "Scraping..." : "Scrape"}
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
