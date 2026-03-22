import type { Metadata } from "next";
import { css } from "styled-system/css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bricks — LEGO Video Analyzer",
  description:
    "Extract parts lists and building instructions from LEGO YouTube videos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Top brick strip — like the colored band on instruction booklets */}
        <div
          className={css({
            h: "3px",
            background:
              "linear-gradient(90deg, #E3000B 0%, #E3000B 20%, #FFD500 20%, #FFD500 40%, #006CB7 40%, #006CB7 60%, #00852B 60%, #00852B 80%, #FE8A18 80%, #FE8A18 100%)",
          })}
        />
        <div className={css({ position: "relative", zIndex: 1 })}>
          {children}
        </div>
      </body>
    </html>
  );
}
