import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: stressSession } = await supabase
    .from("stress_test_sessions")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!stressSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Poll audit trail for new entries
      let lastCount = 0;
      const poll = async () => {
        if (closed) return;

        const { data: session } = await supabase
          .from("stress_test_sessions")
          .select("status, overall_score")
          .eq("id", id)
          .single();

        const { data: audit } = await supabase
          .from("audit_trail")
          .select("*")
          .eq("session_id", id)
          .order("created_at", { ascending: true });

        const entries = audit ?? [];
        if (entries.length > lastCount) {
          for (let i = lastCount; i < entries.length; i++) {
            send({
              type: "audit",
              agent: entries[i].agent,
              action: entries[i].action,
              output_summary: entries[i].output_summary,
              round: entries[i].round,
            });
          }
          lastCount = entries.length;
        }

        if (session?.status === "completed" || session?.status === "failed") {
          send({
            type: session.status === "completed" ? "session_complete" : "error",
            status: session.status,
            overall_score: session.overall_score,
          });
          closed = true;
          controller.close();
          return;
        }

        setTimeout(poll, 2000);
      };

      poll();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
