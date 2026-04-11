import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Yoshua Bengio",
  role: "Professor & Scientific Director",
  org: "Mila / Universite de Montreal",
  description:
    "Turing Award winner (2018) alongside Hinton and LeCun. Pioneered deep learning, neural machine translation, and attention mechanisms. Leading voice on AI safety and governance.",
  slug: "yoshua-bengio",
  podcasts: ["Lex Fridman", "The Robot Brains", "Eye on AI"],
  orcid: "0000-0002-0399-3498",
  papers: [
    {
      title: "A Neural Probabilistic Language Model",
      doi: "10.1162/jmlr.2003.3.6.1137",
      date: "2003-02-01",
    },
    {
      title: "Neural Machine Translation by Jointly Learning to Align and Translate",
      arxiv: "1409.0473",
      date: "2014-09-01",
    },
  ],
  knownFor: "Deep learning pioneer, Turing Award",
};

export default personality;
