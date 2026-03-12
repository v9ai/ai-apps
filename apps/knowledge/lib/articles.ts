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
  [1, 6, "Foundations & Architecture"],
  [7, 12, "Prompting & In-Context Learning"],
  [13, 18, "RAG & Retrieval"],
  [19, 24, "Fine-tuning & Training"],
  [25, 30, "Agents & Tool Use"],
  [31, 36, "Evals & Testing"],
  [37, 42, "Infrastructure & Deployment"],
  [43, 48, "Safety & Alignment"],
  [49, 55, "Multimodal & Applied"],
];

export const CATEGORY_META: Record<string, CategoryMeta> = {
  "Foundations & Architecture": {
    slug: "foundations-architecture",
    icon: "🧱",
    description: "Start here — learn how transformers & LLMs actually work under the hood",
    gradient: ["#7c3aed", "#a78bfa"],
  },
  "Prompting & In-Context Learning": {
    slug: "prompting-icl",
    icon: "💡",
    description: "Master the art of talking to LLMs — from basic prompts to advanced techniques",
    gradient: ["#2563eb", "#60a5fa"],
  },
  "RAG & Retrieval": {
    slug: "rag-retrieval",
    icon: "🔍",
    description: "Learn to connect LLMs to your own data with retrieval-augmented generation",
    gradient: ["#0891b2", "#22d3ee"],
  },
  "Fine-tuning & Training": {
    slug: "fine-tuning",
    icon: "🔧",
    description: "Customize models for your use case with LoRA, RLHF & hands-on training",
    gradient: ["#059669", "#34d399"],
  },
  "Agents & Tool Use": {
    slug: "agents-tools",
    icon: "🤖",
    description: "Build AI agents that can reason, use tools, and take actions autonomously",
    gradient: ["#d97706", "#fbbf24"],
  },
  "Evals & Testing": {
    slug: "evals-testing",
    icon: "📊",
    description: "Learn to measure what matters — testing and evaluating AI systems properly",
    gradient: ["#e11d48", "#fb7185"],
  },
  "Infrastructure & Deployment": {
    slug: "infra-deployment",
    icon: "⚡",
    description: "Ship AI to production — serving, scaling, and keeping costs under control",
    gradient: ["#6366f1", "#818cf8"],
  },
  "Safety & Alignment": {
    slug: "safety-alignment",
    icon: "🛡",
    description: "Build AI you can trust — guardrails, bias mitigation, and responsible practices",
    gradient: ["#ea580c", "#fb923c"],
  },
  "Multimodal & Applied": {
    slug: "multimodal-applied",
    icon: "🚀",
    description: "Go beyond text — vision, audio, code AI, and your roadmap to becoming an AI engineer",
    gradient: ["#64748b", "#94a3b8"],
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
