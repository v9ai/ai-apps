import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tag" };

export default function TagLayout({ children }: { children: React.ReactNode }) {
  return children;
}
