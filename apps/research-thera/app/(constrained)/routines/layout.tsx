import type { Metadata } from "next";

export const metadata: Metadata = { title: "Routines" };

export default function RoutinesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
