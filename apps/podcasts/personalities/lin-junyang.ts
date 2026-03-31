import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Lin Junyang",
  role: "Former Tech Lead, Qwen",
  org: "Ex-Alibaba",
  description:
    "Built Qwen into one of the world's most downloaded open-source LLM families — 1B+ downloads, 200K+ derivative models on HuggingFace. Alibaba's youngest-ever P10 engineer. Resigned March 2026 to pursue independent research. Coined the shift from 'reasoning thinking' to 'agent thinking' as the next AI paradigm.",
  slug: "lin-junyang",
  podcasts: ["ThursdAI", "Emergent Behavior"],
  github: "JustinLin610",
  papers: [
    {
      title: "Qwen3 Technical Report",
      arxiv: "2505.09388",
      date: "2025-05-14",
    },
    {
      title: "Qwen2.5 Technical Report",
      arxiv: "2412.15115",
      date: "2024-12-19",
    },
    {
      title: "Qwen2 Technical Report",
      arxiv: "2407.10671",
      date: "2024-07-15",
    },
    {
      title: "Gated Attention for Large Language Models",
      arxiv: "2505.06708",
      date: "2025-05-10",
    },
    {
      title: "OFA: Unifying Architectures, Tasks, and Modalities Through a Simple Sequence-to-Sequence Learning Framework",
      arxiv: "2202.03052",
      date: "2022-02-07",
    },
  ],
  knownFor: "Qwen",
};

export default personality;
