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
  orcid: "0009-0004-3081-2883",
  linkedinImage: "https://athosgeorgiou.com/social/athos.webp",
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
    {
      title: "Improving Performance of Taranta: Analysis of Memory Requests and Implementation of the Solution",
      doi: "10.18429/jacow-icalepcs2023-tupdp044",
      date: "2023-12-16",
    },
    {
      title: "Front-End Monitor and Control Web Application for Large Telescope Infrastructures: A Comparative Analysis",
      doi: "10.18429/jacow-icalepcs2023-tumbcmo09",
      date: "2023-11-27",
    },
  ],
  knownFor: "ColQwen",
};

export default personality;
