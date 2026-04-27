import { NextResponse } from "next/server";
import { runBackup, verifyCronSecret } from "@ai-apps/db-backup";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const databaseUrl = process.env.NEON_DATABASE_URL;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const missing = [
    !databaseUrl && "NEON_DATABASE_URL",
    !accountId && "R2_ACCOUNT_ID",
    !accessKeyId && "R2_ACCESS_KEY_ID",
    !secretAccessKey && "R2_SECRET_ACCESS_KEY",
  ].filter(Boolean);
  if (missing.length > 0 || !databaseUrl || !accountId || !accessKeyId || !secretAccessKey) {
    return NextResponse.json(
      { error: `missing env: ${missing.join(", ")}` },
      { status: 500 },
    );
  }

  const result = await runBackup({
    appName: "lead-gen",
    databaseUrl,
    r2: {
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName: "db-backups",
    },
    maxDurationMs: 280_000,
    retentionDays: 30,
  });

  return NextResponse.json(result, {
    status: result.status === "complete" ? 200 : 207,
  });
}
