import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Patrick von Platen",
  role: "Research Engineer",
  org: "Mistral AI",
  description:
    "Creator of HuggingFace Diffusers, the leading open-source library for diffusion models. Former core maintainer of HF Transformers. Now building multimodal models at Mistral AI.",
  slug: "patrick-von-platen",
  podcasts: [],
  github: "patrickvonplaten",
  hfUsername: "patrickvonplaten",
  knownFor: "HuggingFace Diffusers",
  papers: [
    {
      title: "Pixtral 12B",
      arxiv: "2410.07073",
      date: "2024-10-09",
    },
    {
      title: "Distil-Whisper: Robust Knowledge Distillation via Large-Scale Pseudo Labelling",
      arxiv: "2311.05556",
      date: "2023-11-09",
    },
    {
      title: "XLS-R: Self-supervised Cross-lingual Speech Representation Learning at Scale",
      arxiv: "2111.09296",
      date: "2022-06-01",
    },
    {
      title: "XTREME-S: Evaluating Cross-lingual Speech Representations",
      arxiv: "2203.10752",
      date: "2022-06-01",
    },
    {
      title: "Datasets: A Community Library for Natural Language Processing",
      arxiv: "2109.02846",
      date: "2021-11-01",
    },
  ],
};

export default personality;
