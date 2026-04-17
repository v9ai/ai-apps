import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Lisa Welsch",
  role: "Founder & Developer",
  org: "TasteHub GmbH",
  description:
    "Software developer and founder building at the intersection of AI, developer tooling, and data infrastructure. Creator of ANCS, a typed hypergraph memory architecture for AI agents with epistemic governance and truth tracking.",
  slug: "lisa-welsch",
  podcasts: [],
  github: "SimplyLiz",
  linkedinImage: "https://avatars.githubusercontent.com/SimplyLiz",
  papers: [
    {
      title: "ANCS: An AI-Native Cognitive Substrate for Epistemically-Governed Agent Memory",
      doi: "10.5281/ZENODO.19635943",
      date: "2026-01-01",
    },
  ],
  knownFor: "AI agent memory, Cytopia, developer tooling",
  blogUrl: "https://www.lisawelsch.com",
};

export default personality;
