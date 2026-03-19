import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Dario Amodei",
  role: "CEO",
  org: "Anthropic",
  description:
    "Co-founded Anthropic after leading research at OpenAI. Authored foundational scaling laws paper. Advocates for AI safety through Constitutional AI and responsible deployment.",
  slug: "dario-amodei",
  podcasts: ["Dwarkesh Podcast", "Lex Fridman", "Big Technology", "Davos Panels"],
  github: "damodei",
  papers: [
    {
      title: "Scaling Laws for Neural Language Models",
      arxiv: "2001.08361",
      date: "2020-01-23",
    },
    {
      title: "Constitutional AI: Harmlessness from AI Feedback",
      arxiv: "2212.08073",
      date: "2022-12-15",
    },
    {
      title: "Training a Helpful and Harmless Assistant with Reinforcement Learning from Human Feedback",
      arxiv: "2204.05862",
      date: "2022-04-12",
    },
  ],
  knownFor: "Claude",
};

export default personality;
