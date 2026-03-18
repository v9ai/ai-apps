export interface AppInfo {
  name: string;
  path: string; // absolute path to the app directory
  appDir: string; // absolute path to the Next.js app/ (or src/app/) directory
  hasHowItWorks: boolean;
  framework: "nextjs" | "docusaurus" | "unknown";
}

export interface FileContent {
  relativePath: string;
  content: string;
}

export interface PaperData {
  slug: string;
  number: number;
  title: string;
  category: string;
  wordCount: number;
  readingTimeMin: number;
  authors?: string;
  year?: number;
  venue?: string;
  finding?: string;
  relevance?: string;
  url?: string;
  categoryColor?: string;
}

export interface AgentData {
  name: string;
  description: string;
  researchBasis?: string;
  paperIndices?: number[];
  codeSnippet?: string;
  dataFlow?: string;
}

export interface StatData {
  number: string;
  label: string;
  source?: string;
  paperIndex?: number;
}

export interface TechnicalDetailItem {
  label: string;
  value: string;
  metadata?: Record<string, string>;
}

export interface TechnicalDetail {
  type: "table" | "card-grid" | "code" | "diagram";
  heading: string;
  description?: string;
  items?: TechnicalDetailItem[];
  code?: string;
}

export interface ExtraSection {
  heading: string;
  content: string;
  codeBlock?: string;
}

export interface HowItWorksData {
  title: string;
  subtitle: string;
  story: string;
  papers: PaperData[];
  agents: AgentData[];
  stats: StatData[];
  extraSections: ExtraSection[];
  technicalDetails: TechnicalDetail[];
}

export interface ProcessResult {
  appName: string;
  status: "written" | "updated" | "skipped" | "error";
  files?: string[];
  error?: string;
}
