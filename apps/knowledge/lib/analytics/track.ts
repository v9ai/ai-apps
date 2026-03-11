import { createClient } from "@/lib/supabase/client";
import { getSessionId } from "./session";

export async function trackEvent(
  eventName: string,
  paperSlug: string,
  properties?: Record<string, unknown>,
) {
  try {
    const supabase = createClient();

    // Resolve paper_id from slug
    const { data: paper } = await supabase
      .from("papers")
      .select("id")
      .eq("slug", paperSlug)
      .single();

    const props = (properties ?? {}) as import("@/lib/supabase/database.types").Json;

    await supabase.from("analytics_events").insert({
      event_category: "reading",
      event_name: eventName,
      paper_id: paper?.id ?? null,
      session_id: getSessionId(),
      user_id: null,
      properties: props,
      duration_ms: (properties?.duration_ms as number) ?? null,
    });
  } catch {
    // Silent fail — analytics should never break the app
  }
}
