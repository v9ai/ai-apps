import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Amanda Askell",
  role: "Character Lead",
  org: "Anthropic",
  description:
    "Philosopher turned AI researcher shaping Claude's character and values. Publishes on sycophancy in LLMs, constitutional AI, and discovering values in real-world model interactions.",
  slug: "amanda-askell",
  podcasts: ["Latent Space", "AI Research Podcasts"],
  github: "aaskell",
  papers: [
    {
      title: "Values in the Wild: Discovering and Analyzing Values in Real-World Language Model Interactions",
      arxiv: "2504.15236",
      date: "2025-04-21",
    },
    {
      title: "Towards Understanding Sycophancy in Language Models",
      arxiv: "2310.13548",
      date: "2023-10-20",
    },
    {
      title: "Constitutional AI: Harmlessness from AI Feedback",
      arxiv: "2212.08073",
      date: "2022-12-15",
    },
  ],
  knownFor: "Claude Character",
};

export default personality;
