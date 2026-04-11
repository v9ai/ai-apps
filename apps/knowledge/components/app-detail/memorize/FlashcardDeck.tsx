"use client";

import { useState, useCallback, useEffect } from "react";
import { Button, Flex, Text, Badge } from "@radix-ui/themes";
import type { CssProperty, CssCategory } from "@/lib/css-properties";
import { LiveDemo } from "./LiveDemo";

interface FlashcardDeckProps {
  properties: CssProperty[];
  categories: CssCategory[];
  onRate: (propertyId: string, isCorrect: boolean) => void;
}

export function FlashcardDeck({
  properties,
  categories,
  onRate,
}: FlashcardDeckProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const prop = properties[index];
  const cat = categories.find((c) => c.id === prop?.category);
  const total = properties.length;

  const flip = useCallback(() => setFlipped((f) => !f), []);

  const rate = useCallback(
    (isCorrect: boolean) => {
      if (!prop) return;
      onRate(prop.id, isCorrect);
      setFlipped(false);
      setIndex((i) => (i + 1 < total ? i + 1 : 0));
    },
    [prop, onRate, total],
  );

  const navigate = useCallback(
    (dir: -1 | 1) => {
      setFlipped(false);
      setIndex((i) => {
        const next = i + dir;
        if (next < 0) return total - 1;
        if (next >= total) return 0;
        return next;
      });
    },
    [total],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        flip();
      } else if (e.key === "ArrowRight") {
        navigate(1);
      } else if (e.key === "ArrowLeft") {
        navigate(-1);
      } else if (e.key === "1") {
        rate(true);
      } else if (e.key === "2") {
        rate(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flip, rate, navigate]);

  if (!prop) {
    return (
      <div className="memorize-empty">
        <span className="memorize-empty-icon">&#x1F4DA;</span>
        <Text size="2">No properties to review.</Text>
      </div>
    );
  }

  return (
    <div>
      <div className="flashcard-counter">
        <Text size="1" color="gray">
          {index + 1} / {total}
        </Text>
      </div>

      <div className="flashcard-container" onClick={flip}>
        <div className={`flashcard ${flipped ? "flashcard--flipped" : ""}`}>
          {/* Front */}
          <div className="flashcard-face flashcard-front">
            {cat && (
              <Badge
                size="1"
                color={cat.color as "violet"}
                variant="soft"
                style={{ marginBottom: 16 }}
              >
                {cat.icon} {cat.name}
              </Badge>
            )}
            <div className="flashcard-property">{prop.property}</div>
            <div className="flashcard-prompt">
              What does this property do? What values can it take?
            </div>
            <Text
              size="1"
              color="gray"
              style={{ marginTop: "auto", paddingTop: 16 }}
            >
              Click or press <span className="memorize-kbd">Space</span> to
              reveal
            </Text>
          </div>

          {/* Back */}
          <div className="flashcard-face flashcard-back">
            <div className="flashcard-description">
              {prop.shortDescription}
            </div>

            <Text size="1" weight="bold" color="gray" mb="1">
              Values:
            </Text>
            <ul className="flashcard-values">
              {prop.values.map((v) => (
                <li key={v.value} className="flashcard-value">
                  <code>{v.value}</code>
                  <span className="flashcard-value-desc">
                    {" "}
                    &mdash; {v.description}
                  </span>
                </li>
              ))}
            </ul>

            <Text size="1" color="gray" mb="1">
              Default: <code>{prop.defaultValue}</code> &middot; Applies to:{" "}
              {prop.appliesTo}
            </Text>

            {prop.mnemonicHint && (
              <div className="flashcard-hint">{prop.mnemonicHint}</div>
            )}

            <div className="flashcard-demo-wrapper">
              <LiveDemo
                html={prop.demo.html}
                css={prop.demo.css}
                height={120}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Rating buttons — only show when flipped */}
      {flipped && (
        <div className="flashcard-rating">
          <Button
            size="2"
            variant="soft"
            color="grass"
            onClick={(e) => {
              e.stopPropagation();
              rate(true);
            }}
          >
            Knew it <span className="memorize-kbd">1</span>
          </Button>
          <Button
            size="2"
            variant="soft"
            color="red"
            onClick={(e) => {
              e.stopPropagation();
              rate(false);
            }}
          >
            Didn&apos;t know <span className="memorize-kbd">2</span>
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flashcard-nav">
        <Button size="1" variant="ghost" color="gray" onClick={() => navigate(-1)}>
          &larr; Prev
        </Button>
        <Button size="1" variant="ghost" color="gray" onClick={() => navigate(1)}>
          Next &rarr;
        </Button>
      </div>
    </div>
  );
}
