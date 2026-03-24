"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { css } from "styled-system/css";

export type Lang = "ro" | "en";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "en",
  setLang: () => {},
});

export function useLang() {
  return useContext(LangContext);
}

export function LangProvider({ children, initialLang = "en" }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function LanguageSwitcher() {
  const { lang, setLang } = useLang();

  return (
    <div
      className={css({
        position: "fixed",
        top: "4",
        right: "4",
        zIndex: "50",
        display: "flex",
        bg: "rgba(18, 16, 14, 0.88)",
        backdropFilter: "blur(12px)",
        border: "1px solid",
        borderColor: "steel.borderHover",
        rounded: "pill",
        overflow: "hidden",
      })}
    >
      <button
        onClick={() => setLang("ro")}
        className={css({
          px: "3.5",
          py: "1.5",
          fontSize: "xs",
          fontWeight: "700",
          fontFamily: "display",
          letterSpacing: "0.06em",
          cursor: "pointer",
          border: "none",
          transition: "all 0.15s ease",
          bg: lang === "ro" ? "amber.warm" : "transparent",
          color: lang === "ro" ? "steel.dark" : "text.muted",
          _hover: {
            color: lang === "ro" ? "steel.dark" : "text.secondary",
          },
        })}
      >
        RO
      </button>
      <button
        onClick={() => setLang("en")}
        className={css({
          px: "3.5",
          py: "1.5",
          fontSize: "xs",
          fontWeight: "700",
          fontFamily: "display",
          letterSpacing: "0.06em",
          cursor: "pointer",
          border: "none",
          transition: "all 0.15s ease",
          bg: lang === "en" ? "amber.warm" : "transparent",
          color: lang === "en" ? "steel.dark" : "text.muted",
          _hover: {
            color: lang === "en" ? "steel.dark" : "text.secondary",
          },
        })}
      >
        EN
      </button>
    </div>
  );
}
