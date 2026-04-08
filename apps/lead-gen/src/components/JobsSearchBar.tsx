/* =========================================================
   File: components/JobsSearchBar.tsx
   Full-text search input for jobs
   - Debounced typing as you search
   - Enter to submit
   - Esc to clear
   ========================================================= */

"use client";

import * as React from "react";
import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { button } from "@/recipes/button";
import { MagnifyingGlassIcon, Cross2Icon } from "@radix-ui/react-icons";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  placeholder?: string;
};

function safeIsComposing(e: React.KeyboardEvent) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Boolean((e.nativeEvent as any)?.isComposing);
}

export function JobsSearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  debounceMs = 120,
  placeholder = "Search jobs...",
}: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const debounceRef = React.useRef<number | null>(null);

  const focusInput = React.useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const clear = React.useCallback(() => {
    onChange("");
    onClear?.();
    focusInput();
  }, [onChange, onClear, focusInput]);

  const handleChange = React.useCallback(
    (text: string) => {
      onChange(text);

      // Debounced submission on typing
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        if (text.trim()) {
          onSubmit(text);
        }
      }, debounceMs);
    },
    [onChange, onSubmit, debounceMs],
  );

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (safeIsComposing(e)) return;

    if (e.key === "Escape") {
      if (value) {
        e.preventDefault();
        clear();
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (value.trim()) {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        onSubmit(value);
      }
    }
  };

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div
      className={flex({ align: "center" })}
      style={{ boxShadow: "0 0 0 1px var(--colors-ui-border) inset" }}
    >
      <div className={css({ pl: "3", display: "flex", alignItems: "center", color: "ui.tertiary" })}>
        <MagnifyingGlassIcon />
      </div>

      <input
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Search input"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={css({
          flex: 1,
          border: "none",
          outline: "none",
          bg: "transparent",
          py: "2",
          px: "2",
          fontSize: "base",
          color: "ui.heading",
          height: "40px",
          _placeholder: {
            color: "ui.tertiary",
          },
        })}
      />

      {value.length > 0 && (
        <div className={css({ pr: "2", display: "flex", alignItems: "center" })}>
          <button
            className={button({ variant: "ghost", size: "sm" })}
            aria-label="Clear input"
            title="Clear (Esc)"
            onClick={clear}
            style={{ padding: "4px", height: "24px", width: "24px", minWidth: "24px" }}
          >
            <Cross2Icon />
          </button>
        </div>
      )}
    </div>
  );
}
