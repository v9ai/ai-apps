import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Sirui Hong",
  role: "Co-Founder & Technical Lead",
  org: "DeepWisdom",
  description:
    "Creator of MetaGPT, the first multi-agent framework to simulate an AI software company with SOPs. ICLR 2024 Oral (#1 LLM-Agent). Also first-authored Data Interpreter (ACL 2024) and co-authored AFlow (ICLR 2025 Oral). Leads DeepWisdom's NLP/AIGC algorithms; launched MGX/Atoms reaching 500k users in one month.",
  slug: "sirui-hong",
  podcasts: ["GOSIM AI Paris 2025", "KDJingPai Interview"],
  github: "geekan",
  papers: [
    {
      title: "MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework",
      arxiv: "2308.00352",
      date: "2023-08-01",
    },
    {
      title: "Data Interpreter: An LLM Agent For Data Science",
      arxiv: "2402.18679",
      date: "2024-02-28",
    },
    {
      title: "AFlow: Automating Agentic Workflow Generation",
      arxiv: "2410.10762",
      date: "2024-10-14",
    },
  ],
  knownFor: "MetaGPT",
};

export default personality;
