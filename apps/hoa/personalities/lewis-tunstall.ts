import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Lewis Tunstall",
  role: "ML Engineer & Post-Training Lead",
  org: "Hugging Face",
  description:
    "Co-authored 'NLP with Transformers' (O'Reilly), leads alignment and post-training at Hugging Face. Created Zephyr, SetFit, Alignment Handbook, and co-built TRL.",
  slug: "lewis-tunstall",
  podcasts: ["SuperDataScience", "The Sequence Chat", "Learning from Machine Learning", "Hugging Face ML Experts"],
  github: "lewtun",
  hfUsername: "lewtun",
  knownFor: "NLP with Transformers book",
  papers: [
    {
      title: "Zephyr: Direct Distillation of LM Alignment",
      arxiv: "2310.16944",
      date: "2023-10-25",
    },
    {
      title: "Efficient Few-Shot Learning Without Prompts (SetFit)",
      arxiv: "2209.11055",
      date: "2022-09-22",
    },
    {
      title: "Like a Good Nearest Neighbor: Practical Content Moderation and Text Classification",
      arxiv: "2302.08957",
      date: "2023-02-17",
    },
  ],
};

export default personality;
