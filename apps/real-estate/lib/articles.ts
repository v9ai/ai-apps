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
  [1, 10, "Foundations"],
  [11, 17, "Valuation"],
  [18, 24, "Forecasting"],
  [25, 31, "Computer Vision"],
  [32, 38, "NLP"],
  [39, 45, "Geospatial"],
  [46, 52, "Investment & Finance"],
  [53, 59, "PropTech & IoT"],
  [60, 66, "Sustainability"],
  [67, 73, "Legal & Compliance"],
  [74, 80, "Generative AI"],
  [81, 92, "Synthesis"],
  [93, 999, "Landscape & Roadmap"],
];

export const CATEGORY_META: Record<string, CategoryMeta> = {
  "Foundations": {
    slug: "foundations",
    icon: "🧱",
    description: "Core ML/AI principles for real estate technology",
    gradient: ["#7c3aed", "#a78bfa"], // violet
  },
  "Valuation": {
    slug: "valuation",
    icon: "💰",
    description: "Automated valuation models & appraisal systems",
    gradient: ["#0891b2", "#22d3ee"], // cyan
  },
  "Forecasting": {
    slug: "forecasting",
    icon: "📈",
    description: "Time-series prediction & market analytics",
    gradient: ["#dc2626", "#f97316"], // red-amber
  },
  "Computer Vision": {
    slug: "computer-vision",
    icon: "👁",
    description: "Visual analysis of properties & urban environments",
    gradient: ["#059669", "#34d399"], // emerald
  },
  "NLP": {
    slug: "nlp",
    icon: "💬",
    description: "Text analysis for listings, contracts & regulations",
    gradient: ["#9333ea", "#ec4899"], // violet-pink
  },
  "Geospatial": {
    slug: "geospatial",
    icon: "🗺",
    description: "Location intelligence & neighborhood analytics",
    gradient: ["#2563eb", "#06b6d4"], // blue-cyan
  },
  "Investment & Finance": {
    slug: "investment-finance",
    icon: "🏦",
    description: "Portfolio optimization, risk & mortgage ML",
    gradient: ["#ca8a04", "#eab308"], // amber
  },
  "PropTech & IoT": {
    slug: "proptech-iot",
    icon: "🏗",
    description: "Smart buildings, digital twins & construction tech",
    gradient: ["#ea580c", "#f97316"], // orange
  },
  "Sustainability": {
    slug: "sustainability",
    icon: "🌱",
    description: "Energy performance, climate risk & green building",
    gradient: ["#16a34a", "#4ade80"], // green
  },
  "Legal & Compliance": {
    slug: "legal-compliance",
    icon: "⚖️",
    description: "AI-driven legal analysis & regulatory compliance",
    gradient: ["#6366f1", "#818cf8"], // indigo
  },
  "Generative AI": {
    slug: "generative-ai",
    icon: "✨",
    description: "Generative models, synthetic data & foundation models",
    gradient: ["#e11d48", "#f43f5e"], // rose
  },
  "Synthesis": {
    slug: "synthesis",
    icon: "🔬",
    description: "Cross-domain integration & meta-analysis",
    gradient: ["#8b5cf6", "#c084fc"], // purple
  },
  "Landscape & Roadmap": {
    slug: "landscape-roadmap",
    icon: "🗺",
    description: "Industry landscape, startups & implementation strategy",
    gradient: ["#0ea5e9", "#38bdf8"], // sky
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
