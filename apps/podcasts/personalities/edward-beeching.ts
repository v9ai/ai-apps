import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Edward Beeching",
  role: "Research Scientist",
  org: "Hugging Face",
  description:
    "RL and LLM alignment researcher. Co-created the Open LLM Leaderboard, co-authored Zephyr and the Alignment Handbook, and built Godot RL Agents.",
  slug: "edward-beeching",
  podcasts: [],
  github: "edbeeching",
  papers: [
    {
      title: "Optimizing Test-Time Compute via Meta Reinforcement Fine-Tuning",
      arxiv: "2503.07572",
      date: "2025-03-10",
    },
    {
      title: "Jack of All Trades, Master of Some, a Multi-Purpose Transformer Agent",
      arxiv: "2402.09844",
      date: "2024-02-15",
    },
    {
      title: "Zephyr: Direct Distillation of LM Alignment",
      arxiv: "2310.16944",
      date: "2023-10-25",
    },
    {
      title: "Godot Reinforcement Learning Agents",
      arxiv: "2112.03636",
      date: "2021-12-07",
    },
    {
      title: "Learning to Plan with Uncertain Topological Maps",
      arxiv: "2007.05270",
      date: "2020-07-10",
    },
    {
      title: "EgoMap: Projective Mapping and Structured Egocentric Memory for Deep RL",
      doi: "10.1007/978-3-030-67661-2_31",
      date: "2020-09-14",
    },
    {
      title: "Deep Reinforcement Learning on a Budget: 3D Control and Reasoning Without a Supercomputer",
      arxiv: "1904.01806",
      date: "2019-04-03",
    },
  ],
  knownFor: "Open LLM Leaderboard",
};

export default personality;
