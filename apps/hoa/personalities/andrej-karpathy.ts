import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Andrej Karpathy",
  role: "Founder, Eureka Labs",
  org: "Ex-OpenAI/Tesla",
  description:
    "OpenAI founding member, former Tesla AI Director, and creator of nanoGPT/micrograd/llm.c. Founded Eureka Labs for AI-native education. Coined 'vibe coding' and 'Software 3.0.' His YouTube 'Zero to Hero' series has 1M+ subscribers. Released nanochat, autoresearch, and LLM101n.",
  slug: "andrej-karpathy",
  podcasts: ["Dwarkesh Podcast", "Lex Fridman", "YC AI Startup School", "Latent Space"],
  github: "karpathy",
  papers: [
    {
      title: "Deep Visual-Semantic Alignments for Generating Image Descriptions",
      arxiv: "1412.2306",
      date: "2014-12-14",
    },
    {
      title: "Visualizing and Understanding Recurrent Networks",
      arxiv: "1506.02078",
      date: "2015-06-05",
    },
  ],
  knownFor: "nanoGPT",
};

export default personality;
