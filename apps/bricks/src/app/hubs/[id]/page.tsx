import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { resolveHub } from "@/lib/hub-resolve";
import { HUB_TYPE_SLUG, HubType } from "@/lib/parser";
import HubPageClient from "./hub-page-client";

export default async function HubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    const resolved = await resolveHub(id, session.user.id);
    if (resolved) {
      const typeSlug = HUB_TYPE_SLUG[resolved.hubType as HubType];
      if (typeSlug && typeSlug !== id) {
        const slugResolved = await resolveHub(typeSlug, session.user.id);
        if (slugResolved?.id === resolved.id) {
          redirect(`/hubs/${typeSlug}`);
        }
      }
    }
  }
  return <HubPageClient />;
}
