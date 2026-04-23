import type { Metadata } from "next";

export const metadata: Metadata = { title: "Issues" };

export default function IssuesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
