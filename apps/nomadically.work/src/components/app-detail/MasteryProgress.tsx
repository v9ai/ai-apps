"use client";

import {
  Card,
  Flex,
  Box,
  Text,
  Heading,
  Button,
  Badge,
} from "@radix-ui/themes";

export type MasteryLevel = "unfamiliar" | "familiar" | "confident" | "mastery";

export interface TopicMasteryData {
  domain: string;
  topicKey: string;
  masteryLevel: MasteryLevel;
  confidenceScore: number;
  totalSessions: number;
  lastQuizScore: number | null;
  streakDays: number;
  lastStudiedAt: string | null;
  nextReviewAt: string | null;
}

export interface LearningTeamSummary {
  domain: string;
  label: string;
  totalTopics: number;
  masteredTopics: number;
  familiarTopics: number;
  lastStudiedAt: string | null;
  streakDays: number;
}

export function masteryColor(level: MasteryLevel): string {
  switch (level) {
    case "unfamiliar": return "gray";
    case "familiar": return "amber";
    case "confident": return "green";
    case "mastery": return "blue";
  }
}

function masteryLabel(level: MasteryLevel): string {
  switch (level) {
    case "unfamiliar": return "New";
    case "familiar": return "Familiar";
    case "confident": return "Confident";
    case "mastery": return "Mastered";
  }
}

export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return `${Math.floor(diffDay / 30)}mo ago`;
}

function formatReviewTime(dateStr: string): { text: string; overdue: boolean } {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = then - now;
  if (diffMs < 0) return { text: "overdue", overdue: true };
  const diffDay = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDay === 0) return { text: "today", overdue: false };
  if (diffDay === 1) return { text: "tomorrow", overdue: false };
  return { text: `in ${diffDay}d`, overdue: false };
}

// --- MasteryBadge ---

export function MasteryBadge({ level }: { level: MasteryLevel }) {
  return (
    <Badge size="1" variant="soft" color={masteryColor(level) as any}>
      {masteryLabel(level)}
    </Badge>
  );
}

// --- MasteryBar ---

export function MasteryBar({ topics }: { topics: TopicMasteryData[] }) {
  if (topics.length === 0) return null;
  const mastered = topics.filter((t) => t.masteryLevel === "mastery").length;

  return (
    <Box>
      <Flex gap="1" style={{ height: 6, borderRadius: 3, overflow: "hidden" }}>
        {topics.map((t) => (
          <Box
            key={`${t.domain}:${t.topicKey}`}
            title={`${t.topicKey}: ${masteryLabel(t.masteryLevel)}`}
            style={{
              flex: 1,
              backgroundColor: `var(--${masteryColor(t.masteryLevel)}-8)`,
              minWidth: 4,
            }}
          />
        ))}
      </Flex>
      <Text size="1" color="gray" mt="1" as="div">
        {mastered}/{topics.length} mastered
      </Text>
    </Box>
  );
}

// --- MasteryCard ---

interface MasteryCardProps {
  mastery: TopicMasteryData;
  topicLabel: string;
  onStudy?: () => void;
  onQuiz?: () => void;
}

