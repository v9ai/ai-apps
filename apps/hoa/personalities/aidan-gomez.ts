import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Aidan Gomez",
  role: "CEO",
  org: "Cohere",
  description:
    "Co-author of the Transformer paper 'Attention Is All You Need' and co-founded Cohere to bring LLMs to enterprise. Pioneered retrieval-augmented generation for business applications.",
  slug: "aidan-gomez",
  podcasts: ["No Priors", "Gradient Dissent", "The AI Breakdown", "Latent Space"],
  papers: [
    {
      title: "Attention Is All You Need",
      arxiv: "1706.03762",
      date: "2017-06-12",
    },
  ],
  knownFor: "Transformer co-inventor, Cohere",
};

export default personality;
