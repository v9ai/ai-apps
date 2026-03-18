import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Athos Georgiou",
  role: "Founder & CEO",
  org: "NCA",
  description:
    "Applied AI researcher publishing on LLM inference optimization on AMD GPUs and multimodal document retrieval. Builds production RAG and agent systems.",
  slug: "athos-georgiou",
  podcasts: [],
  github: "athrael-soju",
  papers: [
    {
      title: "Architecture-Aware LLM Inference Optimization on AMD Instinct GPUs: A Comprehensive Benchmark and Deployment Study",
      arxiv: "2603.10031",
      date: "2026-02-27",
    },
    {
      title: "Spatially-Grounded Document Retrieval via Patch-to-Region Relevance Propagation",
      arxiv: "2512.02660",
      date: "2025-12-02",
    },
  ],
};

export default personality;
