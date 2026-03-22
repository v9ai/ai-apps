import fs from "fs";
import path from "path";
import { parseScript, ParsedScript } from "./parser";

const LEGO_DIR = path.join(process.cwd(), "scripts");

export function getAllScripts(): ParsedScript[] {
  const files = fs
    .readdirSync(LEGO_DIR)
    .filter((f) => f.endsWith(".py"))
    .sort();

  return files.map((filename) => {
    const code = fs.readFileSync(path.join(LEGO_DIR, filename), "utf-8");
    return parseScript(filename, code);
  });
}
