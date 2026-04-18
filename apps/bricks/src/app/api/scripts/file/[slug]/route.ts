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

const ALLOWED_MOTORS = new Set([
  "spike-small",
  "spike-medium",
  "spike-large",
  "mindstorms-large",
  "technic-l",
  "technic-xl",
]);

const SCRIPTS_DIR = path.join(process.cwd(), "scripts");
const HUB_IMPORT_RE =
  /^(\s*)(#\s*)?from pybricks\.hubs import (\w+) as Hub\s*$/;
const MOTOR_TAG_RE = /^\s*#\s*bricks:motor\s*=\s*([a-z-]+)\s*$/;
const MOTOR_LINE_RE = /=\s*Motor\(Port\.[A-Z]/;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  const hub = body?.hub;
  const motor = body?.motor;

  const hubProvided = hub !== undefined;
  const motorProvided = motor !== undefined;

  if (!hubProvided && !motorProvided) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  if (hubProvided && (typeof hub !== "string" || !ALLOWED_HUBS.has(hub))) {
    return NextResponse.json({ error: "Invalid hub" }, { status: 400 });
  }
  if (
    motorProvided &&
    (typeof motor !== "string" || !ALLOWED_MOTORS.has(motor))
  ) {
    return NextResponse.json({ error: "Invalid motor" }, { status: 400 });
  }

  const files = fs.readdirSync(SCRIPTS_DIR).filter((f) => f.endsWith(".py"));
  const match = files.find((f) => slugify(f) === slug.toLowerCase());
  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(SCRIPTS_DIR, match);
  const original = fs.readFileSync(filePath, "utf-8");
  let lines = original.split("\n");

  if (hubProvided) {
    let hubFound = false;
    lines = lines.map((line) => {
      const m = line.match(HUB_IMPORT_RE);
      if (!m) return line;
      hubFound = true;
      const importedHub = m[3];
      return importedHub === hub
        ? `${m[1]}from pybricks.hubs import ${importedHub} as Hub`
        : `${m[1]}# from pybricks.hubs import ${importedHub} as Hub`;
    });
    if (!hubFound) {
      return NextResponse.json(
        { error: "No swappable hub import found in file" },
        { status: 409 },
      );
    }
  }

  if (motorProvided) {
    const tagLine = `# bricks:motor=${motor}`;
    const existingIdx = lines.findIndex((l) => MOTOR_TAG_RE.test(l));
    if (existingIdx >= 0) {
      lines[existingIdx] = tagLine;
    } else {
      const motorIdx = lines.findIndex((l) => MOTOR_LINE_RE.test(l));
      if (motorIdx < 0) {
        return NextResponse.json(
          { error: "No Motor(Port.X) line found in file" },
          { status: 409 },
        );
      }
      lines.splice(motorIdx, 0, tagLine);
    }
  }

  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
  return NextResponse.json({
    ok: true,
    ...(hubProvided ? { hub } : {}),
    ...(motorProvided ? { motor } : {}),
  });
}
