"use client";

import { useState } from "react";
import {
  Heading,
  Flex,
  Text,
  Box,
  Card,
  Badge,
  Skeleton,
} from "@radix-ui/themes";
import { useStudyTopicsQuery } from "@/__generated__/hooks";
import Link from "next/link";
import type { TabBaseProps } from "./types";

function difficultyBorderColor(difficulty: string): string {
  if (difficulty === "advanced") return "var(--red-9)";
  if (difficulty === "intermediate") return "var(--amber-9)";
  return "var(--green-9)";
}

function TopicCard({ topic }: { topic: { topic: string; title: string; summary: string; difficulty: string; tags: string[] } }) {
  const [hovered, setHovered] = useState(false);
  const readingTime = topic.summary
    ? Math.max(1, Math.round(topic.summary.length / 800))
    : null;

  return (
    <Link
      href={`/study/application-prep/${topic.topic}`}
      style={{ textDecoration: "none" }}
    >
      <Card
        variant="surface"
        style={{
          cursor: "pointer",
          borderLeft: `3px solid ${difficultyBorderColor(topic.difficulty)}`,
          transform: hovered ? "translateY(-1px)" : "none",
          boxShadow: hovered ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Flex justify="between" align="start" gap="3">
          <Box style={{ flex: 1 }}>
            <Flex align="center" gap="2" mb="1">
              <Text size="2" weight="bold" style={{ color: "var(--accent-11)" }}>
                {topic.title}
              </Text>
            </Flex>
            {topic.summary && (
              <Text size="1" color="gray" as="p" style={{ margin: 0, lineHeight: 1.4 }}>
                {topic.summary.length > 180 ? topic.summary.slice(0, 180) + "\u2026" : topic.summary}
              </Text>
            )}
            <Flex gap="1" mt="2" wrap="wrap">
              <Badge
                size="1"
                color={topic.difficulty === "advanced" ? "red" : topic.difficulty === "intermediate" ? "orange" : "green"}
              >
                {topic.difficulty}
              </Badge>
              {topic.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} size="1" variant="outline" color="gray">{tag}</Badge>
              ))}
            </Flex>
          </Box>
          {readingTime !== null && (
            <Text size="1" color="gray" style={{ whiteSpace: "nowrap" }}>
              ~{readingTime} min read
            </Text>
          )}
        </Flex>
      </Card>
    </Link>
  );
}

export function StudyTab(_props: TabBaseProps) {
  const { data: studyData, loading: studyLoading } = useStudyTopicsQuery({
    variables: { category: "application-prep" },
  });

  return (
    <Card size="3">
      <Flex justify="between" align="center" mb="3">
        <Heading size="4">Study Topics</Heading>
        <Badge color="blue" size="1">{studyData?.studyTopics?.length ?? 0} topics</Badge>
      </Flex>

      {studyLoading ? (
        <Flex direction="column" gap="2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} height="80px" />)}
        </Flex>
      ) : !studyData?.studyTopics?.length ? (
        <Text size="2" color="gray">No study topics generated yet.</Text>
      ) : (
        <Flex direction="column" gap="2">
          {studyData.studyTopics.map((topic) => (
            <TopicCard key={topic.topic} topic={topic} />
          ))}
        </Flex>
      )}
    </Card>
  );
}
