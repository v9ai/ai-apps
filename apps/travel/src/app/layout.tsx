import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Katowice — Top 10 Places to Visit",
  description:
    "AI-curated guide to the best places to visit in Katowice, Poland — with Google Maps integration",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
