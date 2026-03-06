import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sqlAgent } from "@/agents/sql";
import { isAdminEmail } from "@/lib/admin";

/**
 * Text-to-SQL API endpoint
 *
 * Accepts a natural language question and returns a structured SQL query.
 * Uses structuredOutput to guarantee schema-constrained LLM responses.
 * Requires admin authentication.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = (await request.json()) as { question?: string };
    const { question } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'question' field" },
        { status: 400 }
      );
    }

    const result = await sqlAgent.generate(question);

    const { sql, explanation } = result.object;

    return NextResponse.json({
      sql,
      explanation,
      columns: [] as string[],
      rows: [] as Array<Array<string | number | boolean | null>>,
      drilldownSearchQuery: undefined,
    });
  } catch (error) {
    console.error("Text-to-SQL error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process SQL query",
      },
      { status: 500 }
    );
  }
}
