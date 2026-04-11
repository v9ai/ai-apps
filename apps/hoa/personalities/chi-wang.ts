import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Chi Wang",
  role: "Founder & Senior Staff Research Scientist",
  org: "AG2 / Google DeepMind",
  description:
    "Created AutoGen (now AG2), the pioneering open-source multi-agent conversation framework for agentic AI. Also built FLAML, a widely adopted AutoML library. Won the 2015 SIGKDD Dissertation Award and Best Paper at ICLR 2024 LLM Agents Workshop. Spent a decade at Microsoft Research before joining Google DeepMind in 2024.",
  slug: "chi-wang",
  podcasts: ["The Data Exchange", "ODSC"],
  github: "sonichi",
  papers: [
    {
      title: "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation",
      arxiv: "2308.08155",
      date: "2023-08-16",
    },
    {
      title: "FLAML: A Fast and Lightweight AutoML Library",
      arxiv: "1911.04706",
      date: "2019-11-12",
    },
    {
      title: "Cost-Effective Hyperparameter Optimization for Large Language Model Generation Inference",
      arxiv: "2303.04673",
      date: "2023-03-08",
    },
  ],
  knownFor: "AutoGen / AG2",
};

export default personality;
