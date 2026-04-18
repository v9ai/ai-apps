import fs from "fs";
import path from "path";
import { parseScript, ParsedScript, slugify } from "./parser";

const LEGO_DIR = path.join(process.cwd(), "scripts");

interface LessonData {
  body: string;
  title: string | null;
  heroImage: string | null;
  source: string | null;
}

function parseLessonFile(raw: string): LessonData {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    return { body: raw.trim(), title: null, heroImage: null, source: null };
  }

  const [, frontmatter, body] = fmMatch;
  const meta: Record<string, string> = {};
  for (const line of frontmatter.split("\n")) {
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_]*):\s*(.+)$/);
    if (m) meta[m[1]] = m[2].trim();
  }

  return {
    body: body.trim(),
    title: meta.title ?? null,
    heroImage: meta.heroImage ?? null,
    source: meta.source ?? null,
  };
}

function attachLesson(script: ParsedScript): ParsedScript {
  const base = script.filename.replace(/\.py$/, "");
  const mdPath = path.join(LEGO_DIR, `${base}.md`);
  const roPath = path.join(LEGO_DIR, `${base}.ro.md`);

  let result = script;

  if (fs.existsSync(mdPath)) {
    const { body, title, heroImage, source } = parseLessonFile(
      fs.readFileSync(mdPath, "utf-8"),
    );
    result = {
      ...result,
      lesson: body,
      lessonTitle: title,
      heroImage,
      lessonSourceUrl: source,
    };
  }

  if (fs.existsSync(roPath)) {
    const { body, title } = parseLessonFile(fs.readFileSync(roPath, "utf-8"));
    result = { ...result, lessonRo: body, lessonTitleRo: title };
  }

  return result;
}

export function getAllScripts(): ParsedScript[] {
  const files = fs
    .readdirSync(LEGO_DIR)
    .filter((f) => f.endsWith(".py"))
    .sort();

  return files.map((filename) => {
    const code = fs.readFileSync(path.join(LEGO_DIR, filename), "utf-8");
    return attachLesson(parseScript(filename, code));
  });
}

export function getScriptBySlug(slug: string): ParsedScript | null {
  const normalized = slug.toLowerCase();
  const files = fs.readdirSync(LEGO_DIR).filter((f) => f.endsWith(".py"));
  const match = files.find((f) => slugify(f) === normalized);
  if (!match) return null;

  const code = fs.readFileSync(path.join(LEGO_DIR, match), "utf-8");
  return attachLesson(parseScript(match, code));
}
