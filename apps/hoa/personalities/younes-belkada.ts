import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Younes Belkada",
  role: "Senior AI Engineer",
  org: "Technology Innovation Institute (TII)",
  description:
    "Core developer of PEFT, TRL, and bitsandbytes integration at Hugging Face. Co-author of LLM.int8() and Falcon-H1.",
  slug: "younes-belkada",
  podcasts: [],
  github: "younesbelkada",
  hfUsername: "ybelkada",
  knownFor: "PEFT / QLoRA / bitsandbytes",
  papers: [
    {
      title: "LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale",
      arxiv: "2208.07339",
      date: "2022-08-15",
    },
    {
      title: "Petals: Collaborative Inference and Fine-tuning of Large Models",
      arxiv: "2209.01188",
      date: "2022-09-02",
    },
    {
      title: "BLOOM: A 176B-Parameter Open-Access Multilingual Language Model",
      arxiv: "2211.05100",
      date: "2022-11-09",
    },
    {
      title: "Zephyr: Direct Distillation of LM Alignment",
      arxiv: "2310.16944",
      date: "2023-10-25",
    },
    {
      title: "StarCoder 2 and The Stack v2: The Next Generation",
      arxiv: "2402.19173",
      date: "2024-02-29",
    },
    {
      title: "Falcon Mamba: The First Competitive Attention-free 7B Language Model",
      arxiv: "2410.05355",
      date: "2024-10-07",
    },
    {
      title: "Falcon-H1: A Family of Hybrid-Head Language Models Redefining Efficiency and Performance",
      arxiv: "2507.22448",
      date: "2025-07-30",
    },
  ],
};

export default personality;
