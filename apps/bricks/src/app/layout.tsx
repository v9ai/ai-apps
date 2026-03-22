import type { Metadata } from "next";
import { css } from "styled-system/css";
import { Header } from "./_components/Header";
import { Providers } from "./_components/Providers";
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
        <Providers>
          <Header />
          <div className={css({ position: "relative", zIndex: 1 })}>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
