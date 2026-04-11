import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Andrew Ng",
  role: "Founder",
  org: "DeepLearning.AI / Landing AI",
  description:
    "Co-founded Google Brain and led Baidu AI Group. Created the most popular ML course on Coursera. Founded DeepLearning.AI and Landing AI to democratize AI education and adoption.",
  slug: "andrew-ng",
  podcasts: ["The Batch", "Lex Fridman", "No Priors", "Gradient Dissent"],
  github: "andrewng",
  papers: [
    {
      title: "Building High-level Features Using Large Scale Unsupervised Learning",
      arxiv: "1112.6209",
      date: "2011-12-28",
    },
  ],
  knownFor: "Google Brain, Coursera ML",
};

export default personality;
