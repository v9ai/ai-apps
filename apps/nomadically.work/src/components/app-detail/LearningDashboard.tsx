"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Flex,
  Box,
  Text,
  Heading,
  Badge,
  Button,
} from "@radix-ui/themes";
import {
  PlayIcon,
  ReaderIcon,
  LightningBoltIcon,
  RocketIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";
import type { AppData } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LearningDashboardProps {
  app: AppData;
  isAdmin: boolean;
}

type MasteryLevel = "unfamiliar" | "familiar" | "confident" | "mastery";

interface LocalSession {
  id: string;
  sessionType: "study" | "quiz" | "flashcard";
  domain: string;
  topicKey: string;
  score: number | null;
  confidence: string;
  createdAt: string;
}

interface LocalMastery {
  domain: string;
  topicKey: string;
  masteryLevel: MasteryLevel;
  confidenceScore: number;
  totalSessions: number;
  lastQuizScore: number | null;
  streakDays: number;
  lastStudiedAt: string | null;
}

interface LocalLearningState {
  sessions: LocalSession[];
  mastery: Record<string, LocalMastery>; // key: "domain:topicKey"
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface ActiveMode {
  type: "quiz" | "study";
  domain: string;
  topicKey: string;
}

type DomainColor = "violet" | "blue" | "green" | "teal";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BACKEND_SECTION_KEYS = [
  "systemDesign",
  "distributedSystems",
  "databaseDesign",
  "sqlOptimization",
  "nosqlPatterns",
  "apiDesign",
  "authSecurity",
  "caching",
  "messageQueues",
  "microservices",
  "testing",
  "devops",
  "securityOwasp",
  "performance",
  "concurrencyAsync",
  "observability",
  "eventDriven",
  "serverlessEdge",
  "typescriptNode",
  "aiMlIntegration",
] as const;

const BACKEND_SECTION_LABELS: Record<string, string> = {
  systemDesign: "System Design",
  distributedSystems: "Distributed Systems",
  databaseDesign: "Database Design",
  sqlOptimization: "SQL Optimization",
  nosqlPatterns: "NoSQL Patterns",
  apiDesign: "API Design",
  authSecurity: "Auth & Security",
  caching: "Caching",
  messageQueues: "Message Queues",
  microservices: "Microservices",
  testing: "Testing",
  devops: "DevOps & CI/CD",
  securityOwasp: "Security & OWASP",
  performance: "Performance",
  concurrencyAsync: "Concurrency & Async",
  observability: "Observability",
  eventDriven: "Event-Driven",
  serverlessEdge: "Serverless & Edge",
  typescriptNode: "TypeScript & Node.js",
  aiMlIntegration: "AI/ML Integration",
};

const MASTERY_WEIGHTS: Record<MasteryLevel, number> = {
  mastery: 1.0,
  confident: 0.75,
  familiar: 0.4,
  unfamiliar: 0,
};

// ---------------------------------------------------------------------------
// Custom hook: useLearningState
// ---------------------------------------------------------------------------

function getStorageKey(applicationId: number): string {
  return `learning_state_${applicationId}`;
}

function loadState(applicationId: number): LocalLearningState {
  if (typeof window === "undefined") return { sessions: [], mastery: {} };
  try {
    const raw = localStorage.getItem(getStorageKey(applicationId));
    if (!raw) return { sessions: [], mastery: {} };
    return JSON.parse(raw) as LocalLearningState;
  } catch {
    return { sessions: [], mastery: {} };
  }
}

function useLearningState(applicationId: number) {
  const [state, setState] = useState<LocalLearningState>(() =>
    loadState(applicationId),
  );

  // Sync from localStorage on mount / id change
  useEffect(() => {
    setState(loadState(applicationId));
  }, [applicationId]);

  // Persist on every change
  useEffect(() => {
    try {
      localStorage.setItem(
        getStorageKey(applicationId),
        JSON.stringify(state),
      );
    } catch {
      // localStorage full or unavailable
    }
  }, [applicationId, state]);

  const recordSession = useCallback(
    (session: Omit<LocalSession, "id" | "createdAt">) => {
      setState((prev) => {
        const newSession: LocalSession = {
          ...session,
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date().toISOString(),
        };
        const masteryKey = `${session.domain}:${session.topicKey}`;
        const existing = prev.mastery[masteryKey] ?? {
          domain: session.domain,
          topicKey: session.topicKey,
          masteryLevel: "unfamiliar" as MasteryLevel,
          confidenceScore: 0,
          totalSessions: 0,
          lastQuizScore: null,
          streakDays: 0,
          lastStudiedAt: null,
        };

        const totalSessions = existing.totalSessions + 1;
        const lastQuizScore =
          session.sessionType === "quiz" && session.score !== null
            ? session.score
            : existing.lastQuizScore;

        // Compute new confidence score
        let confidenceScore = existing.confidenceScore;
        if (session.sessionType === "quiz" && session.score !== null) {
          confidenceScore = Math.round(
            confidenceScore * 0.4 + session.score * 0.6,
          );
        } else if (session.sessionType === "study") {
          const bump =
            session.confidence === "mastery"
              ? 25
              : session.confidence === "confident"
                ? 15
                : session.confidence === "familiar"
                  ? 8
                  : 3;
          confidenceScore = Math.min(100, confidenceScore + bump);
        }

        // Derive mastery level from confidence
        let masteryLevel: MasteryLevel = "unfamiliar";
        if (confidenceScore >= 90) masteryLevel = "mastery";
        else if (confidenceScore >= 65) masteryLevel = "confident";
        else if (confidenceScore >= 30) masteryLevel = "familiar";

        // Streak calculation
        const now = new Date();
        const lastDate = existing.lastStudiedAt
          ? new Date(existing.lastStudiedAt)
          : null;
        let streakDays = existing.streakDays;
        if (lastDate) {
          const daysDiff = Math.floor(
            (now.getTime() - lastDate.getTime()) / 86400000,
          );
          streakDays =
            daysDiff <= 1
              ? daysDiff === 0
                ? streakDays
                : streakDays + 1
              : 1;
        } else {
          streakDays = 1;
        }

        const updatedMastery: LocalMastery = {
          domain: session.domain,
          topicKey: session.topicKey,
          masteryLevel,
          confidenceScore,
          totalSessions,
          lastQuizScore,
          streakDays,
          lastStudiedAt: now.toISOString(),
        };

        return {
          sessions: [newSession, ...prev.sessions].slice(0, 100),
          mastery: { ...prev.mastery, [masteryKey]: updatedMastery },
        };
      });
    },
    [],
  );

  return { state, recordSession };
}

// ---------------------------------------------------------------------------
// Domain topic extraction helpers
// ---------------------------------------------------------------------------

interface DomainTopics {
  domain: string;
  label: string;
  description: string;
  color: DomainColor;
  icon: "reader" | "lightning" | "play" | "rocket";
  topics: { key: string; label: string }[];
  available: boolean;
}

function extractDomainTopics(app: AppData): DomainTopics[] {
  // 1. Concept Coach -- from aiInterviewPrep requirements
  const conceptTopics: { key: string; label: string }[] = [];
  if (app.aiInterviewPrep?.requirements) {
    for (const req of app.aiInterviewPrep.requirements) {
      conceptTopics.push({
        key: slugify(req.requirement),
        label: req.requirement,
      });
    }
  }

  // 2. Interview Sim -- from aiInterviewQuestions.technicalQuestions
  const interviewTopics: { key: string; label: string }[] = [];
  if (app.aiInterviewQuestions?.technicalQuestions) {
    const categories = new Set<string>();
    for (const tq of app.aiInterviewQuestions.technicalQuestions) {
      if (!categories.has(tq.category)) {
        categories.add(tq.category);
        interviewTopics.push({
          key: slugify(tq.category),
          label: tq.category,
        });
      }
    }
  }

  // 3. Code Challenger -- from agenticCoding.exercises
  const codingTopics: { key: string; label: string }[] = [];
  if (app.agenticCoding?.exercises) {
    for (const ex of app.agenticCoding.exercises) {
      codingTopics.push({
        key: slugify(ex.title),
        label: ex.title,
      });
    }
  }

  // 4. Backend Deep Dive -- from aiBackendPrep sections
  const backendTopics: { key: string; label: string }[] = [];
  if (app.aiBackendPrep) {
    const bp = app.aiBackendPrep;
    for (const key of BACKEND_SECTION_KEYS) {
      const section = (bp as Record<string, unknown>)[key];
      if (
        section &&
        typeof section === "object" &&
        section !== null &&
        "title" in section
      ) {
        const sec = section as { title?: string; overview?: string };
        if (sec.title || sec.overview) {
          backendTopics.push({
            key,
            label: BACKEND_SECTION_LABELS[key] ?? key,
          });
        }
      }
    }
  }

  return [
    {
      domain: "concepts",
      label: "Concept Coach",
      description: "Master core concepts from the JD",
      color: "violet",
      icon: "reader",
      topics: conceptTopics,
      available: conceptTopics.length > 0,
    },
    {
      domain: "interview",
      label: "Interview Sim",
      description: "Practice technical interview Q&A",
      color: "blue",
      icon: "lightning",
      topics: interviewTopics,
      available: interviewTopics.length > 0,
    },
    {
      domain: "coding",
      label: "Code Challenger",
      description: "Hands-on coding exercises",
      color: "green",
      icon: "play",
      topics: codingTopics,
      available: codingTopics.length > 0,
    },
    {
      domain: "backend",
      label: "Backend Deep Dive",
      description: `${backendTopics.length > 0 ? backendTopics.length : 20}-topic backend mastery path`,
      color: "teal",
      icon: "rocket",
      topics: backendTopics,
      available: backendTopics.length > 0,
    },
  ];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Quiz question generation
// ---------------------------------------------------------------------------

function generateQuestionsFromContent(
  app: AppData,
  domain: string,
  topicKey: string,
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];

  if (domain === "concepts" && app.aiInterviewPrep?.requirements) {
    const req = app.aiInterviewPrep.requirements.find(
      (r) => slugify(r.requirement) === topicKey,
    );
    if (req) {
      // Use requirement questions as quiz questions
      for (const q of req.questions.slice(0, 8)) {
        const wrongAnswers = generateWrongAnswers(req.studyTopics);
        if (wrongAnswers.length >= 3) {
          const correct = `This relates to: ${req.studyTopics[0] ?? req.requirement}`;
          const opts = shuffleWithCorrect(
            [correct, ...wrongAnswers.slice(0, 3)],
            0,
          );
          questions.push({
            question: q,
            options: opts.items,
            correctIndex: opts.correctIdx,
          });
        }
      }
      // Derive from study topic deep dives
      for (const topic of req.studyTopics.slice(0, 4)) {
        const deepDive = req.studyTopicDeepDives?.find(
          (dd) => dd.topic === topic,
        );
        if (deepDive?.deepDive) {
          const correct = extractFirstSentence(deepDive.deepDive);
          const wrongs = req.studyTopics
            .filter((st) => st !== topic)
            .slice(0, 3)
            .map((st) => `This is primarily about ${st}`);
          if (correct && wrongs.length >= 3) {
            const opts = shuffleWithCorrect([correct, ...wrongs], 0);
            questions.push({
              question: `What is a key aspect of "${topic}" in the context of ${req.requirement}?`,
              options: opts.items,
              correctIndex: opts.correctIdx,
            });
          }
        }
      }
    }
  }

  if (domain === "interview" && app.aiInterviewQuestions?.technicalQuestions) {
    const categoryQuestions =
      app.aiInterviewQuestions.technicalQuestions.filter(
        (tq) => slugify(tq.category) === topicKey,
      );
    for (const tq of categoryQuestions.slice(0, 8)) {
      const correct = tq.reason;
      const otherReasons = app.aiInterviewQuestions.technicalQuestions
        .filter((other) => other.question !== tq.question)
        .map((other) => other.reason);
      const wrongs = pickRandom(otherReasons, 3);
      if (wrongs.length >= 3) {
        const opts = shuffleWithCorrect([correct, ...wrongs], 0);
        questions.push({
          question: `Why might an interviewer ask: "${tq.question}"?`,
          options: opts.items,
          correctIndex: opts.correctIdx,
        });
      }
    }
  }

  if (domain === "coding" && app.agenticCoding?.exercises) {
    const exercise = app.agenticCoding.exercises.find(
      (ex) => slugify(ex.title) === topicKey,
    );
    if (exercise) {
      // Skills question
      if (exercise.skills.length >= 2) {
        const correct = exercise.skills.join(", ");
        const allSkills = app.agenticCoding.exercises.flatMap(
          (ex2) => ex2.skills,
        );
        const uniqueOther = Array.from(new Set(allSkills)).filter(
          (s) => !exercise.skills.includes(s),
        );
        const wrongs = pickRandom(
          uniqueOther.map(
            (_s, idx) =>
              pickRandom(uniqueOther, Math.min(exercise.skills.length, 3)).join(
                ", ",
              ) || `Skill set ${idx + 1}`,
          ),
          3,
        );
        if (wrongs.length >= 3) {
          const opts = shuffleWithCorrect([correct, ...wrongs], 0);
          questions.push({
            question: `Which skills does the exercise "${exercise.title}" target?`,
            options: opts.items,
            correctIndex: opts.correctIdx,
          });
        }
      }

      // Difficulty question
      const correctDiff = exercise.difficulty;
      const otherDiffs = ["easy", "medium", "hard"]
        .filter((d) => d !== correctDiff)
        .concat("expert")
        .slice(0, 3);
      const diffOpts = shuffleWithCorrect([correctDiff, ...otherDiffs], 0);
      questions.push({
        question: `What is the difficulty level of "${exercise.title}"?`,
        options: diffOpts.items,
        correctIndex: diffOpts.correctIdx,
      });

      // Hints question
      if (exercise.hints.length > 0) {
        const correctHint = exercise.hints[0];
        const otherHints = app.agenticCoding.exercises
          .filter((ex2) => ex2.title !== exercise.title)
          .flatMap((ex2) => ex2.hints);
        const wrongHints = pickRandom(otherHints, 3);
        if (wrongHints.length >= 3) {
          const hintOpts = shuffleWithCorrect(
            [correctHint, ...wrongHints],
            0,
          );
          questions.push({
            question: `Which hint applies to "${exercise.title}"?`,
            options: hintOpts.items,
            correctIndex: hintOpts.correctIdx,
          });
        }
      }

      // Description question
      const otherDescs = app.agenticCoding.exercises
        .filter((ex2) => ex2.title !== exercise.title)
        .slice(0, 3)
        .map((ex2) => ex2.description);
      if (otherDescs.length >= 3) {
        const descOpts = shuffleWithCorrect(
          [exercise.description, ...otherDescs],
          0,
        );
        questions.push({
          question: `What does the exercise "${exercise.title}" involve?`,
          options: descOpts.items,
          correctIndex: descOpts.correctIdx,
        });
      }
    }
  }

  if (domain === "backend" && app.aiBackendPrep) {
    const bp = app.aiBackendPrep;
    const section = (bp as Record<string, unknown>)[topicKey];
    if (
      section &&
      typeof section === "object" &&
      section !== null &&
      "interviewQuestions" in section
    ) {
      const sec = section as {
        interviewQuestions: Array<{
          question: string;
          idealAnswer: string;
          difficulty: string;
          followUps: string[];
        }>;
        keyConcepts: string[];
        commonPitfalls: string[];
        title: string;
      };
      for (const iq of sec.interviewQuestions.slice(0, 8)) {
        const correctFragment = extractFirstSentence(iq.idealAnswer);
        // Build wrong answers from other sections
        const otherAnswers: string[] = [];
        for (const otherKey of BACKEND_SECTION_KEYS) {
          if (otherKey === topicKey) continue;
          const otherSec = (bp as Record<string, unknown>)[otherKey];
          if (
            otherSec &&
            typeof otherSec === "object" &&
            otherSec !== null &&
            "interviewQuestions" in otherSec
          ) {
            const other = otherSec as typeof sec;
            for (const oiq of other.interviewQuestions) {
              otherAnswers.push(extractFirstSentence(oiq.idealAnswer));
            }
          }
        }
        const wrongs = pickRandom(
          otherAnswers.filter((a) => a !== correctFragment),
          3,
        );
        if (wrongs.length >= 3 && correctFragment) {
          const opts = shuffleWithCorrect([correctFragment, ...wrongs], 0);
          questions.push({
            question: iq.question,
            options: opts.items,
            correctIndex: opts.correctIdx,
          });
        }
      }
    }
  }

  // Ensure minimum 4 questions by padding with reinforcement
  if (questions.length > 0 && questions.length < 4) {
    const existing = [...questions];
    for (let i = 0; questions.length < 4 && i < existing.length; i++) {
      const eq = existing[i];
      questions.push({
        question: `[Review] ${eq.question}`,
        options: [...eq.options],
        correctIndex: eq.correctIndex,
      });
    }
  }

  return questions.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function extractFirstSentence(text: string): string {
  const cleaned = text.replace(/[#*`_]/g, "").trim();
  const match = cleaned.match(/^(.+?[.!?])\s/);
  return match ? match[1] : cleaned.slice(0, 120);
}

function generateWrongAnswers(studyTopics: string[]): string[] {
  const wrongs: string[] = [];
  const fillers = [
    "This is unrelated to the job requirements",
    "This concept applies only to frontend development",
    "This is a deprecated approach not used in modern systems",
    "This relates to a different architectural pattern entirely",
  ];
  for (const topic of studyTopics.slice(1, 3)) {
    wrongs.push(`This is primarily about ${topic}`);
  }
  for (const f of fillers) {
    if (wrongs.length < 3) wrongs.push(f);
  }
  return wrongs;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function shuffleWithCorrect(
  items: string[],
  correctOriginalIndex: number,
): { items: string[]; correctIdx: number } {
  const correctItem = items[correctOriginalIndex];
  const indices = items.map((_: string, i: number) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const shuffled = indices.map((i: number) => items[i]);
  const correctIdx = shuffled.indexOf(correctItem);
  return { items: shuffled, correctIdx };
}

function timeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
}

function masteryBadgeColor(
  level: MasteryLevel,
): "red" | "orange" | "blue" | "green" {
  switch (level) {
    case "mastery":
      return "green";
    case "confident":
      return "blue";
    case "familiar":
      return "orange";
    default:
      return "red";
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "\u2026" : text;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DomainIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "reader":
      return <ReaderIcon width={16} height={16} />;
    case "lightning":
      return <LightningBoltIcon width={16} height={16} />;
    case "play":
      return <PlayIcon width={16} height={16} />;
    case "rocket":
      return <RocketIcon width={16} height={16} />;
    default:
      return null;
  }
}

function ProgressBar({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  return (
    <Box
      style={{
        height: 8,
        borderRadius: 4,
        backgroundColor: `var(--${color}-3)`,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <Box
        style={{
          height: "100%",
          width: `${Math.min(100, Math.max(0, value))}%`,
          borderRadius: 4,
          backgroundColor: `var(--${color}-9)`,
          transition: "width 0.3s ease",
        }}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Team Card
// ---------------------------------------------------------------------------

function TeamCard({
  dt,
  mastery,
  onStudy,
  onQuiz,
}: {
  dt: DomainTopics;
  mastery: Record<string, LocalMastery>;
  onStudy: (domain: string, topicKey: string) => void;
  onQuiz: (domain: string, topicKey: string) => void;
}) {
  const topicMasteries = dt.topics.map((t) => {
    const key = `${dt.domain}:${t.key}`;
    return mastery[key] ?? null;
  });

  const masteredCount = topicMasteries.filter(
    (m) =>
      m && (m.masteryLevel === "mastery" || m.masteryLevel === "confident"),
  ).length;
  const totalCount = dt.topics.length;
  const progressPct = totalCount > 0 ? (masteredCount / totalCount) * 100 : 0;

  // Find next unstudied topic
  const nextTopic = dt.topics.find((t) => {
    const key = `${dt.domain}:${t.key}`;
    const m = mastery[key];
    return !m || m.masteryLevel === "unfamiliar";
  });

  // Find weakest topic (lowest confidence among studied)
  let weakest: { key: string; label: string } | null = null;
  let weakestScore = Infinity;
  for (const t of dt.topics) {
    const key = `${dt.domain}:${t.key}`;
    const m = mastery[key];
    if (m && m.confidenceScore < weakestScore && m.totalSessions > 0) {
      weakestScore = m.confidenceScore;
      weakest = t;
    }
  }

  // Find strongest topic
  let strongest: { key: string; label: string } | null = null;
  let strongestScore = -1;
  for (const t of dt.topics) {
    const key = `${dt.domain}:${t.key}`;
    const m = mastery[key];
    if (m && m.confidenceScore > strongestScore) {
      strongestScore = m.confidenceScore;
      strongest = t;
    }
  }

  // Find review-due topic (studied longest ago among non-mastered)
  let reviewDue: { key: string; label: string } | null = null;
  let oldestStudy = Infinity;
  for (const t of dt.topics) {
    const key = `${dt.domain}:${t.key}`;
    const m = mastery[key];
    if (
      m &&
      m.lastStudiedAt &&
      m.masteryLevel !== "mastery" &&
      m.totalSessions > 0
    ) {
      const ts = new Date(m.lastStudiedAt).getTime();
      if (ts < oldestStudy) {
        oldestStudy = ts;
        reviewDue = t;
      }
    }
  }

  if (!dt.available) {
    return (
      <Card
        style={{
          borderLeft: `3px solid var(--${dt.color}-6)`,
          opacity: 0.6,
        }}
      >
        <Flex align="center" gap="2" mb="2">
          <Box style={{ color: `var(--${dt.color}-9)` }}>
            <DomainIcon icon={dt.icon} />
          </Box>
          <Heading size="3">{dt.label}</Heading>
        </Flex>
        <Text size="2" color="gray" as="div" mb="3">
          {dt.description}
        </Text>
        <Text size="2" color="gray" style={{ fontStyle: "italic" }}>
          Generate content first (use the relevant tab above)
        </Text>
      </Card>
    );
  }

  const firstTopicKey = dt.topics[0]?.key ?? "";

  return (
    <Card style={{ borderLeft: `3px solid var(--${dt.color}-9)` }}>
      <Flex align="center" gap="2" mb="2">
        <Box style={{ color: `var(--${dt.color}-9)` }}>
          <DomainIcon icon={dt.icon} />
        </Box>
        <Heading size="3">{dt.label}</Heading>
      </Flex>
      <Text size="2" color="gray" as="div" mb="3">
        {dt.description}
      </Text>

      <Box mb="3">
        <ProgressBar value={progressPct} color={dt.color} />
        <Text size="1" color="gray" mt="1" as="div">
          {masteredCount}/{totalCount} topics
        </Text>
      </Box>

      <Flex direction="column" gap="1" mb="3">
        {nextTopic && (
          <Text size="1" as="div">
            <Text color="gray">Next up: </Text>
            <Text weight="medium">{truncate(nextTopic.label, 40)}</Text>
          </Text>
        )}
        {reviewDue && reviewDue.key !== nextTopic?.key && (
          <Text size="1" as="div">
            <Text color="orange">Review due: </Text>
            <Text weight="medium">{truncate(reviewDue.label, 40)}</Text>
          </Text>
        )}
        {dt.domain === "backend" && strongest && (
          <Text size="1" as="div">
            <Text color="green">Strongest: </Text>
            <Text weight="medium">{truncate(strongest.label, 40)}</Text>
          </Text>
        )}
        {weakest &&
          weakest.key !== strongest?.key &&
          (dt.domain === "backend" || dt.domain === "interview") && (
            <Text size="1" as="div">
              <Text color="red">Weakest: </Text>
              <Text weight="medium">{truncate(weakest.label, 40)}</Text>
            </Text>
          )}
      </Flex>

      <Flex gap="2" wrap="wrap">
        {(dt.domain === "concepts" || dt.domain === "backend") && (
          <>
            <Button
              size="2"
              variant="soft"
              color={dt.color}
              onClick={() =>
                onStudy(dt.domain, nextTopic?.key ?? firstTopicKey)
              }
            >
              <ReaderIcon />
              Study Next
            </Button>
            <Button
              size="2"
              variant="outline"
              color={dt.color}
              onClick={() =>
                onQuiz(
                  dt.domain,
                  weakest?.key ?? nextTopic?.key ?? firstTopicKey,
                )
              }
            >
              <LightningBoltIcon />
              Quick Quiz
            </Button>
          </>
        )}
        {dt.domain === "interview" && (
          <>
            <Button
              size="2"
              variant="soft"
              color={dt.color}
              onClick={() =>
                onStudy(dt.domain, nextTopic?.key ?? firstTopicKey)
              }
            >
              <PlayIcon />
              Practice
            </Button>
            <Button
              size="2"
              variant="outline"
              color={dt.color}
              onClick={() =>
                onQuiz(
                  dt.domain,
                  weakest?.key ?? nextTopic?.key ?? firstTopicKey,
                )
              }
            >
              <LightningBoltIcon />
              Mock Session
            </Button>
          </>
        )}
        {dt.domain === "coding" && (
          <Button
            size="2"
            variant="soft"
            color={dt.color}
            onClick={() =>
              onStudy(dt.domain, nextTopic?.key ?? firstTopicKey)
            }
          >
            <PlayIcon />
            Start Exercise
          </Button>
        )}
      </Flex>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Quiz Area
// ---------------------------------------------------------------------------

function QuizArea({
  app,
  activeMode,
  domains,
  onComplete,
  onCancel,
}: {
  app: AppData;
  activeMode: ActiveMode;
  domains: DomainTopics[];
  onComplete: (score: number) => void;
  onCancel: () => void;
}) {
  const questions = useMemo(
    () =>
      generateQuestionsFromContent(app, activeMode.domain, activeMode.topicKey),
    [app, activeMode.domain, activeMode.topicKey],
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const domainInfo = domains.find((d) => d.domain === activeMode.domain);
  const topicLabel =
    domainInfo?.topics.find((t) => t.key === activeMode.topicKey)?.label ??
    activeMode.topicKey;

  if (questions.length === 0) {
    return (
      <Card mt="4" style={{ borderLeft: "3px solid var(--amber-9)" }}>
        <Flex direction="column" align="center" gap="3" p="4">
          <Text size="3" weight="medium">
            Not enough content to generate a quiz for &ldquo;{topicLabel}
            &rdquo;
          </Text>
          <Text size="2" color="gray">
            Generate more content in the relevant tab above, then try again.
          </Text>
          <Button variant="soft" color="gray" onClick={onCancel}>
            Close
          </Button>
        </Flex>
      </Card>
    );
  }

  const current = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
  };

  const handleConfirm = () => {
    if (selected === null) return;
    setAnswered(true);
    if (selected === current.correctIndex) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = () => {
    if (isLast) {
      const finalCorrect =
        correctCount + (selected === current.correctIndex ? 1 : 0);
      const score = Math.round((finalCorrect / questions.length) * 100);
      onComplete(score);
      return;
    }
    setCurrentIdx((i) => i + 1);
    setSelected(null);
    setAnswered(false);
  };

  return (
    <Card
      mt="4"
      style={{
        borderLeft: `3px solid var(--${domainInfo?.color ?? "blue"}-9)`,
      }}
    >
      <Flex justify="between" align="center" mb="3">
        <Flex align="center" gap="2">
          <Badge size="2" variant="soft" color={domainInfo?.color ?? "blue"}>
            Quiz
          </Badge>
          <Text size="2" weight="medium">
            {topicLabel}
          </Text>
        </Flex>
        <Flex align="center" gap="2">
          <Text size="1" color="gray">
            {currentIdx + 1}/{questions.length}
          </Text>
          <Button size="1" variant="ghost" color="gray" onClick={onCancel}>
            Cancel
          </Button>
        </Flex>
      </Flex>

      <Text size="3" weight="medium" as="div" mb="3">
        {current.question}
      </Text>

      <Flex direction="column" gap="2" mb="3">
        {current.options.map((opt: string, i: number) => {
          let bgColor = "var(--gray-2)";
          let borderColor = "transparent";
          if (answered) {
            if (i === current.correctIndex) {
              bgColor = "var(--green-3)";
              borderColor = "var(--green-9)";
            } else if (i === selected && i !== current.correctIndex) {
              bgColor = "var(--red-3)";
              borderColor = "var(--red-9)";
            }
          } else if (i === selected) {
            bgColor = `var(--${domainInfo?.color ?? "blue"}-3)`;
            borderColor = `var(--${domainInfo?.color ?? "blue"}-9)`;
          }

          return (
            <Box
              key={i}
              p="3"
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(i)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") handleSelect(i);
              }}
              style={{
                backgroundColor: bgColor,
                border: `2px solid ${borderColor}`,
                borderRadius: "var(--radius-2)",
                cursor: answered ? "default" : "pointer",
                transition: "all 0.15s",
              }}
            >
              <Flex align="center" gap="2">
                {answered && i === current.correctIndex && (
                  <CheckCircledIcon
                    style={{ color: "var(--green-9)", flexShrink: 0 }}
                  />
                )}
                {answered &&
                  i === selected &&
                  i !== current.correctIndex && (
                    <CrossCircledIcon
                      style={{ color: "var(--red-9)", flexShrink: 0 }}
                    />
                  )}
                <Text size="2">{opt}</Text>
              </Flex>
            </Box>
          );
        })}
      </Flex>

      {!answered ? (
        <Button
          size="2"
          color={domainInfo?.color ?? "blue"}
          disabled={selected === null}
          onClick={handleConfirm}
        >
          Confirm Answer
        </Button>
      ) : (
        <Button
          size="2"
          color={domainInfo?.color ?? "blue"}
          onClick={handleNext}
        >
          {isLast ? "Finish Quiz" : "Next Question"}
        </Button>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Study Area
// ---------------------------------------------------------------------------

function getStudyContent(
  app: AppData,
  domain: string,
  topicKey: string,
): { heading: string | null; text: string }[] {
  const items: { heading: string | null; text: string }[] = [];

  if (domain === "concepts" && app.aiInterviewPrep?.requirements) {
    const req = app.aiInterviewPrep.requirements.find(
      (r) => slugify(r.requirement) === topicKey,
    );
    if (req) {
      if (req.deepDive) {
        items.push({
          heading: "Deep Dive",
          text: req.deepDive.replace(/[#*`]/g, "").trim().slice(0, 1500),
        });
      }
      if (req.questions.length > 0) {
        items.push({
          heading: "Key Questions",
          text: req.questions.map((q: string) => `\u2022 ${q}`).join("\n"),
        });
      }
      if (req.studyTopics.length > 0) {
        items.push({
          heading: "Study Topics",
          text: req.studyTopics.map((t: string) => `\u2022 ${t}`).join("\n"),
        });
      }
      for (const dd of req.studyTopicDeepDives ?? []) {
        if (dd.deepDive) {
          items.push({
            heading: dd.topic,
            text: dd.deepDive.replace(/[#*`]/g, "").trim().slice(0, 800),
          });
        }
      }
    }
  }

  if (domain === "interview" && app.aiInterviewQuestions?.technicalQuestions) {
    const categoryQs = app.aiInterviewQuestions.technicalQuestions.filter(
      (tq) => slugify(tq.category) === topicKey,
    );
    for (const tq of categoryQs) {
      items.push({
        heading: tq.category,
        text: `Q: ${tq.question}\n\nWhy this matters: ${tq.reason}`,
      });
    }
  }

  if (domain === "coding" && app.agenticCoding?.exercises) {
    const exercise = app.agenticCoding.exercises.find(
      (ex) => slugify(ex.title) === topicKey,
    );
    if (exercise) {
      items.push({ heading: exercise.title, text: exercise.description });
      if (exercise.hints.length > 0) {
        items.push({
          heading: "Hints",
          text: exercise.hints
            .map((h: string) => `\u2022 ${h}`)
            .join("\n"),
        });
      }
      items.push({
        heading: "Skills to demonstrate",
        text: exercise.skills.join(", "),
      });
      items.push({ heading: "Agent Prompt", text: exercise.agentPrompt });
    }
  }

  if (domain === "backend" && app.aiBackendPrep) {
    const bp = app.aiBackendPrep;
    const section = (bp as Record<string, unknown>)[topicKey];
    if (
      section &&
      typeof section === "object" &&
      section !== null &&
      "overview" in section
    ) {
      const sec = section as {
        title: string;
        overview: string;
        deepDive: string;
        keyConcepts: string[];
        commonPitfalls: string[];
        talkingPoints: string[];
      };
      items.push({
        heading: "Overview",
        text: sec.overview.replace(/[#*`]/g, "").trim().slice(0, 1000),
      });
      if (sec.keyConcepts.length > 0) {
        items.push({
          heading: "Key Concepts",
          text: sec.keyConcepts.join(", "),
        });
      }
      if (sec.talkingPoints.length > 0) {
        items.push({
          heading: "Talking Points",
          text: sec.talkingPoints.map((tp: string) => `+ ${tp}`).join("\n"),
        });
      }
      if (sec.commonPitfalls.length > 0) {
        items.push({
          heading: "Common Pitfalls",
          text: sec.commonPitfalls.map((p: string) => `! ${p}`).join("\n"),
        });
      }
      if (sec.deepDive) {
        items.push({
          heading: "Deep Dive",
          text: sec.deepDive.replace(/[#*`]/g, "").trim().slice(0, 1500),
        });
      }
    }
  }

  return items;
}

function StudyArea({
  app,
  activeMode,
  domains,
  onComplete,
  onCancel,
}: {
  app: AppData;
  activeMode: ActiveMode;
  domains: DomainTopics[];
  onComplete: (confidence: MasteryLevel) => void;
  onCancel: () => void;
}) {
  const [showConfidence, setShowConfidence] = useState(false);
  const domainInfo = domains.find((d) => d.domain === activeMode.domain);
  const topicLabel =
    domainInfo?.topics.find((t) => t.key === activeMode.topicKey)?.label ??
    activeMode.topicKey;

  const content = useMemo(
    () => getStudyContent(app, activeMode.domain, activeMode.topicKey),
    [app, activeMode.domain, activeMode.topicKey],
  );

  return (
    <Card
      mt="4"
      style={{
        borderLeft: `3px solid var(--${domainInfo?.color ?? "blue"}-9)`,
      }}
    >
      <Flex justify="between" align="center" mb="3">
        <Flex align="center" gap="2">
          <Badge size="2" variant="soft" color={domainInfo?.color ?? "blue"}>
            Study
          </Badge>
          <Text size="2" weight="medium">
            {topicLabel}
          </Text>
        </Flex>
        <Button size="1" variant="ghost" color="gray" onClick={onCancel}>
          Cancel
        </Button>
      </Flex>

      {content.length === 0 ? (
        <Text size="2" color="gray" as="div" mb="3">
          No study content available for this topic. Generate content in the
          relevant tab above.
        </Text>
      ) : (
        <Flex direction="column" gap="3" mb="4">
          {content.map((item, i) => (
            <Box
              key={i}
              p="3"
              style={{
                backgroundColor: "var(--gray-2)",
                borderRadius: "var(--radius-2)",
              }}
            >
              {item.heading && (
                <Text
                  size="1"
                  color="gray"
                  weight="medium"
                  mb="1"
                  as="div"
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {item.heading}
                </Text>
              )}
              <Text
                size="2"
                as="div"
                style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}
              >
                {item.text}
              </Text>
            </Box>
          ))}
        </Flex>
      )}

      {!showConfidence ? (
        <Button
          size="2"
          color={domainInfo?.color ?? "blue"}
          onClick={() => setShowConfidence(true)}
          disabled={content.length === 0}
        >
          <CheckCircledIcon />
          Mark as studied
        </Button>
      ) : (
        <Box>
          <Text size="2" weight="medium" mb="2" as="div">
            How confident do you feel?
          </Text>
          <Flex gap="2" wrap="wrap">
            {(
              [
                { level: "unfamiliar", label: "Still shaky", clr: "red" },
                { level: "familiar", label: "Getting there", clr: "orange" },
                { level: "confident", label: "Confident", clr: "blue" },
                { level: "mastery", label: "Nailed it", clr: "green" },
              ] as const
            ).map(({ level, label, clr }) => (
              <Button
                key={level}
                size="2"
                variant="soft"
                color={clr}
                onClick={() => onComplete(level)}
              >
                {label}
              </Button>
            ))}
          </Flex>
        </Box>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Mastery Breakdown
// ---------------------------------------------------------------------------

function MasteryBreakdown({
  domains,
  mastery,
}: {
  domains: DomainTopics[];
  mastery: Record<string, LocalMastery>;
}) {
  const [open, setOpen] = useState(false);

  const studiedTopics = Object.values(mastery).filter(
    (m) => m.totalSessions > 0,
  );
  if (studiedTopics.length === 0) return null;

  return (
    <Card>
      <Flex
        align="center"
        gap="2"
        style={{ cursor: "pointer" }}
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") setOpen(!open);
        }}
      >
        <ChevronDownIcon
          style={{
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.15s",
          }}
        />
        <Heading size="3">Mastery Breakdown</Heading>
        <Text size="1" color="gray" ml="auto">
          {studiedTopics.length} topic
          {studiedTopics.length !== 1 ? "s" : ""} studied
        </Text>
      </Flex>

      {open && (
        <Flex direction="column" gap="2" mt="3">
          {domains.map((dt) => {
            const domainMasteries = dt.topics
              .map((t) => ({
                topic: t,
                m: mastery[`${dt.domain}:${t.key}`],
              }))
              .filter(
                (x): x is typeof x & { m: LocalMastery } =>
                  !!x.m && x.m.totalSessions > 0,
              );

            if (domainMasteries.length === 0) return null;
            return (
              <Box key={dt.domain}>
                <Text
                  size="1"
                  color="gray"
                  weight="medium"
                  mb="1"
                  as="div"
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {dt.label}
                </Text>
                <Flex gap="1" wrap="wrap">
                  {domainMasteries.map(({ topic, m }) => (
                    <Badge
                      key={topic.key}
                      size="1"
                      variant="soft"
                      color={masteryBadgeColor(m.masteryLevel)}
                      title={`${m.confidenceScore}% confidence, ${m.totalSessions} sessions`}
                    >
                      {truncate(topic.label, 25)} &middot; {m.masteryLevel}
                    </Badge>
                  ))}
                </Flex>
              </Box>
            );
          })}
        </Flex>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function LearningDashboard({
  app,
  isAdmin: _isAdmin,
}: LearningDashboardProps) {
  const { state, recordSession } = useLearningState(app.id);
  const [activeMode, setActiveMode] = useState<ActiveMode | null>(null);
  const [lastResult, setLastResult] = useState<{
    type: "quiz" | "study";
    score: number | null;
    confidence: string | null;
    topic: string;
  } | null>(null);

  const domains = useMemo(() => extractDomainTopics(app), [app]);

  // Calculate overall readiness
  const allTopicKeys = domains.flatMap((d) =>
    d.topics.map((t) => `${d.domain}:${t.key}`),
  );
  const totalTopics = allTopicKeys.length;
  const readinessSum = allTopicKeys.reduce((sum: number, key: string) => {
    const m = state.mastery[key];
    if (!m) return sum;
    return sum + MASTERY_WEIGHTS[m.masteryLevel];
  }, 0);
  const readinessPct =
    totalTopics > 0 ? Math.round((readinessSum / totalTopics) * 100) : 0;

  // Max streak
  const maxStreak = Object.values(state.mastery).reduce(
    (max: number, m: LocalMastery) => Math.max(max, m.streakDays),
    0,
  );

  const sessionCount = state.sessions.length;
  const recentSessions = state.sessions.slice(0, 5);

  const handleStudy = useCallback(
    (domain: string, topicKey: string) => {
      setActiveMode({ type: "study", domain, topicKey });
      setLastResult(null);
    },
    [],
  );

  const handleQuiz = useCallback(
    (domain: string, topicKey: string) => {
      setActiveMode({ type: "quiz", domain, topicKey });
      setLastResult(null);
    },
    [],
  );

  const handleQuizComplete = useCallback(
    (score: number) => {
      if (!activeMode) return;
      const topicLabel =
        domains
          .find((d) => d.domain === activeMode.domain)
          ?.topics.find((t) => t.key === activeMode.topicKey)?.label ??
        activeMode.topicKey;
      recordSession({
        sessionType: "quiz",
        domain: activeMode.domain,
        topicKey: activeMode.topicKey,
        score,
        confidence:
          score >= 80 ? "confident" : score >= 50 ? "familiar" : "unfamiliar",
      });
      setLastResult({
        type: "quiz",
        score,
        confidence: null,
        topic: topicLabel,
      });
      setActiveMode(null);
    },
    [activeMode, domains, recordSession],
  );

  const handleStudyComplete = useCallback(
    (confidence: MasteryLevel) => {
      if (!activeMode) return;
      const topicLabel =
        domains
          .find((d) => d.domain === activeMode.domain)
          ?.topics.find((t) => t.key === activeMode.topicKey)?.label ??
        activeMode.topicKey;
      recordSession({
        sessionType: "study",
        domain: activeMode.domain,
        topicKey: activeMode.topicKey,
        score: null,
        confidence,
      });
      setLastResult({
        type: "study",
        score: null,
        confidence,
        topic: topicLabel,
      });
      setActiveMode(null);
    },
    [activeMode, domains, recordSession],
  );

  return (
    <Flex direction="column" gap="4">
      {/* Section 1: Overview Bar */}
      <Card>
        <Flex justify="between" align="center" mb="2">
          <Heading size="4">Learning Progress</Heading>
          <Flex align="center" gap="3">
            <Text size="2" color="gray">
              {sessionCount} session{sessionCount !== 1 ? "s" : ""}
            </Text>
            {maxStreak > 0 && (
              <Flex align="baseline" gap="1">
                <Text size="5" weight="bold" style={{ color: "var(--amber-9)", lineHeight: 1 }}>
                  {maxStreak}
                </Text>
                <Text size="1" color="gray">day streak</Text>
              </Flex>
            )}
          </Flex>
        </Flex>
        {/* Thin overall completion bar */}
        {(() => {
          const masteredCount = allTopicKeys.filter((key) => {
            const m = state.mastery[key];
            return m && (m.masteryLevel === "confident" || m.masteryLevel === "mastery");
          }).length;
          const completionPct = totalTopics > 0 ? Math.round((masteredCount / totalTopics) * 100) : 0;
          return (
            <Box mb="2">
              <Box
                style={{
                  height: 4,
                  backgroundColor: "var(--green-3)",
                  overflow: "hidden",
                  width: "100%",
                }}
              >
                <Box
                  style={{
                    height: "100%",
                    width: `${completionPct}%`,
                    backgroundColor: "var(--green-9)",
                    transition: "width 0.3s ease",
                  }}
                />
              </Box>
              <Text size="1" color="gray" mt="1" as="div">
                {masteredCount}/{totalTopics} topics confident or mastered
              </Text>
            </Box>
          );
        })()}
        <Box mb="1">
          <ProgressBar value={readinessPct} color="blue" />
        </Box>
        <Flex justify="between" align="center">
          <Text size="1" color="gray">
            {readinessPct}% ready
          </Text>
          <Text size="1" color="gray">
            {totalTopics} topics across{" "}
            {domains.filter((d) => d.available).length} domains
          </Text>
        </Flex>
      </Card>

      {/* Last result flash */}
      {lastResult && (
        <Card
          style={{
            backgroundColor:
              lastResult.type === "quiz"
                ? (lastResult.score ?? 0) >= 80
                  ? "var(--green-2)"
                  : (lastResult.score ?? 0) >= 50
                    ? "var(--amber-2)"
                    : "var(--red-2)"
                : "var(--blue-2)",
            border: "none",
          }}
        >
          <Flex align="center" gap="2">
            {lastResult.type === "quiz" ? (
              <>
                <LightningBoltIcon />
                <Text size="2" weight="medium">
                  Quiz: {lastResult.topic} &mdash; {lastResult.score}%
                </Text>
              </>
            ) : (
              <>
                <ReaderIcon />
                <Text size="2" weight="medium">
                  Studied: {lastResult.topic} &mdash; {lastResult.confidence}
                </Text>
              </>
            )}
            <Button
              size="1"
              variant="ghost"
              color="gray"
              ml="auto"
              onClick={() => setLastResult(null)}
            >
              Dismiss
            </Button>
          </Flex>
        </Card>
      )}

      {/* Section 2: Team Cards (2x2 grid) */}
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {domains.map((dt) => (
          <TeamCard
            key={dt.domain}
            dt={dt}
            mastery={state.mastery}
            onStudy={handleStudy}
            onQuiz={handleQuiz}
          />
        ))}
      </Box>

      {/* Section 3: Active Quiz/Study Area */}
      {activeMode && activeMode.type === "quiz" && (
        <QuizArea
          app={app}
          activeMode={activeMode}
          domains={domains}
          onComplete={handleQuizComplete}
          onCancel={() => setActiveMode(null)}
        />
      )}
      {activeMode && activeMode.type === "study" && (
        <StudyArea
          app={app}
          activeMode={activeMode}
          domains={domains}
          onComplete={handleStudyComplete}
          onCancel={() => setActiveMode(null)}
        />
      )}

      {/* Empty state — no sessions yet */}
      {sessionCount === 0 && !activeMode && (
        <Card>
          <Flex
            direction="column"
            align="center"
            justify="center"
            gap="3"
            py="6"
            px="4"
            style={{ textAlign: "center" }}
          >
            <RocketIcon width={32} height={32} style={{ color: "var(--blue-9)" }} />
            <Heading size="4" style={{ color: "var(--gray-12)" }}>
              Start your learning journey
            </Heading>
            <Text size="2" color="gray" style={{ maxWidth: 420 }}>
              Pick a domain above and hit Study or Quiz to begin tracking your
              mastery. Each session builds your confidence score and streaks.
            </Text>
            {domains.find((d) => d.available) && (
              <Button
                size="3"
                color="blue"
                onClick={() => {
                  const first = domains.find((d) => d.available);
                  if (first && first.topics[0]) {
                    handleStudy(first.domain, first.topics[0].key);
                  }
                }}
              >
                <ReaderIcon />
                Begin Studying
              </Button>
            )}
          </Flex>
        </Card>
      )}

      {/* Section 4: Recent Activity */}
      {recentSessions.length > 0 && (
        <Card>
          <Heading size="3" mb="3">
            Recent Activity
          </Heading>
          <Flex direction="column" gap="2">
            {recentSessions.map((session) => {
              const domainInfo = domains.find(
                (d) => d.domain === session.domain,
              );
              const topicLabel =
                domainInfo?.topics.find((t) => t.key === session.topicKey)
                  ?.label ?? session.topicKey;
              return (
                <Flex key={session.id} align="center" gap="2">
                  <Text size="1" color="gray">
                    &middot;
                  </Text>
                  <Badge
                    size="1"
                    variant="soft"
                    color={domainInfo?.color ?? "gray"}
                  >
                    {session.sessionType === "quiz" ? "Quiz" : "Study"}
                  </Badge>
                  <Text size="2">{truncate(topicLabel, 35)}</Text>
                  <Text
                    size="1"
                    color="gray"
                    style={{ marginLeft: "auto" }}
                  >
                    {session.sessionType === "quiz" && session.score !== null
                      ? `${session.score}%`
                      : session.confidence}
                  </Text>
                  <Text size="1" color="gray">
                    {timeAgo(session.createdAt)}
                  </Text>
                </Flex>
              );
            })}
          </Flex>
        </Card>
      )}

      {/* Mastery Breakdown (collapsible) */}
      <MasteryBreakdown domains={domains} mastery={state.mastery} />
    </Flex>
  );
}
