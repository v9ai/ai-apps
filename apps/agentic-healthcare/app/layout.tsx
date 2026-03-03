import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Theme } from "@radix-ui/themes";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3002";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Agentic Healthcare",
  description: "Upload and analyze your blood tests",
};

const geist = Geist({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <Theme appearance="dark" accentColor="indigo" radius="medium">
          {children}
        </Theme>
      </body>
    </html>
  );
}
