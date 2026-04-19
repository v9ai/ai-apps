import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { stat } from "fs/promises";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 600;

const VALID_ROT = new Set([90, 180, 270]);

function sanitize(name: string): string | null {
  if (name.includes("/") || name.includes("\\") || name.includes("..")) return null;
  if (!/^[A-Za-z0-9._-]+\.(mp4|mov|m4v|webm|mkv)$/i.test(name)) return null;
  return name;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, degrees } = body ?? {};
  const safe = typeof name === "string" ? sanitize(name) : null;
  if (!safe) {
    return NextResponse.json({ error: "Invalid clip name" }, { status: 400 });
  }
  if (typeof degrees !== "number" || !VALID_ROT.has(degrees)) {
    return NextResponse.json({ error: "degrees must be 90, 180, or 270" }, { status: 400 });
  }

  const root = process.cwd();
  const clipsDir = path.join(root, "public", "clips");
  const src = path.join(clipsDir, safe);

  try {
    await stat(src);
  } catch {
    return NextResponse.json({ error: `Missing clip: ${safe}` }, { status: 404 });
  }

  const ext = path.extname(safe);
  const base = safe.slice(0, safe.length - ext.length);
  const outName = `${base}-rot${degrees}${ext}`;
  const outPath = path.join(clipsDir, outName);
  const script = path.join(root, "scripts", "rotate_video.py");

  const { code, stderr } = await new Promise<{ code: number; stderr: string }>((resolve) => {
    const child = spawn(
      "python3",
      [script, "--in", src, "--out", outPath, "--degrees", String(degrees)],
      { cwd: root },
    );
    let err = "";
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("close", (c) => resolve({ code: c ?? 1, stderr: err }));
    child.on("error", (e) => resolve({ code: 1, stderr: e.message }));
  });

  if (code !== 0) {
    return NextResponse.json({ error: "Rotate failed", stderr }, { status: 500 });
  }

  const s = await stat(outPath);
  return NextResponse.json({ name: outName, url: `/clips/${outName}`, size: s.size });
}
