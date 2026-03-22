"use client";

import { css } from "styled-system/css";
import { Favorites } from "../_components/Favorites";

export default function FavoritesPage() {
  return (
    <main
      className={css({
        mx: "auto",
        maxW: "4xl",
        px: "4",
        py: "12",
      })}
    >
      <Favorites />
    </main>
  );
}
