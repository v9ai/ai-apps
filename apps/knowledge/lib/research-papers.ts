import fs from "fs";
import path from "path";

export interface ResearchPaper {
  title: string;
  authors: string[];
  year: number | null;
  citation_count: number | null;
  abstract: string | null;
  url: string | null;
  pdf_url: string | null;
  doi: string | null;
  source: string;
  source_id: string;
}

export interface ResearchTopic {
  id: string;
  name: string;
  description: string;
  papers: ResearchPaper[];
}

export interface ResearchData {
  generated_at: string;
  blog_post_url: string;
  total_papers: number;
  topics: ResearchTopic[];
}

const DATA_PATH = path.join(process.cwd(), "data", "harness-design-papers.json");

export function getResearchPapers(): ResearchData {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    return JSON.parse(raw) as ResearchData;
  } catch {
    return {
      generated_at: new Date().toISOString(),
      blog_post_url: "https://www.anthropic.com/engineering/harness-design",
      total_papers: 0,
      topics: [],
    };
  }
}
