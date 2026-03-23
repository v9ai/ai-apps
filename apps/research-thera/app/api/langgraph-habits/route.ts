import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth/server";
import { runGraphAndWait } from "@/src/lib/langgraph-client";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email;
  if (!userEmail) {
    return NextResponse.json({ error: "User email not found" }, { status: 401 });
  }

  const { familyMemberId, count = 5 } = await request.json();
  if (!familyMemberId) {
    return NextResponse.json({ error: "familyMemberId required" }, { status: 400 });
  }

  try {
    const result = await runGraphAndWait("habits", {
      input: {
        family_member_id: familyMemberId,
        user_email: userEmail,
        count,
      },
    });

    if (result.error) {
      return NextResponse.json({ error: result.error as string }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      habits: result.habits ?? [],
      count: (result.habits as any[])?.length ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Habit generation failed";
    console.error("[langgraph-habits]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
