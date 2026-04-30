import { notFound } from "next/navigation";
import { HUB_SLUG_TO_TYPE } from "@/lib/parser";
import HubPageClient from "./hub-page-client";

export default async function HubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!HUB_SLUG_TO_TYPE[slug.toLowerCase()]) notFound();
  return <HubPageClient />;
}
