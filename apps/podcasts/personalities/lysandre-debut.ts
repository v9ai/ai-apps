import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Lysandre Debut",
  role: "Chief Open Source Officer",
  org: "Hugging Face",
  description:
    "Core maintainer of Transformers, led the v5 release. Co-authored the EMNLP 2020 Transformers paper. First engineer at HF focused entirely on open source.",
  slug: "lysandre-debut",
  podcasts: [],
  github: "LysandreJik",
  papers: [
    {
      title: "Transformers: State-of-the-Art Natural Language Processing",
      arxiv: "1910.03771",
      date: "2020-11-16",
    },
  ],
  knownFor: "Hugging Face Transformers",
};

export default personality;
