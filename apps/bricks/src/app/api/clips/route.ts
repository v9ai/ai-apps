import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".webm", ".mkv"]);

export async function GET() {
  const dir = path.join(process.cwd(), "public", "clips");
  try {
    const entries = await readdir(dir);
    const files = await Promise.all(
      entries
        .filter((name) => VIDEO_EXT.has(path.extname(name).toLowerCase()))
        .map(async (name) => {
          const s = await stat(path.join(dir, name));
          return {
            name,
            url: `/clips/${encodeURIComponent(name)}`,
            size: s.size,
            mtime: s.mtimeMs,
          };
        })
    );
    files.sort((a, b) => b.mtime - a.mtime);
    return NextResponse.json({ items: files });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
