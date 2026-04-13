"use client";

import { useState, useCallback, useEffect } from "react";
import { Button, Text, Badge } from "@radix-ui/themes";
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
  const [revealed, setRevealed] = useState(false);

  const prop = properties[index];
  const cat = categories.find((c) => c.id === prop?.category);
  const total = properties.length;

  const toggle = useCallback(() => setRevealed((r) => !r), []);

  const rate = useCallback(
    (isCorrect: boolean) => {
      if (!prop) return;
      onRate(prop.id, isCorrect);
      setRevealed(false);
      setIndex((i) => (i + 1 < total ? i + 1 : 0));
    },
    [prop, onRate, total],
  );

  const navigate = useCallback(
    (dir: -1 | 1) => {
      setRevealed(false);
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
        toggle();
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
  }, [toggle, rate, navigate]);

  if (!prop) {
    return (
      <div className="memorize-empty">
        <span className="memorize-empty-icon">&#x1F4DA;</span>
        <Text size="2">No properties to review.</Text>
      </div>
    );
  }

  return (
    <div className="flashcard-split-wrapper">
      {/* Left: test / quiz */}
      <div className="flashcard-left" onClick={toggle}>
        <div className="flashcard-counter">
          <Text size="1" color="gray">
            {index + 1} / {total}
          </Text>
        </div>

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

        {revealed ? (
          <div className="flashcard-answer">
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
          </div>
        ) : (
          <Text
            size="1"
            color="gray"
            style={{ marginTop: "auto", paddingTop: 16 }}
          >
            Click or press <span className="memorize-kbd">Space</span> to
            reveal
          </Text>
        )}
      </div>

      {/* Right: rendered demo */}
      <div className="flashcard-right">
        <LiveDemo
          html={prop.demo.html}
          css={prop.demo.css}
          height="100%"
        />
      </div>

      {/* Bottom controls */}
      <div className="flashcard-controls">
        {revealed && (
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
        <div className="flashcard-nav">
          <Button size="1" variant="ghost" color="gray" onClick={() => navigate(-1)}>
            &larr; Prev
          </Button>
          <Button size="1" variant="ghost" color="gray" onClick={() => navigate(1)}>
            Next &rarr;
          </Button>
        </div>
      </div>
    </div>
  );
}
