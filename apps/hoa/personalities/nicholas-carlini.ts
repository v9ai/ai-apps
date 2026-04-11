import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Nicholas Carlini",
  role: "Research Scientist",
  org: "Anthropic",
  description:
    "Adversarial ML and LLM security researcher. Led the 16-Claude-agent C compiler experiment. Best paper awards at IEEE S&P, USENIX Security (2x), and ICML (3x).",
  slug: "nicholas-carlini",
  podcasts: [
    "Machine Learning Street Talk",
    "Security Cryptography Whatever",
    "Future of Life Institute",
  ],
  github: "carlini",
  knownFor: "Carlini & Wagner Attack",
  papers: [
    {
      title: "Towards Evaluating the Robustness of Neural Networks",
      arxiv: "1608.04644",
      date: "2017-05-22",
    },
    {
      title: "Obfuscated Gradients Give a False Sense of Security",
      arxiv: "1802.00420",
      date: "2018-07-10",
    },
    {
      title: "Extracting Training Data from Large Language Models",
      arxiv: "2012.07805",
      date: "2021-06-15",
    },
    {
      title: "Membership Inference Attacks From First Principles",
      arxiv: "2112.03570",
      date: "2022-05-22",
    },
    {
      title: "Deduplicating Training Data Makes Language Models Better",
      arxiv: "2107.06499",
      date: "2022-05-22",
    },
    {
      title: "Quantifying Memorization Across Neural Language Models",
      arxiv: "2202.07646",
      date: "2023-05-01",
    },
    {
      title: "Stealing Part of a Production Language Model",
      arxiv: "2403.06634",
      date: "2024-07-21",
    },
  ],
};

export default personality;
