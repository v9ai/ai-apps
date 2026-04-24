"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { IconButton, Tooltip } from "@radix-ui/themes";

type SpeechRecognitionLike = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function MicButton({
  onTranscript,
  language = "en",
  size = "3",
}: {
  onTranscript: (delta: string, isFinal: boolean) => void;
  language?: string;
  size?: "2" | "3" | "4";
}) {
  const supported = useSyncExternalStore(
    () => () => {},
    () => getSpeechRecognition() != null,
    () => false,
  );
  const [active, setActive] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  if (!supported) return null;

  function start() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = language === "ro" ? "ro-RO" : "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      // Emit only final transcripts, appended to the textarea.
      for (let i = 0; i < ev.results.length; i++) {
        const result = ev.results[i] as unknown as {
          isFinal?: boolean;
          0: { transcript: string };
        };
        const txt = result[0]?.transcript ?? "";
        if (result.isFinal) {
          onTranscript(txt, true);
        }
      }
    };
    rec.onerror = () => {
      setActive(false);
    };
    rec.onend = () => {
      setActive(false);
    };
    recRef.current = rec;
    try {
      rec.start();
      setActive(true);
    } catch {
      setActive(false);
    }
  }

  function stop() {
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    setActive(false);
  }

  const label =
    language === "ro"
      ? active
        ? "Oprește dictarea"
        : "Vorbește în loc să scrii"
      : active
      ? "Stop dictation"
      : "Dictate instead of typing";

  return (
    <Tooltip content={label}>
      <IconButton
        type="button"
        variant={active ? "solid" : "soft"}
        color={active ? "red" : "gray"}
        size={size}
        onClick={active ? stop : start}
        aria-label={label}
        style={{
          minWidth: 44,
          minHeight: 44,
          animation: active ? "pulse 1.2s ease-in-out infinite" : undefined,
        }}
      >
        <MicIcon active={active} />
      </IconButton>
    </Tooltip>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? "2.5" : "2"}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
