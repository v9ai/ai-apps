import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Tri Dao",
  role: "Assistant Professor & Chief Scientist",
  org: "Princeton University / Together AI",
  description:
    "Creator of FlashAttention and co-creator of Mamba. Stanford PhD in hardware-aware ML algorithms. His IO-aware attention kernel is now used in virtually every Transformer and enabled context lengths to scale from 4K to 1M tokens.",
  slug: "tri-dao",
  podcasts: ["Latent Space", "Generally Intelligent", "TED"],
  github: "tridao",
  papers: [
    {
      title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness",
      arxiv: "2205.14135",
      date: "2022-05-27",
    },
    {
      title: "Monarch: Expressive Structured Matrices for Efficient and Accurate Training",
      doi: "10.48550/arXiv.2204.00595",
      date: "2022-07-17",
    },
    {
      title: "FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning",
      arxiv: "2307.08691",
      date: "2023-07-17",
    },
    {
      title: "Mamba: Linear-Time Sequence Modeling with Selective State Spaces",
      arxiv: "2312.00752",
      date: "2023-12-01",
    },
    {
      title: "Transformers are SSMs: Generalized Models and Efficient Algorithms Through Structured State Space Duality",
      arxiv: "2405.21060",
      date: "2024-05-31",
    },
    {
      title: "FlashAttention-3: Fast and Accurate Attention with Asynchrony and Low-precision",
      arxiv: "2407.08608",
      date: "2024-07-11",
    },
  ],
  knownFor: "FlashAttention & Mamba",
};

export default personality;
