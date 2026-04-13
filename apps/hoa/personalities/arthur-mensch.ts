import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Arthur Mensch",
  role: "CEO",
  org: "Mistral AI",
  description:
    "Co-founded Mistral AI, Europe's leading frontier AI lab. Previously at DeepMind. Built Mistral, Mixtral, and open-weight models rivaling much larger competitors.",
  slug: "arthur-mensch",
  linkedinImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Arthur_Mensch.png/500px-Arthur_Mensch.png",
  podcasts: ["No Priors", "Lex Fridman", "Decoder with Nilay Patel"],
  papers: [
    {
      title: "Mixtral of Experts",
      arxiv: "2401.04088",
      date: "2024-01-08",
    },
  ],
  knownFor: "Mistral & Mixtral models",
};

export default personality;
