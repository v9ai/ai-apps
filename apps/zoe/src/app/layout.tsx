import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vadim Nicolai — Senior Full Stack Engineer · ZOE",
  description:
    "Application for Senior Full Stack Engineer at ZOE. 12+ years building scalable web applications, microservices, and AI-powered products.",
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
