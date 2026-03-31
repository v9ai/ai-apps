import { NextResponse } from "next/server";

export async function GET() {
  const path = await import("path");
  const fs = await import("fs");

  const cwd = process.cwd();
  const dirname = __dirname;

  const candidates = [
    path.join(cwd, "data", "knowledge.db"),
    path.join(cwd, "apps", "knowledge", "data", "knowledge.db"),
    path.join(dirname, "data", "knowledge.db"),
    path.join(dirname, "..", "data", "knowledge.db"),
    path.join(dirname, "..", "..", "data", "knowledge.db"),
    path.join(dirname, "..", "..", "..", "data", "knowledge.db"),
  ];

  const results = candidates.map((p) => ({
    path: p,
    exists: fs.existsSync(p),
  }));

  let cwdList: string[] = [];
  try { cwdList = fs.readdirSync(cwd); } catch (e: any) { cwdList = [e.message]; }

  return NextResponse.json({ cwd, dirname, results, cwdList }, { status: 200 });
}
