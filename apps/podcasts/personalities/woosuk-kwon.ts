import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Woosuk Kwon",
  role: "Co-founder & CTO",
  org: "Inferact",
  description:
    "Co-created vLLM, the most adopted open-source LLM inference engine (2,000+ contributors). Invented PagedAttention for efficient KV-cache management, reducing GPU memory waste from 60-80% to under 4%. Ph.D. from UC Berkeley under Ion Stoica. Inferact launched Jan 2026 with $150M seed at $800M valuation (a16z, Lightspeed, Sequoia).",
  slug: "woosuk-kwon",
  podcasts: ["PyTorch Conference 2024", "LLM Systems Spring 2025 Guest Lecture"],
  github: "WoosukKwon",
  papers: [
    {
      title: "Efficient Memory Management for Large Language Model Serving with PagedAttention",
      arxiv: "2309.06180",
      date: "2023-09-12",
    },
    {
      title: "SkyPilot: An Intercloud Broker for Sky Computing",
      arxiv: "",
      date: "2023-04",
    },
    {
      title: "Jenga: Effective Memory Management for Serving LLM with Heterogeneity",
      arxiv: "",
      date: "2025",
    },
  ],
  knownFor: "vLLM",
};

export default personality;
