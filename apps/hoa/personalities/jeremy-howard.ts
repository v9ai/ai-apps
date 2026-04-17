import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Jeremy Howard",
  role: "Founding CEO",
  org: "Answer.AI",
  description:
    "Co-founder of fast.ai, creator of ULMFiT (precursor to modern LLMs), and founding CEO of Answer.AI. Pioneered transfer learning for NLP and democratized deep learning education.",
  slug: "jeremy-howard",
  podcasts: ["Lex Fridman Podcast", "Latent Space", "The MAD Podcast", "SE Radio", "Network State Podcast"],
  github: "jph00",
  hfUsername: "jhoward",
  knownFor: "ULMFiT / fast.ai",
  papers: [
    {
      title: "Universal Language Model Fine-tuning for Text Classification",
      arxiv: "1801.06146",
      date: "2018-01-18",
    },
  ],
};

export default personality;
