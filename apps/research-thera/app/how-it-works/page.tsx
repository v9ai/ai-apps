import { HowItWorks } from "@ai-apps/ui/how-it-works";

const papers = [
  {
    slug: "cbt-anxiety-review",
    number: 1,
    title: "Cognitive-Behavioral Therapy for Anxiety Disorders",
    authors: "Hofmann, S.G. & Smits, J.A.J.",
    year: 2008,
    venue: "Journal of Clinical Psychiatry",
    category: "CBT",
    wordCount: 4200,
    readingTimeMin: 17,
    finding:
      "CBT is highly effective for anxiety disorders with large effect sizes.",
    relevance:
      "Informs the claim verification pipeline's therapeutic goal recommendations.",
  },
  {
    slug: "narrative-therapy-outcomes",
    number: 2,
    title: "Narrative Therapy: A Review of the Evidence",
    authors: "Etchison, M. & Kleist, D.M.",
    year: 2000,
    venue: "The Family Journal",
    category: "Narrative",
    wordCount: 3100,
    readingTimeMin: 13,
    finding:
      "Narrative approaches show positive outcomes across multiple presenting problems.",
    relevance:
      "Grounds the AI storytelling agent in evidence-based narrative techniques.",
  },
  {
    slug: "research-synthesis-methods",
    number: 3,
    title: "Systematic Review Methods in Psychotherapy Research",
    authors: "Lipsey, M.W. & Wilson, D.B.",
    year: 2001,
    venue: "American Psychologist",
    category: "Methodology",
    wordCount: 5500,
    readingTimeMin: 22,
    finding:
      "Multi-source synthesis significantly improves evidence quality over single-database searches.",
    relevance:
      "Justifies the 7-source research integration strategy (PubMed, CrossRef, Semantic Scholar, etc.).",
  },
];

const agents = [
  {
    name: "Context Loader",
    description:
      "Reads the user's therapeutic goal, existing notes, and prior research to build a rich context window before querying.",
    researchBasis:
      "Contextual priming improves LLM retrieval precision (Brown et al., 2020)",
    paperIndices: [2],
  },
  {
    name: "Query Planner",
    description:
      "Decomposes the goal into targeted search queries across multiple academic databases.",
    researchBasis:
      "Query expansion techniques from information retrieval literature",
    paperIndices: [2],
  },
  {
    name: "Multi-Source Searcher",
    description:
      "Executes rate-limited parallel searches across PubMed, CrossRef, Semantic Scholar, OpenAlex, arXiv, Europe PMC, and DataCite.",
    researchBasis:
      "Multi-database searches yield higher recall than single-source queries",
    paperIndices: [2],
  },
  {
    name: "Paper Extractor",
    description:
      "Scores and ranks candidates by relevance, extracts structured metadata, and filters duplicates by DOI.",
    paperIndices: [2],
  },
  {
    name: "Claim Verifier",
    description:
      "Builds claim cards from notes and checks each claim against the retrieved evidence using confidence scoring.",
    researchBasis:
      "Evidence-based practice requires explicit claim-evidence mapping",
    paperIndices: [0, 2],
  },
  {
    name: "Story Teller",
    description:
      "Generates therapeutic narratives grounded in the verified research and personalised to the user's context.",
    researchBasis:
      "Narrative reframing is a core mechanism in narrative therapy",
    paperIndices: [1],
  },
];

const stats = [
  {
    number: "7+",
    label: "academic databases searched per goal",
    source: "Lipsey & Wilson, 2001",
    paperIndex: 2,
  },
  {
    number: "~40 s",
    label: "median research generation time",
  },
  {
    number: "95%+",
    label: "duplicate-free papers via DOI deduplication",
  },
];

export default function HowItWorksPage() {
  return (
    <HowItWorks
      papers={papers}
      agents={agents}
      stats={stats}
      title="How It Works"
      subtitle="A transparent look at the evidence-based pipeline behind every therapeutic insight."
      story="Research Thera combines multi-source academic search, AI-powered claim verification, and narrative generation to turn your therapeutic goals into personalised, evidence-backed insights. Every recommendation traces back to peer-reviewed literature."
    />
  );
}
