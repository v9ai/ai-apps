import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "PropertyAI -- AI-Powered Real Estate Valuation & Investment Intelligence",
  description:
    "Instant AI property valuation, live market comparables, and investment scoring for Eastern European real estate. Analyze any listing from 999.md or imobiliare.ro in seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${inter.className}`}>
        <Theme appearance="dark" accentColor="iris" radius="small">
          {children}
        </Theme>
      </body>
    </html>
  );
}
