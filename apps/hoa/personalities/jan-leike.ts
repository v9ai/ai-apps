import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Jan Leike",
  role: "VP of Research, Alignment",
  org: "Anthropic (ex-OpenAI)",
  description:
    "Leads alignment research at Anthropic after heading OpenAI's Superalignment team. Focuses on scalable oversight, RLHF, and ensuring AI systems remain aligned with human values.",
  slug: "jan-leike",
  linkedinImage: "https://bucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com/public/images/e21b6a1a-5f0c-48e5-9047-2706653d8e88_1433x1358.jpeg",
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
