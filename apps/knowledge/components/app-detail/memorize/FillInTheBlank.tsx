"use client";

import { useState, useCallback, useMemo } from "react";
import { Button, Flex, Text } from "@radix-ui/themes";
import type { CssProperty } from "@/lib/css-properties";
import { LiveDemo } from "./LiveDemo";

interface FillInTheBlankProps {
  properties: CssProperty[];
  onRate: (propertyId: string, isCorrect: boolean) => void;
}

interface BlankChallenge {
  prop: CssProperty;
  blankedCss: string;
  answer: string;
  blankLabel: string;
}

function generateChallenge(prop: CssProperty): BlankChallenge {
  const css = prop.demo.css;
  const highlightProp = prop.demo.highlightProp;

  // Find the line containing the highlighted property and blank its value
  const lines = css.split("\n");
  let answer = "";
  const blankedLines = lines.map((line) => {
    const re = new RegExp(`(${highlightProp}\\s*:\\s*)([^;]+)(;?)`);
    const match = line.match(re);
    if (match && !answer) {
      answer = match[2].trim();
      return line.replace(re, `$1_____$3`);
    }
    return line;
  });

  return {
    prop,
    blankedCss: blankedLines.join("\n"),
    answer,
    blankLabel: highlightProp,
  };
}

export function FillInTheBlank({
  properties,
  onRate,
}: FillInTheBlankProps) {
  const [index, setIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const challenge = useMemo(
    () => (properties[index] ? generateChallenge(properties[index]) : null),
    [properties, index],
  );

  const isCorrect = useMemo(() => {
    if (!challenge || !submitted) return false;
    const normalize = (s: string) =>
      s.toLowerCase().replace(/\s+/g, " ").trim();
    return normalize(userInput) === normalize(challenge.answer);
  }, [challenge, submitted, userInput]);

  const handleSubmit = useCallback(() => {
    if (!challenge) return;
    setSubmitted(true);
    onRate(challenge.prop.id, isCorrect);
  }, [challenge, isCorrect, onRate]);

  const handleNext = useCallback(() => {
    setSubmitted(false);
    setUserInput("");
    setIndex((i) => (i + 1 < properties.length ? i + 1 : 0));
  }, [properties.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        if (submitted) handleNext();
        else handleSubmit();
      }
    },
    [submitted, handleSubmit, handleNext],
  );

  if (!challenge) {
    return (
      <div className="memorize-empty">
        <span className="memorize-empty-icon">&#x270F;</span>
        <Text size="2">No properties to practice.</Text>
      </div>
    );
  }

  // Build preview with user's input substituted
  const previewCss = submitted
    ? challenge.prop.demo.css
    : challenge.blankedCss.replace("_____", userInput || "/* ? */");

  return (
    <div className="fill-blank-container">
      <Text size="2" color="gray" mb="3" style={{ display: "block" }}>
        Fill in the value for{" "}
        <code
          style={{
            fontFamily: "var(--font-mono)",
            background: "var(--violet-3)",
            padding: "1px 6px",
            borderRadius: "var(--radius-1)",
          }}
        >
          {challenge.blankLabel}
        </code>
        :
      </Text>

      <div className="fill-blank-code">
        {challenge.blankedCss.split("\n").map((line, i) => {
          if (line.includes("_____")) {
            const [before, after] = line.split("_____");
            return (
              <div key={i}>
                {before}
                <input
                  className={`fill-blank-input ${
                    submitted
                      ? isCorrect
                        ? "fill-blank-input--correct"
                        : "fill-blank-input--incorrect"
                      : ""
                  }`}
                  value={submitted && !isCorrect ? challenge.answer : userInput}
                  onChange={(e) => !submitted && setUserInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="value"
                  disabled={submitted}
                  autoFocus
                />
                {after}
              </div>
            );
          }
          return <div key={i}>{line}</div>;
        })}
      </div>

      <div className="fill-blank-preview">
        <LiveDemo
          html={challenge.prop.demo.html}
          css={previewCss}
          height={140}
        />
      </div>

      <div className="fill-blank-controls">
        {!submitted ? (
          <Button
            size="2"
            variant="solid"
            color="violet"
            onClick={handleSubmit}
          >
            Check <span className="memorize-kbd">Enter</span>
          </Button>
        ) : (
          <>
            {isCorrect ? (
              <Text size="2" color="grass" weight="bold">
                Correct!
              </Text>
            ) : (
              <Text size="2" color="red" weight="bold">
                Answer: {challenge.answer}
              </Text>
            )}
            <Button
              size="2"
              variant="soft"
              color="gray"
              onClick={handleNext}
            >
              Next <span className="memorize-kbd">Enter</span>
            </Button>
          </>
        )}
      </div>

      <Flex justify="center" mt="3">
        <Text size="1" color="gray">
          {index + 1} / {properties.length}
        </Text>
      </Flex>
    </div>
  );
}
