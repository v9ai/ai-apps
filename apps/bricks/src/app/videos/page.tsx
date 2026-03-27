"use client";

import { css } from "styled-system/css";
import { SavedVideos } from "../_components/SavedVideos";

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
      <SavedVideos />
    </main>
  );
}
