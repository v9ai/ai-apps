"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import {
  Heading,
  Button,
  Flex,
  Text,
  Box,
  Badge,
  Skeleton,
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CSS_CATEGORIES } from "@/lib/css-properties";
import {
  MemorizeDashboard,
  type MasteryMap,
} from "@/components/app-detail/memorize/MemorizeDashboard";
import "@/components/app-detail/memorize/css-memorize.css";

interface AppData {
  slug: string;
  company: string;
  position: string;
}

function MemorizePageInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [app, setApp] = useState<AppData | null>(null);
  const [mastery, setMastery] = useState<MasteryMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch app data and mastery in parallel
  useEffect(() => {
    if (!params.id) return;

    Promise.all([
      fetch(`/api/applications/${params.id}`).then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        if (!r.ok) throw new Error("Not found");
        return r.json();
      }),
      fetch(`/api/applications/${params.id}/memorize`)
        .then((r) => (r.ok ? r.json() : { mastery: {} }))
        .catch(() => ({ mastery: {} })),
    ])
      .then(([appData, masteryData]) => {
        if (appData) setApp(appData);
        setMastery(masteryData.mastery || {});
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const handleRate = useCallback(
    (propertyId: string, isCorrect: boolean) => {
      // Optimistic local update
      setMastery((prev) => {
        const current = prev[propertyId];
        const pMastery = current?.pMastery ?? 0.1;
        const newMastery = isCorrect
          ? Math.min(1, pMastery + 0.1)
          : Math.max(0, pMastery - 0.05);
        const level =
          newMastery >= 0.8
            ? "expert"
            : newMastery >= 0.6
              ? "proficient"
              : newMastery >= 0.4
                ? "intermediate"
                : newMastery >= 0.2
                  ? "beginner"
                  : "novice";
        return {
          ...prev,
          [propertyId]: {
            pMastery: newMastery,
            masteryLevel: level,
            totalInteractions: (current?.totalInteractions ?? 0) + 1,
            correctInteractions:
              (current?.correctInteractions ?? 0) + (isCorrect ? 1 : 0),
            lastInteractionAt: new Date(),
          },
        };
      });

      // Fire-and-forget server sync
      fetch(`/api/applications/${params.id}/memorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, isCorrect }),
      }).catch(() => {
        // Silent fail — local state is already updated
      });
    },
    [params.id],
  );

  if (loading) {
    return (
      <Box px={{ initial: "4", md: "8" }} py="8">
        <Skeleton height="32px" mb="6" style={{ maxWidth: 300 }} />
        <Skeleton height="400px" />
      </Box>
    );
  }

  if (error || !app) {
    return (
      <Box px={{ initial: "4", md: "8" }} py="8">
        <Heading size="5" mb="3">
          {error ? "Error" : "Not Found"}
        </Heading>
        <Text color="gray">
          {error ?? "This application doesn't exist or you don't have access."}
        </Text>
      </Box>
    );
  }

  return (
    <Box px={{ initial: "4", md: "8" }} py={{ initial: "4", md: "8" }}>
      {/* Navigation */}
      <Flex align="center" gap="3" mb="5">
        <Link
          href={`/applications/${app.slug}/prep`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "var(--gray-11)",
            textDecoration: "none",
          }}
        >
          <ArrowLeftIcon />
          <Text size="2">Study Plan</Text>
        </Link>
        <Text size="2" color="gray">
          /
        </Text>
        <Text size="2" weight="medium">
          Memorize CSS
        </Text>
      </Flex>

      {/* Page header */}
      <Flex justify="between" align="start" mb="6" wrap="wrap" gap="3">
        <Box>
          <Heading size="7" mb="2">
            Memorize CSS
          </Heading>
          <Flex align="center" gap="2">
            <Badge color="violet" variant="soft" size="2">
              Active Recall
            </Badge>
            <Text size="2" color="gray">
              {app.company} &middot; {app.position}
            </Text>
          </Flex>
        </Box>
        <Flex gap="2">
          <Button size="2" variant="soft" color="gray" asChild>
            <Link href={`/applications/${app.slug}/prep`}>Study Plan</Link>
          </Button>
          <Button size="2" variant="soft" color="gray" asChild>
            <Link href={`/applications/${app.slug}/notes`}>Notes</Link>
          </Button>
        </Flex>
      </Flex>

      {/* Dashboard */}
      <MemorizeDashboard
        categories={CSS_CATEGORIES}
        mastery={mastery}
        appSlug={app.slug}
        onRate={handleRate}
      />
    </Box>
  );
}

export default function MemorizePage() {
  return (
    <Suspense
      fallback={
        <Box px={{ initial: "4", md: "8" }} py="8">
          <Skeleton height="32px" mb="6" style={{ maxWidth: 300 }} />
          <Skeleton height="400px" />
        </Box>
      }
    >
      <MemorizePageInner />
    </Suspense>
  );
}
