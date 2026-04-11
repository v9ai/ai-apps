import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Fei-Fei Li",
  role: "Professor & Founder",
  org: "Stanford / World Labs",
  description:
    "Computer vision pioneer who created ImageNet. Co-founded World Labs for spatial AI. Researches multimodal reasoning, spatial intelligence, and world generation benchmarks.",
  slug: "fei-fei-li",
  podcasts: ["TED", "Research Podcasts"],
  github: "feifeili",
  papers: [
    {
      title: "WorldScore: A Unified Evaluation Benchmark for World Generation",
      arxiv: "2504.00983",
      date: "2025-04-01",
    },
    {
      title: "Thinking in Space: How Multimodal Large Language Models See, Remember, and Recall Spaces",
      arxiv: "2412.14171",
      date: "2024-12-18",
    },
    {
      title: "Agent AI: Surveying the Horizons of Multimodal Interaction",
      arxiv: "2401.03568",
      date: "2024-01-07",
    },
  ],
  knownFor: "ImageNet",
};

export default personality;
