import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Mark Zuckerberg",
  role: "CEO",
  org: "Meta",
  description:
    "Leads Meta's AI efforts including the open-source LLaMA model family. Pivoted Meta toward AI-first strategy, investing billions in GPU infrastructure and open-weight research.",
  slug: "mark-zuckerberg",
  podcasts: ["Lex Fridman", "Dwarkesh Podcast", "Morning Brew Daily", "The Vergecast"],
  github: "zuck",
  papers: [
    {
      title: "LLaMA: Open and Efficient Foundation Language Models",
      arxiv: "2302.13971",
      date: "2023-02-27",
    },
  ],
  knownFor: "LLaMA open-source models",
};

export default personality;
