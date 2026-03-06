"use client";

import { useState, useRef } from "react";
import {
  Card,
  Flex,
  Box,
  Text,
  Heading,
  Button,
  Badge,
} from "@radix-ui/themes";
import {
  CheckIcon,
  Cross1Icon,
  ChevronRightIcon,
  ResetIcon,
} from "@radix-ui/react-icons";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: string;
  topicKey: string;
}

export interface QuizResults {
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  confidence: "not_ready" | "familiar" | "confident" | "mastery";
  answers: { questionId: string; selectedIndex: number; correct: boolean }[];
  durationMs: number;
}

interface QuizModeProps {
  questions: QuizQuestion[];
  mode: "quiz" | "flashcard";
  domain: string;
  topicKey: string;
  onComplete: (results: QuizResults) => void;
  onClose: () => void;
}

function scoreToConfidence(score: number): QuizResults["confidence"] {
  if (score < 0.4) return "not_ready";
  if (score < 0.65) return "familiar";
  if (score < 0.85) return "confident";
  return "mastery";
}

const difficultyColor = (d: string) =>
  d === "easy" ? "green" : d === "hard" ? "red" : "amber";

export function QuizMode({ questions, mode, domain, topicKey, onComplete, onClose }: QuizModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<QuizResults["answers"]>([]);
  const [flashcardConfidences, setFlashcardConfidences] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const startTime = useRef(Date.now());

  const q = questions[currentIndex];
  const total = questions.length;
  const progress = ((currentIndex + (showResults ? 1 : 0)) / total) * 100;

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    setRevealed(true);
    setAnswers((prev) => [
      ...prev,
      { questionId: q.id, selectedIndex: idx, correct: idx === q.correctIndex },
    ]);
  };

  const handleFlashcardConfidence = (conf: string) => {
    setFlashcardConfidences((prev) => [...prev, conf]);
    advance();
  };

  const advance = () => {
    if (currentIndex + 1 >= total) {
      setShowResults(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setRevealed(false);
    }
  };

  const handleNext = () => advance();

  const buildResults = (): QuizResults => {
    const correct = answers.filter((a) => a.correct).length;
    const score = total > 0 ? correct / total : 0;
    return {
      totalQuestions: total,
      correctAnswers: correct,
      score,
      confidence: mode === "flashcard"
        ? inferFlashcardConfidence(flashcardConfidences)
        : scoreToConfidence(score),
      answers,
      durationMs: Date.now() - startTime.current,
    };
  };

  const handleFinish = () => {
    onComplete(buildResults());
  };

  const handleRetryWrong = () => {
    // Not implemented yet — just close
    onComplete(buildResults());
  };

  if (showResults) {
    const results = buildResults();
    const pct = Math.round(results.score * 100);
    return (
      <Card size="3">
        <Heading size="4" mb="3">
          {mode === "quiz" ? "Quiz" : "Flashcard Session"} Complete
        </Heading>

        {mode === "quiz" && (
          <>
            <Text size="5" weight="bold" as="div" mb="2">
              {results.correctAnswers}/{results.totalQuestions} ({pct}%)
            </Text>
            <Box mb="3" style={{ height: 8, backgroundColor: "var(--gray-4)", borderRadius: 4, overflow: "hidden" }}>
              <Box style={{
                height: "100%",
                width: `${pct}%`,
                backgroundColor: pct >= 85 ? "var(--blue-9)" : pct >= 65 ? "var(--green-9)" : pct >= 40 ? "var(--amber-9)" : "var(--red-9)",
                borderRadius: 4,
                transition: "width 0.5s ease",
              }} />
            </Box>
            <Flex gap="3" mb="3">
              <Badge color="green" size="2"><CheckIcon /> {results.correctAnswers} correct</Badge>
              <Badge color="red" size="2"><Cross1Icon /> {results.totalQuestions - results.correctAnswers} wrong</Badge>
            </Flex>
          </>
        )}

        <Flex align="center" gap="2" mb="3">
          <Text size="2" color="gray">Confidence:</Text>
          <Badge
            size="2"
            color={results.confidence === "mastery" ? "blue" : results.confidence === "confident" ? "green" : results.confidence === "familiar" ? "amber" : "red"}
          >
            {results.confidence.replace("_", " ")}
          </Badge>
        </Flex>

        <Text size="1" color="gray" mb="4" as="div">
          Duration: {Math.round(results.durationMs / 1000)}s
        </Text>

        <Flex gap="2">
          {mode === "quiz" && results.correctAnswers < results.totalQuestions && (
            <Button variant="soft" color="amber" onClick={handleRetryWrong}>
              <ResetIcon /> Retry Wrong
            </Button>
          )}
          <Button variant="soft" onClick={handleFinish}>Done</Button>
          <Button variant="ghost" color="gray" onClick={onClose}>Close</Button>
        </Flex>
      </Card>
    );
  }

  if (!q) return null;

  return (
    <Card size="3">
      <Flex justify="between" align="center" mb="2">
        <Text size="1" color="gray">
          Question {currentIndex + 1} of {total}
        </Text>
        <Flex gap="2" align="center">
          <Badge size="1" color={difficultyColor(q.difficulty)} variant="soft">
            {q.difficulty}
          </Badge>
          <Button size="1" variant="ghost" color="gray" onClick={onClose}>
            <Cross1Icon />
          </Button>
        </Flex>
      </Flex>

      <Box mb="3" style={{ height: 4, backgroundColor: "var(--gray-4)", borderRadius: 2, overflow: "hidden" }}>
        <Box style={{
          height: "100%",
          width: `${progress}%`,
          backgroundColor: "var(--accent-9)",
          borderRadius: 2,
          transition: "width 0.3s ease",
        }} />
      </Box>

      <Text size="3" weight="bold" as="div" mb="4">
        {q.question}
      </Text>

      {mode === "quiz" ? (
        <Flex direction="column" gap="2" mb="3">
          {q.options.map((opt, idx) => {
            let bg = "var(--gray-3)";
            let border = "1px solid transparent";
            if (selectedOption !== null) {
              if (idx === q.correctIndex) {
                bg = "var(--green-3)";
                border = "1px solid var(--green-8)";
              } else if (idx === selectedOption && idx !== q.correctIndex) {
                bg = "var(--red-3)";
                border = "1px solid var(--red-8)";
              }
            } else {
              bg = "var(--gray-3)";
            }

            return (
              <Box
                key={idx}
                p="3"
                style={{
                  backgroundColor: bg,
                  border,
                  borderRadius: "var(--radius-2)",
                  cursor: selectedOption === null ? "pointer" : "default",
                  transition: "background-color 0.15s",
                }}
                onClick={() => handleSelectOption(idx)}
                onMouseEnter={(e) => {
                  if (selectedOption === null)
                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--blue-3)";
                }}
                onMouseLeave={(e) => {
                  if (selectedOption === null)
                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--gray-3)";
                }}
              >
                <Flex align="center" gap="2">
                  {selectedOption !== null && idx === q.correctIndex && (
                    <CheckIcon color="var(--green-11)" />
                  )}
                  {selectedOption !== null && idx === selectedOption && idx !== q.correctIndex && (
                    <Cross1Icon color="var(--red-11)" />
                  )}
                  <Text size="2">{opt}</Text>
                </Flex>
              </Box>
            );
          })}
        </Flex>
      ) : (
        <Box mb="3">
          {!revealed ? (
            <Button variant="soft" size="3" onClick={() => setRevealed(true)} style={{ width: "100%" }}>
              Show Answer
            </Button>
          ) : (
            <Box p="3" style={{ backgroundColor: "var(--green-2)", borderRadius: "var(--radius-2)", borderLeft: "3px solid var(--green-9)" }}>
              <Text size="2" as="div">{q.explanation}</Text>
            </Box>
          )}
        </Box>
      )}

      {revealed && (
        <>
          {mode === "quiz" && (
            <Box mb="3" p="3" style={{ backgroundColor: "var(--blue-2)", borderRadius: "var(--radius-2)" }}>
              <Text size="1" color="gray" weight="medium" as="div" mb="1">EXPLANATION</Text>
              <Text size="2" as="div">{q.explanation}</Text>
            </Box>
          )}

          {mode === "quiz" ? (
            <Button variant="soft" onClick={handleNext}>
              {currentIndex + 1 >= total ? "See Results" : "Next"} <ChevronRightIcon />
            </Button>
          ) : (
            <Flex gap="2">
              <Button variant="soft" color="red" onClick={() => handleFlashcardConfidence("not_ready")}>
                Not Ready
              </Button>
              <Button variant="soft" color="amber" onClick={() => handleFlashcardConfidence("familiar")}>
                Familiar
              </Button>
              <Button variant="soft" color="green" onClick={() => handleFlashcardConfidence("confident")}>
                Confident
              </Button>
            </Flex>
          )}
        </>
      )}

      <Flex gap="2" mt="3">
        {answers.length > 0 && mode === "quiz" && (
          <>
            <Badge size="1" color="green">{answers.filter((a) => a.correct).length} correct</Badge>
            <Badge size="1" color="red">{answers.filter((a) => !a.correct).length} wrong</Badge>
          </>
        )}
      </Flex>
    </Card>
  );
}

function inferFlashcardConfidence(confidences: string[]): QuizResults["confidence"] {
  if (confidences.length === 0) return "not_ready";
  const scores = confidences.map((c): number =>
    c === "confident" ? 1 : c === "familiar" ? 0.5 : 0,
  );
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return scoreToConfidence(avg);
}
