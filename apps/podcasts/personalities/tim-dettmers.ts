import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Tim Dettmers",
  role: "Assistant Professor (MLD & CSD)",
  org: "Carnegie Mellon University / Ai2",
  description:
    "Creator of bitsandbytes and QLoRA. Pioneering k-bit quantization for accessible LLM inference and fine-tuning. Leading open-source coding agents (SERA) at Ai2.",
  slug: "tim-dettmers",
  podcasts: ["Interconnects"],
  github: "TimDettmers",
  papers: [
    {
      title: "QLoRA: Efficient Finetuning of Quantized LLMs",
      arxiv: "2305.14314",
      date: "2023-05-23",
    },
    {
      title: "LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale",
      arxiv: "2208.07339",
      date: "2022-08-15",
    },
    {
      title: "SERA: Soft-Verified Efficient Repository Agents",
      arxiv: "2601.20789",
      date: "2026-01-27",
    },
  ],
  knownFor: "bitsandbytes & QLoRA",
};

export default personality;
