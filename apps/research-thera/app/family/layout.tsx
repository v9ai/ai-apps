import type { Metadata } from "next";

export const metadata: Metadata = { title: "Family" };

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
