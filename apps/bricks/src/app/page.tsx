"use client";

import { useState } from "react";
import { css } from "styled-system/css";
import { useSession } from "@/lib/auth-client";
import { VideoEmbed } from "./_components/VideoEmbed";
import { PartsList } from "./_components/PartsList";
import { BuildSteps } from "./_components/BuildSteps";
import { BuildScheme } from "./_components/BuildScheme";
import { TopicResearch } from "./_components/TopicResearch";
import { SavedResearch } from "./_components/SavedResearch";
import { Favorites } from "./_components/Favorites";

interface AnalysisResult {
  video_info: {
    video_id: string;
    title: string;
    author: string;
    thumbnail_url: string;
  };
  parts_list: Array<{
    name: string;
    quantity: number;
    color: string;
    part_number: string;
  }>;
  building_steps: Array<{
    step_number: number;
    description: string;
    parts_used: string[];
    notes: string;
  }>;
  scheme: {
    phases: Array<{
      name: string;
      description: string;
      step_range: [number, number];
    }>;
    summary: string;
  };
  error?: string;
}

export default function Home() {
  const { data: session, isPending } = useSession();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function handleAnalyze() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: url }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        setError(data.error || "Analysis failed");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className={css({
        mx: "auto",
        maxW: "4xl",
        px: "4",
        py: "12",
      })}
    >
      {/* Hero */}
      <div className={css({ mb: "10", textAlign: "center" })}>
        <h1
          className={css({
            fontSize: "5xl",
            fontWeight: "900",
            fontFamily: "display",
            letterSpacing: "-0.03em",
            color: "ink.primary",
          })}
        >
          Bricks
        </h1>
        <p
          className={css({
            mt: "2",
            fontSize: "md",
            color: "ink.muted",
          })}
        >
          Paste a YouTube LEGO video to extract building instructions
        </p>
      </div>

      {/* Input — brick-shaped search bar */}
      <div
        className={css({
          display: "flex",
          gap: "2",
          bg: "plate.surface",
          rounded: "brick",
          border: "2px solid",
          borderColor: "plate.border",
          p: "2",
          boxShadow: "brick",
          transition: "all 0.2s ease",
          _focusWithin: {
            borderColor: "lego.orange",
            boxShadow: "brick.hover",
          },
        })}
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          placeholder="https://www.youtube.com/watch?v=..."
          disabled={loading}
          className={css({
            flex: 1,
            bg: "transparent",
            px: "3",
            py: "2",
            fontSize: "sm",
            color: "ink.primary",
            outline: "none",
            border: "none",
            _placeholder: { color: "ink.faint" },
          })}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !url.trim()}
          className={css({
            rounded: "lg",
            bg: "lego.red",
            px: "6",
            py: "2.5",
            fontSize: "sm",
            fontWeight: "800",
            fontFamily: "display",
            color: "white",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #A30008, 0 3px 6px rgba(0,0,0,0.3)",
            _hover: {
              bg: "#FF1A1A",
              transform: "translateY(-1px)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.25), 0 3px 0 #A30008, 0 5px 10px rgba(0,0,0,0.35)",
            },
            _active: {
              transform: "translateY(1px)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 0 #A30008, 0 1px 3px rgba(0,0,0,0.2)",
            },
            _disabled: { opacity: 0.5, cursor: "not-allowed" },
          })}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {/* Loading — spinning stud */}
      {loading && (
        <div className={css({ mt: "10", textAlign: "center" })}>
          <div
            className={css({
              mx: "auto",
              w: "12",
              h: "12",
              rounded: "stud",
              bg: "lego.orange",
              boxShadow: "stud",
              animation: "spin 1s linear infinite",
            })}
          />
          <p
            className={css({
              mt: "4",
              fontSize: "sm",
              fontWeight: "600",
              color: "ink.muted",
            })}
          >
            Fetching transcript and extracting building steps...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className={css({
            mt: "6",
            rounded: "brick",
            border: "2px solid",
            borderColor: "rgba(227, 0, 11, 0.3)",
            bg: "rgba(227, 0, 11, 0.08)",
            px: "4",
            py: "3",
            fontSize: "sm",
            fontWeight: "500",
            color: "#FF6B6B",
            boxShadow: "plate",
          })}
        >
          {error}
        </div>
      )}

      {/* Topic Research */}
      <TopicResearch isLoggedIn={!!session} />

      {/* Saved Research — only when logged in */}
      {session && <SavedResearch />}

      {/* Favorite MOCs */}
      <Favorites />

      {/* Results */}
      {result && (
        <div
          className={css({
            mt: "10",
            display: "flex",
            flexDir: "column",
            gap: "10",
          })}
        >
          {/* Video + model info */}
          <div>
            <h2
              className={css({
                mb: "1",
                fontSize: "xl",
                fontWeight: "800",
                fontFamily: "display",
                color: "ink.primary",
              })}
            >
              {result.video_info.title}
            </h2>
            <p className={css({ mb: "4", fontSize: "sm", color: "ink.muted" })}>
              by {result.video_info.author}
            </p>
            <VideoEmbed videoId={result.video_info.video_id} />
          </div>

          {/* Divider — brick strip */}
          <div
            className={css({
              h: "2px",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(254,138,24,0.3) 20%, rgba(254,138,24,0.5) 50%, rgba(254,138,24,0.3) 80%, transparent 100%)",
            })}
          />

          {/* Build scheme */}
          <BuildScheme scheme={result.scheme} />

          {/* Two-column layout */}
          <div
            className={css({
              display: "grid",
              gap: "10",
              lg: { gridTemplateColumns: "1fr 2fr" },
            })}
          >
            <PartsList parts={result.parts_list} />
            <BuildSteps steps={result.building_steps} />
          </div>
        </div>
      )}
    </main>
  );
}
