import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Xingyao Wang",
  role: "Co-founder & CAIO",
  org: "All Hands AI (OpenHands)",
  description:
    "Built OpenHands (69K+ stars), the leading open-source AI software development agent. Invented CodeAct (ICML 2024) for code-based agent actions.",
  slug: "xingyao-wang",
  podcasts: ["Z Potentials"],
  github: "xingyaoww",
  knownFor: "OpenHands",
  papers: [
    {
      title: "Executable Code Actions Elicit Better LLM Agents",
      arxiv: "2402.01030",
      date: "2024-02-01",
    },
    {
      title: "OpenHands: An Open Platform for AI Software Developers as Generalist Agents",
      arxiv: "2407.16741",
      date: "2024-07-23",
    },
    {
      title: "MINT: Evaluating LLMs in Multi-turn Interaction with Tools and Language Feedback",
      arxiv: "2309.10691",
      date: "2023-09-19",
    },
    {
      title: "Training Software Engineering Agents and Verifiers with SWE-Gym",
      arxiv: "2412.21139",
      date: "2024-12-30",
    },
    {
      title: "The OpenHands Software Agent SDK: A Composable and Extensible Foundation for Production Agents",
      arxiv: "2511.03690",
      date: "2025-11-06",
    },
  ],
};

export default personality;
