import type { Personality } from "@/lib/personalities/types";

const personality: Personality = {
  name: "Ashish Vaswani",
  role: "Co-founder",
  org: "Essential AI (ex-Google Brain)",
  description:
    "Lead author of 'Attention Is All You Need,' the paper that introduced the Transformer architecture powering all modern LLMs. Co-founded Essential AI to build enterprise AI agents.",
  slug: "ashish-vaswani",
  linkedinImage: "https://images.squarespace-cdn.com/content/v1/58da330debbd1a5419611082/1555580207391-2ECHQBG0O8MSP4IU4XZ8/ashish+vaswani+headshot.jpg?format=1500w",
  podcasts: ["No Priors", "Eye on AI"],
  papers: [
    {
      title: "Attention Is All You Need",
      arxiv: "1706.03762",
      date: "2017-06-12",
    },
  ],
  knownFor: "Invented Transformer architecture",
};

export default personality;
