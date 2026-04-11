import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Jan Leike",
  role: "VP of Research, Alignment",
  org: "Anthropic (ex-OpenAI)",
  description:
    "Leads alignment research at Anthropic after heading OpenAI's Superalignment team. Focuses on scalable oversight, RLHF, and ensuring AI systems remain aligned with human values.",
  slug: "jan-leike",
  podcasts: ["80,000 Hours", "The Inside View", "Dwarkesh Podcast"],
  papers: [
    {
      title: "Scalable agent alignment via reward modeling",
      arxiv: "1811.07871",
      date: "2018-11-19",
    },
  ],
  knownFor: "AI alignment & scalable oversight",
};

export default personality;
