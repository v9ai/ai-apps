import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Woosuk Kwon",
  role: "Creator of vLLM; CTO",
  org: "Inferact / UC Berkeley",
  description:
    "Co-created vLLM, the most adopted open-source LLM inference engine. Invented PagedAttention for efficient KV-cache management. Inferact launched at $800M valuation.",
  slug: "woosuk-kwon",
  podcasts: ["The a16z Show", "PyTorch Conference"],
  github: "WoosukKwon",
  papers: [
    {
      title: "Efficient Memory Management for Large Language Model Serving with PagedAttention",
      arxiv: "2309.06180",
      date: "2023-09-12",
    },
  ],
};

export default personality;
