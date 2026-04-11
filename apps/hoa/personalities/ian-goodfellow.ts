import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Ian Goodfellow",
  role: "Research Scientist",
  org: "DeepMind (ex-Apple, Google)",
  description:
    "Invented Generative Adversarial Networks (GANs), one of the most influential ideas in deep learning. Author of the widely-used 'Deep Learning' textbook with Bengio and Courville.",
  slug: "ian-goodfellow",
  podcasts: ["Lex Fridman", "AI Podcast"],
  papers: [
    {
      title: "Generative Adversarial Nets",
      arxiv: "1406.2661",
      date: "2014-06-10",
    },
  ],
  knownFor: "Invented GANs",
};

export default personality;
