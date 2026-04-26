import type { Metadata } from "next";
import { css } from "styled-system/css";
import { Sidebar } from "./_components/Sidebar";
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
          <div className={css({ display: "flex", minH: "100vh" })}>
            <Sidebar />
            <main
              className={css({
                flex: 1,
                minW: 0,
                position: "relative",
                zIndex: 1,
              })}
            >
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
