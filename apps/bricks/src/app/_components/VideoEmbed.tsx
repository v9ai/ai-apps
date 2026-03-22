"use client";

import { css } from "styled-system/css";

export function VideoEmbed({ videoId }: { videoId: string }) {
  return (
    <div
      className={css({
        rounded: "brick",
        overflow: "hidden",
        border: "2px solid",
        borderColor: "plate.border",
        boxShadow: "brick",
      })}
    >
      <div className={css({ aspectRatio: "16 / 9", w: "full" })}>
        <iframe
          className={css({ h: "full", w: "full", display: "block" })}
          src={`https://www.youtube.com/embed/${videoId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="LEGO build video"
        />
      </div>
    </div>
  );
}
