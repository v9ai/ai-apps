import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Yang Zhilin",
  role: "Founder & CEO",
  org: "Moonshot AI",
  description:
    "Author of Transformer-XL and XLNet papers. CMU doctorate, ex-Meta/Google Brain. Created Kimi chatbot and led breakthroughs in long-context LLM attention and optimizer scaling.",
  slug: "yang-zhilin",
  podcasts: ["First Push", "36Kr", "LatePost"],
  github: "kimiyoung",
  papers: [
    {
      title: "MoBA: Mixture of Block Attention for Long-Context LLMs",
      arxiv: "2502.13189",
      date: "2025-02-18",
    },
    {
      title: "Muon is Scalable for LLM Training",
      arxiv: "2502.16982",
      date: "2025-02-24",
    },
    {
      title: "Kimi-VL Technical Report",
      arxiv: "2504.07491",
      date: "2025-04-10",
    },
  ],
  knownFor: "MoE",
};

export default personality;
