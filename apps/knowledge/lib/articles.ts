import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content");

export interface Paper {
  slug: string;
  number: number;
  title: string;
  category: string;
  wordCount: number;
  readingTimeMin: number;
}

export interface PaperWithContent extends Paper {
  content: string;
}

export interface CategoryMeta {
  slug: string;
  icon: string;
  description: string;
  gradient: [string, string]; // [from, to] CSS colors
}

export interface GroupedPapers {
  category: string;
  meta: CategoryMeta;
  articles: Paper[];
}

export const CATEGORIES: [number, number, string][] = [
  [1, 8, "Foundations"],
  [9, 13, "Cognitive Science & AI"],
  [14, 19, "Adaptive & Personalized"],
  [20, 25, "Tutoring & LLMs"],
  [26, 31, "Analytics & Assessment"],
  [32, 36, "Self-Regulated Learning"],
  [37, 41, "Human-AI & Literacy"],
  [42, 46, "Emerging Frontiers"],
  [47, 55, "Synthesis & Roadmap"],
];

export const CATEGORY_META: Record<string, CategoryMeta> = {
  "Foundations": {
    slug: "foundations",
    icon: "🧱",
    description: "Core principles of cognitive science, adaptive learning, ITS & analytics",
    gradient: ["#7c3aed", "#a78bfa"], // violet
  },
  "Cognitive Science & AI": {
    slug: "cognitive-science-ai",
    icon: "🧠",
    description: "Spaced repetition, knowledge tracing, cognitive load & affect-aware AI",
    gradient: ["#2563eb", "#60a5fa"], // blue
  },
  "Adaptive & Personalized": {
    slug: "adaptive-personalized",
    icon: "🎯",
    description: "Bayesian models, RL for education, personalized paths & recommendations",
    gradient: ["#0891b2", "#22d3ee"], // cyan
  },
  "Tutoring & LLMs": {
    slug: "tutoring-llms",
    icon: "💬",
    description: "LLM dialogue tutors, automated feedback, math/science/language/coding AI",
    gradient: ["#059669", "#34d399"], // emerald
  },
  "Analytics & Assessment": {
    slug: "analytics-assessment",
    icon: "📊",
    description: "Predictive analytics, essay scoring, item generation & process mining",
    gradient: ["#d97706", "#fbbf24"], // amber
  },
  "Self-Regulated Learning": {
    slug: "self-regulated-learning",
    icon: "🪞",
    description: "Metacognitive scaffolding, AI note-taking, study planning & motivation",
    gradient: ["#e11d48", "#fb7185"], // rose
  },
  "Human-AI & Literacy": {
    slug: "human-ai-literacy",
    icon: "🤝",
    description: "AI literacy, prompt engineering education, ethics & teacher partnerships",
    gradient: ["#6366f1", "#818cf8"], // indigo
  },
  "Emerging Frontiers": {
    slug: "emerging-frontiers",
    icon: "🚀",
    description: "Multi-agent learning, knowledge graphs, OER, lifelong learning & neuroAI",
    gradient: ["#ea580c", "#fb923c"], // orange
  },
  "Synthesis & Roadmap": {
    slug: "synthesis-roadmap",
    icon: "🗺",
    description: "Cross-domain synthesis, top papers, datasets, gaps & implementation roadmap",
    gradient: ["#64748b", "#94a3b8"], // slate
  },
};

export function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? {
    slug: "other",
    icon: "📄",
    description: "",
    gradient: ["#6366f1", "#818cf8"],
  };
}

function getCategory(num: number): string {
  for (const [lo, hi, name] of CATEGORIES) {
    if (num >= lo && num <= hi) return name;
  }
  return "Other";
}

function extractTitle(content: string): string {
  for (const line of content.split("\n")) {
    const match = line.match(/^#\s+(.+)/);
    if (match) return match[1].trim();
  }
  return "Untitled";
}

export function getAllPapers(): Paper[] {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.startsWith("agent-") && f.endsWith(".md"));

  return files
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const numMatch = slug.match(/^agent-(\d+)/);
      const number = numMatch ? parseInt(numMatch[1], 10) : 0;
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
      const title = extractTitle(raw);
      const category = getCategory(number);
      const wordCount = raw.split(/\s+/).filter(Boolean).length;
      const readingTimeMin = Math.max(1, Math.round(wordCount / 200));
      return { slug, number, title, category, wordCount, readingTimeMin };
    })
    .sort((a, b) => a.number - b.number);
}

export function getPaperBySlug(slug: string): PaperWithContent | null {
  const file = path.join(CONTENT_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8");
  const numMatch = slug.match(/^agent-(\d+)/);
  const number = numMatch ? parseInt(numMatch[1], 10) : 0;
  const title = extractTitle(raw);
  const category = getCategory(number);
  const wordCount = raw.split(/\s+/).filter(Boolean).length;
  const readingTimeMin = Math.max(1, Math.round(wordCount / 200));
  return { slug, number, title, category, wordCount, readingTimeMin, content: raw };
}

export function getTotalWordCount(): number {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.startsWith("agent-") && f.endsWith(".md"));
  let total = 0;
  for (const file of files) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
    total += raw.split(/\s+/).filter(Boolean).length;
  }
  return total;
}

export function getGroupedPapers(): GroupedPapers[] {
  const articles = getAllPapers();
  const groups = new Map<string, Paper[]>();

  for (const a of articles) {
    const list = groups.get(a.category) || [];
    list.push(a);
    groups.set(a.category, list);
  }

  // Return in category order (based on CATEGORIES array)
  const ordered: GroupedPapers[] = [];
  for (const [, , name] of CATEGORIES) {
    const list = groups.get(name);
    if (list && list.length > 0) {
      ordered.push({ category: name, meta: getCategoryMeta(name), articles: list });
    }
  }
  return ordered;
}
