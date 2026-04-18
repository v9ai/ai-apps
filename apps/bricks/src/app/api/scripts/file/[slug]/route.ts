import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { slugify } from "@/lib/parser";

const ALLOWED_HUBS = new Set([
  "EssentialHub",
  "PrimeHub",
  "InventorHub",
  "TechnicHub",
  "CityHub",
  "MoveHub",
]);

const SCRIPTS_DIR = path.join(process.cwd(), "scripts");
const HUB_IMPORT_RE =
  /^(\s*)(#\s*)?from pybricks\.hubs import (\w+) as Hub\s*$/;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  const hub = body?.hub;
  if (typeof hub !== "string" || !ALLOWED_HUBS.has(hub)) {
    return NextResponse.json({ error: "Invalid hub" }, { status: 400 });
  }

  const files = fs.readdirSync(SCRIPTS_DIR).filter((f) => f.endsWith(".py"));
  const match = files.find((f) => slugify(f) === slug.toLowerCase());
  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(SCRIPTS_DIR, match);
  const original = fs.readFileSync(filePath, "utf-8");

  let found = false;
  const updated = original
    .split("\n")
    .map((line) => {
      const m = line.match(HUB_IMPORT_RE);
      if (!m) return line;
      found = true;
      const importedHub = m[3];
      return importedHub === hub
        ? `${m[1]}from pybricks.hubs import ${importedHub} as Hub`
        : `${m[1]}# from pybricks.hubs import ${importedHub} as Hub`;
    })
    .join("\n");

  if (!found) {
    return NextResponse.json(
      { error: "No swappable hub import found in file" },
      { status: 409 },
    );
  }

  fs.writeFileSync(filePath, updated, "utf-8");
  return NextResponse.json({ ok: true, hub });
}
