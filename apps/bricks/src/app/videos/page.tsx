"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { css } from "styled-system/css";
import { VideoStitcher } from "../_components/VideoStitcher";
import { YouTubeFavorites } from "../_components/YouTubeFavorites";

export default function VideosPage() {
  return (
    <main
      className={css({
        mx: "auto",
        maxW: "4xl",
        px: "4",
        py: "12",
      })}
    >
      <Tabs.Root defaultValue="stitcher">
        <Tabs.List
          aria-label="Video tools"
          className={css({
            display: "inline-flex",
            gap: "1",
            bg: "plate.surface",
            border: "2px solid",
            borderColor: "plate.border",
            rounded: "brick",
            p: "1",
            boxShadow: "brick",
          })}
        >
          <Tabs.Trigger value="stitcher" className={tabTrigger}>
            Stitcher
          </Tabs.Trigger>
          <Tabs.Trigger value="youtube" className={tabTrigger}>
            YT Favs
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="stitcher" className={tabContent}>
          <VideoStitcher />
        </Tabs.Content>
        <Tabs.Content value="youtube" className={tabContent}>
          <YouTubeFavorites />
        </Tabs.Content>
      </Tabs.Root>
    </main>
  );
}

const tabTrigger = css({
  fontFamily: "display",
  fontSize: "sm",
  fontWeight: "800",
  letterSpacing: "0.02em",
  color: "ink.secondary",
  bg: "transparent",
  border: "none",
  px: "4",
  py: "2",
  rounded: "brick",
  cursor: "pointer",
  transition: "all 0.15s ease",
  _hover: { color: "ink.primary" },
  '&[data-state="active"]': {
    bg: "lego.red",
    color: "white",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #A30008, 0 3px 6px rgba(0,0,0,0.3)",
  },
  _focusVisible: {
    outline: "2px solid",
    outlineColor: "lego.orange",
    outlineOffset: "2px",
  },
});

const tabContent = css({
  mt: "4",
  _focusVisible: { outline: "none" },
});
