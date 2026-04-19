import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { stat } from "fs/promises";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function sanitize(name: string): string | null {
  if (name.includes("/") || name.includes("\\") || name.includes("..")) return null;
  if (!/^[A-Za-z0-9._-]+\.(mp4|mov|m4v|webm|mkv)$/i.test(name)) return null;
  return name;
}

const VALID_ROT = new Set([0, 90, 180, 270]);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { a, b, rotateA, rotateB } = body ?? {};
  const safeA = typeof a === "string" ? sanitize(a) : null;
  const safeB = typeof b === "string" ? sanitize(b) : null;
  if (!safeA || !safeB) {
    return NextResponse.json({ error: "Invalid clip names" }, { status: 400 });
  }
  const rotA = typeof rotateA === "number" && VALID_ROT.has(rotateA) ? rotateA : 0;
  const rotB = typeof rotateB === "number" && VALID_ROT.has(rotateB) ? rotateB : 0;

  const root = process.cwd();
  const clipsDir = path.join(root, "public", "clips");
  const pathA = path.join(clipsDir, safeA);
  const pathB = path.join(clipsDir, safeB);

  for (const p of [pathA, pathB]) {
    try {
      await stat(p);
    } catch {
      return NextResponse.json({ error: `Missing clip: ${path.basename(p)}` }, { status: 404 });
    }
  }

  const outName = `stitched-${Date.now()}.mp4`;
  const outPath = path.join(clipsDir, outName);
  const script = path.join(root, "scripts", "stitch_videos.py");

  const { code, stderr } = await new Promise<{ code: number; stderr: string }>((resolve) => {
    const child = spawn(
      "python3",
      [
        script,
        "--a", pathA,
        "--b", pathB,
        "--out", outPath,
        "--rotate-a", String(rotA),
        "--rotate-b", String(rotB),
      ],
      { cwd: root },
    );
    let err = "";
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("close", (c) => resolve({ code: c ?? 1, stderr: err }));
    child.on("error", (e) => resolve({ code: 1, stderr: e.message }));
  });

  if (code !== 0) {
    return NextResponse.json(
      { error: "Stitch failed", stderr },
      { status: 500 },
    );
  }

  const s = await stat(outPath);
  return NextResponse.json({
    name: outName,
    url: `/clips/${outName}`,
    size: s.size,
  });
}
