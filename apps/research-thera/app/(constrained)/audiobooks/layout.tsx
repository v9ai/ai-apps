import type { Metadata } from "next";

export const metadata: Metadata = { title: "Audiobooks (Voxa)" };

export default function AudiobooksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
