"use client";

import { useState, useCallback, useMemo } from "react";
import { Button, Flex, Text } from "@radix-ui/themes";
import type { CssProperty, CssValue } from "@/lib/css-properties";
import { LiveDemo } from "./LiveDemo";

interface VisualMatcherProps {
  properties: CssProperty[];
  onRate: (propertyId: string, isCorrect: boolean) => void;
}

interface MatchQuestion {
  prop: CssProperty;
  correctOption: string;
  options: string[];
}

/** Build an explanation for why the correct answer is right and the wrong pick is wrong */
function buildExplanation(
  question: MatchQuestion,
  selectedOption: string,
): string {
  const { prop, correctOption } = question;
  const hl = prop.demo.highlightProp;

  // Parse property and value from an option string like "grid-column: 1 / 3;"
  const parseOption = (opt: string) => {
    const m = opt.match(/^(.+?):\s*(.+);$/);
    return m ? { prop: m[1].trim(), value: m[2].trim() } : null;
  };

  const correct = parseOption(correctOption);
  const picked = parseOption(selectedOption);
  if (!correct || !picked) return prop.shortDescription;

  const lines: string[] = [];

  // Explain what the correct answer does
  const correctValueDesc = prop.values.find(
    (v) => correct.value === v.value || correct.value.match(new RegExp(`^${v.value.replace(/<[^>]+>/g, ".+")}$`)),
  );
  lines.push(
    `${correctOption} — ${correctValueDesc?.description ?? prop.shortDescription}`,
  );

  // Explain why the picked option is wrong
  if (picked.prop !== correct.prop) {
    // They picked a different property entirely
    lines.push(
      `${selectedOption} is a different property (${picked.prop}) — it wouldn't control column placement here.`,
    );
  } else if (picked.value === "inherit") {
    lines.push(
      `"inherit" copies the parent's value, which is typically "auto" — it wouldn't produce this specific span.`,
    );
  } else {
    // Same property, different value
    const pickedValueDesc = prop.values.find(
      (v) => picked.value === v.value || picked.value.match(new RegExp(`^${v.value.replace(/<[^>]+>/g, ".+")}$`)),
    );
    if (pickedValueDesc) {
      lines.push(
        `${selectedOption} would instead: ${pickedValueDesc.description.charAt(0).toLowerCase()}${pickedValueDesc.description.slice(1)}`,
      );
    }
  }

  return lines.join("\n");
}

/** Pick a value variation for a property to create wrong answers */
function generateVariations(prop: CssProperty): string[] {
  const hl = prop.demo.highlightProp;
  const css = prop.demo.css;

  // Extract the current value from the demo CSS
  const re = new RegExp(`${hl}\\s*:\\s*([^;]+);`);
  const match = css.match(re);
  if (!match) return [];

  const currentValue = match[1].trim();
  const allValues = prop.values
    .map((v) => v.value)
    .filter(
      (v) =>
        v !== currentValue &&
        !v.startsWith("<") &&
        v !== "none" &&
        v !== "auto",
    );

  return allValues;
}

function buildQuestion(
  prop: CssProperty,
  allProps: CssProperty[],
): MatchQuestion {
  const hl = prop.demo.highlightProp;
  const css = prop.demo.css;
  const re = new RegExp(`(${hl}\\s*:\\s*)([^;]+)(;)`);
  const match = css.match(re);

  const correctValue = match ? match[2].trim() : "";
  const correctOption = `${hl}: ${correctValue};`;

  // Generate wrong options from the same property's other values
  const variations = generateVariations(prop);
  const wrongFromSame = variations
    .slice(0, 2)
    .map((v) => `${hl}: ${v};`);

  // One wrong option from a different property in the same category
  const siblings = allProps.filter(
    (p) => p.category === prop.category && p.id !== prop.id,
  );
  const wrongFromSibling =
    siblings.length > 0
      ? (() => {
          const sib = siblings[Math.floor(Math.random() * siblings.length)];
          const sibVal =
            sib.values.find((v) => !v.value.startsWith("<"))?.value ??
            sib.defaultValue;
          return `${sib.property}: ${sibVal};`;
        })()
      : null;

  const wrongs = [...wrongFromSame];
  if (wrongFromSibling && !wrongs.includes(wrongFromSibling)) {
    wrongs.push(wrongFromSibling);
  }

  // Ensure exactly 3 wrong options
  while (wrongs.length < 3) {
    wrongs.push(`${hl}: inherit;`);
  }

  const options = [correctOption, ...wrongs.slice(0, 3)].sort(
    () => Math.random() - 0.5,
  );

  return { prop, correctOption, options };
}

export function VisualMatcher({
  properties,
  onRate,
}: VisualMatcherProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const question = useMemo(
    () =>
      properties[index]
        ? buildQuestion(properties[index], properties)
        : null,
    [properties, index],
  );

  const handleSelect = useCallback(
    (opt: string) => {
      if (answered || !question) return;
      setSelected(opt);
      setAnswered(true);
      const correct = opt === question.correctOption;
      onRate(question.prop.id, correct);
    },
    [answered, question, onRate],
  );

  const handleNext = useCallback(() => {
    setSelected(null);
    setAnswered(false);
    setIndex((i) => (i + 1 < properties.length ? i + 1 : 0));
  }, [properties.length]);

  if (!question) {
    return (
      <div className="memorize-empty">
        <span className="memorize-empty-icon">&#x1F50D;</span>
        <Text size="2">No properties to match.</Text>
      </div>
    );
  }

  return (
    <div className="matcher-container">
      <Flex justify="center" mb="3">
        <Text size="1" color="gray">
          {index + 1} / {properties.length} &mdash; Which CSS declaration
          produces this output?
        </Text>
      </Flex>

      <div className="matcher-grid">
        <div className="matcher-preview">
          <div className="matcher-preview-label">Target Output</div>
          <LiveDemo
            html={question.prop.demo.html}
            css={question.prop.demo.css}
          />
        </div>

        <div className="matcher-options">
          {question.options.map((opt) => {
            let cls = "matcher-option";
            if (answered && opt === question.correctOption) {
              cls += " matcher-option--correct";
            } else if (answered && opt === selected) {
              cls += " matcher-option--incorrect";
            } else if (!answered && opt === selected) {
              cls += " matcher-option--selected";
            }
            return (
              <button
                key={opt}
                className={cls}
                onClick={() => handleSelect(opt)}
                disabled={answered}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            className={`matcher-feedback ${
              selected === question.correctOption
                ? "matcher-feedback--correct"
                : "matcher-feedback--incorrect"
            }`}
          >
            {selected === question.correctOption
              ? "Correct!"
              : (
                <>
                  <div className="matcher-feedback-title">
                    The answer was: {question.correctOption}
                  </div>
                  <div className="matcher-feedback-explanation">
                    {buildExplanation(question, selected!).split("\n").map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </>
              )}
          </div>
        )}
      </div>

      {answered && (
        <Flex justify="center" mt="4">
          <Button size="2" variant="soft" color="gray" onClick={handleNext}>
            Next
          </Button>
        </Flex>
      )}
    </div>
  );
}
