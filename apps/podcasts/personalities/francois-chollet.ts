import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Francois Chollet",
  role: "Co-founder",
  org: "Ndea & ARC Prize",
  description:
    "Creator of Keras, author of 'Deep Learning with Python', and architect of the ARC-AGI benchmark for measuring general intelligence.",
  slug: "francois-chollet",
  podcasts: ["Lex Fridman Podcast", "Dwarkesh Podcast", "Machine Learning Street Talk", "Mindscape", "The Gradient"],
  github: "fchollet",
  knownFor: "Keras",
  papers: [
    {
      title: "On the Measure of Intelligence",
      arxiv: "1911.01547",
      date: "2019-11-05",
    },
    {
      title: "Xception: Deep Learning with Depthwise Separable Convolutions",
      arxiv: "1610.02357",
      date: "2016-10-07",
    },
    {
      title: "ARC Prize 2024: Technical Report",
      arxiv: "2412.04604",
      date: "2024-12-05",
    },
  ],
};

export default personality;
