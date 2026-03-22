"use client";

import { css } from "styled-system/css";
import { useLanguage, type Language } from "@/lib/language";

const LANGUAGES: { value: Language; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "EN" },
  { value: "ro", label: "Romanian", flag: "RO" },
];

export default function SettingsPage() {
  const { language, setLanguage } = useLanguage();

  return (
    <main
        className={css({
          mx: "auto",
          maxW: "2xl",
          px: "4",
          py: "12",
        })}
      >
        <h1
          className={css({
            fontSize: "3xl",
            fontWeight: "900",
            fontFamily: "display",
            letterSpacing: "-0.03em",
            color: "ink.primary",
            mb: "8",
          })}
        >
          Settings
        </h1>

        {/* Language preference */}
        <section
          className={css({
            bg: "plate.surface",
            rounded: "brick",
            border: "2px solid",
            borderColor: "plate.border",
            p: "6",
            boxShadow: "brick",
          })}
        >
          <h2
            className={css({
              fontSize: "sm",
              fontWeight: "900",
              fontFamily: "display",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "ink.muted",
              mb: "4",
            })}
          >
            Preferred Language
          </h2>

          <div className={css({ display: "flex", flexDir: "column", gap: "2" })}>
            {LANGUAGES.map(({ value, label, flag }) => {
              const selected = language === value;
              return (
                <button
                  key={value}
                  onClick={() => setLanguage(value)}
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "3",
                    px: "4",
                    py: "3",
                    rounded: "lg",
                    border: "2px solid",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    fontFamily: "display",
                    fontWeight: "700",
                    fontSize: "sm",
                    bg: selected ? "rgba(254,138,24,0.08)" : "transparent",
                    borderColor: selected ? "lego.orange" : "plate.border",
                    color: selected ? "ink.primary" : "ink.secondary",
                    boxShadow: selected
                      ? "0 2px 0 rgba(254,138,24,0.3), inset 0 1px 0 rgba(255,255,255,0.06)"
                      : "none",
                    _hover: {
                      borderColor: selected ? "lego.orange" : "plate.borderHover",
                      bg: selected ? "rgba(254,138,24,0.08)" : "plate.raised",
                    },
                  })}
                >
                  {/* Flag stud */}
                  <span
                    className={css({
                      w: "8",
                      h: "8",
                      rounded: "stud",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "xs",
                      fontWeight: "900",
                      color: "white",
                      flexShrink: 0,
                      boxShadow: "stud",
                    })}
                    style={{
                      background: selected ? "#FE8A18" : "#666",
                    }}
                  >
                    {flag}
                  </span>
                  <span>{label}</span>
                  {selected && (
                    <span
                      className={css({
                        ml: "auto",
                        fontSize: "xs",
                        fontWeight: "800",
                        color: "lego.orange",
                      })}
                    >
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </main>
  );
}