export function MasteryCard({ mastery, topicLabel, onStudy, onQuiz }: MasteryCardProps) {
  const pct = Math.round(mastery.confidenceScore * 100);
  const review = mastery.nextReviewAt ? formatReviewTime(mastery.nextReviewAt) : null;

  return (
    <Card variant="surface">
      <Flex justify="between" align="start" mb="2">
        <Text size="2" weight="bold" style={{ flex: 1 }}>{topicLabel}</Text>
        <MasteryBadge level={mastery.masteryLevel} />
      </Flex>

      <Box mb="2" style={{ height: 6, backgroundColor: "var(--gray-4)", borderRadius: 3, overflow: "hidden" }}>
        <Box style={{
          height: "100%",
          width: `${pct}%`,
          backgroundColor: `var(--${masteryColor(mastery.masteryLevel)}-9)`,
          borderRadius: 3,
          transition: "width 0.3s ease",
        }} />
      </Box>
      <Text size="1" color="gray" mb="2" as="div">{pct}% confidence</Text>

      <Flex gap="3" mb="2" wrap="wrap">
        <Text size="1" color="gray">Sessions: {mastery.totalSessions}</Text>
        {mastery.streakDays > 0 && (
          <Text size="1" color="gray">Streak: {mastery.streakDays}d</Text>
        )}
        {mastery.lastQuizScore !== null && (
          <Text size="1" color="gray">Last quiz: {Math.round(mastery.lastQuizScore * 100)}%</Text>
        )}
        {review && (
          <Text size="1" color={review.overdue ? "red" : "gray"}>
            Review: {review.text}
          </Text>
        )}
      </Flex>

      {mastery.lastStudiedAt && (
        <Text size="1" color="gray" mb="2" as="div">
          Last studied: {formatRelativeTime(mastery.lastStudiedAt)}
        </Text>
      )}

      {(onStudy || onQuiz) && (
        <Flex gap="2" mt="2">
          {onStudy && <Button size="1" variant="soft" onClick={onStudy}>Study</Button>}
          {onQuiz && <Button size="1" variant="soft" color="violet" onClick={onQuiz}>Quiz</Button>}
        </Flex>
      )}
    </Card>
  );
}

// --- MasteryOverview ---

const DOMAIN_COLORS: Record<string, string> = {
  concepts: "violet",
  interview: "blue",
  coding: "green",
  backend: "teal",
};

interface MasteryOverviewProps {
  teams: LearningTeamSummary[];
  overallReadiness: number;
  totalSessions: number;
}

export function MasteryOverview({ teams, overallReadiness, totalSessions }: MasteryOverviewProps) {
  const pct = Math.round(overallReadiness * 100);

  return (
    <Card size="3">
      <Flex justify="between" align="center" mb="2">
        <Heading size="4">Learning Teams</Heading>
        <Flex gap="3" align="center">
          <Text size="1" color="gray">{totalSessions} sessions</Text>
        </Flex>
      </Flex>

      <Flex align="center" gap="3" mb="3">
        <Box style={{ flex: 1, height: 8, backgroundColor: "var(--gray-4)", borderRadius: 4, overflow: "hidden" }}>
          <Box style={{
            height: "100%",
            width: `${pct}%`,
            backgroundColor: "var(--accent-9)",
            borderRadius: 4,
            transition: "width 0.5s ease",
          }} />
        </Box>
        <Text size="2" weight="bold" style={{ minWidth: 45, textAlign: "right" }}>{pct}%</Text>
      </Flex>

      <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        {teams.map((team) => {
          const color = DOMAIN_COLORS[team.domain] ?? "gray";
          const teamPct = team.totalTopics > 0
            ? Math.round((team.masteredTopics / team.totalTopics) * 100)
            : 0;
          return (
            <Card key={team.domain} variant="surface">
              <Flex align="center" gap="2" mb="2">
                <Badge size="1" color={color as any} variant="solid" style={{ width: 8, height: 8, padding: 0, borderRadius: "50%" }} />
                <Text size="2" weight="bold">{team.label}</Text>
              </Flex>
              <Box mb="2" style={{ height: 4, backgroundColor: "var(--gray-4)", borderRadius: 2, overflow: "hidden" }}>
                <Box style={{
                  height: "100%",
                  width: `${teamPct}%`,
                  backgroundColor: `var(--${color}-9)`,
                  borderRadius: 2,
                }} />
              </Box>
              <Flex justify="between" align="center">
                <Text size="1" color="gray">
                  {team.masteredTopics}/{team.totalTopics}
                </Text>
                {team.streakDays > 0 ? (
                  <Text size="1" color="orange">{team.streakDays}d streak</Text>
                ) : (
                  <Text size="1" color="gray">Start studying</Text>
                )}
              </Flex>
            </Card>
          );
        })}
      </Box>
    </Card>
  );
}
