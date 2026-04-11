import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Omar Khattab",
  role: "Assistant Professor",
  org: "MIT EECS & CSAIL",
  description:
    "Creator of DSPy (32.9k stars) and ColBERT. Pioneered declarative AI programming and late-interaction retrieval. Stanford NLP PhD, former Databricks Research Scientist. SIGIR 2025 Best Paper for WARP.",
  slug: "omar-khattab",
  podcasts: ["Weaviate Podcast", "MLOps Community", "Latent Space"],
  github: "okhat",
  papers: [
    {
      title: "Recursive Language Models",
      arxiv: "2512.24601",
      date: "2025-12-31",
    },
    {
      title: "WARP: An Efficient Engine for Multi-Vector Retrieval",
      arxiv: "2501.17788",
      date: "2025-01-29",
    },
    {
      title: "Optimizing Instructions and Demonstrations for Multi-Stage Language Model Programs",
      arxiv: "2406.11695",
      date: "2024-06-17",
    },
    {
      title: "DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines",
      arxiv: "2310.03714",
      date: "2023-10-05",
    },
    {
      title: "ColBERTv2: Effective and Efficient Retrieval via Lightweight Late Interaction",
      arxiv: "2112.01488",
      date: "2021-12-02",
    },
    {
      title: "ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT",
      arxiv: "2004.12832",
      date: "2020-04-27",
    },
  ],
  knownFor: "DSPy",
};

export default personality;
