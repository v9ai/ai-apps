"use client";

import { usePageAnalytics } from "@/lib/analytics/use-page-analytics";

export function PageAnalytics({ paperSlug }: { paperSlug: string }) {
  usePageAnalytics(paperSlug);
  return null;
}
