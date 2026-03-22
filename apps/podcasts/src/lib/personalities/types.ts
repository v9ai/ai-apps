export type Paper = {
  title: string;
  arxiv?: string; // arXiv ID e.g. "2603.10031"
  doi?: string;   // DOI e.g. "10.18429/jacow-icalepcs2023-tupdp044"
  date: string;   // YYYY-MM-DD
};

export type TimelineEvent = {
  date: string;
  event: string;
  url: string;
};

export type TimelineSource = "research" | "github" | "paper" | "huggingface" | "web";

export type EnrichedTimelineEvent = {
  date: string;
  event: string;
  url: string;
  source: TimelineSource;
};

export type Contribution = {
  title: string;
  description: string;
  url: string;
};

export type Quote = {
  text: string;
  source: string;
  url: string;
};

export type Video = {
  title: string;
  url: string;
  platform: string;
  date: string;
  duration: string;
  channel: string;
  description: string;
};

export type PersonResearch = {
  slug: string;
  name: string;
  generated_at: string;
  bio: string;
  topics: string[];
  timeline: TimelineEvent[];
  key_contributions: Contribution[];
  quotes: Quote[];
  social: Record<string, string>;
  sources: { title: string; url: string }[];
  videos?: Video[];
  executive_summary?: {
    one_liner: string;
    key_facts: string[];
    career_arc: string;
    current_focus: string;
    industry_significance?: string;
    risk_factors?: string[];
    meeting_prep?: string[];
    confidence_level?: string;
  };
  competitive_landscape?: Record<string, unknown>;
  collaboration_network?: Record<string, unknown>;
  funding?: Record<string, unknown>;
  conferences?: Record<string, unknown>;
  technical_philosophy?: Record<string, unknown>;
  podcast_appearances?: Record<string, unknown>[];
  news?: Record<string, string>[];
};

export type Personality = {
  name: string;
  role: string;
  org: string;
  description: string;
  slug: string;
  podcasts: string[];
  github?: string;
  orcid?: string;
  linkedinImage?: string;
  papers?: Paper[];
  knownFor?: string;
};

export type Category = {
  title: string;
  slug: string;
  personalities: Personality[];
};
