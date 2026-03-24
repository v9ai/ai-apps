import { NextRequest, NextResponse } from "next/server";
import { spawnEmailOutreach } from "@/lib/langgraph/spawn-email-outreach";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { recipientName, recipientRole, postText, postUrl, recipientEmail, tone } = body;

  if (!recipientEmail || !postText) {
    return NextResponse.json(
      { error: "recipientEmail and postText are required" },
      { status: 400 },
    );
  }

  try {
    const result = await spawnEmailOutreach({
      recipientName: recipientName || "",
      recipientRole: recipientRole || "",
      postText,
      postUrl: postUrl || "",
      recipientEmail,
      tone: tone || "professional and friendly",
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email-outreach] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
