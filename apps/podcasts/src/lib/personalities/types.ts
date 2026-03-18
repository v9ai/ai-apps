export type Paper = {
  title: string;
  arxiv: string; // arXiv ID e.g. "2603.10031"
  date: string;  // YYYY-MM-DD
};

export type TimelineEvent = {
  date: string;
  event: string;
  url: string;
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
};

export type Personality = {
  name: string;
  role: string;
  org: string;
  description: string;
  slug: string;
  podcasts: string[];
  github?: string;
  papers?: Paper[];
};

export type Category = {
  title: string;
  slug: string;
  personalities: Personality[];
};
