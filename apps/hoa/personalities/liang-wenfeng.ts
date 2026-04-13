import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Liang Wenfeng",
  role: "Founder & CEO",
  org: "DeepSeek",
  description:
    "Built DeepSeek-R1 for $5.6M, shocking Western AI. TIME 100 Most Influential in AI 2025. Leads a prolific research lab publishing on MoE architectures, code intelligence, and reasoning via RL.",
  slug: "liang-wenfeng",
  linkedinImage: "https://www.entrepreneur.com/wp-content/uploads/sites/2/2025/02/1738692619-Liang-Wenfeng-GettyImages-2196672039.jpg",
  podcasts: ["ChinaTalk", "36Kr", "CCTV News"],
  papers: [
    {
      title: "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning",
      arxiv: "2501.12948",
      date: "2025-01-22",
    },
    {
      title: "DeepSeek-V3 Technical Report",
      arxiv: "2412.19437",
      date: "2024-12-27",
    },
    {
      title: "DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model",
      arxiv: "2405.04434",
      date: "2024-05-07",
    },
  ],
  knownFor: "DeepSeek",
};

export default personality;
